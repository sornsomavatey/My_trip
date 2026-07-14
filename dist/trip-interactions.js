(function () {
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

  function init() {
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
