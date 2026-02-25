// charts.js — C3.js chart initialization and update logic
// Handles: trend line chart, race bar chart, income bar chart

let trendChart, raceChart, incomeChart;

// ── Data containers (populated after fetch) ──────────────────
let rentBurdenData = [];     // all rows from rent_burden.geojson
let renterIncomeData = [];   // all rows from renter_income.geojson

// ── Load both data files, then init charts ───────────────────
Promise.all([
  fetch('assets/rent_burden.geojson').then(r => r.json()),
  fetch('assets/renter_income.geojson').then(r => r.json())
]).then(function([burdenGeo, incomeGeo]) {

  // Extract properties arrays (no geometry on these files)
  rentBurdenData = burdenGeo.features.map(f => f.properties);
  renterIncomeData = incomeGeo.features.map(f => f.properties);

  initCharts();
  setStatCounter();

}).catch(err => console.error('Chart data load error:', err));


// ── Set the big stat number ───────────────────────────────────
function setStatCounter() {
  const row2022 = rentBurdenData.find(
    d => d.YEAR === 2022 && d.TENURE === 'Renters' && d.RACE === 'All' && d.AGE === 'All'
  );
  if (row2022) {
    const pct = (row2022.All_ * 100).toFixed(1) + '%';
    document.getElementById('burden-count').textContent = pct;
  }
}


// ── Initialize all three charts ───────────────────────────────
function initCharts() {
  buildTrendChart();
  buildRaceChart();
  buildIncomeChart();
}


// ── Chart 1: Rent burden trend line, 2006–2022 ───────────────
function buildTrendChart() {
  const series = rentBurdenData
    .filter(d => d.TENURE === 'Renters' && d.RACE === 'All' && d.AGE === 'All')
    .sort((a, b) => a.YEAR - b.YEAR);

  const years = series.map(d => String(d.YEAR));
  const values = series.map(d => parseFloat((d.All_ * 100).toFixed(1)));

  trendChart = c3.generate({
    bindto: '#trend-chart',
    data: {
      x: 'x',
      columns: [
        ['x', ...years],
        ['Rent Burden %', ...values]
      ],
      type: 'line',
      colors: { 'Rent Burden %': '#f5a623' }
    },
    point: { r: 2.5 },
    axis: {
      x: {
        type: 'category',
        tick: {
          format: (i, cat) => (parseInt(cat) % 2 === 0 ? cat : ''),
          multiline: false
        }
      },
      y: {
        tick: { format: d => d.toFixed(0) + '%' },
        min: 0,
        padding: { bottom: 0 }
      }
    },
    grid: { y: { show: true } },
    legend: { show: false },
    padding: { right: 20, top: 4 }
  });
}


// ── Chart 2: Rent burden by race, 2022 ───────────────────────
function buildRaceChart() {
  const races = ['White', 'Black', 'Hispanic', 'Asian', 'Native', 'Multi'];

  const values = races.map(race => {
    const row = rentBurdenData.find(
      d => d.YEAR === 2022 && d.TENURE === 'Renters' && d.RACE === race && d.AGE === 'All'
    );
    return row ? parseFloat((row.All_ * 100).toFixed(1)) : 0;
  });

  raceChart = c3.generate({
    bindto: '#race-chart',
    data: {
      x: 'x',
      columns: [
        ['x', ...races],
        ['Burden %', ...values]
      ],
      type: 'bar',
      colors: { 'Burden %': '#e05252' }
    },
    bar: { width: { ratio: 0.65 } },
    axis: {
      x: { type: 'category', tick: { multiline: false } },
      y: {
        tick: { format: d => d + '%' },
        min: 0,
        padding: { bottom: 0 }
      }
    },
    grid: { y: { show: true } },
    legend: { show: false },
    padding: { right: 20, top: 4 }
  });
}


// ── Chart 3: Renter households by income category ────────────
function buildIncomeChart() {
  const years = renterIncomeData.map(d => d.YEAR).sort((a, b) => b - a);
  const latestYear = years[0];

  const row = renterIncomeData.find(d => d.YEAR === latestYear);
  if (!row) return;

  const labels = ['<30% AMI', '30–50%', '50–80%', '80–120%', '>120%'];
  const values = [
    row.F0___30_,
    row.F30___50_,
    row.F50___80_,
    row.F80___120_,
    row.Above_120_
  ];

  incomeChart = c3.generate({
    bindto: '#income-chart',
    data: {
      x: 'x',
      columns: [
        ['x', ...labels],
        ['Households', ...values]
      ],
      type: 'bar',
      colors: { 'Households': '#4fc3c3' }
    },
    bar: { width: { ratio: 0.65 } },
    axis: {
      x: { type: 'category', tick: { multiline: false } },
      y: {
        tick: {
          format: d => (d >= 1000 ? (d / 1000).toFixed(0) + 'k' : d)
        },
        min: 0,
        padding: { bottom: 0 }
      }
    },
    grid: { y: { show: true } },
    legend: { show: false },
    padding: { right: 20, top: 4 }
  });
}
