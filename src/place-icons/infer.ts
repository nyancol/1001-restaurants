/** Icon vocabulary + primaryType-only frozen inference. */
export const ICONS = [
  "fork",
  "burger",
  "pizza",
  "soup",
  "hotdog",
  "bagel",
  "croissant",
  "ice-cream",
  "cocktail",
  "wine",
  "beer",
  "coffee",
] as const;
export type IconId = (typeof ICONS)[number];

export const ICON_EMOJI: Record<string, string> = {
  fork: "🍴",
  burger: "🍔",
  pizza: "🍕",
  soup: "🍲",
  hotdog: "🌭",
  bagel: "🥯",
  croissant: "🥐",
  "ice-cream": "🍨",
  cocktail: "🍸",
  wine: "🍷",
  beer: "🍺",
  coffee: "☕",
};

const PRIMARY_TYPE_TO_ICON: Record<string, IconId> = {
  hamburger_restaurant: "burger",
  pizza_restaurant: "pizza",
  ramen_restaurant: "soup",
  noodle_shop: "soup",
  pho_restaurant: "soup",
  soup_restaurant: "soup",
  hot_dog_restaurant: "hotdog",
  hotdog_restaurant: "hotdog",
  bagel_shop: "bagel",
  bakery: "croissant",
  patisserie: "croissant",
  croissant_shop: "croissant",
  boulangerie: "croissant",
  ice_cream_shop: "ice-cream",
  gelateria: "ice-cream",
  dessert_shop: "ice-cream",
  yogurt_shop: "ice-cream",
  cocktail_bar: "cocktail",
  pub: "cocktail",
  speakeasy: "cocktail",
  wine_bar: "wine",
  brewery: "beer",
  beer_garden: "beer",
  irish_pub: "beer",
  sports_bar: "beer",
  cafe: "coffee",
  coffee_shop: "coffee",
  tea_house: "coffee",
  brunch_restaurant: "coffee",
};

/** Normalize an icon id (accept ice_cream / ice cream aliases). */
export function normalizeIcon(input: unknown): string {
  if (typeof input !== "string") return "";
  const t = input.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  if (!t) return "";
  if (t === "ice-cream" || t === "icecream") return "ice-cream";
  return t;
}

export function isValidIcon(t: string): boolean {
  return (ICONS as readonly string[]).includes(t);
}

/** Exact lookup: primaryType first, then types[] in order. Miss/null → fork. */
export function inferIcon(primaryType: unknown, types: unknown): IconId {
  const pick = (v: unknown): IconId | null => {
    if (typeof v !== "string" || !v) return null;
    const key = v.trim().toLowerCase();
    return (PRIMARY_TYPE_TO_ICON as Record<string, IconId>)[key] ?? null;
  };
  const fromPrimary = pick(primaryType as string);
  if (fromPrimary) return fromPrimary;
  if (Array.isArray(types)) {
    for (const t of types) {
      const hit = pick(t);
      if (hit) return hit;
    }
  }
  return "fork";
}
