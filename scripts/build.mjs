import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = resolve(root, "dist/app.js");

await mkdir(dirname(outfile), { recursive: true });
await build({
  entryPoints: [resolve(root, "src/main.ts")],
  outfile,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  minify: true,
  legalComments: "none"
});

console.log("Built Ashford causal dialogue demo at dist/app.js");
