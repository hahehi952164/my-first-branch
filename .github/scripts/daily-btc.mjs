import fs from 'node:fs';

const USER_AGENT = 'Mozilla/5.0 (compatible; DailyBitcoinNews/1.0)';
const REQUEST_TIMEOUT_MS = 10_000;

async function fetchJson(url, sourceName) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`${sourceName} returned HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`無法取得${sourceName}資料：${error.message}`);
    return null;
  }
}

function formatPrice(value, currency) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : null;
}

function readWealthData(fileContent) {
  const assignmentIndex = fileContent.indexOf('window.wealthData');
  if (assignmentIndex === -1) {
    throw new Error('wealth.js 入面搵唔到 window.wealthData');
  }

  const arrayStart = fileContent.indexOf('[', assignmentIndex);
  if (arrayStart === -1) {
    throw new Error('wealth.js 入面搵唔到文章陣列');
  }

  // 只解析 JSON 陣列，避免執行 wealth.js 入面任何程式碼。
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = arrayStart; index < fileContent.length; index += 1) {
    const character = fileContent[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === '[') {
      depth += 1;
    } else if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(fileContent.slice(arrayStart, index + 1));
      }
    }
  }

  throw new Error('wealth.js 入面嘅文章陣列格式唔完整');
}

async function run() {
  const priceUrls = {
    usd: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
    hkd: 'https://api.coinbase.com/v2/prices/BTC-HKD/spot',
    stats: 'https://api.exchange.coinbase.com/products/BTC-USD/stats'
  };
  const newsUrl = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

  const [usdData, hkdData, statsData, newsData] = await Promise.all([
    fetchJson(priceUrls.usd, 'Coinbase 美元價格'),
    fetchJson(priceUrls.hkd, 'Coinbase 港元價格'),
    fetchJson(priceUrls.stats, 'Coinbase 24 小時走勢'),
    fetchJson(newsUrl, 'CryptoCompare 新聞')
  ]);

  const usdPrice = formatPrice(usdData?.data?.amount, 'USD');
  const hkdPrice = formatPrice(hkdData?.data?.amount, 'HKD');
  const openPrice = Number(statsData?.open);
  const lastPrice = Number(statsData?.last);
  const change24h = Number.isFinite(openPrice) && openPrice > 0 && Number.isFinite(lastPrice)
    ? ((lastPrice - openPrice) / openPrice) * 100
    : null;
  const changeText = change24h === null ? '暫時未能取得' : `${Math.abs(change24h).toFixed(2)}%`;
  const trendEmoji = change24h === null ? '⏳ 走勢待更新' : change24h >= 0 ? '📈 升咗' : '📉 跌咗';
  const moodComment = change24h === null
    ? '暫時未能取得完整嘅 24 小時走勢，記得留意市場變化，做決定前保持冷靜。'
    : change24h >= 0
      ? '今日個市有啲起色，離發達大計又行近一步！不過記得保持冷靜，切忌盲目高追。'
      : '今日個市稍為回調，當係畀機會大家深呼吸、睇定啲先再算！';

  const newsItems = Array.isArray(newsData?.Data)
    ? newsData.Data
        .slice(0, 5)
        .map((item, index) => {
          const headline = typeof item?.title === 'string' ? item.title.trim() : '';
          return headline ? `${index + 1}. ${headline}` : null;
        })
        .filter(Boolean)
        .join('\n')
    : '';

  const today = new Date().toLocaleDateString('zh-HK', { timeZone: 'Asia/Hong_Kong' });
  const usdText = usdPrice ? `$${usdPrice} USD` : '暫時未能取得';
  const hkdText = hkdPrice ? `HK$${hkdPrice}` : '暫時未能取得';
  const title = `【${today}】Bitcoin 每日速報：現價 ${usdText}（24h ${changeText}）`;
  const description = `今日 BTC 現價約 ${usdText}（約 ${hkdText}），過去 24 小時${trendEmoji}${change24h === null ? '' : ` ${changeText}`}。`;
  const fullContent = `📊 今日市場數據速覽
• 美元現價：${usdText}
• 港元現價：約 ${hkdText}
• 24 小時走勢：${trendEmoji}${change24h === null ? '' : ` ${changeText}`}

💬 今日小點評
${moodComment}

📰 最新 Bitcoin 焦點新聞
${newsItems || '新聞源暫時未有回應，稍後再查看最新消息。'}`;

  const fileContent = fs.readFileSync('wealth.js', 'utf8');
  const wealthData = readWealthData(fileContent);
  if (!Array.isArray(wealthData)) {
    throw new Error('window.wealthData 必須係文章陣列');
  }

  wealthData.unshift({
    title,
    description,
    fullContent,
    tag: '每日自動速報',
    image: '',
    download: ''
  });

  const updatedCode = `// 「發達大計」資料（由 GitHub Actions 每日自動更新）\nwindow.wealthData = ${JSON.stringify(wealthData, null, 2)};\n`;
  fs.writeFileSync('wealth.js', updatedCode, 'utf8');
  console.log('成功更新今日 Bitcoin 速報並存回 wealth.js！');
}

run().catch(error => {
  console.error('更新 Bitcoin 速報失敗：', error);
  process.exitCode = 1;
});
