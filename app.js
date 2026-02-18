const API_BASE = "/api/subscriptions";
const RATES_API = "/api/rates?base=USD";
const SHARE_API = "/api/share-links";
const ADMIN_USERS_API = "/api/admin/users";
const ADMIN_USER_STATUS_API = "/api/admin/users/status";
const CURRENCY_CATALOG_API = "/api/currencies";
const CURRENCY_RATE_API = "/api/currency-rate";
const ICON_RESOLVE_API = "/api/icons/resolve";
const ICON_UPLOAD_API = "/api/icons/upload";
const PREF_KEY = "subly_base_currency_v1";
const SETTINGS_KEY = "subly_settings_v1";
const AUTH_TOKEN_KEY = "subly_auth_token_v1";
const CUSTOM_CATEGORY_VALUE = "__custom__";

const CYCLE_LABELS = {
  weekly: "每周",
  monthly: "每月",
  quarterly: "每季度",
  yearly: "每年",
};

const STATUS_LABELS = {
  active: "活跃",
  paused: "暂停",
  canceled: "已取消",
};

const CYCLE_TO_MONTHLY_FACTOR = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

const CURRENCIES = [
  { code: "CNY", label: "人民币 (CNY)", symbol: "¥" },
  { code: "TWD", label: "新台币 (TWD)", symbol: "NT$" },
  { code: "USD", label: "美元 (USD)", symbol: "$" },
  { code: "EUR", label: "欧元 (EUR)", symbol: "€" },
  { code: "GBP", label: "英镑 (GBP)", symbol: "£" },
  { code: "JPY", label: "日元 (JPY)", symbol: "¥" },
  { code: "HKD", label: "港币 (HKD)", symbol: "HK$" },
  { code: "SGD", label: "新加坡元 (SGD)", symbol: "S$" },
  { code: "AUD", label: "澳元 (AUD)", symbol: "A$" },
  { code: "CAD", label: "加元 (CAD)", symbol: "C$" },
  { code: "PHP", label: "菲律宾比索 (PHP)", symbol: "₱" },
];
const CURRENCY_SYMBOL_OVERRIDES = {
  AED: "د.إ",
  ARS: "$",
  BRL: "R$",
  CHF: "Fr",
  CLP: "$",
  COP: "$",
  CZK: "Kč",
  DKK: "kr",
  HUF: "Ft",
  IDR: "Rp",
  ILS: "₪",
  INR: "₹",
  KRW: "₩",
  KZT: "₸",
  MXN: "$",
  MYR: "RM",
  NGN: "₦",
  NOK: "kr",
  NZD: "NZ$",
  PLN: "zł",
  QAR: "ر.ق",
  RUB: "₽",
  SAR: "﷼",
  SEK: "kr",
  THB: "฿",
  TRY: "₺",
  UAH: "₴",
  VND: "₫",
  ZAR: "R",
};

const DEFAULT_CATEGORIES = [
  "娱乐",
  "效率工具",
  "云服务",
  "办公",
  "开发",
  "设计",
  "教育",
  "健康",
  "新闻",
  "金融",
];

const FALLBACK_USD_RATES = {
  USD: 1,
  CNY: 7.2,
  TWD: 32.0,
  EUR: 0.93,
  GBP: 0.79,
  JPY: 150,
  HKD: 7.8,
  SGD: 1.35,
  AUD: 1.53,
  CAD: 1.35,
  PHP: 56.0,
};

const SERVICE_ICON_RULES = [
  { keywords: ["chatgpt", "openai"], icon: "https://cdn.jsdelivr.net/npm/simple-icons/icons/openai.svg", bg: "#e8fbf5" },
  { keywords: ["spotify"], icon: "https://cdn.simpleicons.org/spotify/1DB954", bg: "#e8fff2" },
  { keywords: ["youtube"], icon: "https://cdn.simpleicons.org/youtube/FF0000", bg: "#fff1f1" },
  { keywords: ["netflix"], icon: "https://cdn.simpleicons.org/netflix/E50914", bg: "#fff1f3" },
  { keywords: ["disney"], icon: "https://cdn.simpleicons.org/disney%2B/113CCF", bg: "#eef5ff" },
  { keywords: ["apple music", "music"], icon: "https://cdn.simpleicons.org/applemusic/FA243C", bg: "#fff1f3" },
  { keywords: ["icloud"], icon: "https://cdn.simpleicons.org/icloud/3693F3", bg: "#edf5ff" },
  { keywords: ["google one", "google"], icon: "https://cdn.simpleicons.org/google/4285F4", bg: "#edf5ff" },
  { keywords: ["microsoft 365", "microsoft", "office"], icon: "https://cdn.jsdelivr.net/npm/simple-icons/icons/microsoft.svg", bg: "#f4f4f4" },
  { keywords: ["github"], icon: "https://cdn.simpleicons.org/github/181717", bg: "#f2f4f8" },
  { keywords: ["notion"], icon: "https://cdn.simpleicons.org/notion/000000", bg: "#f4f4f6" },
  { keywords: ["figma"], icon: "https://cdn.simpleicons.org/figma/F24E1E", bg: "#fff2ef" },
  { keywords: ["canva"], icon: "https://cdn.jsdelivr.net/npm/simple-icons/icons/canva.svg", bg: "#ecffff" },
  { keywords: ["dropbox"], icon: "https://cdn.simpleicons.org/dropbox/0061FF", bg: "#edf3ff" },
  { keywords: ["aws"], icon: "https://cdn.simpleicons.org/amazonaws/FF9900", bg: "#fff8eb" },
  { keywords: ["cloudflare"], icon: "https://cdn.simpleicons.org/cloudflare/F38020", bg: "#fff3eb" },
  { keywords: ["bilibili"], icon: "https://cdn.simpleicons.org/bilibili/00A1D6", bg: "#ebf9ff" },
];

const CATEGORY_ICON_HINTS = [
  { keys: ["娱乐", "video", "music", "stream"], icon: "https://cdn.simpleicons.org/plex/EBAF00", bg: "#fff9ea" },
  { keys: ["效率", "办公", "工具", "productivity"], icon: "https://cdn.simpleicons.org/ticktick/4772FA", bg: "#edf3ff" },
  { keys: ["云", "server", "cloud", "hosting"], icon: "https://cdn.simpleicons.org/vercel/000000", bg: "#f4f4f6" },
  { keys: ["学习", "教育", "course", "edu"], icon: "https://cdn.simpleicons.org/coursera/0056D2", bg: "#edf3ff" },
];

const state = {
  subscriptions: [],
  keyword: "",
  authToken: localStorage.getItem(AUTH_TOKEN_KEY) || "",
  currentUser: null,
  futureReportMonths: 6,
  pastReportMonths: 6,
  baseCurrency: localStorage.getItem(PREF_KEY) || "CNY",
  usdRates: { ...FALLBACK_USD_RATES },
  ratesUpdatedAt: "",
  ratesSource: "fallback",
  ratesStale: true,
  ratesMissingCodes: [],
  settings: {
    rateIntervalMinutes: 10,
    showApprox: true,
    defaultMonths: 6,
    customCategories: [],
    customTags: [],
    customCurrencies: [],
  },
  rateTimerId: null,
  rateRefreshStatus: "",
  rateRefreshAt: "",
  autoSettleRunning: false,
  formTags: [],
  adminUsers: [],
  currencyCatalog: [],
  iconResolveTimerId: null,
  iconResolveSeq: 0,
  autoResolvedIconUrl: "",
};

const els = {
  authPage: document.getElementById("authPage"),
  appShell: document.getElementById("appShell"),
  showLoginBtn: document.getElementById("showLoginBtn"),
  showRegisterBtn: document.getElementById("showRegisterBtn"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  registerUsername: document.getElementById("registerUsername"),
  registerPassword: document.getElementById("registerPassword"),
  authMessage: document.getElementById("authMessage"),
  currentUser: document.getElementById("currentUser"),
  logoutBtn: document.getElementById("logoutBtn"),
  form: document.getElementById("subscriptionForm"),
  formTitle: document.getElementById("formTitle"),
  subId: document.getElementById("subId"),
  name: document.getElementById("name"),
  categorySelect: document.getElementById("categorySelect"),
  categoryCustom: document.getElementById("categoryCustom"),
  price: document.getElementById("price"),
  currency: document.getElementById("currency"),
  tagSelect: document.getElementById("tagSelect"),
  addTagToFormBtn: document.getElementById("addTagToFormBtn"),
  tagInput: document.getElementById("tagInput"),
  addNewTagBtn: document.getElementById("addNewTagBtn"),
  tagPreview: document.getElementById("tagPreview"),
  tags: document.getElementById("tags"),
  iconUrl: document.getElementById("iconUrl"),
  recheckIconBtn: document.getElementById("recheckIconBtn"),
  iconUpload: document.getElementById("iconUpload"),
  iconUploadFileName: document.getElementById("iconUploadFileName"),
  uploadIconBtn: document.getElementById("uploadIconBtn"),
  iconUploadMessage: document.getElementById("iconUploadMessage"),
  iconResolvePreview: document.getElementById("iconResolvePreview"),
  cycle: document.getElementById("cycle"),
  nextPaymentDate: document.getElementById("nextPaymentDate"),
  status: document.getElementById("status"),
  note: document.getElementById("note"),
  resetBtn: document.getElementById("resetBtn"),
  formDrawer: document.getElementById("formDrawer"),
  openFormBtn: document.getElementById("openFormBtn"),
  closeFormBtn: document.getElementById("closeFormBtn"),
  baseCurrency: document.getElementById("baseCurrency"),
  searchInput: document.getElementById("searchInput"),
  tableBody: document.getElementById("subscriptionTableBody"),
  summaryCards: document.getElementById("summaryCards"),
  categoryChart: document.getElementById("categoryChart"),
  monthlyChart: document.getElementById("monthlyChart"),
  monthlyChartTitle: document.getElementById("monthlyChartTitle"),
  pastMonthlyChart: document.getElementById("pastMonthlyChart"),
  pastMonthlyChartTitle: document.getElementById("pastMonthlyChartTitle"),
  futureMonthsRangeSelect: document.getElementById("futureMonthsRangeSelect"),
  pastMonthsRangeSelect: document.getElementById("pastMonthsRangeSelect"),
  refreshRatesBtn: document.getElementById("refreshRatesBtn"),
  shareListBtn: document.getElementById("shareListBtn"),
  rateInfo: document.getElementById("rateInfo"),
  navLinks: Array.from(document.querySelectorAll(".side-nav [data-page-target]")),
  dashboardPage: document.getElementById("dashboardPage"),
  settingsPage: document.getElementById("settingsPage"),
  overviewFeature: document.getElementById("overviewFeature"),
  listFeature: document.getElementById("listFeature"),
  reportsFeature: document.getElementById("reportsFeature"),
  categoriesFeature: document.getElementById("categoriesFeature"),
  tagsFeature: document.getElementById("tagsFeature"),
  usersFeature: document.getElementById("usersFeature"),
  newCategoryInput: document.getElementById("newCategoryInput"),
  addCategoryBtn: document.getElementById("addCategoryBtn"),
  categoryManageList: document.getElementById("categoryManageList"),
  newTagInput: document.getElementById("newTagInput"),
  addTagBtn: document.getElementById("addTagBtn"),
  tagManageList: document.getElementById("tagManageList"),
  customCurrencyCatalog: document.getElementById("customCurrencyCatalog"),
  addCustomCurrencyBtn: document.getElementById("addCustomCurrencyBtn"),
  customCurrencyList: document.getElementById("customCurrencyList"),
  settingsForm: document.getElementById("settingsForm"),
  settingsBaseCurrency: document.getElementById("settingsBaseCurrency"),
  settingsRateInterval: document.getElementById("settingsRateInterval"),
  settingsDefaultMonths: document.getElementById("settingsDefaultMonths"),
  settingsShowApprox: document.getElementById("settingsShowApprox"),
  resetDataBtn: document.getElementById("resetDataBtn"),
  adminUsersNavBtn: document.getElementById("adminUsersNavBtn"),
  refreshAdminUsersBtn: document.getElementById("refreshAdminUsersBtn"),
  adminUsersList: document.getElementById("adminUsersList"),
  passwordForm: document.getElementById("passwordForm"),
  currentPassword: document.getElementById("currentPassword"),
  newPassword: document.getElementById("newPassword"),
  confirmPassword: document.getElementById("confirmPassword"),
  passwordMessage: document.getElementById("passwordMessage"),
  rowHoverCard: document.getElementById("rowHoverCard"),
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function setAuthMessage(text) {
  els.authMessage.textContent = text || "";
}

function showAuthMode(mode) {
  const login = mode !== "register";
  els.loginForm.classList.toggle("hidden", !login);
  if (els.registerForm) {
    els.registerForm.classList.toggle("hidden", login);
  }
  els.showLoginBtn.classList.toggle("primary", login);
  if (els.showRegisterBtn) {
    els.showRegisterBtn.classList.toggle("primary", !login);
  }
  setAuthMessage("");
}

function showAuthPage() {
  els.appShell.classList.add("hidden");
  els.authPage.classList.remove("hidden");
}

function showAppShell() {
  els.authPage.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  els.currentUser.textContent = state.currentUser ? `当前用户: ${state.currentUser.username}` : "未登录";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysDiff(from, to) {
  const ms = startOfDay(to) - startOfDay(from);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function currencyMeta(code) {
  return getCurrencyList().find((c) => c.code === code) || CURRENCIES[0];
}

function formatMoney(value, code = "CNY") {
  const meta = currencyMeta(code);
  const amount = Number(value).toFixed(2);
  if (!meta.symbol || meta.symbol.toUpperCase() === String(code || "").toUpperCase()) return `${amount} ${code}`;
  return `${meta.symbol}${amount}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("zh-CN");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeIconUrl(value) {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^\/(?:assets|favicon)[A-Za-z0-9._~!$&'()*+,;=:@%\/-]*$/i.test(raw)) return raw;
  return "";
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    const seen = new Set();
    return value
      .map((v) => String(v || "").trim())
      .filter((v) => {
        if (!v) return false;
        const key = v.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }
  const seen = new Set();
  return String(value || "")
    .split(/[,\uFF0C]/)
    .map((v) => v.trim())
    .filter((v) => {
      if (!v) return false;
      const key = v.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function tagsToInputValue(tags) {
  return normalizeTags(tags).join(", ");
}

function getKnownTags() {
  const usedTags = state.subscriptions.flatMap((s) => normalizeTags(s.tags));
  return Array.from(new Set([...state.settings.customTags, ...usedTags])).sort((a, b) =>
    a.localeCompare(b, "zh-CN"),
  );
}

function renderTagSelectOptions() {
  const current = els.tagSelect.value;
  const options = getKnownTags();
  els.tagSelect.innerHTML = [
    `<option value="">选择已有标签</option>`,
    ...options.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`),
  ].join("");
  if (options.includes(current)) els.tagSelect.value = current;
}

function setFormTags(tags) {
  state.formTags = normalizeTags(tags);
  els.tags.value = tagsToInputValue(state.formTags);
  els.tagPreview.innerHTML = state.formTags.length
    ? state.formTags
        .map(
          (tag) =>
            `<span class="manage-chip">${escapeHtml(tag)}<button type="button" class="manage-remove" data-remove-form-tag="${escapeHtml(
              tag,
            )}" title="删除标签">×</button></span>`,
        )
        .join("")
    : `<span class="manage-empty">暂无标签</span>`;
}

function addFormTag(value) {
  const tag = String(value || "").trim();
  if (!tag) return;
  setFormTags([...state.formTags, tag]);
  if (!state.settings.customTags.some((v) => v.toLowerCase() === tag.toLowerCase())) {
    state.settings.customTags = normalizeManageItems([...state.settings.customTags, tag]);
    saveSettings();
    renderManageSections();
    renderTagSelectOptions();
  }
}

function normalizeManageItems(value) {
  if (Array.isArray(value)) {
    const seen = new Set();
    return value
      .map((v) => String(v || "").trim())
      .filter((v) => {
        if (!v) return false;
        const key = v.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 100);
  }
  return normalizeManageItems(String(value || "").split(/[,\uFF0C]/));
}

function iconFromCategory(categoryText) {
  const category = (categoryText || "").toLowerCase();
  for (const item of CATEGORY_ICON_HINTS) {
    if (item.keys.some((k) => category.includes(k.toLowerCase()))) {
      return { icon: item.icon, bg: item.bg };
    }
  }
  return { icon: "", bg: "#edf3ff" };
}

function serviceIconMeta(sub) {
  const customIcon = normalizeIconUrl(sub.iconUrl);
  if (customIcon) {
    return {
      icon: customIcon,
      bg: "#edf3ff",
      letter: (sub.name || "?").trim().slice(0, 1).toUpperCase(),
    };
  }

  const name = (sub.name || "").toLowerCase();
  for (const item of SERVICE_ICON_RULES) {
    if (item.keywords.some((k) => name.includes(k))) {
      return {
        icon: item.icon,
        bg: item.bg,
        letter: (sub.name || "?").trim().slice(0, 1).toUpperCase(),
      };
    }
  }
  const fromCategory = iconFromCategory(sub.category);
  return {
    icon: fromCategory.icon,
    bg: fromCategory.bg,
    letter: (sub.name || "?").trim().slice(0, 1).toUpperCase(),
  };
}

function clearIconResolvePreview() {
  state.autoResolvedIconUrl = "";
  if (!els.iconResolvePreview) return;
  els.iconResolvePreview.classList.add("hidden");
  els.iconResolvePreview.innerHTML = "";
}

function setIconUploadMessage(text, type = "") {
  if (!els.iconUploadMessage) return;
  els.iconUploadMessage.textContent = text || "";
  els.iconUploadMessage.classList.remove("error", "success");
  if (type) els.iconUploadMessage.classList.add(type);
}

function renderIconResolvePreview({ iconUrl = "", source = "none", text = "", name = "" }) {
  if (!els.iconResolvePreview) return;
  if (!iconUrl && source !== "loading") {
    clearIconResolvePreview();
    return;
  }
  const letter = (name || els.name.value || "?").trim().slice(0, 1).toUpperCase() || "?";
  const title =
    source === "manual"
      ? "使用手动图标"
      : source === "loading"
        ? "正在自动识别图标..."
        : source === "auto"
          ? "自动识别到图标"
          : "图标预览";
  const desc =
    text ||
    (source === "manual"
      ? "保存时将优先使用此 URL"
      : source === "loading"
        ? "请稍候，识别完成后会自动展示"
        : "保存时会使用该自动识别结果");
  const iconHtml = iconUrl
    ? `<img src="${escapeHtml(iconUrl)}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline';">`
    : "";
  els.iconResolvePreview.classList.remove("hidden");
  els.iconResolvePreview.innerHTML = `
    <span class="icon-resolve-badge${iconUrl ? " has-image" : ""}">
      ${iconHtml}
      <span class="icon-resolve-fallback"${iconUrl ? ' style="display:none"' : ""}>${escapeHtml(letter)}</span>
    </span>
    <span class="icon-resolve-meta">
      <span class="icon-resolve-title">${escapeHtml(title)}</span>
      <span class="icon-resolve-desc">${escapeHtml(desc)}</span>
    </span>
  `;
}

function scheduleAutoIconResolve() {
  const manual = normalizeIconUrl(els.iconUrl.value);
  if (manual) {
    state.autoResolvedIconUrl = "";
    renderIconResolvePreview({ iconUrl: manual, source: "manual", name: els.name.value });
    return;
  }
  const name = els.name.value.trim();
  const category = getCategoryValue();
  if (!name) {
    clearIconResolvePreview();
    return;
  }
  if (state.iconResolveTimerId) clearTimeout(state.iconResolveTimerId);
  const seq = ++state.iconResolveSeq;
  renderIconResolvePreview({ source: "loading", name });
  state.iconResolveTimerId = setTimeout(async () => {
    try {
      const resolved = await resolveIconOnline(name, category);
      if (seq !== state.iconResolveSeq) return;
      state.autoResolvedIconUrl = resolved || "";
      if (state.autoResolvedIconUrl) {
        renderIconResolvePreview({ iconUrl: state.autoResolvedIconUrl, source: "auto", name });
      } else {
        clearIconResolvePreview();
      }
    } catch (_err) {
      if (seq !== state.iconResolveSeq) return;
      clearIconResolvePreview();
    }
  }, 480);
}

function rateFor(code) {
  if (state.usdRates[code] !== undefined) return Number(state.usdRates[code]);
  const custom = (state.settings.customCurrencies || []).find((item) => item.code === code);
  if (custom && Number(custom.usdRate) > 0) return Number(custom.usdRate);
  return Number(FALLBACK_USD_RATES[code] || 1);
}

function convertCurrency(value, from, to) {
  const fromRate = rateFor(from);
  const toRate = rateFor(to);
  if (!fromRate || !toRate) return Number(value);
  const usdAmount = Number(value) / fromRate;
  return usdAmount * toRate;
}

function amountInBase(value, fromCode) {
  return convertCurrency(value, fromCode || "CNY", state.baseCurrency);
}

function addCycle(dateStr, cycle) {
  const d = new Date(dateStr);
  if (cycle === "weekly") d.setDate(d.getDate() + 7);
  if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
  if (cycle === "quarterly") d.setMonth(d.getMonth() + 3);
  if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function nextFutureCycleDate(dateStr, cycle, fromDate = new Date()) {
  let next = dateStr;
  let guard = 0;
  while (daysDiff(fromDate, next) < 0 && guard < 240) {
    next = addCycle(next, cycle);
    guard += 1;
  }
  return next;
}

function shiftCycle(dateStr, cycle, step) {
  const d = new Date(dateStr);
  if (cycle === "weekly") d.setDate(d.getDate() + 7 * step);
  if (cycle === "monthly") d.setMonth(d.getMonth() + step);
  if (cycle === "quarterly") d.setMonth(d.getMonth() + 3 * step);
  if (cycle === "yearly") d.setFullYear(d.getFullYear() + step);
  return d.toISOString().slice(0, 10);
}

function toMonthKey(dateObj) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthBuckets(startDate, monthsCount) {
  const buckets = {};
  for (let i = 0; i < monthsCount; i += 1) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    buckets[toMonthKey(d)] = 0;
  }
  return buckets;
}

function accumulateRecurringIntoBuckets(sub, buckets, rangeStart, rangeEnd) {
  if (sub.status !== "active") return;
  let point = new Date(sub.nextPaymentDate);
  if (Number.isNaN(point.getTime())) return;
  let guard = 0;

  while (point > rangeEnd && guard < 1000) {
    point = new Date(shiftCycle(point.toISOString().slice(0, 10), sub.cycle, -1));
    guard += 1;
  }
  while (point < rangeStart && guard < 1000) {
    point = new Date(shiftCycle(point.toISOString().slice(0, 10), sub.cycle, 1));
    guard += 1;
  }

  while (point <= rangeEnd && guard < 3000) {
    if (point >= rangeStart) {
      const key = toMonthKey(point);
      if (buckets[key] !== undefined) {
        buckets[key] += amountInBase(Number(sub.price), sub.currency || "CNY");
      }
    }
    point = new Date(shiftCycle(point.toISOString().slice(0, 10), sub.cycle, 1));
    guard += 1;
  }
}

function toMonthlyCost(sub) {
  const factor = CYCLE_TO_MONTHLY_FACTOR[sub.cycle] || 1;
  const baseValue = amountInBase(Number(sub.price), sub.currency || "CNY");
  return baseValue * factor;
}

function getCurrencyList() {
  const map = new Map(CURRENCIES.map((item) => [item.code, { ...item }]));
  for (const item of state.settings.customCurrencies || []) {
    if (!item || !item.code) continue;
    if (map.has(item.code)) continue;
    const baseName = String(item.label || getCurrencyNameZh(item.code, item.code))
      .replace(/\s*\([A-Z0-9]{3,10}\)\s*$/i, "")
      .trim();
    map.set(item.code, {
      code: item.code,
      label: `${baseName || item.code} (${item.code})`,
      symbol: item.symbol || inferCurrencySymbol(item.code),
    });
  }
  for (const sub of state.subscriptions || []) {
    const code = String(sub.currency || "").trim().toUpperCase();
    if (!code || map.has(code)) continue;
    map.set(code, { code, label: `${code} (历史)`, symbol: "" });
  }
  const base = CURRENCIES.map((c) => map.get(c.code)).filter(Boolean);
  const extras = Array.from(map.values())
    .filter((c) => !CURRENCIES.some((b) => b.code === c.code))
    .sort((a, b) => a.code.localeCompare(b.code));
  return [...base, ...extras];
}

function renderCurrencyOptions() {
  const currencyList = getCurrencyList();
  const options = currencyList
    .map((c) => {
      const symbol = String(c.symbol || "").trim();
      const suffix = symbol && symbol.toUpperCase() !== c.code ? ` · ${symbol}` : "";
      return `<option value="${c.code}">${c.label}${suffix}</option>`;
    })
    .join("");
  els.currency.innerHTML = options;
  els.baseCurrency.innerHTML = options;
  els.settingsBaseCurrency.innerHTML = options;
  if (!currencyList.some((c) => c.code === state.baseCurrency)) {
    state.baseCurrency = "CNY";
  }
  els.baseCurrency.value = state.baseCurrency;
  els.settingsBaseCurrency.value = state.baseCurrency;
}

function normalizeCustomCurrencies(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set(CURRENCIES.map((c) => c.code.toLowerCase()));
  const output = [];
  for (const item of value) {
    const code = String(item?.code || "").trim().toUpperCase();
    const symbol = String(item?.symbol || "").trim();
    const label = String(item?.label || "").trim();
    const usdRate = Number(item?.usdRate);
    if (!/^[A-Z0-9]{3,10}$/.test(code)) continue;
    if (!Number.isFinite(usdRate) || usdRate <= 0) continue;
    const key = code.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const normalizedSymbol = symbol || inferCurrencySymbol(code);
    output.push({
      code,
      symbol: String(normalizedSymbol || "").slice(0, 8),
      label: label || `${code} (自定义)`,
      usdRate: Number(usdRate.toFixed(6)),
    });
  }
  return output.slice(0, 30);
}

function inferCurrencySymbol(code) {
  const normalizedCode = String(code || "").toUpperCase();
  const base = CURRENCIES.find((c) => c.code === normalizedCode);
  if (base && base.symbol) return base.symbol;
  const override = CURRENCY_SYMBOL_OVERRIDES[normalizedCode];
  if (override) return override;
  try {
    const locales = ["zh-CN", "en", "th-TH", "fr-CH", "de-CH", "ja-JP", "ar"];
    for (const locale of locales) {
      const parts = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: normalizedCode,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).formatToParts(1);
      const symbolPart = parts.find((p) => p.type === "currency")?.value || "";
      const symbol = String(symbolPart).trim();
      if (symbol && symbol.toUpperCase() !== normalizedCode) return symbol;
    }
  } catch (_err) {
    // ignore
  }
  return normalizedCode;
}

function getCurrencyNameZh(code, fallback = "") {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return fallback || "";
  try {
    const display = new Intl.DisplayNames(["zh-CN"], { type: "currency" });
    const name = display.of(c);
    if (name && name !== c) return name;
  } catch (_err) {
    // ignore
  }
  return fallback || c;
}

function renderCurrencyCatalogOptions() {
  if (!els.customCurrencyCatalog) return;
  const exists = new Set(getCurrencyList().map((item) => item.code));
  const options = (state.currencyCatalog || [])
    .filter((item) => item && item.code && !exists.has(item.code))
    .map((item) => {
      const symbol = inferCurrencySymbol(item.code);
      const symbolText = symbol && symbol !== item.code ? ` · ${symbol}` : "";
      const label = `${item.code} - ${getCurrencyNameZh(item.code, item.name || item.code)}${symbolText}`;
      return `<option value="${escapeHtml(item.code)}">${escapeHtml(label)}</option>`;
    });
  els.customCurrencyCatalog.innerHTML = [`<option value="">选择币种...</option>`, ...options].join("");
}

function renderCustomCurrencyList() {
  if (!els.customCurrencyList) return;
  const list = state.settings.customCurrencies || [];
  if (!list.length) {
    els.customCurrencyList.innerHTML = `<div class="manage-empty" style="padding:10px 12px;">暂无自定义币种</div>`;
    return;
  }
  els.customCurrencyList.innerHTML = `
    <div class="admin-users-head">
      <span>代码</span>
      <span>符号</span>
      <span>说明</span>
      <span>USD 汇率</span>
      <span>操作</span>
    </div>
    ${list
      .map(
        (item) => `
      <div class="admin-user-row">
        <div class="admin-user-main"><strong>${escapeHtml(item.code)}</strong></div>
        <div class="admin-col">${escapeHtml(item.symbol || inferCurrencySymbol(item.code) || "-")}</div>
        <div class="admin-user-meta">${escapeHtml(getCurrencyNameZh(item.code, item.label || "-"))}</div>
        <div class="admin-user-meta">1 USD = ${escapeHtml(String(item.usdRate))}</div>
        <div class="admin-user-actions">
          <button type="button" class="admin-action disable" data-action="remove-custom-currency" data-code="${escapeHtml(item.code)}">删除</button>
        </div>
      </div>
    `,
      )
      .join("")}
  `;
}

async function fetchCurrencyCatalog() {
  try {
    const payload = await request(CURRENCY_CATALOG_API);
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length) {
      state.currencyCatalog = items
        .map((item) => ({
          code: String(item?.code || "").trim().toUpperCase(),
          name: String(item?.name || "").trim(),
        }))
        .filter((item) => /^[A-Z0-9]{3,10}$/.test(item.code));
      return;
    }
    const codes = Array.isArray(payload?.codes) ? payload.codes : [];
    state.currencyCatalog = codes
      .map((code) => String(code || "").trim().toUpperCase())
      .filter((code) => /^[A-Z0-9]{3,10}$/.test(code))
      .map((code) => ({ code, name: "" }));
  } catch (_err) {
    state.currencyCatalog = [];
  }
}

async function fetchCurrencyRate(code) {
  const payload = await request(`${CURRENCY_RATE_API}?code=${encodeURIComponent(code)}`);
  const rate = Number(payload?.usdRate);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("汇率无效");
  return rate;
}

async function refreshCustomCurrencyRates() {
  const list = state.settings.customCurrencies || [];
  if (!list.length) return;
  let changed = false;
  for (const item of list) {
    try {
      const latest = await fetchCurrencyRate(item.code);
      if (Number(item.usdRate) !== Number(latest)) {
        item.usdRate = Number(latest.toFixed(6));
        changed = true;
      }
    } catch (_err) {
      // ignore, keep current value
    }
  }
  if (changed) saveSettings();
}

function addCustomCurrency() {
  const code = String(els.customCurrencyCatalog?.value || "").trim().toUpperCase();
  const selectedMeta = (state.currencyCatalog || []).find((item) => item.code === code);
  if (!code) {
    alert("请先选择币种");
    return;
  }
  if (!/^[A-Z0-9]{3,10}$/.test(code)) {
    alert("币种代码格式不正确（3-10位大写字母或数字）");
    return;
  }
  if (CURRENCIES.some((c) => c.code === code)) {
    alert("该币种已是系统基础币种");
    return;
  }
  fetchCurrencyRate(code)
    .then((usdRate) => {
      const symbol = inferCurrencySymbol(code);
      const label = getCurrencyNameZh(code, selectedMeta?.name || `${code} Currency`);
      const next = normalizeCustomCurrencies([
        ...(state.settings.customCurrencies || []),
        { code, symbol, usdRate, label },
      ]);
      state.settings.customCurrencies = next;
      if (els.customCurrencyCatalog) els.customCurrencyCatalog.value = "";
      saveSettings();
      renderCurrencyOptions();
      renderCurrencyCatalogOptions();
      renderCustomCurrencyList();
      render();
    })
    .catch((err) => {
      alert(`无法获取 ${code} 的汇率: ${err.message}`);
    });
}

function removeCustomCurrency(code) {
  const target = String(code || "").trim().toUpperCase();
  if (!target) return;
  state.settings.customCurrencies = (state.settings.customCurrencies || []).filter((item) => item.code !== target);
  saveSettings();
  renderCurrencyOptions();
  renderCurrencyCatalogOptions();
  renderCustomCurrencyList();
  render();
}

function renderCategoryOptions() {
  const uniqueCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...state.settings.customCategories,
      ...state.subscriptions
        .map((s) => (s.category || "").trim())
        .filter((v) => v.length > 0),
    ]),
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const currentCategory = getCategoryValue();
  els.categorySelect.innerHTML = [
    `<option value="">请选择分类</option>`,
    ...uniqueCategories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`),
    `<option value="${CUSTOM_CATEGORY_VALUE}">+ 新增分类</option>`,
  ].join("");
  setCategoryValue(currentCategory);
}

function renderManageSections() {
  const usedCategories = state.subscriptions
    .map((s) => (s.category || "").trim())
    .filter(Boolean);
  const categoryItems = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...state.settings.customCategories, ...usedCategories]),
  ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const customCategorySet = new Set(state.settings.customCategories.map((v) => v.toLowerCase()));
  els.categoryManageList.innerHTML = categoryItems.length
    ? categoryItems
        .map((item) => {
          const isCustom = customCategorySet.has(item.toLowerCase());
          const removeBtn = isCustom
            ? `<button type="button" class="manage-remove" data-type="category" data-value="${escapeHtml(item)}" title="删除分类">×</button>`
            : "";
          return `<span class="manage-chip">${escapeHtml(item)}${removeBtn}</span>`;
        })
        .join("")
    : `<span class="manage-empty">暂无分类</span>`;

  const tagItems = getKnownTags();
  const customTagSet = new Set(state.settings.customTags.map((v) => v.toLowerCase()));
  els.tagManageList.innerHTML = tagItems.length
    ? tagItems
        .map((item) => {
          const isCustom = customTagSet.has(item.toLowerCase());
          const removeBtn = isCustom
            ? `<button type="button" class="manage-remove" data-type="tag" data-value="${escapeHtml(item)}" title="删除标签">×</button>`
            : "";
          return `<span class="manage-chip">${escapeHtml(item)}${removeBtn}</span>`;
        })
        .join("")
    : `<span class="manage-empty">暂无标签</span>`;
}

function addManagedCategory() {
  const value = els.newCategoryInput.value.trim();
  if (!value) return;
  const merged = normalizeManageItems([...state.settings.customCategories, value]);
  state.settings.customCategories = merged;
  els.newCategoryInput.value = "";
  saveSettings();
  renderCategoryOptions();
  renderManageSections();
}

function addManagedTag() {
  const value = els.newTagInput.value.trim();
  if (!value) return;
  const merged = normalizeManageItems([...state.settings.customTags, value]);
  state.settings.customTags = merged;
  els.newTagInput.value = "";
  saveSettings();
  renderManageSections();
  renderTagSelectOptions();
}

function removeManagedItem(type, value) {
  const target = String(value || "").trim().toLowerCase();
  if (!target) return;
  if (type === "category") {
    state.settings.customCategories = state.settings.customCategories.filter((v) => v.toLowerCase() !== target);
    saveSettings();
    renderCategoryOptions();
    renderManageSections();
    return;
  }
  if (type === "tag") {
    state.settings.customTags = state.settings.customTags.filter((v) => v.toLowerCase() !== target);
    saveSettings();
    renderManageSections();
    renderTagSelectOptions();
  }
}

function toggleCategoryCustom() {
  const useCustom = els.categorySelect.value === CUSTOM_CATEGORY_VALUE;
  els.categoryCustom.classList.toggle("hidden", !useCustom);
  els.categoryCustom.required = useCustom;
}

function setCategoryValue(category) {
  const target = (category || "").trim();
  if (!target) {
    els.categorySelect.value = "";
    els.categoryCustom.value = "";
    toggleCategoryCustom();
    return;
  }
  const hasOption = Array.from(els.categorySelect.options).some((opt) => opt.value === target);
  if (hasOption) {
    els.categorySelect.value = target;
    els.categoryCustom.value = "";
  } else {
    els.categorySelect.value = CUSTOM_CATEGORY_VALUE;
    els.categoryCustom.value = target;
  }
  toggleCategoryCustom();
}

function getCategoryValue() {
  if (els.categorySelect.value === CUSTOM_CATEGORY_VALUE) {
    return els.categoryCustom.value.trim();
  }
  return els.categorySelect.value.trim();
}

function renderRatesInfo() {
  const updated = state.ratesUpdatedAt ? formatDate(state.ratesUpdatedAt) : "未知";
  let refreshResultHtml = "";
  if (state.rateRefreshStatus) {
    const ts = state.rateRefreshAt ? ` ${state.rateRefreshAt}` : "";
    if (state.rateRefreshStatus === "success") {
      refreshResultHtml = ` · <span class="rate-success">刷新结果: 成功${ts}</span>`;
    } else {
      refreshResultHtml = ` · <span class="rate-fail">刷新结果: 失败，已回退${ts}</span>`;
    }
  }
  els.rateInfo.innerHTML = `更新时间: ${updated}${refreshResultHtml}`;
}

async function request(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.authToken && url.startsWith("/api/") && !url.startsWith("/api/auth/")) {
    headers.Authorization = `Bearer ${state.authToken}`;
  }
  const res = await fetch(url, {
    headers,
    ...options,
  });
  if (res.status === 401) {
    if (!url.startsWith("/api/auth/")) {
      state.authToken = "";
      state.currentUser = null;
      localStorage.removeItem(AUTH_TOKEN_KEY);
      showAuthPage();
      throw new Error("登录已过期，请重新登录");
    }
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `请求失败: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function fetchSubscriptions() {
  state.subscriptions = await request(API_BASE);
}

async function authRegister(username, password) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

async function authLogin(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

async function authMe() {
  return request("/api/auth/me", {
    headers: state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {},
  });
}

async function authLogout() {
  return request("/api/auth/logout", {
    method: "POST",
    headers: state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {},
  });
}

async function authChangePassword(oldPassword, newPassword) {
  return request("/api/auth/change-password", {
    method: "POST",
    headers: state.authToken ? { Authorization: `Bearer ${state.authToken}` } : {},
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

function applyAuthPayload(payload) {
  state.authToken = payload.token;
  state.currentUser = payload.user;
  localStorage.setItem(AUTH_TOKEN_KEY, payload.token);
}

async function fetchRates() {
  const payload = await request(RATES_API);
  if (!payload || !payload.rates) return;
  state.usdRates = { ...FALLBACK_USD_RATES, ...payload.rates };
  state.ratesUpdatedAt = payload.updatedAt || "";
  state.ratesSource = payload.source || "unknown";
  state.ratesStale = Boolean(payload.stale);
  state.ratesMissingCodes = Array.isArray(payload.missingCodes) ? payload.missingCodes : [];
}

async function refreshRates() {
  const oldText = els.refreshRatesBtn.textContent;
  els.refreshRatesBtn.disabled = true;
  els.refreshRatesBtn.textContent = "刷新中...";
  try {
    await fetchRates();
    await refreshCustomCurrencyRates();
    state.rateRefreshStatus = "success";
  } catch (err) {
    console.error("汇率刷新失败", err);
    state.rateRefreshStatus = "error";
  }
  state.rateRefreshAt = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  render();
  els.refreshRatesBtn.disabled = false;
  els.refreshRatesBtn.textContent = oldText || "刷新汇率";
}

async function createSubscription(sub) {
  await request(API_BASE, {
    method: "POST",
    body: JSON.stringify(sub),
  });
}

async function updateSubscription(id, sub) {
  await request(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(sub),
  });
}

async function removeSubscription(id) {
  await request(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

async function resetSubscriptionsToDemo() {
  await request("/api/subscriptions/reset", {
    method: "POST",
  });
}

async function createShareLink() {
  return request(SHARE_API, {
    method: "POST",
  });
}

async function fetchAdminUsers() {
  state.adminUsers = await request(ADMIN_USERS_API);
}

async function setAdminUserStatus(userId, disabled) {
  return request(ADMIN_USER_STATUS_API, {
    method: "POST",
    body: JSON.stringify({ userId, disabled }),
  });
}

async function resolveIconOnline(name, category) {
  const payload = await request(ICON_RESOLVE_API, {
    method: "POST",
    body: JSON.stringify({ name, category }),
  });
  return normalizeIconUrl(payload?.iconUrl || "");
}

async function uploadIconFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
  const payload = await request(ICON_UPLOAD_API, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name || "icon",
      mimeType: file.type || "",
      dataUrl,
    }),
  });
  return normalizeIconUrl(payload?.iconUrl || "");
}

async function markPaid(id) {
  const sub = state.subscriptions.find((s) => s.id === id);
  if (!sub) return;
  const updated = {
    ...sub,
    nextPaymentDate: addCycle(sub.nextPaymentDate, sub.cycle),
  };
  await updateSubscription(id, updated);
  await refreshAndRender();
}

async function autoSettleOverdueSubscriptions() {
  if (state.autoSettleRunning) return false;
  const today = new Date();
  const updates = state.subscriptions
    .filter((sub) => sub.status === "active" && daysDiff(today, sub.nextPaymentDate) < 0)
    .map((sub) => ({
      sub,
      nextPaymentDate: nextFutureCycleDate(sub.nextPaymentDate, sub.cycle, today),
    }))
    .filter(({ sub, nextPaymentDate }) => nextPaymentDate !== sub.nextPaymentDate);

  if (!updates.length) return false;

  state.autoSettleRunning = true;
  try {
    for (const item of updates) {
      await updateSubscription(item.sub.id, {
        ...item.sub,
        nextPaymentDate: item.nextPaymentDate,
      });
    }
  } finally {
    state.autoSettleRunning = false;
  }
  return true;
}

function resetForm() {
  els.form.reset();
  els.subId.value = "";
  els.formTitle.textContent = "新增订阅";
  els.nextPaymentDate.value = todayISO();
  els.status.value = "active";
  els.currency.value = "CNY";
  els.tagInput.value = "";
  els.tagSelect.value = "";
  setFormTags([]);
  els.iconUrl.value = "";
  state.iconResolveSeq += 1;
  if (state.iconResolveTimerId) clearTimeout(state.iconResolveTimerId);
  clearIconResolvePreview();
  if (els.iconUpload) els.iconUpload.value = "";
  if (els.iconUploadFileName) els.iconUploadFileName.textContent = "未选择文件";
  setIconUploadMessage("");
  setCategoryValue("");
}

function openFormDrawer() {
  els.formDrawer.classList.remove("hidden");
}

function closeFormDrawer() {
  els.formDrawer.classList.add("hidden");
}

function editSubscription(id) {
  const sub = state.subscriptions.find((s) => s.id === id);
  if (!sub) return;
  els.subId.value = sub.id;
  els.name.value = sub.name;
  setCategoryValue(sub.category);
  els.price.value = sub.price;
  els.currency.value = sub.currency || "CNY";
  els.tagInput.value = "";
  els.tagSelect.value = "";
  setFormTags(sub.tags);
  els.iconUrl.value = sub.iconUrl || "";
  state.iconResolveSeq += 1;
  if (state.iconResolveTimerId) clearTimeout(state.iconResolveTimerId);
  if (els.iconUrl.value) {
    renderIconResolvePreview({ iconUrl: els.iconUrl.value, source: "manual", name: sub.name });
  } else {
    scheduleAutoIconResolve();
  }
  els.cycle.value = sub.cycle;
  els.nextPaymentDate.value = sub.nextPaymentDate;
  els.status.value = sub.status;
  els.note.value = sub.note || "";
  els.formTitle.textContent = "编辑订阅";
  openFormDrawer();
}

function getFilteredSubscriptions() {
  const keyword = state.keyword.trim().toLowerCase();
  return [...state.subscriptions]
    .filter((s) => {
      if (!keyword) return true;
      return (
        s.name.toLowerCase().includes(keyword) ||
        s.category.toLowerCase().includes(keyword) ||
        normalizeTags(s.tags).some((tag) => tag.toLowerCase().includes(keyword))
      );
    })
    .sort((a, b) => new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate));
}

function renderTable() {
  const data = getFilteredSubscriptions();
  if (!data.length) {
    els.tableBody.innerHTML = `<tr><td colspan="7" class="empty">暂无订阅记录</td></tr>`;
    return;
  }

  const today = new Date();
  els.tableBody.innerHTML = data
    .map((sub) => {
      const diff = daysDiff(today, sub.nextPaymentDate);
      let dateClass = "";
      if (diff < 0 && sub.status === "active") dateClass = "overdue";
      if (diff >= 0 && diff <= 7 && sub.status === "active") dateClass = "soon";

      const original = formatMoney(sub.price, sub.currency || "CNY");
      const inBase = formatMoney(amountInBase(sub.price, sub.currency || "CNY"), state.baseCurrency);
      const iconMeta = serviceIconMeta(sub);
      const iconImg = iconMeta.icon
        ? `<img src="${iconMeta.icon}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('fallback')">`
        : "";
      let dueText = "";
      if (sub.status === "active") {
        if (diff < 0) dueText = `已逾期 ${Math.abs(diff)} 天`;
        else if (diff === 0) dueText = "今天扣费";
        else dueText = `${diff} 天后扣费`;
      }
      return `
        <tr data-sub-id="${sub.id}">
          <td class="name-col" data-label="订阅信息">
            <div class="info-main">
              <div class="service-name" data-hover-trigger="detail">
                <span class="service-icon${iconImg ? " has-image" : " fallback"}" style="background:${iconMeta.bg}">
                  ${iconImg}
                  <span class="service-fallback">${escapeHtml(iconMeta.letter)}</span>
                </span>
                <span class="service-text">${escapeHtml(sub.name)}</span>
              </div>
            </div>
          </td>
          <td class="category-col" data-label="分类"><span class="category-pill">${escapeHtml(sub.category)}</span></td>
          <td class="amount-cell" data-label="金额">
            <div class="amount-main">${original}</div>
            ${
              state.settings.showApprox
                ? `<div class="amount-sub">≈ ${inBase}</div>`
                : ""
            }
          </td>
          <td class="cycle-col" data-label="周期">
            <span class="cycle-pill">${CYCLE_LABELS[sub.cycle] || sub.cycle}</span>
          </td>
          <td class="status-col" data-label="状态">
            <span class="status ${sub.status}">${STATUS_LABELS[sub.status] || sub.status}</span>
          </td>
          <td class="date-col ${dateClass}" data-label="下次扣费">
            <div class="next-pay-main">${formatDate(sub.nextPaymentDate)}</div>
            ${dueText ? `<div class="next-pay-meta ${dateClass}">${dueText}</div>` : ""}
          </td>
          <td class="actions-cell" data-label="操作">
            <div class="inline-actions">
              <button data-action="paid" data-id="${sub.id}" class="icon-btn paid-btn" title="标记为已扣费" aria-label="标记为已扣费">✓</button>
              <button data-action="edit" data-id="${sub.id}" class="icon-btn edit-btn" title="编辑订阅" aria-label="编辑订阅">✎</button>
              <button data-action="delete" data-id="${sub.id}" class="icon-btn danger" title="删除订阅" aria-label="删除订阅">🗑</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function hideRowHoverCard() {
  els.rowHoverCard.classList.add("hidden");
  els.rowHoverCard.setAttribute("aria-hidden", "true");
}

function placeRowHoverCard(clientX, clientY) {
  const card = els.rowHoverCard;
  const margin = 14;
  const offset = 16;
  let left = clientX + offset;
  let top = clientY + offset;
  const width = card.offsetWidth || 320;
  const height = card.offsetHeight || 220;

  if (left + width > window.innerWidth - margin) {
    left = clientX - width - offset;
  }
  if (left < margin) left = margin;
  if (top + height > window.innerHeight - margin) {
    top = window.innerHeight - height - margin;
  }
  if (top < margin) top = margin;

  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function showRowHoverCard(sub, clientX, clientY) {
  if (!sub) return;
  const tags = normalizeTags(sub.tags);
  const original = formatMoney(sub.price, sub.currency || "CNY");
  const inBase = formatMoney(amountInBase(sub.price, sub.currency || "CNY"), state.baseCurrency);
  const note = (sub.note || "").trim();
  const iconMeta = serviceIconMeta(sub);
  const iconImg = iconMeta.icon
    ? `<img src="${iconMeta.icon}" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('fallback')">`
    : "";
  els.rowHoverCard.innerHTML = `
    <div class="hover-card-head">
      <h4>${escapeHtml(sub.name)}</h4>
      <span class="hover-logo${iconImg ? " has-image" : " fallback"}" style="background:${iconMeta.bg}">
        ${iconImg}
        <span class="hover-logo-fallback">${escapeHtml(iconMeta.letter)}</span>
      </span>
    </div>
    <div class="hover-grid">
      <div>分类</div><div>${escapeHtml(sub.category || "-")}</div>
      <div>周期</div><div>${escapeHtml(CYCLE_LABELS[sub.cycle] || sub.cycle || "-")}</div>
      <div>状态</div><div>${escapeHtml(STATUS_LABELS[sub.status] || sub.status || "-")}</div>
      <div>下次扣费</div><div>${escapeHtml(formatDate(sub.nextPaymentDate))}</div>
      <div>金额</div><div>${escapeHtml(original)} <small>≈ ${escapeHtml(inBase)}</small></div>
      <div>标签</div><div>${tags.length ? tags.map((tag) => `<span class="hover-tag">${escapeHtml(tag)}</span>`).join("") : "<span>-</span>"}</div>
      <div>备注</div><div>${note ? escapeHtml(note) : "-"}</div>
    </div>
  `;
  els.rowHoverCard.classList.remove("hidden");
  els.rowHoverCard.setAttribute("aria-hidden", "false");
  placeRowHoverCard(clientX, clientY);
}

function renderSummary() {
  const active = state.subscriptions.filter((s) => s.status === "active");
  const totalCount = state.subscriptions.length;
  const monthly = active.reduce((sum, s) => sum + toMonthlyCost(s), 0);

  const now = new Date();
  const in30days = active
    .filter((s) => daysDiff(now, s.nextPaymentDate) >= 0 && daysDiff(now, s.nextPaymentDate) <= 30)
    .reduce((sum, s) => sum + amountInBase(Number(s.price), s.currency || "CNY"), 0);

  const cards = [
    { label: "总订阅数", value: totalCount },
    { label: "活跃订阅", value: active.length },
    { label: `月均总支出 (${state.baseCurrency})`, value: formatMoney(monthly, state.baseCurrency) },
    { label: `未来30天预计扣费 (${state.baseCurrency})`, value: formatMoney(in30days, state.baseCurrency) },
  ];

  els.summaryCards.innerHTML = cards
    .map((c) => `<div class="card"><div class="label">${c.label}</div><div class="value">${c.value}</div></div>`)
    .join("");
}

function renderBars(container, items, formatter) {
  if (!items.length || items.every((i) => Number(i.value) <= 0)) {
    container.innerHTML = `<div class="empty">暂无实据</div>`;
    return;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  const palette = [
    "linear-gradient(180deg, #2c8dff, #0f7bff)",
    "linear-gradient(180deg, #41a6ff, #1f86ff)",
    "linear-gradient(180deg, #5bb4ff, #2f91ff)",
    "linear-gradient(180deg, #73c2ff, #45a0ff)",
    "linear-gradient(180deg, #92d1ff, #5aaeff)",
    "linear-gradient(180deg, #b1dfff, #73bcff)",
  ];

  const labelFor = (raw) => {
    const text = String(raw || "");
    const m = text.match(/^(\d{4})-(\d{2})$/);
    if (m) return `${Number(m[2])}月`;
    if (text.length > 7) return `${text.slice(0, 6)}…`;
    return text;
  };

  container.innerHTML = `
    <div class="vchart" style="--cols:${items.length}">
      ${items
        .map((item, idx) => {
          const height = Math.max(8, Math.round((item.value / max) * 100));
          const color = palette[idx % palette.length];
          return `
            <div class="vcol" title="${escapeHtml(item.label)}: ${escapeHtml(formatter(item.value))}">
              <div class="vcol-value">${escapeHtml(formatter(item.value))}</div>
              <div class="vcol-track">
                <span class="vcol-bar" style="height:${height}%;background:${color}"></span>
              </div>
              <div class="vcol-label">${escapeHtml(labelFor(item.label))}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderReports() {
  const active = state.subscriptions.filter((s) => s.status === "active");

  const byCategory = {};
  for (const sub of active) {
    byCategory[sub.category] = (byCategory[sub.category] || 0) + toMonthlyCost(sub);
  }
  const categoryItems = Object.entries(byCategory)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  renderBars(els.categoryChart, categoryItems, (v) => formatMoney(v, state.baseCurrency));

  const now = new Date();

  const futureStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const futureBuckets = buildMonthBuckets(futureStart, state.futureReportMonths);
  const futureEnd = new Date(futureStart.getFullYear(), futureStart.getMonth() + state.futureReportMonths, 0, 23, 59, 59, 999);
  for (const sub of active) {
    accumulateRecurringIntoBuckets(sub, futureBuckets, futureStart, futureEnd);
  }
  const futureItems = Object.entries(futureBuckets).map(([label, value]) => ({ label, value }));
  renderBars(els.monthlyChart, futureItems, (v) => formatMoney(v, state.baseCurrency));
  els.monthlyChartTitle.textContent = `未来 ${state.futureReportMonths} 个月预计支出`;

  const pastStart = new Date(now.getFullYear(), now.getMonth() - (state.pastReportMonths - 1), 1);
  const pastBuckets = buildMonthBuckets(pastStart, state.pastReportMonths);
  const pastEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  for (const sub of active) {
    accumulateRecurringIntoBuckets(sub, pastBuckets, pastStart, pastEnd);
  }
  const pastItems = Object.entries(pastBuckets).map(([label, value]) => ({ label, value }));
  renderBars(els.pastMonthlyChart, pastItems, (v) => formatMoney(v, state.baseCurrency));
  els.pastMonthlyChartTitle.textContent = `过去 ${state.pastReportMonths} 个月支出情况`;
}

function render() {
  renderCurrencyOptions();
  renderRatesInfo();
  renderCategoryOptions();
  renderTagSelectOptions();
  renderCurrencyCatalogOptions();
  renderCustomCurrencyList();
  els.futureMonthsRangeSelect.value = String(state.futureReportMonths);
  els.pastMonthsRangeSelect.value = String(state.pastReportMonths);
  els.settingsBaseCurrency.value = state.baseCurrency;
  els.settingsRateInterval.value = String(state.settings.rateIntervalMinutes);
  els.settingsDefaultMonths.value = String(state.settings.defaultMonths);
  els.settingsShowApprox.checked = Boolean(state.settings.showApprox);
  renderSummary();
  renderTable();
  renderReports();
  renderManageSections();
  renderAdminUsersPanel();
}

function renderAdminUsersPanel() {
  const isSuperAdmin = Boolean(state.currentUser && state.currentUser.isSuperAdmin);
  if (els.adminUsersNavBtn) {
    els.adminUsersNavBtn.classList.toggle("hidden", !isSuperAdmin);
  }
  if (els.usersFeature) {
    els.usersFeature.classList.toggle("hidden", !isSuperAdmin);
  }
  if (!isSuperAdmin || !els.adminUsersList) return;
  const list = Array.isArray(state.adminUsers) ? state.adminUsers : [];
  if (!list.length) {
    els.adminUsersList.innerHTML = `<div class="manage-empty">暂无用户数据</div>`;
    return;
  }
  const activeCount = list.filter((u) => !u.isDisabled).length;
  els.adminUsersList.innerHTML = `
    <div class="admin-users-summary">共 ${list.length} 个用户 · 正常 ${activeCount} · 禁用 ${list.length - activeCount}</div>
    <div class="admin-users-head">
      <span>用户</span>
      <span>角色</span>
      <span>状态</span>
      <span>信息</span>
      <span>操作</span>
    </div>
    ${list
      .map((user) => {
        const roleBadge = user.isSuperAdmin ? `<span class="admin-role">超级管理员</span>` : `<span class="admin-role normal">普通用户</span>`;
        const statusBadge = user.isDisabled
          ? `<span class="admin-role disabled">已禁用</span>`
          : `<span class="admin-role active">正常</span>`;
        const actionBtn = user.isSuperAdmin
          ? `<span class="admin-action muted">不可操作</span>`
          : `<button type="button" class="admin-action ${user.isDisabled ? "enable" : "disable"}" data-action="toggle-user-status" data-id="${escapeHtml(
              user.id,
            )}" data-disabled="${user.isDisabled ? "0" : "1"}">${user.isDisabled ? "解禁用户" : "禁用用户"}</button>`;
        return `
          <div class="admin-user-row">
            <div class="admin-user-main">
              <span class="admin-avatar">${escapeHtml((user.username || "U").slice(0, 1).toUpperCase())}</span>
              <strong>${escapeHtml(user.username)}</strong>
            </div>
            <div class="admin-col">${roleBadge}</div>
            <div class="admin-col">${statusBadge}</div>
            <div class="admin-user-meta">订阅数 ${Number(user.subscriptionCount || 0)} · ${escapeHtml(formatDate(user.createdAt))}</div>
            <div class="admin-user-actions">${actionBtn}</div>
          </div>
        `;
      })
      .join("")}
  `;
}

async function refreshAndRender() {
  const tasks = [fetchSubscriptions(), fetchRates().catch(() => null)];
  if (state.currentUser && state.currentUser.isSuperAdmin) {
    tasks.push(fetchAdminUsers().catch(() => {
      state.adminUsers = [];
    }));
  } else {
    state.adminUsers = [];
  }
  await Promise.all(tasks);
  const settled = await autoSettleOverdueSubscriptions();
  if (settled) {
    await fetchSubscriptions();
  }
  render();
}

function showPage(pageId) {
  const isSettings = pageId === "settingsPage";
  els.dashboardPage.classList.toggle("active-page", !isSettings);
  els.settingsPage.classList.toggle("active-page", isSettings);
  els.openFormBtn.style.display = isSettings ? "none" : "block";
}

function setActiveNav(navKey) {
  for (const link of els.navLinks) {
    link.classList.toggle("active", link.dataset.navKey === navKey);
  }
}

function showDashboardFeature(navKey) {
  const allowed = new Set(["overview", "list", "reports", "categories", "tags", "users"]);
  const key = allowed.has(navKey) ? navKey : "overview";
  const isOverview = key === "overview";
  els.overviewFeature.classList.toggle("active-feature", isOverview);
  els.listFeature.classList.toggle("active-feature", isOverview || key === "list");
  els.reportsFeature.classList.toggle("active-feature", isOverview || key === "reports");
  els.categoriesFeature.classList.toggle("active-feature", key === "categories");
  els.tagsFeature.classList.toggle("active-feature", key === "tags");
  if (els.usersFeature) {
    els.usersFeature.classList.toggle("active-feature", key === "users");
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (parsed.rateIntervalMinutes) {
        state.settings.rateIntervalMinutes = Number(parsed.rateIntervalMinutes) || 10;
      }
      if (parsed.defaultMonths) {
        state.settings.defaultMonths = Number(parsed.defaultMonths) === 12 ? 12 : 6;
      }
      if (typeof parsed.showApprox === "boolean") {
        state.settings.showApprox = parsed.showApprox;
      }
      state.settings.customCategories = normalizeManageItems(parsed.customCategories || []);
      state.settings.customTags = normalizeManageItems(parsed.customTags || []);
      state.settings.customCurrencies = normalizeCustomCurrencies(parsed.customCurrencies || []);
      if (parsed.baseCurrency && CURRENCIES.some((c) => c.code === parsed.baseCurrency)) {
        state.baseCurrency = parsed.baseCurrency;
      } else if (parsed.baseCurrency && /^[A-Z0-9]{3,10}$/.test(parsed.baseCurrency)) {
        state.baseCurrency = parsed.baseCurrency;
      }
    }
  } catch (err) {
    console.error("加载设置失败", err);
  }
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      baseCurrency: state.baseCurrency,
      rateIntervalMinutes: state.settings.rateIntervalMinutes,
      showApprox: state.settings.showApprox,
      defaultMonths: state.settings.defaultMonths,
      customCategories: normalizeManageItems(state.settings.customCategories),
      customTags: normalizeManageItems(state.settings.customTags),
      customCurrencies: normalizeCustomCurrencies(state.settings.customCurrencies),
    }),
  );
}

function restartRateTimer() {
  if (state.rateTimerId) clearInterval(state.rateTimerId);
  const ms = Math.max(1, state.settings.rateIntervalMinutes) * 60 * 1000;
  state.rateTimerId = setInterval(() => {
    fetchRates().then(render).catch(() => null);
  }, ms);
}

function bindEvents() {
  els.showLoginBtn.addEventListener("click", () => showAuthMode("login"));
  if (els.showRegisterBtn) {
    els.showRegisterBtn.addEventListener("click", () => showAuthMode("register"));
  }

  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const payload = await authLogin(els.loginUsername.value.trim(), els.loginPassword.value);
      applyAuthPayload(payload);
      els.loginPassword.value = "";
      showAppShell();
      await refreshAndRender();
      restartRateTimer();
    } catch (err) {
      setAuthMessage(`登录失败: ${err.message}`);
    }
  });

  if (els.registerForm) {
    els.registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const payload = await authRegister(els.registerUsername.value.trim(), els.registerPassword.value);
        applyAuthPayload(payload);
        els.registerPassword.value = "";
        showAppShell();
        await refreshAndRender();
        restartRateTimer();
      } catch (err) {
        setAuthMessage(`注册失败: ${err.message}`);
      }
    });
  }

  els.logoutBtn.addEventListener("click", async () => {
    try {
      if (state.authToken) await authLogout();
    } catch (err) {
      console.error(err);
    }
    state.authToken = "";
    state.currentUser = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    if (state.rateTimerId) clearInterval(state.rateTimerId);
    state.rateTimerId = null;
    showAuthMode("login");
    showAuthPage();
  });

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const isEdit = Boolean(els.subId.value);
    const payload = {
      id: els.subId.value || uid(),
      name: els.name.value.trim(),
      category: getCategoryValue(),
      price: Number(els.price.value),
      currency: els.currency.value,
      tags: normalizeTags(state.formTags),
      iconUrl: normalizeIconUrl(els.iconUrl.value),
      cycle: els.cycle.value,
      nextPaymentDate: els.nextPaymentDate.value,
      status: els.status.value,
      note: els.note.value.trim(),
    };

    if (!payload.name || !payload.category || !payload.nextPaymentDate || Number.isNaN(payload.price)) {
      return;
    }

    try {
      if (!payload.iconUrl && state.autoResolvedIconUrl) {
        payload.iconUrl = state.autoResolvedIconUrl;
      }
      if (!payload.iconUrl) {
        try {
          const autoIcon = await resolveIconOnline(payload.name, payload.category);
          if (autoIcon) payload.iconUrl = autoIcon;
        } catch (_err) {
          // ignore auto-resolve failure; keep manual/fallback behavior
        }
      }
      if (isEdit) {
        await updateSubscription(payload.id, payload);
      } else {
        await createSubscription(payload);
      }
      resetForm();
      closeFormDrawer();
      await refreshAndRender();
    } catch (err) {
      alert(`保存失败: ${err.message}`);
    }
  });

  els.openFormBtn.addEventListener("click", () => {
    resetForm();
    openFormDrawer();
  });
  els.closeFormBtn.addEventListener("click", closeFormDrawer);
  els.formDrawer.addEventListener("click", (e) => {
    if (e.target === els.formDrawer) closeFormDrawer();
  });

  els.resetBtn.addEventListener("click", resetForm);
  els.refreshRatesBtn.addEventListener("click", refreshRates);
  els.shareListBtn.addEventListener("click", async () => {
    try {
      const payload = await createShareLink();
      const url = `${window.location.origin}${payload.urlPath}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      alert(`打开分享预览失败: ${err.message}`);
    }
  });
  els.futureMonthsRangeSelect.addEventListener("change", (e) => {
    state.futureReportMonths = Number(e.target.value) === 12 ? 12 : 6;
    renderReports();
  });
  els.pastMonthsRangeSelect.addEventListener("change", (e) => {
    state.pastReportMonths = Number(e.target.value) === 12 ? 12 : 6;
    renderReports();
  });
  els.addCategoryBtn.addEventListener("click", addManagedCategory);
  els.newCategoryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addManagedCategory();
    }
  });
  els.addTagBtn.addEventListener("click", addManagedTag);
  els.newTagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addManagedTag();
    }
  });
  if (els.addCustomCurrencyBtn) {
    els.addCustomCurrencyBtn.addEventListener("click", addCustomCurrency);
  }
  if (els.customCurrencyCatalog) {
    els.customCurrencyCatalog.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      addCustomCurrency();
    });
  }
  if (els.customCurrencyList) {
    els.customCurrencyList.addEventListener("click", (e) => {
      const btn = e.target.closest('button[data-action="remove-custom-currency"]');
      if (!btn) return;
      removeCustomCurrency(btn.dataset.code);
    });
  }
  els.categoryManageList.addEventListener("click", (e) => {
    const btn = e.target.closest("button.manage-remove");
    if (!btn) return;
    removeManagedItem(btn.dataset.type, btn.dataset.value);
  });
  els.tagManageList.addEventListener("click", (e) => {
    const btn = e.target.closest("button.manage-remove");
    if (!btn) return;
    removeManagedItem(btn.dataset.type, btn.dataset.value);
  });

  for (const link of els.navLinks) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.dataset.pageTarget || "dashboardPage";
      const navKey = link.dataset.navKey || "overview";
      showPage(page);
      setActiveNav(navKey);
      if (page === "dashboardPage") showDashboardFeature(navKey);
    });
  }

  els.baseCurrency.addEventListener("change", (e) => {
    state.baseCurrency = e.target.value;
    localStorage.setItem(PREF_KEY, state.baseCurrency);
    saveSettings();
    render();
  });

  els.settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    state.baseCurrency = els.settingsBaseCurrency.value;
    state.settings.rateIntervalMinutes = Number(els.settingsRateInterval.value) || 10;
    state.settings.defaultMonths = Number(els.settingsDefaultMonths.value) === 12 ? 12 : 6;
    state.settings.showApprox = els.settingsShowApprox.checked;
    state.futureReportMonths = state.settings.defaultMonths;
    state.pastReportMonths = state.settings.defaultMonths;
    localStorage.setItem(PREF_KEY, state.baseCurrency);
    saveSettings();
    restartRateTimer();
    render();
    alert("设置已保存");
  });

  els.resetDataBtn.addEventListener("click", async () => {
    const ok = confirm("确认要清空并重置数据吗？当前订阅会被删除并恢复为默认示例数据。");
    if (!ok) return;
    try {
      await resetSubscriptionsToDemo();
      state.settings.customCategories = [];
      state.settings.customTags = [];
      saveSettings();
      resetForm();
      await refreshAndRender();
      showPage("dashboardPage");
      setActiveNav("overview");
      showDashboardFeature("overview");
      window.scrollTo({ top: 0, behavior: "smooth" });
      alert("已重置为默认示例数据");
    } catch (err) {
      alert(`重置失败: ${err.message}`);
    }
  });
  if (els.refreshAdminUsersBtn) {
    els.refreshAdminUsersBtn.addEventListener("click", async () => {
      if (!state.currentUser || !state.currentUser.isSuperAdmin) return;
      try {
        await fetchAdminUsers();
        renderAdminUsersPanel();
      } catch (err) {
        alert(`加载用户失败: ${err.message}`);
      }
    });
  }
  if (els.adminUsersList) {
    els.adminUsersList.addEventListener("click", async (e) => {
      const btn = e.target.closest('button[data-action="toggle-user-status"]');
      if (!btn) return;
      if (!state.currentUser || !state.currentUser.isSuperAdmin) return;
      const userId = btn.dataset.id;
      const disabled = btn.dataset.disabled === "1";
      try {
        await setAdminUserStatus(userId, disabled);
        await fetchAdminUsers();
        renderAdminUsersPanel();
      } catch (err) {
        alert(`更新用户状态失败: ${err.message}`);
      }
    });
  }

  els.passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const oldPassword = els.currentPassword.value;
    const newPassword = els.newPassword.value;
    const confirm = els.confirmPassword.value;
    if (newPassword.length < 6) {
      els.passwordMessage.style.color = "#c0392b";
      els.passwordMessage.textContent = "新密码至少 6 位";
      return;
    }
    if (newPassword !== confirm) {
      els.passwordMessage.style.color = "#c0392b";
      els.passwordMessage.textContent = "两次输入的新密码不一致";
      return;
    }
    try {
      await authChangePassword(oldPassword, newPassword);
      els.passwordMessage.style.color = "#1f7a4f";
      els.passwordMessage.textContent = "密码修改成功";
      els.currentPassword.value = "";
      els.newPassword.value = "";
      els.confirmPassword.value = "";
    } catch (err) {
      els.passwordMessage.style.color = "#c0392b";
      els.passwordMessage.textContent = `密码修改失败: ${err.message}`;
    }
  });

  els.searchInput.addEventListener("input", (e) => {
    state.keyword = e.target.value;
    renderTable();
  });
  els.name.addEventListener("input", scheduleAutoIconResolve);
  els.iconUrl.addEventListener("input", scheduleAutoIconResolve);
  if (els.recheckIconBtn) {
    els.recheckIconBtn.addEventListener("click", () => {
      els.iconUrl.value = "";
      state.autoResolvedIconUrl = "";
      scheduleAutoIconResolve();
    });
  }
  if (els.uploadIconBtn) {
    els.uploadIconBtn.addEventListener("click", async () => {
      const file = els.iconUpload?.files?.[0];
      if (!file) {
        setIconUploadMessage("请先选择图片文件", "error");
        return;
      }
      if (file.size > 1024 * 1024) {
        setIconUploadMessage("文件过大，请控制在 1MB 以内", "error");
        return;
      }
      setIconUploadMessage("上传中...");
      try {
        const iconUrl = await uploadIconFile(file);
        if (!iconUrl) throw new Error("上传后未返回图标地址");
        els.iconUrl.value = iconUrl;
        setIconUploadMessage("上传成功，已应用该图标", "success");
        scheduleAutoIconResolve();
      } catch (err) {
        setIconUploadMessage(`上传失败: ${err.message}`, "error");
      }
    });
  }
  if (els.iconUpload) {
    els.iconUpload.addEventListener("change", () => {
      const file = els.iconUpload?.files?.[0];
      if (els.iconUploadFileName) {
        els.iconUploadFileName.textContent = file ? file.name : "未选择文件";
      }
      setIconUploadMessage("");
    });
  }
  els.categorySelect.addEventListener("change", () => {
    toggleCategoryCustom();
    scheduleAutoIconResolve();
  });
  els.categoryCustom.addEventListener("input", scheduleAutoIconResolve);
  els.addTagToFormBtn.addEventListener("click", () => {
    if (!els.tagSelect.value) return;
    addFormTag(els.tagSelect.value);
    els.tagSelect.value = "";
  });
  els.addNewTagBtn.addEventListener("click", () => {
    addFormTag(els.tagInput.value);
    els.tagInput.value = "";
  });
  els.tagInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addFormTag(els.tagInput.value);
    els.tagInput.value = "";
  });
  els.tagPreview.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-remove-form-tag]");
    if (!btn) return;
    const value = btn.dataset.removeFormTag;
    state.formTags = state.formTags.filter((tag) => tag.toLowerCase() !== String(value || "").toLowerCase());
    setFormTags(state.formTags);
  });

  els.tableBody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (!id || !action) return;

    try {
      if (action === "edit") editSubscription(id);
      if (action === "delete") {
        await removeSubscription(id);
        await refreshAndRender();
      }
      if (action === "paid") await markPaid(id);
    } catch (err) {
      alert(`操作失败: ${err.message}`);
    }
  });

  els.tableBody.addEventListener("mouseover", (e) => {
    const trigger = e.target.closest('[data-hover-trigger="detail"]');
    if (!trigger) return;
    const row = trigger.closest("tr[data-sub-id]");
    if (!row) return;
    const sub = state.subscriptions.find((item) => item.id === row.dataset.subId);
    if (!sub) return;
    showRowHoverCard(sub, e.clientX, e.clientY);
  });

  els.tableBody.addEventListener("mousemove", (e) => {
    const trigger = e.target.closest('[data-hover-trigger="detail"]');
    if (!trigger || els.rowHoverCard.classList.contains("hidden")) return;
    placeRowHoverCard(e.clientX, e.clientY);
  });

  els.tableBody.addEventListener("mouseout", (e) => {
    const trigger = e.target.closest('[data-hover-trigger="detail"]');
    if (!trigger) return;
    const to = e.relatedTarget;
    if (to && trigger.contains(to)) return;
    if (to && to.closest?.('[data-hover-trigger="detail"]')) return;
    hideRowHoverCard();
  });

  window.addEventListener("scroll", hideRowHoverCard, { passive: true });
}

async function init() {
  loadSettings();
  state.futureReportMonths = state.settings.defaultMonths;
  state.pastReportMonths = state.settings.defaultMonths;
  await fetchCurrencyCatalog();
  renderCurrencyOptions();
  bindEvents();
  resetForm();
  showPage("dashboardPage");
  setActiveNav("overview");
  showDashboardFeature("overview");
  showAuthMode("login");
  if (state.authToken) {
    try {
      const me = await authMe();
      state.currentUser = me.user;
      showAppShell();
      await refreshAndRender();
      restartRateTimer();
      return;
    } catch (err) {
      state.authToken = "";
      state.currentUser = null;
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }
  showAuthPage();
}

init().catch((err) => {
  console.error(err);
  alert("初始化失败，请检查后端服务是否运行");
});
