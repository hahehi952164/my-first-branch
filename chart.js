(() => {
  const chartContainer = document.querySelector("#view-wealth .tradingview-widget-container");
  if (!chartContainer) return;

  function renderChart() {
    const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const params = new URLSearchParams({
      frameElementId: "tradingview_btcusd",
      symbol: "BITSTAMP:BTCUSD",
      interval: "D",
      hidesidetoolbar: "1",
      symboledit: "0",
      saveimage: "0",
      toolbarbg: theme === "light" ? "f1f3f6" : "0f172a",
      studies: "[]",
      theme,
      style: "1",
      timezone: "Asia/Hong_Kong",
      withdateranges: "1",
      hideideas: "1",
      hide_volume: "0",
      locale: "zh_TW",
      allow_symbol_change: "0",
      support_host: "https://www.tradingview.com"
    });
    const nextSrc = `https://www.tradingview.com/widgetembed/?${params.toString()}`;
    const widget = chartContainer.querySelector(".tradingview-widget-container__widget") || chartContainer;
    let iframe = widget.querySelector("iframe");

    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.title = "TradingView BTCUSD chart";
      iframe.width = "100%";
      iframe.height = "420";
      iframe.setAttribute("frameborder", "0");
      iframe.setAttribute("allowtransparency", "true");
      iframe.setAttribute("scrolling", "no");
      iframe.style.cssText = "display:block;width:100%;height:420px;border:0;border-radius:16px;";
      iframe.loading = "lazy";
      widget.replaceChildren(iframe);
    }

    chartContainer.style.cssText = "width:100%;height:420px;overflow:hidden;border-radius:16px;";
    if (iframe.src !== nextSrc) iframe.src = nextSrc;
    iframe.dataset.theme = theme;
  }

  // Expose an idempotent renderer for the page's navigation/theme controls.
  window.renderTradingViewChart = renderChart;
  window.renderTradingViewChartChart = renderChart;
  renderChart();
})();
