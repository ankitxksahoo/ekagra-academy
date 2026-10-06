/* Ekagra Academy site behaviour. No dependencies; settings and data come from config.js. */
(function () {
  'use strict';

  var CFG = window.EKAGRA || {};
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var waUrl = function (text) { return 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(text); };
  var PHONE = /^[6-9]\d{9}$/;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------- Header: stuck state, dropdown, mobile menu ---------- */
  var header = $('[data-header]');
  if (header && 'IntersectionObserver' in window) {
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'height:1px;margin-bottom:-1px';
    header.parentNode.insertBefore(sentinel, header);
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  function closeDropdowns() {
    $$('.has-dd.is-open').forEach(function (li) {
      li.classList.remove('is-open');
      var b = $('.dd-toggle', li);
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  $$('.dd-toggle').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var li = btn.closest('.has-dd');
      var open = !li.classList.contains('is-open');
      closeDropdowns();
      li.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.has-dd')) closeDropdowns();
  });

  var menuBtn = $('[data-menu]');
  var menu = $('#mobile-menu');
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    var wide = window.matchMedia('(min-width: 1121px)');
    var onWide = function () { if (wide.matches) setMenu(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (menu && !menu.hidden) { setMenu(false); menuBtn.focus(); }
      closeDropdowns();
    }
  });

  /* ---------- Form helpers ---------- */
  function setErr(form, name, msg) {
    var el = form.elements[name];
    var p = $('[data-err-for="' + name + '"]', form);
    if (el && el.nodeType === 1) {
      if (msg) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
      if (p && el.id) {
        p.id = el.id + '-err';
        el.setAttribute('aria-describedby', p.id);
      }
    }
    if (p) p.textContent = msg || '';
  }

  var MESSAGES = {
    klass: 'Select a class.',
    goal: 'Select a program.',
    board: 'Select a board.',
    centre: 'Select a centre.',
  };

  function validate(form, names) {
    var ok = true;
    var firstBad = null;
    names.forEach(function (name) {
      var el = form.elements[name];
      if (!el || el.nodeType !== 1) return;
      var value = el.type === 'checkbox' ? el.checked : String(el.value || '').trim();
      var msg = '';
      if (name === 'name' || name === 'parent') {
        if (value.length < 2) msg = 'Enter the full name.';
      } else if (name === 'phone') {
        value = value.replace(/\D/g, '');
        el.value = value;
        if (!PHONE.test(value)) msg = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
      } else if (name === 'email') {
        if (value && !EMAIL.test(value)) msg = 'Enter a valid email, or leave it blank.';
      } else if (name === 'consent') {
        if (!value) msg = 'Tick this box so we can contact you.';
      } else if (el.required && !value) {
        msg = MESSAGES[name] || 'Fill in this field.';
      }
      setErr(form, name, msg);
      if (msg) {
        ok = false;
        if (!firstBad) firstBad = el;
      }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  function formData(form) {
    var data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || el.disabled) return;
      if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; return; }
      if (el.type === 'checkbox') { data[el.name] = el.checked; return; }
      data[el.name] = el.value;
    });
    return data;
  }

  function formError(form, msg) {
    var p = $('.form-err', form);
    if (!p) {
      if (!msg) return;
      p = document.createElement('p');
      p.className = 'err form-err';
      p.setAttribute('role', 'alert');
      var btn = $('button[type="submit"]', form);
      btn.parentNode.insertBefore(p, btn);
    }
    p.textContent = msg || '';
  }

  function busy(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
  }

  // Sends JSON to the configured endpoint (Formspree, Web3Forms, Apps Script). Without one, runs in demo mode.
  function submitData(payload) {
    payload.submittedAt = new Date().toISOString();
    payload.page = location.pathname;
    if (!CFG.formEndpoint) {
      if (window.console) console.info('[Ekagra] Demo mode: form data was not sent anywhere. Set formEndpoint in src/data/site.mjs.', payload);
      return new Promise(function (resolve) { setTimeout(resolve, 600); });
    }
    return fetch(CFG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); });
  }

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t.form || !t.name) return;
    if (t.name === 'phone') t.value = t.value.replace(/\D/g, '').slice(0, 10);
    setErr(t.form, t.name, '');
    formError(t.form, '');
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.form && t.name) setErr(t.form, t.name, '');
  });

  function selectOption(select, value) {
    if (!select || !value) return;
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === value || select.options[i].text === value) { select.selectedIndex = i; return; }
    }
  }

  /* ---------- Lead forms (modal, contact, resources) ---------- */
  $$('form[data-lead]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      formError(form, '');
      if (!validate(form, ['name', 'phone', 'klass', 'goal', 'consent'])) return;
      var data = formData(form);
      data.intent = form.getAttribute('data-intent');
      var btn = $('button[type="submit"]', form);
      busy(btn, true);
      submitData(data)
        .then(function () {
          var success = form.nextElementSibling;
          var first = String(data.name).trim().split(/\s+/)[0];
          $('h3', success).textContent = 'Thank you, ' + first + '. We have your request.';
          $('[data-success-text]', success).textContent = form.getAttribute('data-success') || '';
          var wa = $('[data-success-wa]', success);
          if (wa) wa.href = waUrl('Hi Ekagra, I just sent an enquiry for ' + data.name + ' (' + data.klass + ', ' + data.goal + ').');
          form.hidden = true;
          success.hidden = false;
          success.focus();
        })
        .catch(function () {
          formError(form, 'Your request could not be sent. Check your connection and try again, or call ' + CFG.phone + '.');
        })
        .then(function () { busy(btn, false); });
    });
  });

  /* ---------- Enquiry dialog ---------- */
  var dlg = $('#enquire');
  var lastFinder = null;

  function openEnquiry(trigger) {
    if (!dlg) return;
    var form = $('form', dlg);
    var success = $('.form-success', dlg);
    if (success && !success.hidden) {
      success.hidden = true;
      form.hidden = false;
      form.reset();
    }
    var d = trigger ? trigger.dataset : {};
    $('[data-modal-title]', dlg).textContent = d.title || 'Book a demo class';
    $('[data-modal-kicker]', dlg).textContent = d.kicker || 'Free demo class and counselling';
    $('.btn-label', form).textContent = d.title || 'Book my demo class';
    form.setAttribute('data-intent', d.intent || 'Demo class');
    form.elements.note.value = '';
    if (d.goal) selectOption(form.elements.goal, d.goal);
    if (d.centre) selectOption(form.elements.centre, d.centre);
    if (d.fromFinder !== undefined && lastFinder) {
      form.elements.note.value = lastFinder.text;
      selectOption(form.elements.goal, lastFinder.goal);
      selectOption(form.elements.klass, lastFinder.klass);
    }
    setMenu(false);
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    setTimeout(function () { form.elements.name.focus(); }, 40);
  }

  document.addEventListener('click', function (e) {
    var preset = e.target.closest('[data-finder-preset]');
    if (preset) {
      try { sessionStorage.setItem('ekagra-finder', preset.getAttribute('data-finder-preset')); } catch (err) { /* storage unavailable */ }
    }
    var trigger = e.target.closest('[data-enquire]');
    if (trigger) { e.preventDefault(); openEnquiry(trigger); return; }
    if (dlg && e.target.closest('[data-close]')) dlg.close();
  });
  if (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- Countdowns ---------- */
  // Digits flip when they change, once the motion layer is active.
  function setUnit(el, value) {
    if (el.textContent === value) return;
    el.textContent = value;
    if (!document.documentElement.classList.contains('motion-on')) return;
    el.classList.remove('flip');
    void el.offsetWidth;
    el.classList.add('flip');
  }
  $$('[data-countdown]').forEach(function (el) {
    var target = new Date(el.getAttribute('data-countdown')).getTime();
    var u = { d: $('[data-unit="d"]', el), h: $('[data-unit="h"]', el), m: $('[data-unit="m"]', el), s: $('[data-unit="s"]', el) };
    function tick() {
      var t = Math.max(0, target - Date.now());
      var d = Math.floor(t / 864e5); t -= d * 864e5;
      var h = Math.floor(t / 36e5); t -= h * 36e5;
      var m = Math.floor(t / 6e4); t -= m * 6e4;
      setUnit(u.d, pad(d)); setUnit(u.h, pad(h)); setUnit(u.m, pad(m)); setUnit(u.s, pad(Math.floor(t / 1e3)));
    }
    tick();
    setInterval(tick, 1000);
  });

  /* ---------- Weekly timetable: mark today ---------- */
  var today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  $('.day[data-day]').forEach(function (day) {
    if (day.getAttribute('data-day') !== today) return;
    day.classList.add('is-today');
    var pill = document.createElement('span');
    pill.className = 'today-pill';
    pill.textContent = 'Today';
    $('h3', day).appendChild(pill);
  });

  /* ---------- Results marquee pause ---------- */
  $$('[data-marquee-toggle]').forEach(function (btn) {
    var wrap = $('[data-marquee]', btn.closest('section'));
    btn.addEventListener('click', function () {
      var paused = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      if (wrap) wrap.classList.toggle('is-paused', paused);
      $('span', btn).textContent = paused ? 'Resume scrolling' : 'Pause scrolling';
    });
  });

  /* ---------- Tabs (integrated path) ---------- */
  $$('[role="tablist"]').forEach(function (list) {
    var tabs = $$('[role="tab"]', list);
    var scroller = list.parentElement;
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (!panel) return;
        panel.hidden = !on;
        if (on) { panel.classList.remove('is-swapping'); void panel.offsetWidth; panel.classList.add('is-swapping'); }
      });
      if (focus) tab.focus();
      if (scroller && scroller.scrollWidth > scroller.clientWidth) {
        scroller.scrollTo({ left: tab.offsetLeft - 24, behavior: 'smooth' });
      }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  });

  /* ---------- Filters (results wall, faculty) ---------- */
  $$('[data-filter-root]').forEach(function (root) {
    var items = $$('[data-filter-list] > *', root);
    var state = {};
    var query = '';
    var pageSize = parseInt(root.getAttribute('data-page-size') || '0', 10);
    var shown = pageSize || Infinity;
    var countEl = $('[data-filter-count]', root);
    var emptyEl = $('[data-filter-empty]', root);
    var moreBtn = $('[data-filter-more]', root);
    var search = $('[data-filter-search]', root);
    var noun = $('.res-grid', root) ? 'results' : 'teachers';

    function apply() {
      var matches = items.filter(function (it) {
        for (var k in state) {
          if (state[k] !== 'all' && it.getAttribute('data-' + k) !== state[k]) return false;
        }
        if (query && (it.getAttribute('data-name') || '').indexOf(query) === -1) return false;
        return true;
      });
      items.forEach(function (it) { it.hidden = true; });
      matches.forEach(function (it, i) { it.hidden = i >= shown; });
      var visible = Math.min(matches.length, shown);
      if (countEl) {
        var label = matches.length === 1 ? noun.slice(0, -1) : noun;
        countEl.textContent = visible === items.length
          ? 'Showing all ' + items.length + ' ' + noun
          : visible === matches.length
            ? 'Showing ' + matches.length + ' ' + label
            : 'Showing ' + visible + ' of ' + matches.length + ' ' + label;
      }
      if (emptyEl) emptyEl.hidden = matches.length > 0;
      if (moreBtn) moreBtn.hidden = visible >= matches.length;
    }

    $$('[data-filter]', root).forEach(function (btn) {
      var key = btn.getAttribute('data-filter');
      if (btn.getAttribute('aria-pressed') === 'true') state[key] = btn.getAttribute('data-value');
      btn.addEventListener('click', function () {
        $$('[data-filter="' + key + '"]', root).forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        state[key] = btn.getAttribute('data-value');
        shown = pageSize || Infinity;
        apply();
      });
    });
    if (search) {
      search.addEventListener('input', function () {
        query = search.value.trim().toLowerCase();
        shown = pageSize || Infinity;
        apply();
      });
    }
    if (moreBtn) moreBtn.addEventListener('click', function () { shown += pageSize; apply(); });
    apply();
  });

  /* ---------- Course finder (compact on home, full on its own page) ---------- */
  var STAGE_CLASS = { '11': 'Class 11', '12': 'Class 12', pass: 'Class 12 passed' };

  function planText(f) {
    var two = f.years === 2 ? ' Two-year total ' + inr(f.courseTotal) + '.' : '';
    if (f.instalments.length === 1) return { title: 'One payment of ' + inr(f.total), note: 'Due at admission.' + two };
    if (f.instalments.length === 2) return { title: inr(f.instalments[0].amount) + ' now, ' + inr(f.instalments[1].amount) + ' later', note: f.instalments[1].label + '.' + two };
    return { title: '10 payments of ' + inr(f.instalments[0].amount), note: 'No-cost EMI through partner lenders, subject to approval.' + two };
  }

  $$('form[data-finder]').forEach(function (form) {
    if (!CFG.calcFee || !CFG.fees) return;
    var full = form.getAttribute('data-finder') === 'full';
    var scope = full ? document : form;
    var val = function (name) { var el = $('input[name="' + name + '"]:checked', form); return el ? el.value : null; };
    var outs = function (name) { return $$('[data-out="' + name + '"]', scope); };
    var set = function (name, text) { outs(name).forEach(function (el) { el.textContent = text; }); };
    var row = function (name, show) { var r = $('[data-row="' + name + '"]', scope); if (r) r.hidden = !show; };

    var params = null;
    try {
      params = new URLSearchParams(location.search);
      if (full && !params.get('stage')) {
        var saved = sessionStorage.getItem('ekagra-finder');
        if (saved) { params = new URLSearchParams(saved); sessionStorage.removeItem('ekagra-finder'); }
      }
    } catch (err) { params = null; }
    ['stage', 'goal', 'mode'].forEach(function (k) {
      var v = params && params.get(k);
      if (!v) return;
      var radio = $('input[name="' + k + '"][value="' + v + '"]', form);
      if (radio) radio.checked = true;
    });

    function update() {
      var input = {
        stage: val('stage'),
        goal: val('goal'),
        mode: val('mode'),
        schol: full ? val('schol') : 0,
        plan: full ? val('plan') : 'two',
        sibling: full ? form.elements.sibling.checked : false,
      };
      var f = CFG.calcFee(input, CFG.fees);
      set('name', f.row.name);
      if (!full) {
        set('meta', f.row.klass + '. Starts ' + f.row.start + '. ' + f.mode.note);
        set('fee', inr(f.subtotal));
        var f90 = CFG.calcFee({ stage: input.stage, goal: input.goal, mode: input.mode, schol: 90, plan: 'two', sibling: false }, CFG.fees);
        set('schol', inr(f90.subtotal) + ' a year');
        var link = outs('link')[0];
        if (link) link.setAttribute('data-finder-preset', 'stage=' + input.stage + '&goal=' + input.goal + '&mode=' + input.mode);
        return;
      }
      set('meta', f.row.klass + '. Starts ' + f.row.start + '. ' + f.row.timing + '.');
      set('modeNote', f.mode.note);
      set('modeLabel', f.mode.label.toLowerCase());
      set('tuition', inr(f.tuition));
      row('schol', f.scholAmt > 0); set('scholPct', String(f.scholPct)); set('scholAmt', '−' + inr(f.scholAmt));
      row('sibling', f.siblingAmt > 0); set('siblingAmt', '−' + inr(f.siblingAmt));
      row('full', f.fullAmt > 0); set('fullAmt', '−' + inr(f.fullAmt));
      set('material', inr(f.material));
      set('gst', inr(f.gst));
      set('total', inr(f.total));
      var p = planText(f);
      set('planTitle', p.title);
      set('planText', p.note);
      var plan = (CFG.plans || []).filter(function (x) { return x.id === input.plan; })[0];
      if (plan) set('planNote', plan.note);
      var centreQ = $('[data-centre-q]', form);
      if (centreQ) centreQ.hidden = input.mode === 'online';
      var centre = input.mode === 'online' ? 'Live online' : ($('input[name="centre"]:checked + label', form) || {}).textContent;
      var text = 'Ekagra fee estimate: ' + f.row.name + ' (' + f.row.klass + '), ' + f.mode.label.toLowerCase() +
        (input.mode === 'online' ? '' : ' at ' + centre) + '. ' + inr(f.total) + ' a year including GST' +
        (f.scholPct ? ', after a ' + f.scholPct + '% EKAT scholarship' : '') + '. Plan: ' + p.title + '.';
      var wa = outs('wa')[0];
      if (wa) wa.href = waUrl(text);
      lastFinder = { text: text, goal: (CFG.programNames || {})[f.row.program], klass: STAGE_CLASS[input.stage] || '' };
    }
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    update();
  });

  /* ---------- EKAT registration (three steps) ---------- */
  var reg = $('form[data-reg]');
  if (reg) {
    var box = reg.closest('.reg');
    var step = 1;
    var panels = $$('[data-step]', reg);
    var inds = $$('[data-step-ind]', box);
    var back = $('[data-reg-back]', reg);
    var next = $('[data-reg-next]', reg);
    var submitBtn = $('[data-reg-submit]', reg);
    var STEP_FIELDS = { 1: ['name', 'klass', 'board'], 3: ['parent', 'phone', 'email', 'consent'] };

    var showStep = function (n) {
      step = n;
      panels.forEach(function (p) { p.hidden = Number(p.getAttribute('data-step')) !== n; });
      inds.forEach(function (li) {
        var k = Number(li.getAttribute('data-step-ind'));
        li.classList.toggle('is-current', k === n);
        li.classList.toggle('is-done', k < n);
        if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
      });
      back.hidden = n === 1;
      next.hidden = n === 3;
      submitBtn.hidden = n !== 3;
      var first = $('input:not([type="hidden"]):not([type="radio"]), select', panels[n - 1]) || $('input', panels[n - 1]);
      if (first) first.focus({ preventScroll: true });
      if (box.getBoundingClientRect().top < 0) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    var stepValid = function (n) {
      if (n !== 2) return validate(reg, STEP_FIELDS[n]);
      var mode = $('input[name="mode"]:checked', reg).value;
      var slot = $('input[name="slot"]:checked', reg);
      var modeMsg = mode === 'At a centre' && slot.getAttribute('data-online-only') === 'true'
        ? 'The 6 December test is online only. Choose online, or pick another date.' : '';
      setErr(reg, 'mode', modeMsg);
      var centreMsg = mode === 'At a centre' && !reg.elements.centre.value ? 'Select a centre.' : '';
      setErr(reg, 'centre', centreMsg);
      if (centreMsg && !modeMsg) reg.elements.centre.focus();
      return !modeMsg && !centreMsg;
    };

    var syncFields = function () {
      var mode = $('input[name="mode"]:checked', reg).value;
      $('[data-centre-field]', reg).hidden = mode !== 'At a centre';
      $('[data-stream-field]', reg).hidden = !/Class 1[0-2]/.test(reg.elements.klass.value);
    };

    next.addEventListener('click', function () { if (stepValid(step)) showStep(step + 1); });
    back.addEventListener('click', function () { showStep(step - 1); });
    reg.addEventListener('change', syncFields);
    syncFields();

    reg.addEventListener('submit', function (e) {
      e.preventDefault();
      if (step < 3) { if (stepValid(step)) showStep(step + 1); return; }
      formError(reg, '');
      if (!stepValid(3)) return;
      var data = formData(reg);
      data.intent = 'EKAT registration';
      data.ref = 'EKAT26-' + String(Math.floor(10000 + Math.random() * 90000));
      busy(submitBtn, true);
      submitData(data)
        .then(function () {
          var success = $('.reg-success', box);
          var slot = (CFG.ekatDates || []).filter(function (d) { return d.id === data.slot; })[0];
          $('[data-reg-ref]', success).textContent = data.ref;
          if (slot) $('[data-reg-slot]', success).textContent = slot.long;
          reg.hidden = true;
          $('.reg-steps', box).hidden = true;
          success.hidden = false;
          success.focus();
        })
        .catch(function () {
          formError(reg, 'Your registration could not be sent. Check your connection and try again, or call ' + CFG.phone + '.');
        })
        .then(function () { busy(submitBtn, false); });
    });
  }

  /* ---------- Mini mock test ---------- */
  var mock = $('[data-mock]');
  if (mock && CFG.mock) {
    var mform = $('[data-mock-form]', mock);
    var steps = $$('.mock-step', mock);
    var result = $('[data-mock-result]', mock);
    var prevBtn = $('[data-mock-prev]', mock);
    var nextBtn = $('[data-mock-next]', mock);
    var subBtn = $('[data-mock-submit]', mock);
    var bar = $('[data-mock-bar]', mock);
    var timeEl = $('[data-time]', mock);
    var timerBox = $('[data-timer]', mock);
    var cur = 0;
    var remaining = 600;
    var timer = null;
    var fmt = function (s) { return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };

    var render = function () {
      steps.forEach(function (s, i) { s.hidden = i !== cur; });
      prevBtn.hidden = cur === 0;
      nextBtn.hidden = cur === steps.length - 1;
      subBtn.hidden = cur !== steps.length - 1;
      bar.style.width = ((cur + 1) / steps.length) * 100 + '%';
    };
    var startTimer = function () {
      if (timer) return;
      timer = setInterval(function () {
        remaining -= 1;
        timeEl.textContent = fmt(Math.max(0, remaining));
        timerBox.classList.toggle('is-low', remaining <= 60);
        if (remaining <= 0) finish();
      }, 1000);
    };
    var finish = function () {
      clearInterval(timer);
      timer = null;
      var score = 0;
      var list = $('[data-review]', result);
      list.innerHTML = '';
      CFG.mock.forEach(function (q, i) {
        var picked = $('input[name="q' + i + '"]:checked', mform);
        var v = picked ? Number(picked.value) : null;
        var verdict, cls;
        if (v === null) { verdict = 'Skipped, 0'; cls = 'skip-v'; }
        else if (v === q.answer) { score += 4; verdict = 'Correct, +4'; cls = 'ok'; }
        else { score -= 1; verdict = 'Wrong, −1'; cls = 'bad'; }
        var li = document.createElement('li');
        var tag = document.createElement('span');
        tag.className = 'verdict ' + cls;
        tag.textContent = 'Q' + (i + 1) + ', ' + q.subject + ': ' + verdict;
        var ans = document.createElement('b');
        ans.textContent = 'Answer: ' + q.options[q.answer];
        var why = document.createElement('p');
        why.textContent = q.why;
        li.appendChild(tag); li.appendChild(ans); li.appendChild(why);
        list.appendChild(li);
      });
      $('[data-score]', result).textContent = String(score);
      mform.hidden = true;
      result.hidden = false;
      result.focus();
    };

    mform.addEventListener('change', startTimer);
    prevBtn.addEventListener('click', function () { cur -= 1; render(); });
    nextBtn.addEventListener('click', function () { cur += 1; render(); startTimer(); });
    mform.addEventListener('submit', function (e) { e.preventDefault(); finish(); });
    $('[data-mock-retry]', result).addEventListener('click', function () {
      mform.reset();
      remaining = 600;
      timeEl.textContent = fmt(remaining);
      timerBox.classList.remove('is-low');
      cur = 0;
      render();
      result.hidden = true;
      mform.hidden = false;
    });
    render();
  }

  /* ---------- Copy buttons ---------- */
  $$('[data-copy]').forEach(function (btn) {
    var label = $('span', btn);
    var original = label.textContent;
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function (ok) {
        label.textContent = ok ? 'Copied' : text;
        setTimeout(function () { label.textContent = original; }, 2200);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
  });

  /* ---------- Programs sub-navigation ---------- */
  var subnav = $('.subnav');
  if (subnav && 'IntersectionObserver' in window) {
    var list = $('ul', subnav);
    var links = $$('a', subnav);
    var byId = {};
    links.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      if (document.getElementById(id)) byId[id] = a;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var a = byId[en.target.id];
        if (a) {
          a.classList.add('is-active');
          list.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(byId).forEach(function (id) { io.observe(document.getElementById(id)); });
  }
})();
