import { useRef, useState } from "react";
import { create } from "../lib/db.js";
import { img, uploadImage, nameFromUrl, prettyName } from "../lib/util.js";
import { CatOptions, SubOptions } from "./ui.jsx";

export default function BulkImport({ parents, childrenOf, toast, onDone }) {
  const [urls, setUrls] = useState("");
  const [picked, setPicked] = useState([]);
  const [mode, setMode] = useState("each");
  const [cat, setCat] = useState("");
  const [sub, setSub] = useState("");
  const [live, setLive] = useState(false);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);   // [{ name, status, thumb, state: ""|"ok"|"bad" }]
  const [summary, setSummary] = useState(null);
  const fileRef = useRef(null);
  const subs = childrenOf(cat);

  const setRow = (i, patch) => setLog((l) => l.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  async function run() {
    const found = [...new Set(urls.match(/https?:\/\/[^\s"'<>]+/gi) || [])];
    const sources = [...found.map((u) => ({ src: u, name: nameFromUrl(u) })), ...picked.map((f) => ({ src: f, name: prettyName(f.name) }))];
    if (!sources.length) return toast("Paste some image links or choose files first", true);

    const base = { categoryId: cat || null, subcategoryId: sub || null, active: live, featured: false, description: "", price: null };
    setRunning(true); setSummary(null);
    setLog(sources.map((s) => ({ name: s.name, status: "waiting", thumb: "", state: "" })));
    let ok = 0;

    // upload 3 at a time
    const uploaded = new Array(sources.length);
    let next = 0;
    async function worker() {
      while (next < sources.length) {
        const i = next++;
        setRow(i, { status: "uploading…" });
        try {
          const url = await uploadImage(sources[i].src, (p) => setRow(i, { status: `uploading ${Math.round(p * 100)}%` }));
          uploaded[i] = url;
          setRow(i, { thumb: url });
          if (mode === "each") {
            await create("products", { ...base, name: sources[i].name, mainImage: url, images: [] });
            setRow(i, { status: "✓ product created", state: "ok" });
          } else {
            setRow(i, { status: "✓ uploaded", state: "ok" });
          }
          ok++;
        } catch (err) {
          setRow(i, { status: "✕ " + err.message, state: "bad" });
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]);

    if (mode === "one") {
      const okUrls = uploaded.filter(Boolean);
      if (okUrls.length) {
        try {
          await create("products", {
            ...base, name: sources[uploaded.indexOf(okUrls[0])].name,
            mainImage: okUrls[0], images: okUrls.slice(1).map((url) => ({ url, label: "" })),
          });
        } catch (err) { toast("Couldn't save product: " + err.message, true); }
        setSummary(`Created 1 product with ${okUrls.length} images`);
      }
    }

    setRunning(false);
    setUrls(""); setPicked([]); if (fileRef.current) fileRef.current.value = "";
    toast(`Imported ${ok} of ${sources.length} images${live ? "" : " as hidden drafts"}`);
    await onDone();
  }

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h1>Bulk import</h1>
          <p className="muted">Paste image links (from a supplier site, Facebook, Google Drive public links…) or pick many files from your computer. Images are copied to your Cloudinary so they never break if the original disappears.</p>
        </div>
      </header>
      <div className="import">
        <div className="imp-src">
          <label className="lbl">Image links <em>one per line</em></label>
          <textarea rows={9} value={urls} onChange={(e) => setUrls(e.target.value)}
            placeholder={"https://example.com/images/downlight-12w.jpg\nhttps://example.com/images/downlight-18w.jpg"}></textarea>
          <div className="or"><span>or</span></div>
          <button className="btn btn-line" type="button" onClick={() => fileRef.current.click()}>Choose files from computer…</button>
          <input type="file" ref={fileRef} accept="image/*" multiple hidden onChange={(e) => setPicked([...e.target.files])} />
          <p className="muted small">{picked.length ? `${picked.length} file(s) selected` : ""}</p>
        </div>
        <div className="imp-opts">
          <label className="lbl">How to create products</label>
          <label className="radio"><input type="radio" name="impMode" value="each" checked={mode === "each"} onChange={() => setMode("each")} /><span><b>One product per image</b>Good for a catalogue of different items.</span></label>
          <label className="radio"><input type="radio" name="impMode" value="one" checked={mode === "one"} onChange={() => setMode("one")} /><span><b>All images → one product</b>First image becomes the main photo, the rest become extra views.</span></label>
          <div className="two">
            <label className="lbl">Category<select value={cat} onChange={(e) => { setCat(e.target.value); setSub(""); }}><CatOptions parents={parents} /></select></label>
            <label className="lbl">Sub-category<select value={sub} onChange={(e) => setSub(e.target.value)} disabled={!subs.length}><SubOptions subs={subs} /></select></label>
          </div>
          <label className="check"><input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} /> Publish straight away <small>(otherwise saved as hidden drafts to review)</small></label>
          <button className="btn btn-dark wide" disabled={running} onClick={run}>{running ? "Importing…" : "Import"}</button>
        </div>
      </div>
      <ul className="implog">
        {summary && <li className="ok"><span className="lt"></span><span className="ln"><b>{summary}</b></span><span></span></li>}
        {log.map((r, i) => (
          <li key={i} className={r.state}>
            <span className="lt">{r.thumb && <img src={img(r.thumb, 80)} alt="" />}</span>
            <span className="ln">{r.name}</span>
            <span className="ls muted">{r.status}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
