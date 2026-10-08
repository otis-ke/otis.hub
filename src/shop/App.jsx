import { useEffect, useMemo, useRef, useState } from "react";
import { list } from "../lib/db.js";
import { SITE_NAME, WHATSAPP_DISPLAY } from "../lib/config.js";
import { img, money, waLink, millis, useReveal } from "../lib/util.js";
import { WaIcon } from "../components/WaIcon.jsx";
import Hero from "./Hero.jsx";
import ProductDialog from "./ProductDialog.jsx";
import { GENERAL_TEXT, enquiryText, STOCK } from "./shared.js";
import { trackVisit, trackView, trackEnquiry, trackChat, trackCategory, trackSearch } from "../lib/analytics.js";

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(b.name);
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
const PREVIEW = 8;

async function fetchCatalogue() {
  let cats = [], products = [];
  try {
    [cats, products] = await withTimeout(Promise.all([list("categories"), list("products")]), 10000);
  } catch (e) {
    console.warn("Live catalogue unavailable, using static copy", e);
  }
  if (!products.length) {
    // Static snapshot (public/data/catalog.json) keeps the shop working if the database is unreachable
    try {
      const snap = await (await fetch(`${import.meta.env.BASE_URL}data/catalog.json`)).json();
      const toList = (o) => Object.entries(o || {}).map(([id, d]) => ({ id, ...d }));
      cats = toList(snap.categories); products = toList(snap.products);
    } catch (e) { console.error(e); }
  }
  return { cats, products };
}

export default function App() {
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [cat, setCat] = useState("all");
  const [sub, setSub] = useState(null);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const catsRef = useRef(null);
  const progressRef = useRef(null);
  useReveal();

  // ---------- analytics ----------
  useEffect(() => { trackVisit(); }, []);
  const searched = useRef(new Set());
  useEffect(() => {
    if (q.length < 3 || searched.current.has(q)) return;
    const t = setTimeout(() => { searched.current.add(q); trackSearch(q); }, 1500);
    return () => clearTimeout(t);
  }, [q]);

  // ---------- data ----------
  useEffect(() => {
    fetchCatalogue().then(({ cats, products }) => {
      if (!products.length && !cats.length) return setStatus("failed");
      const sorted = [...cats].sort(byOrder);
      const order = new Map(sorted.map((c) => [c.id, c.order ?? 999]));
      const catOrder = (p) => order.get(p.categoryId) ?? 999;
      setCats(sorted);
      setProducts(products
        .filter((p) => p.active !== false && p.mainImage)
        .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || catOrder(a) - catOrder(b) || millis(b.createdAt) - millis(a.createdAt)));
      setStatus("ready");
    });
  }, []);

  // ---------- nav + scroll progress ----------
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrolled(scrollY > 40);
        const max = document.documentElement.scrollHeight - innerHeight;
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => removeEventListener("scroll", onScroll);
  }, []);

  // ---------- product links (#p=<id>) ----------
  useEffect(() => {
    const read = () => { const m = location.hash.match(/^#p=(.+)$/); setOpenId(m ? m[1] : null); };
    read();
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);
  const closeProduct = () => {
    if (location.hash.startsWith("#p=")) history.replaceState(null, "", location.pathname + location.search);
    setOpenId(null);
  };

  // ---------- search (debounced) ----------
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim().toLowerCase()), 120);
    return () => clearTimeout(t);
  }, [qInput]);

  // ---------- derived ----------
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const counts = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(p.categoryId, (m.get(p.categoryId) || 0) + 1));
    return m;
  }, [products]);
  const parents = cats.filter((c) => !c.parent);
  const withItems = parents.filter((c) => counts.get(c.id) > 0);

  const filtered = useMemo(() => products.filter((p) => {
    if (cat !== "all" && p.categoryId !== cat) return false;
    if (sub && p.subcategoryId !== sub) return false;
    if (q) {
      const hay = [p.name, p.code, p.description, catById.get(p.categoryId)?.name, catById.get(p.subcategoryId)?.name].join(" ").toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    }
    return true;
  }), [products, cat, sub, q, catById]);

  const subsWithItems = cat !== "all"
    ? cats.filter((c) => c.parent === cat && products.some((p) => p.subcategoryId === c.id))
    : [];

  function selectCat(id) {
    setCat(id); setSub(null); trackCategory(id);
    const el = catsRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + scrollY - 90;
    if (Math.abs(top - scrollY) > 200) scrollTo({ top, behavior: "smooth" });
  }

  const openProduct = products.find((p) => p.id === openId) || null;
  useEffect(() => { if (openProduct) trackView(openProduct.id); }, [openProduct?.id]);

  // ---------- grid ----------
  let body;
  if (status === "loading") {
    body = (
      <div className="grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div className="card skel" key={i}><div className="card-media"></div><div className="card-body"><i></i><i></i></div></div>
        ))}
      </div>
    );
  } else if (status === "failed") {
    body = <Empty>We couldn't load the catalogue just now. <a href={waLink(GENERAL_TEXT)} target="_blank" rel="noopener" onClick={trackChat}>Message us on WhatsApp</a> and we'll help directly.</Empty>;
  } else if (!products.length) {
    body = <Empty>New stock is being added. In the meantime, <a href={waLink(GENERAL_TEXT)} target="_blank" rel="noopener" onClick={trackChat}>tell us what you need</a> on WhatsApp.</Empty>;
  } else if (!filtered.length) {
    body = <Empty>Nothing matches that yet — but we may still have it. <a href={waLink(`Hi ${SITE_NAME}, do you have: ${q || "…"}?`)} target="_blank" rel="noopener" onClick={trackChat}>Ask us on WhatsApp</a>.</Empty>;
  } else if (cat === "all" && !q) {
    // "All" with no search: one section per category, a preview row each
    const groups = parents
      .map((c) => ({ c, items: filtered.filter((p) => p.categoryId === c.id) }))
      .filter((g) => g.items.length);
    const loose = filtered.filter((p) => !catById.get(p.categoryId));
    if (loose.length) groups.push({ c: { id: "", name: "More products" }, items: loose });
    body = (
      <div className="sections">
        {groups.map(({ c, items }) => (
          <section className="cat-sec" key={c.id || "loose"}>
            <header className="reveal">
              <h3>{c.name} <small>{items.length}</small></h3>
              {c.id && items.length > PREVIEW && (
                <button className="see-all" onClick={() => selectCat(c.id)}>View all {items.length} →</button>
              )}
            </header>
            <div className="grid">
              {items.slice(0, PREVIEW).map((p, i) => <Card key={p.id} p={p} i={i} catById={catById} />)}
            </div>
          </section>
        ))}
      </div>
    );
  } else {
    body = <div className="grid">{filtered.map((p, i) => <Card key={p.id} p={p} i={i} catById={catById} />)}</div>;
  }

  const wa = { href: waLink(GENERAL_TEXT), target: "_blank", rel: "noopener", onClick: trackChat };

  return (
    <>
      <div className="progress" ref={progressRef} aria-hidden="true"></div>

      <header className={"nav" + (scrolled ? " scrolled" : "")}>
        <a className="brand" href="#top"><span className="brand-dot"></span>Otis Hub</a>
        <nav className="nav-links">
          <a href="#shop">Shop</a>
          <a href="#how">How it works</a>
        </nav>
        <a className="btn btn-wa sm" {...wa}><WaIcon /><span>Chat</span></a>
      </header>

      <Hero />

      <main className="shop" id="shop">
        <div className="shop-head reveal">
          <div>
            <p className="eyebrow dark">Catalogue</p>
            <h2>Shop the collection <span className="count">{filtered.length && status === "ready" ? `(${filtered.length})` : ""}</span></h2>
          </div>
          <label className="search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input type="search" placeholder="Search chandeliers, pendants, bulbs…" autoComplete="off"
              value={qInput} onChange={(e) => setQInput(e.target.value)} />
          </label>
        </div>

        {withItems.length > 0 && (
          <div className="tiles">
            {withItems.map((c, i) => {
              const cover = c.cover || products.find((p) => p.categoryId === c.id)?.mainImage;
              return (
                <button className={"tile reveal" + (cat === c.id ? " on" : "")} key={c.id} style={{ "--d": `${i * 45}ms` }} onClick={() => selectCat(c.id)}>
                  <img src={img(cover, 500)} alt="" loading="lazy" />
                  <span className="tile-txt"><b>{c.name}</b><small>{counts.get(c.id)} items</small></span>
                </button>
              );
            })}
          </div>
        )}

        {products.length > 0 && (
          <div className="chips" role="tablist" ref={catsRef}>
            <Chip label="All" n={products.length} on={cat === "all"} onClick={() => { setCat("all"); setSub(null); }} />
            {withItems.map((c) => (
              <Chip key={c.id} label={c.name} n={counts.get(c.id)} on={cat === c.id} onClick={() => { setCat(c.id); setSub(null); trackCategory(c.id); }} />
            ))}
          </div>
        )}
        {subsWithItems.length > 0 && (
          <div className="chips sub">
            <Chip label={"All " + (catById.get(cat)?.name || "")} on={!sub} onClick={() => setSub(null)} />
            {subsWithItems.map((s) => <Chip key={s.id} label={s.name} on={sub === s.id} onClick={() => setSub(s.id)} />)}
          </div>
        )}

        <div key={`${cat}|${sub}|${q}`} className="grid-wrap">{body}</div>
      </main>

      <section className="how" id="how">
        <div className="how-inner">
          <h2 className="reveal">Buying here is a conversation,<br />not a checkout.</h2>
          <ol>
            {[
              ["Pick a product", "Open any item to see every angle, specs and price where listed."],
              ["Tap Enquire", "WhatsApp opens with the product already in the message. Just hit send."],
              ["We sort the rest", "Availability, bulk pricing, delivery or pickup — confirmed with a real person."],
            ].map(([h, p], i) => (
              <li className="reveal" key={h} style={{ "--d": `${i * 140}ms` }}>
                <span className="step-bulb" aria-hidden="true"></span>
                <span className="step-n">0{i + 1}</span><h3>{h}</h3><p>{p}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="foot">
        <div className="foot-inner reveal">
          <div>
            <a className="brand" href="#top"><span className="brand-dot"></span>Otis Hub</a>
            <p>Lighting &amp; electrical materials.</p>
          </div>
          <div className="foot-contact">
            <p className="eyebrow">Orders &amp; enquiries</p>
            <a className="foot-phone" {...wa}>{WHATSAPP_DISPLAY}</a>
          </div>
        </div>
        <p className="foot-legal">© {new Date().getFullYear()} Otis Hub</p>
      </footer>

      <a className="fab" {...wa} aria-label="Chat on WhatsApp"><WaIcon /></a>

      <ProductDialog p={openProduct} catById={catById} onClose={closeProduct} />
    </>
  );
}

function Chip({ label, n, on, onClick }) {
  return (
    <button className={"chip" + (on ? " on" : "")} onClick={onClick}>
      {label}{n != null && <small>{n}</small>}
    </button>
  );
}

function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

function Card({ p, i, catById }) {
  const price = money(p.price);
  const cat = catById.get(p.subcategoryId) || catById.get(p.categoryId);
  const extra = (p.images || []).length;
  const open = () => { location.hash = "p=" + p.id; };
  const badge = p.stock && p.stock !== "in" && STOCK[p.stock]
    ? <span className={`badge s-${p.stock}`}>{STOCK[p.stock]}</span>
    : p.featured ? <span className="badge">Featured</span> : null;
  return (
    <article className="card reveal" style={{ "--d": `${(i % 4) * 70}ms` }}>
      <button className="card-media" onClick={open} aria-label={`View ${p.name}`}>
        <img src={img(p.mainImage, 600)} alt={p.name} loading="lazy" />
        {badge}
        {extra > 0 && <span className="views">+{extra} view{extra > 1 ? "s" : ""}</span>}
      </button>
      <div className="card-body">
        {cat && <span className="tag">{cat.name}</span>}
        <h3><button onClick={open}>{p.name}</button></h3>
        <div className="card-foot">
          <span className={"price" + (price ? "" : " ask")}>
            {price || "Ask for price"}
            {price && p.oldPrice > p.price && <> <s>{money(p.oldPrice)}</s></>}
          </span>
          <a className="wa-mini" href={waLink(enquiryText(p))} target="_blank" rel="noopener" onClick={() => trackEnquiry(p.id)} aria-label={`Enquire about ${p.name} on WhatsApp`}>
            <WaIcon />Enquire
          </a>
        </div>
      </div>
    </article>
  );
}
