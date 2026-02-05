document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "snowboard-bindings";

  /* 穴クリック */
  document.querySelectorAll(".hole").forEach(hole => {
    hole.addEventListener("click", () => {
      hole.classList.toggle("active");
      saveData();
    });
  });

  /* input */
  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", saveData);
  });

  /* select */
  document.querySelectorAll("select").forEach(sel => {
    sel.addEventListener("change", saveData);
  });

  function saveData() {
    const data = {
      left: getBindData("left"),
      right: getBindData("right"),
      angles: {
        left: document.getElementById("left-angle")?.value || "",
        right: document.getElementById("right-angle")?.value || ""
      },
      meta: {
        board: document.getElementById("board-name")?.value || "",
        date: document.getElementById("ride-date")?.value || "",
        snow: document.getElementById("snow-type")?.value || ""
      }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

  function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    const data = JSON.parse(saved);

    restoreBind("left", data.left || []);
    restoreBind("right", data.right || []);

    if (data.angles) {
      document.getElementById("left-angle").value = data.angles.left || "";
      document.getElementById("right-angle").value = data.angles.right || "";
    }

    if (data.meta) {
      document.getElementById("board-name").value = data.meta.board || "";
      document.getElementById("ride-date").value = data.meta.date || "";
      document.getElementById("snow-type").value = data.meta.snow || "";
    }
  }

  loadData();
});
