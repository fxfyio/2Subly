const API_BASE = "/api/subscriptions";
const RATES_API = "/api/rates?base=USD";
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
  { keywords: ["chatgpt", "openai"], icon: "https://cdn.simpleicons.org/openai/10A37F", bg: "#e8fbf5" },
  { keywords: ["spotify"], icon: "https://cdn.simpleicons.org/spotify/1DB954", bg: "#e8fff2" },
  { keywords: ["youtube"], icon: "https://cdn.simpleicons.org/youtube/FF0000", bg: "#fff1f1" },
  { keywords: ["netflix"], icon: "https://cdn.simpleicons.org/netflix/E50914", bg: "#fff1f3" },
  { keywords: ["disney"], icon: "https://cdn.simpleicons.org/disney%2B/113CCF", bg: "#eef5ff" },
  { keywords: ["apple music", "music"], icon: "https://cdn.simpleicons.org/applemusic/FA243C", bg: "#fff1f3" },
  { keywords: ["icloud"], icon: "https://cdn.simpleicons.org/icloud/3693F3", bg: "#edf5ff" },
  { keywords: ["google one", "google"], icon: "https://cdn.simpleicons.org/google/4285F4", bg: "#edf5ff" },
  { keywords: ["microsoft 365", "microsoft", "office"], icon: "https://cdn.simpleicons.org/microsoft/5E5E5E", bg: "#f4f4f4" },
  { keywords: ["github"], icon: "https://cdn.simpleicons.org/github/181717", bg: "#f2f4f8" },
  { keywords: ["notion"], icon: "https://cdn.simpleicons.org/notion/000000", bg: "#f4f4f6" },
  { keywords: ["figma"], icon: "https://cdn.simpleicons.org/figma/F24E1E", bg: "#fff2ef" },
  { keywords: ["canva"], icon: "https://cdn.simpleicons.org/canva/00C4CC", bg: "#ecffff" },
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
  settings: {
    rateIntervalMinutes: 10,
    showApprox: true,
    defaultMonths: 6,
  },
  rateTimerId: null,
  autoSettleRunning: false,
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
  tags: document.getElementById("tags"),
  iconUrl: document.getElementById("iconUrl"),
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
  rateInfo: document.getElementById("rateInfo"),
  navLinks: Array.from(document.querySelectorAll(".side-nav [data-page-target]")),
  dashboardPage: document.getElementById("dashboardPage"),
  settingsPage: document.getElementById("settingsPage"),
  overviewFeature: document.getElementById("overviewFeature"),
  listFeature: document.getElementById("listFeature"),
  reportsFeature: document.getElementById("reportsFeature"),
  settingsForm: document.getElementById("settingsForm"),
  settingsBaseCurrency: document.getElementById("settingsBaseCurrency"),
  settingsRateInterval: document.getElementById("settingsRateInterval"),
  settingsDefaultMonths: document.getElementById("settingsDefaultMonths"),
  settingsShowApprox: document.getElementById("settingsShowApprox"),
  passwordForm: document.getElementById("passwordForm"),
  currentPassword: document.getElementById("currentPassword"),
  newPassword: document.getElementById("newPassword"),
  confirmPassword: document.getElementById("confirmPassword"),
  passwordMessage: document.getElementById("passwordMessage"),
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
  els.registerForm.classList.toggle("hidden", login);
  els.showLoginBtn.classList.toggle("primary", login);
  els.showRegisterBtn.classList.toggle("primary", !login);
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
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

function formatMoney(value, code = "CNY") {
  const symbol = currencyMeta(code).symbol;
  return `${symbol}${Number(value).toFixed(2)} ${code}`;
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

function rateFor(code) {
  return Number(state.usdRates[code] || FALLBACK_USD_RATES[code] || 1);
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

function renderCurrencyOptions() {
  const options = CURRENCIES.map((c) => `<option value="${c.code}">${c.label}</option>`).join("");
  els.currency.innerHTML = options;
  els.baseCurrency.innerHTML = options;
  els.settingsBaseCurrency.innerHTML = options;
  els.baseCurrency.value = state.baseCurrency;
  els.settingsBaseCurrency.value = state.baseCurrency;
}

function renderCategoryOptions() {
  const uniqueCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
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
  const staleText = state.ratesStale ? "（使用缓存/回退）" : "";
  const sourceLabelMap = {
    frankfurter: "frankfurter",
    fallback: "fallback(内置)",
  };
  const sourceLabel = sourceLabelMap[state.ratesSource] || (state.ratesSource || "unknown");
  const sourceHtml = `<a href="https://www.frankfurter.app/" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceLabel)}</a>`;
  els.rateInfo.innerHTML = `汇率来源: ${sourceHtml} · 更新时间: ${updated}${staleText}`;
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
}

async function refreshRates() {
  try {
    await fetchRates();
  } catch (err) {
    console.error("汇率刷新失败", err);
  }
  render();
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
  els.tags.value = "";
  els.iconUrl.value = "";
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
  els.tags.value = tagsToInputValue(sub.tags);
  els.iconUrl.value = sub.iconUrl || "";
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
        <tr>
          <td class="name-col" data-label="订阅信息">
            <div class="info-main">
              <div class="service-name">
                <span class="service-icon${iconImg ? "" : " fallback"}" style="background:${iconMeta.bg}">
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
  renderRatesInfo();
  renderCategoryOptions();
  els.futureMonthsRangeSelect.value = String(state.futureReportMonths);
  els.pastMonthsRangeSelect.value = String(state.pastReportMonths);
  els.settingsBaseCurrency.value = state.baseCurrency;
  els.settingsRateInterval.value = String(state.settings.rateIntervalMinutes);
  els.settingsDefaultMonths.value = String(state.settings.defaultMonths);
  els.settingsShowApprox.checked = Boolean(state.settings.showApprox);
  renderSummary();
  renderTable();
  renderReports();
}

async function refreshAndRender() {
  await Promise.all([fetchSubscriptions(), fetchRates().catch(() => null)]);
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
  const key = navKey === "list" || navKey === "reports" ? navKey : "overview";
  const isOverview = key === "overview";
  els.overviewFeature.classList.toggle("active-feature", isOverview);
  els.listFeature.classList.toggle("active-feature", isOverview || key === "list");
  els.reportsFeature.classList.toggle("active-feature", isOverview || key === "reports");
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
      if (parsed.baseCurrency && CURRENCIES.some((c) => c.code === parsed.baseCurrency)) {
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
  els.showRegisterBtn.addEventListener("click", () => showAuthMode("register"));

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
      tags: normalizeTags(els.tags.value),
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
  els.futureMonthsRangeSelect.addEventListener("change", (e) => {
    state.futureReportMonths = Number(e.target.value) === 12 ? 12 : 6;
    renderReports();
  });
  els.pastMonthsRangeSelect.addEventListener("change", (e) => {
    state.pastReportMonths = Number(e.target.value) === 12 ? 12 : 6;
    renderReports();
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
  els.categorySelect.addEventListener("change", toggleCategoryCustom);

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
}

async function init() {
  loadSettings();
  state.futureReportMonths = state.settings.defaultMonths;
  state.pastReportMonths = state.settings.defaultMonths;
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
