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
let selectedBoard = "__ALL__";

let reference = { left: null, right: null };

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

  reference = { left: null, right: null };
renderRefSlots();
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
    holes: holes.map(h => h.classList.contains("active")),
    reference: { ...reference },

    dateTime: new Date().toISOString(),
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
    new Set(list.map(x => (x.board || "").trim()))
  );

  const items = ["__ALL__", ...boards];

  tabsDiv.innerHTML = items.map(b => {
    const label = b === "__ALL__" ? "全部" : (b === "" ? "未入力" : b);
    const active = b === selectedBoard ? "active" : "";
    return `<button type="button" class="tab ${active}" data-board="${escapeHtml(b)}">${escapeHtml(label)}</button>`;
  }).join("");

  tabsDiv.querySelectorAll("button.tab").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedBoard = btn.getAttribute("data-board")??"__ALL__";
      render();
    });
  });
}

function renderRefSlots() {
  // まず左右それぞれ6個のスロットを作る＋referenceを表示
  document.querySelectorAll(".ref-line").forEach(line => {
    const side = line.dataset.side;

    line.innerHTML = Array.from({ length: 6 }, (_, i) =>
      `<div class="ref-slot" data-index="${i}" data-side="${side}"></div>`
    ).join("");

    // ★ここで保存されているreferenceを反映して×を表示する
    const idx = reference?.[side];
    if (idx !== null && idx !== undefined) {
      const slot = line.querySelector(`.ref-slot[data-index="${idx}"]`);
      if (slot) slot.textContent = "×";
    }
  });

  // クリックで×移動＆reference更新
  document.querySelectorAll(".ref-slot").forEach(slot => {
    slot.addEventListener("click", () => {
      const parent = slot.parentElement;

      parent.querySelectorAll(".ref-slot").forEach(s => (s.textContent = ""));
      slot.textContent = "×";

      const side = slot.dataset.side;           // "left" or "right"
      const index = Number(slot.dataset.index); // 0〜5
      reference[side] = index;
    });
  });
}

function render() {
  const all = loadList();
  const list = (selectedBoard === "__ALL__")
  ? all
  : all.filter(x => (x.board || "").trim() === selectedBoard);
  historyDiv.innerHTML = "";
  
  renderTabs();
  renderRefSlots();

  list.forEach((item) => {
    const card = document.createElement("section");
    card.className = "card";

    const time = item.dateTime
  ? new Date(item.dateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  : "";
    
    const title = `${time ? time + " / " : ""}${item.date || "日付なし"} / ${item.snow || "雪質なし"} / ${item.board || "板名なし"}`;
    const angles = `左 ${item.leftAngle || "?"}°　右 ${item.rightAngle || "?"}°`;

    card.innerHTML = `
      <div><b>${escapeHtml(title)}</b></div>
      <div>${escapeHtml(angles)}</div>

      <div class="history-preview">
        ${renderMini(item.holes || [], item.reference || { left: null, right: null })}
      </div>
      
      <button type="button" data-load-id="${item.id}">読込</button>
      <button type="button" data-del-id="${item.id}">削除</button>
    `;

    historyDiv.appendChild(card);
  });

  historyDiv.querySelectorAll("button[data-del-id]").forEach(btn => {
   btn.addEventListener("click", () => {
    const id = btn.dataset.delId;
    const next = loadList().filter(x => x.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    render();
  });
});

  historyDiv.querySelectorAll("button[data-load-id]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.loadId;
    const item = loadList().find(x => x.id === id);
    if (!item) return;

    boardEl.value = item.board || "";
    dateEl.value = item.date || "";
    snowEl.value = item.snow || "";
    leftAngleEl.value = item.leftAngle || "";
    rightAngleEl.value = item.rightAngle || "";

    holes.forEach((h, i) => {
      h.classList.toggle("active", !!item.holes?.[i]);
    });

    // ×復元
    reference = item.reference || { left: null, right: null };
    renderRefSlots();
  });
});
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

render();
