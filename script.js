const KEY = "snowboard-history";

const holes = document.querySelectorAll(".hole");
const historyDiv = document.getElementById("history");

holes.forEach(h => {
  h.addEventListener("click", () => {
    h.classList.toggle("active");
  });
});

document.getElementById("saveBtn").onclick = () => {
  const data = {
    board: board.value,
    date: date.value,
    snow: snow.value,
    leftAngle: leftAngle.value,
    rightAngle: rightAngle.value,
    holes: [...holes].map(h => h.classList.contains("active"))
  };

  const list = JSON.parse(localStorage.getItem(KEY) || "[]");
  list.unshift(data);

  localStorage.setItem(KEY, JSON.stringify(list));

  render();
};

function render() {
  historyDiv.innerHTML = "";

  const list = JSON.parse(localStorage.getItem(KEY) || "[]");

  list.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <b>${item.date} / ${item.snow} / ${item.board}</b><br>
      左 ${item.leftAngle}°　右 ${item.rightAngle}°
    `;

    historyDiv.appendChild(card);
  });
}

render();
