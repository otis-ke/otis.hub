// Thin data layer over Firebase Realtime Database.
// Everything lives under /otishub/... so it is completely separate from the
// other apps in this database (e.g. /pos).
import { ref, get, push, set, update, remove, serverTimestamp } from "firebase/database";
import { rtdb } from "./firebase.js";
import { DB_ROOT, SITE_ID } from "./config.js";

const path = (...parts) => [DB_ROOT, ...parts].join("/");
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

export async function list(col) {
  const snap = await get(ref(rtdb, path(col)));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, d]) => ({ id, ...d, images: Array.isArray(d.images) ? d.images : Object.values(d.images || {}) }))
    .filter((d) => d.site === SITE_ID);
}

export async function create(col, data) {
  const r = push(ref(rtdb, path(col)));
  const doc = clean({ ...data, site: SITE_ID, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  await set(r, doc);
  return r.key;
}

// null values delete the field (RTDB semantics)
export const patch = (col, id, data) =>
  update(ref(rtdb, path(col, id)), clean({ ...data, updatedAt: serverTimestamp() }));

export const destroy = (col, id) => remove(ref(rtdb, path(col, id)));

// Atomic multi-path write; keys like "products/<id>/categoryId"
export const multi = (updates) => update(ref(rtdb, DB_ROOT), updates);
