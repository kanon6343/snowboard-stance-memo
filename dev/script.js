const IS_DEV = location.pathname.includes("/dev/");
const KEY = IS_DEV ? "snowboard-history-dev-v1" : "snowboard-history-v1";
const UI_KEY = IS_DEV ? "snowboard-ui-dev-v1" : "snowboard-ui-v1";

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
    holes: holes.map(h => h.classList.contains("active")),
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

    holes.forEach((h, i) => {
      h.classList.toggle("active", !!item.holes?.[i]);
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
  const arr = Array.from({ length: total }, (_, i) => !!holesState[i]);
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
