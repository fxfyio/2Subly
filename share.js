function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CURRENCY_SYMBOL = {
  CNY: "¥",
  TWD: "NT$",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  HKD: "HK$",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
  PHP: "₱",
};

const CYCLE_LABELS = {
  weekly: "每周",
  monthly: "每月",
  quarterly: "每季度",
  yearly: "每年",
};

function formatMoney(value, code) {
  const symbol = CURRENCY_SYMBOL[String(code || "").toUpperCase()] || "";
  const num = Number(value);
  const amount = Number.isFinite(num) ? num.toFixed(2) : "0.00";
  if (!symbol) return `${amount} ${String(code || "").toUpperCase() || ""}`.trim();
  return `${symbol}${amount}`;
}

const SHARE_ICON_RULES = [
  { keywords: ["chatgpt", "openai"], icon: "https://cdn.jsdelivr.net/npm/simple-icons/icons/openai.svg", bg: "#e8fbf5" },
  { keywords: ["spotify"], icon: "https://cdn.simpleicons.org/spotify/1DB954", bg: "#e8fff2" },
  { keywords: ["youtube"], icon: "https://cdn.simpleicons.org/youtube/FF0000", bg: "#fff1f1" },
  { keywords: ["netflix"], icon: "https://cdn.simpleicons.org/netflix/E50914", bg: "#fff1f3" },
  { keywords: ["icloud"], icon: "https://cdn.simpleicons.org/icloud/3693F3", bg: "#edf5ff" },
  { keywords: ["microsoft"], icon: "https://cdn.jsdelivr.net/npm/simple-icons/icons/microsoft.svg", bg: "#f4f4f4" },
  { keywords: ["github"], icon: "https://cdn.simpleicons.org/github/181717", bg: "#f2f4f8" },
  { keywords: ["notion"], icon: "https://cdn.simpleicons.org/notion/000000", bg: "#f4f4f6" },
  { keywords: ["canva"], icon: "https://cdn.jsdelivr.net/npm/simple-icons/icons/canva.svg", bg: "#ecffff" },
  { keywords: ["cloudflare"], icon: "https://cdn.simpleicons.org/cloudflare/F38020", bg: "#fff3eb" },
];

function resolveShareIcon(sub) {
  const custom = String(sub.iconUrl || "").trim();
  if (/^https?:\/\//i.test(custom)) {
    return { icon: custom, bg: "#f4f8ff" };
  }
  const name = String(sub.name || "").toLowerCase();
  for (const item of SHARE_ICON_RULES) {
    if (item.keywords.some((k) => name.includes(k))) {
      return { icon: item.icon, bg: item.bg };
    }
  }
  return { icon: "", bg: "#f4f8ff" };
}

function getTokenFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "share") return parts[1];
  return "";
}

async function requestShare(token) {
  const res = await fetch(`/api/share/${encodeURIComponent(token)}`);
  const text = await res.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_err) {
      payload = {};
    }
  }
  if (!res.ok) throw new Error(payload.error || "分享链接不可用");
  return payload;
}

function renderList(items) {
  const root = document.getElementById("shareList");
  if (!items.length) {
    root.innerHTML = `<div class="share-empty">暂无订阅数据</div>`;
    return;
  }
  root.innerHTML = items
    .map((sub) => {
      const iconMeta = resolveShareIcon(sub);
      const icon = iconMeta.icon;
      const letter = escapeHtml((sub.name || "?").trim().slice(0, 1).toUpperCase());
      return `
        <article class="share-item">
          <div class="share-item-top compact">
            <div class="share-item-main">
              <span class="share-icon${icon ? "" : " fallback"}" style="background:${escapeHtml(iconMeta.bg)}">
                ${icon ? `<img src="${escapeHtml(icon)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none';this.parentElement.classList.add('fallback')">` : ""}
                <span class="share-icon-fallback">${letter}</span>
              </span>
              <h3>${escapeHtml(sub.name)}</h3>
            </div>
            <div class="share-side">
              <div class="share-price">${escapeHtml(formatMoney(sub.price, sub.currency))}</div>
              <div class="share-cycle">${escapeHtml(CYCLE_LABELS[sub.cycle] || sub.cycle || "-")}</div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function init() {
  const shareTitle = document.getElementById("shareTitle");
  const shareMeta = document.getElementById("shareMeta");
  const shareUrlInput = document.getElementById("shareUrlInput");
  const copyBtn = document.getElementById("copyShareUrlBtn");
  shareUrlInput.value = window.location.href;
  copyBtn.addEventListener("click", async () => {
    const url = shareUrlInput.value;
    try {
      await navigator.clipboard.writeText(url);
      copyBtn.textContent = "已复制";
      setTimeout(() => {
        copyBtn.textContent = "复制链接";
      }, 1200);
    } catch (_err) {
      window.prompt("复制这个分享链接：", url);
    }
  });

  const token = getTokenFromPath();
  if (!token) {
    shareMeta.textContent = "分享链接无效";
    return;
  }
  try {
    const data = await requestShare(token);
    shareTitle.textContent = `${data.owner?.username || "用户"} 的订阅列表`;
    shareMeta.textContent = `共 ${data.subscriptions?.length || 0} 条 · 展示名称、图标与金额`;
    renderList(data.subscriptions || []);
  } catch (err) {
    shareMeta.textContent = `加载失败：${err.message}`;
    document.getElementById("shareList").innerHTML = `<div class="share-empty">链接不存在或已失效</div>`;
  }
}

init().catch(() => null);
