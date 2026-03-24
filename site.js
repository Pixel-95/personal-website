document.documentElement.classList.add("js-enhanced");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const cvTimelineStackQuery = "(max-width: 67.5rem)";
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
  const marquee = document.querySelector("#tech-stack .stack-marquee");
  const marqueeInner = document.querySelector("#tech-stack .stack-marquee-inner");
  const sourceTrack = marqueeInner?.querySelector(".stack-track");

  if (!marquee || !marqueeInner || !sourceTrack) {
    return;
  }

  let clonedTrack = marqueeInner.querySelector('.stack-track[aria-hidden="true"]');

  if (!clonedTrack) {
    clonedTrack = sourceTrack.cloneNode(true);
    clonedTrack.setAttribute("aria-hidden", "true");
    marqueeInner.append(clonedTrack);
  }

  marqueeInner.classList.add("is-ready");

  const mobileQuery = window.matchMedia(cvTimelineStackQuery);
  let cycleLength = 0;
  let animationFrameId = null;
  let lastTimestamp = 0;
  let resumeTimeoutId = null;
  let isProgrammaticScroll = false;

  const getTrackGap = () => {
    const styles = window.getComputedStyle(marqueeInner);
    const gapValue = styles.columnGap !== "normal" ? styles.columnGap : styles.gap;
    return Number.parseFloat(gapValue) || 0;
  };

  const measureCycleLength = () => {
    cycleLength = sourceTrack.getBoundingClientRect().width + getTrackGap();
  };

  const stopAutoScroll = () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    lastTimestamp = 0;
  };

  const clearResumeTimeout = () => {
    if (resumeTimeoutId !== null) {
      clearTimeout(resumeTimeoutId);
      resumeTimeoutId = null;
    }
  };

  const normalizeScrollPosition = () => {
    if (!mobileQuery.matches || cycleLength <= 0) {
      return;
    }

    let nextScrollLeft = marquee.scrollLeft;

    while (nextScrollLeft >= cycleLength) {
      nextScrollLeft -= cycleLength;
    }

    while (nextScrollLeft < 0) {
      nextScrollLeft += cycleLength;
    }

    if (Math.abs(nextScrollLeft - marquee.scrollLeft) > 0.5) {
      isProgrammaticScroll = true;
      marquee.scrollLeft = nextScrollLeft;
    }
  };

  const step = (timestamp) => {
    if (!mobileQuery.matches || prefersReducedMotion.matches || cycleLength <= 0) {
      stopAutoScroll();
      return;
    }

    if (lastTimestamp === 0) {
      lastTimestamp = timestamp;
      animationFrameId = requestAnimationFrame(step);
      return;
    }

    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    isProgrammaticScroll = true;
    marquee.scrollLeft += (cycleLength / 34000) * delta;
    normalizeScrollPosition();
    animationFrameId = requestAnimationFrame(step);
  };

  const startAutoScroll = () => {
    measureCycleLength();

    if (!mobileQuery.matches || prefersReducedMotion.matches || cycleLength <= 0 || animationFrameId !== null) {
      return;
    }

    lastTimestamp = 0;
    animationFrameId = requestAnimationFrame(step);
  };

  const pauseAndResumeAutoScroll = () => {
    if (!mobileQuery.matches || prefersReducedMotion.matches) {
      return;
    }

    stopAutoScroll();
    clearResumeTimeout();
    resumeTimeoutId = window.setTimeout(() => {
      resumeTimeoutId = null;
      startAutoScroll();
    }, 1200);
  };

  const syncMarqueeMode = () => {
    stopAutoScroll();
    clearResumeTimeout();
    measureCycleLength();

    if (!mobileQuery.matches) {
      if (marquee.scrollLeft !== 0) {
        isProgrammaticScroll = true;
        marquee.scrollLeft = 0;
      }

      return;
    }

    normalizeScrollPosition();

    if (!prefersReducedMotion.matches) {
      startAutoScroll();
    }
  };

  const scheduleSyncMarqueeMode = createFrameScheduler(syncMarqueeMode);

  marquee.addEventListener("scroll", () => {
    if (!mobileQuery.matches) {
      return;
    }

    if (isProgrammaticScroll) {
      isProgrammaticScroll = false;
      return;
    }

    normalizeScrollPosition();
    pauseAndResumeAutoScroll();
  }, { passive: true });

  marquee.addEventListener("pointerdown", pauseAndResumeAutoScroll, { passive: true });
  marquee.addEventListener("touchstart", pauseAndResumeAutoScroll, { passive: true });
  marquee.addEventListener("wheel", pauseAndResumeAutoScroll, { passive: true });

  addMediaChangeListener(mobileQuery, syncMarqueeMode);
  addMediaChangeListener(prefersReducedMotion, syncMarqueeMode);
  window.addEventListener("resize", scheduleSyncMarqueeMode);
  syncMarqueeMode();
};

const CV_ENTRY_TYPES = {
  work: {
    iconSrc: "assets/icons/icon_house_header.svg",
    iconAlt: "work",
  },
  education: {
    iconSrc: "assets/icons/icon_hat.svg",
    iconAlt: "education",
  },
  volunteer: {
    iconSrc: "assets/icons/icon_hand.svg",
    iconAlt: "charity",
  },
};

const splitCvDataList = (value, separator) =>
  (value ?? "")
    .split(separator)
    .map((entry) => entry.trim())
    .filter(Boolean);

const createCvImage = (src, alt, className) => {
  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.className = className;
  return image;
};

const appendClonedNodes = (target, source) => {
  Array.from(source.childNodes).forEach((node) => {
    target.append(node.cloneNode(true));
  });
};

const appendCvText = (element, value) => {
  const lines = splitCvDataList(value, "|");

  lines.forEach((line, index) => {
    if (index) {
      element.append(document.createElement("br"));
    }

    element.append(document.createTextNode(line));
  });
};

const appendCvContent = (target, value, source) => {
  if (source) {
    appendClonedNodes(target, source);
    return;
  }

  appendCvText(target, value);
};

const createCvMetaRow = (kind, iconSrc, iconAlt, value, source) => {
  const row = document.createElement("div");
  row.className = `cv-meta-row is-${kind}`;
  row.append(createCvImage(iconSrc, iconAlt, "cv-entry-picture"));

  const copy = document.createElement("p");
  appendCvContent(copy, value, source);
  row.append(copy);

  return row;
};

const renderCvItem = (item) => {
  if (item.querySelector(".cv-title-row") || item.querySelector(".cv-panel")) {
    return;
  }

  const entryType = CV_ENTRY_TYPES[item.dataset.entryType] ?? CV_ENTRY_TYPES.work;
  const title = item.dataset.title?.trim() ?? "";
  const company = item.dataset.company?.trim() ?? "";
  const date = item.dataset.date?.trim() ?? "";
  const location = item.dataset.location?.trim() ?? "";
  const titleSource = item.querySelector(":scope > .cv-item-title");
  const companySource = item.querySelector(":scope > .cv-item-company");
  const dateSource = item.querySelector(":scope > .cv-item-date");
  const locationSource = item.querySelector(":scope > .cv-item-location");
  const detailSource = item.querySelector(":scope > .cv-item-details");
  const details = detailSource
    ? Array.from(detailSource.querySelectorAll(":scope > li"))
        .map((detailItem) => detailItem.cloneNode(true))
    : splitCvDataList(item.dataset.details, "||");

  const titleRow = document.createElement("div");
  titleRow.className = "cv-title-row";

  const titleMain = document.createElement("div");
  titleMain.className = "cv-title-main";

  const iconBadge = document.createElement("span");
  iconBadge.className = "cv-icon-badge";
  iconBadge.append(createCvImage(entryType.iconSrc, entryType.iconAlt, "profile-picture"));

  const headingCopy = document.createElement("div");
  headingCopy.className = "cv-heading-copy";

  const heading = document.createElement("h3");
  appendCvContent(heading, title, titleSource);
  headingCopy.append(heading);

  const metaInline = document.createElement("div");
  metaInline.className = "cv-meta-inline";

  if (company || companySource) {
    metaInline.append(createCvMetaRow("company", "assets/icons/icon_house.svg", "house", company, companySource));
  }

  if (date || dateSource) {
    metaInline.append(createCvMetaRow("date", "assets/icons/icon_cal.svg", "calendar", date, dateSource));
  }

  if (metaInline.childElementCount) {
    headingCopy.append(metaInline);
  }

  titleMain.append(iconBadge, headingCopy);
  titleRow.append(titleMain);

  const panel = document.createElement("div");
  panel.className = "cv-panel";

  if (location || locationSource) {
    panel.append(createCvMetaRow("location", "assets/icons/icon_pin.svg", "pin", location, locationSource));
  }

  if (details.length) {
    const detailList = document.createElement("ul");

    details.forEach((detail) => {
      const detailItem = typeof detail === "string" ? document.createElement("li") : detail.cloneNode(true);

      if (typeof detail === "string") {
        detailItem.textContent = detail;
      }

      detailList.append(detailItem);
    });

    panel.append(detailList);
  }

  item.replaceChildren(titleRow, panel);
};

const preserveCvViewportPosition = (referenceElement, update) => {
  const initialTop = referenceElement.getBoundingClientRect().top;

  update();

  requestAnimationFrame(() => {
    const delta = referenceElement.getBoundingClientRect().top - initialTop;

    if (Math.abs(delta) > 0.5) {
      window.scrollBy(0, delta);
    }
  });
};

const withCvTransitionAnchorLock = (referenceElement, cvList, update) => {
  if (!referenceElement) {
    update();
    window.dispatchEvent(new Event("cv:layout"));
    return;
  }

  if (!cvList) {
    preserveCvViewportPosition(referenceElement, update);
    window.dispatchEvent(new Event("cv:layout"));
    return;
  }

  const initialTop = referenceElement.getBoundingClientRect().top;
  const syncAnchor = () => {
    const delta = referenceElement.getBoundingClientRect().top - initialTop;

    if (Math.abs(delta) > 0.5) {
      window.scrollBy(0, delta);
    }

    window.dispatchEvent(new Event("cv:layout"));
  };
  const scheduleSync = createFrameScheduler(syncAnchor);
  let resizeObserver = null;
  let cleanupTimeoutId = null;
  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) {
      return;
    }

    isCleanedUp = true;
    resizeObserver?.disconnect();
    cvList.removeEventListener("transitionend", handleTransitionEnd, true);

    if (cleanupTimeoutId !== null) {
      clearTimeout(cleanupTimeoutId);
    }

    scheduleSync();
  };

  const handleTransitionEnd = (event) => {
    if (!(event.target instanceof Element) || !event.target.classList.contains("cv-panel")) {
      return;
    }

    if (event.propertyName !== "grid-template-rows") {
      return;
    }

    cleanup();
  };

  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(() => {
      scheduleSync();
    });

    resizeObserver.observe(cvList);
  }

  cvList.addEventListener("transitionend", handleTransitionEnd, true);
  update();
  scheduleSync();
  cleanupTimeoutId = window.setTimeout(cleanup, 220);
};

const initCvAccordion = () => {
  const cvItems = Array.from(document.querySelectorAll("#curriculum-vitae .cv-item"));
  const cvList = document.querySelector("#curriculum-vitae .cv-list");

  if (!cvItems.length) {
    return;
  }

  cvItems.forEach(renderCvItem);

  cvItems.forEach((item) => {
    const panel = item.querySelector(".cv-panel");
    const titleRow = item.querySelector(".cv-title-row");
    const metaInline = item.querySelector(".cv-meta-inline");
    const locationRow = item.querySelector(".cv-panel .cv-meta-row.is-location");
    const companyIconPaths = (item.dataset.companyIcons ?? "")
      .split(",")
      .map((path) => path.trim())
      .filter(Boolean);

    item.classList.toggle("has-company-icons", companyIconPaths.length > 0);

    titleRow?.querySelector(".cv-company-icon-stack")?.remove();

    if (titleRow && companyIconPaths.length) {
      const iconStack = document.createElement("span");
      iconStack.className = "cv-company-icon-stack";
      iconStack.setAttribute("aria-hidden", "true");

      companyIconPaths.forEach((path) => {
        const iconBadge = document.createElement("span");
        iconBadge.className = "cv-company-icon-badge";

        const iconImage = document.createElement("img");
        iconImage.src = path;
        iconImage.alt = "";
        iconImage.className = "cv-company-icon-image";

        iconBadge.append(iconImage);
        iconStack.append(iconBadge);
      });

      titleRow.prepend(iconStack);
    }

    if (panel && !panel.querySelector(".cv-panel-inner")) {
      const panelInner = document.createElement("div");
      panelInner.className = "cv-panel-inner";

      while (panel.firstChild) {
        panelInner.append(panel.firstChild);
      }

      panel.append(panelInner);
    }

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
    panel.hidden = false;
    panel.setAttribute("aria-hidden", String(!open));
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
      withCvTransitionAnchorLock(titleRow, cvList, () => {
        const nextState = !item.classList.contains("is-open");

        cvItems.forEach((candidate) => {
          setOpen(candidate, candidate === item ? nextState : false);
        });
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
  const mobileQuery = window.matchMedia(cvTimelineStackQuery);

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
  window.addEventListener("cv:layout", scheduleUpdate);
  addMediaChangeListener(mobileQuery, scheduleUpdate);
};

initTechStackMarquee();
initCvAccordion();
initCvGlowState();
