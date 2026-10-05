[Reading 200 lines from start (total: 838 lines, 638 remaining)]

import http from "node:http";
import fs from "node:fs";
import crypto from "node:crypto";
import { WebSocketServer } from "ws";
import ipaddr from "ipaddr.js";

const PORT = Number(process.env.PORT || 10000);
const OPENAI_RANGES_URL = "https://openai.com/chatgpt-connectors.json";
const PUBLIC_KEYS = {
  server: fs.readFileSync(new URL("./bridge-public.pem", import.meta.url), "utf8"),
  pop: fs.readFileSync(new URL("./bridge-pop-public.pem", import.meta.url), "utf8"),
};

const MAX_BODY = 32 * 1024 * 1024;
const MAX_INFLIGHT = 64;
const REQUEST_TIMEOUT_MS = 75_000;
const RANGE_REFRESH_MS = 15 * 60 * 1000;
const WS_MAX_PAYLOAD = 96 * 1024 * 1024;
const RESPONSE_QUEUE_LIMIT = 1 * 1024 * 1024;
const REQUEST_BUFFER_GLOBAL_LIMIT = 64 * 1024 * 1024;
const KEEPALIVE_STALE_MS = 7 * 60 * 1000;
const MCP_ACCESS_TOKEN = String(process.env.TCF_MCP_ACCESS_TOKEN || "");

const bridgeStates = {
  server: { ws: null, since: null, lastMessageAt: null, bridgePath: "/bridge", mcpPath: "/mcp" },
  pop: { ws: null, since: null, lastMessageAt: null, bridgePath: "/bridge/pop", mcpPath: "/pop/mcp" },
};
let rangeNetworks = [];
let rangesUpdatedAt = null;
let rangesFetchedAt = null;
let rangeError = null;

const pending = new Map();
const usedNonces = new Map();
let admissions = 0;
let requestBufferedBytes = 0;
const processRoutes = new Map();
const sessionRoutes = new Map();
const PROCESS_ROUTE_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_ROUTE_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_ROUTE_LIMIT = 4096;
const PROCESS_ROUTE_CAPTURE_LIMIT = 64 * 1024;
const PROCESS_ROUTE_SNAPSHOT_LIMIT = 4096;
const PROCESS_FOLLOW_TOOLS = new Set([
  "read_process_output", "interact_with_process", "kill_process", "force_terminate",
]);

const HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "host",
]);

function cleanHeaders(headers, stripSecrets = true) {
  const out = {};
  for (const [k0, v] of Object.entries(headers || {})) {
    const k = k0.toLowerCase();
    if (HOP.has(k) || v == null) continue;
    if (stripSecrets && (k === "authorization" || k === "x-api-key")) continue;
    out[k] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  return out;
}

function normalizeIp(raw0) {
  let raw = String(raw0 || "").trim();
  if (raw.startsWith("::ffff:")) raw = raw.slice(7);
  const zone = raw.indexOf("%");
  if (zone >= 0) raw = raw.slice(0, zone);
  return raw;
}

function getIngressCandidates(req) {
  const cf = normalizeIp(req.headers["cf-connecting-ip"]);
  return cf ? [cf] : [];
}

function parseNetwork(prefix) {
  try {
    const [addr, bits] = ipaddr.parseCIDR(prefix);
    return [addr, bits];
  } catch {
    return null;
  }
}

function ipAllowed(ipText) {
  try {
    let ip = ipaddr.parse(ipText);
    if (ip.kind() === "ipv6" && ip.isIPv4MappedAddress()) ip = ip.toIPv4Address();
    return rangeNetworks.some(([net, bits]) => net.kind() === ip.kind() && ip.match(net, bits));
  } catch {
    return false;
  }
}

async function refreshRanges() {
  try {
    const res = await fetch(OPENAI_RANGES_URL, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`ranges HTTP ${res.status}`);
    const data = await res.json();
    const parsed = [];
    for (const p of data.prefixes || []) {
      const prefix = p.ipv4Prefix || p.ipv6Prefix;
      if (!prefix) continue;
      const n = parseNetwork(prefix);
      if (n) parsed.push(n);
    }
    if (!parsed.length) throw new Error("no valid prefixes");
    rangeNetworks = parsed;
    rangesUpdatedAt = data.creationTime || new Date().toISOString();
    rangesFetchedAt = new Date().toISOString();
    rangeError = null;
    console.log(JSON.stringify({ event: "openai_ranges_loaded", count: parsed.length, creationTime: rangesUpdatedAt, fetchedAt: rangesFetchedAt }));
  } catch (err) {
    rangeError = String(err?.message || err);
    console.error(JSON.stringify({ event: "openai_ranges_error", error: rangeError }));
  }
}

function verifySignedRequest(req, pathname, publicKey) {
  const ts = String(req.headers["x-tcf-timestamp"] || "");
  const nonce = String(req.headers["x-tcf-nonce"] || "");
  const signature = String(req.headers["x-tcf-signature"] || "");
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 60_000) return false;
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce) || usedNonces.has(nonce)) return false;
  let sig;
  try { sig = Buffer.from(signature, "base64"); } catch { return false; }
  const payload = `${req.method || "GET"}\n${pathname}\n${ts}\n${nonce}`;
  let ok = false;
  try {
    ok = crypto.verify(null, Buffer.from(payload), publicKey, sig);
  } catch {
    ok = false;
  }
  if (ok) usedNonces.set(nonce, Date.now() + 120_000);
  return ok;
}

function verifyAccessToken(req) {
  if (!MCP_ACCESS_TOKEN) return false;
  const auth = String(req.headers["authorization"] || "");
  if (!auth.startsWith("Bearer ")) return false;
  const provided = Buffer.from(auth.slice(7));
  const expected = Buffer.from(MCP_ACCESS_TOKEN);
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function extractRpcMeta(body) {
  try {
    const payload = JSON.parse(body.toString("utf8"));
    const rpcId = ["string", "number"].includes(typeof payload?.id) ? String(payload.id).slice(0, 128) : null;
    const rpcMethod = typeof payload?.method === "string" ? payload.method.slice(0, 128) : null;
    const toolName = rpcMethod === "tools/call" && typeof payload?.params?.name === "string"
      ? payload.params.name.slice(0, 160)
      : null;
    return { rpcId, rpcMethod, toolName };
  } catch {
    return { rpcId: null, rpcMethod: null, toolName: null };
  }
}

function targetsPopPath(value) {
  return typeof value === "string" && (value === "/home/u" || value.startsWith("/home/u/"));
}

function sessionRouteKey(headers = {}) {
  const rawSession = String(headers["x-openai-session"] || headers["mcp-session-id"] || "").trim();
  if (!rawSession) return null;
  const rawSubject = String(headers["x-openai-subject"] || "").trim();
  return crypto.createHash("sha256").update(rawSubject + "\0" + rawSession).digest("hex").slice(0, 32);
}

function connectedBackends() {
  return Object.entries(bridgeStates)
    .filter(([, state]) => state.ws && state.ws.readyState === state.ws.OPEN)
    .map(([name]) => name);
}

function rememberSessionRoute(sessionKey, backend, source = "routing") {
  if (!sessionKey || !bridgeStates[backend]) return;
  sessionRoutes.set(sessionKey, { backend, expiresAt: Date.now() + SESSION_ROUTE_TTL_MS });
  while (sessionRoutes.size > SESSION_ROUTE_LIMIT) {
    sessionRoutes.delete(sessionRoutes.keys().next().value);
  }
  console.log(JSON.stringify({ event: "session_route_learned", affinityHash: sessionKey, backend, source }));
}

function sessionBackendFor(sessionKey) {
  if (!sessionKey) return null;
  const route = sessionRoutes.get(sessionKey);
  if (!route) return null;
  if (route.expiresAt <= Date.now()) {
    sessionRoutes.delete(sessionKey);
    return null;
  }
  return route.backend;
}

function selectNeutralBackend(sessionKey) {