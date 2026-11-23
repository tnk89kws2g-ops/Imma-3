(function () {
  'use strict';

  // Optional: integrate with Telegram Mini App if running inside Telegram
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  } catch (e) {}

  var STORE_KEY = 'easypay-state-v1';

  var state = {
    balance: 112,
    saving: 10,
    accountNumber: '0123456789',
    hidden: true,
    recents: ['maya_lopez', 'daniel_kim', 'sarah_ahmed'],
    // type: 'in' (money received) or 'out' (money sent). Newest are shown first.
    transactions: [
      { id: 1, type: 'in',  title: 'Added money',      amount: 150, date: '2026-11-18T09:14:00' },
      { id: 2, type: 'out', title: 'Withdrawal',       amount: 28,  date: '2026-11-19T15:40:00' },
      { id: 3, type: 'out', title: 'Moved to Saving',  amount: 10,  date: '2026-11-20T18:05:00' }
    ]
  };

  // Restore saved data (balance, saving, transactions)
  try {
    var saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && typeof saved.balance === 'number' && Array.isArray(saved.transactions)) {
      state.balance = saved.balance;
      state.saving = saved.saving || 0;
      state.transactions = saved.transactions;
      if (Array.isArray(saved.recents)) state.recents = saved.recents;
    }
  } catch (e) {}
  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        balance: state.balance, saving: state.saving, transactions: state.transactions, recents: state.recents
      }));
    } catch (e) {}
  }

  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var money = function (n) { return '$' + fmt(n); };

  // Balance with faded grey cents
  function renderBalance() {
    var parts = state.balance.toFixed(2).split('.');
    var whole = Number(parts[0]).toLocaleString('en-US');
    $('balance').innerHTML = '$' + whole + '<span class="cents">.' + parts[1] + '</span>';
    $('savingAmt').textContent = money(state.saving);
  }

  // Transactions
  var ICON_IN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 8 17 17 8 17"/></svg>';
  var ICON_OUT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="17" x2="7" y2="7"/><polyline points="7 16 7 7 16 7"/></svg>';
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
           d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function renderTransactions() {
    var list = $('txList');
    var items = state.transactions.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    $('txEmpty').hidden = items.length > 0;
    list.innerHTML = items.map(function (t) {
      var sign = t.type === 'in' ? '+' : '\u2212';
      return '<li class="tx-item ' + t.type + '">' +
        '<span class="tx-ico">' + (t.type === 'in' ? ICON_IN : ICON_OUT) + '</span>' +
        '<span class="tx-text"><strong>' + escapeHtml(t.title) + '</strong><small>' + fmtDate(t.date) + (t.note ? ' \u00b7 ' + escapeHtml(t.note) : '') + '</small></span>' +
        '<span class="tx-amt money">' + sign + money(t.amount) + '</span>' +
      '</li>';
    }).join('');
  }
  function addTransaction(type, title, amount, extra) {
    var tx = { id: Date.now(), type: type, title: title, amount: amount, date: new Date().toISOString() };
    if (extra && extra.note) tx.note = extra.note;
    state.transactions.push(tx);
    state.balance += type === 'in' ? amount : -amount;
    persist();
    renderBalance();
    renderTransactions();
  }

  // Account number show / hide
  var eyeOff = $('eyeIcon').innerHTML;
  var eyeOn = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  function renderAccount() {
    $('accountNum').textContent = state.hidden ? '•••••••••' : state.accountNumber;
    $('eyeIcon').innerHTML = state.hidden ? eyeOff : eyeOn;
  }
  $('accountToggle').addEventListener('click', function () {
    state.hidden = !state.hidden;
    renderAccount();
  });

  // Toast
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }

  // Amount sheet (Add money / Withdraw)
  var sheetMode = null;
  function openSheet(mode) {
    sheetMode = mode;
    $('sheetTitle').textContent = mode === 'in' ? 'Add money' : 'Withdraw';
    $('sheetAmount').value = '';
    $('sheetError').textContent = '';
    $('sheetBackdrop').hidden = false;
    setTimeout(function () { $('sheetAmount').focus(); }, 50);
  }
  function closeSheet() { $('sheetBackdrop').hidden = true; sheetMode = null; }
  function confirmSheet() {
    var amount = Math.round(parseFloat($('sheetAmount').value) * 100) / 100;
    if (!amount || amount <= 0) { $('sheetError').textContent = 'Enter an amount greater than $0.'; return; }
    if (sheetMode === 'out' && amount > state.balance) { $('sheetError').textContent = 'That is more than your balance.'; return; }
    addTransaction(sheetMode, sheetMode === 'in' ? 'Added money' : 'Withdrawal', amount);
    toast((sheetMode === 'in' ? 'Added ' : 'Withdrew ') + money(amount));
    closeSheet();
  }
  $('sheetCancel').addEventListener('click', closeSheet);
  $('sheetConfirm').addEventListener('click', confirmSheet);
  $('sheetBackdrop').addEventListener('click', function (e) { if (e.target === this) closeSheet(); });
  $('sheetAmount').addEventListener('keydown', function (e) { if (e.key === 'Enter') confirmSheet(); if (e.key === 'Escape') closeSheet(); });

  // Actions
  var messages = { paychecks: 'Paychecks', saving: 'Saving' };
  document.querySelectorAll('[data-action]').forEach(function (el) {
    el.addEventListener('click', function () {
      var a = el.dataset.action;
      if (a === 'add') return openSheet('in');
      if (a === 'withdraw') return openSheet('out');
      toast(messages[a] + ' tapped');
    });
  });

  // Tab bar
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      if (tab.dataset.tab === 'payment') { openRecipient(); return; }
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      if (tab.dataset.tab !== 'home') toast(tab.textContent.trim() + ' coming soon');
    });
  });

  // ---------- Haptics (vibration on every press) ----------
  var hx = $('hx');
  function haptic(kind) {
    try {
      var tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback;
      if (tg) { if (kind === 'success') tg.notificationOccurred('success'); else tg.impactOccurred('light'); return; }
    } catch (e) {}
    if (navigator.vibrate) { navigator.vibrate(kind === 'success' ? [18, 70, 18, 70, 40] : 12); return; }
    // iPhone Safari has no vibrate(); toggling a hidden iOS switch gives a haptic tick instead
    try { hx.click(); if (kind === 'success') { setTimeout(function () { hx.click(); }, 110); setTimeout(function () { hx.click(); }, 240); } } catch (e) {}
  }
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (b && !b.disabled) haptic();
  }, { passive: true });
  document.addEventListener('touchstart', function () {}, { passive: true }); // lets :active work on iOS

  // ---------- Rubber band blends with the page ----------
  var TOP = '#c1eccf', BASE = '#f3f3f1', meta = document.querySelector('meta[name="theme-color"]'), tintMode = '';
  function tint() {
    var m = (window.pageYOffset || 0) <= 1 ? 'top' : 'base';
    if (m === tintMode) return;
    tintMode = m;
    var c = m === 'top' ? TOP : BASE;
    if (meta) meta.setAttribute('content', c);
    document.documentElement.style.backgroundColor = c;
  }
  window.addEventListener('scroll', tint, { passive: true });
  tint();

  // ---------- Send money flow ----------
  var DIRECTORY = [
    { name: 'Maya Lopez', user: 'maya_lopez' }, { name: 'Daniel Kim', user: 'daniel_kim' },
    { name: 'Sarah Ahmed', user: 'sarah_ahmed' }, { name: 'Leo Martins', user: 'leo_martins' },
    { name: 'Priya Nair', user: 'priya_nair' }, { name: 'Tom Becker', user: 'tom_becker' }
  ];
  var flow = { to: null, amount: 0, note: '', busy: false };
  var CHEV = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>';

  function userByHandle(h) {
    for (var i = 0; i < DIRECTORY.length; i++) if (DIRECTORY[i].user === h) return DIRECTORY[i];
    return { name: '@' + h, user: h };
  }
  function hue(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360; return h; }
  function avatar(u) {
    var h = hue(u.user);
    return '<span class="avatar" style="background:hsl(' + h + ',60%,88%);color:hsl(' + h + ',45%,28%)">' + escapeHtml(u.user.charAt(0).toUpperCase()) + '</span>';
  }
  function personRow(u) {
    return '<button class="person" type="button" data-user="' + escapeHtml(u.user) + '">' + avatar(u) +
      '<span class="p-text"><strong>' + escapeHtml(u.name) + '</strong><small>@' + escapeHtml(u.user) + '</small></span>' + CHEV + '</button>';
  }
  function renderPeople() {
    var q = $('searchInput').value.trim().replace(/^@/, '').toLowerCase();
    $('searchClear').hidden = !$('searchInput').value;
    var list;
    if (!q) {
      $('peopleLabel').textContent = 'Recent';
      list = state.recents.map(userByHandle);
    } else {
      $('peopleLabel').textContent = 'Results';
      var pool = DIRECTORY.slice();
      state.recents.forEach(function (h) { if (!pool.some(function (u) { return u.user === h; })) pool.push(userByHandle(h)); });
      list = pool.filter(function (u) { return u.user.toLowerCase().indexOf(q) > -1 || u.name.toLowerCase().indexOf(q) > -1; });
      if (/^[a-z][a-z0-9_]{4,31}$/.test(q) && !pool.some(function (u) { return u.user.toLowerCase() === q; })) list.push({ name: '@' + q, user: q });
    }
    $('peopleBox').innerHTML = list.length
      ? '<div class="people">' + list.map(personRow).join('') + '</div>'
      : '<p class="tx-empty">' + (q ? 'No user found. Check the username and try again.' : 'No recent recipients yet. Search a Telegram username above.') + '</p>';
  }
  function openPage(id) { var p = $(id); p.classList.add('open'); p.setAttribute('aria-hidden', 'false'); }
  function closePage(id) { var p = $(id); p.classList.remove('open'); p.setAttribute('aria-hidden', 'true'); }
  function blurActive() { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }

  function openRecipient() { $('searchInput').value = ''; renderPeople(); openPage('pageRecipient'); }
  $('recBack').addEventListener('click', function () { blurActive(); closePage('pageRecipient'); });
  $('amtBack').addEventListener('click', function () { blurActive(); closePage('pageAmount'); });
  $('searchInput').addEventListener('input', renderPeople);
  $('searchClear').addEventListener('click', function () { $('searchInput').value = ''; renderPeople(); $('searchInput').focus(); });
  $('peopleBox').addEventListener('click', function (e) {
    var b = e.target.closest('.person');
    if (b) selectRecipient(b.dataset.user);
  });

  function amountHtml(n) {
    var p = n.toFixed(2).split('.');
    return '$' + Number(p[0]).toLocaleString('en-US') + '<span class="cents">.' + p[1] + '</span>';
  }
  function curAmount() { return Math.round((parseFloat($('amtInput').value) || 0) * 100) / 100; }
  function sizeAmt() { $('amtInput').style.width = Math.max(4, $('amtInput').value.length + 0.6) + 'ch'; }
  function updateSend() {
    var a = curAmount(), over = a > state.balance;
    $('avail').textContent = over ? 'Not enough balance. You have ' + money(state.balance) : 'Available: ' + money(state.balance);
    $('avail').classList.toggle('err', over);
    $('amtNext').disabled = !(a > 0) || over;
  }
  function selectRecipient(h) {
    flow.to = userByHandle(h);
    blurActive();
    $('toChip').innerHTML = avatar(flow.to) + '<span>' + escapeHtml(flow.to.name) + (flow.to.name.charAt(0) === '@' ? '' : ' \u00b7 @' + escapeHtml(flow.to.user)) + '</span>';
    $('amtInput').value = ''; $('noteInput').value = '';
    sizeAmt(); updateSend();
    openPage('pageAmount');
    setTimeout(function () { try { $('amtInput').focus(); } catch (e) {} }, 650);
  }
  $('amtInput').addEventListener('input', function () {
    var v = this.value.replace(/[^\d.]/g, ''), i = v.indexOf('.');
    if (i > -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, 2);
    this.value = v.slice(0, 10);
    sizeAmt(); updateSend();
  });

  function detailsHtml() {
    var rows = [['To', '@' + flow.to.user], ['From', 'Easypay balance']];
    if (flow.note) rows.push(['Description', flow.note]);
    rows.push(['Fee', 'Free'], ['Date', new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })]);
    return rows.map(function (r) { return '<div class="drow"><span>' + r[0] + '</span><span>' + escapeHtml(r[1]) + '</span></div>'; }).join('');
  }
  function showPop(id) { $('popBackdrop').classList.add('show'); $(id).classList.add('show'); }

  // Send on the amount page -> confirm popup
  $('amtNext').addEventListener('click', function () {
    flow.amount = curAmount();
    if (!(flow.amount > 0) || flow.amount > state.balance) return;
    flow.note = $('noteInput').value.trim();
    blurActive();
    $('cAmount').innerHTML = amountHtml(flow.amount);
    $('cSub').textContent = 'to ' + flow.to.name + (flow.to.name.charAt(0) === '@' ? '' : ' (@' + flow.to.user + ')');
    $('cDetails').innerHTML = detailsHtml();
    showPop('confirmPop');
  });
  function closeConfirm() { $('confirmPop').classList.remove('show'); $('popBackdrop').classList.remove('show'); }
  $('confirmCancel').addEventListener('click', closeConfirm);
  $('popBackdrop').addEventListener('click', function (e) { if (e.target === this && $('confirmPop').classList.contains('show')) closeConfirm(); });

  // Confirm popup Send -> bigger processing popup (7 seconds) -> success
  var statusTimer, doneTimer;
  $('confirmSend').addEventListener('click', function () {
    if (flow.busy) return;
    flow.busy = true;
    $('confirmPop').classList.remove('show');
    setTimeout(startProcessing, 220);
  });
  function setStatus(t) {
    var el = $('pSub'); el.style.opacity = 0;
    setTimeout(function () { el.textContent = t; el.style.opacity = 1; }, 220);
  }
  function startProcessing() {
    var pop = $('processPop'), stage = $('stage');
    pop.classList.remove('is-done'); stage.classList.remove('go');
    $('pTitle').textContent = 'Processing transfer';
    $('pSub').textContent = 'Securing your transfer';
    $('pAmount').innerHTML = amountHtml(flow.amount);
    $('pDetails').innerHTML = detailsHtml();
    void stage.offsetWidth;
    showPop('processPop');
    requestAnimationFrame(function () { requestAnimationFrame(function () { stage.classList.add('go'); }); });
    var msgs = ['Verifying details', 'Sending to @' + flow.to.user, 'Confirming with recipient', 'Finalising'], k = 0;
    clearInterval(statusTimer);
    statusTimer = setInterval(function () { setStatus(msgs[k % msgs.length]); k++; }, 1650);
    clearTimeout(doneTimer);
    doneTimer = setTimeout(finishTransfer, 7000);
  }
  function finishTransfer() {
    clearInterval(statusTimer);
    $('processPop').classList.add('is-done');
    $('pTitle').textContent = 'Transfer successful';
    $('pSub').style.opacity = 1;
    $('pSub').textContent = 'You sent ' + money(flow.amount) + ' to @' + flow.to.user;
    addTransaction('out', 'Sent to @' + flow.to.user, flow.amount, { note: flow.note });
    state.recents = [flow.to.user].concat(state.recents.filter(function (h) { return h !== flow.to.user; })).slice(0, 8);
    persist();
    haptic('success');
    confetti();
  }
  $('doneBtn').addEventListener('click', function () {
    $('processPop').classList.remove('show');
    $('popBackdrop').classList.remove('show');
    closePage('pageAmount'); closePage('pageRecipient');
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === 'home'); });
    window.scrollTo(0, 0);
    setTimeout(function () { flow.busy = false; $('processPop').classList.remove('is-done'); $('stage').classList.remove('go'); }, 700);
  });

  // ---------- Confetti ----------
  function confetti() {
    var c = $('confetti'), ctx = c.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var r = $('stage').getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    var cols = ['#1f9d55', '#F5B731', '#111111', '#6ee7a8', '#ff6b6b', '#4dabf7', '#c084fc'], ps = [], start = performance.now();
    function burst(n, x, y, spread, angle, power) {
      for (var i = 0; i < n; i++) {
        var a = angle + (Math.random() - .5) * spread, sp = power * (.5 + Math.random());
        ps.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 6 + Math.random() * 6, h: 4 + Math.random() * 7,
          rot: Math.random() * 6.28, vr: (Math.random() - .5) * .35, col: cols[Math.random() * cols.length | 0],
          circ: Math.random() < .25, life: 0, max: 130 + Math.random() * 80 });
      }
    }
    burst(110, ox, oy, Math.PI * 2, -Math.PI / 2, 15);
    setTimeout(function () { burst(50, 0, H * .65, .7, -.9, 21); burst(50, W, H * .65, .7, -Math.PI + .9, 21); }, 250);
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      ps = ps.filter(function (p) { return p.life < p.max; });
      ps.forEach(function (p) {
        p.vx *= .985; p.vy = p.vy * .985 + .38; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = 1 - Math.max(0, (p.life - p.max * .7) / (p.max * .3));
        ctx.fillStyle = p.col; ctx.scale(1, Math.cos(p.life * .15 + p.rot));
        if (p.circ) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, 6.28); ctx.fill(); } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (ps.length || performance.now() - start < 600) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    })();
  }

  renderBalance();
  renderTransactions();
  renderAccount();
})();
