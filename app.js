// ====== DEFAULTS (jouw waarden) ======
const DEFAULTS = {
  channelId: 3279768,
  readKey: "AZ2SE3AZFJHLKCB8",
  field: 1,
  refreshSec: 15,
  thrOk: 1.00,
  thrWarn: 2.00,
};

// ====== STATE ======
let state = JSON.parse(localStorage.getItem('appState') || 'null') || { ...DEFAULTS };
let timer = null;
let chart = null;

// ====== UI REFERENCES ======
const views = document.querySelectorAll('.view');
const tabs = document.querySelectorAll('.tabbar button');
const lastValEl = document.getElementById('lastVal');
const updatedEl = document.getElementById('updated');
const statusEl = document.getElementById('status');
const btnRefresh = document.getElementById('btnRefresh');
const btnTheme = document.getElementById('btnTheme');
const autoRefreshLabel = document.getElementById('autoRefreshLabel');
const okThrLabel = document.getElementById('okThrLabel');
const warnThrLabel = document.getElementById('warnThrLabel');
const selResults = document.getElementById('selResults');
const pointsCount = document.getElementById('pointsCount');
const alertList = document.getElementById('alertList');

// Settings inputs
const stChannel = document.getElementById('stChannel');
const stKey = document.getElementById('stKey');
const stField = document.getElementById('stField');
const stRefresh = document.getElementById('stRefresh');
const btnSaveSettings = document.getElementById('btnSaveSettings');

// Threshold inputs
const okThr = document.getElementById('okThr');
const warnThr = document.getElementById('warnThr');
const btnSaveThr = document.getElementById('btnSaveThr');
const btnTestAlert = document.getElementById('btnTestAlert');
const btnClearAlerts = document.getElementById('btnClearAlerts');

// Dummy controls
const togPump = document.getElementById('togPump');
const togFlush = document.getElementById('togFlush');
const togFloat = document.getElementById('togFloat');

// ====== HELPERS ======
function saveState() { localStorage.setItem('appState', JSON.stringify(state)); }
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 1800);
}
function fmtTime(ts) { return new Date(ts).toLocaleString(); }
function statusFor(v) {
  if (!isFinite(v)) return { cls:'crit', text:'Onbekend' };
  if (v < state.thrOk) return { cls:'ok', text:'OK' };
  if (v < state.thrWarn) return { cls:'warn', text:'Waarschuwing' };
  return { cls:'crit', text:'Kritiek' };
}

// ====== API ======
async function fetchLastValue() {
  const keyPart = state.readKey ? `?api_key=${state.readKey}` : '';
  const url = `https://api.thingspeak.com/channels/${state.channelId}/fields/${state.field}/last.json${keyPart}`;
  const res = await fetch(url, { cache:'no-store' });
  if (!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}

async function fetchSeries(n=100) {
  const params = new URLSearchParams();
  params.set('results', n);
  if (state.readKey) params.set('api_key', state.readKey);
  const url = `https://api.thingspeak.com/channels/${state.channelId}/fields/${state.field}.json?`+params.toString();
  const res = await fetch(url, { cache:'no-store' });
  if (!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}

// ====== CHART ======
function ensureChart() {
  if (chart) return chart;
  const ctx = document.getElementById('chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{
      label: 'Waterkolom (m)',
      data: [],
      borderColor: '#0b6efd',
      backgroundColor: 'rgba(11,110,253,.12)',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.25,
      fill: true
    }]},
    options: {
      animation: false,
      responsive: true,
      scales: {
        x: { ticks: { maxRotation:0, autoSkip:true } },
        y: { min:0, max:3, title:{display:true, text:'m'} }
      },
      plugins: { legend: { display:false } }
    }
  });
  return chart;
}

// ====== RENDER ======
async function refreshAll() {
  try {
    btnRefresh.disabled = true;

    // Last value
    const last = await fetchLastValue();
    const v = parseFloat(last[`field${state.field}`]);
    lastValEl.textContent = isFinite(v) ? v.toFixed(2) : '—';
    updatedEl.textContent = 'Bijgewerkt: ' + (last.created_at ? fmtTime(last.created_at) : '—');
    const st = statusFor(v);
    statusEl.className = `badge ${st.cls}`;
    statusEl.textContent = `Status: ${st.text}`;

    // Series
    const n = parseInt(selResults.value, 10) || 100;
    pointsCount.textContent = n;
    const series = await fetchSeries(n);
    const labels = series.feeds.map(f => new Date(f.created_at).toLocaleTimeString());
    const data = series.feeds.map(f => parseFloat(f[`field${state.field}`]));
    const c = ensureChart();
    c.data.labels = labels;
    c.data.datasets[0].data = data;
    c.update();

  } catch (e) {
    console.error(e);
    statusEl.className = 'badge crit';
    statusEl.textContent = 'Status: Fout bij laden';
  } finally {
    btnRefresh.disabled = false;
  }
}

function applySettingsToUI() {
  autoRefreshLabel.textContent = state.refreshSec + 's';
  okThrLabel.textContent = state.thrOk.toFixed(2)+' m';
  warnThrLabel.textContent = state.thrWarn.toFixed(2)+' m';

  stChannel.value = state.channelId;
  stKey.value = state.readKey;
  stField.value = state.field;
  stRefresh.value = state.refreshSec;

  okThr.value = state.thrOk;
  warnThr.value = state.thrWarn;
}

function startAutoRefresh() {
  if (timer) clearInterval(timer);
  timer = setInterval(refreshAll, state.refreshSec * 1000);
}

// ====== NAV ======
function showView(name) {
  views.forEach(v => v.classList.toggle('active', v.dataset.view === name));
  tabs.forEach(t => t.classList.toggle('active', t.dataset.nav === name));
  if (name === 'trend') setTimeout(()=> ensureChart(), 50);
}
tabs.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.nav)));

// ====== EVENTS ======
btnRefresh.addEventListener('click', refreshAll);
selResults.addEventListener('change', refreshAll);

btnSaveSettings.addEventListener('click', () => {
  state.channelId = parseInt(stChannel.value, 10) || state.channelId;
  state.readKey = stKey.value.trim();
  state.field = Math.max(1, Math.min(8, parseInt(stField.value,10) || 1));
  state.refreshSec = Math.max(5, Math.min(120, parseInt(stRefresh.value,10) || 15));
  saveState();
  applySettingsToUI();
  startAutoRefresh();
  refreshAll();
  toast('Instellingen opgeslagen');
});

btnSaveThr.addEventListener('click', () => {
  const okv = parseFloat(okThr.value); const warnv = parseFloat(warnThr.value);
  if (isFinite(okv) && isFinite(warnv) && okv > 0 && warnv > okv) {
    state.thrOk = okv; state.thrWarn = warnv; saveState();
    applySettingsToUI();
    toast('Drempels opgeslagen');
    refreshAll();
  } else {
    toast('Controleer drempels (Warn > OK)');
  }
});

const alerts = JSON.parse(localStorage.getItem('alerts') || '[]');
function renderAlerts() {
  alertList.innerHTML = alerts.slice(-20).reverse().map(a =>
    `<li><span>${a.msg}</span><span class="small muted">${new Date(a.ts).toLocaleTimeString()}</span></li>`
  ).join('') || '<li class="muted">Geen alerts</li>';
}
function pushAlert(msg) {
  alerts.push({ ts: Date.now(), msg });
  localStorage.setItem('alerts', JSON.stringify(alerts));
  renderAlerts();
}

btnTestAlert.addEventListener('click', () => {
  const msg = `TEST: Waterkolom ${lastValEl.textContent || '?'} m`;
  pushAlert(msg);
  toast('Test alert toegevoegd');
});
btnClearAlerts.addEventListener('click', () => {
  localStorage.removeItem('alerts');
  while (alerts.length) alerts.pop();
  renderAlerts();
  toast('Alert log gewist');
});

// Dummy controls (UI only)
[togPump, togFlush, togFloat].forEach(el => {
  el.addEventListener('change', () => {
    toast(`${el.id.replace('tog','')} → ${el.checked ? 'ON' : 'OFF'}`);
  });
});

// Theme toggle
btnTheme.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});

// Restore theme
if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

// ====== INIT ======
applySettingsToUI();
renderAlerts();
showView('home');
startAutoRefresh();
refreshAll();