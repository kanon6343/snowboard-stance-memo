const KEY = "snowboard-history-v1";

const holes = [...document.querySelectorAll(".hole")];
const historyDiv = document.getElementById("history");

const boardEl = document.getElementById("board");
const snowEl = document.getElementById("snow");
const commentEl = document.getElementById("comment");
const leftAngleEl = document.getElementById("left-angle");
const rightAngleEl = document.getElementById("right-angle");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn"); // ← 追加
const tabsDiv = document.getElementById("boardTabs");

let selectedBoard = "__ALL__";

let favSortOn = true;      // ★を上にするON/OFF（初期はONでもOFFでもOK）
let sortMode = "savedDesc"; // メインソート（将来増やす）

const sortModeEl = document.getElementById("sortMode");
if (sortModeEl) {
  sortModeEl.value = sortMode; // ← 初期表示を合わせる
  sortModeEl.addEventListener("change", () => {
    sortMode = sortModeEl.value;
    showToast(`ソート：${sortModeEl.options[sortModeEl.selectedIndex].text}`, "info");
    render();
  });
}

let reference = { left: null, right: null };

let disk = { left: "", right: "" };

// 穴タップ
holes.forEach(h => h.addEventListener("click", () => h.classList.toggle("active")));

// ✅ クリア（保存の外に置く）
clearBtn.addEventListener("click", () => {
  boardEl.value = "";
  snowEl.value = "";
  commentEl.value = "";
  leftAngleEl.value = "";
  rightAngleEl.value = "";
  holes.forEach(h => h.classList.remove("active"));

  reference = { left: null, right: null };
  renderRefSlots();

  disk = { left: "", right: "" };
  renderDiskUI();
});

// 保存
saveBtn.addEventListener("click", () => {
  const item = {
    id: String(Date.now()),
    favorite: false,
    board: boardEl.value.trim(),
    snow: snowEl.value,
    comment: commentEl.value.trim(),
    leftAngle: leftAngleEl.value.trim(),
    rightAngle: rightAngleEl.value.trim(),
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
        showToast(
          favSortOn ? "★ソート：ON" : "★ソート：OFF",
          favSortOn ? "star" : "info"
        );
        render();
        return;
      }

      // それ以外は普通に絞り込み
      selectedBoard = board;
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

    line.innerHTML = Array.from({ length: 6 }, (_, i) =>
      `<div class="ref-slot" data-index="${i}" data-side="${side}"></div>`
    ).join("");

    // 保存済みを反映
    const idx = reference?.[side];

if (idx !== null && idx !== undefined) {
  const slot = line.querySelector(`.ref-slot[data-index="${idx}"]`);
  if (slot) {
    slot.classList.add("active");
    setHelpX(side, idx); // ← 実測に変更
  }
} else {
  setHelpX(side, null); // ← 消すときも実測版
}

    // クリック
    line.querySelectorAll(".ref-slot").forEach(slot => {
      slot.addEventListener("click", () => {
        line.querySelectorAll(".ref-slot").forEach(s => s.classList.remove("active"));
        slot.classList.add("active");

        const index = Number(slot.dataset.index);
        reference[side] = index;

        setHelpX(side, index);
      });
    });
  });
}

function render() {
  const all = loadList();

  /*
  const list =
  (selectedBoard === "__ALL__")
    ? all
    : all.filter(x => (x.board || "").trim() === selectedBoard);

  if (favSortOn) {
  list.sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite));
  }

  const cmpStr = (a, b) => String(a || "").localeCompare(String(b || ""), "ja");

// メインソート
switch (sortMode) {
  case "savedAsc":
    list.sort((a, b) => String(a.dateTime||"").localeCompare(String(b.dateTime||"")));
    break;

  case "savedDesc":
    list.sort((a, b) => String(b.dateTime||"").localeCompare(String(a.dateTime||"")));
    break;

  case "boardAsc":
    list.sort((a, b) => cmpStr(a.board, b.board));
    break;

  case "snowAsc":
    list.sort((a, b) => cmpStr(a.snow, b.snow));
    break;
}
*/

  // 文字比較（空は最後）
const cmpStr = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "ja");

const getTime = (x) => String(x?.dateTime || "");

// ★ + メインソート を合成
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
  historyDiv.querySelectorAll("button[data-load-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.loadId;
      const item = loadList().find(x => x.id === id);
      if (!item) return;

      boardEl.value = item.board || "";
      snowEl.value = item.snow || "";
      commentEl.value = item.comment || "";
      leftAngleEl.value = item.leftAngle || "";
      rightAngleEl.value = item.rightAngle || "";

      holes.forEach((h, i) => {
        h.classList.toggle("active", !!item.holes?.[i]);
      });

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

  return `
    <div class="mini-side">
      <div class="mini-label">${label}</div>

      <div class="mini-row">
        ${top.map(on => `<span class="mini-hole ${on ? "active" : ""}"></span>`).join("")}
      </div>

      <div class="mini-ref">
        ${Array.from({ length: 6 }, (_, i) =>
          `<span class="mini-x ${i === Number(refIndex) ? "active" : ""}">×</span>`
        ).join("")}
      </div>

      <div class="mini-row">
        ${bottom.map(on => `<span class="mini-hole ${on ? "active" : ""}"></span>`).join("")}
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
