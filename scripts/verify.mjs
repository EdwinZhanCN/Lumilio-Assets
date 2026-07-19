import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const mediaRoot = path.join(root, "media");

function fail(message) {
  throw new Error(message);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function listFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), relative)));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files;
}

const catalog = await readJson("assets.json");
if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.assets)) {
  fail("assets.json must have schemaVersion 1 and an assets array");
}

const ids = new Set();
const paths = new Set();
for (const asset of catalog.assets) {
  if (!asset.id || ids.has(asset.id)) fail(`duplicate or missing asset id: ${asset.id}`);
  if (!asset.path?.startsWith("media/") || paths.has(asset.path)) {
    fail(`duplicate or invalid media path for ${asset.id}: ${asset.path}`);
  }
  if (!/^[a-f0-9]{64}$/.test(asset.sha256)) fail(`invalid SHA-256 for ${asset.id}`);
  if (!asset.mime || !asset.source?.url || !asset.license?.name || !asset.license?.url) {
    fail(`incomplete metadata for ${asset.id}`);
  }

  const absolutePath = path.join(root, asset.path);
  const bytes = await readFile(absolutePath);
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== asset.sha256) fail(`SHA-256 mismatch for ${asset.id}`);
  if ((await stat(absolutePath)).size !== asset.bytes) fail(`byte-size mismatch for ${asset.id}`);
  ids.add(asset.id);
  paths.add(asset.path);
}

const diskFiles = new Set((await listFiles(mediaRoot)).map((file) => `media/${file}`));
for (const mediaPath of diskFiles) {
  if (!paths.has(mediaPath)) fail(`uncatalogued media file: ${mediaPath}`);
}
for (const mediaPath of paths) {
  if (!diskFiles.has(mediaPath)) fail(`catalog references missing file: ${mediaPath}`);
}

const profileNames = ["smoke", "e2e", "demo"];
const profiles = new Map();
for (const name of profileNames) {
  const profile = await readJson(`profiles/${name}.json`);
  if (profile.schemaVersion !== 1 || profile.name !== name || !Array.isArray(profile.assets)) {
    fail(`invalid ${name} profile`);
  }
  if (new Set(profile.assets).size !== profile.assets.length) fail(`duplicate IDs in ${name} profile`);
  for (const id of profile.assets) if (!ids.has(id)) fail(`${name} references unknown asset: ${id}`);
  profiles.set(name, new Set(profile.assets));
}

for (const id of profiles.get("smoke")) {
  if (!profiles.get("e2e").has(id)) fail(`smoke asset is not in e2e: ${id}`);
}
for (const id of profiles.get("e2e")) {
  if (!profiles.get("demo").has(id)) fail(`e2e asset is not in demo: ${id}`);
}
if (profiles.get("demo").size !== ids.size) fail("demo profile must include the complete catalog");

console.log(`Verified ${ids.size} assets and ${profileNames.length} profiles.`);

