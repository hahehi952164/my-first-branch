(() => {
  'use strict';

  const start = () => {
    // The final navigation destination is the unnamed page (#unknown / #unnamed).
    const page = document.querySelector('#view-unknown, #unnamed') ||
      [...document.querySelectorAll('.view, section')].find((section) =>
        section.textContent.includes('這裡的故事還在醞釀中')
      );
    if (!page || page.querySelector('[data-inspiration-adventure]')) return;

    const style = document.createElement('style');
    style.textContent = `
      .adventure-card{--game-glow:rgba(135,226,228,.15);position:relative;overflow:hidden;margin:22px 0 34px;padding:clamp(22px,4vw,38px);border:1px solid var(--line);border-radius:24px;background:linear-gradient(140deg,var(--surface),var(--game-glow));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:var(--shadow);color:var(--text)}
      .adventure-card:before{content:"✦";position:absolute;right:24px;top:10px;font-size:4rem;color:var(--accent);opacity:.16;pointer-events:none}
      .adventure-card h2{margin:0 0 8px;font-size:clamp(1.45rem,3vw,2rem);color:var(--text)}
      .adventure-kicker{margin:0 0 8px;color:var(--accent);font-size:.82rem;font-weight:800;letter-spacing:.12em}
      .adventure-subtitle,.adventure-status{color:var(--muted)}
      .adventure-status{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}
      .adventure-stat{padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:var(--soft);font-size:.92rem}
      .adventure-story{min-height:120px;padding:20px;border:1px solid var(--line);border-radius:16px;background:var(--soft);line-height:1.9;white-space:pre-wrap;cursor:pointer}
      .adventure-hint{margin:8px 2px 0;color:var(--muted);font-size:.8rem}
      .adventure-choices{display:grid;gap:10px;margin:18px 0}
      .adventure-choice,.adventure-action{padding:12px 16px;border:1px solid var(--line);border-radius:12px;background:var(--soft);color:var(--text);font:inherit;text-align:left;transition:transform .18s ease,border-color .18s ease,background .18s ease}
      .adventure-choice:hover,.adventure-action:hover{transform:translateY(-2px);border-color:var(--accent);background:var(--game-glow)}
      .adventure-choice:focus-visible,.adventure-action:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
      .adventure-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
      .adventure-action{cursor:pointer;text-align:center}
      .adventure-ending{margin-top:12px;padding:12px 14px;border-left:3px solid var(--accent2);background:var(--soft);border-radius:0 10px 10px 0;font-weight:700}
      @media(prefers-reduced-motion:reduce){.adventure-choice,.adventure-action{transition:none}}
    `;
    document.head.append(style);

    const card = document.createElement('section');
    card.className = 'adventure-card';
    card.dataset.inspirationAdventure = '';
    card.setAttribute('aria-labelledby', 'adventure-title');
    card.innerHTML = `
      <p class="adventure-kicker">MIDNIGHT · 靈感收集所</p>
      <h2 id="adventure-title">探索未名之頁的秘密</h2>
      <p class="adventure-subtitle">深夜留低嘅念頭，可能正等緊你親手打開。</p>
      <div class="adventure-status" aria-live="polite"></div>
      <div class="adventure-story" role="button" tabindex="0" aria-label="點擊跳過打字動畫"></div>
      <p class="adventure-hint">故事慢慢浮現中；想快啲睇？點一下文字就得。</p>
      <div class="adventure-choices"></div>
      <div class="adventure-actions">
        <button class="adventure-action" type="button" data-action="restart">🔄 重新開始冒險</button>
        <button class="adventure-action" type="button" data-action="share" disabled>📋 複製結局分享</button>
      </div>`;
    page.append(card);

    const status = card.querySelector('.adventure-status');
    const story = card.querySelector('.adventure-story');
    const hint = card.querySelector('.adventure-hint');
    const choices = card.querySelector('.adventure-choices');
    const shareButton = card.querySelector('[data-action="share"]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let inspiration = 0;
    let curiosity = 0;
    let timer = null;
    let typewriter = null;
    let resultText = '';

    const scenes = {
      entry: { text: '凌晨 12 點 07 分，靈感收集所嘅燈明明熄晒，門縫卻漏出一線暖光。你推門入去，櫃檯上有張紙條：「如果你聽到紙頁呼吸，請跟住佢。」你會點做？', choices: [
        { label: '拎起紙條，仔細讀清楚', to: 'note', i: 1, c: 1 },
        { label: '跟住走廊盡頭嘅微光', to: 'hall', i: 0, c: 2 }
      ] },
      note: { text: '紙條背面有一個細細嘅月亮符號，仲有句手寫字：「未完成嘅事，唔代表失敗。」你心口暖咗一點，走廊深處傳來鐘聲。', choices: [
        { label: '帶住紙條，循聲去搵座鐘', to: 'clock', i: 1, c: 1 },
        { label: '將紙條放喺門邊，先入房間', to: 'room', i: 0, c: 0 }
      ] },
      hall: { text: '走廊兩側掛滿未寄出嘅信。每封信都寫住一個未講出口嘅願望。最盡頭有扇窄門，門牌寫住「秘密房間」。門旁嘅玻璃反映出一個比你早到嘅影。', choices: [
        { label: '先敲門，禮貌問一聲有人嗎', to: 'room', i: 1, c: 1 },
        { label: '望一望玻璃入面嘅影', to: 'mirror', i: 0, c: 2 }
      ] },
      clock: { text: '座鐘停喺 12:07，鐘擺卻仍然慢慢郁。你發現鐘面後面藏住一粒星形鈕扣；每行近一步，滴答聲就似有人喺另一個年代叫你個名。', choices: [
        { label: '拎起星形鈕扣，記住呢個時間', to: 'time', i: 1, c: 1 },
        { label: '將鐘擺輕輕推返正中', to: 'room', i: 1, c: 0 }
      ] },
      mirror: { text: '玻璃入面嘅影原來係你自己，只係眼神比平時更勇敢。佢用手指喺霧面寫低：「你一直想問嘅問題，答案可能係一個新問題。」霧氣散開，門鎖喀一聲打開。', choices: [
        { label: '記低呢句說話，再入房', to: 'room', i: 1, c: 2 },
        { label: '問鏡中嘅自己：你想守護乜嘢？', to: 'keeper', i: 2, c: 1 }
      ] },
      room: { text: '秘密房間入面，紙張像夜空咁浮喺半空。中央有張空白桌，桌上三樣嘢：未寫完嘅故事、倒轉行嘅懷錶，同一個封好嘅信封。你只可以先揀一樣。', choices: [
        { label: '打開未寫完嘅故事', to: 'story', i: 2, c: 1 },
        { label: '仔細研究倒轉行嘅懷錶', to: 'time', i: 1, c: 2 },
        { label: '拆開寫住自己名字嘅信封', to: 'secret', i: 1, c: 2 }
      ] },
      time: { text: '懷錶嘅指針突然倒流，房間一秒變成十年前嘅你寫低第一個夢想嘅夜晚。你明白時間唔係要你返去改寫，而係提醒你：嗰份好奇心一直都喺度。', choices: [
        { label: '帶住呢份提醒，走向天窗', to: 'sky', i: 1, c: 2 },
        { label: '將懷錶交畀房間嘅主人', to: 'keeper', i: 2, c: 0 }
      ] },
      story: { text: '故事第一句寫住：「有一個人，喺最安靜嘅時候，終於聽見自己。」你每讀一行，空白頁就多一點光。頁尾留住一格，等緊你寫下下一句。', choices: [
        { label: '寫下「我願意繼續試」', to: 'keeper', i: 3, c: 1 },
        { label: '留白，讓下一位訪客接住寫', to: 'sky', i: 1, c: 2 }
      ] },
      secret: { text: '信封裏面竟然係你未來某日寫畀自己嘅明信片：「多謝你冇急住變成答案。你問過嘅每個問題，都替世界開過一扇窗。」郵票上有個熟悉嘅月亮符號。', choices: [
        { label: '將明信片放入收藏盒', to: 'keeper', i: 2, c: 1 },
        { label: '循住月亮郵戳，走上天窗', to: 'sky', i: 1, c: 2 }
      ] },
      sky: { text: '天窗外沒有星星，只有一片靜靜發亮嘅空白。你聽見房間深處有人問：「你想將呢份靈感帶去邊度？」門口、鐘聲同紙條嘅光慢慢連成一條路。', choices: [
        { label: '留下來，替未完成嘅故事守夜', to: 'keeper', i: 2, c: 1 },
        { label: '踏入鐘面，去另一個時間看看', to: 'timeEnd', i: 1, c: 3 },
        { label: '追住月亮符號，尋找隱藏出口', to: 'secretEnd', i: 0, c: 3 }
      ] },
      keeper: { ending: '靈感守護者', text: '你把故事、紙條同未寄出嘅願望好好收起，沒有替任何人寫下答案。房間將一枚微光徽章交畀你：由今晚開始，你係靈感守護者。每一個未完成，都可以有再出發嘅一天。' },
      timeEnd: { ending: '時間旅人', text: '你踏進鐘面，走過往昔、此刻同尚未發生嘅日子。每段時間都留低一粒靈感種子，而你學識帶住好奇心穿梭其中。你成為時間旅人，永遠有新一頁可以翻開。' },
      secretEnd: { ending: '隱藏彩蛋結局', text: '月亮符號竟然係一個小小嘅「✦」！你喺牆後發現隱藏房間，入面放住一面寫滿訪客留言嘅星圖。最底一行寫住：「彩蛋只會送畀肯好奇到底嘅人。」恭喜解鎖隱藏彩蛋結局！' }
    };

    function updateStatus() {
      status.replaceChildren();
      [[`✨ 靈感值：${inspiration}`, inspiration], [`🔎 好奇心指數：${curiosity}`, curiosity]].forEach(([label, value]) => {
        const item = document.createElement('span');
        item.className = 'adventure-stat';
        item.textContent = `${label} · ${value}`;
        status.append(item);
      });
    }

    function finishTyping() {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      if (typewriter) story.textContent = typewriter;
      typewriter = null;
      story.setAttribute('aria-label', '故事文字；點擊可跳過動畫');
      hint.textContent = '選一個你想行嘅方向，故事就會繼續。';
    }

    function showScene(id) {
      const scene = scenes[id];
      if (!scene) return;
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      typewriter = scene.text;
      story.textContent = '';
      hint.textContent = reducedMotion ? '故事已顯示。' : '故事慢慢浮現中；想快啲睇？點一下文字就得。';
      choices.replaceChildren();
      if (scene.ending) {
        const ending = document.createElement('div');
        ending.className = 'adventure-ending';
        ending.textContent = `🏁 結局：${scene.ending}`;
        choices.append(ending);
        resultText = `《探索未名之頁的秘密》\n我解鎖咗「${scene.ending}」！\n靈感值：${inspiration}｜好奇心指數：${curiosity}\n你又會行入邊一個故事？`;
        shareButton.disabled = false;
      } else {
        scene.choices.forEach((choice) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'adventure-choice';
          button.textContent = choice.label;
          button.addEventListener('click', () => {
            inspiration += choice.i;
            curiosity += choice.c;
            updateStatus();
            showScene(choice.to);
          }, { once: true });
          choices.append(button);
        });
      }
      if (reducedMotion) {
        finishTyping();
      } else {
        let position = 0;
        const speed = 26;
        timer = window.setInterval(() => {
          position = Math.min(position + 2, typewriter.length);
          story.textContent = typewriter.slice(0, position);
          if (position >= typewriter.length) finishTyping();
        }, speed);
      }
    }

    function restart() {
      inspiration = 0;
      curiosity = 0;
      resultText = '';
      shareButton.disabled = true;
      updateStatus();
      showScene('entry');
    }

    async function copyResult() {
      if (!resultText) return;
      try {
        await navigator.clipboard.writeText(resultText);
      } catch (_) {
        const field = document.createElement('textarea');
        field.value = resultText;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.append(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      const original = '📋 複製結局分享';
      shareButton.textContent = '✅ 已複製，可以去留言啦！';
      window.setTimeout(() => { shareButton.textContent = original; }, 1800);
    }

    story.addEventListener('click', finishTyping);
    story.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        finishTyping();
      }
    });
    card.querySelector('[data-action="restart"]').addEventListener('click', restart);
    shareButton.addEventListener('click', copyResult);
    updateStatus();
    showScene('entry');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
