const KEY = "snowboard-left-right";

document.querySelectorAll(".hole").forEach(hole => {
  hole.addEventListener("click", () => {
    hole.classList.toggle("active");
    save();
  });
});

function save() {
  const state = [];
  document.querySelectorAll(".hole").forEach(h => {
    state.push(h.classList.contains("active"));
  });
  localStorage.setItem(KEY, JSON.stringify(state));
}

function load() {
  const saved = localStorage.getItem(KEY);
  if (!saved) return;

  const state = JSON.parse(saved);
  document.querySelectorAll(".hole").forEach((h, i) => {
    if (state[i]) h.classList.add("active");
  });
}

load();
