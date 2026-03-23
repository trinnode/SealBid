import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

async function findTfheWasm(startDir) {
  const pnpmRoot = path.join(startDir, ".pnpm");
  const entries = await fs.readdir(pnpmRoot, { withFileTypes: true });

  const tfhePkgs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("tfhe@"))
    .map((entry) => entry.name)
    .sort();

  const fhenixPkgs = entries
    .filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("fhenixjs@"),
    )
    .map((entry) => entry.name)
    .sort();

  const candidates = [
    // Preferred browser-targeted wasm from tfhe package used by @cofhe/react.
    ...tfhePkgs.map((pkgDir) =>
      path.join(pnpmRoot, pkgDir, "node_modules", "tfhe", "tfhe_bg.wasm"),
    ),
    // Browser wasm alias shipped by fhenixjs.
    ...fhenixPkgs.map((pkgDir) =>
      path.join(
        pnpmRoot,
        pkgDir,
        "node_modules",
        "fhenixjs",
        "src",
        "sdk",
        "fhe",
        "tfhe_bg-browser.wasm",
      ),
    ),
    // Fallback if only direct fhenixjs source wasm exists.
    ...fhenixPkgs.map((pkgDir) =>
      path.join(
        pnpmRoot,
        pkgDir,
        "node_modules",
        "fhenixjs",
        "src",
        "sdk",
        "fhe",
        "tfhe_bg.wasm",
      ),
    ),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    "Unable to locate browser-compatible TFHE wasm in node_modules",
  );
}

async function ensureCopied(srcPath, destPath) {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.copyFile(srcPath, destPath);
}

async function main() {
  const wasmSource = await findTfheWasm(path.join(root, "node_modules"));

  const targets = [
    path.join(root, "public", "node_modules", ".vite", "deps", "tfhe_bg.wasm"),
    path.join(root, "public", "tfhe_bg.wasm"),
  ];

  for (const target of targets) {
    await ensureCopied(wasmSource, target);
  }

  console.log("Prepared TFHE wasm:", wasmSource);
  for (const target of targets) {
    console.log(" ->", target);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
