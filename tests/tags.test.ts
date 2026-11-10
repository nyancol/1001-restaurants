import { describe, expect, it } from "vitest";
import { normalizeTags } from "../src/tags/normalize.js";

describe("normalizeTags", () => {
  it("trims, lowercases and dedupes", () => {
    expect(normalizeTags([" Japonais ", "JAPONAIS", "cozy", "cozy", " ", ""])).toEqual(["japonais", "cozy"]);
  });
  it("returns [] for non-array", () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags("x")).toEqual([]);
  });
});
