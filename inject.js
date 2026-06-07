(function () {
  'use strict';

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var DISCLAIMER_TEXT = '本内容基于传统文化意象整理，仅供自我观照与娱乐参考，不构成现实决策建议。';
  var DISCLAIMER_HTML = '<p class="wx-disclaimer">' + DISCLAIMER_TEXT + '</p>';

  // 将 React 渲染的 .disclaimer 元素文字替换为统一版本
  function updateDisclaimers() {
    document.querySelectorAll('.disclaimer').forEach(function (el) {
      if (el.textContent !== DISCLAIMER_TEXT) {
        el.textContent = DISCLAIMER_TEXT;
      }
    });
  }

  // 向 React 渲染的屏幕容器底部追加声明（幂等）
  function injectDisclaimer(containerSelector) {
    var container = document.querySelector(containerSelector);
    if (!container || container.querySelector('.wx-disclaimer')) return;
    var p = document.createElement('p');
    p.className = 'wx-disclaimer';
    p.textContent = DISCLAIMER_TEXT;
    container.appendChild(p);
  }

  var stemsData = null;

  function loadStemsData(cb) {
    if (stemsData) { cb(stemsData); return; }
    fetch('/data/stems.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { stemsData = data; cb(stemsData); })
      .catch(function (e) { console.error('[inject] stems.json load failed', e); });
  }

  function getVitalityState() {
    var text = (document.querySelector('.vitality-info') || {}).textContent || '';
    if (text.indexOf('当令') !== -1) return '旺';
    if (text.indexOf('相休') !== -1) return '休';
    if (text.indexOf('被囚') !== -1) return '囚';
    return '旺';
  }

  function makeListHTML(items) {
    if (!Array.isArray(items) || !items.length) return '';
    return '<ul class="inject-list">' +
      items.map(function (item) { return '<li>' + item + '</li>'; }).join('') +
      '</ul>';
  }

  function makeParaHTML(text) {
    if (!text) return '';
    return text.split('\n').filter(Boolean).map(function (p) {
      return '<p class="inject-para">' + p + '</p>';
    }).join('');
  }

  var NEW_SECTIONS = [
    { key: 'core',          title: '核心画像' },
    { key: 'strengths',     title: '核心优势' },
    { key: 'growth',        title: '成长挑战' },
    { key: 'style',         title: '行事风格' },
    { key: 'directions',    title: '适合方向' },
    { key: 'misunderstood', title: '常见误解' },
    { key: 'words',         title: '给自己的一句话' }
  ];

  function injectReportContent() {
    var sections = document.querySelector('.sections');
    if (!sections) return;
    var stem = getStem();
    if (!stem) return;
    if (sections.dataset.injectedStem === stem) return;

    loadStemsData(function (data) {
      var sd = data[stem] || data['甲'];
      var vitality = getVitalityState();

      var html = NEW_SECTIONS.map(function (s) {
        var content = '';
        if (s.key === 'words') {
          var w = sd.words || {};
          var wText = w[vitality] || w['旺'] || '';
          content = '<div class="inject-words">' + wText + '</div>';
        } else {
          var val = sd[s.key];
          content = Array.isArray(val) ? makeListHTML(val) : makeParaHTML(String(val || ''));
        }
        return '<div class="section-item">' +
          '<div class="section-title">' + s.title + '</div>' +
          '<div class="section-desc">' + content + '</div>' +
          '</div>';
      }).join('');

      sections.innerHTML = html;
      sections.dataset.injectedStem = stem;
    });
  }

  const STEM_TO_BEAST = {
    '甲': '青龙',   // 甲 → 青龙
    '乙': '鹿蜀',   // 乙 → 鹿蜀
    '丙': '朱雀',   // 丙 → 朱雀
    '丁': '重明鸟', // 丁 → 重明鸟
    '戊': '麒麟',   // 戊 → 麒麟
    '己': '应龙',   // 己 → 应龙
    '庚': '白虎',   // 庚 → 白虎
    '辛': '白泽',   // 辛 → 白泽
    '壬': '玄武',   // 壬 → 玄武
    '癸': '烛龙'    // 癸 → 烛龙
  };

  const STEM_TO_ELEMENT = {
    '甲': '木', '乙': '木',
    '丙': '火', '丁': '火',
    '戊': '土', '己': '土',
    '庚': '金', '辛': '金',
    '壬': '水', '癸': '水'
  };

  // 日干计算：直接移植自 miniprogram/utils/bazi.js（相同算法，无修改）
  // 核心是 Julian Day Number + 标定偏移（2000-01-01=戊午）
  function calcTaDayStem(year, month, day) {
    var STEMS_LIST = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    var a = Math.floor((14 - month) / 12);
    var y = year + 4800 - a;
    var m = month + 12 * a - 3;
    var jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y +
              Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    var idx = ((jdn + 49) % 60 + 60) % 60;
    return STEMS_LIST[idx % 10];
  }

  const STEM_QUOTE = {
    '甲': '向上生长，也学会扎根。',
    '乙': '柔枝蟲根，缘光而长。',
    '丙': '烈焰有情，照彻四方。',
    '丁': '微光不息，守心自明。',
    '戊': '仁兽居中，厚德载物。',
    '己': '深谋潜渊，待时而化。',
    '庚': '一念既决，秋毫不差。',
    '辛': '温润见微，识者自明。',
    '壬': '不与人争，以柔御世。',
    '癸': '其瞟为夜，其视为昼。'
  };

  function getStem() {
    return document.querySelector('.stem-char')?.textContent?.trim() || null;
  }

  function getBeast(stem) {
    return STEM_TO_BEAST[stem] || null;
  }

  // ---- 目标一: 报告页顶部 IP 图 ----
  function injectReportIP() {
    const stem = getStem();
    if (!stem) return;
    const beast = getBeast(stem);
    if (!beast) return;

    const reportBody = document.querySelector('.report-body');
    if (!reportBody) return;

    let hero = document.querySelector('.beast-ip-hero');
    if (!hero) {
      hero = document.createElement('div');
      hero.className = 'beast-ip-hero';
      hero.innerHTML = '<img class="beast-ip-img" alt="">';
      reportBody.insertBefore(hero, reportBody.firstChild);

      // Hide the big title row
      const titleRow = document.querySelector('.report-title-row');
      if (titleRow) titleRow.style.display = 'none';

      // Hide decorative placeholder (replaced by real image)
      const placeholder = document.querySelector('.beast-ip-placeholder');
      if (placeholder) placeholder.style.display = 'none';

      const quote = document.querySelector('.report-quote');
      if (quote) quote.style.display = 'none';

      const badge = document.querySelector('.report-badge');
      if (badge) badge.style.display = 'none';

      // Reduce top padding in report-header
      const header = document.querySelector('.report-header');
      if (header) header.style.paddingTop = '12px';
    }

    const img = hero.querySelector('.beast-ip-img');
    if (img.dataset.beast !== beast) {
      img.src = '/images/ip/' + encodeURIComponent(beast) + '.png';
      img.dataset.beast = beast;
      img.alt = beast;
    }

    }

  // ---- 任务一: 跳过 loading 页，在首页等待 600-900ms 后直接进结果页 ----
  var skipLoading = false;

  function setupGenerateBtn() {
    // 找「生成我的五行画像」按钮（区别于「进入五行世界」btn-primary）
    var btns = document.querySelectorAll('.btn-primary');
    btns.forEach(function (btn) {
      if (btn._generateInject) return;
      if (btn.textContent.trim() !== '生成我的五行画像') return;
      btn._generateInject = true;

      var isGenerating = false;

      btn.addEventListener('click', function (e) {
        if (skipLoading) return; // 第二次点击（程序触发）放行给 React
        if (isGenerating) return; // 防止连击
        e.stopPropagation();

        isGenerating = true;
        btn.textContent = '正在生成…';
        btn.style.opacity = '0.55';
        btn.style.pointerEvents = 'none';

        var delay = 600 + Math.random() * 300; // 600-900ms
        setTimeout(function () {
          skipLoading = true; // 标记：下次点击放行，且触发 loading → result 快进
          isGenerating = false;
          btn.style.opacity = '';
          btn.style.pointerEvents = '';
          btn.click(); // 程序触发：让 React 完成计算 + d("loading")
        }, delay);
      });
    });
  }

  function skipLoadingScreen() {
    skipLoading = false;
    var loadingScreen = document.querySelector('.loading-screen-inner')
      ?.closest('.screen');
    var resultScreen = document.querySelector('.result-screen-inner')
      ?.closest('.screen');
    if (!loadingScreen || !resultScreen) return;
    loadingScreen.classList.remove('active');
    resultScreen.classList.add('active');
  }

  // ---- 屏幕互斥兜底：只在 React 已经完成状态切换后使用 ----
  function activateOnlyScreen(screenEl) {
    if (!screenEl) return;
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.toggle('active', s === screenEl);
      s.classList.remove('exit');
    });
  }

  function setupViewReportBtn() {
    var resultInner = document.querySelector('.result-screen-inner');
    var reportInner = document.querySelector('.report-screen-inner');
    if (!resultInner || !reportInner) return;

    var resultScreen = resultInner.closest('.screen');
    var reportScreen = reportInner.closest('.screen');
    if (!resultScreen || !reportScreen) return;

    var btns = resultInner.querySelectorAll('.btn-primary');
    btns.forEach(function (btn) {
      if (btn._viewReportInject) return;
      if (btn.textContent.trim() !== '查看专属报告') return;
      btn._viewReportInject = true;

      btn.addEventListener('click', function () {
        // 不拦截原始 React onClick，让应用自己的 state 进入 report。
        // 之后只做互斥显示兜底，避免旧 screen 留在文档流里。
        setTimeout(function () {
          if (reportScreen.classList.contains('active')) {
            activateOnlyScreen(reportScreen);
            onMutation();
          }
        }, 80);
      }, true);
    });
  }

  // ---- 目标二: 翻转卡片 ----
  let skipFlip = false;

  function setupFlipBtn() {
    const btn = document.querySelector('.world-guide .btn-primary');
    if (!btn || btn._flipInject) return;
    btn._flipInject = true;

    btn.addEventListener('click', function (e) {
      if (skipFlip) {
        skipFlip = false;
        return;
      }
      e.stopPropagation();
      showFlipCard(btn);
    });
  }

  function showFlipCard(originalBtn) {
    if (document.getElementById('flip-overlay')) return;

    const stem = getStem();
    const beast = getBeast(stem) || '';
    const primary = document.querySelector('.report-primary')?.textContent?.trim() || '';
    const sub = document.querySelector('.report-sub-text')?.textContent?.trim() || '';
    const quote = STEM_QUOTE[stem] || '';

    const overlay = document.createElement('div');
    overlay.id = 'flip-overlay';
    overlay.innerHTML =
      '<div class="flip-backdrop"></div>' +
      '<div class="flip-scene">' +
        '<div class="flip-card-inner">' +
          '<div class="flip-front">' +
            '<div class="flip-beast-name">' + beast + '</div>' +
            '<div class="flip-primary">' + primary + '</div>' +
            '<div class="flip-sub">' + sub + '</div>' +
            '<div class="flip-quote">' + quote + '</div>' +
            '<div class="flip-hint">点击翻面</div>' +
          '</div>' +
          '<div class="flip-back">' +
            '<img src="/images/card/' + encodeURIComponent(beast) + '.png" class="flip-bg-img" alt="' + beast + '">' +
            '<div class="flip-back-overlay"></div>' +
            '<button class="flip-enter-btn">进入五行世界</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('visible'); });

    var scene = overlay.querySelector('.flip-scene');
    var card = overlay.querySelector('.flip-card-inner');
    var backdrop = overlay.querySelector('.flip-backdrop');
    var enterBtn = overlay.querySelector('.flip-enter-btn');

    scene.addEventListener('click', function (e) {
      if (e.target.closest('.flip-enter-btn')) return;
      card.classList.toggle('flipped');
    });

    enterBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      overlay.remove();
      skipFlip = true;
      originalBtn.click();
      setTimeout(function () {
        var worldScreen = document.querySelector('.world-screen-inner')?.closest('.screen');
        if (worldScreen && worldScreen.classList.contains('active')) {
          activateOnlyScreen(worldScreen);
          onMutation();
        }
      }, 80);
    });

    backdrop.addEventListener('click', function () {
      overlay.remove();
    });
  }

  // ---- 目标三: 五行世界背景 ----
  function injectWorldBg() {
    const worldInner = document.querySelector('.world-screen-inner');
    if (!worldInner) return;

    const stem = getStem();
    if (!stem) return;
    const beast = getBeast(stem);
    if (!beast) return;

    let bgLayer = worldInner.querySelector('.world-bg-layer');
    if (!bgLayer) {
      bgLayer = document.createElement('div');
      bgLayer.className = 'world-bg-layer';
      worldInner.insertBefore(bgLayer, worldInner.firstChild);
      worldInner.classList.add('world-has-bg');
    }

    if (bgLayer.dataset.beast !== beast) {
      bgLayer.style.backgroundImage = 'url("/images/card/' + encodeURIComponent(beast) + '.png")';
      bgLayer.dataset.beast = beast;
    }
  }

  // ---- 你的五行宇宙（全屏独立界面，从五行世界页入口进入） ----
  var cosmosData = null;

  function loadCosmosData(cb) {
    if (cosmosData) { cb(cosmosData); return; }
    fetch('/data/cosmos.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { cosmosData = d; cb(d); })
      .catch(function (e) { console.error('[inject] cosmos.json load failed', e); });
  }

  function getElement() {
    return document.querySelector('.stem-elem')?.textContent?.trim() || null;
  }

  // 绑定五行世界页「你的五行宇宙」入口卡片
  function setupCosmosCard() {
    var cards = document.querySelectorAll('.entry-card');
    cards.forEach(function (card) {
      if (card._cosmosInjected) return;
      var titleEl = card.querySelector('.entry-title');
      if (!titleEl || titleEl.textContent.trim() !== '你的五行宇宙') return;
      card._cosmosInjected = true;
      card.style.cursor = 'pointer';
      card.addEventListener('click', function (e) {
        e.stopPropagation();
        var el = getElement();
        if (!el) return;
        loadCosmosData(function (data) {
          var d = data[el];
          if (d) showCosmosFullScreen(d);
        });
      });
    });
  }

  // 全屏宇宙详情页
  function showCosmosFullScreen(d) {
    if (document.getElementById('cosmos-fullscreen')) return;

    var fieldsHTML = d.fields.map(function (f) {
      return '<div class="cf-field">' +
        '<div class="cf-field-label">' + f.label + '</div>' +
        '<div class="cf-field-value">' + f.value + '</div>' +
        '</div>';
    }).join('');

    var parasHTML = d.paragraphs.map(function (p) {
      return '<p class="cf-para">' + p + '</p>';
    }).join('');

    var page = document.createElement('div');
    page.id = 'cosmos-fullscreen';
    page.innerHTML =
      '<div class="cf-topbar">' +
        '<button class="cf-back">← 返回</button>' +
        '<span class="cf-topbar-title">' + d.title + '</span>' +
      '</div>' +
      '<div class="cf-scroll">' +
        '<div class="cf-hero">' +
          '<div class="cf-hero-title">' + d.title + '</div>' +
          '<div class="cf-hero-sub">' + d.subtitle + '</div>' +
        '</div>' +
        '<div class="cf-grid">' + fieldsHTML + '</div>' +
        '<div class="cf-text">' + parasHTML + '</div>' +
        '<div class="cf-lit">' +
          '<span class="cf-lit-mark">❝</span>' +
          d.literature +
          '<span class="cf-lit-source">' + d.literature_source + '</span>' +
        '</div>' +
        DISCLAIMER_HTML +
      '</div>';

    document.body.appendChild(page);
    requestAnimationFrame(function () { page.classList.add('cf-visible'); });

    page.querySelector('.cf-back').addEventListener('click', function () {
      page.classList.remove('cf-visible');
      setTimeout(function () { page.remove(); }, 280);
    });
  }

  // ---- 你与世界·关系动力（全屏独立界面） ----
  var relationsData = null;
  var REL_KEYS = ['generated_by', 'generates', 'restrained_by', 'restrains'];
  var REL_TYPE = {
    generated_by: 'gen',
    generates:    'gen',
    restrained_by:'ten',
    restrains:    'ten'
  };

  function loadRelationsData(cb) {
    if (relationsData) { cb(relationsData); return; }
    fetch('/data/relations.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { relationsData = d; cb(d); })
      .catch(function (e) { console.error('[inject] relations.json load failed', e); });
  }

  var coupleRelationsData = null;
  function loadCoupleRelationsData(cb) {
    if (coupleRelationsData) { cb(coupleRelationsData); return; }
    fetch('/data/coupleRelations.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { coupleRelationsData = d; cb(d); })
      .catch(function (e) {
        console.error('[inject] coupleRelations.json load failed', e);
        cb(null);
      });
  }

  function setupRelationsCard() {
    var cards = document.querySelectorAll('.entry-card');
    cards.forEach(function (card) {
      if (card._relationsInjected) return;
      var titleEl = card.querySelector('.entry-title');
      if (!titleEl || titleEl.textContent.trim() !== '你与世界·关系动力') return;
      card._relationsInjected = true;
      card.style.cursor = 'pointer';
      card.addEventListener('click', function (e) {
        e.stopPropagation();
        var el = getElement();
        if (!el) return;
        loadRelationsData(function (data) {
          var d = data[el];
          if (d) showRelationsFullScreen(d, el);
        });
      });
    });
  }

  function showRelationsFullScreen(d, element) {
    if (document.getElementById('relations-fullscreen')) return;

    var cardsHTML = REL_KEYS.map(function (key) {
      var r = d[key];
      if (!r) return '';
      var beasts = r.target_beasts ? r.target_beasts.join(' / ') : '';
      var typeClass = REL_TYPE[key] || 'gen';
      return '<div class="rf-card rf-card--' + typeClass + '">' +
        '<div class="rf-card-top">' +
          '<span class="rf-label">' + r.label + '</span>' +
          '<span class="rf-element">' + r.target_element + '</span>' +
        '</div>' +
        '<div class="rf-beasts">' + beasts + '</div>' +
        '<p class="rf-text">' + r.text + '</p>' +
        '<div class="rf-card-text">❝ ' + r.card_text + '</div>' +
        '<div class="rf-lit">' + r.literature + '</div>' +
      '</div>';
    }).join('');

    var page = document.createElement('div');
    page.id = 'relations-fullscreen';
    page.innerHTML =
      '<div class="rf-topbar">' +
        '<button class="rf-back">← 返回</button>' +
        '<span class="rf-topbar-title">你与世界·关系动力</span>' +
      '</div>' +
      '<div class="rf-scroll">' +
        '<div class="rf-hero">' +
          '<div class="rf-hero-title">你的关系图景</div>' +
          '<div class="rf-hero-sub">' + element + ' · 与世界的四种连接</div>' +
        '</div>' +
        cardsHTML +
        DISCLAIMER_HTML +
      '</div>';

    document.body.appendChild(page);
    requestAnimationFrame(function () { page.classList.add('rf-visible'); });

    page.querySelector('.rf-back').addEventListener('click', function () {
      page.classList.remove('rf-visible');
      setTimeout(function () { page.remove(); }, 280);
    });
  }

  // ---- 人生节律（全屏独立界面） ----
  var lifecycleData = null;

  // 与主包相同的轻量节气表，复用同一逻辑，不引外部库
  var LC_MONTH_TERMS = [
    {m:1,  d:6,  branch:'丑'},
    {m:2,  d:4,  branch:'寅'},
    {m:3,  d:6,  branch:'卯'},
    {m:4,  d:5,  branch:'辰'},
    {m:5,  d:6,  branch:'巳'},
    {m:6,  d:6,  branch:'午'},
    {m:7,  d:7,  branch:'未'},
    {m:8,  d:8,  branch:'申'},
    {m:9,  d:8,  branch:'酉'},
    {m:10, d:8,  branch:'戌'},
    {m:11, d:7,  branch:'亥'},
    {m:12, d:7,  branch:'子'}
  ];
  var LC_SENSITIVE = ['病', '死', '葬', '衰病'];

  function getTodayMonthBranch() {
    var now   = new Date();
    var month = now.getMonth() + 1;
    var day   = now.getDate();
    var term  = {branch: '子'};               // 1 月小寒前，仍是上年子月
    for (var i = 0; i < LC_MONTH_TERMS.length; i++) {
      var t = LC_MONTH_TERMS[i];
      if (month > t.m || (month === t.m && day >= t.d)) term = t;
    }
    if (month === 1 && day < 6) term = {branch: '子'};
    return term.branch;
  }

  function loadLifecycleData(cb) {
    if (lifecycleData) { cb(lifecycleData); return; }
    fetch('/data/lifecycle.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { lifecycleData = d; cb(d); })
      .catch(function (e) { console.error('[inject] lifecycle.json load failed', e); });
  }

  function setupLifecycleCard() {
    var cards = document.querySelectorAll('.entry-card');
    cards.forEach(function (card) {
      if (card._lifecycleInjected) return;
      var titleEl = card.querySelector('.entry-title');
      if (!titleEl || titleEl.textContent.trim() !== '人生节律') return;
      card._lifecycleInjected = true;
      card.style.cursor = 'pointer';
      card.addEventListener('click', function (e) {
        e.stopPropagation();
        var el = getElement();
        if (!el) return;
        loadLifecycleData(function (data) {
          showLifecycleFullScreen(data, el);
        });
      });
    });
  }

  function showLifecycleFullScreen(data, element) {
    if (document.getElementById('lifecycle-fullscreen')) return;

    var todayBranch = getTodayMonthBranch();
    var elData      = data.elements[element] || {};
    var stages      = elData.stages || [];

    // 匹配今日月支 → 阶段
    var phase = '';
    for (var i = 0; i < stages.length; i++) {
      if (stages[i].branch === todayBranch) { phase = stages[i].phase; break; }
    }
    if (!phase && stages.length) phase = stages[0].phase;

    var pDef = (data.phase_definitions && data.phase_definitions[phase])
            || (data.special_phase_definitions && data.special_phase_definitions[phase])
            || {};
    var isSensitive = LC_SENSITIVE.indexOf(phase) !== -1;
    var meta = data.meta || {};

    // 敏感阶段：只展示声明
    var bodyHTML;
    if (isSensitive) {
      bodyHTML =
        '<div class="lf-phase-row">' +
          '<span class="lf-phase-modern">' + (pDef.modern_name || phase) + '</span>' +
          '<span class="lf-phase-original">' + phase + '</span>' +
        '</div>' +
        '<div class="lf-sensitive-note">' +
          '此处不敢妄议你的人生节律，故仅引原文，以作参照。你可自行体会，未来仍在你自己手中。' +
        '</div>';
    } else {
      bodyHTML =
        '<div class="lf-phase-row">' +
          '<span class="lf-phase-modern">' + (pDef.modern_name || phase) + '</span>' +
          '<span class="lf-phase-original">' + phase + '</span>' +
          (pDef.energy_level ? '<span class="lf-energy">' + pDef.energy_level + '</span>' : '') +
        '</div>' +
        (pDef.title ? '<div class="lf-phase-title">' + pDef.title + '</div>' : '') +
        (pDef.text  ? '<p class="lf-text">　　' + pDef.text  + '</p>' : '') +
        (pDef.advice? '<div class="lf-advice"><span class="lf-advice-label">此时适合</span>' + pDef.advice + '</div>' : '');
    }

    var page = document.createElement('div');
    page.id = 'lifecycle-fullscreen';
    page.innerHTML =
      '<div class="lf-topbar">' +
        '<button class="lf-back">← 返回</button>' +
        '<span class="lf-topbar-title">人生节律</span>' +
      '</div>' +
      '<div class="lf-scroll">' +
        '<div class="lf-hero">' +
          '<div class="lf-hero-title">你当前的节律</div>' +
          '<div class="lf-hero-sub">' + element + ' · 当前月支 ' + todayBranch + '</div>' +
          (elData.summary ? '<div class="lf-summary">' + elData.summary + '</div>' : '') +
        '</div>' +
        '<div class="lf-phase-block">' + bodyHTML + '</div>' +
        '<div class="lf-meta">' +
          '<div class="lf-meta-basis">' + (meta.basis || '') + '</div>' +
          '<div class="lf-meta-source">' + (meta.source_id || '') + ' · ' + (meta.usage_note || '') + '</div>' +
        '</div>' +
        DISCLAIMER_HTML +
      '</div>';

    document.body.appendChild(page);
    requestAnimationFrame(function () { page.classList.add('lf-visible'); });

    page.querySelector('.lf-back').addEventListener('click', function () {
      page.classList.remove('lf-visible');
      setTimeout(function () { page.remove(); }, 280);
    });
  }

  // ---- 报告页「分享人格卡片」（Canvas 合成版） ----

  function getPersonalityName() {
    return document.querySelector('.report-sub-text')?.textContent?.trim() || '';
  }

  function getReportQuote() {
    return document.querySelector('.report-quote')?.textContent?.trim() || '';
  }

  // 按字符换行（Canvas 无内置换行）
  function wrapTextChars(ctx, text, maxWidth) {
    var lines = [], line = '';
    for (var i = 0; i < text.length; i++) {
      var test = line + text[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = text[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function composePersonalityCanvas(stem, element, personalityName, beast, quote, cb) {
    var CW = 1080, CH = 1620; // 2:3

    loadImg('/images/ip/' + encodeURIComponent(beast) + '.png').then(function (ipImg) {
      if (!ipImg) {
        cb(null, '人格卡片生成失败，请检查图片路径：/images/ip/' + beast + '.png');
        return;
      }

      var canvas = document.createElement('canvas');
      canvas.width  = CW;
      canvas.height = CH;
      var ctx = canvas.getContext('2d');

      // ① 纸感底色
      ctx.fillStyle = '#f5f0e6';
      ctx.fillRect(0, 0, CW, CH);

      // ② 装饰金边框
      ctx.save();
      ctx.strokeStyle = 'rgba(196,160,72,0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, CW - 64, CH - 64);
      ctx.restore();

      // ③ 顶部小字「五行人格 · 人格卡」
      ctx.font = '500 30px "PingFang SC","Heiti SC",sans-serif';
      ctx.fillStyle = 'rgba(196,160,72,0.68)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('五行人格 · 人格卡', CW / 2, 80);

      // ④ IP 图：contain 居中，限制在 y=104 ~ y=990 区域
      var IZ_TOP = 104, IZ_H = 886, IZ_W = CW - 80, IZ_X = 40;
      var iw = ipImg.naturalWidth, ih = ipImg.naturalHeight;
      var scale = Math.min(IZ_W / iw, IZ_H / ih);
      var dw = iw * scale, dh = ih * scale;
      var dx = IZ_X + (IZ_W - dw) / 2;
      var dy = IZ_TOP + (IZ_H - dh) / 2;
      ctx.drawImage(ipImg, dx, dy, dw, dh);

      // ⑤ 分隔线
      var SEP_Y = IZ_TOP + IZ_H + 18;
      ctx.save();
      ctx.strokeStyle = 'rgba(196,160,72,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, SEP_Y); ctx.lineTo(CW - 80, SEP_Y);
      ctx.stroke();
      ctx.restore();

      // ⑥ 主标题：「甲木 · 破土者」
      var titleY = SEP_Y + 86;
      ctx.font = '600 54px "PingFang SC","Heiti SC",sans-serif';
      ctx.fillStyle = '#243f35';
      ctx.textAlign = 'center';
      var titleText = stem + element + (personalityName ? ' · ' + personalityName : '');
      ctx.fillText(titleText, CW / 2, titleY);

      // ⑦ 神兽名副标题
      var beastY = titleY + 66;
      ctx.font = '400 34px "PingFang SC","Heiti SC",sans-serif';
      ctx.fillStyle = '#4a7c6f';
      ctx.fillText(beast, CW / 2, beastY);

      // ⑧ 题跋短句（如有，自动换行）
      var curY = beastY + 56;
      if (quote) {
        ctx.font = '300 28px "PingFang SC","Heiti SC",serif';
        ctx.fillStyle = '#7a6a55';
        var qLines = wrapTextChars(ctx, quote, CW - 200);
        qLines.forEach(function (ln, i) {
          ctx.fillText(ln, CW / 2, curY + i * 46);
        });
        curY += qLines.length * 46 + 24;
      }

      // ⑨ 底部声明
      ctx.font = '300 24px "PingFang SC","Heiti SC",sans-serif';
      ctx.fillStyle = 'rgba(150,120,70,0.5)';
      ctx.fillText(DISCLAIMER_TEXT, CW / 2, CH - 58);

      try {
        cb(canvas.toDataURL('image/png'), null);
      } catch (err) {
        cb(null, '图片合成失败（可能存在跨域限制）');
      }
    });
  }

  function showPersonalityCard(stem, element, personalityName, beast, quote) {
    if (document.getElementById('personality-card-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'personality-card-overlay';
    overlay.innerHTML =
      '<div class="sc-close-row">' +
        '<button class="sc-close-btn">✕ 关闭</button>' +
        '<span class="sc-hint">长按图片保存</span>' +
      '</div>' +
      '<div class="sc-stage">' +
        '<div class="sc-loading">合成中…</div>' +
        '<img class="sc-result-img" alt="人格卡" style="display:none">' +
        '<div class="sc-error" style="display:none"></div>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('sc-visible'); });

    function closeOverlay() {
      overlay.classList.remove('sc-visible');
      setTimeout(function () { overlay.remove(); }, 250);
    }
    overlay.querySelector('.sc-close-btn').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay();
    });

    composePersonalityCanvas(stem, element, personalityName, beast, quote,
      function (dataUrl, errMsg) {
        var loadingEl = overlay.querySelector('.sc-loading');
        var imgEl     = overlay.querySelector('.sc-result-img');
        var errEl     = overlay.querySelector('.sc-error');
        loadingEl.style.display = 'none';
        if (errMsg) {
          errEl.textContent = errMsg;
          errEl.style.display = 'block';
        } else {
          imgEl.src = dataUrl;
          imgEl.style.display = 'block';
        }
      }
    );
  }

  function setupPersonalityShareBtn() {
    var btn = document.querySelector('.world-guide .btn-outline');
    if (!btn || btn._personalityShareInject) return;
    if (btn.textContent.indexOf('分享人格卡片') === -1) return;
    btn._personalityShareInject = true;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var stem            = getStem();
      var beast           = getBeast(stem) || '';
      var element         = getElement();
      var personalityName = getPersonalityName();
      var quote           = getReportQuote();
      showPersonalityCard(stem, element, personalityName, beast, quote);
    });
  }

  // ---- 保存结果（报告摘要长图，Canvas 合成版） ----

  function composeSummaryCanvas(stem, element, personalityName, beast, vitality, sd, cb) {
    var CW      = 1080;
    var PAD     = 64;          // 左右边距
    var IW      = CW - PAD * 2; // 952px 内容宽
    var BS      = 27;          // body font size
    var BLH     = 46;          // body line height

    var vMap      = { 旺: '当令', 休: '相休', 囚: '被囚' };
    var vDisplay  = element + '气' + (vMap[vitality] || '当令');
    var coreParas = (sd.core || '').split('\n').filter(Boolean).slice(0, 2);
    var strengths = (sd.strengths || []).slice(0, 4);
    var growth    = (sd.growth    || []).slice(0, 3);
    var quote     = (sd.words || {})[vitality] || (sd.words || {})['旺'] || '';

    // 大画布：先画内容，最后裁剪
    var canvas = document.createElement('canvas');
    canvas.width  = CW;
    canvas.height = 4000;
    var ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f5f0e6';
    ctx.fillRect(0, 0, CW, 4000);

    // ── 辅助函数 ────────────────────────────────────────
    function hline(y) {
      ctx.save();
      ctx.strokeStyle = 'rgba(196,160,72,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y); ctx.lineTo(CW - PAD, y);
      ctx.stroke();
      ctx.restore();
    }

    // 绘制段落，返回新 y
    function bodyText(text, x, y, maxW, color, fStyle) {
      ctx.font = (fStyle || '') + BS + 'px "PingFang SC","Heiti SC",sans-serif';
      ctx.fillStyle = color || '#5f5448';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      wrapTextChars(ctx, text, maxW).forEach(function (line) {
        ctx.fillText(line, x, y);
        y += BLH;
      });
      return y;
    }

    // 绘制小节标题，返回新 y
    function sectionTitle(title, y) {
      ctx.save();
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = 'rgba(196,160,72,0.75)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('◆', PAD, y - 1);
      ctx.restore();
      ctx.font = '600 29px "PingFang SC","Heiti SC",sans-serif';
      ctx.fillStyle = '#3d5545';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(title, PAD + 20, y);
      return y + 46;
    }

    // ── 开始绘制 ────────────────────────────────────────
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    var y = 96;

    // 页眉
    ctx.font = '600 42px "PingFang SC","Heiti SC",sans-serif';
    ctx.fillStyle = '#243f35';
    ctx.fillText('我的五行人格结果', CW / 2, y);
    y += 54;

    ctx.font = '400 23px "PingFang SC","Heiti SC",sans-serif';
    ctx.fillStyle = 'rgba(196,160,72,0.68)';
    ctx.fillText('五行人格 · 报告摘要', CW / 2, y);
    y += 52;

    hline(y); y += 58;

    // 人格身份
    ctx.font = '600 48px "PingFang SC","Heiti SC",sans-serif';
    ctx.fillStyle = '#243f35';
    ctx.fillText(stem + element + (personalityName ? ' · ' + personalityName : ''), CW / 2, y);
    y += 62;

    ctx.font = '400 33px "PingFang SC","Heiti SC",sans-serif';
    ctx.fillStyle = '#4a7c6f';
    ctx.fillText(beast, CW / 2, y);
    y += 48;

    ctx.font = '300 23px "PingFang SC","Heiti SC",sans-serif';
    ctx.fillStyle = '#9a8570';
    ctx.fillText('当前气质：' + vDisplay, CW / 2, y);
    y += 56;

    hline(y); y += 54;

    // 核心画像
    y = sectionTitle('核心画像', y);
    y += 10;
    coreParas.forEach(function (p) {
      y = bodyText(p, PAD, y, IW);
      y += 16;
    });
    y += 20;
    hline(y); y += 50;

    // 核心优势
    y = sectionTitle('核心优势', y);
    y += 10;
    strengths.forEach(function (s) {
      ctx.font = BS + 'px "PingFang SC","Heiti SC",sans-serif';
      ctx.fillStyle = 'rgba(196,160,72,0.65)';
      ctx.textAlign = 'left';
      ctx.fillText('—', PAD, y);
      y = bodyText(s, PAD + 36, y, IW - 36);
      y += 6;
    });
    y += 20;
    hline(y); y += 50;

    // 成长挑战
    y = sectionTitle('成长挑战', y);
    y += 10;
    growth.forEach(function (g) {
      ctx.font = BS + 'px "PingFang SC","Heiti SC",sans-serif';
      ctx.fillStyle = 'rgba(196,160,72,0.65)';
      ctx.textAlign = 'left';
      ctx.fillText('—', PAD, y);
      y = bodyText(g, PAD + 36, y, IW - 36);
      y += 6;
    });
    y += 20;
    hline(y); y += 50;

    // 给自己的一句话
    if (quote) {
      y = sectionTitle('给自己的一句话', y);
      y += 10;
      y = bodyText(quote, PAD, y, IW, '#7a6a55', '300 ');
      y += 28;
      hline(y); y += 50;
    }

    // 底部声明
    ctx.textAlign = 'center';
    ctx.font = '300 21px "PingFang SC","Heiti SC",sans-serif';
    ctx.fillStyle = 'rgba(150,120,70,0.42)';
    ctx.fillText(DISCLAIMER_TEXT, CW / 2, y);
    y += 60;

    // 金色装饰边框（裁剪后高度）
    var FH = y;
    ctx.save();
    ctx.strokeStyle = 'rgba(196,160,72,0.17)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(28, 28, CW - 56, FH - 28);
    ctx.restore();

    // 裁剪到实际内容高度
    var out = document.createElement('canvas');
    out.width  = CW;
    out.height = FH;
    out.getContext('2d').drawImage(canvas, 0, 0);

    try {
      cb(out.toDataURL('image/png'), null);
    } catch (err) {
      cb(null, '摘要图合成失败（可能存在跨域限制）');
    }
  }

  function showSummaryCard(stem, element, personalityName, beast, vitality, sd) {
    if (document.getElementById('summary-card-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'summary-card-overlay';
    overlay.innerHTML =
      '<div class="sc-close-row">' +
        '<button class="sc-close-btn">✕ 关闭</button>' +
        '<span class="sc-hint">长按图片保存</span>' +
      '</div>' +
      '<div class="sc-stage">' +
        '<div class="sc-loading">合成中…</div>' +
        '<img class="sc-result-img" alt="报告摘要" style="display:none">' +
        '<div class="sc-error" style="display:none"></div>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('sc-visible'); });

    function closeOverlay() {
      overlay.classList.remove('sc-visible');
      setTimeout(function () { overlay.remove(); }, 250);
    }
    overlay.querySelector('.sc-close-btn').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay();
    });

    composeSummaryCanvas(stem, element, personalityName, beast, vitality, sd,
      function (dataUrl, errMsg) {
        var loadingEl = overlay.querySelector('.sc-loading');
        var imgEl     = overlay.querySelector('.sc-result-img');
        var errEl     = overlay.querySelector('.sc-error');
        loadingEl.style.display = 'none';
        if (errMsg) {
          errEl.textContent = errMsg;
          errEl.style.display = 'block';
        } else {
          imgEl.src = dataUrl;
          imgEl.style.display = 'block';
        }
      }
    );
  }

  function setupSaveResultBtn() {
    var btn = document.querySelector('.report-bottom-bar .btn-bar-primary');
    if (!btn || btn._saveResultInject) return;
    if (btn.textContent.indexOf('保存结果') === -1) return;
    btn._saveResultInject = true;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var stem            = getStem();
      var beast           = getBeast(stem) || '';
      var element         = getElement();
      var personalityName = getPersonalityName();
      var vitality        = getVitalityState();

      loadStemsData(function (data) {
        var sd = data[stem] || {};
        showSummaryCard(stem, element, personalityName, beast, vitality, sd);
      });
    });
  }

  // ---- 分享神兽卡片（Canvas 合成版） ----
  function setupShareBtn() {
    // 移除之前注入的浅色边框按钮（如有残留）
    document.querySelectorAll('.share-beast-btn').forEach(function (el) { el.remove(); });

    // 绑定上方绿色大按钮：.world-btn-area .btn-primary（React 已渲染，文本「分享神兽卡片 ↑」）
    var greenBtn = document.querySelector('.world-btn-area .btn-primary');
    if (!greenBtn || greenBtn._shareInject) return;
    greenBtn._shareInject = true;

    greenBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var stem  = getStem();
      var beast = getBeast(stem) || '';
      showShareCard(beast);
    });
  }

  // Canvas 圆角矩形辅助（兼容不支持 roundRect 的浏览器）
  function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 加载图片，返回 Promise（不抛出，失败时 resolve null）
  function loadImg(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  // Canvas 合成分享图，cb(dataUrl | null, errMsg | null)
  function composeShareCanvas(beast, cb) {
    var CW = 1080, CH = 1920; // 9:16

    Promise.all([
      loadImg('/images/card/' + encodeURIComponent(beast) + '.png'),
      loadImg('/images/qrcode.png')
    ]).then(function (imgs) {
      var beastImg = imgs[0];
      var qrImg    = imgs[1];

      if (!beastImg) {
        cb(null, '分享图生成失败，请检查神兽图片路径：/images/card/' + beast + '.png');
        return;
      }

      var canvas = document.createElement('canvas');
      canvas.width  = CW;
      canvas.height = CH;
      var ctx = canvas.getContext('2d');

      // 1. 神兽底图铺满（cover）
      var bw = beastImg.naturalWidth, bh = beastImg.naturalHeight;
      var scale = Math.max(CW / bw, CH / bh);
      var sw = bw * scale, sh = bh * scale;
      var ox = (CW - sw) / 2, oy = (CH - sh) / 2;
      ctx.drawImage(beastImg, ox, oy, sw, sh);

      // 2. 左上角小标「五行人格 · 神兽卡」
      ctx.font = '500 38px "PingFang SC", "Heiti SC", sans-serif';
      ctx.fillStyle = 'rgba(245,240,232,0.65)';
      ctx.textAlign = 'left';
      ctx.fillText('五行人格 · 神兽卡', 52, 76);

      // 3. 右下角二维码区域布局
      var QR   = 200;   // 二维码尺寸
      var MGN  = 50;    // 卡片边距
      var BPD  = 20;    // 背景内边距
      var LBLH = 44;    // 文字行高

      var bgW  = BPD * 2 + QR;
      var bgH  = BPD * 3 + QR + LBLH;
      var bgX  = CW - MGN - bgW;
      var bgY  = CH - MGN - bgH;

      var qrX  = bgX + BPD;
      var qrY  = bgY + BPD;
      var lblCX = bgX + bgW / 2;
      var lblY  = qrY + QR + BPD + LBLH - 10; // 文字基线

      // 纸感底
      ctx.save();
      drawRoundRect(ctx, bgX, bgY, bgW, bgH, 16);
      ctx.fillStyle = 'rgba(245,240,228,0.92)';
      ctx.fill();
      ctx.restore();

      // 4. 绘制二维码 or 占位
      if (qrImg) {
        ctx.drawImage(qrImg, qrX, qrY, QR, QR);
      } else {
        // 占位虚线框
        ctx.save();
        ctx.setLineDash([12, 8]);
        ctx.strokeStyle = 'rgba(150,120,70,0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(qrX + 2, qrY + 2, QR - 4, QR - 4);
        ctx.restore();

        ctx.font = '30px "PingFang SC", sans-serif';
        ctx.fillStyle = '#9a8570';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('二维码待替换', qrX + QR / 2, qrY + QR / 2);
        ctx.textBaseline = 'alphabetic';
      }

      // 5. 二维码下方说明文字
      ctx.font = '26px "PingFang SC", "Heiti SC", sans-serif';
      ctx.fillStyle = '#5f4e36';
      ctx.textAlign = 'center';
      ctx.fillText('扫码测你的五行人格', lblCX, lblY);
      ctx.textAlign = 'left';

      try {
        var dataUrl = canvas.toDataURL('image/png');
        cb(dataUrl, null);
      } catch (err) {
        cb(null, '图片合成失败（可能存在跨域限制）');
      }
    });
  }

  function showShareCard(beast) {
    if (document.getElementById('share-card-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'share-card-overlay';
    overlay.innerHTML =
      '<div class="sc-close-row">' +
        '<button class="sc-close-btn">✕ 关闭</button>' +
        '<span class="sc-hint">长按图片保存</span>' +
      '</div>' +
      '<div class="sc-stage">' +
        '<div class="sc-loading">合成中…</div>' +
        '<img class="sc-result-img" alt="分享卡" style="display:none">' +
        '<div class="sc-error" style="display:none"></div>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('sc-visible'); });

    function closeOverlay() {
      overlay.classList.remove('sc-visible');
      setTimeout(function () { overlay.remove(); }, 250);
    }

    overlay.querySelector('.sc-close-btn').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay();
    });

    // 异步合成
    composeShareCanvas(beast, function (dataUrl, errMsg) {
      var loadingEl = overlay.querySelector('.sc-loading');
      var imgEl     = overlay.querySelector('.sc-result-img');
      var errEl     = overlay.querySelector('.sc-error');
      loadingEl.style.display = 'none';
      if (errMsg) {
        errEl.textContent = errMsg;
        errEl.style.display = 'block';
      } else {
        imgEl.src = dataUrl;
        imgEl.style.display = 'block';
      }
    });
  }

  // ---- 你和 TA 的神兽关系 ----

  function setupCoupleBtn() {
    var btnArea = document.querySelector('.world-btn-area');
    if (!btnArea || btnArea._coupleInject) return;
    btnArea._coupleInject = true;

    var btn = document.createElement('button');
    btn.className = 'cp-entry-btn';
    btn.textContent = '你和 TA 的神兽关系 →';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      showCoupleFullScreen();
    });
    btnArea.appendChild(btn);
  }

  function showCoupleFullScreen() {
    if (document.getElementById('couple-fullscreen')) return;

    var page = document.createElement('div');
    page.id = 'couple-fullscreen';
    // 三步骨架：intro / input / result — 互斥显示，只有 cp-step-active 可见
    page.innerHTML =
      '<div class="cp-topbar">' +
        '<button class="cp-back">← 返回</button>' +
        '<span class="cp-topbar-title">你和 TA 的神兽关系</span>' +
      '</div>' +
      // ── Step 1: intro ──
      '<div class="cp-step cp-step-intro cp-step-active">' +
        '<div class="cp-scroll">' +
          '<div class="cp-hero">' +
            '<div class="cp-hero-title">你和 TA 的神兽关系</div>' +
            '<div class="cp-hero-sub">两只神兽相遇，会形成怎样的能量流动？</div>' +
          '</div>' +
          '<div class="cp-body">' +
            '<p class="cp-intro">不断吉凶，不论合否。只借五行之气，观你与 TA 相遇时，如何相生，如何相照，如何相互牵动。</p>' +
          '</div>' +
          '<button class="cp-next-btn">下一步：输入 TA 的信息</button>' +
          DISCLAIMER_HTML +
        '</div>' +
      '</div>' +
      // ── Step 2: input（待填充） ──
      '<div class="cp-step cp-step-input">' +
        '<div class="cp-scroll"></div>' +
      '</div>' +
      // ── Step 3: result（待填充） ──
      '<div class="cp-step cp-step-result">' +
        '<div class="cp-scroll"></div>' +
      '</div>';

    document.body.appendChild(page);
    requestAnimationFrame(function () { page.classList.add('cp-visible'); });

    // 关闭整个全屏
    page.querySelector('.cp-back').addEventListener('click', function () {
      page.classList.remove('cp-visible');
      setTimeout(function () { page.remove(); }, 280);
    });

    // intro → input
    page.querySelector('.cp-next-btn').addEventListener('click', function () {
      buildCoupleInputStep(page);
      cpSwitchStep(page, 'input');
    });
  }

  // 切换步骤：隐藏所有 .cp-step，激活目标 .cp-step-{name}，重置该步骤滚动位置
  function cpSwitchStep(page, stepName) {
    page.querySelectorAll('.cp-step').forEach(function (s) {
      s.classList.remove('cp-step-active');
    });
    var target = page.querySelector('.cp-step-' + stepName);
    if (!target) return;
    target.classList.add('cp-step-active');
    var scroll = target.querySelector('.cp-scroll');
    if (scroll) scroll.scrollTop = 0;
  }

  // 时辰列表（与主包 input.js 保持一致）
  var CP_HOURS = [
    { label: '子时 (23:00-01:00)', value: 0 },
    { label: '丑时 (01:00-03:00)', value: 2 },
    { label: '寅时 (03:00-05:00)', value: 4 },
    { label: '卯时 (05:00-07:00)', value: 6 },
    { label: '辰时 (07:00-09:00)', value: 8 },
    { label: '巳时 (09:00-11:00)', value: 10 },
    { label: '午时 (11:00-13:00)', value: 12 },
    { label: '未时 (13:00-15:00)', value: 14 },
    { label: '申时 (15:00-17:00)', value: 16 },
    { label: '酉时 (17:00-19:00)', value: 18 },
    { label: '戌时 (19:00-21:00)', value: 20 },
    { label: '亥时 (21:00-23:00)', value: 22 }
  ];

  function buildOpts(list, selectedVal) {
    return list.map(function (o) {
      var v = typeof o === 'object' ? o.value : o;
      var t = typeof o === 'object' ? o.label : o;
      return '<option value="' + v + '"' + (v === selectedVal ? ' selected' : '') + '>' + t + '</option>';
    }).join('');
  }

  // ── Step 2：填充 input 步骤内容（只执行一次，重复点击「下一步」不重建）
  function buildCoupleInputStep(page) {
    var inputStep = page.querySelector('.cp-step-input');
    var scroll    = inputStep.querySelector('.cp-scroll');
    if (scroll.dataset.built) return; // 已构建，不重复
    scroll.dataset.built = '1';

    var myStem    = getStem();
    var myEl      = getElement();
    var myBeast   = myStem ? (getBeast(myStem) || '') : '';
    var myName    = getPersonalityName();
    var hasMyData = !!(myStem && myEl);

    var myCardHTML = hasMyData
      ? '<div class="cp-my-card">' +
          '<div class="cp-card-label">我的信息</div>' +
          '<div class="cp-card-row">' +
            '<span class="cp-card-item"><span class="cp-card-key">天干</span><span class="cp-card-val">' + myStem   + '</span></span>' +
            '<span class="cp-card-item"><span class="cp-card-key">五行</span><span class="cp-card-val">' + myEl     + '</span></span>' +
            '<span class="cp-card-item"><span class="cp-card-key">神兽</span><span class="cp-card-val">' + myBeast  + '</span></span>' +
          '</div>' +
          (myName ? '<div class="cp-card-personality">' + myName + '</div>' : '') +
        '</div>'
      : '<div class="cp-no-data">未检测到当前用户数据，请先完成五行测试。</div>';

    var years  = []; for (var y = 1940; y <= 2010; y++) years.push({ label: y + '年', value: y });
    var months = []; for (var m = 1; m <= 12; m++) months.push({ label: m + '月', value: m });
    var days   = []; for (var d = 1; d <= 31; d++) days.push({ label: d + '日', value: d });

    scroll.innerHTML =
      '<div class="cp-section-title">我的信息</div>' +
      myCardHTML +
      '<div class="cp-section-title cp-section-ta">TA 的信息</div>' +
      '<div class="cp-input-group">' +
        '<label class="cp-label">昵称（可选）</label>' +
        '<input id="cp-ta-name" class="cp-input" type="text" placeholder="给 TA 起个称呼" maxlength="10">' +
      '</div>' +
      '<div class="cp-input-group">' +
        '<label class="cp-label">出生年</label>' +
        '<select id="cp-ta-year"  class="cp-select">' + buildOpts(years,   1990) + '</select>' +
      '</div>' +
      '<div class="cp-input-group">' +
        '<label class="cp-label">出生月</label>' +
        '<select id="cp-ta-month" class="cp-select">' + buildOpts(months,     1) + '</select>' +
      '</div>' +
      '<div class="cp-input-group">' +
        '<label class="cp-label">出生日</label>' +
        '<select id="cp-ta-day"   class="cp-select">' + buildOpts(days,       1) + '</select>' +
      '</div>' +
      '<div class="cp-input-group">' +
        '<label class="cp-label">出生时辰</label>' +
        '<select id="cp-ta-hour"  class="cp-select">' + buildOpts(CP_HOURS,   8) + '</select>' +
      '</div>' +
      '<button class="cp-submit-btn" id="cp-submit">查看我们的关系</button>';

    scroll.querySelector('#cp-submit').addEventListener('click', function () {
      var taName  = (scroll.querySelector('#cp-ta-name').value || '').trim() || 'TA';
      var taYear  = parseInt(scroll.querySelector('#cp-ta-year').value,  10);
      var taMonth = parseInt(scroll.querySelector('#cp-ta-month').value, 10);
      var taDay   = parseInt(scroll.querySelector('#cp-ta-day').value,   10);
      var taHour  = parseInt(scroll.querySelector('#cp-ta-hour').value,  10);

      var taStem = calcTaDayStem(taYear, taMonth, taDay);

      if (!taStem) {
        buildCoupleResultStep(page, null, taName, null);
        cpSwitchStep(page, 'result');
        return;
      }

      var taElement = STEM_TO_ELEMENT[taStem] || '';
      var taBeast   = getBeast(taStem) || '';

      loadStemsData(function (data) {
        var taPersonalityName = (data[taStem] && data[taStem].personalityName) || '';

        var myData = { stem: myStem, element: myEl, beast: myBeast, personalityName: myName };
        var taData = { name: taName, year: taYear, month: taMonth, day: taDay, hour: taHour,
                       stem: taStem, element: taElement, beast: taBeast, personalityName: taPersonalityName };

        console.log('[couple] 我的信息：', myData);
        console.log('[couple] TA 的信息：', taData);

        // 切换到 result step（独立界面，从顶部开始，不追加到 input）
        buildCoupleResultStep(page, taData, taName, myData);
        cpSwitchStep(page, 'result');
      });
    });
  }

  // ── Step 3：填充 result 步骤内容（每次计算后重新构建）
  function buildCoupleResultStep(page, taData, taName, myData) {
    var resultStep = page.querySelector('.cp-step-result');
    var scroll     = resultStep.querySelector('.cp-scroll');

    function bindRedo() {
      var btn = scroll.querySelector('#cp-redo');
      if (btn) btn.addEventListener('click', function () { cpSwitchStep(page, 'input'); });
    }

    function errorHTML(msg) {
      return '<div class="cp-ta-error">' + escHtml(msg) + '</div>' +
             '<div class="cp-result-btns"><button class="cp-redo-btn" id="cp-redo">重新填写</button></div>';
    }

    // ── 天干计算失败
    if (!taData) {
      scroll.innerHTML = errorHTML('暂时无法计算 TA 的天干，请检查输入日期');
      bindRedo();
      return;
    }

    // ── 显示加载中
    scroll.innerHTML = '<div class="cp-rel-loading">正在生成关系报告…</div>';

    var relationId = (myData.element || '') + '_' + (taData.element || '');

    loadCoupleRelationsData(function (relList) {
      // JSON 加载失败
      if (!relList) {
        scroll.innerHTML = errorHTML('关系数据加载失败，请稍后重试');
        bindRedo();
        return;
      }

      // 查找对应关系
      var rel = null;
      for (var i = 0; i < relList.length; i++) {
        if (relList[i].relation_id === relationId) { rel = relList[i]; break; }
      }
      if (!rel) {
        scroll.innerHTML = errorHTML('暂时没有找到这组关系数据（' + relationId + '）');
        bindRedo();
        return;
      }

      // ── 正常渲染
      var myBeast  = myData.beast  || '—';
      var taBeast  = taData.beast  || '—';
      var myPname  = myData.personalityName  || '';
      var taPname  = taData.personalityName  || '';

      var adviceHtml = (rel.advice || []).map(function (a) {
        return '<li class="cp-advice-item">' + escHtml(a) + '</li>';
      }).join('');

      scroll.innerHTML =
        // ── 顶部：神兽对 + 关系标签
        '<div class="cp-result-header">' +
          '<div class="cp-result-beasts">' + escHtml(myBeast) + ' × ' + escHtml(taBeast) + '</div>' +
          '<span class="cp-rel-tag">' + escHtml(rel.relation_label) + '</span>' +
        '</div>' +

        // ── 标题 + 副标题
        '<div class="cp-rel-title">' + escHtml(rel.title) + '</div>' +
        '<div class="cp-rel-subtitle">' + escHtml(rel.subtitle) + '</div>' +

        // ── 双人身份卡
        '<div class="cp-id-row">' +
          '<div class="cp-id-card">' +
            '<div class="cp-id-label">我</div>' +
            '<div class="cp-id-stem">' + escHtml(myData.stem || '—') + '</div>' +
            '<div class="cp-id-meta">' + escHtml(myData.element || '') + ' · ' + escHtml(myBeast) + '</div>' +
            (myPname ? '<div class="cp-id-pname">' + escHtml(myPname) + '</div>' : '') +
          '</div>' +
          '<div class="cp-id-card">' +
            '<div class="cp-id-label">' + escHtml(taName) + '</div>' +
            '<div class="cp-id-stem">' + escHtml(taData.stem || '—') + '</div>' +
            '<div class="cp-id-meta">' + escHtml(taData.element || '') + ' · ' + escHtml(taBeast) + '</div>' +
            (taPname ? '<div class="cp-id-pname">' + escHtml(taPname) + '</div>' : '') +
          '</div>' +
        '</div>' +

        // ── 关系印象
        '<div class="cp-rel-section">' +
          '<div class="cp-rel-label">关系印象</div>' +
          '<p class="cp-rel-text">' + escHtml(rel.summary) + '</p>' +
        '</div>' +

        // ── 整体动力
        '<div class="cp-rel-section">' +
          '<div class="cp-rel-label">整体动力</div>' +
          '<p class="cp-rel-text">' + escHtml(rel.dynamic.overall) + '</p>' +
        '</div>' +
        '<div class="cp-rel-section">' +
          '<div class="cp-rel-label">我对 TA</div>' +
          '<p class="cp-rel-text">' + escHtml(rel.dynamic.my_effect_on_ta) + '</p>' +
        '</div>' +
        '<div class="cp-rel-section">' +
          '<div class="cp-rel-label">TA 对我</div>' +
          '<p class="cp-rel-text">' + escHtml(rel.dynamic.ta_effect_on_me) + '</p>' +
        '</div>' +

        // ── 相处建议
        '<div class="cp-rel-section">' +
          '<div class="cp-rel-label">相处建议</div>' +
          '<ul class="cp-advice-list">' + adviceHtml + '</ul>' +
        '</div>' +

        // ── 容易产生的误解
        '<div class="cp-rel-section">' +
          '<div class="cp-rel-label">容易产生的误解</div>' +
          '<p class="cp-rel-text">' + escHtml(rel.misunderstanding) + '</p>' +
        '</div>' +

        // ── 操作按钮
        '<div class="cp-result-btns">' +
          '<button class="cp-share-placeholder-btn" id="cp-share-placeholder">生成关系卡片</button>' +
          '<button class="cp-redo-btn" id="cp-redo">重新填写</button>' +
        '</div>' +
        DISCLAIMER_HTML;

      var shareBtn = scroll.querySelector('#cp-share-placeholder');
      if (shareBtn) {
        shareBtn.addEventListener('click', function () {
          alert('关系卡片功能尚未开发');
        });
      }
      bindRedo();
    });
  }

  // ---- 屏幕入场：滚动重置 + 历史推入 ----
  var prevScreen = '';

  function scrollToTop() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function pushScreenState(name) {
    try {
      if (!history.state || history.state.wuxingScreen !== name) {
        history.pushState({ wuxingScreen: name }, '');
      }
    } catch (e) {}
  }

  function onReportEnter() {
    // display:none 已确保 result 从布局移除，report 自然从顶部显示
    // 无需 scrollToTop；只需推入历史状态供返回键使用
    pushScreenState('report');
  }

  function onWorldEnter() {
    pushScreenState('world');
  }

  // ---- 左上角返回按钮（注入到报告页/五行世界页） ----
  function injectBackBtn(containerSelector, label, clickHandler) {
    var container = document.querySelector(containerSelector);
    if (!container || container.querySelector('.inject-back-btn')) return;
    var btn = document.createElement('button');
    btn.className = 'inject-back-btn';
    btn.textContent = label;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      clickHandler();
    });
    container.insertBefore(btn, container.firstChild);
  }

  function navigateScreens(toSelector, fromSelector) {
    var fromEl = document.querySelector(fromSelector)?.closest('.screen');
    var toEl   = document.querySelector(toSelector)?.closest('.screen');
    if (!fromEl || !toEl) return;
    // fromEl 先加 exit（保留在布局/动画中），再移 active
    // toEl 加 active → display:none 规则自动解除，页面从自身顶部显示
    fromEl.classList.add('exit');
    fromEl.classList.remove('active');
    toEl.classList.add('active');
    setTimeout(function () { fromEl.classList.remove('exit'); }, 500);
  }

  // ---- 浏览器 popstate 处理（支持报告↔结果、世界↔报告） ----
  window.addEventListener('popstate', function () {
    var reportActive = document.querySelector('.report-screen-inner')
      ?.closest('.screen')?.classList.contains('active');
    var worldActive  = document.querySelector('.world-screen-inner')
      ?.closest('.screen')?.classList.contains('active');

    if (worldActive) {
      navigateScreens('.report-screen-inner', '.world-screen-inner');
    } else if (reportActive) {
      navigateScreens('.result-screen-inner', '.report-screen-inner');
    }
  });

  // ---- 监听屏幕切换 ----
  function onMutation() {
    const reportActive = document.querySelector('.report-screen-inner')
      ?.closest('.screen')?.classList.contains('active');
    const worldActive = document.querySelector('.world-screen-inner')
      ?.closest('.screen')?.classList.contains('active');
    const loadingActive = document.querySelector('.loading-screen-inner')
      ?.closest('.screen')?.classList.contains('active');

    var curScreen = reportActive ? 'report' : worldActive ? 'world'
                  : loadingActive ? 'loading' : 'other';

    setupGenerateBtn();
    setupViewReportBtn();
    updateDisclaimers();
    injectDisclaimer('.result-screen-inner');
    injectDisclaimer('.report-screen-inner');
    injectDisclaimer('.world-screen-inner');

    if (loadingActive && skipLoading) {
      skipLoadingScreen();
      prevScreen = 'loading';
      return;
    }

    if (reportActive && prevScreen !== 'report') onReportEnter();
    if (worldActive  && prevScreen !== 'world')  onWorldEnter();

    if (reportActive) {
      injectReportIP();
      setupFlipBtn();
      injectReportContent();
      setupPersonalityShareBtn();
      setupSaveResultBtn();
      injectBackBtn('.report-screen-inner', '‹ 返回', function () { history.back(); });
    }
    if (worldActive) {
      injectWorldBg();
      setupCosmosCard();
      setupRelationsCard();
      setupLifecycleCard();
      setupShareBtn();
      setupCoupleBtn();
      injectBackBtn('.world-screen-inner', '‹ 返回', function () { history.back(); });
    }

    prevScreen = curScreen;
  }

  function init() {
    var timer = setInterval(function () {
      var app = document.querySelector('.app');
      if (!app) return;
      clearInterval(timer);

      var obs = new MutationObserver(onMutation);
      obs.observe(app, { attributes: true, subtree: true, attributeFilter: ['class'] });
      onMutation();
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
