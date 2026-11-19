import fs from 'node:fs';

async function run() {
  // 1. 從 CoinGecko 免費抓取即時 Bitcoin 價格與 24 小時升跌幅
  const priceUrl = 'https://coingecko.com';
  const priceRes = await fetch(priceUrl);
  const priceData = await priceRes.json();
  const btc = priceData.bitcoin;

  const usdPrice = btc.usd.toLocaleString('en-US');
  const hkdPrice = btc.hkd.toLocaleString('en-US');
  const change24h = btc.usd_24h_change.toFixed(2);
  const trendEmoji = Number(change24h) >= 0 ? '📈 升咗' : '📉 跌咗';
  const moodComment = Number(change24h) >= 0
    ? '今日個市有啲起色，離發達大計又行近一步！不過記得保持冷靜，切忌盲目高追。'
    : '今日個市稍為回調，當係畀機會大家深呼吸、睇定啲先再算！';

  // 2. 從 Google News 抓取最新 Bitcoin 頭條新聞
  const rssUrl = 'https://google.com';
  const rssRes = await fetch(rssUrl);
  const xml = await rssRes.text();
  const newsItems = Array.from(xml.matchAll(/<title>(.*?)<\/title>/g))
    .slice(1, 6)
    .map((m, idx) => `${idx + 1}. ${m.at(1).replace(/<!\[CDATA\[|\]\]>/g, '')}`)
    .join('\n');

  const today = new Date().toLocaleDateString('zh-HK', { timeZone: 'Asia/Hong_Kong' });
  const title = `【${today}】Bitcoin 每日速報：現價 $${usdPrice} USD（24h ${change24h}%）`;
  const description = `今日 BTC 現價約 $${usdPrice} 美元（約 HK$${hkdPrice}），過去 24 小時${trendEmoji} ${Math.abs(change24h)}%。`;
  const fullContent = `📊 今日市場數據速覽
• 美元現價：$${usdPrice} USD
• 港元現價：約 HK$${hkdPrice}
• 24 小時走勢：${trendEmoji} ${Math.abs(change24h)}%

💬 今日小點評
${moodComment}

📰 過去 24 小時全球 Bitcoin 焦點新聞
${newsItems || '暫時未有最新突發新聞，市場平穩運行中。'}`;

  // 3. 讀取現有 wealth.js 並將新文章插入最頂端
  const fileContent = fs.readFileSync('wealth.js', 'utf8');
  const startIdx = fileContent.indexOf('[');
  const endIdx = fileContent.lastIndexOf(']');
  let list = [];
  if (startIdx !== -1 && endIdx !== -1) {
    const arrayText = fileContent.slice(startIdx, endIdx + 1);
    list = new Function(`return ${arrayText}`)();
  }

  list.unshift({
    title,
    description,
    fullContent,
    tag: '每日自動速報',
    image: '',
    download: ''
  });

  const updatedCode = `// 「發達大計」資料（由 GitHub Actions 每日自動更新）\nwindow.wealthData = ${JSON.stringify(list, null, 2)};\n`;
  fs.writeFileSync('wealth.js', updatedCode, 'utf8');
  console.log('成功抓取今日 Bitcoin 數據與新聞並更新 wealth.js！');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
