document.querySelectorAll("#curriculum-vitae article").forEach((article) => {
  const titleRow = article.querySelector(".cv-title-row");

  const setOpen = (open) => {
    article.classList.toggle("is-open", open);
    titleRow.setAttribute("aria-expanded", open);
  };

  titleRow.tabIndex = 0;
  titleRow.setAttribute("role", "button");
  setOpen(false);

  titleRow.addEventListener("click", () => {
    setOpen(!article.classList.contains("is-open"));
  });

  titleRow.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(!article.classList.contains("is-open"));
    }
  });
});
