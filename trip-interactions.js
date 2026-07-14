(function () {
  function makeLegPart(type, text) {
    const part = document.createElement("span");
    part.className = "leg-part";
    part.dataset.type = type;
    part.textContent = text.trim().replace(/^~\s*/, "");
    return part;
  }

  function enhanceLeg(leg) {
    const text = leg.textContent.trim();
    if (!text || leg.dataset.enhanced === "true") return;

    const pieces = text.split("|").map((piece) => piece.trim()).filter(Boolean);
    const parts = [];

    if (pieces.length) {
      const first = pieces.shift();
      const colonIndex = first.indexOf(":");

      if (colonIndex > -1) {
        const route = first.slice(0, colonIndex + 1);
        const distance = first.slice(colonIndex + 1);
        if (route.trim()) parts.push(makeLegPart("route", route));
        if (distance.trim()) parts.push(makeLegPart("distance", distance));
      } else {
        parts.push(makeLegPart("route", first));
      }
    }

    pieces.forEach((piece) => {
      const lower = piece.toLowerCase();
      const type = lower.includes("km")
        ? "distance"
        : lower.includes("min") || lower.includes("hr")
          ? "duration"
          : lower.includes("am") || lower.includes("pm")
            ? "clock"
          : "route";
      parts.push(makeLegPart(type, piece));
    });

    leg.replaceChildren(...parts);
    leg.dataset.enhanced = "true";
  }

  function buildStopControls(stop) {
    const content = stop.querySelector("div");
    if (!content) return;

    const budget = stop.dataset.budget || "$0-0";
    const note = stop.dataset.budgetNote || "Budget estimate for this stop.";

    const meta = document.createElement("div");
    meta.className = "stop-meta";

    const budgetChip = document.createElement("button");
    budgetChip.className = "budget-chip";
    budgetChip.type = "button";
    budgetChip.textContent = budget;

    const detailButton = document.createElement("button");
    detailButton.className = "details-toggle";
    detailButton.type = "button";
    detailButton.setAttribute("aria-expanded", "false");
    detailButton.textContent = "Budget note";

    const detail = document.createElement("p");
    detail.className = "stop-detail";
    detail.hidden = true;
    detail.textContent = note;

    detailButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = stop.classList.toggle("is-open");
      detail.hidden = !isOpen;
      detailButton.setAttribute("aria-expanded", String(isOpen));
    });

    stop.addEventListener("click", (event) => {
      if (event.target.closest("a, button, label, select, option")) return;
      detailButton.click();
    });

    meta.append(budgetChip, detailButton);
    content.append(meta, detail);
  }

  function syncCutoutBackgrounds() {
    const legs = Array.from(document.querySelectorAll(".leg"));
    if (!legs.length) return;

    const image = new Image();
    let ticking = false;

    function update() {
      ticking = false;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scale = Math.max(viewportWidth / image.naturalWidth, viewportHeight / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const left = (viewportWidth - width) / 2;
      const top = (viewportHeight - height) / 2;

      legs.forEach((leg) => {
        const rect = leg.getBoundingClientRect();
        leg.style.setProperty("--cutout-bg-size", `${width}px ${height}px`);
        leg.style.setProperty("--cutout-bg-position", `${left - rect.left}px ${top - rect.top}px`);
        leg.style.setProperty("--cutout-bg-attachment", "scroll");
      });
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    image.addEventListener("load", () => {
      update();
      window.addEventListener("scroll", requestUpdate, { passive: true });
      window.addEventListener("resize", requestUpdate);
      window.addEventListener("orientationchange", requestUpdate);
    });

    image.src = "image/background-image.webp";
  }

  function init() {
    document.querySelectorAll(".leg").forEach(enhanceLeg);
    syncCutoutBackgrounds();

    document.querySelectorAll(".stop").forEach((stop) => {
      buildStopControls(stop);
    });

    document.querySelectorAll(".return-card").forEach((card) => {
      const picker = card.querySelector("select");
      const options = card.querySelectorAll("[data-return-option]");
      if (!picker || !options.length) return;

      picker.addEventListener("change", () => {
        options.forEach((option) => {
          const isSelected = option.dataset.returnOption === picker.value;
          option.hidden = !isSelected;
          option.classList.toggle("is-active", isSelected);
        });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
