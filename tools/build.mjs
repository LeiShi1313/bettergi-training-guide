import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { copyReaderPayload, root } from "./reader-payload.mjs";

const dist = path.join(root, "dist");
const standalone = path.join(dist, "BetterGI-Training-Guide");
const vendor = path.join(dist, "vendor", "guide-reader");

await rm(dist, { recursive: true, force: true });
await mkdir(standalone, { recursive: true });
for (const name of ["main.js", "manifest.json"]) {
  await copyFile(path.join(root, "standalone", name), path.join(standalone, name));
}
for (const name of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) {
  await copyFile(path.join(root, name), path.join(standalone, name));
}
await copyReaderPayload(path.join(standalone, "guide-reader"));
await copyReaderPayload(vendor);

console.log(`Built ${path.relative(root, standalone)} and ${path.relative(root, vendor)}`);
