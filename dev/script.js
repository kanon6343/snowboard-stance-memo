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

const holes = [...document.querySelectorAll(".hole")];
const historyDiv = document.getElementById("history");

const boardEl = document.getElementById("board");
const snowEl = document.getElementById("snow");

const commentEl = document.getElementById("comment");
if (commentEl) commentEl.value = "";

const leftAngleEl = document.getElementById("left-angle");
const rightAngleEl = document.getElementById("right-angle");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn"); // ← 追加
const tabsDiv = document.getElementById("boardTabs");

let selectedBoard = "__ALL__";

let favSortOn = true;      // ★を上にするON/OFF（初期はONでもOFFでもOK）
let sortMode = "savedDesc"; // メインソート（将来増やす）

// --- UI状態を復元（タブ/★ソート/ソートモード）---
try {
  const ui = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
  if (typeof ui.selectedBoard === "string") selectedBoard = ui.selectedBoard;
  if (typeof ui.favSortOn === "boolean") favSortOn = ui.favSortOn;
  if (typeof ui.sortMode === "string") sortMode = ui.sortMode;
} catch {}

const sortModeEl = document.getElementById("sortMode");
if (sortModeEl) {
  sortModeEl.value = sortMode; // ← 初期表示を合わせる
  sortModeEl.addEventListener("change", () => {
    sortMode = sortModeEl.value;
    saveUI();
    showToast(`ソート：${sortModeEl.options[sortModeEl.selectedIndex].text}`, "info");
    render();
  });
}

let reference = { left: null, right: null };

let stance = ""; // "duck" | "forward" | "back" | ""
let disk = { left: "", right: "" };

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

    // OFF扱い（"off" でも "" でも解除）
    const next = (v === "off" || v === "") ? "" : v;

    // 同じのをもう一回押したら解除（ON/OFF）
    stance = (stance === next) ? "" : next;

    renderStanceUI();

    // トースト任意
    const label =
      stance === "duck" ? "ダック" :
      stance === "forward" ? "前振り" :
      stance === "back" ? "後振り" :
      "解除";
    showToast(`スタンス：${label}`, stance ? "info" : "info");
  });
});

// 穴タップ
holes.forEach(h => h.addEventListener("click", () => h.classList.toggle("active")));

// ✅ クリア（保存の外に置く）
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

document.querySelectorAll(".disk-group .chip").forEach(btn => {
  btn.addEventListener("click", () => {
    const group = btn.closest(".disk-group");
    if (!group) return; // ★追加：構造が違っても落ちない

    const side = group.dataset.side;   // left / right
    const value = btn.dataset.value;   // 前/中/後
    if (!side) return;

    // 同じのをもう一回押したら解除
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

function saveUI(){
  localStorage.setItem(UI_KEY, JSON.stringify({
    selectedBoard,
    favSortOn,
    sortMode,
  }));
}

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

    // ★タブだけ特別：favSortOn が true のとき active
    const active =
      (b === "__FAV__") ? (favSortOn ? "active" : "") :
      (b === selectedBoard ? "active" : "");

    return `<button type="button" class="tab ${active}" data-board="${escapeHtml(b)}">${escapeHtml(label)}</button>`;
  }).join("");

  tabsDiv.querySelectorAll("button.tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const board = btn.getAttribute("data-board") ?? "__ALL__";

      // ★タブは「絞り込み」じゃなく「★ソート切替」
      if (board === "__FAV__") {
        favSortOn = !favSortOn;
        saveUI();
        showToast(
          favSortOn ? "★ソート：ON" : "★ソート：OFF",
          favSortOn ? "star" : "info"
        );
        render();
        return;
      }

      // それ以外は普通に絞り込み
      selectedBoard = board;
      saveUI();
      render();
    });
  });
}


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

    // スロット生成
    line.innerHTML = Array.from({ length: 6 }, (_, i) =>
      `<div class="ref-slot" data-index="${i}" data-side="${side}"></div>`
    ).join("");

    // ===== 保存済みを反映 =====
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

    // ===== クリック処理（★ここが進化ポイント） =====
    line.querySelectorAll(".ref-slot").forEach(slot => {
      slot.addEventListener("click", () => {
        const index = Number(slot.dataset.index);

        // 同じ場所を押したら解除
        if (reference[side] === index) {
          reference[side] = null;

          line.querySelectorAll(".ref-slot").forEach(s => s.classList.remove("active"));
          setHelpX(side, null);
          return;
        }

        // 通常選択
        reference[side] = index;

        line.querySelectorAll(".ref-slot").forEach(s => s.classList.remove("active"));
        slot.classList.add("active");

        setHelpX(side, index);
      });
    });
  });
}

function render() {
  const all = loadList();

 const list =
  (selectedBoard === "__ALL__") ? all
  : all.filter(x => (x.board || "").trim() === selectedBoard);
  
  // 文字比較（空は最後）
const cmpStr = (a, b) => String(a || "").localeCompare(String(b || ""), "ja");
const getTime = (x) => String(x?.dateTime || "");

// ★ + メインソート を「1回の sort」に合成
list.sort((a, b) => {
  // 1) ★を上に（ONの時だけ）
  if (favSortOn) {
    const favDiff = Number(!!b.favorite) - Number(!!a.favorite);
    if (favDiff !== 0) return favDiff;
  }

  // 2) メインソート
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
  renderRefSlots();

  list.forEach((item) => {
    const card = document.createElement("section");
    card.className = "card";

    const time = item.dateTime
      ? new Date(item.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

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

  // ===== イベント付け（ここから下は1回だけ） =====

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
      showToast(
       item.favorite ? "お気に入り追加 ⭐" : "お気に入り解除",
       item.favorite ? "star" : "info"
      
    );
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

  // id が無いなら作る（衝突しにくい）
  if (!item.id) item.id = String(Date.now()) + "-" + Math.random().toString(16).slice(2);

  item.favorite = !!item.favorite;

  // holes: v1配列なら v2へ寄せる（保存側はv2）
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
  // 推奨形式：{ app, dataVersion, exportedAt, env, items, ui }
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

  // 旧形式：配列だけ
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
  // 履歴（メイン）
  const items = loadList();

  // UI状態（タブ/ソート等）も一緒に入れると復元がラク
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

// 例: 2026-02-10_18-42-05
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

  // iOS/Android対策で DOM に挿してクリック
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast("バックアップを書き出しました", "success");
}

// ===== 右スライドメニュー（UIだけ）=====
(function setupSlideMenu(){
  const btn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("menuCloseBtn");
  const panel = document.getElementById("menuPanel");
  const overlay = document.getElementById("menuOverlay");
  if (!btn || !panel || !overlay || !closeBtn) return;

  const open = () => {
    overlay.hidden = false;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
  };

  const exportBtn = document.getElementById("btnExport");
exportBtn?.addEventListener("click", () => {
  exportBackup();
});

    // ===== import UI wiring =====
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

  setImportButtonsEnabled(false);
  setError("");

  fileEl?.addEventListener("change", async () => {
    setImportButtonsEnabled(false);
    setError("");
    pendingImport = null;

    const f = fileEl.files?.[0];
    if (!f) {
      setPreview(`<div class="import-muted">※ ここにプレビューが出るよ</div>`);
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

    // アプリ判定（違っても“警告”に留める）
    const isOurApp = parsed.meta.app === "snowboard-stance-memo" || parsed.meta.app === "";
    if (!isOurApp) {
      setError("このファイルは別アプリの可能性があるよ（復元はおすすめしない）");
    }

    const sum = summarizeItems(parsed.items);
    const boardsLine = sum.topBoards.length
      ? sum.topBoards.map(([b,c]) => `${escapeHtml(b)}（${c}）`).join(" / ")
      : "なし";

    setPreview(`
      <div><b>ファイル：</b>${escapeHtml(f.name)}</div>
      <div><b>件数：</b>${sum.count}</div>
      <div><b>期間：</b>${escapeHtml(sum.range)}</div>
      <div><b>板（上位）：</b>${boardsLine}</div>
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

      // id衝突したら新しいidを振る（安全に追加できる）
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
    showToast(`追加で復元しました（+${pendingImport.items.length}件）`, "success");
  });

  btnReplace?.addEventListener("click", () => {
    if (!pendingImport) return;

    const ok = confirm("⚠️ 上書きで復元するよ？（今のデータは消える）");
    if (!ok) return;

    localStorage.setItem(KEY, JSON.stringify(pendingImport.items));

    // UIも復元（上書き時のみ）
    if (pendingImport.ui && typeof pendingImport.ui === "object") {
      localStorage.setItem(UI_KEY, JSON.stringify(pendingImport.ui));
    }

    showToast("上書きで復元しました", "success");
    location.reload();
  });

  const close = () => {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
    // アニメ終わってから隠す
    setTimeout(() => { overlay.hidden = true; }, 220);
  };

  btn.addEventListener("click", () => {
    const isOpen = panel.classList.contains("open");
    isOpen ? close() : open();
  });

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);

  // Escで閉じる（PC用）
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) close();
  });
})();

function showToast(message, type = "info", time = 1600){
  const el = document.getElementById("toast");
  if (!el) return;

  el.textContent = message;

  // 色クラス全部リセット
  el.className = "";

  // 表示 + 色
  el.classList.add("show", type);

  setTimeout(() => {
    el.classList.remove("show", type);
  }, time);
}

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

  // ← ここがポイント（有効値だけ許可）
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

// v1(24個boolean) -> v2({left,right} index配列)
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

// v2({left,right}) -> v1(24個boolean)  ※UI表示用
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

// item.holes が v1でもv2でも 24boolean に揃える（表示・読込で使う）
function getHolesAsV1(item){
  const h = item?.holes;
  if (Array.isArray(h)) return h;                 // v1
  if (h && typeof h === "object") return holesV2ToV1(h); // v2
  return Array.from({length:24}, () => false);
}

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

  // devデータ削除
  btnReset?.addEventListener("click", () => {
    const ok = confirm("devのデータ（履歴・UI）を全部消すよ？");
    if (!ok) return;

    Object.keys(localStorage)
      .filter(k => k.startsWith("dev:"))
      .forEach(k => localStorage.removeItem(k));

    showToast("devデータを削除しました", "error");
    location.reload();
  });

  // 本番データ取り込み（?copyProd の代わり）
  btnCopy?.addEventListener("click", () => {
    const ok = confirm("本番データを dev にコピーするよ？（dev側は上書きされます）");
    if (!ok) return;

    // 本番キー候補：
    // 1) 旧方式（prefixなし） ← いま本番で使ってた可能性が高い
    // 2) 新方式（prod: prefix）
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
