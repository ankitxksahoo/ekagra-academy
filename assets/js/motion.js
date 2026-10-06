/* Ekagra Academy motion layer.
   Progressive enhancement only: every element is readable without this file,
   and nothing here runs when the visitor prefers reduced motion. */
(function () {
  'use strict';

  var doc = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  doc.classList.add('motion-on');

  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var sda = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var hasIO = 'IntersectionObserver' in window;
  if (!sda) doc.classList.add('no-sda');

  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var inHero = function (el) { return !!el.closest('.hero, .page-hero'); };

  /* ---------- One shared, throttled scroll loop for scroll-linked effects ---------- */
  var jobs = [];
  var queued = false;
  var runJobs = function () {
    queued = false;
    jobs.forEach(function (job) { if (job.active) job.fn(); });
  };
  var queue = function () {
    if (!queued) { queued = true; requestAnimationFrame(runJobs); }
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  function addJob(el, fn) {
    var job = { fn: fn, active: true };
    if (el && hasIO) {
      job.active = false;
      new IntersectionObserver(function (entries) {
        job.active = entries[0].isIntersecting;
        if (job.active) fn();
      }, { rootMargin: '200px 0px' }).observe(el);
    }
    jobs.push(job);
    fn();
  }

  /* ---------- Reveal on scroll ---------- */
  var SINGLE = '.sec-head, .pd-main, .table-wrap, .notice, .reg, .cf-form, .cf-result, .mock-panel, .form-card, .prose, .faq-list, .path-intro, .mf-sign, .outcome, .footer-cta';
  var FRAME = '.finder, .ekat-box';
  var GROUPS = '.prog-grid, .fac-grid, .quotes, .res-grid, .incl-grid, .src-grid, .sheet-grid, .steps, .dates, .facts, .centres, .method, .leaders, .contact-cards, .week, .timeline, .cal, .stats, .slabs, .footer-grid';
  var GROW = '.ybar-track, .slab-bar i';

  $$(SINGLE).forEach(function (el) { if (!inHero(el)) el.classList.add('rv'); });
  $$(FRAME).forEach(function (el) { el.classList.add('rv-frame'); });
  $$(GROUPS).forEach(function (group) {
    if (inHero(group)) return;
    var tracks = getComputedStyle(group).gridTemplateColumns;
    var cols = tracks && tracks !== 'none' ? tracks.split(' ').length : 1;
    Array.prototype.forEach.call(group.children, function (el, i) {
      el.classList.add('rv-i');
      el.style.setProperty('--i', cols > 1 ? i % cols : 0);
    });
  });
  $$(GROW).forEach(function (el) { el.classList.add('rv-grow'); });

  if (!sda && hasIO) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add('is-in');
        revealIO.unobserve(el);
        setTimeout(function () { el.classList.add('is-done'); }, 1600);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    $$('.rv, .rv-i, .rv-frame, .rv-grow').forEach(function (el) { revealIO.observe(el); });

    // Without scroll timelines, drive the progress bar from the shared loop.
    var bar = $('.progress-bar');
    if (bar) {
      addJob(null, function () {
        var max = doc.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max) : 0).toFixed(4) + ')';
      });
    }
  }

  /* ---------- Rolling numbers ---------- */
  function countUp(el) {
    if (el.getAttribute('data-counted')) return;
    el.setAttribute('data-counted', '1');
    var raw = el.textContent.trim();
    var m = raw.match(/^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!m) return;
    var pre = m[1], num = m[2], suf = m[3];
    var dec = (num.split('.')[1] || '').length;
    var target = parseFloat(num.replace(/,/g, ''));
    var from = el.getAttribute('data-count-from');
    var start = from !== null ? parseFloat(from) : dec ? Math.max(0, target - 9) : Math.round(target * 0.35);
    var grouped = num.indexOf(',') > -1 || start >= 1000;
    var fmt = function (v) {
      var s = dec ? v.toFixed(dec) : String(Math.round(v));
      if (grouped) s = Number(s).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return pre + s + suf;
    };
    var t0 = 0;
    var dur = 1600;
    el.style.fontVariantNumeric = 'tabular-nums';
    var step = function (ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = raw;
    };
    requestAnimationFrame(step);
  }
  $$('.hero [data-count]').forEach(function (el, i) {
    setTimeout(function () { countUp(el); }, 300 + i * 110);
  });
  if (hasIO) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); countIO.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    $$('.stat b').forEach(function (el) { countIO.observe(el); });
  }

  /* ---------- Hero spotlight ---------- */
  var hero = $('[data-hero]');
  if (hero && fine) {
    var spot = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      cancelAnimationFrame(spot);
      spot = requestAnimationFrame(function () {
        hero.style.setProperty('--spx', x + 'px');
        hero.style.setProperty('--spy', y + 'px');
        hero.classList.add('is-lit');
      });
    });
    hero.addEventListener('pointerleave', function () { hero.classList.remove('is-lit'); });
  }

  /* ---------- 3D tilt with a soft glare ---------- */
  if (fine) {
    $$('.tile, .prog-card, .fac-card, .res-card, .sheet-card, .src, .incl, .date-card, .centre').forEach(function (card) {
      card.classList.add('tiltable');
      var raf = 0;
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          card.classList.add('is-tilting');
          card.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
          card.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
          card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
          card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        });
      });
      card.addEventListener('pointerleave', function () {
        cancelAnimationFrame(raf);
        card.classList.remove('is-tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    /* Magnetic primary buttons */
    $$('[data-magnetic]').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.setProperty('--mgx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
        btn.style.setProperty('--mgy', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--mgx', '0px');
        btn.style.setProperty('--mgy', '0px');
      });
    });
  }

  /* ---------- Manifesto: words light up as you read ---------- */
  var mf = $('[data-words]');
  if (mf) {
    var frag = document.createDocumentFragment();
    Array.prototype.slice.call(mf.childNodes).forEach(function (node) {
      var key = node.nodeType === 1 && node.classList.contains('k');
      var lang = node.nodeType === 1 ? node.getAttribute('lang') : null;
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span');
        w.className = key ? 'w k' : 'w';
        if (lang) w.setAttribute('lang', lang);
        w.textContent = part;
        frag.appendChild(w);
      });
    });
    mf.textContent = '';
    mf.appendChild(frag);
    var words = $$('.w', mf);
    addJob(mf, function () {
      var r = mf.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.3));
      var lit = Math.round(p * words.length * 1.08);
      words.forEach(function (w, i) { w.classList.toggle('on', i < lit); });
    });
  }

  /* ---------- Sticky stack: covered cards recede, rail follows ---------- */
  var stack = $('[data-stack]');
  if (stack) {
    var cards = $$('.stack-card', stack);
    var railItems = $$('.rail li');
    addJob(stack, function () {
      var tops = cards.map(function (c) { return c.getBoundingClientRect().top; });
      var active = 0;
      cards.forEach(function (c, i) {
        var stick = parseFloat(getComputedStyle(c).top) || 0;
        if (tops[i] <= stick + 2) active = i;
        if (i === cards.length - 1) return;
        var p = clamp(1 - (tops[i + 1] - tops[i] - 18) / c.offsetHeight);
        c.style.setProperty('--s', (1 - p * 0.06).toFixed(4));
        c.style.setProperty('--b', (1 - p * 0.45).toFixed(3));
      });
      railItems.forEach(function (li, i) {
        li.classList.toggle('is-active', i === active);
        li.classList.toggle('is-done', i < active);
      });
    });
  }

  /* ---------- Kinetic band fallback when scroll timelines are missing ---------- */
  var kinetic = $('[data-kinetic]');
  if (kinetic && !sda) {
    var rows = $$('.kinetic-row', kinetic);
    addJob(kinetic, function () {
      var r = kinetic.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = clamp((vh - r.top) / (vh + r.height));
      rows.forEach(function (row, i) {
        var shift = row.scrollWidth * 0.28;
        var x = i % 2 === 0 ? -shift * p : -shift * (1 - p);
        row.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
      });
    });
  }

  /* ---------- Timeline: the year you are reading lights up ---------- */
  var tlItems = $$('.timeline li');
  if (tlItems.length && hasIO) {
    var tlIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-active', en.isIntersecting); });
    }, { rootMargin: '-42% 0px -48% 0px' });
    tlItems.forEach(function (li) { tlIO.observe(li); });
  }
})();
