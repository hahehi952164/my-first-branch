import fs from 'node:fs';
import vm from 'node:vm';

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

async function fetchText(url, sourceName) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`${sourceName} returned HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.warn(`無法取得${sourceName}資料：${error.message}`);
    return null;
  }
}

function formatPrice(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : null;
}

function extractArrayLiteral(fileContent) {
  const assignmentIndex = fileContent.indexOf('window.wealthData');
  if (assignmentIndex === -1) {
    throw new Error('wealth.js 入面搵唔到 window.wealthData');
  }

  const arrayStart = fileContent.indexOf('[', assignmentIndex);
  if (arrayStart === -1) {
    throw new Error('wealth.js 入面搵唔到文章陣列');
  }

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = arrayStart; index < fileContent.length; index += 1) {
    const character = fileContent[index];

    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
    } else if (character === '[') {
      depth += 1;
    } else if (character === ']') {
      depth -= 1;
      if (depth === 0) {
        return fileContent.slice(arrayStart, index + 1);
      }
    }
  }

  throw new Error('wealth.js 入面嘅文章陣列格式唔完整');
}

function readWealthData(fileContent) {
  // 只喺隔離 VM 評估抽出嘅陣列文字；VM 唔係安全邊界，故此唔執行整份 wealth.js。
  const arrayLiteral = extractArrayLiteral(fileContent);
  return vm.runInNewContext(`(${arrayLiteral})`, Object.create(null), { timeout: 1_000 });
}

function decodeXmlText(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function parseNewsTitles(xml) {
  if (!xml) return '';

  const titles = Array.from(xml.matchAll(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/gi))
    .map(match => decodeXmlText(match[1]))
    .filter(Boolean);

  // RSS 第一個 title 通常係 feed 名稱，唔係新聞項目。
  return titles
    .slice(1, 6)
    .map((headline, index) => `${index + 1}. ${headline}`)
    .join('\n');
}

async function run() {
  const priceUrls = {
    usd: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
    hkd: 'https://api.coinbase.com/v2/prices/BTC-HKD/spot',
    stats: 'https://api.exchange.coinbase.com/products/BTC-USD/stats'
  };
  const newsUrl = 'https://news.google.com/rss/search?q=Bitcoin&hl=en-US&gl=US&ceid=US:en';

  const [usdData, hkdData, statsData, newsXml] = await Promise.all([
    fetchJson(priceUrls.usd, 'Coinbase 美元價格'),
    fetchJson(priceUrls.hkd, 'Coinbase 港元價格'),
    fetchJson(priceUrls.stats, 'Coinbase 24 小時走勢'),
    fetchText(newsUrl, 'Google News 新聞')
  ]);

  const usdPrice = formatPrice(usdData?.data?.amount);
  const hkdPrice = formatPrice(hkdData?.data?.amount);
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
  const newsItems = parseNewsTitles(newsXml);

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

  const wealthData = readWealthData(fs.readFileSync('wealth.js', 'utf8'));
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
