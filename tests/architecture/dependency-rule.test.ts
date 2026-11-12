import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, it } from "node:test";

const ROOT = resolve(import.meta.dirname, "../..");
const SRC = join(ROOT, "src");

/** Layers each layer may import from. Anything else breaks the dependency rule. */
const ALLOWED: Record<string, string[]> = {
  domain: ["domain"],
  application: ["domain", "application"],
  infrastructure: ["domain", "application", "infrastructure"],
  ui: ["domain", "application", "ui"],
  composition: ["domain", "application", "infrastructure", "ui", "composition"],
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
  });

const importsOf = (file: string) => [...readFileSync(file, "utf8").matchAll(/(?:from|import)\s+"([^"]+)"/g)].map((match) => match[1]);

/** Layer of `src` an import points to, or null for packages and files outside `src`. */
function targetLayer(file: string, specifier: string): string | null {
  const target = specifier.startsWith("@/") ? join(ROOT, specifier.slice(2)) : specifier.startsWith(".") ? resolve(dirname(file), specifier) : null;
  if (!target) return null;
  const path = relative(SRC, target);
  return path.startsWith("..") ? "outside-src" : path.split(/[\\/]/)[0];
}

describe("architecture", () => {
  const files = sourceFiles(SRC);

  it("keeps every dependency pointing inwards", () => {
    const violations = files.flatMap((file) => {
      const layer = relative(SRC, file).split(/[\\/]/)[0];
      return importsOf(file)
        .map((specifier) => ({ specifier, target: targetLayer(file, specifier) }))
        .filter(({ target }) => target !== null && !ALLOWED[layer].includes(target))
        .map(({ specifier }) => `${relative(ROOT, file)} -> ${specifier}`);
    });
    assert.deepEqual(violations, []);
  });

  it("keeps the domain and the application free of frameworks and browser or server APIs", () => {
    const core = files.filter((file) => /[\\/]src[\\/](domain|application)[\\/]/.test(file));
    const violations = core.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const packages = importsOf(file).filter((specifier) => !specifier.startsWith("."));
      const globals = ["localStorage", "sessionStorage", "window.", "document.", "fetch(", "process.env"].filter((name) => source.includes(name));
      return [...packages, ...globals].map((found) => `${relative(ROOT, file)} uses ${found}`);
    });
    assert.deepEqual(violations, []);
  });

  it("separates what runs on the server from what runs on the player's device", () => {
    const violations = files.flatMap((file) => {
      const side = /[\\/](application|infrastructure)[\\/](server|client)[\\/]/.exec(file)?.[2];
      if (!side) return [];
      const other = side === "server" ? "client" : "server";
      return importsOf(file).filter((specifier) => new RegExp(`(^|/)${other}/`).test(specifier)).map((specifier) => `${relative(ROOT, file)} -> ${specifier}`);
    });
    assert.deepEqual(violations, []);
  });
});
