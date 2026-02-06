const KEY = "snowboard-history-v1";

const holes = [...document.querySelectorAll(".hole")];
const historyDiv = document.getElementById("history");

const boardEl = document.getElementById("board");
const dateEl = document.getElementById("date");
const snowEl = document.getElementById("snow");
const leftAngleEl = document.getElementById("left-angle");
const rightAngleEl = document.getElementById("right-angle");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn"); // ← 追加
const tabsDiv = document.getElementById("boardTabs");
let selectedBoard = "";

// 穴タップ
holes.forEach(h => h.addEventListener("click", () => h.classList.toggle("active")));

// ✅ クリア（保存の外に置く）
clearBtn.addEventListener("click", () => {
  boardEl.value = "";
  dateEl.value = "";
  snowEl.value = "";
  leftAngleEl.value = "";
  rightAngleEl.value = "";
  holes.forEach(h => h.classList.remove("active"));
});

// 保存
saveBtn.addEventListener("click", () => {
  const item = {
    id: String(Date.now()),
    board: boardEl.value.trim(),
    date: dateEl.value,
    snow: snowEl.value,
    leftAngle: leftAngleEl.value.trim(),
    rightAngle: rightAngleEl.value.trim(),
    holes: holes.map(h => h.classList.contains("active"))
  };

  const list = loadList();
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list));
  render();
});

function loadList() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

function renderTabs() {
  const list = loadList();

  const boards = Array.from(
    new Set(list.map(x => (x.board || "").trim()).filter(Boolean))
  );

  const items = ["", ...boards];

  tabsDiv.innerHTML = items.map(b => {
    const label = b === "" ? "全部" : b;
    const active = b === selectedBoard ? "active" : "";
    return `<button type="button" class="tab ${active}" data-board="${escapeHtml(b)}">${escapeHtml(label)}</button>`;
  }).join("");

  tabsDiv.querySelectorAll("button.tab").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedBoard = btn.dataset.board || "";
      render();
    });
  });
}

function render() {
  const list = loadList();
  historyDiv.innerHTML = "";
  
  renderTabs();

  list.forEach((item, idx) => {
    const card = document.createElement("section");
    card.className = "card";

    const title = `${item.date || "日付なし"} / ${item.snow || "雪質なし"} / ${item.board || "板名なし"}`;
    const angles = `左 ${item.leftAngle || "?"}°　右 ${item.rightAngle || "?"}°`;

    card.innerHTML = `
      <div><b>${escapeHtml(title)}</b></div>
      <div>${escapeHtml(angles)}</div>

      <div class="history-preview">
        ${renderMini(item.holes || [])}
      </div>
      
      <button type="button" data-load="${idx}">読込</button>
      <button type="button" data-del="${idx}">削除</button>
    `;

    historyDiv.appendChild(card);
  });

  historyDiv.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.del);
      const list = loadList();
      list.splice(idx, 1);
      localStorage.setItem(KEY, JSON.stringify(list));
      render();
    });
  });

  historyDiv.querySelectorAll("button[data-load]").forEach(btn => {
  btn.addEventListener("click", () => {
    const idx = Number(btn.dataset.load);
    const item = loadList()[idx];
    if (!item) return;

    boardEl.value = item.board || "";
    dateEl.value = item.date || "";
    snowEl.value = item.snow || "";
    leftAngleEl.value = item.leftAngle || "";
    rightAngleEl.value = item.rightAngle || "";

    holes.forEach((h, i) => {
      h.classList.toggle("active", !!item.holes?.[i]);
    });
  });
});
  
}

function renderMini(holesState) {
  const total = 24;
  const arr = Array.from({ length: total }, (_, i) => !!holesState[i]);
  const left = arr.slice(0, 12);
  const right = arr.slice(12, 24);

  return `
    <div class="mini-bindings">
      ${miniSide("左", left)}
      ${miniSide("右", right)}
    </div>
  `;
}

function miniSide(label, sideArr) {
  const top = sideArr.slice(0, 6);
  const bottom = sideArr.slice(6, 12);

  return `
    <div class="mini-side">
      <div class="mini-label">${label}</div>
      <div class="mini-row">
        ${top.map(on => `<span class="mini-hole ${on ? "active" : ""}"></span>`).join("")}
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

render();
