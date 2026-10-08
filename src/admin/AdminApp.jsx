import { useState } from "react";
import { ADMIN_PASS_SHA256 } from "../lib/config.js";
import { sha256 } from "../lib/util.js";
import Dashboard from "./Dashboard.jsx";

// Password gate. The password is checked against a SHA-256 hash in config.js,
// so the password itself never appears in the code or the repository.
const KEY = "otishub-admin";
const readSession = () => { try { return sessionStorage.getItem(KEY) === ADMIN_PASS_SHA256; } catch { return false; } };

export default function AdminApp() {
  const [authed, setAuthed] = useState(readSession);
  const logout = () => { try { sessionStorage.removeItem(KEY); } catch {} setAuthed(false); };
  return authed ? <Dashboard onLogout={logout} /> : <Login onOk={() => setAuthed(true)} />;
}

function Login({ onOk }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [state, setState] = useState("idle"); // idle | checking | wrong | ok

  const submit = async (e) => {
    e.preventDefault();
    if (state === "checking" || state === "ok") return;
    setErr(""); setState("checking");
    let hash;
    try { hash = await sha256(pw); }
    catch {
      setState("idle");
      return setErr("This browser can't check the password on this address. Open the admin over https or on localhost.");
    }
    if (hash !== ADMIN_PASS_SHA256) { setState("wrong"); setErr("Wrong password."); return; }
    try { sessionStorage.setItem(KEY, hash); } catch {}
    setState("ok");
    setTimeout(onOk, 900);
  };

  const level = state === "ok" ? 1 : state === "wrong" ? 0 : Math.min(pw.length / 10, 1);

  return (
    <section className={`login ${state}`} style={{ "--lvl": level }}>
      <div className="login-glow" aria-hidden="true"></div>
      <div className="login-bulb" aria-hidden="true">
        <i className="cord"></i><i className="socket"></i><i className="glass"><b></b></i>
      </div>
      <form className="login-card" onSubmit={submit}>
        <div className="brand"><span className="brand-dot"></span>Otis Hub <small>admin</small></div>
        <label>Password
          <input type="password" name="password" required autoFocus autoComplete="current-password"
            value={pw} onChange={(e) => { setPw(e.target.value); if (state === "wrong") setState("idle"); }} />
        </label>
        <button className="btn btn-dark" type="submit" disabled={state === "checking" || state === "ok"}>
          {state === "ok" ? "Lights on…" : state === "checking" ? "Checking…" : "Sign in"}
        </button>
        <p className="err" role="alert">{err}</p>
      </form>
    </section>
  );
}
