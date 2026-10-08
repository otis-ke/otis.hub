import { useEffect } from "react";
import { WHATSAPP, CURRENCY, CLOUDINARY } from "./config.js";

// Ask Cloudinary for a resized, auto-format version of the image
export function img(url, w = 800) {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${w}/`);
}

export function money(p) {
  if (p === null || p === undefined || p === "" || isNaN(Number(p))) return null;
  return `${CURRENCY} ${Number(p).toLocaleString("en-KE")}`;
}

export const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

export const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const millis = (t) => (typeof t === "number" ? t : 0);

export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Upload a File, Blob or remote URL string straight to Cloudinary (unsigned)
export function uploadImage(fileOrUrl, onProgress, { folder = CLOUDINARY.folder, tags = CLOUDINARY.tag } = {}) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", fileOrUrl);
    fd.append("upload_preset", CLOUDINARY.preset);
    fd.append("folder", folder);
    fd.append("tags", tags);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloud}/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve(data.secure_url);
      else reject(new Error(data.error?.message || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.send(fd);
  });
}

// "led-downlight_12w-warm.jpg" -> "Led downlight 12w warm"
export function nameFromUrl(u) {
  try {
    const base = decodeURIComponent(new URL(u).pathname.split("/").pop() || "");
    return prettyName(base);
  } catch { return "Untitled product"; }
}
export function prettyName(filename) {
  const s = String(filename).replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : "Untitled product";
}

// Scroll-reveal: any element with class "reveal" gets data-in="1" once it
// scrolls into view (CSS does the animation). Picks up elements React adds later.
export function useReveal() {
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.dataset.in = "1"; io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    const scan = (root) => {
      const els = root.matches?.(".reveal:not([data-in])") ? [root] : [];
      root.querySelectorAll?.(".reveal:not([data-in])").forEach((el) => els.push(el));
      els.forEach((el) => (reduce ? (el.dataset.in = "1") : io.observe(el)));
    };
    scan(document.body);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n) => n.nodeType === 1 && scan(n));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
}
