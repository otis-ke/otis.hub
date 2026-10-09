// Shared by the shop (browser) and scripts/seo.mjs (build time). No browser or React imports.

export const SITE_URL = "https://otishub.online";
export const SITE_TITLE = "Otis Hub — Lights & Electrical Supplies in Kenya";
export const SITE_DESCRIPTION =
  "Shop chandeliers, pendant lights, wall lamps, LED panels, downlighters, bulbs, cables, switches, sockets and breakers in Kenya. See photos and prices, then order directly on WhatsApp.";

export const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const catSlug = (c) => c.slug || slugify(c.name);
export const productPath = (id) => `/p/${encodeURIComponent(id)}/`;
export const catPath = (c) => `/c/${catSlug(c)}/`;

export function parsePath(pathname) {
  const p = pathname.match(/^\/p\/([^/]+)\/?$/);
  if (p) return { productId: decodeURIComponent(p[1]) };
  const c = pathname.match(/^\/c\/([^/]+)\/?$/);
  if (c) return { catSlug: decodeURIComponent(c[1]) };
  return {};
}

// Words customers use for the same thing (incl. common Kenyan terms).
// A search word matches if the product text contains it or any word in its group.
export const SEARCH_GROUPS = [
  ["bulb", "globe", "filament", "edison", "led bulb", "tube", "fluorescent"],
  ["downlight", "downlighter", "down light", "recessed", "spotlight", "spot light", "spot"],
  ["panel", "led panel", "slim panel", "surface panel", "ceiling panel"],
  ["chandelier", "chandeliers", "crystal", "ring light", "ceiling light"],
  ["pendant", "hanging", "drop light", "kitchen light"],
  ["wall", "sconce", "wall lamp", "wall light", "bracket"],
  ["outdoor", "exterior", "garden", "gate", "compound", "security light", "pillar"],
  ["floodlight", "flood light", "flood", "security", "stadium"],
  ["strip", "snake", "rope light", "led tape", "neon", "cove"],
  ["string", "fairy", "festoon", "decor", "christmas"],
  ["cable", "wire", "wiring", "flex", "twin", "earth", "single core", "armoured"],
  ["switch", "socket", "outlet", "plug", "extension", "adaptor", "adapter"],
  ["breaker", "mcb", "rccb", "rcd", "isolator", "db", "distribution board", "consumer unit", "fuse"],
  ["conduit", "trunking", "pipe", "junction", "box", "gland"],
  ["holder", "lampholder", "lamp holder", "sisal", "fitting", "accessory", "accessories", "socket base"],
  ["solar", "rechargeable", "battery"],
  ["mirror", "vanity", "bathroom", "dressing"],
  ["floor", "standing", "step", "stair"],
];

const singular = (w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);

export function expandWord(word) {
  const w = word.toLowerCase(), s = singular(w);
  const alts = new Set([w, s]);
  for (const g of SEARCH_GROUPS) {
    if (g.some((t) => t === w || t === s || (s.length >= 4 && t.startsWith(s)))) g.forEach((t) => alts.add(t));
  }
  return [...alts];
}

// Filler words people add to searches ("wall light price nairobi") that shouldn't have to match
const FILLER = new Set(["light", "lights", "lighting", "lamp", "lamps", "led", "for", "the", "and", "with", "in", "kenya", "nairobi", "price", "prices", "buy", "cheap", "best", "shop", "online"]);
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function matchesQuery(haystack, q) {
  const hay = haystack.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const meaningful = words.filter((w) => !FILLER.has(w));
  // terms match at the start of a word, so "ring light" doesn't match inside "string lights"
  const has = (a) => new RegExp(`(^|[^a-z0-9])${escRe(a)}`).test(hay);
  return (meaningful.length ? meaningful : words).every((w) => expandWord(w).some(has));
}

// "What we supply" — shown on the page and used for search shortcuts and SEO copy
export const MATERIALS = [
  {
    title: "Lighting",
    items: [
      ["Chandeliers", "chandelier"], ["Pendant lights", "pendant"], ["Wall lamps", "wall"],
      ["Outdoor & gate lights", "outdoor"], ["Ceiling lights", "ceiling"], ["LED panel lights", "panel"],
      ["Downlighters", "downlight"], ["Spotlights", "spotlight"], ["Bulbs & tubes", "bulb"],
      ["LED strip & snake lights", "snake"], ["String & fairy lights", "string"], ["Mirror lights", "mirror"],
      ["Floor & step lamps", "floor"], ["Floodlights", "floodlight"], ["Solar lights", "solar"],
    ],
  },
  {
    title: "Electrical materials",
    items: [
      ["Cables & wires", "cable"], ["Twin & earth cable", "twin earth"], ["Flex cable", "flex"],
      ["Switches & sockets", "switch"], ["Plugs & extensions", "extension"], ["Circuit breakers (MCB)", "breaker"],
      ["RCCB / RCD", "rccb"], ["Distribution boards", "distribution board"], ["Conduit & trunking", "conduit"],
      ["Junction boxes", "junction"], ["Lamp holders", "holder"], ["Sisal holders", "sisal"],
      ["Lighting accessories", "accessories"], ["Fuses & isolators", "fuse"],
    ],
  },
];

export const KEYWORDS = [
  "lights Kenya", "lighting shop Kenya", "electrical shop Kenya", "electrical supplies Nairobi",
  "chandeliers Kenya", "pendant lights Kenya", "wall lamps Kenya", "LED panel lights Kenya",
  "downlighters Kenya", "bulbs Kenya", "outdoor lights Kenya", "cables and wires Kenya",
  "switches and sockets Kenya", "circuit breakers Kenya", "electrical materials Kenya",
];
