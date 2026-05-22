import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import postcss from "postcss";

const globalsCssUrl = new URL("../app/globals.css", import.meta.url);
const layoutUrl = new URL("../app/layout.tsx", import.meta.url);
const packageJsonUrl = new URL("../package.json", import.meta.url);

test("dev server binds to localhost for local browser verification", async () => {
  const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8"));

  assert.equal(packageJson.scripts.dev, "next dev --hostname localhost --port 3000");
  assert.equal(packageJson.scripts["dev:fresh"], "node scripts/clear-next-cache.mjs && next dev --hostname localhost --port 3000");
});

test("root layout imports lowercase globals CSS for Next", async () => {
  const layoutSource = await readFile(layoutUrl, "utf8");

  assert.match(layoutSource, /import "\.\/globals\.css";/);
  assert.doesNotMatch(layoutSource, /Globals\.css/);
});

test("globals CSS has no stale migration section or duplicate root-level selector properties", async () => {
  const source = await readFile(globalsCssUrl, "utf8");
  const root = postcss.parse(source, { from: "app/globals.css" });
  const selectorProperties = new Map();
  const duplicates = [];

  assert.doesNotMatch(source, /migration overrides/i);
  assert.doesNotMatch(source, /Cashew-like/i);

  root.nodes.forEach((node) => {
    if (node.type !== "rule") {
      return;
    }

    const selectors = node.selectors.map((selector) => selector.trim());

    node.nodes.forEach((child) => {
      if (child.type !== "decl") {
        return;
      }

      selectors.forEach((selector) => {
        const key = `${selector}|${child.prop}`;
        const previousLine = selectorProperties.get(key);

        if (previousLine) {
          duplicates.push(`${selector} repeats ${child.prop} at lines ${previousLine} and ${node.source.start.line}`);
          return;
        }

        selectorProperties.set(key, node.source.start.line);
      });
    });
  });

  assert.deepEqual(duplicates, []);
});
