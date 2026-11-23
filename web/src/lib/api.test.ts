import { describe, expect, it } from "vitest";
import {
  mergeDuplicateRating,
  parseDetails,
  prettifyVenueType,
  venueTypeLabelFromDetails,
} from "./api";

describe("prettifyVenueType", () => {
  it("prettifies snake_case codes", () => {
    expect(prettifyVenueType("indian_restaurant")).toBe("Indian Restaurant");
  });
  it("filters generic types and non-strings", () => {
    expect(prettifyVenueType("point_of_interest")).toBeNull();
    expect(prettifyVenueType("establishment")).toBeNull();
    expect(prettifyVenueType(null)).toBeNull();
    expect(prettifyVenueType("")).toBeNull();
  });
});

describe("venueTypeLabelFromDetails", () => {
  it("prefers primaryTypeDisplayName.text verbatim", () => {
    expect(
      venueTypeLabelFromDetails({ primaryTypeDisplayName: { text: "Indian restaurant" } }),
    ).toBe("Indian restaurant");
  });
  it("falls back to prettified primaryType", () => {
    expect(venueTypeLabelFromDetails({ primaryType: "indian_restaurant" })).toBe(
      "Indian Restaurant",
    );
  });
  it("falls back to first usable types entry, skipping generics", () => {
    expect(
      venueTypeLabelFromDetails({ types: ["point_of_interest", "establishment", "cafe"] }),
    ).toBe("Cafe");
  });
  it("returns null when no usable type data", () => {
    expect(venueTypeLabelFromDetails({})).toBeNull();
    expect(venueTypeLabelFromDetails({ types: ["point_of_interest"] })).toBeNull();
  });
});

describe("parseDetails venueTypeLabel", () => {
  it("plumbs the label through while still inferring the icon", () => {
    const d = parseDetails(
      {
        id: "p1",
        displayName: { text: "Taj" },
        primaryType: "indian_restaurant",
        primaryTypeDisplayName: { text: "Indian restaurant" },
        types: ["indian_restaurant", "restaurant"],
      },
      "p1",
      "Taj",
    );
    expect(d.venueTypeLabel).toBe("Indian restaurant");
    expect(d.icon).toBe("fork");
  });
});

describe("mergeDuplicateRating", () => {
  it("preserves stored rating when draft is null", () => {
    expect(mergeDuplicateRating(null, 4)).toBe(4);
  });
  it("applies explicit draft rating over stored", () => {
    expect(mergeDuplicateRating(5, 4)).toBe(5);
  });
  it("stays null when neither exists", () => {
    expect(mergeDuplicateRating(null, null)).toBeNull();
  });
});
