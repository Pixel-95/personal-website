const setupTimelineAccordion = () => {
  const items = Array.from(document.querySelectorAll("[data-timeline-item]"));

  if (!items.length) {
    return;
  }

  const setActive = (nextItem) => {
    items.forEach((item) => {
      const isActive = item === nextItem;
      item.dataset.active = String(isActive);

      const trigger = item.querySelector("[data-timeline-trigger]");
      trigger?.setAttribute("aria-expanded", String(isActive));
    });
  };

  setActive(null);

  items.forEach((item) => {
    const trigger = item.querySelector("[data-timeline-trigger]");

    if (!trigger) {
      return;
    }

    trigger.addEventListener("click", () => {
      const isOpen = item.dataset.active === "true";
      setActive(isOpen ? null : item);
    });
  });
};

const setupSportsTabs = () => {
  const tabs = Array.from(document.querySelectorAll("[data-sport-tab]"));
  const images = Array.from(document.querySelectorAll("[data-sport-image]"));
  const copies = Array.from(document.querySelectorAll("[data-sport-copy]"));

  if (!tabs.length || !images.length || !copies.length) {
    return;
  }

  const setActive = (key) => {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.sportTab === key;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    images.forEach((image) => {
      image.classList.toggle("is-active", image.dataset.sportImage === key);
    });

    copies.forEach((copy) => {
      const isActive = copy.dataset.sportKey === key;
      copy.classList.toggle("is-active", isActive);
      copy.hidden = !isActive;
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      setActive(tab.dataset.sportTab);
    });

    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      event.preventDefault();

      const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (index + direction + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];

      nextTab.focus();
      setActive(nextTab.dataset.sportTab);
    });
  });

  setActive(tabs[0].dataset.sportTab);
};

setupTimelineAccordion();
setupSportsTabs();
