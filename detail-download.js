(() => {
  const dataByPrefix = {
    idea: () => window.ideaData,
    favorite: () => window.collectionData,
    creation: () => window.creationData,
    wealth: () => window.wealthData
  };
  const selector = ".detail-download-link";
  const styleId = "detail-download-style";

  function renderDownload() {
    const detailContent = document.getElementById("detail-content");
    if (!detailContent) return;

    detailContent.querySelectorAll(selector).forEach(link => link.remove());

    const match = window.location.hash.match(/^#(idea|favorite|creation|wealth)-(\d+)$/);
    if (!match) return;

    const items = dataByPrefix[match[1]]();
    const item = items?.[Number(match[2])];
    const path = item?.download || item?.file;
    if (!path) return;

    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .detail-download-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .55rem;
          margin: .25rem 0 1.5rem;
          padding: .85rem 1.2rem;
          border: 1px solid rgba(148,185,255,.55);
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(91,132,220,.3), rgba(75,197,201,.18));
          color: var(--text, #f4f7ff);
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(0,0,0,.18);
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .detail-download-link:hover {
          transform: translateY(-2px);
          border-color: var(--accent2, #87e2e4);
          box-shadow: 0 12px 28px rgba(0,0,0,.25);
        }
        .detail-download-link:focus-visible { outline: 3px solid var(--accent2, #87e2e4); outline-offset: 3px; }
      `;
      document.head.append(style);
    }

    const link = document.createElement("a");
    link.className = "detail-download-link";
    link.href = path;
    link.setAttribute("download", "");
    link.textContent = item.downloadLabel || "📄 下載附件";

    const form = detailContent.querySelector(".detail-form-wrap");
    const body = detailContent.querySelector(".detail-text");
    if (form) detailContent.insertBefore(link, form);
    else if (body) body.insertAdjacentElement("afterend", link);
    else detailContent.append(link);
  }

  function renderAfterDetailUpdate() {
    window.setTimeout(renderDownload, 80);
  }

  window.addEventListener("load", renderDownload, { once: true });
  window.addEventListener("hashchange", renderAfterDetailUpdate);
  document.addEventListener("click", renderAfterDetailUpdate);

  // Covers direct visits to a detail hash when this script runs after page load.
  renderDownload();
})();
