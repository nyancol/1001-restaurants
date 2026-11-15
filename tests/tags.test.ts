import { describe, expect, it } from "vitest";
import { normalizeTags } from "../src/tags/normalize.js";
import { TAG_PALETTE, isPaletteColor, stableHash, colorForTag, randomPaletteColor } from "../src/tags/palette.js";

describe("normalizeTags", () => {
  it("trims, lowercases and dedupes", () => {
    expect(normalizeTags([" Japonais ", "JAPONAIS", "cozy", "cozy", " ", ""])).toEqual(["japonais", "cozy"]);
  });
  it("returns [] for non-array", () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags("x")).toEqual([]);
  });
});

describe("tag palette", () => {
  it("has 32 unique palette entries", () => {
    expect(TAG_PALETTE).toHaveLength(32);
    expect(new Set(TAG_PALETTE).size).toBe(32);
    for (const c of TAG_PALETTE) {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(isPaletteColor(c)).toBe(true);
    }
  });
  it("rejects off-palette values", () => {
    expect(isPaletteColor("#FFFFFF")).toBe(false);
    expect(isPaletteColor("red")).toBe(false);
    expect(isPaletteColor(undefined)).toBe(false);
  });
  it("hash is deterministic", () => {
    expect(stableHash("cozy")).toBe(stableHash("cozy"));
    expect(colorForTag("cozy")).toBe(TAG_PALETTE[stableHash("cozy") % 32]);
    expect(colorForTag("japonais")).toBe(TAG_PALETTE[stableHash("japonais") % 32]);
  });
  it("random picks within palette", () => {
    for (let i = 0; i < 20; i++) {
      expect(isPaletteColor(randomPaletteColor())).toBe(true);
    }
    const exclude = new Set(TAG_PALETTE.slice(0, 31));
    expect(randomPaletteColor(exclude)).toBe(TAG_PALETTE[31]);
  });
});
