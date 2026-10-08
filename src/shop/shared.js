import { SITE_NAME } from "../lib/config.js";
import { money } from "../lib/util.js";

export const GENERAL_TEXT = `Hi ${SITE_NAME}, I'm enquiring about your lighting and electrical products.`;
export const DEFAULT_TITLE = `${SITE_NAME} — Lighting & Electrical Supplies`;

export const productUrl = (p) => `${location.origin}${location.pathname}#p=${p.id}`;

export const enquiryText = (p) => {
  const price = money(p.price);
  return `Hi ${SITE_NAME}, I'm enquiring about:\n\n*${p.name}*${p.code ? `\nModel: ${p.code}` : ""}${price ? `\nPrice: ${price}` : ""}\n${productUrl(p)}\n\nIs it available?`;
};

export const STOCK = { in: "In stock", few: "Few left", order: "On order", out: "Out of stock" };
