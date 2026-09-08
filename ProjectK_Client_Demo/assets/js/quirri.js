/* ==========================================================================
   Project K — demo shell behaviour
   Static click-through only. No network, no persistence, no real auth.
   ========================================================================== */

/* ---------- In-page module routing ---------- */
function go(id, push) {
  var page = document.getElementById(id);
  if (!page) return;
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('show'); });
  page.classList.add('show');
  document.querySelectorAll('.nav a[data-page]').forEach(function (a) {
    a.classList.toggle('active', a.dataset.page === id);
  });
  var meta = window.PAGE_TITLES && window.PAGE_TITLES[id];
  if (meta) {
    var h = document.getElementById('pgTitle');
    var p = document.getElementById('pgSub');
    if (h) h.textContent = meta[0];
    if (p) p.textContent = meta[1];
  }
  if (push !== false) history.replaceState(null, '', '#' + id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initNav() {
  document.querySelectorAll('.nav a[data-page]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (a.classList.contains('locked')) {
        toast('Your role does not have access to this module.', 'warn');
        return;
      }
      go(a.dataset.page);
    });
  });
  var start = location.hash.replace('#', '');
  if (start && document.getElementById(start)) go(start, false);
}

/* ---------- Modals ---------- */
function openModal(id) {
  var m = document.getElementById(id);
  if (m) m.classList.add('show');
}
function closeModal(id) {
  var m = document.getElementById(id);
  if (m) m.classList.remove('show');
}
function initModals() {
  document.querySelectorAll('.overlay').forEach(function (o) {
    o.addEventListener('click', function (e) {
      if (e.target === o) o.classList.remove('show');
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.overlay.show').forEach(function (o) { o.classList.remove('show'); });
    }
  });
}

/* ---------- Tabs ---------- */
function initTabs() {
  document.querySelectorAll('[data-tabgroup]').forEach(function (group) {
    var name = group.dataset.tabgroup;
    group.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        group.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        document.querySelectorAll('[data-tabpanel="' + name + '"]').forEach(function (panel) {
          panel.style.display = panel.dataset.tabkey === tab.dataset.tabkey ? '' : 'none';
        });
      });
    });
  });
}

/* ---------- Academic tree ---------- */
function toggleNode(row) {
  var node = row.closest('.tnode');
  node.classList.toggle('open');
  row.classList.toggle('open');
}
function pickNode(row) {
  document.querySelectorAll('.trow.sel').forEach(function (r) { r.classList.remove('sel'); });
  row.classList.add('sel');
}

/* ---------- Password field ---------- */
var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.4 0 10 7 10 7a17 17 0 0 1-2.5 3.35M6.6 6.6A17 17 0 0 0 2 11s3.6 7 10 7a9 9 0 0 0 5.4-1.6"/><path d="M2 2l20 20"/></svg>';

function initPasswordToggles() {
  document.querySelectorAll('.pw-wrap').forEach(function (wrap) {
    var input = wrap.querySelector('input');
    var btn = wrap.querySelector('.pw-toggle');
    if (!input || !btn) return;
    btn.innerHTML = EYE;
    btn.setAttribute('aria-label', 'Show password');
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? EYE_OFF : EYE;
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });
}

/* Mirrors the backend policy in app/utils/security.py:
   8+ chars, one uppercase, one lowercase, one digit. */
function initPasswordMeter() {
  document.querySelectorAll('[data-pwmeter]').forEach(function (input) {
    var meter = document.querySelector('#' + input.dataset.pwmeter);
    if (!meter) return;
    var rules = meter.parentElement.querySelectorAll('.pw-rule');
    input.addEventListener('input', function () {
      var v = input.value;
      var checks = [v.length >= 8, /[A-Z]/.test(v), /[a-z]/.test(v), /[0-9]/.test(v)];
      var score = checks.filter(Boolean).length;
      meter.className = 'pw-meter s' + score;
      rules.forEach(function (r, i) { r.classList.toggle('ok', !!checks[i]); });
    });
  });
}

/* ---------- OTP inputs ---------- */
function initOtp() {
  var boxes = document.querySelectorAll('.otp-row input');
  boxes.forEach(function (box, i) {
    box.addEventListener('input', function () {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (box.value && boxes[i + 1]) boxes[i + 1].focus();
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !box.value && boxes[i - 1]) boxes[i - 1].focus();
    });
  });
}

/* ---------- Toast ---------- */
function toast(msg, kind) {
  var host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:200;display:flex;flex-direction:column;gap:8px;align-items:center';
    document.body.appendChild(host);
  }
  var el = document.createElement('div');
  var bg = kind === 'warn' ? '#b26a05' : (kind === 'err' ? '#d0342c' : '#123c3a');
  el.style.cssText = 'background:' + bg + ';color:#fff;padding:11px 18px;border-radius:10px;font-size:13px;font-weight:600;box-shadow:0 8px 28px rgba(9,25,40,.28);animation:rise .22s ease';
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(function () { el.remove(); }, 300);
  }, 2600);
}

/* Any control that is demo-only (would call the API in the real build). */
function initDemoActions() {
  document.querySelectorAll('[data-demo]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      toast(el.dataset.demo);
    });
  });
}

/* ---------- Quiz (student assessment attempt) ---------- */
function initQuiz() {
  document.querySelectorAll('.opts .opt-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.closest('.opts');
      group.querySelectorAll('.opt-btn').forEach(function (b) { b.classList.remove('sel'); });
      btn.classList.add('sel');
    });
  });
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', function () {
  initNav();
  initModals();
  initTabs();
  initPasswordToggles();
  initPasswordMeter();
  initOtp();
  initDemoActions();
  initQuiz();
});
