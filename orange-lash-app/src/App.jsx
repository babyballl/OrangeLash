import { useState, useEffect, useMemo, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, db } from "./firebase";
import {
  Home, Wallet, Package, Plus, X, Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, TrendingUp, TrendingDown, Sparkles, ArrowDownCircle, ArrowUpCircle,
  Check, Loader2, CalendarDays, BarChart3, Ban, Users, Crown, Receipt, Search, SlidersHorizontal, Camera, Download, LogOut, Mail,
} from "lucide-react";

const COLORS = {
  bg: "#1C1A17",
  surface: "#28241F",
  surfaceAlt: "#332E27",
  ink: "#F5EEDE",
  inkSoft: "#B3A68F",
  border: "#463F33",
  borderSoft: "#37312A",
  accent: "#A97A2E",
  accentSoft: "#382C18",
  accentDeep: "#E4C384",
  rose: "#D98CA8",
  roseSoft: "#3D2530",
  roseDeep: "#E8A2BB",
  roseSolid: "#8A4A63",
  sage: "#95C687",
  sageSoft: "#233020",
  sageSolid: "#4C7A44",
  warn: "#D2503F",
  warnSoft: "#3D211D",
  gray: "#AFA894",
  graySoft: "#332F28",
};

const FONT_DISPLAY = "'Taviraj', Georgia, serif";
const FONT_BODY = "'Prompt', system-ui, -apple-system, sans-serif";

const SERVICE_SUGGESTIONS = [
  "คลาสสิก (Classic)",
  "วอลุ่ม Y (Volume Y)",
  "วอลุ่ม W (Volume W)",
  "วอลุ่ม 3D/5D",
  "เว็ทลุค (Wet Look)",
  "เมก้าวอลุ่ม (Mega Volume)",
  "วิสปี้ (Wispy)",
  "เติมขนตา (Refill)",
  "ถอดขนตา (Removal)",
  "อื่นๆ",
];
const CATEGORY_OPTIONS = [
  { value: "glue", label: "กาว" },
  { value: "lash", label: "ขนตา" },
  { value: "other", label: "อื่นๆ" },
];
const EXPENSE_CATEGORIES = ["ค่าวัสดุ", "ค่าเช่าร้าน", "ค่าคอมพนักงาน", "ค่าน้ำค่าไฟ", "การตลาด/โฆษณา", "อื่นๆ"];
const UNIT_OPTIONS = ["ขวด", "กล่อง", "แผง", "ชิ้น", "แพ็ค", "เส้น", "หลอด"];
const MONTH_NAMES_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function thaiDate(iso) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}
function thaiDateShort(iso) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" });
  } catch { return iso; }
}
function thb(n) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n || 0);
}
function categoryLabel(v) {
  return CATEGORY_OPTIONS.find((c) => c.value === v)?.label || "อื่นๆ";
}
function shiftDateISO(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resizeImageDataUrl(dataUrl, maxSize) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; }
      } else {
        if (height > maxSize) { width = Math.round(width * (maxSize / height)); height = maxSize; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("โหลดรูปไม่สำเร็จ"));
    img.src = dataUrl;
  });
}

function csvCell(value) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadCSV(filename, rows) {
  const content = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function groupExpensesByCategory(expenses) {
  return EXPENSE_CATEGORIES.map((cat) => ({
    category: cat,
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + Number(e.amount || 0), 0),
  }));
}

// ---------- Shared UI ----------

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,16,10,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        style={{ background: COLORS.surface, width: "100%", maxWidth: 460, borderRadius: "28px 28px 0 0", padding: "10px 20px 20px", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 -12px 40px rgba(0,0,0,0.35)", border: `1px solid ${COLORS.border}`, borderBottom: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ background: COLORS.border, width: 36, height: 4, borderRadius: 4 }} className="mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ color: COLORS.ink, fontFamily: FONT_DISPLAY }} className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} style={{ color: COLORS.inkSoft, background: COLORS.surfaceAlt }} className="p-1.5 rounded-full active:scale-90 transition-transform" aria-label="ปิด">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,16,10,0.55)", zIndex: 60 }} className="flex items-center justify-center p-6" onClick={onCancel}>
      <div style={{ background: COLORS.surface, borderRadius: 22, border: `1px solid ${COLORS.border}` }} className="w-full max-w-xs p-5" onClick={(e) => e.stopPropagation()}>
        <p style={{ color: COLORS.ink }} className="text-sm mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} style={{ background: COLORS.surfaceAlt, color: COLORS.ink }} className="flex-1 py-2 rounded-xl text-sm font-medium active:scale-95 transition-transform">ยกเลิก</button>
          <button onClick={onConfirm} style={{ background: COLORS.warn, color: "#fff" }} className="flex-1 py-2 rounded-xl text-sm font-medium active:scale-95 transition-transform">ลบ</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label style={{ color: COLORS.inkSoft }} className="text-xs font-medium block mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 13px", borderRadius: 14,
  border: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt,
  color: COLORS.ink, fontSize: 14, outline: "none",
};

function EmptyState({ text }) {
  return (
    <div style={{ background: COLORS.surfaceAlt, color: COLORS.inkSoft, border: `1px dashed ${COLORS.border}` }} className="rounded-2xl p-6 text-center text-sm">
      <Sparkles size={20} className="mx-auto mb-2" style={{ color: COLORS.accentDeep }} />
      {text}
    </div>
  );
}

function SegmentedControl({ options, active, onChange }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === active));
  return (
    <div style={{ position: "relative", background: COLORS.surfaceAlt, borderRadius: 16, padding: 4 }} className="flex">
      <div
        style={{
          position: "absolute", top: 4, bottom: 4, left: 4, right: 4,
          display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)`, pointerEvents: "none",
        }}
      >
        <div style={{ gridColumnStart: idx + 1, background: COLORS.accent, borderRadius: 12, transition: "all .25s ease" }} />
      </div>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{ position: "relative", zIndex: 1, color: active === o.value ? "#fff" : COLORS.inkSoft }}
          className="flex-1 py-2.5 text-xs font-medium rounded-xl transition-colors"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl flex items-center gap-2 px-4 py-2.5 mb-3">
      <Search size={16} style={{ color: COLORS.inkSoft }} className="shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ background: "transparent", border: "none", outline: "none", color: COLORS.ink, fontSize: 14, width: "100%" }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{ color: COLORS.inkSoft }} className="shrink-0 active:scale-90 transition-transform" aria-label="ล้างคำค้นหา">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

function FilterPillRow({ options, active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto mb-3 pb-0.5">
      {options.map((o) => {
        const isActive = active === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              background: isActive ? COLORS.accent : COLORS.surfaceAlt,
              color: isActive ? "#fff" : COLORS.inkSoft,
              border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
            }}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 active:scale-95 transition-transform"
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ServicePicker({ value, onChange }) {
  const [otherMode, setOtherMode] = useState(value !== "" && !SERVICE_SUGGESTIONS.includes(value));

  function selectPreset(s) {
    if (s === "อื่นๆ") {
      setOtherMode(true);
      onChange("");
    } else {
      setOtherMode(false);
      onChange(s);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {SERVICE_SUGGESTIONS.map((s) => {
          const active = s === "อื่นๆ" ? otherMode : !otherMode && value === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => selectPreset(s)}
              style={{
                background: active ? COLORS.accent : COLORS.surfaceAlt,
                color: active ? "#fff" : COLORS.inkSoft,
                border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
              }}
              className="rounded-full px-3 py-1.5 text-xs font-medium active:scale-95 transition-transform"
            >
              {s}
            </button>
          );
        })}
      </div>
      {otherMode && (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="พิมพ์ชื่อบริการ" style={inputStyle} />
      )}
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, color }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
      <div style={{ background: COLORS.surfaceAlt, color: color || COLORS.accentDeep, border: `1px solid ${COLORS.borderSoft}` }} className="w-12 h-12 rounded-2xl flex items-center justify-center">
        <Icon size={19} />
      </div>
      <span style={{ color: COLORS.inkSoft }} className="text-[11px] font-medium">{label}</span>
    </button>
  );
}

function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="50" fill={COLORS.accentSoft} />
      <path d="M23 40C26 32 38 25 52 26C60 27 66 30 71 35" stroke={COLORS.accentDeep} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path d="M20 60C28 52 40 49 51 51C56 52 60 54 63 56" stroke={COLORS.accentDeep} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M20 61C31 68 44 69 55 65" stroke={COLORS.accentDeep} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.75" />
      <path d="M60 55L74 45" stroke={COLORS.accentDeep} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M62 57L77 51" stroke={COLORS.accentDeep} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M63 60L79 59" stroke={COLORS.accentDeep} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M62 62L77 67" stroke={COLORS.accentDeep} strokeWidth="2" strokeLinecap="round" />
      <path d="M60 64L72 72" stroke={COLORS.accentDeep} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ProfileAvatar({ image, onPick, size = 42 }) {
  const inputRef = useRef(null);
  return (
    <div style={{ position: "relative", width: size, height: size }} className="shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current && inputRef.current.click()}
        style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", border: `1px solid ${COLORS.border}`, padding: 0, background: COLORS.accentSoft }}
        className="active:scale-95 transition-transform"
        aria-label="เปลี่ยนรูปโปรไฟล์ร้าน"
      >
        {image ? (
          <img src={image} alt="โปรไฟล์ร้าน" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <img src="/logo-icon.jpg" alt="Orange Lash" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </button>
      <div
        style={{ position: "absolute", bottom: -2, right: -2, background: COLORS.accent, color: "#fff", border: `2px solid ${COLORS.bg}` }}
        className="w-5 h-5 rounded-full flex items-center justify-center pointer-events-none"
      >
        <Camera size={11} />
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
    </div>
  );
}

// ---------- Main App ----------

function OrangeLashDashboard({ user, onSignOut }) {
  const [data, setData] = useState({ revenues: [], expenses: [], materials: [], logs: [], queue: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [financeView, setFinanceView] = useState("revenue"); // revenue | expense | summary | customers

  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [revenuePrefill, setRevenuePrefill] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showQueueForm, setShowQueueForm] = useState(false);
  const [adjustingMaterial, setAdjustingMaterial] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [monthFilter, setMonthFilter] = useState(todayISO().slice(0, 7));
  const [queueDate, setQueueDate] = useState(todayISO());
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());

  const [profileImage, setProfileImage] = useState(null);
  const [profileImageError, setProfileImageError] = useState(null);

  const dataDocRef = doc(db, "users", user.uid, "app", "data");
  const profileDocRef = doc(db, "users", user.uid, "app", "profile");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(dataDocRef);
        if (snap.exists()) {
          const parsed = snap.data();
          setData({
            revenues: parsed.revenues || [],
            expenses: parsed.expenses || [],
            materials: parsed.materials || [],
            logs: parsed.logs || [],
            queue: parsed.queue || [],
          });
        }
      } catch (e) {
        // no existing data yet
      } finally {
        setLoading(false);
      }
      try {
        const profileSnap = await getDoc(profileDocRef);
        if (profileSnap.exists() && profileSnap.data().image) setProfileImage(profileSnap.data().image);
      } catch (e) {
        // no profile image saved yet
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid]);

  async function handleProfileImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setProfileImageError(null);
    try {
      const rawDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
        reader.readAsDataURL(file);
      });
      const resized = await resizeImageDataUrl(rawDataUrl, 240);
      await setDoc(profileDocRef, { image: resized });
      setProfileImage(resized);
    } catch (err) {
      setProfileImageError("อัปโหลดรูปโปรไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      e.target.value = "";
    }
  }

  async function persist(nextData) {
    setData(nextData);
    setSaving(true);
    setSaveError(null);
    try {
      await setDoc(dataDocRef, nextData);
    } catch (e) {
      setSaveError("บันทึกไม่สำเร็จ เช็กอินเทอร์เน็ตแล้วลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  function addRevenue(entry) {
    persist({ ...data, revenues: [{ id: uid(), ...entry }, ...data.revenues] });
    setShowRevenueForm(false);
    setRevenuePrefill(null);
  }
  function deleteRevenue(id) {
    persist({ ...data, revenues: data.revenues.filter((r) => r.id !== id) });
  }

  function addExpense(entry) {
    persist({ ...data, expenses: [{ id: uid(), ...entry }, ...data.expenses] });
    setShowExpenseForm(false);
  }
  function deleteExpense(id) {
    persist({ ...data, expenses: data.expenses.filter((e) => e.id !== id) });
  }

  function addMaterial(material) {
    persist({ ...data, materials: [{ id: uid(), ...material }, ...data.materials] });
    setShowMaterialForm(false);
  }
  function deleteMaterial(id) {
    persist({ ...data, materials: data.materials.filter((m) => m.id !== id) });
  }
  function adjustStock(materialId, type, qty, note, date) {
    const material = data.materials.find((m) => m.id === materialId);
    if (!material) return;
    const delta = type === "in" ? qty : -qty;
    const nextQty = Math.max(0, (material.quantity || 0) + delta);
    const nextMaterials = data.materials.map((m) => (m.id === materialId ? { ...m, quantity: nextQty } : m));
    const log = { id: uid(), materialId, materialName: material.name, type, qty, date: date || todayISO(), note: note || "" };
    persist({ ...data, materials: nextMaterials, logs: [log, ...data.logs] });
    setAdjustingMaterial(null);
  }

  function addQueue(entry) {
    persist({ ...data, queue: [{ id: uid(), status: "pending", ...entry }, ...data.queue] });
    setShowQueueForm(false);
  }
  function updateQueueStatus(id, status) {
    persist({ ...data, queue: data.queue.map((q) => (q.id === id ? { ...q, status } : q)) });
  }
  function deleteQueue(id) {
    persist({ ...data, queue: data.queue.filter((q) => q.id !== id) });
  }
  function markDoneAndBill(item) {
    updateQueueStatus(item.id, "done");
    setRevenuePrefill({ service: item.service, customerName: item.customerName, date: todayISO() });
    setShowRevenueForm(true);
  }

  const today = todayISO();
  const todayRevenueTotal = useMemo(
    () => data.revenues.filter((r) => r.date === today).reduce((s, r) => s + Number(r.amount || 0), 0),
    [data.revenues, today]
  );
  const monthRevenueTotal = useMemo(
    () => data.revenues.filter((r) => r.date.slice(0, 7) === today.slice(0, 7)).reduce((s, r) => s + Number(r.amount || 0), 0),
    [data.revenues, today]
  );
  const monthExpenseTotal = useMemo(
    () => data.expenses.filter((e) => e.date.slice(0, 7) === today.slice(0, 7)).reduce((s, e) => s + Number(e.amount || 0), 0),
    [data.expenses, today]
  );
  const monthNet = monthRevenueTotal - monthExpenseTotal;

  const currentYM = today.slice(0, 7);
  const prevYM = useMemo(() => {
    const [y, m] = currentYM.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [currentYM]);
  const prevMonthRevenueTotal = useMemo(
    () => data.revenues.filter((r) => r.date.slice(0, 7) === prevYM).reduce((s, r) => s + Number(r.amount || 0), 0),
    [data.revenues, prevYM]
  );
  const currentYearStr = today.slice(0, 4);
  const prevYearStr = String(Number(currentYearStr) - 1);
  const currentYearRevenueTotal = useMemo(
    () => data.revenues.filter((r) => r.date.slice(0, 4) === currentYearStr).reduce((s, r) => s + Number(r.amount || 0), 0),
    [data.revenues, currentYearStr]
  );
  const prevYearRevenueTotal = useMemo(
    () => data.revenues.filter((r) => r.date.slice(0, 4) === prevYearStr).reduce((s, r) => s + Number(r.amount || 0), 0),
    [data.revenues, prevYearStr]
  );

  const lowStock = useMemo(() => data.materials.filter((m) => Number(m.quantity) <= Number(m.lowThreshold || 0)), [data.materials]);

  const todayQueue = useMemo(
    () => data.queue.filter((q) => q.date === today && q.status === "pending").sort((a, b) => (a.time < b.time ? -1 : 1)),
    [data.queue, today]
  );

  const monthRevenues = useMemo(
    () => data.revenues.filter((r) => r.date.slice(0, 7) === monthFilter).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.revenues, monthFilter]
  );
  const monthRevenueFilterTotal = useMemo(() => monthRevenues.reduce((s, r) => s + Number(r.amount || 0), 0), [monthRevenues]);

  const monthExpenses = useMemo(
    () => data.expenses.filter((e) => e.date.slice(0, 7) === monthFilter).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [data.expenses, monthFilter]
  );
  const monthExpenseFilterTotal = useMemo(() => monthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0), [monthExpenses]);

  const dayQueue = useMemo(
    () => data.queue.filter((q) => q.date === queueDate).sort((a, b) => (a.time < b.time ? -1 : 1)),
    [data.queue, queueDate]
  );

  const yearlyBreakdown = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const ym = `${summaryYear}-${String(i + 1).padStart(2, "0")}`;
      const rev = data.revenues.filter((r) => r.date.slice(0, 7) === ym).reduce((s, r) => s + Number(r.amount || 0), 0);
      const exp = data.expenses.filter((e) => e.date.slice(0, 7) === ym).reduce((s, e) => s + Number(e.amount || 0), 0);
      return { month: i + 1, label: MONTH_NAMES_TH[i], revenue: rev, expense: exp, net: rev - exp };
    });
    const yearRevenue = months.reduce((s, m) => s + m.revenue, 0);
    const yearExpense = months.reduce((s, m) => s + m.expense, 0);
    const maxValue = Math.max(1, ...months.map((m) => Math.max(m.revenue, m.expense)));
    const yearExpensesList = data.expenses.filter((e) => e.date.slice(0, 4) === String(summaryYear));
    const categoryTotals = groupExpensesByCategory(yearExpensesList);
    return { months, yearRevenue, yearExpense, yearNet: yearRevenue - yearExpense, maxValue, categoryTotals };
  }, [data.revenues, data.expenses, summaryYear]);

  const customerStats = useMemo(() => {
    const map = {};
    data.revenues.forEach((r) => {
      const name = (r.customerName || r.note || "").trim();
      if (!name) return;
      if (!map[name]) map[name] = { name, count: 0, total: 0, lastDate: r.date };
      map[name].count += 1;
      map[name].total += Number(r.amount || 0);
      if (r.date > map[name].lastDate) map[name].lastDate = r.date;
    });
    const list = Object.values(map);
    const unlabeled = data.revenues.length - list.reduce((s, c) => s + c.count, 0);
    const byFrequency = [...list].sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 10);
    const byTotal = [...list].sort((a, b) => b.total - a.total || b.count - a.count).slice(0, 10);
    return { byFrequency, byTotal, unlabeled };
  }, [data.revenues]);

  const recentActivity = useMemo(() => {
    const revItems = data.revenues.slice(0, 6).map((r) => ({ kind: "revenue", date: r.date, id: r.id, label: r.service, sub: r.customerName || r.note, amount: r.amount }));
    const expItems = data.expenses.slice(0, 6).map((e) => ({ kind: "expense", date: e.date, id: e.id, label: e.category, sub: e.note, amount: e.amount }));
    const logItems = data.logs.slice(0, 6).map((l) => ({ kind: "stock", date: l.date, id: l.id, label: l.materialName, sub: l.note, type: l.type, qty: l.qty }));
    return [...revItems, ...expItems, ...logItems].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [data.revenues, data.expenses, data.logs]);

  function shiftMonth(delta) {
    const [y, m] = monthFilter.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  function monthLabel(ym) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }

  const fab = (() => {
    if (tab === "dashboard") return { label: "รายรับ", onClick: () => { setRevenuePrefill(null); setShowRevenueForm(true); } };
    if (tab === "queue") return { label: "คิว", onClick: () => setShowQueueForm(true) };
    if (tab === "stock") return { label: "วัสดุ", onClick: () => setShowMaterialForm(true) };
    if (tab === "finance") {
      if (financeView === "expense") return { label: "รายจ่าย", onClick: () => setShowExpenseForm(true) };
      if (financeView === "revenue") return { label: "รายรับ", onClick: () => { setRevenuePrefill(null); setShowRevenueForm(true); } };
      return null;
    }
    return null;
  })();

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, minHeight: 400 }} className="flex items-center justify-center">
        <Loader2 className="animate-spin" style={{ color: COLORS.accent }} size={28} />
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: FONT_BODY }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Taviraj:wght@400;500;600;700&family=Prompt:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ maxWidth: 460, margin: "0 auto", position: "relative" }} className="flex flex-col min-h-screen">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <ProfileAvatar image={profileImage} onPick={handleProfileImageUpload} size={42} />
          <div>
            <h1 style={{ color: COLORS.accentDeep, fontFamily: FONT_DISPLAY, letterSpacing: "0.06em" }} className="text-lg font-semibold leading-tight uppercase">Orange Lash</h1>
            <p style={{ color: COLORS.inkSoft }} className="text-xs">บัญชีร้านต่อขนตา</p>
          </div>
          {saving && (
            <div className="ml-auto flex items-center gap-1" style={{ color: COLORS.inkSoft }}>
              <Loader2 className="animate-spin" size={14} />
              <span className="text-xs">กำลังบันทึก</span>
            </div>
          )}
          <button
            onClick={onSignOut}
            style={{ color: COLORS.inkSoft, background: COLORS.surfaceAlt }}
            className={`p-2 rounded-full active:scale-90 transition-transform ${saving ? "" : "ml-auto"}`}
            aria-label="ออกจากระบบ"
            title={user.email}
          >
            <LogOut size={16} />
          </button>
        </div>

        {(saveError || profileImageError) && (
          <div style={{ background: COLORS.warnSoft, color: COLORS.warn, margin: "0 20px 12px" }} className="rounded-xl px-3 py-2 text-xs flex items-center gap-2">
            <AlertTriangle size={14} />{saveError || profileImageError}
          </div>
        )}

        <div className="flex-1 px-5 pb-32">
          {tab === "dashboard" && (
            <Dashboard
              todayRevenueTotal={todayRevenueTotal}
              monthRevenueTotal={monthRevenueTotal}
              monthExpenseTotal={monthExpenseTotal}
              monthNet={monthNet}
              prevMonthRevenueTotal={prevMonthRevenueTotal}
              currentYearRevenueTotal={currentYearRevenueTotal}
              prevYearRevenueTotal={prevYearRevenueTotal}
              monthLabelCurrent={monthLabel(currentYM)}
              monthLabelPrevious={monthLabel(prevYM)}
              yearLabelCurrent={`ปี ${Number(currentYearStr) + 543}`}
              yearLabelPrevious={`ปี ${Number(prevYearStr) + 543}`}
              lowStock={lowStock}
              todayQueue={todayQueue}
              recentActivity={recentActivity}
              onAddRevenue={() => { setRevenuePrefill(null); setShowRevenueForm(true); }}
              onAddExpense={() => setShowExpenseForm(true)}
              onAddQueue={() => setShowQueueForm(true)}
              onAddMaterial={() => setShowMaterialForm(true)}
              onGoStock={() => setTab("stock")}
              onGoQueue={() => setTab("queue")}
            />
          )}

          {tab === "queue" && (
            <QueueTab
              date={queueDate}
              items={dayQueue}
              onShiftDate={(d) => setQueueDate(shiftDateISO(queueDate, d))}
              onToday={() => setQueueDate(todayISO())}
              onDone={(item) => markDoneAndBill(item)}
              onCancel={(id) => updateQueueStatus(id, "cancelled")}
              onReopen={(id) => updateQueueStatus(id, "pending")}
              onDelete={(id, label) => setConfirmDelete({ type: "queue", id, label })}
            />
          )}

          {tab === "finance" && (
            <FinanceTab
              view={financeView}
              setView={setFinanceView}
              monthFilter={monthFilter}
              monthLabelText={monthLabel(monthFilter)}
              onShiftMonth={shiftMonth}
              revenues={monthRevenues}
              revenueTotal={monthRevenueFilterTotal}
              onDeleteRevenue={(id, label) => setConfirmDelete({ type: "revenue", id, label })}
              expenses={monthExpenses}
              expenseTotal={monthExpenseFilterTotal}
              onDeleteExpense={(id, label) => setConfirmDelete({ type: "expense", id, label })}
              summaryYear={summaryYear}
              setSummaryYear={setSummaryYear}
              yearlyBreakdown={yearlyBreakdown}
              customerStats={customerStats}
            />
          )}

          {tab === "stock" && (
            <StockTab
              materials={data.materials}
              onAdjust={(m) => setAdjustingMaterial(m)}
              onDelete={(id, label) => setConfirmDelete({ type: "material", id, label })}
            />
          )}
        </div>

        {fab && (
          <button
            onClick={fab.onClick}
            style={{ position: "fixed", bottom: 84, right: 20, background: COLORS.accent, color: "#fff", boxShadow: "0 10px 28px rgba(0,0,0,0.4)" }}
            className="w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform z-40"
            aria-label={`เพิ่ม${fab.label}`}
          >
            <Plus size={24} />
          </button>
        )}

        <div
          style={{ position: "sticky", bottom: 12, background: COLORS.surface, border: `1px solid ${COLORS.border}`, maxWidth: 420, margin: "0 auto", width: "calc(100% - 32px)", borderRadius: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}
          className="flex justify-around py-2 px-2 mb-4"
        >
          <NavButton icon={Home} label="ภาพรวม" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
          <NavButton icon={CalendarDays} label="คิว" active={tab === "queue"} onClick={() => setTab("queue")} />
          <NavButton icon={Wallet} label="บัญชี" active={tab === "finance"} onClick={() => setTab("finance")} />
          <NavButton icon={Package} label="สต็อก" active={tab === "stock"} onClick={() => setTab("stock")} />
        </div>
      </div>

      {showRevenueForm && (
        <RevenueForm prefill={revenuePrefill} onSave={addRevenue} onClose={() => { setShowRevenueForm(false); setRevenuePrefill(null); }} />
      )}
      {showExpenseForm && <ExpenseForm onSave={addExpense} onClose={() => setShowExpenseForm(false)} />}
      {showMaterialForm && <MaterialForm onSave={addMaterial} onClose={() => setShowMaterialForm(false)} />}
      {showQueueForm && <QueueForm defaultDate={queueDate} onSave={addQueue} onClose={() => setShowQueueForm(false)} />}
      {adjustingMaterial && (
        <AdjustStockForm material={adjustingMaterial} onSave={adjustStock} onClose={() => setAdjustingMaterial(null)} />
      )}
      {confirmDelete && (
        <ConfirmDialog
          message={`ลบ "${confirmDelete.label}" ใช่ไหม? ย้อนกลับไม่ได้`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            if (confirmDelete.type === "revenue") deleteRevenue(confirmDelete.id);
            else if (confirmDelete.type === "expense") deleteExpense(confirmDelete.id);
            else if (confirmDelete.type === "queue") deleteQueue(confirmDelete.id);
            else deleteMaterial(confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1.5 px-3 active:scale-95 transition-transform">
      <div
        style={{ background: active ? COLORS.accent : "transparent", color: active ? "#fff" : COLORS.inkSoft }}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
      >
        <Icon size={18} />
      </div>
      <span style={{ color: active ? COLORS.ink : COLORS.inkSoft }} className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
    </button>
  );
}

// ---------- Dashboard ----------

function ComparisonRow({ label, current, previous, currentLabel, previousLabel }) {
  const change = previous === 0 ? null : ((current - previous) / previous) * 100;
  const isUp = change !== null && change >= 0;
  const maxVal = Math.max(current, previous, 1);
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p style={{ color: COLORS.ink }} className="text-sm font-medium">{label}</p>
        {change !== null ? (
          <span style={{ background: isUp ? COLORS.sageSoft : COLORS.warnSoft, color: isUp ? COLORS.sage : COLORS.warn }} className="rounded-full px-2 py-0.5 text-[11px] font-semibold flex items-center gap-1">
            {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        ) : (
          <span style={{ background: COLORS.accentSoft, color: COLORS.accentDeep }} className="rounded-full px-2 py-0.5 text-[11px] font-semibold">ใหม่</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span style={{ color: COLORS.inkSoft }} className="text-[11px]">{currentLabel}</span>
            <span style={{ color: COLORS.ink }} className="text-xs font-semibold">{thb(current)}</span>
          </div>
          <div style={{ background: COLORS.graySoft, borderRadius: 4, height: 8 }}>
            <div style={{ background: COLORS.accent, borderRadius: 4, height: 8, width: `${(current / maxVal) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span style={{ color: COLORS.inkSoft }} className="text-[11px]">{previousLabel}</span>
            <span style={{ color: COLORS.inkSoft }} className="text-xs font-medium">{thb(previous)}</span>
          </div>
          <div style={{ background: COLORS.graySoft, borderRadius: 4, height: 8 }}>
            <div style={{ background: COLORS.border, borderRadius: 4, height: 8, width: `${(previous / maxVal) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesComparison({ monthCurrent, monthPrevious, yearCurrent, yearPrevious, monthLabelCurrent, monthLabelPrevious, yearLabelCurrent, yearLabelPrevious }) {
  return (
    <div className="mt-5">
      <h3 style={{ color: COLORS.ink }} className="text-sm font-semibold mb-2 flex items-center gap-1.5">
        <BarChart3 size={16} style={{ color: COLORS.accentDeep }} /> เปรียบเทียบยอดขาย
      </h3>
      <div className="flex flex-col gap-2.5">
        <ComparisonRow label="เทียบรายเดือน" current={monthCurrent} previous={monthPrevious} currentLabel={monthLabelCurrent} previousLabel={monthLabelPrevious} />
        <ComparisonRow label="เทียบรายปี" current={yearCurrent} previous={yearPrevious} currentLabel={yearLabelCurrent} previousLabel={yearLabelPrevious} />
      </div>
    </div>
  );
}

function Dashboard({ todayRevenueTotal, monthRevenueTotal, monthExpenseTotal, monthNet, prevMonthRevenueTotal, currentYearRevenueTotal, prevYearRevenueTotal, monthLabelCurrent, monthLabelPrevious, yearLabelCurrent, yearLabelPrevious, lowStock, todayQueue, recentActivity, onAddRevenue, onAddExpense, onAddQueue, onAddMaterial, onGoStock, onGoQueue }) {
  return (
    <div>
      <div
        style={{
          background: `radial-gradient(circle at 20% 0%, ${COLORS.accentSoft} 0%, ${COLORS.surface} 65%)`,
          border: `1px solid ${COLORS.border}`,
        }}
        className="rounded-3xl p-5 mt-2"
      >
        <p style={{ color: COLORS.inkSoft }} className="text-xs font-medium mb-1">รายรับวันนี้</p>
        <p style={{ color: COLORS.ink, fontFamily: FONT_DISPLAY }} className="text-3xl font-semibold">{thb(todayRevenueTotal)}</p>
        <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: `1px solid ${COLORS.borderSoft}` }}>
          <div className="flex-1">
            <p style={{ color: COLORS.inkSoft }} className="text-[11px] mb-0.5">รายรับเดือนนี้</p>
            <p style={{ color: COLORS.accentDeep }} className="text-sm font-semibold">{thb(monthRevenueTotal)}</p>
          </div>
          <div className="flex-1" style={{ borderLeft: `1px solid ${COLORS.borderSoft}`, paddingLeft: 16 }}>
            <p style={{ color: COLORS.inkSoft }} className="text-[11px] mb-0.5">รายจ่ายเดือนนี้</p>
            <p style={{ color: COLORS.roseDeep }} className="text-sm font-semibold">{thb(monthExpenseTotal)}</p>
          </div>
          <div className="flex-1" style={{ borderLeft: `1px solid ${COLORS.borderSoft}`, paddingLeft: 16 }}>
            <p style={{ color: COLORS.inkSoft }} className="text-[11px] mb-0.5">กำไรสุทธิ</p>
            <p style={{ color: monthNet >= 0 ? COLORS.sage : COLORS.warn }} className="text-sm font-semibold">{thb(monthNet)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-5">
        <QuickAction icon={Wallet} label="รายรับ" onClick={onAddRevenue} color={COLORS.sage} />
        <QuickAction icon={CalendarDays} label="เพิ่มคิว" onClick={onAddQueue} color={COLORS.accentDeep} />
        <QuickAction icon={Receipt} label="รายจ่าย" onClick={onAddExpense} color={COLORS.roseDeep} />
        <QuickAction icon={Package} label="วัสดุ" onClick={onAddMaterial} color={COLORS.accentDeep} />
      </div>

      {todayQueue.length > 0 && (
        <button onClick={onGoQueue} style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}`, width: "100%" }} className="mt-4 rounded-2xl p-3.5 flex items-center gap-2.5 text-left active:scale-[0.98] transition-transform">
          <CalendarDays size={18} style={{ color: COLORS.accentDeep }} className="shrink-0" />
          <p style={{ color: COLORS.ink }} className="text-sm font-medium flex-1">คิววันนี้เหลือ {todayQueue.length} คิว</p>
          <ChevronRight size={16} style={{ color: COLORS.inkSoft }} />
        </button>
      )}

      {lowStock.length > 0 && (
        <button onClick={onGoStock} style={{ background: COLORS.warnSoft, color: COLORS.warn, width: "100%" }} className="mt-3 rounded-2xl p-3.5 flex items-start gap-2.5 text-left active:scale-[0.98] transition-transform">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">วัสดุใกล้หมด {lowStock.length} รายการ</p>
            <p className="text-xs mt-0.5 opacity-90">{lowStock.map((m) => m.name).join(", ")}</p>
          </div>
        </button>
      )}

      <SalesComparison
        monthCurrent={monthRevenueTotal}
        monthPrevious={prevMonthRevenueTotal}
        yearCurrent={currentYearRevenueTotal}
        yearPrevious={prevYearRevenueTotal}
        monthLabelCurrent={monthLabelCurrent}
        monthLabelPrevious={monthLabelPrevious}
        yearLabelCurrent={yearLabelCurrent}
        yearLabelPrevious={yearLabelPrevious}
      />

      <div className="mt-6">
        <h3 style={{ color: COLORS.ink }} className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <TrendingUp size={16} style={{ color: COLORS.accentDeep }} /> กิจกรรมล่าสุด
        </h3>
        {recentActivity.length === 0 ? (
          <EmptyState text="ยังไม่มีข้อมูล เริ่มบันทึกรายรับแรกของร้านได้เลย" />
        ) : (
          <div className="flex flex-col gap-2">
            {recentActivity.map((item) => {
              const isRevenue = item.kind === "revenue";
              const isExpense = item.kind === "expense";
              const iconBg = isRevenue ? COLORS.sageSoft : isExpense ? COLORS.roseSoft : COLORS.accentSoft;
              const iconColor = isRevenue ? COLORS.sage : isExpense ? COLORS.roseDeep : COLORS.accentDeep;
              return (
                <div key={item.kind + item.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl p-3 flex items-center gap-3">
                  <div style={{ background: iconBg, color: iconColor }} className="rounded-full p-2 shrink-0">
                    {isRevenue ? <Wallet size={14} /> : isExpense ? <TrendingDown size={14} /> : item.type === "in" ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: COLORS.ink }} className="text-sm font-medium truncate">{item.label}</p>
                    <p style={{ color: COLORS.inkSoft }} className="text-xs truncate">{thaiDate(item.date)}{item.sub ? ` · ${item.sub}` : ""}</p>
                  </div>
                  <p style={{ color: isRevenue ? COLORS.sage : isExpense ? COLORS.roseDeep : COLORS.inkSoft }} className="text-sm font-medium shrink-0">
                    {isRevenue ? thb(item.amount) : isExpense ? `-${thb(item.amount)}` : `${item.type === "in" ? "+" : "-"}${item.qty}`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Queue Tab ----------

function statusColors(status) {
  if (status === "done") return { bg: COLORS.sageSoft, text: COLORS.sage, label: "เสร็จแล้ว" };
  if (status === "cancelled") return { bg: COLORS.graySoft, text: COLORS.gray, label: "ยกเลิก" };
  return { bg: COLORS.accentSoft, text: COLORS.accentDeep, label: "รอคิว" };
}

function QueueTab({ date, items, onShiftDate, onToday, onDone, onCancel, onReopen, onDelete }) {
  const isToday = date === todayISO();
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = statusFilter === "all" ? items : items.filter((q) => q.status === statusFilter);
  return (
    <div className="mt-2">
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl flex items-center justify-between p-1.5">
        <button onClick={() => onShiftDate(-1)} style={{ color: COLORS.inkSoft }} className="p-2 active:scale-90 transition-transform" aria-label="วันก่อนหน้า"><ChevronLeft size={20} /></button>
        <button onClick={onToday} className="text-center">
          <p style={{ color: COLORS.ink, fontFamily: FONT_DISPLAY }} className="text-base font-semibold">{thaiDateShort(date)}</p>
          {!isToday && <p style={{ color: COLORS.accentDeep }} className="text-[11px]">แตะเพื่อกลับวันนี้</p>}
        </button>
        <button onClick={() => onShiftDate(1)} style={{ color: COLORS.inkSoft }} className="p-2 active:scale-90 transition-transform" aria-label="วันถัดไป"><ChevronRight size={20} /></button>
      </div>

      <div className="mt-4">
        <FilterPillRow
          active={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: `ทั้งหมด (${items.length})` },
            { value: "pending", label: "รอคิว" },
            { value: "done", label: "เสร็จแล้ว" },
            { value: "cancelled", label: "ยกเลิก" },
          ]}
        />
      </div>

      <div className="mt-1 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <EmptyState text={items.length === 0 ? "วันนี้ยังไม่มีคิวลูกค้า แตะปุ่ม + ด้านล่างเพื่อเพิ่มคิว" : "ไม่มีคิวที่ตรงกับตัวกรองนี้"} />
        ) : (
          filtered.map((q) => {
            const sc = statusColors(q.status);
            return (
              <div key={q.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl p-3.5">
                <div className="flex items-start gap-3">
                  <div style={{ background: sc.bg, color: sc.text }} className="rounded-xl px-2 py-1 text-xs font-semibold shrink-0 min-w-[52px] text-center">
                    {q.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: COLORS.ink }} className="text-sm font-medium truncate">{q.customerName}</p>
                    <p style={{ color: COLORS.inkSoft }} className="text-xs truncate">{q.service}{q.phone ? ` · ${q.phone}` : ""}</p>
                    {q.note && <p style={{ color: COLORS.inkSoft }} className="text-xs truncate mt-0.5">{q.note}</p>}
                  </div>
                  <span style={{ background: sc.bg, color: sc.text }} className="rounded-full px-2 py-1 text-[11px] font-medium shrink-0">{sc.label}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {q.status === "pending" && (
                    <>
                      <button onClick={() => onDone(q)} style={{ background: COLORS.sageSoft, color: COLORS.sage }} className="flex-1 rounded-xl py-2 text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-transform">
                        <Check size={13} /> เสร็จแล้ว
                      </button>
                      <button onClick={() => onCancel(q.id)} style={{ background: COLORS.surfaceAlt, color: COLORS.inkSoft }} className="flex-1 rounded-xl py-2 text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-transform">
                        <Ban size={13} /> ยกเลิก
                      </button>
                    </>
                  )}
                  {q.status !== "pending" && (
                    <button onClick={() => onReopen(q.id)} style={{ background: COLORS.surfaceAlt, color: COLORS.inkSoft }} className="flex-1 rounded-xl py-2 text-xs font-medium active:scale-95 transition-transform">
                      ย้ายกลับเป็นรอคิว
                    </button>
                  )}
                  <button onClick={() => onDelete(q.id, q.customerName)} style={{ color: COLORS.inkSoft, background: COLORS.surfaceAlt }} className="rounded-xl py-2 px-3 active:scale-90 transition-transform" aria-label="ลบคิว">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function QueueForm({ defaultDate, onSave, onClose }) {
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("10:00");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    if (!customerName.trim() || !service.trim()) return;
    onSave({ date, time, customerName: customerName.trim(), phone: phone.trim(), service: service.trim(), note: note.trim() });
  }

  return (
    <Modal title="เพิ่มคิวลูกค้า" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="วันที่"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field>
        <Field label="เวลา"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} /></Field>
      </div>
      <Field label="ชื่อลูกค้า">
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="เช่น คุณน้ำฝน" style={inputStyle} />
      </Field>
      <Field label="เบอร์โทร (ถ้ามี)">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" style={inputStyle} />
      </Field>
      <Field label="บริการ">
        <ServicePicker value={service} onChange={setService} />
      </Field>
      <Field label="โน้ต (ถ้ามี)">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="รายละเอียดเพิ่มเติม" style={inputStyle} />
      </Field>
      <button onClick={submit} disabled={!customerName.trim() || !service.trim()} style={{ background: COLORS.accent, color: "#fff" }} className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium mt-2 active:scale-[0.98] transition-transform">
        <Check size={16} /> บันทึกคิว
      </button>
    </Modal>
  );
}

// ---------- Finance Tab (revenue / expense / summary / customers) ----------

function FinanceTab(props) {
  const { view, setView } = props;

  function exportCombinedMonth() {
    const net = props.revenueTotal - props.expenseTotal;
    const categoryTotals = groupExpensesByCategory(props.expenses);
    const generatedOn = thaiDate(todayISO());
    const rows = [
      ["Orange Lash"],
      ["งบกำไรขาดทุน (Income Statement)"],
      [`สำหรับเดือน ${props.monthLabelText}`],
      [`วันที่ออกรายงาน: ${generatedOn}`],
      [],
      ["รายได้"],
      ["  รายได้จากการให้บริการ", "", "", "", props.revenueTotal],
      ["รวมรายได้", "", "", "", props.revenueTotal],
      [],
      ["ค่าใช้จ่าย"],
      ...categoryTotals.map((c) => [`  ${c.category}`, "", "", "", c.total]),
      ["รวมค่าใช้จ่าย", "", "", "", props.expenseTotal],
      [],
      ["กำไร (ขาดทุน) สุทธิ", "", "", "", net],
      [],
      [],
      ["รายละเอียดประกอบ - รายได้ (Revenue detail)"],
      ["วันที่", "บริการ", "ชื่อลูกค้า", "โน้ต", "จำนวนเงิน (บาท)"],
      ...props.revenues.map((r) => [r.date, r.service, r.customerName || "", r.note || "", r.amount]),
      ["รวม", "", "", "", props.revenueTotal],
      [],
      ["รายละเอียดประกอบ - ค่าใช้จ่าย (Expense detail)"],
      ["วันที่", "หมวดหมู่", "โน้ต", "", "จำนวนเงิน (บาท)"],
      ...props.expenses.map((e) => [e.date, e.category, e.note || "", "", e.amount]),
      ["รวม", "", "", "", props.expenseTotal],
    ];
    downloadCSV(`งบกำไรขาดทุน_${props.monthLabelText.replace(/\s+/g, "_")}.csv`, rows);
  }

  return (
    <div className="mt-2">
      <SegmentedControl
        active={view}
        onChange={setView}
        options={[
          { value: "revenue", label: "รายรับ" },
          { value: "expense", label: "รายจ่าย" },
          { value: "summary", label: "สรุปยอด" },
          { value: "customers", label: "ลูกค้า" },
        ]}
      />

      {(view === "revenue" || view === "expense") && (
        <>
          <MonthNav label={props.monthLabelText} onShift={props.onShiftMonth} />
          <button onClick={exportCombinedMonth} style={{ background: COLORS.accentSoft, color: COLORS.accentDeep, border: `1px solid ${COLORS.accent}55` }} className="mt-3 w-full rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs font-medium active:scale-[0.98] transition-transform">
            <Download size={14} /> ส่งออกงบกำไรขาดทุนเดือนนี้ (มาตรฐานบัญชี)
          </button>
        </>
      )}

      {view === "revenue" && (
        <RevenueView
          revenues={props.revenues} total={props.revenueTotal} onDelete={props.onDeleteRevenue}
        />
      )}
      {view === "expense" && (
        <ExpenseView
          expenses={props.expenses} total={props.expenseTotal} onDelete={props.onDeleteExpense}
        />
      )}
      {view === "summary" && (
        <SummaryView year={props.summaryYear} setYear={props.setSummaryYear} breakdown={props.yearlyBreakdown} />
      )}
      {view === "customers" && <CustomerView stats={props.customerStats} />}
    </div>
  );
}

function MonthNav({ label, onShift }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl flex items-center justify-between p-1.5 mt-4">
      <button onClick={() => onShift(-1)} style={{ color: COLORS.inkSoft }} className="p-2 active:scale-90 transition-transform" aria-label="เดือนก่อนหน้า"><ChevronLeft size={20} /></button>
      <p style={{ color: COLORS.ink, fontFamily: FONT_DISPLAY }} className="text-base font-semibold">{label}</p>
      <button onClick={() => onShift(1)} style={{ color: COLORS.inkSoft }} className="p-2 active:scale-90 transition-transform" aria-label="เดือนถัดไป"><ChevronRight size={20} /></button>
    </div>
  );
}

function RevenueView({ revenues, total, onDelete }) {
  const [query, setQuery] = useState("");
  const filtered = revenues.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return r.service.toLowerCase().includes(q) || (r.customerName || "").toLowerCase().includes(q) || (r.note || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ background: `radial-gradient(circle at 20% 0%, ${COLORS.sageSoft} 0%, ${COLORS.surface} 65%)`, border: `1px solid ${COLORS.border}` }} className="rounded-2xl p-4 mt-3 text-center">
        <p style={{ color: COLORS.sage }} className="text-xs font-medium mb-1">รวมรายรับเดือนนี้</p>
        <p style={{ color: COLORS.ink, fontFamily: FONT_DISPLAY }} className="text-2xl font-semibold">{thb(total)}</p>
      </div>
      {revenues.length > 0 && (
        <div className="mt-3">
          <SearchBar value={query} onChange={setQuery} placeholder="ค้นหาบริการหรือชื่อลูกค้า..." />
        </div>
      )}
      <div className="mt-1 flex flex-col gap-2">
        {revenues.length === 0 ? (
          <EmptyState text="เดือนนี้ยังไม่มีรายการรายรับ" />
        ) : filtered.length === 0 ? (
          <EmptyState text="ไม่พบรายการที่ตรงกับคำค้นหานี้" />
        ) : filtered.map((r) => (
          <div key={r.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl p-3 flex items-center gap-3">
            <div style={{ background: COLORS.sageSoft, color: COLORS.sage }} className="rounded-full p-2 shrink-0">
              <Wallet size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color: COLORS.ink }} className="text-sm font-medium truncate">{r.service}</p>
              <p style={{ color: COLORS.inkSoft }} className="text-xs truncate">
                {thaiDate(r.date)}{r.customerName ? ` · ${r.customerName}` : ""}{r.note ? ` · ${r.note}` : ""}
              </p>
            </div>
            <p style={{ color: COLORS.sage }} className="text-sm font-semibold shrink-0">{thb(r.amount)}</p>
            <button onClick={() => onDelete(r.id, r.service)} style={{ color: COLORS.inkSoft }} className="p-1.5 shrink-0 active:scale-90 transition-transform" aria-label="ลบรายการ"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpenseView({ expenses, total, onDelete }) {
  const [query, setQuery] = useState("");
  const filtered = expenses.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return e.category.toLowerCase().includes(q) || (e.note || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{ background: `radial-gradient(circle at 20% 0%, ${COLORS.roseSoft} 0%, ${COLORS.surface} 65%)`, border: `1px solid ${COLORS.border}` }} className="rounded-2xl p-4 mt-3 text-center">
        <p style={{ color: COLORS.roseDeep }} className="text-xs font-medium mb-1">รวมรายจ่ายเดือนนี้</p>
        <p style={{ color: COLORS.ink, fontFamily: FONT_DISPLAY }} className="text-2xl font-semibold">{thb(total)}</p>
      </div>
      {expenses.length > 0 && (
        <div className="mt-3">
          <SearchBar value={query} onChange={setQuery} placeholder="ค้นหาหมวดหมู่หรือโน้ต..." />
        </div>
      )}
      <div className="mt-1 flex flex-col gap-2">
        {expenses.length === 0 ? (
          <EmptyState text="เดือนนี้ยังไม่มีรายการรายจ่าย" />
        ) : filtered.length === 0 ? (
          <EmptyState text="ไม่พบรายการที่ตรงกับคำค้นหานี้" />
        ) : filtered.map((e) => (
          <div key={e.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl p-3 flex items-center gap-3">
            <div style={{ background: COLORS.roseSoft, color: COLORS.roseDeep }} className="rounded-full p-2 shrink-0">
              <TrendingDown size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color: COLORS.ink }} className="text-sm font-medium truncate">{e.category}</p>
              <p style={{ color: COLORS.inkSoft }} className="text-xs truncate">{thaiDate(e.date)}{e.note ? ` · ${e.note}` : ""}</p>
            </div>
            <p style={{ color: COLORS.roseDeep }} className="text-sm font-semibold shrink-0">-{thb(e.amount)}</p>
            <button onClick={() => onDelete(e.id, e.category)} style={{ color: COLORS.inkSoft }} className="p-1.5 shrink-0 active:scale-90 transition-transform" aria-label="ลบรายการ"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryView({ year, setYear, breakdown }) {
  function exportYear() {
    const generatedOn = thaiDate(todayISO());
    const rows = [
      ["Orange Lash"],
      ["งบกำไรขาดทุน (Income Statement)"],
      [`สำหรับปี พ.ศ. ${year + 543}`],
      [`วันที่ออกรายงาน: ${generatedOn}`],
      [],
      ["รายได้"],
      ["  รายได้จากการให้บริการ", "", "", "", breakdown.yearRevenue],
      ["รวมรายได้", "", "", "", breakdown.yearRevenue],
      [],
      ["ค่าใช้จ่าย"],
      ...breakdown.categoryTotals.map((c) => [`  ${c.category}`, "", "", "", c.total]),
      ["รวมค่าใช้จ่าย", "", "", "", breakdown.yearExpense],
      [],
      ["กำไร (ขาดทุน) สุทธิ", "", "", "", breakdown.yearNet],
      [],
      [],
      ["ตารางประกอบ - สรุปรายเดือน (Monthly schedule)"],
      ["เดือน", "รายรับ (บาท)", "รายจ่าย (บาท)", "กำไรสุทธิ (บาท)"],
      ...breakdown.months.map((m) => [m.label, m.revenue, m.expense, m.net]),
      ["รวมทั้งปี", breakdown.yearRevenue, breakdown.yearExpense, breakdown.yearNet],
    ];
    downloadCSV(`งบกำไรขาดทุน_ปี_${year + 543}.csv`, rows);
  }

  return (
    <div>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl flex items-center justify-between p-1.5 mt-4">
        <button onClick={() => setYear(year - 1)} style={{ color: COLORS.inkSoft }} className="p-2 active:scale-90 transition-transform" aria-label="ปีก่อนหน้า"><ChevronLeft size={20} /></button>
        <p style={{ color: COLORS.ink, fontFamily: FONT_DISPLAY }} className="text-base font-semibold flex items-center gap-1.5">
          <BarChart3 size={16} style={{ color: COLORS.accentDeep }} /> พ.ศ. {year + 543}
        </p>
        <button onClick={() => setYear(year + 1)} style={{ color: COLORS.inkSoft }} className="p-2 active:scale-90 transition-transform" aria-label="ปีถัดไป"><ChevronRight size={20} /></button>
      </div>

      <button onClick={exportYear} style={{ background: COLORS.accentSoft, color: COLORS.accentDeep, border: `1px solid ${COLORS.accent}55` }} className="mt-3 w-full rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs font-medium active:scale-[0.98] transition-transform">
        <Download size={14} /> ส่งออกงบกำไรขาดทุนทั้งปี (มาตรฐานบัญชี)
      </button>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div style={{ background: COLORS.sageSoft }} className="rounded-2xl p-4">
          <p style={{ color: COLORS.sage }} className="text-xs font-medium mb-1">รายรับรวมทั้งปี</p>
          <p style={{ color: COLORS.ink }} className="text-lg font-semibold">{thb(breakdown.yearRevenue)}</p>
        </div>
        <div style={{ background: COLORS.roseSoft }} className="rounded-2xl p-4">
          <p style={{ color: COLORS.roseDeep }} className="text-xs font-medium mb-1">รายจ่ายรวมทั้งปี</p>
          <p style={{ color: COLORS.ink }} className="text-lg font-semibold">{thb(breakdown.yearExpense)}</p>
        </div>
      </div>
      <div style={{ background: breakdown.yearNet >= 0 ? COLORS.accentSoft : COLORS.warnSoft }} className="rounded-2xl p-4 mt-3 text-center">
        <p style={{ color: breakdown.yearNet >= 0 ? COLORS.accentDeep : COLORS.warn }} className="text-xs font-medium mb-1">กำไรสุทธิทั้งปี</p>
        <p style={{ color: COLORS.ink, fontFamily: FONT_DISPLAY }} className="text-2xl font-semibold">{thb(breakdown.yearNet)}</p>
      </div>

      <div className="mt-5">
        <h3 style={{ color: COLORS.ink }} className="text-sm font-semibold mb-2">สรุปรายเดือน</h3>
        <div className="flex items-center gap-3 mb-2 text-[11px]" style={{ color: COLORS.inkSoft }}>
          <span className="flex items-center gap-1"><span style={{ background: COLORS.sage, width: 8, height: 8, borderRadius: 2, display: "inline-block" }} />รายรับ</span>
          <span className="flex items-center gap-1"><span style={{ background: COLORS.roseDeep, width: 8, height: 8, borderRadius: 2, display: "inline-block" }} />รายจ่าย</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {breakdown.months.map((m) => (
            <div key={m.month} style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <p style={{ color: COLORS.ink }} className="text-sm font-medium">{m.label}</p>
                <p style={{ color: m.net >= 0 ? COLORS.sage : COLORS.warn }} className="text-xs font-semibold">สุทธิ {thb(m.net)}</p>
              </div>
              <div className="flex flex-col gap-1">
                <div style={{ background: COLORS.graySoft, borderRadius: 4, height: 6 }}>
                  <div style={{ background: COLORS.sage, borderRadius: 4, height: 6, width: `${(m.revenue / breakdown.maxValue) * 100}%` }} />
                </div>
                <div style={{ background: COLORS.graySoft, borderRadius: 4, height: 6 }}>
                  <div style={{ background: COLORS.roseDeep, borderRadius: 4, height: 6, width: `${(m.expense / breakdown.maxValue) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomerRankList({ items, formatMetric, metricLabel }) {
  if (items.length === 0) {
    return <EmptyState text="ยังไม่มีข้อมูลลูกค้า ใส่ชื่อลูกค้าตอนบันทึกรายรับเพื่อดูสถิตินี้" />;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((c, i) => (
        <div key={c.name} style={{ background: COLORS.surface, border: `1px solid ${COLORS.borderSoft}` }} className="rounded-2xl p-3 flex items-center gap-3">
          <div
            style={{ background: i < 3 ? COLORS.accentSoft : COLORS.surfaceAlt, color: i < 3 ? COLORS.accentDeep : COLORS.inkSoft }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
          >
            {i === 0 ? <Crown size={15} /> : i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ color: COLORS.ink }} className="text-sm font-medium truncate">{c.name}</p>
            <p style={{ color: COLORS.inkSoft }} className="text-xs truncate">มาล่าสุด {thaiDate(c.lastDate)}</p>
          </div>
          <div className="text-right shrink-0">
            <p style={{ color: COLORS.accentDeep }} className="text-sm font-semibold">{formatMetric(c)}</p>
            <p style={{ color: COLORS.inkSoft }} className="text-[11px]">{metricLabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomerView({ stats }) {
  const [sub, setSub] = useState("frequency");
  return (
    <div className="mt-4">
      <SegmentedControl
        active={sub}
        onChange={setSub}
        options={[
          { value: "frequency", label: "ใช้บริการบ่อยสุด" },
          { value: "total", label: "ยอดใช้จ่ายสูงสุด" },
        ]}
      />
      <div className="mt-4">
        {sub === "frequency" ? (
          <CustomerRankList items={stats.byFrequency} metricLabel="ครั้ง" formatMetric={(c) => `${c.count} ครั้ง`} />
        ) : (
          <CustomerRankList items={stats.byTotal} metricLabel="ยอดสะสม" formatMetric={(c) => thb(c.total)} />
        )}
      </div>

      {stats.unlabeled > 0 && (
        <p style={{ color: COLORS.inkSoft }} className="text-xs mt-4 flex items-center gap-1.5">
          <Users size={13} />
          มีรายรับ {stats.unlabeled} รายการที่ไม่ได้ระบุชื่อลูกค้า จึงไม่ถูกนับในสถิตินี้
        </p>
      )}
    </div>
  );
}

function RevenueForm({ prefill, onSave, onClose }) {
  const [date, setDate] = useState(prefill?.date || todayISO());
  const [service, setService] = useState(prefill?.service || "");
  const [amount, setAmount] = useState("");
  const [customerName, setCustomerName] = useState(prefill?.customerName || "");
  const [note, setNote] = useState(prefill?.note || "");

  function submit() {
    if (!service.trim() || !amount || Number(amount) <= 0) return;
    onSave({ date, service: service.trim(), amount: Number(amount), customerName: customerName.trim(), note: note.trim() });
  }

  return (
    <Modal title="เพิ่มรายรับ" onClose={onClose}>
      <Field label="วันที่"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field>
      <Field label="บริการ">
        <ServicePicker value={service} onChange={setService} />
      </Field>
      <Field label="จำนวนเงิน (บาท)"><input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" style={inputStyle} /></Field>
      <Field label="ชื่อลูกค้า (ถ้ามี)"><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="เช่น คุณน้ำฝน" style={inputStyle} /></Field>
      <Field label="โน้ต (ถ้ามี)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="รายละเอียดเพิ่มเติม" style={inputStyle} /></Field>
      <button onClick={submit} disabled={!service.trim() || !amount || Number(amount) <= 0} style={{ background: COLORS.accent, color: "#fff" }} className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium mt-2 active:scale-[0.98] transition-transform">
        <Check size={16} /> บันทึกรายรับ
      </button>
    </Modal>
  );
}

function ExpenseForm({ onSave, onClose }) {
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    if (!amount || Number(amount) <= 0) return;
    onSave({ date, category, amount: Number(amount), note: note.trim() });
  }

  return (
    <Modal title="เพิ่มรายจ่าย" onClose={onClose}>
      <Field label="วันที่"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field>
      <Field label="หมวดหมู่">
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="จำนวนเงิน (บาท)"><input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" style={inputStyle} /></Field>
      <Field label="โน้ต (ถ้ามี)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="รายละเอียดเพิ่มเติม" style={inputStyle} /></Field>
      <button onClick={submit} disabled={!amount || Number(amount) <= 0} style={{ background: COLORS.roseSolid, color: "#fff" }} className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium mt-2 active:scale-[0.98] transition-transform">
        <Check size={16} /> บันทึกรายจ่าย
      </button>
    </Modal>
  );
}

// ---------- Stock Tab ----------

function StockTab({ materials, onAdjust, onDelete }) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = materials.filter((m) => {
    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
    const matchesQuery = m.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="mt-2">
      <SearchBar value={query} onChange={setQuery} placeholder="ค้นหาวัสดุ..." />
      <FilterPillRow
        active={categoryFilter}
        onChange={setCategoryFilter}
        options={[{ value: "all", label: "ทั้งหมด" }, ...CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label }))]}
      />

      {filtered.length === 0 ? (
        <EmptyState text={materials.length === 0 ? "ยังไม่มีวัสดุในสต็อก แตะปุ่ม + ด้านล่างเพื่อเพิ่มกาวหรือขนตาชุดแรก" : "ไม่พบวัสดุที่ตรงกับคำค้นหานี้"} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((m) => {
            const low = Number(m.quantity) <= Number(m.lowThreshold || 0);
            return (
              <div key={m.id} style={{ background: COLORS.surface, border: `1px solid ${low ? COLORS.warn + "55" : COLORS.borderSoft}` }} className="rounded-2xl overflow-hidden">
                <div style={{ background: low ? COLORS.warnSoft : COLORS.accentSoft, position: "relative" }} className="h-16 flex items-center justify-center">
                  <Package size={22} style={{ color: low ? COLORS.warn : COLORS.accentDeep }} />
                  <button
                    onClick={() => onAdjust(m)}
                    style={{ position: "absolute", top: 8, right: 8, background: COLORS.surface, color: COLORS.accentDeep }}
                    className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    aria-label="ปรับสต็อก"
                  >
                    <SlidersHorizontal size={13} />
                  </button>
                  <span
                    style={{ position: "absolute", bottom: 8, left: 8, background: COLORS.surface, color: low ? COLORS.warn : COLORS.ink }}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  >
                    {m.quantity} {m.unit}
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1 mb-0.5">
                    <p style={{ color: COLORS.ink }} className="text-sm font-medium truncate">{m.name}</p>
                    {low && <AlertTriangle size={12} style={{ color: COLORS.warn }} className="shrink-0" />}
                  </div>
                  <p style={{ color: COLORS.inkSoft }} className="text-[11px] mb-2">{categoryLabel(m.category)} · ขั้นต่ำ {m.lowThreshold || 0}</p>
                  <button
                    onClick={() => onDelete(m.id, m.name)}
                    style={{ color: COLORS.inkSoft, background: COLORS.surfaceAlt }}
                    className="w-full rounded-lg py-1.5 text-xs font-medium active:scale-95 transition-transform"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MaterialForm({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("glue");
  const [unit, setUnit] = useState(UNIT_OPTIONS[0]);
  const [quantity, setQuantity] = useState("");
  const [lowThreshold, setLowThreshold] = useState("");

  function submit() {
    if (!name.trim() || quantity === "") return;
    onSave({ name: name.trim(), category, unit, quantity: Number(quantity), lowThreshold: Number(lowThreshold) || 0 });
  }

  return (
    <Modal title="เพิ่มวัสดุใหม่" onClose={onClose}>
      <Field label="ชื่อวัสดุ"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น กาวติดขนตา 5ml" style={inputStyle} /></Field>
      <Field label="หมวดหมู่">
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
          {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="จำนวนเริ่มต้น"><input type="text" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" style={inputStyle} /></Field>
        <Field label="หน่วย">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle}>
            {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
      </div>
      <Field label="แจ้งเตือนเมื่อเหลือน้อยกว่า"><input type="text" inputMode="decimal" value={lowThreshold} onChange={(e) => setLowThreshold(e.target.value)} placeholder="0" style={inputStyle} /></Field>
      <button onClick={submit} disabled={!name.trim() || quantity === ""} style={{ background: COLORS.accent, color: "#fff" }} className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium mt-2 active:scale-[0.98] transition-transform">
        <Check size={16} /> บันทึกวัสดุ
      </button>
    </Modal>
  );
}

function AdjustStockForm({ material, onSave, onClose }) {
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState("out");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");

  function submit() {
    const n = Number(qty);
    if (!n || n <= 0) return;
    onSave(material.id, type, n, note.trim(), date);
  }

  return (
    <Modal title={`ปรับสต็อก · ${material.name}`} onClose={onClose}>
      <p style={{ color: COLORS.inkSoft }} className="text-xs mb-3">
        คงเหลือปัจจุบัน <span style={{ color: COLORS.ink }} className="font-medium">{material.quantity} {material.unit}</span>
      </p>
      <Field label="วันที่"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field>
      <Field label="ประเภท">
        <div className="flex gap-2">
          <button onClick={() => setType("out")} style={{ background: type === "out" ? COLORS.warn : COLORS.surfaceAlt, color: type === "out" ? "#fff" : COLORS.ink }} className="flex-1 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
            <ArrowUpCircle size={16} /> ใช้ออก
          </button>
          <button onClick={() => setType("in")} style={{ background: type === "in" ? COLORS.sageSolid : COLORS.surfaceAlt, color: type === "in" ? "#fff" : COLORS.ink }} className="flex-1 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
            <ArrowDownCircle size={16} /> เติมเข้า
          </button>
        </div>
      </Field>
      <Field label={`จำนวน (${material.unit})`}><input type="text" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} style={inputStyle} /></Field>
      <Field label="โน้ต (ถ้ามี)"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ใช้กับลูกค้าคิวเช้า" style={inputStyle} /></Field>
      <button onClick={submit} disabled={!qty || Number(qty) <= 0} style={{ background: COLORS.accent, color: "#fff" }} className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-medium mt-2 active:scale-[0.98] transition-transform">
        <Check size={16} /> บันทึก
      </button>
    </Modal>
  );
}

// ---------- Auth ----------

function SignInScreen({ onSignIn, signingIn, error }) {
  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", fontFamily: FONT_BODY }} className="flex items-center justify-center px-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Taviraj:wght@400;500;600;700&family=Prompt:wght@400;500;600;700&display=swap');`}</style>
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <img
            src="/logo-full.jpg"
            alt="Orange Lash - บัญชีร้านต่อขนตา"
            style={{ width: 200, height: 200, borderRadius: 24, objectFit: "cover", border: `1px solid ${COLORS.border}` }}
          />
        </div>

        <button
          onClick={onSignIn}
          disabled={signingIn}
          style={{ background: COLORS.surface, color: COLORS.ink, border: `1px solid ${COLORS.border}` }}
          className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-3 text-sm font-medium active:scale-[0.98] transition-transform"
        >
          {signingIn ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} style={{ color: COLORS.accentDeep }} />}
          {signingIn ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบด้วย Gmail"}
        </button>

        {error && (
          <p style={{ color: COLORS.warn }} className="text-xs mt-4">{error}</p>
        )}

        <p style={{ color: COLORS.inkSoft }} className="text-xs mt-8">
          ข้อมูลร้านของคุณจะถูกเก็บไว้อย่างปลอดภัย ผูกกับบัญชี Gmail ที่ล็อกอินเท่านั้น
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = checking, null = signed out
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return unsubscribe;
  }, []);

  async function handleSignIn() {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setAuthError("เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  if (user === undefined) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh" }} className="flex items-center justify-center">
        <Loader2 className="animate-spin" style={{ color: COLORS.accent }} size={28} />
      </div>
    );
  }

  if (user === null) {
    return <SignInScreen onSignIn={handleSignIn} signingIn={signingIn} error={authError} />;
  }

  return <OrangeLashDashboard user={user} onSignOut={handleSignOut} />;
}
