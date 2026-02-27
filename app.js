const CHANNEL_ID = 3279768;
const READ_KEY   = "AZ2SE3AZFJHLKCB8";
const FIELD = 1;

async function getLast() {
  const r = await fetch(`https://api.thingspeak.com/channels/${CHANNEL_ID}/fields/${FIELD}/last.json?api_key=${READ_KEY}`);
  return r.json();
}

async function getSeries() {
  const r = await fetch(`https://api.thingspeak.com/channels/${CHANNEL_ID}/fields/${FIELD}.json?results=100&api_key=${READ_KEY}`);
  return r.json();
}

const valEl = document.getElementById("val");
const timeEl = document.getElementById("time");
const btn = document.getElementById("refresh");

let chart;

async function update() {
  // last value
  let last = await getLast();
  valEl.innerText = parseFloat(last[`field${FIELD}`]).toFixed(2);
  timeEl.innerText = "Laatste update: " + new Date(last.created_at).toLocaleString();

  // series data
  let s = await getSeries();
  const labels = s.feeds.map(f => new Date(f.created_at).toLocaleTimeString());
  const data   = s.feeds.map(f => parseFloat(f[`field${FIELD}`]));

  if (!chart) {
    chart = new Chart(document.getElementById("chart"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          data: data,
          borderColor: "#0b6efd",
          fill: true,
          backgroundColor: "rgba(11,110,253,0.1)",
          tension: 0.3,
          borderWidth: 2
        }]
      },
      options: { responsive: true, plugins: { legend: { display:false }}}
    });
  } else {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  }
}

btn.onclick = update;
setInterval(update, 15000);
update();