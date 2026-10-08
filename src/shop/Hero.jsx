import { useEffect, useMemo, useRef, useState } from "react";

// Colours the lights can take. Tap a light to step through them,
// pick a swatch to colour every light, or hit "Party" to let them cycle.
const PALETTE = [
  { name: "Warm white", c: "#ffb547" },
  { name: "Daylight", c: "#cfe6ff" },
  { name: "Coral", c: "#ff7a5c" },
  { name: "Mint", c: "#4ef0b0" },
  { name: "Ocean", c: "#4aa8ff" },
  { name: "Violet", c: "#b07bff" },
  { name: "Rose", c: "#ff5fa8" },
];

const LIGHTS = [
  { id: "pendant", label: "Pendant" },
  { id: "bulb", label: "Bulb" },
  { id: "down", label: "Downlight" },
  { id: "spot", label: "Spot" },
];

const INITIAL = {
  pendant: { on: true, ci: 2, cycle: false },
  bulb: { on: true, ci: 0, cycle: false },
  down: { on: true, ci: 0, cycle: false },
  spot: { on: true, ci: 4, cycle: true },
};

const TICKER = ["Chandeliers", "Pendants", "Wall lamps", "Outdoor lights", "Ceiling lights", "Panel lights", "Downlighters", "Bulbs", "Snake lights", "String lights", "Mirror lights", "Floor lamps"];

export default function Hero() {
  const [lights, setLights] = useState(INITIAL);
  const [booted, setBooted] = useState(false);
  const heroRef = useRef(null);

  // the first power-on is staggered; after that switches react instantly
  useEffect(() => { const t = setTimeout(() => setBooted(true), 2600); return () => clearTimeout(t); }, []);

  // lights in "cycle" mode step to the next colour every 1.4s
  const anyCycling = Object.values(lights).some((l) => l.cycle && l.on);
  useEffect(() => {
    if (!anyCycling) return;
    const t = setInterval(() => {
      setLights((ls) => Object.fromEntries(Object.entries(ls).map(([id, l]) =>
        [id, l.cycle && l.on ? { ...l, ci: (l.ci + 1) % PALETTE.length } : l])));
    }, 1400);
    return () => clearInterval(t);
  }, [anyCycling]);

  // soft glow + slight parallax that follow the pointer (desktop only)
  useEffect(() => {
    const el = heroRef.current;
    if (!el || matchMedia("(hover: none), (prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const move = (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
        el.style.setProperty("--px", (x - 0.5).toFixed(3));
        el.style.setProperty("--py", (y - 0.5).toFixed(3));
      });
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);

  const set = (id, patch) => setLights((ls) => ({ ...ls, [id]: { ...ls[id], ...patch } }));
  const toggle = (id) => set(id, { on: !lights[id].on });
  const recolour = (id) => set(id, { on: true, cycle: false, ci: (lights[id].ci + 1) % PALETTE.length });
  const paintAll = (ci) => setLights((ls) => Object.fromEntries(Object.keys(ls).map((id) => [id, { on: true, cycle: false, ci }])));
  const allCycling = Object.values(lights).every((l) => l.cycle && l.on);
  const party = () => setLights((ls) => Object.fromEntries(Object.entries(ls).map(([id, l], k) =>
    [id, allCycling ? { ...l, cycle: false } : { on: true, cycle: true, ci: (l.ci + k * 2) % PALETTE.length }])));
  const anyOn = Object.values(lights).some((l) => l.on);
  const allOn = Object.values(lights).every((l) => l.on);
  const master = () => setLights((ls) => Object.fromEntries(Object.entries(ls).map(([id, l]) => [id, { ...l, on: !allOn }])));

  // headline accent follows the first light that is on
  const accentLight = ["down", "bulb", "pendant", "spot"].find((id) => lights[id].on);
  const accent = accentLight ? PALETTE[lights[accentLight].ci].c : "#8d877b";

  const lightProps = (id, i) => {
    const l = lights[id];
    return {
      className: `light ${id}${l.on ? " on" : ""}`,
      style: { "--glow": PALETTE[l.ci].c, "--i": i },
      onClick: () => recolour(id),
      "aria-label": `${LIGHTS[i].label}: change colour`,
      type: "button",
    };
  };

  const motes = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    left: `${8 + ((i * 37) % 88)}%`,
    top: `${10 + ((i * 53) % 75)}%`,
    size: 1 + (i % 3),
    dur: `${9 + (i % 7) * 1.7}s`,
    delay: `${-(i * 1.3)}s`,
  })), []);

  return (
    <section className={`hero${booted ? " booted" : ""}${anyOn ? "" : " lights-out"}`} id="top" ref={heroRef} style={{ "--accent": accent }}>
      <div className="hero-glow" aria-hidden="true"></div>

      <div className="rig">
        {/* recessed downlight with a wide beam and a pool of light on the floor */}
        <button {...lightProps("down", 2)}>
          <i className="beam"></i><i className="pool"></i><i className="fixture hit"></i>
        </button>
        {/* pendant: swings gently */}
        <button {...lightProps("pendant", 0)}>
          <i className="cord"></i><i className="cone"></i><i className="shade hit"></i>
        </button>
        {/* filament bulb: flickers */}
        <button {...lightProps("bulb", 1)}>
          <i className="cord"></i><i className="socket hit"></i><i className="glass hit"><b></b></i>
        </button>
        {/* spotlight: sweeps */}
        <button {...lightProps("spot", 3)}>
          <i className="spot-beam"></i><i className="spot-arm"></i><i className="spot-body hit"></i>
        </button>
      </div>

      <div className="motes" aria-hidden="true">
        {motes.map((m, i) => (
          <span key={i} style={{ left: m.left, top: m.top, width: m.size, height: m.size, animationDuration: m.dur, animationDelay: m.delay }}></span>
        ))}
      </div>

      <div className="hero-inner">
        <p className="eyebrow rise" style={{ "--d": "0.15s" }}>Lighting &nbsp;/&nbsp; Electrical &nbsp;/&nbsp; Supplies</p>
        <h1>
          <span className="ln"><span style={{ "--d": "0.3s" }}>Good light starts</span></span>
          <span className="ln"><span style={{ "--d": "0.45s" }}>with the <em>right parts.</em></span></span>
        </h1>
        <p className="lede rise" style={{ "--d": "0.7s" }}>Chandeliers, pendants, wall lamps, panel lights, downlighters, bulbs and electrical materials. Pick what you like and talk to us straight on WhatsApp — no forms, no checkout.</p>
        <div className="hero-cta rise" style={{ "--d": "0.85s" }}>
          <a href="#shop" className="btn btn-amber">Browse products</a>
          <a href="#how" className="btn btn-ghost">How ordering works</a>
        </div>

        <div className="plate rise" style={{ "--d": "1.05s" }}>
          <div className="plate-head">
            <p>{anyOn ? "Flip a switch" : "Lights out — flip a switch"}</p>
            <div className="plate-btns">
              <button type="button" className={"party" + (allCycling ? " on" : "")} onClick={party} aria-pressed={allCycling}>
                {allCycling ? "Stop" : "Party"}
              </button>
              <button type="button" className={"master" + (allOn ? " on" : "")} onClick={master}>{allOn ? "All off" : "All on"}</button>
            </div>
          </div>
          <div className="rockers">
            {LIGHTS.map(({ id, label }) => (
              <button key={id} type="button" role="switch" aria-checked={lights[id].on}
                className={"rocker" + (lights[id].on ? " on" : "")} style={{ "--glow": PALETTE[lights[id].ci].c }}
                onClick={() => toggle(id)}>
                <span className="paddle"><i></i></span>
                <span className="rocker-lbl">{label}</span>
              </button>
            ))}
          </div>
          <div className="swatches">
            {PALETTE.map((p, ci) => (
              <button key={p.name} type="button" className="sw" style={{ "--c": p.c }} title={p.name} aria-label={`Make all lights ${p.name}`} onClick={() => paintAll(ci)}></button>
            ))}
          </div>
        </div>
      </div>

      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => <span key={i}>{t}</span>)}
        </div>
      </div>
    </section>
  );
}
