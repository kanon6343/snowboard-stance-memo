const STORAGE_KEY = "snowboard-bindings";

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
    left: getBindData("left"),
    right: getBindData("right"),
    angles: {
      left: document.getElementById("left-angle").value,
      right: document.getElementById("right-angle").value
    }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

function getBindData(side) {
  const holes = [];
  document
    .querySelectorAll(`.holes[data-bind="${side}"] .hole.active`)
    .forEach(hole => {
      holes.push({
        row: hole.dataset.row,
        index: hole.dataset.index
      });
    });
  return holes;
}

function restoreBind(side, holes) {
  holes.forEach(h => {
    const el = document.querySelector(
      `.holes[data-bind="${side}"] .hole[data-row="${h.row}"][data-index="${h.index}"]`
    );
    if (el) el.classList.add("active");
  });
}

loadData();
document.getElementById("board-name").value = data.meta?.board || "";
document.getElementById("ride-date").value = data.meta?.date || "";
document.getElementById("snow-type").value = data.meta?.snow || "";
