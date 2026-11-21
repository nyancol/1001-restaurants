import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONTRACT = [
  "--bg",
  "--surface",
  "--surface-2",
  "--ink",
  "--muted",
  "--line",
  "--radius-sm",
  "--radius-md",
  "--radius-pill",
  "--edge",
  "--shadow",
  "--accent",
  "--accent-ink",
  "--focus",
  "--want",
  "--want-ink",
  "--been",
  "--been-ink",
  "--star",
  "--star-idle",
  "--danger-bg",
  "--danger-ink",
  "--danger-line",
  "--info-bg",
  "--info-ink",
  "--info-line",
  "--font-body",
  "--font-display",
  "--font-mono",
];

describe("theme contract", () => {
  it("the single botanical theme defines every contract var", () => {
    const dir = join(__dirname, "..", "web", "src", "theme", "themes");
    const files = readdirSync(dir).filter((f) => f.endsWith(".css"));
    expect(files).toEqual(["botanical.css"]);
    const css = readFileSync(join(dir, files[0]), "utf8");
    for (const v of CONTRACT) {
      expect(css.includes(v), `${files[0]} missing ${v}`).toBe(true);
    }
  });
});
