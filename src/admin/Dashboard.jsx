import { useCallback, useEffect, useMemo, useState } from "react";
import { list, create, patch, destroy } from "../lib/db.js";
import { img, money, slugify, millis } from "../lib/util.js";
import { useLive, useToast, CatOptions, EditIcon, TrashIcon } from "./ui.jsx";
import Editor from "./Editor.jsx";
import Categories from "./Categories.jsx";
import BulkImport from "./BulkImport.jsx";
import Analytics from "./Analytics.jsx";

const NAV = [
  { id: "analytics", label: "Analytics", icon: <svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg> },
  { id: "products", label: "Products", icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg> },
  { id: "categories", label: "Categories", icon: <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h6" /></svg> },
  { id: "import", label: "Bulk import", icon: <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg> },
];

export default function Dashboard({ onLogout }) {
  const [cats, setCats, catsRef] = useLive([]);
  const [products, setProducts, productsRef] = useLive([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("analytics");
  const [filters, setFilters] = useState({ q: "", cat: "", status: "" });
  const [session, setSession] = useState(null); // { product, presetCat, n } while the editor is open
  const [toastNode, toast] = useToast();

  // ---------- data ----------
  const loadAll = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([list("categories"), list("products")]);
      setCats(c.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)));
      setProducts(p.sort((a, b) => millis(b.createdAt) - millis(a.createdAt)));
    } catch (e) {
      console.error(e);
      toast("Couldn't load data: " + e.message, true);
    }
    setLoaded(true);
  }, [setCats, setProducts, toast]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const parents = useMemo(() => cats.filter((c) => !c.parent), [cats]);
  const childrenOf = useCallback((id) => (id ? cats.filter((c) => c.parent === id) : []), [cats]);
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);

  async function newCat(name, parent = null) {
    const siblings = catsRef.current.filter((c) => (c.parent || null) === parent);
    const data = { name, slug: slugify(name), parent, order: siblings.length };
    const id = await create("categories", data);
    setCats((cs) => [...cs, { id, ...data }]);
    return id;
  }

  // ---------- products list ----------
  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return products.filter((p) => {
      if (filters.cat && p.categoryId !== filters.cat) return false;
      if (filters.status === "live" && p.active === false) return false;
      if (filters.status === "hidden" && p.active !== false) return false;
      if (filters.status === "featured" && !p.featured) return false;
      if (q && !`${p.name} ${p.description || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, filters]);
  const visibleIds = useMemo(() => visible.map((p) => p.id), [visible]);

  const live = products.filter((p) => p.active !== false).length;
  const openEditor = (product, presetCat = "") => setSession((s) => ({ product, presetCat, n: (s?.n || 0) + 1 }));

  async function toggleActive(p) {
    try {
      const active = p.active === false;
      await patch("products", p.id, { active });
      setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, active } : x)));
      toast(active ? "Product is now visible" : "Product hidden from website");
    } catch (err) { toast(err.message, true); }
  }
  async function deleteProduct(p) {
    if (!confirm(`Delete “${p.name}”? This can't be undone.`)) return;
    try {
      await destroy("products", p.id);
      setProducts((ps) => ps.filter((x) => x.id !== p.id));
      toast("Product deleted");
    } catch (err) { toast(err.message, true); }
  }
  async function saveProduct(id, data) {
    if (id) {
      await patch("products", id, data);
      // update locally so the list keeps its order and "next" stays correct
      setProducts((ps) => ps.map((x) => (x.id === id ? { ...x, ...data } : x)));
    } else {
      await create("products", data);
      await loadAll();
    }
  }

  function showCategoryItems(id) {
    setFilters({ q: "", cat: id, status: "" });
    setView("products");
    scrollTo(0, 0);
  }

  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><span className="brand-dot"></span>Otis Hub <small>admin</small></div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={view === n.id ? "on" : ""} onClick={() => setView(n.id)}>
              {n.icon}{n.label}
              {n.id === "products" && <span className="n">{products.length || ""}</span>}
              {n.id === "categories" && <span className="n">{parents.length || ""}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <a href="./" target="_blank" rel="noopener">View website ↗</a>
          <button onClick={onLogout}>Sign out</button>
          <small>Signed in as admin</small>
        </div>
      </aside>

      <main className="main">
        {view === "analytics" && (
          <Analytics key="analytics" products={products} cats={cats} onEdit={(p) => openEditor(p)} />
        )}

        {view === "products" && (
          <section className="panel" key="products">
            <header className="panel-head">
              <div>
                <h1>Products</h1>
                <p className="muted">{products.length ? `${live} visible · ${products.length - live} hidden` : loaded ? "No products yet." : "Loading…"}</p>
              </div>
              <button className="btn btn-dark" onClick={() => openEditor(null)}>+ New product</button>
            </header>
            <div className="toolbar">
              <input type="search" placeholder="Search products" value={filters.q} onChange={setFilter("q")} />
              <select value={filters.cat} onChange={setFilter("cat")}><CatOptions parents={parents} blank="All categories" /></select>
              <select value={filters.status} onChange={setFilter("status")}>
                <option value="">Any status</option>
                <option value="live">Visible</option>
                <option value="hidden">Hidden / drafts</option>
                <option value="featured">Featured</option>
              </select>
            </div>

            {!loaded ? (
              <div className="plist">{Array.from({ length: 6 }, (_, i) => <div className="prow skel" key={i}><span className="pthumb"></span><i></i></div>)}</div>
            ) : !products.length ? (
              <div className="blank"><h3>Your shop is empty</h3><p>Add your first product, or use <b>Bulk import</b> to pull in a batch of images at once.</p></div>
            ) : !visible.length ? (
              <div className="blank"><p>No products match those filters.</p></div>
            ) : (
              <div className="plist">
                {visible.map((p, i) => {
                  const c = catById.get(p.categoryId), s = catById.get(p.subcategoryId);
                  const views = (p.images || []).length;
                  return (
                    <div className={"prow" + (p.active === false ? " off" : "")} key={p.id} style={{ "--d": `${Math.min(i, 16) * 22}ms` }}>
                      <button className="pthumb" onClick={() => openEditor(p)}>
                        {p.mainImage ? <img src={img(p.mainImage, 160)} alt="" loading="lazy" /> : <span>No image</span>}
                      </button>
                      <div className="pmeta">
                        <button className="pname" onClick={() => openEditor(p)}>{p.name}</button>
                        <span className="muted small">{[c?.name, s?.name].filter(Boolean).join(" › ") || "Uncategorised"}{views ? ` · ${views + 1} photos` : ""}</span>
                      </div>
                      <span className="pprice">{money(p.price) || <span className="muted">Ask</span>}</span>
                      <div className="ppills">
                        {p.featured && <span className="pill amber">Featured</span>}
                        <button className={"pill" + (p.active === false ? "" : " green")} title={`Click to ${p.active === false ? "publish" : "hide"}`} onClick={() => toggleActive(p)}>
                          {p.active === false ? "Hidden" : "Visible"}
                        </button>
                      </div>
                      <div className="pacts">
                        <button className="ibtn" title="Edit" onClick={() => openEditor(p)}><EditIcon /></button>
                        <button className="ibtn danger" title="Delete" onClick={() => deleteProduct(p)}><TrashIcon /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {view === "categories" && (
          <Categories key="categories" cats={cats} setCats={setCats} catsRef={catsRef} products={products} setProducts={setProducts}
            parents={parents} childrenOf={childrenOf} newCat={newCat} toast={toast}
            onShowItems={showCategoryItems} onAddItem={(id) => openEditor(null, id)} />
        )}

        {view === "import" && (
          <BulkImport key="import" parents={parents} childrenOf={childrenOf} toast={toast} onDone={loadAll} />
        )}
      </main>

      <Editor session={session} parents={parents} childrenOf={childrenOf} visibleIds={visibleIds}
        findProduct={(id) => productsRef.current.find((x) => x.id === id)}
        saveProduct={saveProduct} newCat={newCat} toast={toast}
        onOpen={(p) => openEditor(p)} onClose={() => setSession(null)} />

      {toastNode}
    </div>
  );
}
