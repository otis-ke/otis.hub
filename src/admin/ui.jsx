import { useCallback, useRef, useState } from "react";

// State that async code can read synchronously (ref) while still re-rendering (state)
export function useLive(initial) {
  const ref = useRef(initial);
  const [val, setVal] = useState(initial);
  const set = useCallback((u) => {
    ref.current = typeof u === "function" ? u(ref.current) : u;
    setVal(ref.current);
  }, []);
  return [val, set, ref];
}

export function useToast() {
  const [t, setT] = useState({ msg: "", bad: false, show: false });
  const timer = useRef();
  const toast = useCallback((msg, bad = false) => {
    setT({ msg, bad, show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT((x) => ({ ...x, show: false })), 3200);
  }, []);
  const node = <div className={"toast" + (t.show ? " show" : "") + (t.bad ? " bad" : "")} role="status">{t.msg}</div>;
  return [node, toast];
}

export function CatOptions({ parents, blank = "— None —" }) {
  return (
    <>
      <option value="">{blank}</option>
      {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </>
  );
}

export function SubOptions({ subs }) {
  return (
    <>
      <option value="">{subs.length ? "— None —" : "—"}</option>
      {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </>
  );
}

export const EditIcon = () => <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4Z" /></svg>;
export const TrashIcon = () => <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
