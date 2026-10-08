import { useState } from "react";
import { patch, multi } from "../lib/db.js";
import { img, slugify } from "../lib/util.js";
import { EditIcon, TrashIcon } from "./ui.jsx";

const STARTER = {
  "Downlighters": ["Round", "Square", "Recessed", "Surface mounted"],
  "LED panels": [],
  "Spotlights & tracks": [],
  "Bulbs & tubes": [],
  "Outdoor & floodlights": [],
  "Cable & wire": [],
  "Switches & sockets": [],
  "Breakers & DBs": [],
  "Conduit & accessories": [],
};

export default function Categories({ cats, setCats, catsRef, products, setProducts, parents, childrenOf, newCat, toast, onShowItems, onAddItem }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [seeding, setSeeding] = useState(false);

  const count = (id) => products.filter((p) => p.categoryId === id || p.subcategoryId === id).length;
  const thumbs = (id) => products.filter((p) => p.categoryId === id).slice(0, 4);

  async function addCat(e) {
    e.preventDefault();
    const n = name.trim(); if (!n) return;
    try {
      await newCat(n);
      setName(""); setAdding(false);
      toast(`Category “${n}” added — click “+ Add item” on it to add products`);
    } catch (err) { toast(err.message, true); }
  }

  async function addSub(e, parentId) {
    e.preventDefault();
    const input = e.currentTarget.elements.sub;
    const n = input.value.trim(); if (!n) return;
    try { await newCat(n, parentId); input.value = ""; toast("Sub-category added"); }
    catch (err) { toast(err.message, true); }
  }

  async function rename(c) {
    const n = prompt("New name:", c.name)?.trim();
    if (!n || n === c.name) return;
    try {
      await patch("categories", c.id, { name: n, slug: slugify(n) });
      setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, name: n, slug: slugify(n) } : x)));
    } catch (err) { toast(err.message, true); }
  }

  async function moveUp(c) {
    const ps = catsRef.current.filter((x) => !x.parent);
    const i = ps.findIndex((x) => x.id === c.id);
    if (i <= 0) return;
    [ps[i - 1], ps[i]] = [ps[i], ps[i - 1]];
    const updates = {}, order = new Map();
    ps.forEach((p, k) => { order.set(p.id, k); updates[`categories/${p.id}/order`] = k; });
    try {
      await multi(updates);
      setCats((cs) => cs.map((x) => (order.has(x.id) ? { ...x, order: order.get(x.id) } : x)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    } catch (err) { toast(err.message, true); }
  }

  async function del(c) {
    const kids = childrenOf(c.id);
    const used = products.filter((p) => p.categoryId === c.id || p.subcategoryId === c.id || kids.some((k) => k.id === p.subcategoryId));
    const msg = `Delete “${c.name}”${kids.length ? ` and its ${kids.length} sub-categories` : ""}?` +
      (used.length ? `\n\n${used.length} product(s) will become uncategorised (they are NOT deleted).` : "");
    if (!confirm(msg)) return;
    const gone = new Set([c.id, ...kids.map((k) => k.id)]);
    const updates = {}, fixes = new Map();
    gone.forEach((id) => (updates[`categories/${id}`] = null));
    used.forEach((p) => {
      const fix = {};
      if (gone.has(p.categoryId)) { fix.categoryId = null; fix.subcategoryId = null; }
      else if (gone.has(p.subcategoryId)) fix.subcategoryId = null;
      fixes.set(p.id, fix);
      for (const k in fix) updates[`products/${p.id}/${k}`] = null;
    });
    try {
      await multi(updates);
      setCats((cs) => cs.filter((x) => !gone.has(x.id)));
      setProducts((ps) => ps.map((p) => (fixes.has(p.id) ? { ...p, ...fixes.get(p.id) } : p)));
    } catch (err) { toast(err.message, true); }
  }

  async function seed() {
    setSeeding(true);
    try {
      for (const [n, subs] of Object.entries(STARTER)) {
        const pid = await newCat(n);
        for (const s of subs) await newCat(s, pid);
      }
      toast("Starter categories added");
    } catch (err) { toast(err.message, true); }
    setSeeding(false);
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h1>Categories</h1>
          <p className="muted">Click a category to see its items, or “+ Add item” to put a new product straight into it. Empty categories stay hidden on the shop until they have items.</p>
        </div>
        <button className="btn btn-dark" type="button" onClick={() => setAdding(true)}>+ Add category</button>
      </header>

      {adding && (
        <form className="addcat" onSubmit={addCat}>
          <input placeholder="Category name, e.g. Floodlights" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-dark">Save category</button>
          <button className="btn btn-line" type="button" onClick={() => { setName(""); setAdding(false); }}>Cancel</button>
        </form>
      )}

      {!parents.length ? (
        <div className="blank">
          <h3>No categories yet</h3>
          <p>Add your own with “+ Add category”, or start with a typical lighting &amp; electrical set you can edit.</p>
          <button className="btn btn-line" disabled={seeding} onClick={seed}>Add starter categories</button>
        </div>
      ) : (
        <div className="catlist">
          {parents.map((c, i) => {
            const th = thumbs(c.id);
            return (
              <div className="catcard" key={c.id} style={{ "--d": `${Math.min(i, 12) * 35}ms` }}>
                <button className="catthumbs" title={`Show items in ${c.name}`} onClick={() => onShowItems(c.id)}>
                  {th.length ? th.map((p) => <img key={p.id} src={img(p.mainImage, 160)} alt="" loading="lazy" />) : <span>No items yet</span>}
                </button>
                <div className="cathead">
                  <h3><button className="catname" onClick={() => onShowItems(c.id)}>{c.name}</button> <span className="muted small">{count(c.id)} items</span></h3>
                  <div className="pacts">
                    <button className="ibtn" title="Move up" onClick={() => moveUp(c)}>↑</button>
                    <button className="ibtn" title="Rename" onClick={() => rename(c)}><EditIcon /></button>
                    <button className="ibtn danger" title="Delete" onClick={() => del(c)}><TrashIcon /></button>
                  </div>
                </div>
                <div className="subs">
                  {childrenOf(c.id).map((s) => (
                    <span className="subchip" key={s.id}>
                      {s.name}<small>{count(s.id)}</small>
                      <button title="Rename" onClick={() => rename(s)}>✎</button>
                      <button title="Delete" onClick={() => del(s)}>×</button>
                    </span>
                  ))}
                  <form className="subadd" onSubmit={(e) => addSub(e, c.id)}>
                    <input name="sub" placeholder="+ Add sub-category" />
                    <button>Add</button>
                  </form>
                </div>
                <div className="catfoot">
                  <button className="btn btn-dark sm" onClick={() => onAddItem(c.id)}>+ Add item</button>
                  <button className="btn btn-line sm" onClick={() => onShowItems(c.id)}>View items →</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
