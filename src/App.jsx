

import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, Edit3, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";

const pad = n => String(n).padStart(2, "0");
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const nowLocal = () => { const d = new Date(); return `${dateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dueDateKey = due => due ? String(due).slice(0, 10) : "";
const dueDisplay = due => due ? String(due).replace("T", " ") : "";
const normalizeDue = due => {
  if (!due) return "";
  const s = String(due);
  return s.includes("T") ? s.slice(0, 16) : `${s.slice(0, 10)}T17:00`;
};
const daysUntilDue = due => {
  const key = dueDateKey(due);
  if (!key) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [y,m,d] = key.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target - today) / 86400000);
};


const HOLIDAYS = {
  "2026-01-01":"元旦", "2026-02-15":"除夕前一日", "2026-02-16":"除夕", "2026-02-17":"春節", "2026-02-18":"春節", "2026-02-19":"春節", "2026-02-20":"春節補假", "2026-02-27":"和平紀念日補假", "2026-02-28":"和平紀念日", "2026-04-03":"兒童節補假", "2026-04-04":"兒童節", "2026-04-05":"清明節", "2026-04-06":"清明節補假", "2026-05-01":"勞動節", "2026-06-19":"端午節", "2026-09-25":"中秋節", "2026-09-28":"教師節", "2026-10-09":"國慶日補假", "2026-10-10":"國慶日", "2026-10-25":"臺灣光復暨金門古寧頭大捷紀念日", "2026-10-26":"紀念日補假", "2026-12-25":"行憲紀念日",
  "2027-01-01":"開國紀念日", "2027-02-04":"除夕前一日", "2027-02-05":"除夕", "2027-02-06":"春節", "2027-02-07":"春節", "2027-02-08":"春節", "2027-02-09":"春節補假", "2027-02-10":"春節補假", "2027-02-28":"和平紀念日", "2027-03-01":"和平紀念日補假", "2027-04-04":"兒童節", "2027-04-05":"清明節", "2027-04-06":"兒童節補假", "2027-04-30":"勞動節補假", "2027-05-01":"勞動節", "2027-06-09":"端午節", "2027-09-15":"中秋節", "2027-09-28":"教師節", "2027-10-10":"國慶日", "2027-10-11":"國慶日補假", "2027-10-25":"臺灣光復暨金門古寧頭大捷紀念日", "2027-12-24":"行憲紀念日補假", "2027-12-25":"行憲紀念日", "2027-12-31":"2028開國紀念日補假"
};
const holidayName = key => HOLIDAYS[key] || "";
const read = key => { try { return typeof window === "undefined" ? [] : JSON.parse(window.localStorage.getItem(key) || "[]"); } catch { return []; } };
const write = (key, value) => { try { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(value)); } catch {} };


export default function WorkLogApp() {
  const today = new Date();
  const [tasks, setTasks] = useState(() => read("worklog-tasks"));
  const [completed, setCompleted] = useState(() => read("worklog-done"));
  const [mode, setMode] = useState("todo");
  const [showAdd, setShowAdd] = useState(false);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [form, setForm] = useState({ loggedAt: nowLocal(), title: "", due: "", note: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  useEffect(() => write("worklog-tasks", tasks), [tasks]);
  useEffect(() => write("worklog-done", completed), [completed]);
  const addTask = () => {
    setError(""); setNotice("");
    if (!form.loggedAt || !form.title.trim() || !form.due) { setError("請確認填表時間、工作項目、繳交期限都已填寫。"); return; }
    const item = { id: `${Date.now()}-${Math.random()}`, ...form, due: normalizeDue(form.due), title: form.title.trim(), note: form.note.trim() };
    setTasks(p => [item, ...p]);
    const [y,m] = dueDateKey(item.due).split("-").map(Number); if (y && m) setMonth(new Date(y, m - 1, 1));
    setForm({ loggedAt: nowLocal(), title: "", due: "", note: "" });
    setNotice("已新增工作，並同步至日曆。");
  };
  const finish = task => { setTasks(p => p.filter(t => t.id !== task.id)); setCompleted(p => [{ ...task, completedAt: new Date().toISOString() }, ...p]); };
  const restore = task => { setCompleted(p => p.filter(t => t.id !== task.id)); const { completedAt, ...rest } = task; setTasks(p => [{ ...rest, due: normalizeDue(rest.due) }, ...p]); };
  const removeDone = id => setCompleted(p => p.filter(t => t.id !== id));
  const removeTask = id => setTasks(p => p.filter(t => t.id !== id));
  const updateTask = (id, changes) => setTasks(p => p.map(t => t.id === id ? { ...t, ...changes, due: normalizeDue(changes.due ?? t.due) } : t));
  const cells = useMemo(() => {
    const y = month.getFullYear(), m = month.getMonth(), first = new Date(y, m, 1).getDay();
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(y, m, i - first + 1); return { d, key: dateKey(d), current: d.getMonth() === m }; });
  }, [month]);
  const activeList = mode === "done" ? completed : tasks;
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = activeList.filter(t => {
      const matchesSearch = !q || String(t.title || "").toLowerCase().includes(q) || String(t.note || "").toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (mode === "done") return true;
      const days = daysUntilDue(t.due);
      if (filter === "today") return days === 0;
      if (filter === "week") return days !== null && days >= 0 && days <= 7;
      if (filter === "overdue") return days !== null && days < 0;
      return true;
    });
    if (mode === "todo" && (filter === "dueAsc" || filter === "dueDesc")) {
      return [...result].sort((a, b) => {
        const aTime = new Date(normalizeDue(a.due)).getTime();
        const bTime = new Date(normalizeDue(b.due)).getTime();
        const safeA = Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER;
        const safeB = Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER;
        return filter === "dueAsc" ? safeA - safeB : safeB - safeA;
      });
    }
    return result;
  }, [activeList, search, filter, mode]);
  return <div className="min-h-screen bg-[#F8F1E7] p-4 text-[#4F4035] md:p-6"><div className="mx-auto w-full max-w-5xl">
    <header className="mb-3 flex flex-col items-center gap-2 text-center"><div><div className="mb-2 inline-flex rounded-full bg-[#F3DCA9] px-3 py-1 text-xs font-bold text-[#7B6031]">MY WORK LOG</div><h1 className="text-3xl font-black md:text-4xl">工作紀錄</h1></div><button type="button" onClick={() => setShowAdd(v => !v)} className="flex items-center gap-2 rounded-2xl bg-[#E8A568] px-4 py-2.5 text-sm font-extrabold text-white"><Plus className="h-4 w-4" />{showAdd ? "收起新增工作" : "新增工作"}</button></header>
    {showAdd && <div className="mb-6"><AddPanel form={form} setForm={setForm} error={error} notice={notice} addTask={addTask} /></div>}
    <div className="space-y-5"><section id="work-list-section" className="mx-auto w-full max-w-5xl rounded-[28px] bg-[#FFFDF8] p-5 shadow-[0_12px_40px_rgba(93,65,42,.08)] md:p-6"><div className="mb-2 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold">工作清單</h2><div className="flex rounded-xl bg-[#F4EBDD] p-1"><SmallTab active={mode === "todo"} onClick={() => setMode("todo")}><ClipboardList className="h-3.5 w-3.5" />待辦 {tasks.length}</SmallTab><SmallTab active={mode === "done"} onClick={() => setMode("done")}><Check className="h-3.5 w-3.5" />已完成 {completed.length}</SmallTab></div></div><div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]"><div className="relative"><input aria-label="搜尋工作" className="field pr-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋工作項目或說明..." />{search && <button type="button" aria-label="清除搜尋" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#9A887A]"><X className="h-4 w-4" /></button>}</div>{mode === "todo" && <select aria-label="篩選待辦" value={filter} onChange={e => setFilter(e.target.value)} className="rounded-xl border border-[#E8D9C6] bg-[#FFFDF8] px-3 py-2 text-sm font-bold outline-none"><option value="all">全部</option><option value="today">今天</option><option value="week">7 天內</option><option value="overdue">已逾期</option><option value="dueAsc">近 → 遠</option><option value="dueDesc">遠 → 近</option></select>}</div><div className="mb-2 text-[11px] font-bold text-[#9A887A]">顯示 {filteredList.length} / {activeList.length} 筆</div><WorkList mode={mode} items={filteredList} finish={finish} restore={restore} removeDone={removeDone} removeTask={removeTask} updateTask={updateTask} /></section><Calendar month={month} setMonth={setMonth} cells={cells} today={today} tasks={tasks} completed={completed} onSelectDate={key => { const sameDay = tasks.filter(t => dueDateKey(t.due) === key).sort((a, b) => new Date(normalizeDue(a.due)).getTime() - new Date(normalizeDue(b.due)).getTime()); const target = sameDay[0]; setMode("todo"); setSearch(""); setFilter("all"); requestAnimationFrame(() => requestAnimationFrame(() => { const listSection = document.getElementById("work-list-section"); if (!target) { listSection?.scrollIntoView({ behavior: "smooth", block: "center" }); return; } const el = document.getElementById(`task-${target.id}`); if (!el) return; const scrollBox = el.closest(".task-scroll"); if (scrollBox) { const desired = el.offsetTop - (scrollBox.clientHeight - el.offsetHeight) / 2; scrollBox.scrollTo({ top: Math.max(0, Math.min(desired, scrollBox.scrollHeight - scrollBox.clientHeight)), behavior: "smooth" }); } listSection?.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("task-jump-highlight"); void el.offsetWidth; el.classList.add("task-jump-highlight"); window.setTimeout(() => el.classList.remove("task-jump-highlight"), 1800); })); }} /></div>
  </div><style>{`.field{width:100%;border:1px solid #eadcca;background:#fffdf8;border-radius:14px;padding:10px 12px;font-size:14px;outline:none}.field:focus{border-color:#e2ad62;box-shadow:0 0 0 3px rgba(226,173,98,.15)}.scroll-shell{position:relative;overflow:visible}.task-scroll{height:264px;max-height:264px;overflow-x:hidden;padding-right:18px;scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior:contain}.task-scroll::-webkit-scrollbar{width:0;height:0}.task-scroll.can-scroll{overflow-y:auto}.task-scroll.no-scroll{overflow-y:hidden}.custom-rail{pointer-events:none;position:absolute;right:2px;top:0;width:8px;height:264px;border-radius:999px;background:#F0E2CF;overflow:hidden;z-index:2}.custom-thumb{position:absolute;left:0;width:8px;min-height:44px;border-radius:999px;background:#C79655;will-change:transform}.scroll-hint{margin-top:8px;display:flex;justify-content:center;color:#9A7444;font-size:11px;font-weight:700}.task-jump-highlight{animation:taskJumpHighlight 1.8s ease-out}@keyframes taskJumpHighlight{0%,35%{background:#FFE6A8;box-shadow:0 0 0 3px rgba(232,165,104,.5);border-color:#E8A568}100%{background:#FFFAF2;box-shadow:0 0 0 0 rgba(232,165,104,0);border-color:#EEE1D0}}`}</style></div>;
}

function AddPanel({ form, setForm, error, notice, addTask }) { return <section className="mx-auto w-full max-w-5xl rounded-[28px] bg-[#FFFDF8] p-4 shadow-[0_12px_40px_rgba(93,65,42,.08)] md:p-5"><div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F7D985]"><Plus className="h-5 w-5" /></span><div><h2 className="font-extrabold">新增工作</h2><p className="text-xs text-[#9A887A]">說明為選填</p></div></div><div className="grid gap-4 md:grid-cols-2"><Field label="填表時間 *"><input className="field" type="datetime-local" value={form.loggedAt} onChange={e => setForm({ ...form, loggedAt: e.target.value })} /></Field><Field label="工作項目 *"><input className="field" value={form.title} placeholder="例如：完成部門月報" onChange={e => setForm({ ...form, title: e.target.value })} /></Field><Field label="繳交/活動日期 *"><input className="field" type="datetime-local" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></Field><Field label="說明（選填）"><input className="field" value={form.note} placeholder="補充內容..." onChange={e => setForm({ ...form, note: e.target.value })} /></Field></div>{(error || notice) && <div className={`mt-3 rounded-xl p-2.5 text-xs font-semibold ${error ? "bg-[#FFF0DF] text-[#A65F31]" : "bg-[#F5EBCB] text-[#766126]"}`}>{error || `✓ ${notice}`}</div>}<button type="button" onClick={addTask} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E8A568] px-4 py-3 font-extrabold text-white"><Plus className="h-4 w-4" />提交工作</button></section> }

function WorkList({ mode, items, finish, restore, removeDone, removeTask, updateTask }) {  const [editingId, setEditingId] = useState(null); const [draft, setDraft] = useState({ title: "", due: "", note: "" }); const [scrollTop, setScrollTop] = useState(0);
  const row = 80, gap = 12, visible = 3, viewport = row * visible + gap * (visible - 1);
  const editingExtra = editingId ? 110 : 0;
  const bottomSpace = 12;
  const content = items.length * row + Math.max(0, items.length - 1) * gap + editingExtra + (items.length ? bottomSpace : 0);
  const canScroll = content > viewport;
  const maxScroll = Math.max(0, content - viewport);
  const thumbHeight = canScroll ? Math.max(44, viewport * viewport / content) : viewport;
  const safeScrollTop = Math.min(scrollTop, maxScroll);
  const thumbTop = canScroll && maxScroll > 0 ? (safeScrollTop / maxScroll) * (viewport - thumbHeight) : 0;
  const beginEdit = t => { setEditingId(t.id); setDraft({ title: t.title, due: normalizeDue(t.due), note: t.note || "" }); };
  const saveEdit = t => { if (!draft.title.trim() || !draft.due) return; updateTask(t.id, { title: draft.title.trim(), due: draft.due, note: draft.note.trim() }); setEditingId(null); };
  useEffect(() => { setScrollTop(0); setEditingId(null); }, [mode]);
  return <div className="scroll-shell"><div onScroll={e => setScrollTop(e.currentTarget.scrollTop)} className={`task-scroll ${canScroll ? "can-scroll" : "no-scroll"}`}><div style={{ display:"flex", flexDirection:"column", gap:`${gap}px`, minHeight:`${content}px` }}>{items.map(t => { const editing = mode === "todo" && editingId === t.id; return <div id={`task-${t.id}`} key={t.id} style={{ minHeight: editing ? "190px" : `${row}px`, flex:"0 0 auto" }} className="flex gap-3 rounded-2xl border border-[#EEE1D0] bg-[#FFFAF2] p-3">{mode === "todo" ? <button type="button" title="標示完成" onClick={() => finish(t)} className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[#E2B25F]"><Check className="h-4 w-4" /></button> : <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#E6C473] text-white"><Check className="h-4 w-4" /></span>}{editing ? <div className="min-w-0 flex-1 space-y-2"><input className="field" value={draft.title} onChange={e => setDraft({ ...draft, title:e.target.value })} /><input className="field" type="datetime-local" value={draft.due} onChange={e => setDraft({ ...draft, due:e.target.value })} /><input className="field" value={draft.note} placeholder="說明（選填）" onChange={e => setDraft({ ...draft, note:e.target.value })} /><div className="flex gap-2"><button type="button" onClick={() => saveEdit(t)} className="flex items-center gap-1 rounded-lg bg-[#E8A568] px-2 py-1.5 text-[11px] font-bold text-white"><Save className="h-3.5 w-3.5" />儲存</button><button type="button" onClick={() => setEditingId(null)} className="flex items-center gap-1 rounded-lg bg-[#F2E7D8] px-2 py-1.5 text-[11px] font-bold"><X className="h-3.5 w-3.5" />取消</button></div></div> : <div className="min-w-0 flex-1 self-center"><div className="flex items-center gap-2"><h3 className={`min-w-0 flex-1 truncate text-sm font-extrabold ${mode === "done" ? "text-[#97877B] line-through" : ""}`}>{t.title}</h3>{mode === "todo" && daysUntilDue(t.due) === 1 && <span className="rounded-full bg-[#F7D28A] px-2 py-1 text-[10px] font-extrabold">⚠ 明天到期</span>}{mode === "todo" && daysUntilDue(t.due) === 0 && <span className="rounded-full bg-[#EFA46E] px-2 py-1 text-[10px] font-extrabold text-white">⚠ 今天到期</span>}{mode === "todo" && daysUntilDue(t.due) < 0 && <span className="rounded-full bg-[#D98262] px-2 py-1 text-[10px] font-extrabold text-white">⚠ 已逾期 {Math.abs(daysUntilDue(t.due))} 天</span>}</div>{t.note && <p className="mt-1 truncate text-[11px] text-[#76665A]">{t.note}</p>}<p className="mt-1 text-[10px] text-[#A29184]">期限 {dueDisplay(normalizeDue(t.due))} · 填表 {String(t.loggedAt || "").replace("T", " ")}</p></div>}{!editing && mode === "todo" && <div className="flex shrink-0 items-center gap-1"><button type="button" title="修改" onClick={() => beginEdit(t)} className="rounded-lg bg-[#F2E7D8] p-1.5"><Edit3 className="h-3.5 w-3.5" /></button><button type="button" title="刪除" onClick={() => removeTask(t.id)} className="rounded-lg bg-[#FAE5D7] p-1.5"><Trash2 className="h-3.5 w-3.5" /></button></div>}{mode === "done" && <div className="flex shrink-0 items-center gap-1"><button type="button" title="移回待辦" onClick={() => restore(t)} className="rounded-lg bg-[#F2E7D8] p-1.5"><RotateCcw className="h-3.5 w-3.5" /></button><button type="button" title="刪除" onClick={() => removeDone(t.id)} className="rounded-lg bg-[#FAE5D7] p-1.5"><Trash2 className="h-3.5 w-3.5" /></button></div>}</div>; })}{items.length === 0 && <div style={{ height:`${viewport}px` }} className="grid place-items-center rounded-2xl border border-dashed border-[#E5D6C3] text-sm text-[#A18E80]">{mode === "todo" ? "目前沒有待辦工作" : "尚無已完成工作"}</div>}</div></div>{canScroll && <><div className="custom-rail"><div className="custom-thumb" style={{ height:`${thumbHeight}px`, top:`${thumbTop}px` }} /></div><div className="scroll-hint">上下捲動查看更多 ↕</div></>}</div>;
}

function Calendar({ month, setMonth, cells, today, tasks, completed, onSelectDate }) {
  return <section className="mx-auto w-full max-w-5xl rounded-[28px] bg-[#FFFDF8] p-4 shadow-[0_12px_40px_rgba(93,65,42,.08)] md:p-6">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F4DDAE]"><CalendarDays className="h-5 w-5" /></span><div><h2 className="font-extrabold">期限日曆</h2><p className="text-xs text-[#998779]">黃色為待辦，灰米色刪除線為已完成，粉紅色為休假日</p></div></div>
      <div className="flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))} className="rounded-xl bg-[#F5EBDC] p-2"><ChevronLeft className="h-4 w-4" /></button><select aria-label="選擇年份" value={month.getFullYear()} onChange={e => setMonth(new Date(Number(e.target.value), month.getMonth(), 1))} className="rounded-xl border border-[#E8D9C6] bg-[#FFFDF8] px-2.5 py-2 text-sm font-extrabold">{Array.from({ length:11 }, (_,i) => 2020+i).map(y => <option key={y} value={y}>{y} 年</option>)}</select><select aria-label="選擇月份" value={month.getMonth()} onChange={e => setMonth(new Date(month.getFullYear(), Number(e.target.value), 1))} className="rounded-xl border border-[#E8D9C6] bg-[#FFFDF8] px-2.5 py-2 text-sm font-extrabold">{Array.from({ length:12 }, (_,i) => <option key={i} value={i}>{i+1} 月</option>)}</select><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))} className="rounded-xl bg-[#F5EBDC] p-2"><ChevronRight className="h-4 w-4" /></button><button type="button" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))} className="rounded-xl bg-[#E8A568] px-3 py-2 text-xs font-extrabold text-white">今天</button></div>
    </div>
    <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-[#EBDECD] bg-[#FAF4EA]">
      {["日","一","二","三","四","五","六"].map(d => <div key={d} className="py-2 text-center text-xs font-extrabold text-[#897669]">{d}</div>)}
      {cells.map((c,i) => { const all = [...tasks.map(t => ({...t,isDone:false})), ...completed.map(t => ({...t,isDone:true}))].filter(t => dueDateKey(t.due) === c.key); const isToday = c.key === dateKey(today), holiday = holidayName(c.key); const hasTodo = tasks.some(t => dueDateKey(t.due) === c.key); return <div key={i} role={c.current && hasTodo ? "button" : undefined} tabIndex={c.current && hasTodo ? 0 : -1} onClick={() => c.current && hasTodo && onSelectDate?.(c.key)} onKeyDown={e => { if (c.current && hasTodo && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelectDate?.(c.key); } }} className={`min-h-24 border-r border-t border-[#EEE3D5] p-1 md:min-h-28 md:p-2 ${c.current ? "bg-[#FFFDFC]" : "bg-[#F7F0E6]"} ${c.current && hasTodo ? "cursor-pointer hover:bg-[#FFF6E8]" : ""}`}><span className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs ${isToday ? "bg-[#E8A568] font-bold text-white" : c.current ? "text-[#59483C]" : "text-[#B9AA9D]"}`}>{c.d.getDate()}</span><div className="mt-1 space-y-1">{holiday && c.current && <div className="truncate rounded-md bg-[#F6C7CE] px-1 py-1 text-[9px] font-extrabold text-[#8D3F4A]">休・{holiday}</div>}{all.slice(0,3).map(t => <div key={t.id} className={`truncate rounded-md px-1 py-1 text-[9px] font-bold md:text-[11px] ${t.isDone ? "bg-[#E8E0D4] text-[#9A8B7D] line-through" : "bg-[#F2D181] text-[#6C5229]"}`}>{t.title}</div>)}{all.length > 3 && <div className="text-[9px] font-bold text-[#9A7642]">+{all.length-3} 項</div>}</div></div>; })}
    </div>
  </section>;
}
function Field({ label, children }) { return <label className="block text-left"><span className="mb-1.5 block text-xs font-extrabold text-[#705E50]">{label}</span>{children}</label> }
function SmallTab({ active, onClick, children }) { return <button type="button" onClick={onClick} className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-bold ${active ? "bg-[#E8A568] text-white" : "text-[#745F50]"}`}>{children}</button> }