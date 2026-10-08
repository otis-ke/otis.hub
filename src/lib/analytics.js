// Privacy-friendly analytics: only anonymous counters, no cookies, no personal data.
// Everything is stored under /otishub/stats:
//   days/<YYYY-MM-DD>/<metric>     visits, views, enquiries, chats, catClicks, searches, mobile, desktop
//   products/<id>/views|enquiries  all-time per product
//   cats/<id>, searches/<term>, sources/<site>
import { bump } from "./db.js";

const NO_TRACK = "otishub-notrack";   // set on the admin's own devices so they don't skew the numbers

export const TIMEZONE = "Africa/Nairobi";
export const dayKey = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);

// RTDB keys can't contain . # $ [ ] /
export const safeKey = (s) => String(s).trim().replace(/[.#$[\]/]/g, "_").slice(0, 60) || "_";

export function isTracking() {
  try { return localStorage.getItem(NO_TRACK) !== "1"; } catch { return true; }
}
export function setTracking(on) {
  try { on ? localStorage.removeItem(NO_TRACK) : localStorage.setItem(NO_TRACK, "1"); } catch {}
}

function send(metrics, extra = []) {
  if (!isTracking()) return;
  const d = dayKey();
  bump([...metrics.map((m) => `days/${d}/${m}`), ...extra]);
}

// one visit per browser tab session
export function trackVisit() {
  try {
    if (sessionStorage.getItem("otishub-visit")) return;
    sessionStorage.setItem("otishub-visit", "1");
  } catch {}
  const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  let source = "direct";
  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host && host !== location.hostname.replace(/^www\./, "")) source = host;
    }
  } catch {}
  send(["visits", mobile ? "mobile" : "desktop"], [`sources/${safeKey(source)}`]);
}

export const trackView = (id) => send(["views"], [`products/${safeKey(id)}/views`]);
export const trackEnquiry = (id) => send(["enquiries"], [`products/${safeKey(id)}/enquiries`]);
export const trackChat = () => send(["chats"]);
export const trackCategory = (id) => send(["catClicks"], [`cats/${safeKey(id)}`]);
export const trackSearch = (q) => send(["searches"], [`searches/${safeKey(q.toLowerCase())}`]);
