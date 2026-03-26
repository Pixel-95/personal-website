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

const HOME_INTRO_LEAD_IN_MS = 100;

// Edit these values to retime the home intro sequence.
const HOME_INTRO_TIMINGS = [
  { group: "media", delay: HOME_INTRO_LEAD_IN_MS, duration: 2000 },
  { group: "title", delay: 1000, duration: 2000 },
  { group: "body", delay: 1500, duration: 2000 },
];
const HOME_INTRO_TOTAL_DURATION = 2700;
const HOME_INTRO_IMAGE_WAIT_MS = 400;
const HOME_INTRO_STATE_CLASSES = [
  "home-intro-pending",
  "home-intro-playing",
  "home-intro-complete",
];
const HOME_INTRO_VISIBLE_CLASS = "is-intro-visible";

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

const initHomeIntro = () => {
  const body = document.body;

  if (!body.classList.contains("home-page")) {
    return;
  }

  const root = document.documentElement;
  const introElements = Array.from(document.querySelectorAll('[data-intro-group]:not([data-intro-group="page"])'));
  const heroPortrait = document.querySelector(".hero-portrait");
  let hasStarted = false;
  let isFinished = false;
  let startFrameId = null;
  const timeoutIds = new Set();

  const syncStateClass = (className, enabled) => {
    root.classList.toggle(className, enabled);
    body.classList.toggle(className, enabled);
  };

  const setState = ({ pending = false, playing = false, complete = false }) => {
    syncStateClass("home-intro-pending", pending);
    syncStateClass("home-intro-playing", playing);
    syncStateClass("home-intro-complete", complete);
  };

  const clearScheduled = () => {
    if (startFrameId !== null) {
      cancelAnimationFrame(startFrameId);
      startFrameId = null;
    }

    timeoutIds.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    timeoutIds.clear();
  };

  const scheduleTimeout = (callback, delay) => {
    const timeoutId = window.setTimeout(() => {
      timeoutIds.delete(timeoutId);
      callback();
    }, delay);

    timeoutIds.add(timeoutId);
  };

  const applyIntroTimings = () => {
    HOME_INTRO_TIMINGS.forEach(({ group, delay, duration }) => {
      introElements.forEach((element) => {
        if (element.dataset.introGroup !== group) {
          return;
        }

        element.style.setProperty("--intro-delay", `${delay}ms`);
        element.style.setProperty("--intro-duration", `${duration}ms`);
      });
    });
  };

  const revealAll = () => {
    introElements.forEach((element) => {
      element.classList.add(HOME_INTRO_VISIBLE_CLASS);
    });
  };

  const hideAll = () => {
    introElements.forEach((element) => {
      element.classList.remove(HOME_INTRO_VISIBLE_CLASS);
    });
  };

  const revealGroup = (groupName) => {
    introElements.forEach((element) => {
      if (element.dataset.introGroup === groupName) {
        element.classList.add(HOME_INTRO_VISIBLE_CLASS);
      }
    });
  };

  const finalize = () => {
    if (isFinished) {
      return;
    }

    isFinished = true;
    clearScheduled();
    revealAll();
    setState({ complete: true });
    window.dispatchEvent(new Event("home:intro-complete"));
  };

  const getInitialScrollOffset = () =>
    Math.max(window.scrollY, document.documentElement.scrollTop, document.body?.scrollTop ?? 0);

  const shouldSkipIntro = () =>
    prefersReducedMotion.matches
    || Boolean(window.location.hash)
    || getInitialScrollOffset() > 2
    || !root.classList.contains("home-intro-pending");

  if (!introElements.length) {
    HOME_INTRO_STATE_CLASSES.forEach((className) => {
      syncStateClass(className, false);
    });
    return;
  }

  applyIntroTimings();
  syncStateClass("home-intro-pending", root.classList.contains("home-intro-pending"));
  hideAll();

  if (shouldSkipIntro()) {
    finalize();
    return;
  }

  const startIntro = () => {
    if (hasStarted || isFinished) {
      return;
    }

    hasStarted = true;
    setState({ playing: true });
    startFrameId = requestAnimationFrame(() => {
      startFrameId = null;

      HOME_INTRO_TIMINGS.forEach(({ group, delay }) => {
        scheduleTimeout(() => {
          revealGroup(group);
        }, delay);
      });

      scheduleTimeout(finalize, HOME_INTRO_TOTAL_DURATION);
    });
  };

  const startWhenReady = () => {
    if (heroPortrait?.complete && heroPortrait.naturalWidth > 0) {
      startIntro();
      return;
    }

    if (!heroPortrait) {
      startIntro();
      return;
    }

    const handleReady = () => {
      heroPortrait.removeEventListener("load", handleReady);
      heroPortrait.removeEventListener("error", handleReady);
      startIntro();
    };

    heroPortrait.addEventListener("load", handleReady, { once: true });
    heroPortrait.addEventListener("error", handleReady, { once: true });
    scheduleTimeout(handleReady, HOME_INTRO_IMAGE_WAIT_MS);
  };

  window.addEventListener("pagehide", finalize);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      finalize();
    }
  });
  addMediaChangeListener(prefersReducedMotion, () => {
    if (prefersReducedMotion.matches) {
      finalize();
    }
  });

  startWhenReady();
};

const SUBPAGE_PRIMARY_NAV_ITEMS = [
  { key: "home", label: "Home", path: "" },
  { key: "projects", label: "Projects", path: "projects/" },
  { key: "contact", label: "Contact", path: "contact/" },
];

const SUBPAGE_LEGAL_NAV_ITEMS = [
  { key: "imprint", label: "Imprint", path: "imprint/" },
  { key: "privacy", label: "Privacy", path: "privacy/" },
];

const createShellNav = (items, currentKey, basePath, className, ariaLabel) => {
  const nav = document.createElement("nav");
  nav.className = className;
  nav.setAttribute("aria-label", ariaLabel);

  items.forEach((item) => {
    const link = document.createElement("a");
    link.href = `${basePath}${item.path}`;
    link.textContent = item.label;

    if (item.key === currentKey) {
      link.setAttribute("aria-current", "page");
    }

    nav.append(link);
  });

  return nav;
};

const initSubpageShell = () => {
  const body = document.body;

  if (!body.classList.contains("shell-page")) {
    return;
  }

  const basePath = body.dataset.basePath ?? "./";
  const primaryCurrent = body.dataset.primaryNav?.trim() ?? "";
  const legalCurrent = body.dataset.legalNav?.trim() ?? "";
  const header = document.querySelector("body > header");
  const footer = document.querySelector("body > footer");

  if (header) {
    header.classList.add("shell-header");

    if (!header.querySelector(".site-nav")) {
      header.replaceChildren(
        createShellNav(SUBPAGE_PRIMARY_NAV_ITEMS, primaryCurrent, basePath, "site-nav", "Primary"),
      );
    }
  }

  if (footer) {
    footer.classList.add("site-footer", "shell-footer");

    if (!footer.querySelector(".footer-nav")) {
      footer.replaceChildren(
        createShellNav(SUBPAGE_LEGAL_NAV_ITEMS, legalCurrent, basePath, "footer-nav", "Legal"),
      );
    }
  }
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
  const cvSection = cvList?.closest(".cv-section");
  const isHomePage = document.body.classList.contains("home-page");

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

  const markCvReady = () => {
    cvList?.classList.add("is-ready");
    cvSection?.classList.add("is-ready");
  };

  if (!isHomePage || document.documentElement.classList.contains("home-intro-complete")) {
    markCvReady();
    return;
  }

  window.addEventListener("home:intro-complete", markCvReady, { once: true });
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

initHomeIntro();
initSubpageShell();
initTechStackMarquee();
initCvAccordion();
initCvGlowState();
