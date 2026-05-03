const API = "http://localhost:3000";

/* ───────────────── TAB NAVIGATION ───────────────── */
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));

    item.classList.add("active");
    document.getElementById("tab-" + item.dataset.tab).classList.add("active");
  });
});

/* ───────────────── API STATUS ───────────────── */
async function checkAPI() {
  try {
    await fetch(`${API}/weeks`);
    statusDot.classList.add("online");
    statusLabel.textContent = "API Online";
  } catch {
    statusDot.classList.add("offline");
    statusLabel.textContent = "API Offline";
  }
}
checkAPI();

/* ───────────────── TOAST ───────────────── */
function toast(msg, type="success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(()=> t.classList.add("hidden"), 2500);
  t.classList.remove("hidden");
}

/* ───────────────── DASHBOARD SUMMARY ───────────────── */
async function loadSummary() {
  const res = await fetch(`${API}/summary/all`);
  const s = await res.json();

  sv-weeks.textContent     = s.totalWeeks;
  sv-allowance.textContent = "₱" + s.totalAllowance;
  sv-spent.textContent     = "₱" + s.totalSpent;
  sv-saved.textContent     = "₱" + s.totalSaved;
  sv-met.textContent       = s.weeksMetTarget;
  sv-missed.textContent    = s.weeksMissed;
}

/* ───────────────── WEEKS ───────────────── */
async function loadWeeks() {
  const res = await fetch(`${API}/weeks`);
  const weeks = await res.json();

  const list = document.getElementById("weeksList");
  if (!weeks.length) {
    list.innerHTML = `<div class="empty-msg">No weeks yet.</div>`;
    return;
  }

  list.innerHTML = weeks.map(w => `
    <div class="week-card ${w.metTarget ? "met":"missed"}">
      <div>
        <div class="week-label">
          ${w.weekLabel}
          <span class="target-badge ${w.metTarget ? "met":"missed"}">
            ${w.metTarget ? "MET":"MISSED"}
          </span>
        </div>
        <div class="week-stats">
          <div class="week-stat">Allowance <strong>₱${w.allowance}</strong></div>
          <div class="week-stat">Spent <strong>₱${w.spent}</strong></div>
          <div class="week-stat">Saved <strong>₱${w.saved}</strong></div>
          <div class="week-stat">Target <strong>₱${w.saveTarget}</strong></div>
        </div>
      </div>
      <div class="week-actions">
        <button class="btn-icon del" onclick="deleteWeek(${w.id})">✕</button>
      </div>
    </div>
  `).join("");
}

/* Add Week */
weekForm.addEventListener("submit", async e => {
  e.preventDefault();

  const data = {
    weekLabel: weekLabel.value,
    allowance: Number(weekAllowance.value),
    spent: Number(weekSpent.value),
    saveTarget: Number(weekTarget.value),
  };

  await fetch(`${API}/weeks`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(data)
  });

  closeWeek();
  toast("Week saved");
  loadWeeks();
  loadSummary();
});

async function deleteWeek(id){
  await fetch(`${API}/weeks/${id}`, {method:"DELETE"});
  toast("Week deleted","error");
  loadWeeks();
  loadSummary();
}

/* ───────────────── GOALS ───────────────── */
async function loadGoals(){
  const res = await fetch(`${API}/goals`);
  const goals = await res.json();

  goalsList.innerHTML = goals.map(g => `
    <div class="goal-card ${g.achieved ? "achieved-card":""}">
      <div class="goal-card-name">${g.name}</div>
      <div class="goal-card-amounts">
        <div>Saved</div>
        <div class="big">₱${g.currentAmount}</div>
      </div>
      <div class="goal-card-bar-bg">
        <div class="goal-card-bar-fill" style="width:${g.progressPercent}%"></div>
      </div>
      <div class="goal-card-footer">
        <div>Target ₱${g.targetAmount}</div>
        <div class="goal-card-actions">
          <button class="btn-icon contribute" onclick="openContribute(${g.id},'${g.name}')">＋</button>
          <button class="btn-icon del" onclick="deleteGoal(${g.id})">✕</button>
        </div>
      </div>
    </div>
  `).join("");

  loadGoalsDash(goals);
}

/* Goals on dashboard */
function loadGoalsDash(goals){
  goalsDash.innerHTML = goals.map(g=>`
    <div class="goal-dash-card ${g.achieved?"achieved":""}">
      <div class="goal-dash-info">
        <div class="goal-dash-name">${g.name}</div>
        <div class="goal-dash-amounts">
          <strong>₱${g.currentAmount}</strong> / ₱${g.targetAmount}
        </div>
      </div>
      <div class="goal-bar-wrap">
        <div class="goal-bar-bg">
          <div class="goal-bar-fill" style="width:${g.progressPercent}%"></div>
        </div>
        <div class="goal-pct">${g.progressPercent.toFixed(0)}%</div>
      </div>
      ${g.achieved?'<div class="achieved-badge">ACHIEVED</div>':""}
    </div>
  `).join("");
}

/* Add Goal */
goalForm.addEventListener("submit", async e=>{
  e.preventDefault();

  await fetch(`${API}/goals`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      name:goalName.value,
      targetAmount:Number(goalTarget.value)
    })
  });

  closeGoal();
  toast("Goal created");
  loadGoals();
});

/* Delete Goal */
async function deleteGoal(id){
  await fetch(`${API}/goals/${id}`,{method:"DELETE"});
  toast("Goal deleted","error");
  loadGoals();
}

/* Contribute */
contributeForm.addEventListener("submit", async e=>{
  e.preventDefault();

  await fetch(`${API}/goals/${contributeGoalId.value}/contribute`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({amount:Number(contributeAmount.value)})
  });

  closeContribute();
  toast("Money added");
  loadGoals();
});

/* ───────────────── MODALS ───────────────── */
function open(el){ el.classList.remove("hidden"); }
function close(el){ el.classList.add("hidden"); }

openAddWeek.onclick = ()=> open(weekModal);
closeWeekModal.onclick = cancelWeek.onclick = ()=> close(weekModal);

openAddGoal.onclick = ()=> open(goalModal);
closeGoalModal.onclick = cancelGoal.onclick = ()=> close(goalModal);

function openContribute(id,name){
  contributeGoalId.value=id;
  contributeGoalName.textContent=name;
  open(contributeModal);
}
closeContributeModal.onclick = cancelContribute.onclick = ()=> close(contributeModal);

function closeWeek(){ close(weekModal); weekForm.reset(); }
function closeGoal(){ close(goalModal); goalForm.reset(); }
function closeContribute(){ close(contributeModal); contributeForm.reset(); }

/* ───────────────── INIT ───────────────── */
loadWeeks();
loadGoals();
loadSummary();