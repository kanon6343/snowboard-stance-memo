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

let disk = { left: "", right: "" };

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

  disk = { left: "", right: "" };
  renderDiskUI();
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
    disk: { ...disk },
    holes: holes.map(h => h.classList.contains("active")),
    reference: { ...reference },

    dateTime: new Date().toISOString(),
  };

  const list = loadList();
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list));
  render();
});

document.querySelectorAll(".disk-group .chip").forEach(btn => {
  btn.addEventListener("click", () => {
    const group = btn.closest(".disk-group");
    const side = group.dataset.side;   // left / right
    const value = btn.dataset.value;   // 前/中/後

    // ★同じのをもう一回押したら解除
    if (disk[side] === value) {
      disk[side] = "";                // 解除（未選択にする）
    } else {
      disk[side] = value;             // 選択
    }

    renderDiskUI();                   // 見た目を更新
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
    const leftDisk = item.disk?.left || "";
    const rightDisk = item.disk?.right || "";

    const setupLine =
     `左 ${item.leftAngle || "?"}°  ${leftDisk}　右 ${item.rightAngle || "?"}°  ${rightDisk}`;

    card.innerHTML = `
  <div><b>${escapeHtml(title)}</b></div>
  <div>${escapeHtml(setupLine)}</div>

  <div class="history-preview">
    ${renderMini(item.holes || [], item.reference || { left: null, right: null })}
  </div>

  <div class="history-actions">
    <button type="button" class="btn-load" data-load-id="${item.id}">読込</button>
    <button type="button" class="btn-del" data-del-id="${item.id}">削除</button>
  </div>
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

    disk = item.disk || { left: "", right: "" };
    renderDiskUI();
    
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
