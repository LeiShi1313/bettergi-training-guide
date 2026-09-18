import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { copyReaderPayload, root } from "./reader-payload.mjs";

const cliArguments = process.argv.slice(2).filter((argument) => argument !== "--");
if (cliArguments.length !== 1) {
  throw new Error("Usage: pnpm sync:consumer -- <consumer-root>");
}

const [argument] = cliArguments;
const requestedRoot = path.resolve(argument);
if (!(await stat(requestedRoot)).isDirectory()) {
  throw new Error(`Consumer root is not a directory: ${requestedRoot}`);
}
const consumerRoot = await realpath(requestedRoot);
const destination = path.join(consumerRoot, "guide-reader");
if (destination === path.join(root, "guide-reader")) {
  throw new Error("The source repository cannot be its own sync target");
}

const { receipt } = await copyReaderPayload(destination, { requireClean: true });
console.log(`Synced guide-reader from ${receipt.commit} to ${destination}`);
