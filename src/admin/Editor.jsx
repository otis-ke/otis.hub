import { useEffect, useRef, useState } from "react";
import { img, uploadImage } from "../lib/util.js";
import { CatOptions, SubOptions } from "./ui.jsx";

const blankForm = { name: "", categoryId: "", subcategoryId: "", price: "", oldPrice: "", code: "", stock: "in", description: "", active: true, featured: false };

export default function Editor({ session, parents, childrenOf, visibleIds, findProduct, saveProduct, newCat, toast, onOpen, onClose }) {
  const ref = useRef(null);
  const nameRef = useRef(null), mainFile = useRef(null), moreFile = useRef(null);
  const sessRef = useRef(0);          // bumps every time the editor opens; stale uploads are ignored
  const [f, setF] = useState(blankForm);
  const [draft, setDraftState] = useState({ id: null, mainImage: "", images: [] });
  const draftRef = useRef(draft);
  const setDraft = (u) => { draftRef.current = typeof u === "function" ? u(draftRef.current) : u; setDraftState(draftRef.current); };
  const upRef = useRef(0);
  const [uploading, setUploading] = useState(0);
  const bump = (d) => { upRef.current += d; setUploading(upRef.current); };
  const [mainProg, setMainProg] = useState(null);
  const [pending, setPending] = useState([]);   // gallery uploads in progress: [{ key, p }]
  const [saving, setSaving] = useState(null);   // "save" | "next"
  const [over, setOver] = useState(null);       // drag target: "main" | "gallery"
  const [urlAdd, setUrlAdd] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!session) { if (d.open) d.close(); return; }
    sessRef.current++;
    const p = session.product;
    setDraft({ id: p?.id || null, mainImage: p?.mainImage || "", images: (p?.images || []).map((i) => ({ url: i.url, label: i.label || "" })) });
    setF({
      name: p?.name || "",
      categoryId: p?.categoryId || session.presetCat || "",
      subcategoryId: p?.subcategoryId || "",
      price: p?.price ?? "",
      oldPrice: p?.oldPrice ?? "",
      code: p?.code || "",
      stock: p?.stock || "in",
      description: p?.description || "",
      active: p ? p.active !== false : true,
      featured: !!p?.featured,
    });
    upRef.current = 0; setUploading(0); setPending([]); setMainProg(null); setUrlAdd(""); setSaving(null);
    if (!d.open) d.showModal();
    d.querySelector(".ed-body")?.scrollTo(0, 0);
    if (!p) setTimeout(() => nameRef.current?.focus(), 50);
  }, [session]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function requestClose() {
    if (upRef.current && !confirm("Images are still uploading. Close anyway?")) return;
    onClose();
  }

  // ---------- category (with inline "+ New category…") ----------
  async function onCat(e) {
    const v = e.target.value;
    if (v !== "__new") return setF((x) => ({ ...x, categoryId: v, subcategoryId: "" }));
    const name = prompt("New category name (e.g. Floodlights):")?.trim();
    if (!name) return setF((x) => ({ ...x, categoryId: "", subcategoryId: "" }));
    try {
      const id = await newCat(name);
      setF((x) => ({ ...x, categoryId: id, subcategoryId: "" }));
      toast(`Category “${name}” added`);
    } catch (err) { toast(err.message, true); setF((x) => ({ ...x, categoryId: "" })); }
  }
  const subs = childrenOf(f.categoryId);

  // ---------- images ----------
  async function setMain(file) {
    const tok = sessRef.current;
    bump(1); setMainProg(0);
    try {
      const url = await uploadImage(file, (p) => tok === sessRef.current && setMainProg(p));
      if (tok !== sessRef.current) return;
      const keepOld = draftRef.current.mainImage && confirm("Keep the old main image as an extra view?");
      setDraft((d) => ({ ...d, mainImage: url, images: keepOld ? [{ url: d.mainImage, label: "" }, ...d.images] : d.images }));
    } catch (err) { toast(err.message, true); }
    finally { if (tok === sessRef.current) { bump(-1); setMainProg(null); } }
  }

  async function addMore(files) {
    if (!files.length) return;
    const tok = sessRef.current;
    await Promise.all(files.map(async (file) => {
      const key = Math.random().toString(36).slice(2);
      setPending((ps) => [...ps, { key, p: 0 }]);
      bump(1);
      try {
        const url = await uploadImage(file, (p) => setPending((ps) => ps.map((x) => (x.key === key ? { ...x, p } : x))));
        if (tok !== sessRef.current) return;
        setDraft((d) => (d.mainImage ? { ...d, images: [...d.images, { url, label: "" }] } : { ...d, mainImage: url }));
      } catch (err) { toast(err.message, true); }
      finally { if (tok === sessRef.current) { bump(-1); setPending((ps) => ps.filter((x) => x.key !== key)); } }
    }));
  }

  function addFromUrl() {
    const u = urlAdd.trim();
    if (!/^https?:\/\//i.test(u)) return toast("Paste a full image link starting with http", true);
    setUrlAdd("");
    addMore([u]); // Cloudinary fetches the remote URL and stores its own copy
  }

  const galleryAct = (i, act) => setDraft((d) => {
    const arr = [...d.images];
    let main = d.mainImage;
    if (act === "left" && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    if (act === "del") arr.splice(i, 1);
    if (act === "main") {
      const old = main;
      main = arr[i].url;
      if (old) arr[i] = { url: old, label: "" }; else arr.splice(i, 1);
    }
    return { ...d, mainImage: main, images: arr };
  });
  const setLabel = (i, label) => setDraft((d) => ({ ...d, images: d.images.map((im, k) => (k === i ? { ...im, label } : im)) }));

  const dropZone = (zone, onFiles) => ({
    onDragOver: (e) => { e.preventDefault(); setOver(zone); },
    onDragLeave: () => setOver(null),
    onDrop: (e) => {
      e.preventDefault(); setOver(null);
      const files = [...e.dataTransfer.files].filter((x) => x.type.startsWith("image/"));
      if (files.length) onFiles(files);
    },
  });

  // ---------- save ----------
  async function save(goNext) {
    if (upRef.current || saving) return;
    const name = f.name.trim();
    if (!name) { nameRef.current?.focus(); return toast("Give the product a name", true); }
    const d = draftRef.current;
    if (!d.mainImage) return toast("Add a main image first", true);

    const num = (v) => (String(v).trim() === "" ? null : Number(v));
    const data = {
      name,
      description: f.description.trim(),
      price: num(f.price),
      oldPrice: num(f.oldPrice),
      code: f.code.trim() || null,
      stock: f.stock,
      categoryId: f.categoryId || null,
      subcategoryId: f.subcategoryId || null,
      mainImage: d.mainImage,
      images: d.images.map((i) => ({ url: i.url, label: i.label.trim() })),
      active: f.active,
      featured: f.featured,
    };
    const nextId = goNext ? visibleIds[visibleIds.indexOf(d.id) + 1] : null;
    setSaving(goNext ? "next" : "save");
    try {
      await saveProduct(d.id, data);
      toast("Saved");
      const next = nextId && findProduct(nextId);
      if (next) onOpen(next); else onClose();
    } catch (err) {
      console.error(err);
      toast("Save failed: " + err.message, true);
      setSaving(null);
    }
  }

  const pos = draft.id ? visibleIds.indexOf(draft.id) : -1;
  const showNext = !!draft.id && pos >= 0 && pos < visibleIds.length - 1;
  const status = uploading ? `Uploading ${uploading} image${uploading > 1 ? "s" : ""}…` : pos >= 0 ? `${pos + 1} of ${visibleIds.length}` : "";

  return (
    <dialog className="editor" ref={ref} onCancel={(e) => { e.preventDefault(); requestClose(); }}>
      <form noValidate onSubmit={(e) => { e.preventDefault(); save(false); }}>
        <header className="ed-head">
          <h2>{session?.product ? "Edit product" : "New product"}</h2>
          <button type="button" className="x" aria-label="Close" onClick={requestClose}>×</button>
        </header>

        <div className="ed-body" key={session?.n}>
          <div className="ed-media">
            <p className="lbl">Main image <em>required</em></p>
            <div className={"drop" + (draft.mainImage ? " has" : "") + (over === "main" ? " over" : "")} tabIndex={0}
              onClick={() => mainFile.current.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), mainFile.current.click())}
              {...dropZone("main", (files) => setMain(files[0]))}>
              <div className="drop-empty">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
                <b>Drop the main photo here</b>
                <span>or click to choose</span>
              </div>
              {draft.mainImage && (
                <div className="drop-img"><img key={draft.mainImage} src={img(draft.mainImage, 700)} alt="" /><span className="drop-swap">Click or drop to replace</span></div>
              )}
              {mainProg !== null && <div className="prog" style={{ "--p": mainProg }}></div>}
            </div>

            <p className="lbl">More images &amp; views <em>optional</em></p>
            <p className="hint">Side view, lit up, the box, cut-out size, wiring… Give each one a short label — customers see it under the photo.</p>
            <div className={"gallery" + (over === "gallery" ? " over" : "")} {...dropZone("gallery", addMore)}>
              {draft.images.map((im, i) => (
                <div className="gtile" key={im.url + i}>
                  <div className="gimg"><img src={img(im.url, 300)} alt="" /></div>
                  <input className="glabel" value={im.label} placeholder="Label, e.g. Side view" maxLength={40} onChange={(e) => setLabel(i, e.target.value)} />
                  <div className="gacts">
                    <button type="button" title="Move left" disabled={i === 0} onClick={() => galleryAct(i, "left")}>←</button>
                    <button type="button" title="Make main image" onClick={() => galleryAct(i, "main")}>★</button>
                    <button type="button" title="Remove" className="danger" onClick={() => galleryAct(i, "del")}>✕</button>
                  </div>
                </div>
              ))}
              {pending.map((x) => (
                <div className="gtile pending" key={x.key}><div className="gimg"><div className="prog" style={{ "--p": x.p }}></div></div></div>
              ))}
              <button type="button" className="gadd" onClick={() => moreFile.current.click()}><span>+</span>Add images</button>
            </div>
            <div className="url-add">
              <input type="url" placeholder="…or paste an image link" value={urlAdd} onChange={(e) => setUrlAdd(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFromUrl(); } }} />
              <button type="button" className="btn btn-line sm" onClick={addFromUrl}>Add</button>
            </div>
          </div>

          <div className="ed-fields">
            <label className="lbl">Product name *
              <input ref={nameRef} required placeholder="e.g. 12W round LED downlighter, warm white" value={f.name} onChange={set("name")} />
            </label>
            <div className="two">
              <label className="lbl">Category
                <select value={f.categoryId} onChange={onCat}>
                  <CatOptions parents={parents} />
                  <option value="__new">+ New category…</option>
                </select>
              </label>
              <label className="lbl">Sub-category
                <select value={f.subcategoryId} onChange={set("subcategoryId")} disabled={!subs.length}><SubOptions subs={subs} /></select>
              </label>
            </div>
            <div className="two">
              <label className="lbl">Price (KES) <em>optional</em>
                <input type="number" min="0" step="any" inputMode="decimal" placeholder="Empty → “Ask for price”" value={f.price} onChange={set("price")} />
              </label>
              <label className="lbl">Old price <em>optional, shows as discount</em>
                <input type="number" min="0" step="any" inputMode="decimal" placeholder="e.g. 4500" value={f.oldPrice} onChange={set("oldPrice")} />
              </label>
            </div>
            <div className="two">
              <label className="lbl">Model / code <em>optional</em>
                <input placeholder="e.g. GCDL-4852 BK" value={f.code} onChange={set("code")} />
              </label>
              <label className="lbl">Stock
                <select value={f.stock} onChange={set("stock")}>
                  <option value="in">In stock</option>
                  <option value="few">Few left</option>
                  <option value="order">On order</option>
                  <option value="out">Out of stock</option>
                </select>
              </label>
            </div>
            <label className="lbl">Description <em>optional</em>
              <textarea rows={7} placeholder="Wattage, colour temperature, cut-out size, IP rating, warranty…" value={f.description} onChange={set("description")}></textarea>
            </label>
            <label className="check"><input type="checkbox" checked={f.active} onChange={set("active")} /> Visible on website</label>
            <label className="check"><input type="checkbox" checked={f.featured} onChange={set("featured")} /> Featured <small>(shown first)</small></label>
          </div>
        </div>

        <footer className="ed-foot">
          <span className="muted small">{status}</span>
          <button type="button" className="btn btn-line" onClick={requestClose}>Cancel</button>
          {showNext && (
            <button type="button" className="btn btn-line" disabled={!!uploading || !!saving} title="Save and open the next product in this list" onClick={() => save(true)}>
              {saving === "next" ? "Saving…" : "Save & next →"}
            </button>
          )}
          <button type="submit" className="btn btn-dark" disabled={!!uploading || !!saving}>{saving === "save" ? "Saving…" : "Save product"}</button>
        </footer>
      </form>
      <input type="file" ref={mainFile} accept="image/*" hidden onChange={(e) => { const x = e.target.files[0]; if (x) setMain(x); e.target.value = ""; }} />
      <input type="file" ref={moreFile} accept="image/*" multiple hidden onChange={(e) => { addMore([...e.target.files]); e.target.value = ""; }} />
    </dialog>
  );
}
