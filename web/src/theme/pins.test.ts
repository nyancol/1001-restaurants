import { describe, expect, it } from "vitest";
import { PIN_FILL, ICONS, ICON_EMOJI, pinImageFor, emojiFor, knownIcons, iconSvgFor } from "./pins";

describe("neutral pins", () => {
  it("has 12 icons with emoji", () => {
    expect(ICONS).toHaveLength(12);
    expect(knownIcons()).toHaveLength(12);
    for (const id of ICONS) expect(ICON_EMOJI[id]).toBeTruthy();
  });
  it("single neutral fill", () => {
    expect(PIN_FILL).toBe("#1F6F5B");
  });
  it("pinImageFor covers all 12 plus fallback", () => {
    for (const id of ICONS) expect(pinImageFor(id)).toBe(`drop-${id}`);
    expect(pinImageFor("sushi")).toBe("drop-generic");
    expect(pinImageFor("")).toBe("drop-fork");
  });
  it("emojiFor falls back", () => {
    expect(emojiFor("pizza")).toBe("🍕");
    expect(emojiFor("nope")).toBe("📍");
  });
  it("vector glyphs exist for all 12 and carry no painted color", () => {
    for (const id of ICONS) {
      const s = iconSvgFor(id);
      expect(s).toMatch(/<(path|rect|circle|ellipse)/);
      expect(s).not.toMatch(/#[0-9a-fA-F]{3,6}/);
      expect(s).not.toMatch(/fill="(white|#fff)/);
    }
  });
});
