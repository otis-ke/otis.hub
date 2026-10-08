import { useEffect, useMemo, useState } from "react";
import { watch } from "../lib/db.js";
import { img } from "../lib/util.js";
import { dayKey, isTracking, setTracking } from "../lib/analytics.js";

const METRICS = [
  { id: "visits", label: "Visits", unit: "visits", hint: "Times the shop was opened" },
  { id: "views", label: "Product views", unit: "views", hint: "Product pages opened" },
  { id: "enquiries", label: "WhatsApp enquiries", unit: "enquiries", hint: "“Enquire” taps on a product" },
  { id: "chats", label: "General chats", unit: "chats", hint: "Chat / WhatsApp button taps" },
];
const RANGES = [7, 30, 90];

const fmt = (n) => Math.round(n).toLocaleString("en-KE");
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

// oldest → newest day keys, in the shop's timezone
function lastDays(n, offset = 0) {
  const today = new Date(dayKey() + "T00:00:00Z");
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - offset - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}
const dayLabel = (k, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(k + "T00:00:00Z").toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });

function niceMax(max) {
  const m = Math.max(4, max);
  const p = 10 ** Math.floor(Math.log10(m));
  return (Math.ceil((m / p) * 2) / 2) * p;
}

export default function Analytics({ products, cats, onEdit }) {
  const [stats, setStats] = useState(null);
  const [range, setRange] = useState(30);
  const [metric, setMetric] = useState("visits");
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState(null);
  const [tracking, setTrackingState] = useState(isTracking);

  useEffect(() => watch("stats", setStats), []);

  const days = stats?.days || {};
  const cur = useMemo(() => lastDays(range), [range]);
  const prev = useMemo(() => lastDays(range, range), [range]);
  const sum = (keys, m) => keys.reduce((a, k) => a + (days[k]?.[m] || 0), 0);

  const m = METRICS.find((x) => x.id === metric);
  const series = cur.map((k) => ({ k, v: days[k]?.[metric] || 0 }));
  const top = niceMax(Math.max(...series.map((d) => d.v)));
  const labelEvery = Math.ceil(series.length / 7);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const topProducts = Object.entries(stats?.products || {})
    .map(([id, s]) => ({ p: productById.get(id), views: s.views || 0, enquiries: s.enquiries || 0 }))
    .filter((x) => x.p)
    .sort((a, b) => b.enquiries - a.enquiries || b.views - a.views)
    .slice(0, 8);
  const maxViews = Math.max(1, ...topProducts.map((x) => x.views));

  const toItems = (obj, label) => Object.entries(obj || {}).map(([k, n]) => ({ label: label(k), n })).sort((a, b) => b.n - a.n).slice(0, 8);
  const searches = toItems(stats?.searches, (k) => k.replace(/_/g, " "));
  const sources = toItems(stats?.sources, (k) => (k === "direct" ? "Direct / typed in" : k.replace(/_/g, ".")));
  const catClicks = toItems(stats?.cats, (k) => catById.get(k)?.name || "Deleted category");

  const mobile = sum(cur, "mobile"), desktop = sum(cur, "desktop");
  const visits = sum(cur, "visits"), enquiries = sum(cur, "enquiries");
  const hasAny = Object.keys(days).length > 0;

  const toggleTracking = (on) => { setTracking(on); setTrackingState(on); };

  return (
    <section className="panel analytics">
      <header className="panel-head">
        <div>
          <h1>Analytics <span className="live"><i></i>Live</span></h1>
          <p className="muted">How customers use the shop: visits, product views and WhatsApp taps. Counts are anonymous, with no cookies or personal data.</p>
        </div>
        <div className="seg" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r} className={range === r ? "on" : ""} onClick={() => { setRange(r); setHover(null); }}>{r} days</button>
          ))}
        </div>
      </header>

      {!stats ? (
        <div className="kpis">{METRICS.map((x) => <div className="kpi skel" key={x.id}></div>)}</div>
      ) : (
        <>
          {!hasAny && (
            <div className="note">No activity recorded yet. Numbers appear here as soon as customers open the shop{tracking ? "" : " (this device isn't counted)"}.</div>
          )}

          <div className="kpis">
            {METRICS.map((x, i) => {
              const now = sum(cur, x.id), before = sum(prev, x.id);
              const change = before ? Math.round(((now - before) / before) * 100) : null;
              return (
                <button key={x.id} className={"kpi" + (metric === x.id ? " on" : "")} style={{ "--d": `${i * 60}ms` }}
                  onClick={() => { setMetric(x.id); setHover(null); }} aria-pressed={metric === x.id}>
                  <span className="kpi-label">{x.label}</span>
                  <b className="kpi-num">{fmt(now)}</b>
                  <span className={"kpi-delta" + (change > 0 ? " up" : change < 0 ? " down" : "")}>
                    {change === null ? `last ${range} days` : `${change > 0 ? "▲" : change < 0 ? "▼" : "■"} ${Math.abs(change)}% vs previous ${range} days`}
                  </span>
                </button>
              );
            })}
            <div className="kpi kpi-static" style={{ "--d": "240ms" }}>
              <span className="kpi-label">Enquiry rate</span>
              <b className="kpi-num">{pct(enquiries, visits)}</b>
              <span className="kpi-delta">enquiries per visit</span>
            </div>
          </div>

          <div className="card chart-card">
            <div className="card-head">
              <div>
                <h2>{m.label} per day</h2>
                <p className="muted small">{m.hint} · last {range} days</p>
              </div>
              <button className="btn btn-line sm" onClick={() => setShowTable((t) => !t)}>{showTable ? "Show chart" : "Show table"}</button>
            </div>

            {showTable ? (
              <div className="tablewrap">
                <table className="dtable">
                  <thead><tr><th>Day</th>{METRICS.map((x) => <th key={x.id}>{x.label}</th>)}</tr></thead>
                  <tbody>
                    {[...cur].reverse().map((k) => (
                      <tr key={k}><td>{dayLabel(k)}</td>{METRICS.map((x) => <td key={x.id}>{fmt(days[k]?.[x.id] || 0)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="chart" role="img" aria-label={`${m.label} per day for the last ${range} days. Total ${fmt(sum(cur, metric))}.`}>
                <div className="plot">
                  {[1, 0.5, 0].map((f) => (
                    <div className="gl" key={f} style={{ bottom: `${f * 100}%` }}><span>{fmt(top * f)}</span></div>
                  ))}
                  <div className="bars" key={metric + range} style={{ gridTemplateColumns: `repeat(${series.length}, 1fr)` }}>
                    {series.map((d, i) => (
                      <div key={d.k} className={"col" + (hover === i ? " hot" : "")} tabIndex={0}
                        onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                        aria-label={`${dayLabel(d.k)}: ${d.v} ${m.unit}`}>
                        <i className="bar" style={{ height: `${(d.v / top) * 100}%`, "--d": `${Math.min(i, 30) * 12}ms` }}></i>
                      </div>
                    ))}
                  </div>
                  {hover !== null && series[hover] && (
                    <div className={"tip" + (hover / series.length > 0.7 ? " left" : "")} style={{ left: `${((hover + 0.5) / series.length) * 100}%`, bottom: `${Math.min((series[hover].v / top) * 100, 88)}%` }}>
                      <small>{dayLabel(series[hover].k)}</small>
                      <b>{fmt(series[hover].v)}</b> {m.unit}
                    </div>
                  )}
                </div>
                <div className="xlabels" style={{ gridTemplateColumns: `repeat(${series.length}, 1fr)` }}>
                  {series.map((d, i) => (
                    <span key={d.k}>{(series.length - 1 - i) % labelEvery === 0 ? dayLabel(d.k, { day: "numeric", month: "short" }) : ""}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="agrid">
            <div className="card span2">
              <div className="card-head"><div><h2>Top products</h2><p className="muted small">All time · sorted by enquiries, then views · click to edit</p></div></div>
              {topProducts.length ? (
                <table className="ptable">
                  <thead><tr><th>Product</th><th>Views</th><th>Enquiries</th><th>Rate</th></tr></thead>
                  <tbody>
                    {topProducts.map(({ p, views, enquiries }) => (
                      <tr key={p.id} onClick={() => onEdit(p)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onEdit(p)}>
                        <td><span className="pcell"><img src={img(p.mainImage, 80)} alt="" loading="lazy" />{p.name}</span></td>
                        <td><span className="vbar"><i style={{ width: `${(views / maxViews) * 100}%` }}></i></span>{fmt(views)}</td>
                        <td><b>{fmt(enquiries)}</b></td>
                        <td className="muted">{pct(enquiries, views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="empty-s">No product views yet.</p>}
            </div>

            <div className="card">
              <div className="card-head"><div><h2>Devices</h2><p className="muted small">Visits · last {range} days</p></div></div>
              {mobile + desktop ? (
                <>
                  <div className="split" role="img" aria-label={`Mobile ${pct(mobile, mobile + desktop)}, desktop ${pct(desktop, mobile + desktop)}`}>
                    {mobile > 0 && <i className="s1" style={{ flexGrow: mobile }}></i>}
                    {desktop > 0 && <i className="s2" style={{ flexGrow: desktop }}></i>}
                  </div>
                  <ul className="legend">
                    <li><i className="s1"></i>Mobile <b>{pct(mobile, mobile + desktop)}</b><span className="muted">{fmt(mobile)}</span></li>
                    <li><i className="s2"></i>Desktop <b>{pct(desktop, mobile + desktop)}</b><span className="muted">{fmt(desktop)}</span></li>
                  </ul>
                </>
              ) : <p className="empty-s">No visits in this range.</p>}
            </div>

            <RankList title="What people search for" sub="All time" items={searches} empty="No searches yet." />
            <RankList title="Categories opened" sub="All time" items={catClicks} empty="No category clicks yet." />
            <RankList title="Where visitors come from" sub="All time" items={sources} empty="No visits yet." />
          </div>

          <label className="check track-toggle">
            <input type="checkbox" checked={tracking} onChange={(e) => toggleTracking(e.target.checked)} />
            Count my own visits on this device <small>(off by default after you sign in, so testing doesn't inflate the numbers)</small>
          </label>
        </>
      )}
    </section>
  );
}

function RankList({ title, sub, items, empty }) {
  const max = Math.max(1, ...items.map((x) => x.n));
  return (
    <div className="card">
      <div className="card-head"><div><h2>{title}</h2><p className="muted small">{sub}</p></div></div>
      {items.length ? (
        <ol className="rank">
          {items.map((x) => (
            <li key={x.label}>
              <span className="rank-label">{x.label}</span>
              <span className="rank-n">{fmt(x.n)}</span>
              <span className="vbar wide"><i style={{ width: `${(x.n / max) * 100}%` }}></i></span>
            </li>
          ))}
        </ol>
      ) : <p className="empty-s">{empty}</p>}
    </div>
  );
}
