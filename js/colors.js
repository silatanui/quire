const STORAGE_KEY = "quire-recent-colors";
const MAX_RECENT = 8;

function normalizeHex(color) {
  const value = String(color || "").trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(value)) return null;
  return value;
}

export function loadRecentColors() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeHex).filter(Boolean).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberColor(color) {
  const hex = normalizeHex(color);
  if (!hex) return loadRecentColors();
  const next = [hex, ...loadRecentColors().filter((item) => item !== hex)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode or full quota */
  }
  return next;
}

export function patchForColorKind(kind, color) {
  if (kind === "stroke") return { strokeColor: color };
  if (kind === "letter") return { textColor: color };
  if (kind === "ground") return { textFill: color };
  if (kind === "border") return { borderColor: color };
  return { backgroundColor: color };
}

export function colorKindField(kind) {
  if (kind === "stroke") return "strokeColor";
  if (kind === "letter") return "textColor";
  if (kind === "ground") return "textFill";
  if (kind === "border") return "borderColor";
  return "backgroundColor";
}
