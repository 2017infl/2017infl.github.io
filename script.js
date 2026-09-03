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

  // 把紅線推進到指定階段的圓點中心（與大事紀同一套算法）
  function axisDrawLine(link) {
    if (!axisTrack || !link) return;
    var dot = link.querySelector('.axis__dot');
    if (!dot) return;

    var trackBox = axisTrack.getBoundingClientRect();
    var dotBox = dot.getBoundingClientRect();
    if (!trackBox.width) return;

    var x = (dotBox.left + dotBox.width / 2) - trackBox.left;
    var pct = Math.max(0, Math.min(100, (x / trackBox.width) * 100));
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

  // 把紅線推進到指定年份的圓點中心
  function tlDrawLine(btn) {
    if (!tlTrack || !btn) return;
    var dot = btn.querySelector('.tl__dot');
    if (!dot) return;

    var trackBox = tlTrack.getBoundingClientRect();
    var dotBox = dot.getBoundingClientRect();
    if (!trackBox.width) return;

    var x = (dotBox.left + dotBox.width / 2) - trackBox.left;
    var pct = Math.max(0, Math.min(100, (x / trackBox.width) * 100));
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

  // 視窗改變大小或時間軸橫向捲動時，紅線長度要跟著重算
  if (tlTrack) {
    var tlScroll = document.querySelector('.tl__scroll');
    var redraw = function () { if (tlCurrent) tlDrawLine(tlCurrent); };
    window.addEventListener('resize', redraw);
    if (tlScroll) tlScroll.addEventListener('scroll', redraw, { passive: true });
  }

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
