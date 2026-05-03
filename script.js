

const BASE = 'https://ipon-allowance.onrender.com';

/* ── Helpers ── */
const $ = id => document.getElementById(id);
const fmt = n => '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 });

function showToast(msg, type = 'success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

/* ── API status check ── */
async function checkStatus() {
  const dot   = $('statusDot');
  const label = $('statusLabel');
  try {
    await api('/weeks');
    dot.className = 'status-dot online';
    label.textContent = 'API online';
  } catch {
    dot.className = 'status-dot offline';
    label.textContent = 'API offline';
  }
}


document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    item.classList.add('active');
    const tab = item.dataset.tab;
    $(`tab-${tab}`).classList.add('active');
    if (tab === 'dashboard') loadDashboard();
    if (tab === 'weeks')     loadWeeks();
    if (tab === 'goals')     loadGoals();
  });
});


async function loadDashboard() {
  try {
    const [summary, goals] = await Promise.all([
      api('/summary/all'),
      api('/goals')
    ]);

    $('sv-weeks').textContent     = summary.totalWeeks ?? '0';
    $('sv-allowance').textContent = fmt(summary.totalAllowance ?? 0);
    $('sv-spent').textContent     = fmt(summary.totalSpent ?? 0);
    $('sv-saved').textContent     = fmt(summary.totalSaved ?? 0);
    $('sv-met').textContent       = summary.weeksMetTarget ?? '0';
    $('sv-missed').textContent    = summary.weeksMissed ?? '0';

    renderGoalsDash(goals);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function renderGoalsDash(goals) {
  const el = $('goalsDash');
  if (!goals.length) {
    el.innerHTML = '<div class="empty-msg">No goals yet. Create one in the Goals tab.</div>';
    return;
  }
  el.innerHTML = goals.map(g => {
    const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
    return `
    <div class="goal-dash-card ${g.achieved ? 'achieved' : ''}">
      <div class="goal-dash-info">
        <div class="goal-dash-name">${esc(g.name)}</div>
        <div class="goal-dash-amounts">
          <strong>${fmt(g.currentAmount)}</strong> of ${fmt(g.targetAmount)}
          &nbsp;·&nbsp; ${fmt(g.remaining)} remaining
        </div>
      </div>
      <div class="goal-bar-wrap">
        <div class="goal-bar-bg">
          <div class="goal-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="goal-pct">${pct}%</div>
      </div>
      ${g.achieved ? '<span class="achieved-badge">✓ Done</span>' : ''}
    </div>`;
  }).join('');
}

async function loadWeeks() {
  const el = $('weeksList');
  el.innerHTML = '<div class="loading-msg">Loading weeks…</div>';
  try {
    const weeks = await api('/weeks');
    if (!weeks.length) {
      el.innerHTML = '<div class="empty-msg">No weeks yet. Log your first week!</div>';
      return;
    }
    el.innerHTML = weeks.map(w => renderWeekCard(w)).join('');
    // bind action buttons
    el.querySelectorAll('[data-edit-week]').forEach(btn =>
      btn.addEventListener('click', () => openEditWeek(btn.dataset.editWeek)));
    el.querySelectorAll('[data-del-week]').forEach(btn =>
      btn.addEventListener('click', () => confirmDeleteWeek(btn.dataset.delWeek, btn.dataset.label)));
  } catch (e) {
    el.innerHTML = `<div class="empty-msg">${e.message}</div>`;
    showToast(e.message, 'error');
  }
}

function renderWeekCard(w) {
  const saved = w.saved ?? (w.allowance - w.spent);
  const met   = w.metTarget;
  return `
  <div class="week-card ${met ? 'met' : 'missed'}">
    <div>
      <div class="week-label">
        ${esc(w.weekLabel)}
        <span class="target-badge ${met ? 'met' : 'missed'}">${met ? '✓ Target met' : '✗ Missed'}</span>
      </div>
      <div class="week-stats">
        <div><div>Allowance</div><strong>${fmt(w.allowance)}</strong></div>
        <div><div>Spent</div><strong>${fmt(w.spent)}</strong></div>
        <div><div>Saved</div><strong>${fmt(saved)}</strong></div>
        <div><div>Target</div><strong>${fmt(w.saveTarget)}</strong></div>
      </div>
    </div>
    <div class="week-actions">
      <button class="btn-icon" data-edit-week="${w.id}" title="Edit">✎</button>
      <button class="btn-icon del" data-del-week="${w.id}" data-label="${esc(w.weekLabel)}" title="Delete">✕</button>
    </div>
  </div>`;
}

/* Add week modal */
$('openAddWeek').addEventListener('click', () => openWeekModal());
$('closeWeekModal').addEventListener('click', closeWeekModal);
$('cancelWeek').addEventListener('click', closeWeekModal);

function openWeekModal(week = null) {
  $('weekModalTitle').textContent = week ? 'Edit Week' : 'New Week';
  $('weekSubmitBtn').textContent  = week ? 'Update' : 'Save Week';
  $('weekId').value        = week ? week.id : '';
  $('weekLabel').value     = week ? week.weekLabel : '';
  $('weekAllowance').value = week ? week.allowance : '';
  $('weekSpent').value     = week ? week.spent : '';
  $('weekTarget').value    = week ? week.saveTarget : '';
  $('weekError').classList.add('hidden');
  $('weekModal').classList.remove('hidden');
}

function closeWeekModal() { $('weekModal').classList.add('hidden'); }

async function openEditWeek(id) {
  try {
    const week = await api(`/weeks/${id}`);
    openWeekModal(week);
  } catch (e) { showToast(e.message, 'error'); }
}

$('weekForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('weekId').value;
  const body = {
    weekLabel:  $('weekLabel').value.trim(),
    allowance:  Number($('weekAllowance').value),
    spent:      Number($('weekSpent').value),
    saveTarget: Number($('weekTarget').value)
  };
  try {
    if (id) { await api(`/weeks/${id}`, 'PUT', body); showToast('Week updated!'); }
    else     { await api('/weeks', 'POST', body);      showToast('Week added!'); }
    closeWeekModal();
    loadWeeks();
    loadDashboard();
  } catch (e) {
    const err = $('weekError');
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
});


let _pendingDeleteWeek = null;
function confirmDeleteWeek(id, label) {
  _pendingDeleteWeek = id;
  $('deleteMsg').textContent = `Delete "${label}"? This cannot be undone.`;
  $('deleteModal').classList.remove('hidden');
}
$('closeDeleteModal').addEventListener('click', () => $('deleteModal').classList.add('hidden'));
$('cancelDelete').addEventListener('click',     () => $('deleteModal').classList.add('hidden'));
$('confirmDelete').addEventListener('click', async () => {
  if (!_pendingDeleteWeek) return;
  try {
    await api(`/weeks/${_pendingDeleteWeek}`, 'DELETE');
    showToast('Week deleted');
    $('deleteModal').classList.add('hidden');
    _pendingDeleteWeek = null;
    loadWeeks();
    loadDashboard();
  } catch (e) { showToast(e.message, 'error'); }
});


async function loadGoals() {
  const el = $('goalsList');
  el.innerHTML = '<div class="loading-msg">Loading goals…</div>';
  try {
    const goals = await api('/goals');
    if (!goals.length) {
      el.innerHTML = '<div class="empty-msg">No goals yet. Start saving toward something!</div>';
      return;
    }
    el.innerHTML = goals.map(g => renderGoalCard(g)).join('');
    // bind buttons
    el.querySelectorAll('[data-edit-goal]').forEach(btn =>
      btn.addEventListener('click', () => openEditGoal(btn.dataset.editGoal)));
    el.querySelectorAll('[data-del-goal]').forEach(btn =>
      btn.addEventListener('click', () => confirmDeleteGoal(btn.dataset.delGoal, btn.dataset.name)));
    el.querySelectorAll('[data-contribute]').forEach(btn =>
      btn.addEventListener('click', () => openContribute(btn.dataset.contribute, btn.dataset.name)));
  } catch (e) {
    el.innerHTML = `<div class="empty-msg">${e.message}</div>`;
    showToast(e.message, 'error');
  }
}

function renderGoalCard(g) {
  const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
  return `
  <div class="goal-card ${g.achieved ? 'achieved-card' : ''}">
    <div class="goal-card-name">${esc(g.name)}</div>
    <div>
      <div class="goal-card-amounts">
        <div>
          <div style="font-size:10px;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px">Saved</div>
          <div class="big">${fmt(g.currentAmount)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px">Target</div>
          <div style="font-size:14px;color:var(--text)">${fmt(g.targetAmount)}</div>
        </div>
      </div>
    </div>
    <div>
      <div class="goal-card-bar-bg">
        <div class="goal-card-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>
    <div class="goal-card-footer">
      <span>${pct}% complete · ${fmt(g.remaining)} left</span>
      ${g.achieved ? '<span class="achieved-badge">✓ Done!</span>' : ''}
    </div>
    <div class="goal-card-actions">
      ${!g.achieved ? `<button class="btn-icon contribute" data-contribute="${g.id}" data-name="${esc(g.name)}" title="Contribute">＋</button>` : ''}
      <button class="btn-icon" data-edit-goal="${g.id}" title="Edit">✎</button>
      <button class="btn-icon del" data-del-goal="${g.id}" data-name="${esc(g.name)}" title="Delete">✕</button>
    </div>
  </div>`;
}

/* Add goal modal */
$('openAddGoal').addEventListener('click', () => openGoalModal());
$('closeGoalModal').addEventListener('click', closeGoalModal);
$('cancelGoal').addEventListener('click', closeGoalModal);

function openGoalModal(goal = null) {
  $('goalModalTitle').textContent = goal ? 'Edit Goal' : 'New Goal';
  $('goalId').value     = goal ? goal.id : '';
  $('goalName').value   = goal ? goal.name : '';
  $('goalTarget').value = goal ? goal.targetAmount : '';
  $('goalError').classList.add('hidden');
  $('goalModal').classList.remove('hidden');
}
function closeGoalModal() { $('goalModal').classList.add('hidden'); }

async function openEditGoal(id) {
  try {
    const goal = await api(`/goals/${id}`);
    openGoalModal(goal);
  } catch (e) { showToast(e.message, 'error'); }
}

$('goalForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('goalId').value;
  const body = {
    name: $('goalName').value.trim(),
    targetAmount: Number($('goalTarget').value)
  };
  try {
    if (id) { await api(`/goals/${id}`, 'PUT', body); showToast('Goal updated!'); }
    else     { await api('/goals', 'POST', body);      showToast('Goal created!'); }
    closeGoalModal();
    loadGoals();
    loadDashboard();
  } catch (e) {
    const err = $('goalError');
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
});

/* Delete goal */
let _pendingDeleteGoal = null;
function confirmDeleteGoal(id, name) {
  _pendingDeleteGoal = { id, type: 'goal' };
  $('deleteMsg').textContent = `Delete goal "${name}"? This cannot be undone.`;
  $('deleteModal').classList.remove('hidden');
}
// Re-use same delete modal for both weeks and goals
const _origConfirmDelete = $('confirmDelete').onclick;
$('confirmDelete').addEventListener('click', async () => {
  if (_pendingDeleteGoal && _pendingDeleteGoal.type === 'goal') {
    try {
      await api(`/goals/${_pendingDeleteGoal.id}`, 'DELETE');
      showToast('Goal deleted');
      $('deleteModal').classList.add('hidden');
      _pendingDeleteGoal = null;
      loadGoals();
      loadDashboard();
    } catch (e) { showToast(e.message, 'error'); }
  }
});


$('closeContributeModal').addEventListener('click', () => $('contributeModal').classList.add('hidden'));
$('cancelContribute').addEventListener('click',     () => $('contributeModal').classList.add('hidden'));

function openContribute(id, name) {
  $('contributeGoalId').value   = id;
  $('contributeGoalName').textContent = name;
  $('contributeAmount').value   = '';
  $('contributeError').classList.add('hidden');
  $('contributeModal').classList.remove('hidden');
}

$('contributeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id     = $('contributeGoalId').value;
  const amount = Number($('contributeAmount').value);
  try {
    await api(`/goals/${id}/contribute`, 'POST', { amount });
    showToast('Contribution added! 💰');
    $('contributeModal').classList.add('hidden');
    loadGoals();
    loadDashboard();
  } catch (e) {
    const err = $('contributeError');
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
});

/* ── Escape HTML ── */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Close modals on backdrop click ── */
['weekModal','goalModal','contributeModal','deleteModal'].forEach(id => {
  $(id).addEventListener('click', e => {
    if (e.target === $(id)) $(id).classList.add('hidden');
  });
});

/* ── Boot ── */
(async () => {
  checkStatus();
  await loadDashboard();
})();