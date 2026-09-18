import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { copyFile, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readerRoot = path.join(root, "guide-reader");
const manifestPath = path.join(readerRoot, "SOURCE.json");
const run = promisify(execFile);

export async function copyReaderPayload(destination, { requireClean = false } = {}) {
  const manifestText = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);
  const files = Object.entries(manifest.files).sort(([left], [right]) => left.localeCompare(right));

  for (const [relativePath, expectedHash] of files) {
    if (!relativePath || path.posix.normalize(relativePath) !== relativePath ||
        relativePath.startsWith("/") || relativePath.split("/").includes("..") ||
        relativePath.includes("\\") || !/^[a-f0-9]{64}$/.test(expectedHash)) {
      throw new Error(`Invalid reader payload manifest entry: ${relativePath}`);
    }
    const sourcePath = path.join(readerRoot, relativePath);
    const actualHash = createHash("sha256").update(await readFile(sourcePath)).digest("hex");
    if (actualHash !== expectedHash) {
      throw new Error(`Reader payload hash mismatch: ${relativePath}`);
    }
  }
  const generatorHash = createHash("sha256")
    .update(await readFile(path.join(root, manifest.generator.path)))
    .digest("hex");
  if (generatorHash !== manifest.generator.sha256) {
    throw new Error("Identity generator hash mismatch");
  }

  const receipt = await buildReceipt(manifest, manifestText);
  if (requireClean && receipt.dirty) {
    throw new Error("Refusing to sync from a dirty or uncommitted canonical repository");
  }

  await assertWritablePath(destination, true);
  for (const [relativePath] of files) {
    const targetPath = path.join(destination, relativePath);
    await assertWritablePath(targetPath, false, destination);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(path.join(readerRoot, relativePath), targetPath);
  }
  await mkdir(destination, { recursive: true });
  await assertWritablePath(path.join(destination, "SOURCE.json"), false, destination);
  await copyFile(manifestPath, path.join(destination, "SOURCE.json"));
  await assertWritablePath(path.join(destination, "RECEIPT.json"), false, destination);
  await writeFile(path.join(destination, "RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  return { manifest, receipt };
}

async function buildReceipt(manifest, manifestText) {
  const [{ stdout: commit }, { stdout: status }] = await Promise.all([
    run("git", ["rev-parse", "HEAD"], { cwd: root }),
    run("git", ["status", "--porcelain", "--untracked-files=normal"], { cwd: root })
  ]);
  return {
    schemaVersion: 1,
    repository: "https://github.com/LeiShi1313/bettergi-training-guide",
    commit: commit.trim(),
    dirty: status.trim().length > 0,
    payloadManifestSha256: createHash("sha256").update(manifestText).digest("hex"),
    extractedFrom: manifest.source
  };
}

async function assertWritablePath(target, directory, boundary = path.dirname(target)) {
  const relative = path.relative(boundary, target);
  const candidates = [boundary];
  if (relative) {
    for (const segment of relative.split(path.sep)) {
      candidates.push(path.join(candidates[candidates.length - 1], segment));
    }
  }
  for (const [index, candidate] of candidates.entries()) {
    try {
      const entry = await lstat(candidate);
      if (entry.isSymbolicLink()) throw new Error(`Refusing to write through symlink: ${candidate}`);
      const shouldBeDirectory = index < candidates.length - 1 || directory;
      if (shouldBeDirectory ? !entry.isDirectory() : !entry.isFile()) {
        throw new Error(`Unexpected sync target type: ${candidate}`);
      }
    } catch (error) {
      if (error && error.code === "ENOENT") continue;
      throw error;
    }
  }
}
