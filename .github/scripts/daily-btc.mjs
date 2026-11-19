import fs from 'node:fs';

async function run() {
  // 1. 抓取免費嘅 Google News Bitcoin 最新新聞標題
  const rssUrl = 'https://google.com';
  const rssRes = await fetch(rssUrl);
  const xml = await rssRes.text();
  const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)]
    .slice(1, 7)
    .map(m => m[1].replace(/<!\[CDATA\[|\]\]>/g, ''))
    .join('\n- ');

  // 2. 呼叫 GitHub Models 免費 AI 撰寫香港廣東話市場觀察
  const prompt = `你係一位幽默又貼地嘅香港財經分析師。請根據以下今日最新嘅 Bitcoin 新聞標題，用繁體中文（香港廣東話口語風格）寫一篇約 250-350 字嘅『每日 Bitcoin 市場觀察』。
要求：
1. 第一行請直接寫出吸引人嘅文章標題（唔好加引號或 # 號）。
2. 空一行後，寫出 1 句約 30 字嘅簡短摘要。
3. 再空一行後，寫出完整分析內文（分段清晰）。

今日新聞標題：
- ${titles || 'Bitcoin 市場今日維持震盪走勢，投資者關注宏觀經濟數據。'}`;

  const aiRes = await fetch('https://github.ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });

  if (!aiRes.ok) {
    throw new Error(`AI API Error: ${aiRes.status} ${await aiRes.text()}`);
  }

  const aiData = await aiRes.json();
  const reply = aiData.choices[0].message.content.trim();
  const blocks = reply.split(/\n\s*\n/);

  const today = new Date().toLocaleDateString('zh-HK', { timeZone: 'Asia/Hong_Kong' });
  const rawTitle = (blocks[0] || 'Bitcoin 每日市場快訊').replace(/^[#*-\s]+/, '').trim();
  const summary = (blocks[1] || 'AI 為你總結今日最新加密貨幣市場動態。').trim();
  const fullContent = blocks.slice(2).join('\n\n').trim() || summary;

  // 3. 讀取現有 wealth.js 並將新文章插入最頂端
  const fileContent = fs.readFileSync('wealth.js', 'utf8');
  const match = fileContent.match(/window\.wealthData\s*=\s*(\[[\s\S]*\]);?/);
  let list = [];
  if (match && match[1]) {
    list = new Function(`return ${match[1]}`)();
  }

  list.unshift({
    title: `【${today}】${rawTitle}`,
    description: summary,
    fullContent: fullContent,
    tag: 'AI 每日財經',
    image: '',
    download: ''
  });

  const updatedCode = `// 「發達大計」資料（由 GitHub Actions AI 每日自動更新）\nwindow.wealthData = ${JSON.stringify(list, null, 2)};\n`;
  fs.writeFileSync('wealth.js', updatedCode, 'utf8');
  console.log('成功生成今日 Bitcoin 文章並更新 wealth.js！');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
