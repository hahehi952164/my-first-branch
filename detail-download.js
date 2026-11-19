(() => {
  const dataByPrefix = {
    idea: () => window.ideaData,
    favorite: () => window.collectionData,
    creation: () => window.creationData,
    wealth: () => window.wealthData
  };
  const buttonSelector = ".detail-download-link";
  const styleId = "detail-download-style";

  function renderDownload() {
    const detailContent = document.getElementById("detail-content");
    if (!detailContent) return;

    // Clear any button from the previous detail item before rendering the current one.
    detailContent.querySelectorAll(buttonSelector).forEach(button => button.remove());

    const match = window.location.hash.match(/^#(idea|favorite|creation|wealth)-(\d+)$/);
    if (!match) return;

    const item = dataByPrefix[match[1]]()?.[Number(match[2])];
    const path = item?.download || item?.file;
    if (typeof path !== "string" || !path.trim()) return;

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .detail-download-link{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;margin:.25rem 0 1.5rem;padding:.85rem 1.2rem;border:1px solid rgba(148,185,255,.55);border-radius:999px;background:linear-gradient(135deg,rgba(91,132,220,.3),rgba(75,197,201,.18));color:var(--text,#f4f7ff);font-weight:700;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.18);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
        .detail-download-link:hover{transform:translateY(-2px);border-color:var(--accent2,#87e2e4);box-shadow:0 12px 28px rgba(0,0,0,.25)}
        .detail-download-link:focus-visible{outline:3px solid var(--accent2,#87e2e4);outline-offset:3px}
      `;
      document.head.append(style);
    }

    const link = document.createElement("a");
    link.className = "detail-download-link";
    link.href = path.trim();
    link.setAttribute("download", "");
    link.textContent = item.downloadLabel || "📄 下載附件";

    const form = detailContent.querySelector(".detail-form-wrap");
    const body = detailContent.querySelector(".detail-text");
    if (form) detailContent.insertBefore(link, form);
    else if (body) body.insertAdjacentElement("afterend", link);
  }

  function scheduleRender(event) {
    if (event?.type === "click" && !event.target.closest("[data-detail]")) return;
    window.setTimeout(renderDownload, 80);
  }

  // The script is loaded at the end of the document, so render once for direct hash visits.
  renderDownload();
  window.addEventListener("load", renderDownload, { once: true });
  window.addEventListener("hashchange", renderDownload);
  window.addEventListener("popstate", renderDownload);
  document.addEventListener("click", scheduleRender);
})();
