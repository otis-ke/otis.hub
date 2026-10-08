import { useEffect, useRef, useState } from "react";
import { SITE_NAME } from "../lib/config.js";
import { img, money, waLink } from "../lib/util.js";
import { WaIcon } from "../components/WaIcon.jsx";
import { trackEnquiry } from "../lib/analytics.js";
import { DEFAULT_TITLE, STOCK, enquiryText, productUrl } from "./shared.js";

export default function ProductDialog({ p, catById, onClose }) {
  const ref = useRef(null);
  const [cur, setCur] = useState(0);
  const [copied, setCopied] = useState(false);
  const x0 = useRef(null);

  useEffect(() => { setCur(0); setCopied(false); }, [p?.id]);

  useEffect(() => {
    const d = ref.current;
    if (p) {
      document.title = `${p.name} — ${SITE_NAME}`;
      if (!d.open) d.showModal();
      d.scrollTop = 0;
    } else if (d.open) {
      d.close();
    }
  }, [p]);

  const handleClose = () => { document.title = DEFAULT_TITLE; onClose(); };

  const views = p ? [{ url: p.mainImage, label: "" }, ...(p.images || []).filter((i) => i && i.url)] : [];
  const price = p && money(p.price);
  const cat = p && catById.get(p.categoryId), sub = p && catById.get(p.subcategoryId);

  // swipe between views on touch
  const onTouchStart = (e) => { x0.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (x0.current === null || views.length < 2) return;
    const dx = e.changedTouches[0].clientX - x0.current; x0.current = null;
    if (Math.abs(dx) < 40) return;
    setCur((c) => (c + (dx < 0 ? 1 : -1) + views.length) % views.length);
  };

  const share = async () => {
    try { await navigator.clipboard.writeText(productUrl(p)); setCopied(true); }
    catch { prompt("Copy this link:", productUrl(p)); }
  };

  return (
    <dialog className="pd" ref={ref} aria-label="Product details" onClose={handleClose}
      onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}>
      <button className="pd-close" aria-label="Close" onClick={() => ref.current.close()}>
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      {p && (
        <div className="pd-wrap" key={p.id}>
          <div className="pd-gallery">
            <div className="pd-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <img key={cur} src={img(views[cur]?.url, 1200)} alt={p.name} />
            </div>
            <p className="pd-caption">{views[cur]?.label || ""}</p>
            {views.length > 1 && (
              <div className="pd-thumbs">
                {views.map((v, i) => (
                  <button key={i} className={i === cur ? "on" : ""} title={v.label || (i === 0 ? "Main" : "View " + (i + 1))} onClick={() => setCur(i)}>
                    <img src={img(v.url, 200)} alt="" loading="lazy" />
                    {v.label && <span>{v.label}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pd-info">
            <p className="crumbs">
              {[cat?.name, sub?.name].filter(Boolean).map((n, i) => <span key={i}>{i > 0 && <span className="sep">/</span>}{n}</span>)}
            </p>
            <h2>{p.name}</h2>
            {p.code && <p className="pd-code">Model {p.code}</p>}
            <p className={"pd-price" + (price ? "" : " ask")}>
              {price || "Price on request"}
              {price && p.oldPrice > p.price && <> <s>{money(p.oldPrice)}</s></>}
            </p>
            {STOCK[p.stock] && <p className={`pd-stock s-${p.stock}`}>{STOCK[p.stock]}</p>}
            {p.description && <div className="pd-desc">{p.description}</div>}
            <div className="pd-actions">
              <a className="btn btn-wa lg" href={waLink(enquiryText(p))} target="_blank" rel="noopener" onClick={() => trackEnquiry(p.id)}>
                <WaIcon />Enquire on WhatsApp
              </a>
              <button className="btn btn-line" onClick={share}>{copied ? "Link copied" : "Copy link"}</button>
            </div>
            <p className="pd-note">Opens WhatsApp with this product in the message. Ask about stock, bulk pricing or delivery.</p>
          </div>
        </div>
      )}
    </dialog>
  );
}
