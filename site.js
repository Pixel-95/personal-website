document.documentElement.classList.add("js-enhanced");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const hashTarget = window.location.hash ? document.querySelector(window.location.hash) : null;

if (hashTarget) {
  document.documentElement.style.scrollBehavior = "auto";

  requestAnimationFrame(() => {
    hashTarget.scrollIntoView({
      block: "start",
    });
  });
}

const addMediaChangeListener = (mediaQuery, handler) => {
  if ("addEventListener" in mediaQuery) {
    mediaQuery.addEventListener("change", handler);
    return;
  }

  mediaQuery.addListener(handler);
};

const createFrameScheduler = (callback) => {
  let frameId = null;

  return () => {
    if (frameId !== null) {
      return;
    }

    frameId = requestAnimationFrame(() => {
      frameId = null;
      callback();
    });
  };
};

const initRevealObserver = () => {
  const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));

  if (!revealElements.length) {
    return;
  }

  revealElements.forEach((element, index) => {
    element.style.setProperty("--reveal-delay", `${Math.min(index * 90, 320)}ms`);
  });

  if (window.location.hash || prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.15,
    },
  );

  revealElements.forEach((element) => observer.observe(element));
};

const initCvAccordion = () => {
  const cvItems = Array.from(document.querySelectorAll("#curriculum-vitae .cv-item"));

  if (!cvItems.length) {
    return;
  }

  const setOpen = (item, open) => {
    const titleRow = item.querySelector(".cv-title-row");
    const panel = item.querySelector(".cv-panel");

    if (!titleRow || !panel) {
      return;
    }

    item.classList.toggle("is-open", open);
    titleRow.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  };

  cvItems.forEach((item, index) => {
    const titleRow = item.querySelector(".cv-title-row");
    const panel = item.querySelector(".cv-panel");

    if (!titleRow || !panel) {
      return;
    }

    const triggerId = `cv-trigger-${index + 1}`;
    const panelId = `cv-panel-${index + 1}`;

    titleRow.id = triggerId;
    titleRow.tabIndex = 0;
    titleRow.setAttribute("role", "button");
    titleRow.setAttribute("aria-controls", panelId);
    panel.id = panelId;
    panel.setAttribute("aria-labelledby", triggerId);
    setOpen(item, false);

    const toggle = () => {
      const nextState = !item.classList.contains("is-open");

      cvItems.forEach((candidate) => {
        setOpen(candidate, candidate === item ? nextState : false);
      });
    };

    titleRow.addEventListener("click", toggle);
    titleRow.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      toggle();
    });
  });
};

const initCvGlowState = () => {
  const cvSection = document.querySelector("#curriculum-vitae");
  const cvList = cvSection?.querySelector(".cv-list");

  if (!cvSection || !cvList) {
    return;
  }

  const glow = document.createElement("span");
  glow.className = "cv-glow-indicator";
  glow.setAttribute("aria-hidden", "true");
  document.body.append(glow);
  const mobileQuery = window.matchMedia("(max-width: 67.5rem)");

  const updateState = () => {
    const rect = cvSection.getBoundingClientRect();
    const listRect = cvList.getBoundingClientRect();
    const entersViewport = rect.top < window.innerHeight * 0.7;
    const leavesViewport = rect.bottom > window.innerHeight * 0.32;
    const railOffset = mobileQuery.matches ? 16 : listRect.width / 2;
    const viewportCenter = window.innerHeight / 2;
    const preferredHalfHeight = mobileQuery.matches
      ? Math.min(window.innerHeight * 0.16, 76)
      : Math.min(window.innerHeight * 0.2, 116);
    const clampedTop = Math.max(listRect.top, viewportCenter - preferredHalfHeight);
    const clampedBottom = Math.min(listRect.bottom, viewportCenter + preferredHalfHeight);
    const height = Math.max(0, clampedBottom - clampedTop);
    const active = entersViewport && leavesViewport && height > 4;

    glow.style.setProperty("--cv-glow-left", `${Math.round(listRect.left + railOffset)}px`);
    glow.style.setProperty("--cv-glow-top", `${Math.round(clampedTop)}px`);
    glow.style.setProperty("--cv-glow-height", `${Math.round(height)}px`);
    glow.classList.toggle("is-active", active);
    document.body.classList.toggle("cv-glow-active", active);
  };

  const scheduleUpdate = createFrameScheduler(updateState);

  updateState();
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  addMediaChangeListener(mobileQuery, scheduleUpdate);
};

const initSportsExperience = () => {
  const sportsStory = document.querySelector("[data-sports]");
  const sportsSection = sportsStory?.closest(".sports-section") ?? null;
  const panelsContainer = sportsStory?.querySelector("[data-sport-panels]");
  const panels = Array.from(sportsStory?.querySelectorAll("[data-sport-panel]") ?? []);
  const buttons = Array.from(sportsStory?.querySelectorAll("[data-sport-trigger]") ?? []);
  const dots = Array.from(sportsStory?.querySelectorAll(".sports-progress-dot") ?? []);

  if (!sportsStory || !sportsSection || !panelsContainer || !panels.length) {
    return;
  }

  const mobileQuery = window.matchMedia("(max-width: 67.5rem)");
  let activeIndex = 0;

  const setActive = (index) => {
    const nextIndex = Math.max(0, Math.min(index, panels.length - 1));

    if (nextIndex === activeIndex && sportsSection.dataset.activeSport) {
      return;
    }

    activeIndex = nextIndex;
    sportsSection.dataset.activeSport = String(activeIndex);
    sportsStory.dataset.activeSport = String(activeIndex);

    panels.forEach((panel, panelIndex) => {
      panel.classList.toggle("is-active", panelIndex === activeIndex);
    });

    buttons.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === activeIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
    });
  };

  const updateDesktopState = () => {
    if (mobileQuery.matches) {
      return;
    }

    const rect = sportsStory.getBoundingClientRect();
    const scrollRange = Math.max(sportsStory.offsetHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max((-rect.top) / scrollRange, 0), 0.9999);
    const nextIndex = Math.min(panels.length - 1, Math.floor(progress * panels.length));

    sportsSection.style.setProperty("--sports-progress", progress.toFixed(4));
    setActive(nextIndex);
  };

  const updateMobileState = () => {
    if (!mobileQuery.matches) {
      return;
    }

    const nextIndex = panels.reduce(
      (closest, panel, panelIndex) => {
        const distance = Math.abs(panel.offsetLeft - panelsContainer.scrollLeft);

        if (distance < closest.distance) {
          return {
            index: panelIndex,
            distance,
          };
        }

        return closest;
      },
      {
        index: 0,
        distance: Number.POSITIVE_INFINITY,
      },
    ).index;

    setActive(nextIndex);
  };

  const scheduleStateUpdate = createFrameScheduler(() => {
    if (mobileQuery.matches) {
      updateMobileState();
      return;
    }

    updateDesktopState();
  });

  const scrollToIndex = (index) => {
    if (mobileQuery.matches) {
      panelsContainer.scrollTo({
        left: panels[index].offsetLeft,
        behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      });
      setActive(index);
      return;
    }

    const storyTop = window.scrollY + sportsStory.getBoundingClientRect().top;
    const scrollRange = Math.max(sportsStory.offsetHeight - window.innerHeight, 1);
    const targetTop = storyTop + scrollRange * (index / Math.max(panels.length - 1, 1));

    window.scrollTo({
      top: targetTop,
      behavior: prefersReducedMotion.matches ? "auto" : "smooth",
    });
  };

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      scrollToIndex(index);
    });
  });

  panelsContainer.addEventListener("scroll", scheduleStateUpdate, { passive: true });
  window.addEventListener("scroll", scheduleStateUpdate, { passive: true });
  window.addEventListener("resize", scheduleStateUpdate);
  addMediaChangeListener(mobileQuery, scheduleStateUpdate);

  setActive(0);
  scheduleStateUpdate();
};

initRevealObserver();
initCvAccordion();
initCvGlowState();
initSportsExperience();
