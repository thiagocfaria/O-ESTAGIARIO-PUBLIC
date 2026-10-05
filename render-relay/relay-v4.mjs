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

function routeMcpRequest(body, fallbackBackend) {
  let backend = fallbackBackend || "server";
  let routedBody = body;
  if (backend === "pop") return { backend, body: routedBody };
  if (backend !== "server") return { backend, body: routedBody };

  try {
    const payload = JSON.parse(body.toString("utf8"));
    if (payload?.method !== "tools/call") return { backend, body: routedBody };
    const args = payload?.params?.arguments;
    if (!args || typeof args !== "object" || Array.isArray(args)) return { backend, body: routedBody };

    const explicit = typeof args.deviceId === "string" ? args.deviceId : "";
    if (explicit === "pop-os") backend = "pop";
    else if (explicit === "srv-app01") backend = "server";
    else {
      for (const key of ["path", "file_path", "source", "destination", "cwd"]) {
        if (targetsPopPath(args[key])) { backend = "pop"; break; }
      }
      if (backend === "server" && Array.isArray(args.paths) && args.paths.some(targetsPopPath)) backend = "pop";
      if (backend === "server" && typeof args.command === "string") {
        if (/^\s*#\s*tcf-device:\s*pop-os\b/im.test(args.command) ||
            /(^|[\s"'])\/home\/u(?:\/|\b)/.test(args.command)) backend = "pop";
      }
    }

    if (Object.prototype.hasOwnProperty.call(args, "deviceId")) {
      const nextArgs = { ...args };
      delete nextArgs.deviceId;
      payload.params = { ...(payload.params || {}), arguments: nextArgs };
      routedBody = Buffer.from(JSON.stringify(payload));
    }
  } catch {}

  return { backend, body: routedBody };
}

function bridgeSend(obj, target) {
  if (!target || target.readyState !== target.OPEN) return false;
  try {
    target.send(JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

function endPending(id, status = null, payload = null) {
  const p = pending.get(id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(id);
  p.queue.length = 0;
  p.queuedBytes = 0;
  console.log(JSON.stringify({event: status ? 'request_error' : 'request_done', id,
    rpcId:p.rpcId, rpcMethod:p.rpcMethod, toolName:p.toolName,
    status:status || p.status || 200, ms:Date.now()-p.started, cfRay:p.cfRay}));
  if (p.res.destroyed) return;
  if (status && p.res.headersSent) {
    p.res.destroy();
    return;
  }
  if (status) {
    p.res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  }
  if (payload != null) p.res.end(typeof payload === "string" ? payload : JSON.stringify(payload));
  else p.res.end();
}

function failAll(reason = "bridge_disconnected", owner = null) {
  for (const [id, p] of pending) {
    if (p.owner === owner) endPending(id, 502, { error: reason });
  }
}

function flushResponseQueue(id) {
  const p = pending.get(id);
  if (!p || p.res.destroyed) return;
  while (p.queue.length) {
    // write(false) already accepted this chunk. Remove it exactly once.
    const buf = p.queue.shift();
    p.queuedBytes -= buf.length;
    let ok;
    try { ok = p.res.write(buf); }
    catch { endPending(id, 502, {error:'client_write_failed'}); return; }
    if (!ok) {
      if (!p.paused) {
        p.paused = true;
        bridgeSend({ type: "flow_pause", id }, p.owner);
      }
      return;
    }
  }

  if (p.paused) {
    p.paused = false;
    bridgeSend({ type: "flow_resume", id }, p.owner);
  }

  if (p.remoteEnded) endPending(id);
}

const server = http.createServer((req, res) => {
  const receivedAt=Date.now();
  const url = new URL(req.url || "/", "http://relay.invalid");

  if (url.pathname === "/healthz") {
    const serverState = bridgeStates.server;
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({
      ok: true,
      bridge: !!serverState.ws && serverState.ws.readyState === serverState.ws.OPEN,
      bridgeSince: serverState.since,
      bridgeLastMessageAt: serverState.lastMessageAt,
      bridges: Object.fromEntries(Object.entries(bridgeStates).map(([name, st]) => [name, {
        connected: !!st.ws && st.ws.readyState === st.ws.OPEN,
        since: st.since,
        lastMessageAt: st.lastMessageAt,
      }])),
      inflight: pending.size,
      admissions,
      requestBufferedBytes,
      maxInflight: MAX_INFLIGHT,
      ranges: rangeNetworks.length,
      rangesUpdatedAt,
      rangesFetchedAt,
      rangeError,
      limits: {
        requestBodyBytes: MAX_BODY,
        requestBufferGlobalBytes: REQUEST_BUFFER_GLOBAL_LIMIT,
        responseQueueBytes: RESPONSE_QUEUE_LIMIT
      },
    }));
    return;
  }

  const pathBackend = url.pathname === "/pop/mcp" ? "pop" : url.pathname === "/mcp" ? "server" : null;
  const isMcp = pathBackend !== null;
  const isProbe = url.pathname === "/__probe";
  if (!isMcp && !isProbe) {
    res.writeHead(404, { "content-type": "text/plain", "cache-control": "no-store" });
    res.end("Not Found");
    return;
  }

  if (isMcp) {
    const tokenAuthenticated = verifyAccessToken(req);
    const candidates = getIngressCandidates(req);
    const trustedOpenAiIp = rangeNetworks.length ? candidates.find(ipAllowed) : null;
    if (!tokenAuthenticated && !trustedOpenAiIp) {
      const cfRay = String(req.headers["cf-ray"] || "").slice(0, 128) || null;
      console.warn(JSON.stringify({ event: "request_denied", reason: "auth", cfRay, candidates, rangesUpdatedAt, rangesFetchedAt, rangeError }));
      res.writeHead(403, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({ error: "forbidden" }));
      return;
    }
  } else if (!verifySignedRequest(req, url.pathname, PUBLIC_KEYS.server)) {
    res.writeHead(403, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ error: "forbidden" }));
    return;
  }

  if (pending.size + admissions >= MAX_INFLIGHT) {
    res.writeHead(429, { "content-type": "application/json", "cache-control": "no-store", "retry-after": "1" });
    res.end(JSON.stringify({ error: "busy" }));
    return;
  }

  admissions += 1;
  const chunks = [];
  let size = 0;
  let rejected = false;
  let released = false;
  let buffered = 0;
  const releaseAdmission = () => {
    if (released) return;
    released = true;
    clearTimeout(bodyTimer);
    admissions = Math.max(0, admissions - 1);
    requestBufferedBytes = Math.max(0, requestBufferedBytes - buffered);
    buffered = 0;
  };
  const abortAdmission = () => {
    rejected = true;
    releaseAdmission();
    chunks.length = 0;
  };
  const bodyTimer = setTimeout(() => {
    abortAdmission();
    if (!res.headersSent && !res.destroyed) {
      res.writeHead(408, {"content-type":"application/json"});
      res.end(JSON.stringify({error:'request_body_timeout'}));
    }
    req.destroy();
  }, 20_000);
  bodyTimer.unref?.();
  req.once('aborted', abortAdmission);
  req.once('error', abortAdmission);
  req.once('close', () => { if (!req.complete) abortAdmission(); });

  req.on("data", chunk => {
    if (rejected) return;
    size += chunk.length;
    if (size > MAX_BODY || requestBufferedBytes + chunk.length > REQUEST_BUFFER_GLOBAL_LIMIT) {
      rejected = true;
      releaseAdmission();
      chunks.length = 0;
      res.writeHead(size > MAX_BODY ? 413 : 429, {
        "content-type": "application/json", "cache-control": "no-store", "retry-after": "1"
      });
      res.end(JSON.stringify({ error: size > MAX_BODY ? "request_too_large" : "request_buffer_busy" }));
      req.destroy();
      return;
    }
    requestBufferedBytes += chunk.length;
    buffered += chunk.length;
    chunks.push(chunk);
  });

  req.on("end", () => {
    if (rejected) return;
    releaseAdmission();
    const originalBody = Buffer.concat(chunks);
    chunks.length = 0;
    const routed = routeMcpRequest(originalBody, isProbe ? "server" : pathBackend);
    const targetBackend = routed.backend;
    const targetState = targetBackend ? bridgeStates[targetBackend] : null;
    if (!targetState?.ws || targetState.ws.readyState !== targetState.ws.OPEN) {
      res.writeHead(503, { "content-type": "application/json", "cache-control": "no-store", "retry-after": "1" });
      res.end(JSON.stringify({ error: "bridge_offline" }));
      return;
    }
    const owner = targetState.ws;
    const id = crypto.randomUUID();
    const bodyBuffer = routed.body;
    const rpc = extractRpcMeta(bodyBuffer);
    const timer = setTimeout(() => {
      const p = pending.get(id);
      if (!p) return;
      console.warn(JSON.stringify({ event: "request_timeout", id, rpcId: p.rpcId, rpcMethod: p.rpcMethod, toolName: p.toolName }));
      bridgeSend({ type: "cancel", id }, p.owner);
      endPending(id, 504, { error: "upstream_timeout" });
    }, Math.max(1,REQUEST_TIMEOUT_MS-(Date.now()-receivedAt)));

    const cfRay = String(req.headers["cf-ray"] || "").slice(0, 128) || null;
    pending.set(id, {
      res, timer, owner, started: Date.now(), paused: false, cfRay,
      rpcId: rpc.rpcId, rpcMethod: rpc.rpcMethod, toolName: rpc.toolName,
      queue: [], queuedBytes: 0, remoteEnded: false,
    });

    res.on("drain", () => flushResponseQueue(id));
    res.on("close", () => {
      if (!pending.has(id)) return;
      bridgeSend({ type: "cancel", id }, owner);
      endPending(id, 499, {error:'client_disconnected'});
    });

    const ok = bridgeSend({
      type: "request",
      id,
      method: req.method,
      url: (isProbe || targetBackend === "pop") ? "/mcp" + url.search : url.pathname + url.search,
      headers: cleanHeaders(req.headers, true),
      body: bodyBuffer.toString("base64"),
      rpcId: rpc.rpcId,
      rpcMethod: rpc.rpcMethod,
      toolName: rpc.toolName,
      remainingMs:Math.max(1,REQUEST_TIMEOUT_MS-(Date.now()-receivedAt)),
    }, owner);

    if (!ok) endPending(id, 502, { error: "bridge_send_failed" });
  });
});

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: WS_MAX_PAYLOAD,
  perMessageDeflate: false,
});

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", "http://relay.invalid");
  const backend = url.pathname === "/bridge/pop" ? "pop" : url.pathname === "/bridge" ? "server" : null;
  if (!backend) {
    socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  if (!verifySignedRequest(req, url.pathname, PUBLIC_KEYS[backend])) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => {
    ws.tcfBackend = backend;
    wss.emit("connection", ws);
  });
});

wss.on("connection", ws => {
  const backend = ws.tcfBackend;
  const state = bridgeStates[backend];
  if (!state) {
    try { ws.close(4003, "unknown_backend"); } catch {}
    return;
  }
  if (state.ws && state.ws.readyState === state.ws.OPEN) {
    failAll('bridge_replaced', state.ws);
    try { state.ws.close(4001, "replaced"); } catch {}
  }

  state.ws = ws;
  state.since = new Date().toISOString();
  state.lastMessageAt = state.since;
  ws.isAlive = true;
  console.log(JSON.stringify({ event: "bridge_connected", backend, at: state.since }));

  ws.on("pong", () => { ws.isAlive = true; });

  ws.on('error', () => { failAll('bridge_socket_error', ws); });
  ws.on("message", raw => {
    if (ws !== state.ws) return;
    state.lastMessageAt = new Date().toISOString();
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "keepalive") {
      bridgeSend({ type: "keepalive_ack", ts: msg.ts || Date.now() }, ws);
      return;
    }

    const p = msg.id ? pending.get(msg.id) : null;
    if (!p || p.owner !== ws) return;

    if (msg.type === "response_start") {
      try {
        p.status = Number(msg.status || 502);
        p.res.writeHead(p.status, cleanHeaders(msg.headers || {}, false));
      } catch {
        endPending(msg.id, 502, { error: "invalid_upstream_headers" });
      }
      return;
    }

    if (msg.type === "response_chunk") {
      const buf = Buffer.from(msg.data || "", "base64");
      if (p.paused || p.queue.length) {
        p.queue.push(buf);
        p.queuedBytes += buf.length;
        if (p.queuedBytes > RESPONSE_QUEUE_LIMIT) {
          bridgeSend({ type: "cancel", id: msg.id });
          endPending(msg.id, 502, { error: "response_backpressure_overflow" });
        }
        return;
      }

      const ok = p.res.write(buf);
      if (!ok) {
        p.paused = true;
        bridgeSend({ type: "flow_pause", id: msg.id });
      }
      return;
    }

    if (msg.type === "response_end") {
      if (p.queue.length || p.paused) {
        p.remoteEnded = true;
      } else {
        endPending(msg.id);
      }
      return;
    }

    if (msg.type === "response_error") {
      console.warn(JSON.stringify({ event: "request_error", id: msg.id, rpcId: p.rpcId, rpcMethod: p.rpcMethod, toolName: p.toolName, code: msg.code || "upstream_error" }));
      endPending(msg.id, 502, { error: msg.code || "upstream_error" });
    }
  });

  ws.on("close", () => {
    if (state.ws !== ws) return;
    state.ws = null;
    state.since = null;
    state.lastMessageAt = null;
    const affected = [...pending.values()].filter(p => p.owner === ws).length;
    failAll("bridge_disconnected", ws);
    console.warn(JSON.stringify({ event: "bridge_disconnected", backend, pending: affected }));
  });
});

setInterval(() => {
  for (const [backend, state] of Object.entries(bridgeStates)) {
    const ws = state.ws;
    if (!ws || ws.readyState !== ws.OPEN) continue;
    if (!ws.isAlive) {
      try { ws.terminate(); } catch {}
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  }
}, 20_000).unref();

setInterval(() => {
  const now = Date.now();
  for (const [nonce, expires] of usedNonces) if (expires <= now) usedNonces.delete(nonce);
  for (const [backend, state] of Object.entries(bridgeStates)) {
    if (state.lastMessageAt && now - Date.parse(state.lastMessageAt) > KEEPALIVE_STALE_MS) {
      console.warn(JSON.stringify({ event: "bridge_application_keepalive_stale", backend }));
    }
  }
}, 60_000).unref();

await refreshRanges();
setInterval(refreshRanges, RANGE_REFRESH_MS).unref();

server.keepAliveTimeout = 90_000;
server.headersTimeout = 95_000;
server.requestTimeout = 20_000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(JSON.stringify({ event: "relay_v2_ready", port: PORT, maxInflight: MAX_INFLIGHT }));
});