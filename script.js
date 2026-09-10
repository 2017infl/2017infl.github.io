/* 影響力教育基金會 — 互動行為 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 導覽列：捲動後加上邊界線 ───────────────── */
  var nav = document.getElementById('nav');
  function onScroll() {
    nav.classList.toggle('is-stuck', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── 手機選單 ───────────────────────────────── */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');

  toggle.addEventListener('click', function () {
    var open = links.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  links.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && links.classList.contains('is-open')) {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });

  /* ── 捲動進場 ───────────────────────────────── */
  var revealables = document.querySelectorAll('.reveal');

  function revealAll() {
    revealables.forEach(function (el) {
      el.style.transitionDelay = '0ms';
      el.classList.add('is-in');
    });
  }

  // 分頁在背景時 IntersectionObserver 不一定會觸發，直接全部顯示。
  // 沒人在看，本來就不需要進場動畫。
  if (document.visibilityState === 'hidden') {
    revealAll();
  }

  // 最後一道保險：真的有元素卡住沒顯示，5 秒後強制顯示，
  // 絕不讓內容因為動畫失效而消失。
  window.setTimeout(function () {
    var stuck = document.querySelectorAll('.reveal:not(.is-in)');
    if (stuck.length && stuck.length === revealables.length) revealAll();
  }, 5000);

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // 同一組內的元素依序進場，避免整片同時跳出來
        var siblings = Array.prototype.slice.call(
          el.parentNode.querySelectorAll(':scope > .reveal')
        );
        var i = Math.max(0, siblings.indexOf(el));
        el.style.transitionDelay = Math.min(i, 6) * 70 + 'ms';
        el.classList.add('is-in');
        revealObserver.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealables.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ── 跨頁錨點落點校正 ─────────────────────────
     帶 #hash 開啟頁面時，瀏覽器會在網頁字型與圖片就位「之前」就捲到定位，
     等 Google Fonts 載入完成、版面高度改變後，落點就偏掉了。
     這裡在 load 與字型完成後各校正一次；使用者只要自己動過捲軸就不再介入。 */
  var HASH_OFFSET = 96;   // 需與 CSS 的 scroll-padding-top 一致
  var userScrolled = false;

  ['wheel', 'touchstart', 'keydown'].forEach(function (evt) {
    window.addEventListener(evt, function () { userScrolled = true; }, { passive: true, once: true });
  });

  function correctHashScroll() {
    if (userScrolled || !location.hash) return;

    var target;
    try {
      target = document.querySelector(location.hash);
    } catch (e) {
      return; // hash 不是合法選擇器
    }
    if (!target) return;

    // 目標的祖先若還是未進場的 .reveal，身上帶著 translateY，
    // 量到的位置會比最終位置低 22px。先讓它們就定位再量。
    var node = target;
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains('reveal')) {
        node.style.transitionDelay = '0ms';
        node.classList.add('is-in');
      }
      node = node.parentElement;
    }

    var top = target.getBoundingClientRect().top + window.scrollY - HASH_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }

  if (location.hash) {
    window.addEventListener('load', correctHashScroll);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        // 字型換上後版面才穩定，再校正一次
        window.setTimeout(correctHashScroll, 60);
      });
    }
  }

  /* ── 生涯階段軸線：紅線隨游標推進 ───────────── */
  var axisTrack = document.querySelector('.axis__track');
  var axisLinks = document.querySelectorAll('.axis__link');
  var axisCurrent = null;

  // 紅線從第一個圓點的中心開始 —— 「探索」是起點，它左邊不該有線。
  // 起點量出來寫進 --axis-start 給 CSS 用，數字只維護一份。
  function axisLineStart() {
    var firstDot = axisTrack && axisTrack.querySelector('.axis__dot');
    if (!firstDot) return 0;

    var trackBox = axisTrack.getBoundingClientRect();
    var dotBox = firstDot.getBoundingClientRect();
    var start = (dotBox.left + dotBox.width / 2) - trackBox.left;

    axisTrack.style.setProperty('--axis-start', start.toFixed(1) + 'px');
    return start;
  }

  // 把紅線推進到指定階段的圓點中心（與大事紀同一套算法）
  function axisDrawLine(link) {
    if (!axisTrack || !link) return;
    var dot = link.querySelector('.axis__dot');
    if (!dot) return;

    var trackBox = axisTrack.getBoundingClientRect();
    var dotBox = dot.getBoundingClientRect();
    // 座標系從第一個圓點起算，與 CSS 的 left:var(--axis-start) 對齊
    var start = axisLineStart();
    var span = trackBox.width - start;
    if (!span) return;

    var x = (dotBox.left + dotBox.width / 2) - trackBox.left - start;
    var pct = Math.max(0, Math.min(100, (x / span) * 100));
    axisTrack.style.setProperty('--axis-progress', pct.toFixed(2) + '%');
  }

  function axisSetActive(link) {
    var index = Array.prototype.indexOf.call(axisLinks, link);

    axisLinks.forEach(function (a, i) {
      a.classList.toggle('is-active', a === link);
      a.classList.toggle('is-passed', i < index);
    });

    axisCurrent = link;
    axisDrawLine(link);
  }

  axisLinks.forEach(function (link) {
    link.addEventListener('mouseenter', function () { axisSetActive(link); });
    link.addEventListener('focus', function () { axisSetActive(link); });
  });

  if (axisTrack && axisLinks.length) {
    // 靜止狀態：紅線停在第一個圓點，與該圓點常駐的紅色接起來
    var axisRest = function () {
      if (axisCurrent) { axisDrawLine(axisCurrent); return; }
      axisDrawLine(axisLinks[0]);
    };
    axisLineStart();
    window.addEventListener('load', axisRest);
    window.addEventListener('resize', axisRest);

    var axisScroll = document.querySelector('.axis__scroll');
    if (axisScroll) axisScroll.addEventListener('scroll', axisRest, { passive: true });
  }

  /* ── 大事紀時間軸：滑入／聚焦／點擊展開該年內容 ── */
  var tlYears = document.querySelectorAll('.tl__year');
  var tlPanels = document.querySelectorAll('.tl__panel');
  var tlHint = document.querySelector('.tl__hint');

  var tlTrack = document.querySelector('.tl__track');
  var tlCurrent = null;

  // 量出第一個圓點的中心（沿著軸的方向，相對於軌道起點）。
  // 紅線從這裡開始 —— 2017 是起點，它前面不該有線。橫向、直向都適用。
  // 起點寫進 --tl-start 給 CSS 用，數字只維護一份，不會兩邊對不上。
  function tlLineStart() {
    var firstDot = tlTrack && tlTrack.querySelector('.tl__dot');
    if (!firstDot) return 0;

    var trackBox = tlTrack.getBoundingClientRect();
    var dotBox = firstDot.getBoundingClientRect();
    var vertical = trackBox.height > trackBox.width;

    var start = vertical
      ? (dotBox.top + dotBox.height / 2) - trackBox.top
      : (dotBox.left + dotBox.width / 2) - trackBox.left;

    tlTrack.style.setProperty('--tl-start', start.toFixed(1) + 'px');
    return start;
  }

  // 把紅線推進到指定年份的圓點中心。
  // 手機版時間軸是直的，線要沿著 Y 軸推進；方向用實際幾何判斷，
  // 不在這裡寫死斷點，才不會跟 CSS 的斷點各改各的。
  function tlDrawLine(btn) {
    if (!tlTrack || !btn) return;
    var dot = btn.querySelector('.tl__dot');
    if (!dot) return;

    var trackBox = tlTrack.getBoundingClientRect();
    var dotBox = dot.getBoundingClientRect();
    var vertical = trackBox.height > trackBox.width;
    // 座標系從第一個圓點起算，與 CSS 的 var(--tl-start) 對齊
    var start = tlLineStart();
    var offset, span;

    if (vertical) {
      span = trackBox.height - start;
      offset = (dotBox.top + dotBox.height / 2) - trackBox.top - start;
    } else {
      span = trackBox.width - start;
      offset = (dotBox.left + dotBox.width / 2) - trackBox.left - start;
    }
    if (!span) return;

    var pct = Math.max(0, Math.min(100, (offset / span) * 100));
    tlTrack.style.setProperty('--tl-progress', pct.toFixed(2) + '%');
  }

  function showYear(btn) {
    var id = btn.getAttribute('aria-controls');
    var index = Array.prototype.indexOf.call(tlYears, btn);

    tlYears.forEach(function (b, i) {
      var on = b === btn;
      b.classList.toggle('is-active', on);
      b.classList.toggle('is-passed', i < index);
      b.setAttribute('aria-expanded', String(on));
    });
    tlPanels.forEach(function (p) {
      p.classList.toggle('is-active', p.id === id);
    });
    if (tlHint) tlHint.classList.add('is-hidden');

    tlCurrent = btn;
    tlDrawLine(btn);
  }

  tlYears.forEach(function (btn) {
    // 滑鼠移入即展開；鍵盤聚焦與點擊（觸控裝置沒有 hover）同樣有效
    btn.addEventListener('mouseenter', function () { showYear(btn); });
    btn.addEventListener('focus', function () { showYear(btn); });
    btn.addEventListener('click', function () { showYear(btn); });
  });

  // 視窗改變大小或時間軸橫向捲動時，紅線的起點與長度都要跟著重算。
  // 起點要在還沒點過任何年份時就先算好，否則直向的線頭會露在 2017 上方。
  if (tlTrack) {
    var tlScroll = document.querySelector('.tl__scroll');
    var redraw = function () {
      tlLineStart();
      if (tlCurrent) tlDrawLine(tlCurrent);
    };
    tlLineStart();
    window.addEventListener('load', redraw);
    window.addEventListener('resize', redraw);
    if (tlScroll) tlScroll.addEventListener('scroll', redraw, { passive: true });
  }

  /* ── 董事卡片：手機版點開學經歷 ───────────────
     按鈕在桌機是 display:none，不會被點到也不會被 Tab 到，
     所以這裡不需要判斷斷點 —— 斷點只寫在 CSS 一個地方。 */
  var personToggles = document.querySelectorAll('.person__toggle');

  personToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.person');
      if (!card) return;
      var open = card.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ── 數字跑動 ───────────────────────────────── */
  var counters = document.querySelectorAll('[data-count]');

  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  function runCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';

    // 減少動態偏好，或分頁在背景（rAF 不會執行）時直接寫上最終數值
    if (reduceMotion || document.visibilityState === 'hidden') {
      el.textContent = formatNumber(target) + suffix;
      return;
    }

    var duration = 1500;
    var start = null;

    function step(timestamp) {
      if (start === null) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      // easeOutCubic
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNumber(Math.round(target * eased)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  if (!('IntersectionObserver' in window) || document.visibilityState === 'hidden') {
    counters.forEach(runCount);
  } else {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        runCount(entry.target);
        countObserver.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { countObserver.observe(el); });
  }
})();
