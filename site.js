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

const initTechStackMarquee = () => {
  const marqueeInner = document.querySelector("#tech-stack .stack-marquee-inner");
  const sourceTrack = marqueeInner?.querySelector(".stack-track");

  if (!marqueeInner || !sourceTrack) {
    return;
  }

  const existingClone = marqueeInner.querySelector('.stack-track[aria-hidden="true"]');

  if (!existingClone) {
    const clonedTrack = sourceTrack.cloneNode(true);
    clonedTrack.setAttribute("aria-hidden", "true");
    marqueeInner.append(clonedTrack);
  }

  marqueeInner.classList.add("is-ready");
};

const initCvAccordion = () => {
  const cvItems = Array.from(document.querySelectorAll("#curriculum-vitae .cv-item"));

  if (!cvItems.length) {
    return;
  }

  cvItems.forEach((item) => {
    const metaInline = item.querySelector(".cv-meta-inline");
    const locationRow = item.querySelector(".cv-panel .cv-meta-row.is-location");

    if (!metaInline || !locationRow) {
      return;
    }

    metaInline.append(locationRow);
  });

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

initTechStackMarquee();
initCvAccordion();
initCvGlowState();
