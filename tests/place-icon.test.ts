import { describe, expect, it } from "vitest";
import { inferIcon, isValidIcon, normalizeIcon, ICONS } from "../src/place-icons/infer.js";

describe("place-icon inference", () => {
  it("maps known primaryTypes", () => {
    expect(inferIcon("pizza_restaurant", [])).toBe("pizza");
    expect(inferIcon("hamburger_restaurant", [])).toBe("burger");
    expect(inferIcon("wine_bar", [])).toBe("wine");
    expect(inferIcon("cafe", [])).toBe("coffee");
    expect(inferIcon("brewery", [])).toBe("beer");
  });
  it("falls back to types[] when primaryType unknown", () => {
    expect(inferIcon("restaurant", ["pizza_restaurant"])).toBe("pizza");
  });
  it("defaults long-tail and null to fork", () => {
    expect(inferIcon("sushi_restaurant", [])).toBe("fork");
    expect(inferIcon("restaurant", ["restaurant"])).toBe("fork");
    expect(inferIcon(null, null)).toBe("fork");
    expect(inferIcon(undefined, [])).toBe("fork");
  });
  it("validates and normalizes icons", () => {
    expect(ICONS).toHaveLength(12);
    expect(isValidIcon("pizza")).toBe(true);
    expect(isValidIcon("sushi")).toBe(false);
    expect(normalizeIcon("  Pizza  ")).toBe("pizza");
    expect(normalizeIcon("ice_cream")).toBe("ice-cream");
  });
});
