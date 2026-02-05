document.querySelectorAll(".hole").forEach(hole => {
  hole.addEventListener("click", () => {
    hole.classList.toggle("active");
  });
});
