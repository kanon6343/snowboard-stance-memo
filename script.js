const STORAGE_KEY = "snowboard-stance";

// 穴タップ
document.querySelectorAll(".hole").forEach(hole => {
  hole.addEventListener("click", () => {
    hole.classList.toggle("active");
    saveData();
  });
});

// 角度入力
document.querySelectorAll("input").forEach(input => {
  input.addEventListener("input", saveData);
});

// 保存
function saveData() {
  const data = {
    front: getFootData("front"),
    back: getFootData("back"),
    angles: {
      front: document.getElementById("front-angle").value,
      back: document.getElementById("back-angle").value
    }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

meta: {
  board: document.getElementById("board-name").value,
  date: document.getElementById("ride-date").value,
  snow: document.getElementById("snow-type").value
}

// 読み込み
function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  const data = JSON.parse(saved);

  restoreFoot("front", data.front);
  restoreFoot("back", data.back);

  document.getElementById("front-angle").value = data.angles.front || "";
  document.getElementById("back-angle").value = data.angles.back || "";
}

document.getElementById("board-name").value = data.meta?.board || "";
document.getElementById("ride-date").value = data.meta?.date || "";
document.getElementById("snow-type").value = data.meta?.snow || "";

function getFootData(foot) {
  const holes = [];
  document
    .querySelectorAll(`.holes[data-foot="${foot}"] .hole.active`)
    .forEach(hole => {
      holes.push({
        row: hole.dataset.row,
        index: hole.dataset.index
      });
    });
  return holes;
}

function restoreFoot(foot, holes) {
  holes.forEach(h => {
    const selector = `.holes[data-foot="${foot}"] .hole[data-row="${h.row}"][data-index="${h.index}"]`;
    const el = document.querySelector(selector);
    if (el) el.classList.add("active");
  });
}
document.querySelectorAll("select").forEach(sel => {
  sel.addEventListener("change", saveData);
});

loadData();
