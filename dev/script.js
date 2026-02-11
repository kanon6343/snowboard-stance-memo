// ===== env 判定（/dev/ or localhost を dev 扱い）=====
const IS_DEV =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1" ||
  location.pathname.includes("/dev/");

// ===== Key prefix（環境で分ける）=====
const KEY_PREFIX = IS_DEV ? "dev:" : "prod:";

// 既存キー名は維持しつつ prefix だけ付ける
const KEY    = `${KEY_PREFIX}snowboard-history-v1`;
const UI_KEY = `${KEY_PREFIX}snowboard-ui-v1`;

// ===== 任意：初回だけ prod -> dev をコピーする =====
if (IS_DEV) {
  const PROD_KEY = `prod:snowboard-history-v1`;
  const PROD_UI  = `prod:snowboard-ui-v1`;

  const hasDevData = !!localStorage.getItem(KEY) || !!localStorage.getItem(UI_KEY);
  const wantsCopy = new URLSearchParams(location.search).has("copyProd");

  if (!hasDevData && wantsCopy) {
    const prodData = localStorage.getItem(PROD_KEY);
    const prodUI   = localStorage.getItem(PROD_UI);

    if (prodData) localStorage.setItem(KEY, prodData);
    if (prodUI)   localStorage.setItem(UI_KEY, prodUI);
    alert("prod データを dev にコピーしたよ！");
  }
}

// ===== DOM =====
const holes = [...document.querySelectorAll(".hole")];
const historyDiv = document.getElementById("history");

const boardEl = document.getElementById("board");
const snowEl = document.getElementById("snow");

const commentEl = document.getElementById("comment");
if (commentEl) commentEl.value = "";

const leftAngleEl = document.getElementById("left-angle");
const rightAngleEl = document.getElementById("right-angle");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const tabsDiv = document.getElementById("boardTabs");

const stanceTabsDiv = document.getElementById("stanceTabs");

// 角度検索UI
const angleLeftEl  = document.getElementById("angleLeft");
const angleRightEl = document.getElementById("angleRight");
const angleTolEl   = document.getElementById("angleTol");
const angleClearEl = document.getElementById("angleClear");

// ===== state =====
let selectedBoard = "__ALL__";
let stanceFilter = ""; // ""=未選択 / "duck" / "forward" / "back" / "none"(未設定)

let favSortOn = true;       // ★を上に
let sortMode = "savedDesc"; // メインソート

// 角度検索：片方だけでも両方でもOK
let angleFilter = {
  left: null,   // number|null
  right: null,  // number|null
  tol: 2        // number
};

// --- UI状態を復元 ---
try {
  const ui = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
  if (typeof ui.selectedBoard === "string") selectedBoard = ui.selectedBoard;
  if (typeof ui.stanceFilter === "string") stanceFilter = ui.stanceFilter;
  if (typeof ui.favSortOn === "boolean") favSortOn = ui.favSortOn;
  if (typeof ui.sortMode === "string") sortMode = ui.sortMode;

  // 角度検索
  if (ui.angleFilter && typeof ui.angleFilter === "object") {
    const L = Number(ui.angleFilter.left);
    const R = Number(ui.angleFilter.right);
    const T = Number(ui.angleFilter.tol);

    angleFilter.left  = Number.isFinite(L) ? L : null;
    angleFilter.right = Number.isFinite(R) ? R : null;
    angleFilter.tol   = Number.isFinite(T) ? Math.max(0, T) : 2;
  }
} catch {}

// UIへ反映（初期表示）
if (angleLeftEl)  angleLeftEl.value  = (angleFilter.left  ?? "") === "" ? "" : String(angleFilter.left);
if (angleRightEl) angleRightEl.value = (angleFilter.right ?? "") === "" ? "" : String(angleFilter.right);
if (angleTolEl)   angleTolEl.value   = String(angleFilter.tol ?? 2);

function saveUI(){
  localStorage.setItem(UI_KEY, JSON.stringify({
    selectedBoard,
    stanceFilter,
    favSortOn,
    sortMode,
    angleFilter: {
      left: angleFilter.left,
      right: angleFilter.right,
      tol: angleFilter.tol
    }
  }));
}

const btnFilterClear = document.getElementById("btnFilterClear");

btnFilterClear?.addEventListener("click", () => {
  const sortModeEl = document.getElementById("sortMode");
  // 1) ソートを初期に
  sortMode = "savedDesc";
  if (sortModeEl) sortModeEl.value = sortMode;

  // 2) スタンスフィルター解除
  stanceFilter = "";
  renderStanceTabs();

  // 3) 角度フィルター解除（既存の角度クリアと同じ状態へ）
  angleFilter = { left: null, right: null, tol: 2 };
  if (angleLeftEl) angleLeftEl.value = "";
  if (angleRightEl) angleRightEl.value = "";
  if (angleTolEl) angleTolEl.value = "2";

  // 4) UI保存→再描画
  saveUI();
  render();

  showToast("フィルター/ソートをクリアしたよ", "info");
});

// ===== stance tabs =====
function renderStanceTabs(){
  if (!stanceTabsDiv) return;

  const items = [
    { key: "duck",    emoji: "🦆" },
    { key: "forward", emoji: "△" },
    { key: "back",    emoji: "▽" },
    { key: "none",    emoji: "ー" }, // 未設定（stanceが空）
  ];

  stanceTabsDiv.innerHTML = items.map(x => {
    const active = (stanceFilter === x.key) ? "active" : "";
    return `<button type="button" class="stance-tab ${active}" data-stance-filter="${x.key}">${x.emoji}</button>`;
  }).join("");

  stanceTabsDiv.querySelectorAll("[data-stance-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-stance-filter") || "";

      // 同じのを押したら解除（未選択へ）
      stanceFilter = (stanceFilter === key) ? "" : key;

      saveUI();
      render();
    });
  });
}

// ===== sort select =====
const sortModeEl = document.getElementById("sortMode");
if (sortModeEl) {
  sortModeEl.value = sortMode;
  sortModeEl.addEventListener("change", () => {
    sortMode = sortModeEl.value;
    saveUI();
    showToast(`ソート：${sortModeEl.options[sortModeEl.selectedIndex].text}`, "info");
    render();
  });
}

// ===== angle filter wiring =====
let angleInputTimer = null;

function readAngleFilterFromUI(){
  const Lraw = angleLeftEl?.value ?? "";
  const Rraw = angleRightEl?.value ?? "";
  const Traw = angleTolEl?.value ?? "";

  const L = Number(Lraw);
  const R = Number(Rraw);
  const T = Number(Traw);

  angleFilter.left  = (Lraw === "" || !Number.isFinite(L)) ? null : L;
  angleFilter.right = (Rraw === "" || !Number.isFinite(R)) ? null : R;

  const tol = Number.isFinite(T) ? Math.max(0, T) : 2;
  angleFilter.tol = tol;
}

function scheduleAngleRender(){
  if (angleInputTimer) clearTimeout(angleInputTimer);
  angleInputTimer = setTimeout(() => {
    readAngleFilterFromUI();
    saveUI();
    render();
  }, 120);
}

angleLeftEl?.addEventListener("input", scheduleAngleRender);
angleRightEl?.addEventListener("input", scheduleAngleRender);
angleTolEl?.addEventListener("input", scheduleAngleRender);

angleClearEl?.addEventListener("click", () => {
  if (angleLeftEl) angleLeftEl.value = "";
  if (angleRightEl) angleRightEl.value = "";
  if (angleTolEl) angleTolEl.value = "2";

  angleFilter = { left: null, right: null, tol: 2 };
  saveUI();
  render();
  showToast("角度検索：クリア", "info");
});

// ===== setup state for form =====
let reference = { left: null, right: null };
let stance = ""; // 入力側のスタンス（保存用）
let disk = { left: "", right: "" };

// stance quick buttons (入力側)
const stanceBtns = [...document.querySelectorAll("[data-stance]")];

function renderStanceUI(){
  stanceBtns.forEach(btn => {
    const v = btn.dataset.stance ?? "";
    const isOn = (v === stance) || (v === "off" && stance === "");
    btn.classList.toggle("active", isOn);
  });
}

stanceBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const v = btn.dataset.stance ?? "";
    const next = (v === "off" || v === "") ? "" : v;
    stance = (stance === next) ? "" : next;

    renderStanceUI();

    const label =
      stance === "duck" ? "ダック" :
      stance === "forward" ? "前振り" :
      stance === "back" ? "後振り" :
      "解除";
    showToast(`スタンス：${label}`, "info");
  });
});

// 穴タップ
holes.forEach(h => h.addEventListener("click", () => h.classList.toggle("active")));

// クリア（入力）
clearBtn?.addEventListener("click", () => {
  if (boardEl) boardEl.value = "";
  if (snowEl) snowEl.value = "";
  if (commentEl) commentEl.value = "";
  if (leftAngleEl) leftAngleEl.value = "";
  if (rightAngleEl) rightAngleEl.value = "";
  holes.forEach(h => h.classList.remove("active"));

  stance = "";
  renderStanceUI();

  reference = { left: null, right: null };
  renderRefSlots();

  disk = { left: "", right: "" };
  renderDiskUI();
});

// 保存
saveBtn?.addEventListener("click", () => {
  const item = {
    id: String(Date.now()),
    favorite: false,
    board: (boardEl?.value || "").trim(),
    snow: snowEl?.value || "",
    comment: (commentEl?.value || "").trim(),
    stance,
    leftAngle: (leftAngleEl?.value || "").trim(),
    rightAngle: (rightAngleEl?.value || "").trim(),
    disk: { ...disk },
    holes: holesV1ToV2(holes.map(h => h.classList.contains("active"))),
    dataVersion: 2,
    reference: { ...reference },
    dateTime: new Date().toISOString(),
  };

  const list = loadList();
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list));
  render();
  showToast("保存しました", "success");
});

// disk chips
document.querySelectorAll(".disk-group .chip").forEach(btn => {
  btn.addEventListener("click", () => {
    const group = btn.closest(".disk-group");
    if (!group) return;

    const side = group.dataset.side;   // left / right
    const value = btn.dataset.value;   // 前/中/後
    if (!side) return;

    disk[side] = (disk[side] === value) ? "" : value;
    renderDiskUI();
  });
});

function renderDiskUI() {
  document.querySelectorAll(".disk-group").forEach(group => {
    const side = group.dataset.side;
    group.querySelectorAll(".chip").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.value === disk[side]);
    });
  });
}

function loadList() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

// ===== board tabs =====
function renderTabs() {
  const list = loadList();

  const boards = Array.from(
    new Set(list.map(x => (x.board || "").trim()))
  );

  const items = ["__FAV__", "__ALL__", ...boards];

  tabsDiv.innerHTML = items.map(b => {
    const label =
      b === "__FAV__" ? "★" :
      b === "__ALL__" ? "全部" :
      (b === "" ? "未入力" : b);

    const active =
      (b === "__FAV__") ? (favSortOn ? "active" : "") :
      (b === selectedBoard ? "active" : "");

    return `<button type="button" class="tab ${active}" data-board="${escapeHtml(b)}">${escapeHtml(label)}</button>`;
  }).join("");

  tabsDiv.querySelectorAll("button.tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const board = btn.getAttribute("data-board") ?? "__ALL__";

      if (board === "__FAV__") {
        favSortOn = !favSortOn;
        saveUI();
        showToast(favSortOn ? "★ソート：ON" : "★ソート：OFF", favSortOn ? "star" : "info");
        render();
        return;
      }

      selectedBoard = board;
      saveUI();
      render();
    });
  });
}

// ===== reference slots =====
function setHelpX(side, index) {
  const help = document.querySelector(`.ref-help[data-side="${side}"]`);
  const line = document.querySelector(`.ref-line[data-side="${side}"]`);
  if (!help || !line) return;

  if (index === null || index === undefined) {
    help.classList.remove("active");
    help.style.removeProperty("--ref-x");
    return;
  }

  const slot = line.querySelector(`.ref-slot[data-index="${index}"]`);
  if (!slot) return;

  const slotRect = slot.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();
  const x = (slotRect.left + slotRect.width / 2) - lineRect.left;

  help.classList.add("active");
  help.style.setProperty("--ref-x", `${x}px`);
}

function renderRefSlots() {
  document.querySelectorAll(".ref-line").forEach(line => {
    const side = line.dataset.side;

    line.innerHTML = Array.from({ length: 6 }, (_, i) =>
      `<div class="ref-slot" data-index="${i}" data-side="${side}"></div>`
    ).join("");

    const idx = reference?.[side];

    if (idx !== null && idx !== undefined) {
      const slot = line.querySelector(`.ref-slot[data-index="${idx}"]`);
      if (slot) {
        slot.classList.add("active");
        setHelpX(side, idx);
      }
    } else {
      setHelpX(side, null);
    }

    line.querySelectorAll(".ref-slot").forEach(slot => {
      slot.addEventListener("click", () => {
        const index = Number(slot.dataset.index);

        if (reference[side] === index) {
          reference[side] = null;
          line.querySelectorAll(".ref-slot").forEach(s => s.classList.remove("active"));
          setHelpX(side, null);
          return;
        }

        reference[side] = index;
        line.querySelectorAll(".ref-slot").forEach(s => s.classList.remove("active"));
        slot.classList.add("active");
        setHelpX(side, index);
      });
    });
  });
}

// ===== render =====
function render() {
  const all = loadList();

  let list =
    (selectedBoard === "__ALL__") ? all
    : all.filter(x => (x.board || "").trim() === selectedBoard);

  // スタンス絞り込み
  if (stanceFilter) {
    list = list.filter(x => {
      const s = x.stance || "";
      if (stanceFilter === "none") return s === "";
      return s === stanceFilter;
    });
  }

  // 角度検索（片方だけでもOK）
  const tol = Number.isFinite(Number(angleFilter.tol)) ? Number(angleFilter.tol) : 2;

  const matchAngle = (valueStr, target) => {
    const v = Number(valueStr);
    if (!Number.isFinite(v)) return false;
    return Math.abs(v - target) <= tol;
  };

  if (angleFilter.left !== null) {
    const targetL = Number(angleFilter.left);
    list = list.filter(x => matchAngle(x.leftAngle, targetL));
  }
  if (angleFilter.right !== null) {
    const targetR = Number(angleFilter.right);
    list = list.filter(x => matchAngle(x.rightAngle, targetR));
  }

  // ソート
  const cmpStr = (a, b) => String(a || "").localeCompare(String(b || ""), "ja");
  const getTime = (x) => String(x?.dateTime || "");

  list.sort((a, b) => {
    if (favSortOn) {
      const favDiff = Number(!!b.favorite) - Number(!!a.favorite);
      if (favDiff !== 0) return favDiff;
    }

    switch (sortMode) {
      case "savedAsc":
        return getTime(a).localeCompare(getTime(b));
      case "savedDesc":
        return getTime(b).localeCompare(getTime(a));
      case "boardAsc":
        return cmpStr(a.board, b.board);
      case "snowAsc":
        return cmpStr(a.snow, b.snow);
      default:
        return 0;
    }
  });

  historyDiv.innerHTML = "";

  renderTabs();
  renderStanceTabs();
  renderRefSlots();

  list.forEach((item) => {
    const card = document.createElement("section");
    card.className = "card";

    const dateLabel = item.dateTime ? formatDateJP(item.dateTime) : "日付なし";
    const timeLabel = item.dateTime
      ? new Date(item.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

    const boardLabel = item.board || "板名なし";
    const snowLabel  = item.snow  || "雪質なし";

    const title = `${boardLabel} / ${dateLabel} / ${timeLabel} / ${snowLabel}`;
    const leftDisk = item.disk?.left || "";
    const rightDisk = item.disk?.right || "";

    const commentText = (item.comment || "").trim();

    const stanceLabel =
      item.stance === "duck" ? "ダック" :
      item.stance === "forward" ? "前振り" :
      item.stance === "back" ? "後振り" : "";

    const setupLine = `左 ${item.leftAngle || "?"}°  ${leftDisk}　右 ${item.rightAngle || "?"}°  ${rightDisk}`;

    const fav = !!item.favorite;
    const favLabel = fav ? "★" : "☆";

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <b>${escapeHtml(title)}</b>

        <button
          type="button"
          class="fav-btn ${fav ? "active" : ""}"
          data-fav-id="${item.id}"
          title="${fav ? "お気に入り解除" : "お気に入り登録"}"
        >
          ${favLabel}
        </button>
      </div>

      <div>${escapeHtml(setupLine)}</div>

      ${stanceLabel ? `<div class="stance-tag">${escapeHtml(stanceLabel)}</div>` : ""}
      ${commentText ? `<div class="comment">${escapeHtml(commentText)}</div>` : ""}

      <div class="history-preview">
        ${renderMini(item.holes || [], item.reference || { left: null, right: null })}
      </div>

      <div class="history-actions">
        <button type="button" class="btn-load" data-load-id="${item.id}">読込</button>

        <button
          type="button"
          class="btn-del ${fav ? "is-protected" : ""}"
          data-del-id="${item.id}"
          data-protected="${fav ? "1" : "0"}"
          title="${fav ? "お気に入りは削除できません" : "削除"}"
        >
          削除
        </button>
      </div>
    `;

    historyDiv.appendChild(card);
  });

  // ★お気に入り切替
  historyDiv.querySelectorAll("[data-fav-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-fav-id");
      const list = loadList();
      const item = list.find(x => x.id === id);
      if (!item) return;

      item.favorite = !item.favorite;
      localStorage.setItem(KEY, JSON.stringify(list));
      render();
      showToast(item.favorite ? "お気に入り追加 ⭐" : "お気に入り解除", item.favorite ? "star" : "info");
    });
  });

  // 削除（お気に入りは無視）
  historyDiv.querySelectorAll('button[data-del-id]').forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.protected === "1") {
        showToast("★お気に入りは削除できません", "error");
        return;
      }

      const id = btn.dataset.delId;
      const next = loadList().filter(x => x.id !== id);
      localStorage.setItem(KEY, JSON.stringify(next));
      render();
      showToast("削除しました", "error");
    });
  });

  // 読込
  historyDiv.querySelectorAll('button[data-load-id]').forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.loadId;
      const item = loadList().find(x => x.id === id);
      if (!item) return;

      boardEl && (boardEl.value = item.board || "");
      snowEl  && (snowEl.value  = item.snow  || "");
      commentEl && (commentEl.value = item.comment || "");
      leftAngleEl && (leftAngleEl.value = item.leftAngle || "");
      rightAngleEl && (rightAngleEl.value = item.rightAngle || "");

      const holesArr = getHolesAsV1(item);
      holes.forEach((h, i) => {
        h.classList.toggle("active", !!holesArr[i]);
      });

      stance = item.stance || "";
      renderStanceUI();

      reference = item.reference || { left: null, right: null };
      renderRefSlots();

      disk = item.disk || { left: "", right: "" };
      renderDiskUI();

      showToast("読み込みました", "rode");
    });
  });
}

// ===== import helpers =====
function safeParseJSON(text){
  try { return JSON.parse(text); }
  catch { return null; }
}

// v1 item / v2 item / 旧形式 をそれっぽく受け止めて、アプリの item 形式に寄せる
function normalizeItem(x){
  if (!x || typeof x !== "object") return null;

  const item = { ...x };

  if (!item.id) item.id = String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  item.favorite = !!item.favorite;

  if (Array.isArray(item.holes)) {
    item.holes = holesV1ToV2(item.holes);
    item.dataVersion = item.dataVersion || 2;
  } else if (item.holes && typeof item.holes === "object") {
    item.dataVersion = item.dataVersion || 2;
  } else {
    item.holes = { left: [], right: [] };
    item.dataVersion = item.dataVersion || 2;
  }

  if (!item.reference) item.reference = { left: null, right: null };
  if (!item.disk) item.disk = { left: "", right: "" };
  if (!item.dateTime) item.dateTime = new Date().toISOString();

  item.board = (item.board || "").toString();
  item.snow = (item.snow || "").toString();
  item.comment = (item.comment || "").toString();
  item.leftAngle = (item.leftAngle || "").toString();
  item.rightAngle = (item.rightAngle || "").toString();
  item.stance = (item.stance || "").toString();

  return item;
}

// payload から items/ui/meta を取り出す（新形式・旧形式どっちも対応）
function parseBackupPayload(obj){
  if (obj && typeof obj === "object" && Array.isArray(obj.items)) {
    const items = obj.items.map(normalizeItem).filter(Boolean);
    const ui = (obj.ui && typeof obj.ui === "object") ? obj.ui : null;
    const meta = {
      app: obj.app || "",
      dataVersion: Number(obj.dataVersion || obj.version || 0),
      exportedAt: obj.exportedAt || "",
      env: obj.env || ""
    };
    return { items, ui, meta };
  }

  if (Array.isArray(obj)) {
    const items = obj.map(normalizeItem).filter(Boolean);
    return { items, ui: null, meta: { app:"", dataVersion:0, exportedAt:"", env:"" } };
  }

  return null;
}

// プレビュー用：件数・期間・板上位
function summarizeItems(items){
  const n = items.length;

  let min = null, max = null;
  const boards = new Map();

  for (const it of items) {
    const t = it.dateTime ? new Date(it.dateTime).getTime() : NaN;
    if (!Number.isNaN(t)) {
      if (min === null || t < min) min = t;
      if (max === null || t > max) max = t;
    }

    const b = (it.board || "").trim() || "未入力";
    boards.set(b, (boards.get(b) || 0) + 1);
  }

  const topBoards = [...boards.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3);

  const fmt = (ms) => {
    if (ms === null) return "不明";
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  };

  return {
    count: n,
    range: `${fmt(min)} 〜 ${fmt(max)}`,
    topBoards
  };
}

// ===== バックアップ（エクスポート）=====
function exportBackup() {
  const items = loadList();

  let ui = {};
  try { ui = JSON.parse(localStorage.getItem(UI_KEY) || "{}"); } catch {}

  const payload = {
    app: "snowboard-stance-memo",
    dataVersion: 2,
    exportedAt: new Date().toISOString(),
    env: IS_DEV ? "dev" : "prod",
    items,
    ui,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  const now = new Date();
  const stamp =
    now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0") + "_" +
    String(now.getHours()).padStart(2, "0") + "-" +
    String(now.getMinutes()).padStart(2, "0") + "-" +
    String(now.getSeconds()).padStart(2, "0");

  const filename =
    `snowboard-stance-memo_v${payload.dataVersion}_${IS_DEV ? "dev" : "prod"}_${stamp}.json`;

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast("バックアップを書き出しました", "success");
}

// ===== 右スライドメニュー（A+ 完全版）=====
(function setupSlideMenu(){
  const btn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("menuCloseBtn");
  const panel = document.getElementById("menuPanel");
  const overlay = document.getElementById("menuOverlay");
  if (!btn || !panel || !overlay || !closeBtn) return;

  function open(){
    overlay.hidden = false;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
  }

  function close(){
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
    setTimeout(() => { overlay.hidden = true; }, 220);
  }

  // export
  const exportBtn = document.getElementById("btnExport");
  exportBtn?.addEventListener("click", exportBackup);

  // import UI wiring
  const fileEl = document.getElementById("importFile");
  const previewEl = document.getElementById("importPreview");
  const errEl = document.getElementById("importError");
  const btnMerge = document.getElementById("btnImportMerge");
  const btnReplace = document.getElementById("btnImportReplace");

  let pendingImport = null; // { items, ui, meta }

  const setError = (msg) => {
    if (!errEl) return;
    if (!msg) { errEl.hidden = true; errEl.textContent = ""; return; }
    errEl.hidden = false;
    errEl.textContent = msg;
  };

  const setPreview = (html) => {
    if (!previewEl) return;
    previewEl.innerHTML = html;
  };

  const setImportButtonsEnabled = (on) => {
    if (btnMerge) btnMerge.disabled = !on;
    if (btnReplace) btnReplace.disabled = !on;
  };

  function resetImportUI(){
    pendingImport = null;
    setError("");
    setImportButtonsEnabled(false);
    if (fileEl) fileEl.value = "";
    setPreview(`<div class="import-muted">※ ここにプレビューが出るよ</div>`);
  }

  resetImportUI();

  const fmtDateTimeJP = (iso) => {
    if (!iso) return "不明";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "不明";
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    const hh = String(d.getHours()).padStart(2,"0");
    const mm = String(d.getMinutes()).padStart(2,"0");
    return `${y}-${m}-${day} ${hh}:${mm}`;
  };

  fileEl?.addEventListener("change", async () => {
    setImportButtonsEnabled(false);
    setError("");
    pendingImport = null;

    const f = fileEl.files?.[0];
    if (!f) {
      resetImportUI();
      return;
    }

    const text = await f.text();
    const raw = safeParseJSON(text);
    if (!raw) {
      setPreview(`<div class="import-muted">読み込み失敗</div>`);
      setError("JSONとして読み込めなかったよ（ファイルが壊れてるかも）");
      return;
    }

    const parsed = parseBackupPayload(raw);
    if (!parsed) {
      setPreview(`<div class="import-muted">形式が違うみたい</div>`);
      setError("このファイルは対応してない形式っぽい");
      return;
    }

    const isOurApp = parsed.meta.app === "snowboard-stance-memo" || parsed.meta.app === "";
    if (!isOurApp) {
      setError("このファイルは別アプリの可能性があるよ（復元はおすすめしない）");
    } else {
      setError("");
    }

    const sum = summarizeItems(parsed.items);
    const boardsLine = sum.topBoards.length
      ? sum.topBoards.map(([b,c]) => `${escapeHtml(b)}（${c}）`).join(" / ")
      : "なし";

    const envLabel = parsed.meta.env ? String(parsed.meta.env) : "不明";
    const exportedAtLabel = fmtDateTimeJP(parsed.meta.exportedAt);

    setPreview(`
      <div><b>ファイル：</b>${escapeHtml(f.name)}</div>
      <div><b>件数：</b>${sum.count}</div>
      <div><b>期間：</b>${escapeHtml(sum.range)}</div>
      <div><b>板（上位）：</b>${boardsLine}</div>
      <div><b>環境：</b>${escapeHtml(envLabel)}</div>
      <div><b>作成：</b>${escapeHtml(exportedAtLabel)}</div>
      <div><b>形式：</b>app=${escapeHtml(parsed.meta.app || "不明")} / v=${escapeHtml(String(parsed.meta.dataVersion || "不明"))}</div>
    `);

    pendingImport = parsed;
    setImportButtonsEnabled(parsed.items.length > 0);
  });

  function mergeItems(existing, incoming){
    const byId = new Map(existing.map(x => [x.id, x]));
    const out = [...existing];

    for (const it0 of incoming) {
      let it = it0;
      if (byId.has(it.id)) {
        it = { ...it, id: it.id + "-" + Math.random().toString(16).slice(2) };
      }
      out.unshift(it);
      byId.set(it.id, it);
    }
    return out;
  }

  btnMerge?.addEventListener("click", () => {
    if (!pendingImport) return;

    const ok = confirm("バックアップを「追加」で復元するよ？（今のデータは残る）");
    if (!ok) return;

    const cur = loadList();
    const next = mergeItems(cur, pendingImport.items);

    localStorage.setItem(KEY, JSON.stringify(next));

    render();
    showToast(`追加で復元（+${pendingImport.items.length}件 / 合計${next.length}件）`, "success");

    resetImportUI();
    close();
  });

  btnReplace?.addEventListener("click", () => {
    if (!pendingImport) return;

    const ok1 = confirm("⚠️ 上書きで復元するよ？（今のデータは消える）");
    if (!ok1) return;

    const ok2 = prompt("本当に上書きするなら「OK」と入力してね");
    if (ok2 !== "OK") {
      showToast("上書きをキャンセルしました", "info");
      return;
    }

    localStorage.setItem(KEY, JSON.stringify(pendingImport.items));

    if (pendingImport.ui && typeof pendingImport.ui === "object") {
      localStorage.setItem(UI_KEY, JSON.stringify(pendingImport.ui));
    }

    showToast("上書きで復元しました", "success");

    resetImportUI();
    close();
    location.reload();
  });

  btn.addEventListener("click", () => {
    const isOpen = panel.classList.contains("open");
    isOpen ? close() : open();
  });

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) close();
  });
})();

// ===== toast =====
let toastTimer = null;

function showToast(message, type = "info", time){
  const el = document.getElementById("toast");
  if (!el) return;

  const defaultTime =
    type === "success" ? 1200 :
    type === "info"    ? 1500 :
    type === "star"    ? 1500 :
    type === "error"   ? 2200 :
    type === "rode"    ? 1300 :
    1600;

  const duration = (typeof time === "number") ? time : defaultTime;

  if (toastTimer) clearTimeout(toastTimer);

  el.textContent = message;
  el.className = "";
  el.classList.add("show", type);

  toastTimer = setTimeout(() => {
    el.classList.remove("show", type);
  }, duration);
}

// ===== mini preview =====
function renderMini(holesState, ref) {
  const total = 24;
  const v1 = Array.isArray(holesState) ? holesState : holesV2ToV1(holesState);
  const arr = Array.from({ length: total }, (_, i) => !!v1[i]);
  const left = arr.slice(0, 12);
  const right = arr.slice(12, 24);

  return `
    <div class="mini-bindings">
      ${miniSide("左", left, ref?.left)}
      ${miniSide("右", right, ref?.right)}
    </div>
  `;
}

function miniSide(label, sideArr, refIndex) {
  const top = sideArr.slice(0, 6);
  const bottom = sideArr.slice(6, 12);

  const idx =
    (refIndex !== null && refIndex !== undefined && !isNaN(Number(refIndex)))
      ? Number(refIndex)
      : -1;

  return `
    <div class="mini-side">
      <div class="mini-label">${label}</div>

      <div class="mini-row">
        ${top.map(on =>
          `<span class="mini-hole ${on ? "active" : ""}"></span>`
        ).join("")}
      </div>

      <div class="mini-ref">
        ${Array.from({ length: 6 }, (_, i) =>
          `<span class="mini-x ${i === idx ? "active" : ""}">×</span>`
        ).join("")}
      </div>

      <div class="mini-row">
        ${bottom.map(on =>
          `<span class="mini-hole ${on ? "active" : ""}"></span>`
        ).join("")}
      </div>
    </div>
  `;
}

// ===== holes v1/v2 互換 =====
function holesV1ToV2(arr24){
  const left = [];
  const right = [];
  const arr = Array.isArray(arr24) ? arr24 : [];

  for (let i = 0; i < 24; i++) {
    if (!arr[i]) continue;
    if (i < 12) left.push(i);
    else right.push(i - 12);
  }
  return { left, right };
}

function holesV2ToV1(obj){
  const out = Array.from({length:24}, () => false);
  if (!obj || typeof obj !== "object") return out;

  const left = Array.isArray(obj.left) ? obj.left : [];
  const right = Array.isArray(obj.right) ? obj.right : [];

  left.forEach(i => {
    const n = Number(i);
    if (Number.isFinite(n) && n >= 0 && n < 12) out[n] = true;
  });

  right.forEach(i => {
    const n = Number(i);
    if (Number.isFinite(n) && n >= 0 && n < 12) out[12 + n] = true;
  });

  return out;
}

function getHolesAsV1(item){
  const h = item?.holes;
  if (Array.isArray(h)) return h;
  if (h && typeof h === "object") return holesV2ToV1(h);
  return Array.from({length:24}, () => false);
}

// ===== utils =====
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateJP(iso){
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ===== start =====
render();

// ===== dev footer（devのときだけ表示）=====
(function setupDevFooter(){
  const footer = document.getElementById("devFooter");
  if (!footer) return;

  if (!IS_DEV) {
    footer.hidden = true;
    return;
  }

  footer.hidden = false;

  const btnReset = document.getElementById("btnDevReset");
  const btnCopy  = document.getElementById("btnDevCopyProd");

  btnReset?.addEventListener("click", () => {
    const ok = confirm("devのデータ（履歴・UI）を全部消すよ？");
    if (!ok) return;

    Object.keys(localStorage)
      .filter(k => k.startsWith("dev:"))
      .forEach(k => localStorage.removeItem(k));

    showToast("devデータを削除しました", "error");
    location.reload();
  });

  btnCopy?.addEventListener("click", () => {
    const ok = confirm("本番データを dev にコピーするよ？（dev側は上書きされます）");
    if (!ok) return;

    const PROD_KEYS = ["snowboard-history-v1", "prod:snowboard-history-v1"];
    const PROD_UI_KEYS = ["snowboard-ui-v1", "prod:snowboard-ui-v1"];

    const findFirst = (keys) => {
      for (const k of keys) {
        const v = localStorage.getItem(k);
        if (v !== null) return { key: k, value: v };
      }
      return null;
    };

    const srcData = findFirst(PROD_KEYS);
    const srcUI   = findFirst(PROD_UI_KEYS);

    if (!srcData && !srcUI) {
      alert("本番データが見つからなかったよ（まだ保存したことないかも）");
      return;
    }

    if (srcData) localStorage.setItem(KEY, srcData.value);
    if (srcUI)   localStorage.setItem(UI_KEY, srcUI.value);

    showToast("本番データを取り込みました", "success");
    location.reload();
  });
})();
