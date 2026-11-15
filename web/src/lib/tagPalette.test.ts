import { describe, expect, it } from "vitest";
import { TAG_PALETTE, colorForTag, resolveTagColor, stableHash } from "./tagPalette";

describe("tagPalette", () => {
  it("has 32 unique entries", () => {
    expect(TAG_PALETTE).toHaveLength(32);
    expect(new Set(TAG_PALETTE).size).toBe(32);
  });
  it("resolves known definitions, falls back deterministically", () => {
    const defs = [{ tag: "cozy", color: "#123456", count: 2 }];
    expect(resolveTagColor("cozy", defs)).toBe("#123456");
    expect(resolveTagColor("unknown-xyz", defs)).toBe(colorForTag("unknown-xyz"));
    expect(resolveTagColor("unknown-xyz", [])).toBe(TAG_PALETTE[stableHash("unknown-xyz") % 32]);
  });
  it("supports Map and Record inputs", () => {
    expect(resolveTagColor("a", new Map([["a", "#111111"]]))).toBe("#111111");
    expect(resolveTagColor("b", { a: "#111111" } as any)).toBe(colorForTag("b"));
  });
});
