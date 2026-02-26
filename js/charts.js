/* ============================================================
   charts.js — C3.js charts for the dashboard side panel
   Charts:
     1. trendChart  — rent burden over time (line), filterable by race
     2. raceChart   — rent burden by racial group for selected year (bar)
     3. incomeChart — renter households by income bracket over time (stacked bar)

   Data files used:
     assets/rent_burden.geojson    — 1377 rows, no geometry
     assets/renter_income.geojson  — 17 rows (one per year), no geometry

   Called by: map.js after map loads (initCharts())
   Used by:   panel.js (updateChartsForYear, updateChartsForRace)
   ============================================================ */

// ---- Module-level state ----
let rentBurdenData  = [];   // all rows from rent_burden.geojson
let renterIncomeData = [];  // all rows from renter_income.geojson

let trendChart  = null;
let raceChart   = null;
let incomeChart = null;

let currentYear = 2022;
let currentRace = 'All';

// ============================================================
// INIT — load both data files then build all charts
// ============================================================
function initCharts() {
  Promise.all([
    fetch('assets/rent_burden.geojson').then(r => r.json()),
    fetch('assets/renter_income.geojson').then(r => r.json())
  ])
  .then(function ([rbGeo, riGeo]) {

    // Extract property rows from GeoJSON features
    rentBurdenData   = rbGeo.features.map(f => f.properties);
    renterIncomeData = riGeo.features.map(f => f.properties);

    buildTrendChart();
    buildRaceChart();
    buildIncomeChart();

    // Set initial stat block value
    updateBurdenStat(currentYear, currentRace);
  })
  .catch(function (err) {
    console.error('Failed to load chart data:', err);
  });
}

// ============================================================
// HELPERS
// ============================================================

// Get all unique years in sorted order
function getYears() {
  return [...new Set(rentBurdenData.map(d => d.YEAR))].sort();
}

// Filter rent burden rows by race, tenure=Renters, age=All
// Returns array sorted by year
function getRentBurdenSeries(race) {
  return rentBurdenData
    .filter(d => d.RACE === race && d.TENURE === 'Renters' && d.AGE === 'All')
    .sort((a, b) => a.YEAR - b.YEAR);
}

// Get rent burden for all races in a single year (for race bar chart)
function getBurdenByRace(year) {
  const races = ['White', 'Black', 'Hispanic', 'Asian', 'Native'];
  return races.map(race => {
    const row = rentBurdenData.find(
      d => d.YEAR === year && d.RACE === race && d.TENURE === 'Renters' && d.AGE === 'All'
    );
    return row ? +(row.All_ * 100).toFixed(1) : 0;
  });
}

// Format a 0–1 decimal as a percentage string e.g. 0.23 → "23.0%"
function pct(val) {
  return (val * 100).toFixed(1) + '%';
}

// ============================================================
// CHART 1: Trend Line — rent burden over time
// ============================================================
function buildTrendChart() {
  const series = getRentBurdenSeries(currentRace);
  const years  = series.map(d => d.YEAR);
  const values = series.map(d => +(d.All_ * 100).toFixed(1));

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
        type: 'indexed',
        tick: {
          values: [2006, 2010, 2014, 2018, 2022],
          format: d => d.toString()
        }
      },
      y: {
        tick: { format: d => d + '%' },
        min: 0,
        padding: { bottom: 0 }
      }
    },
    // Vertical reference line at 2019 (MHA implemented citywide)
    grid: {
      x: {
        lines: [{ value: 2019, text: 'MHA 2019', class: 'mha-ref-line' }]
      }
    },
    legend: { show: false },
    tooltip: {
      format: {
        value: function (val) { return val + '%'; }
      }
    },
    padding: { right: 16, top: 8 }
  });
}

// ============================================================
// CHART 2: Race Bar — burden by racial group for selected year
// ============================================================
function buildRaceChart() {
  const races  = ['White', 'Black', 'Hispanic', 'Asian', 'Native'];
  const values = getBurdenByRace(currentYear);

  raceChart = c3.generate({
    bindto: '#race-chart',
    data: {
      x: 'x',
      columns: [
        ['x', ...races],
        ['Burden %', ...values]
      ],
      type: 'bar',
      colors: { 'Burden %': '#4fc3c3' }
    },
    bar: { width: { ratio: 0.6 } },
    axis: {
      x: { type: 'category' },
      y: {
        tick: { format: d => d + '%' },
        min: 0,
        padding: { bottom: 0 }
      }
    },
    legend: { show: false },
    tooltip: {
      format: {
        value: function (val) { return val + '%'; }
      }
    },
    padding: { right: 16, top: 8 }
  });
}

// ============================================================
// CHART 3: Stacked Bar — renter households by income bracket
// ============================================================
function buildIncomeChart() {
  const years = renterIncomeData.map(d => d.YEAR);

  // Each income bracket is its own data series for stacking
  const below30  = renterIncomeData.map(d => d.F0___30_);
  const band3050 = renterIncomeData.map(d => d.F30___50_);
  const band5080 = renterIncomeData.map(d => d.F50___80_);
  const band80120= renterIncomeData.map(d => d.F80___120_);
  const above120 = renterIncomeData.map(d => d.Above_120_);

  incomeChart = c3.generate({
    bindto: '#income-chart',
    data: {
      x: 'x',
      columns: [
        ['x',          ...years],
        ['<30% AMI',   ...below30],
        ['30–50% AMI', ...band3050],
        ['50–80% AMI', ...band5080],
        ['80–120% AMI',...band80120],
        ['>120% AMI',  ...above120]
      ],
      type: 'bar',
      groups: [['<30% AMI', '30–50% AMI', '50–80% AMI', '80–120% AMI', '>120% AMI']],
      colors: {
        '<30% AMI':    '#e74c3c',   // red — lowest income / most at risk
        '30–50% AMI':  '#f5a623',   // orange
        '50–80% AMI':  '#ffd97d',   // yellow
        '80–120% AMI': '#84bcca',   // light teal
        '>120% AMI':   '#4fc3c3'    // teal — highest income
      }
    },
    bar: { width: { ratio: 0.7 } },
    axis: {
      x: {
        type: 'indexed',
        tick: {
          values: [2006, 2010, 2014, 2018, 2022],
          format: d => d.toString()
        }
      },
      y: {
        tick: {
          format: function (d) {
            return d >= 1000 ? (d / 1000).toFixed(0) + 'k' : d;
          }
        },
        min: 0,
        padding: { bottom: 0 }
      }
    },
    legend: {
      show: true,
      position: 'bottom'
    },
    tooltip: {
      format: {
        value: function (val) {
          return val.toLocaleString() + ' households';
        }
      }
    },
    padding: { right: 16, top: 8 }
  });
}

// ============================================================
// UPDATE FUNCTIONS — called by panel.js on user interaction
// ============================================================

// Called when year slider moves — updates race bar chart and stat
function updateChartsForYear(year) {
  currentYear = year;

  // Update chart 2: burden by race for new year
  const values = getBurdenByRace(year);
  raceChart.load({
    columns: [
      ['Burden %', ...values]
    ]
  });

  // Update the chart 2 year label in HTML
  const label = document.getElementById('chart2-year-label');
  if (label) label.textContent = '(' + year + ')';

  // Update the stat block
  updateBurdenStat(year, currentRace);
}

// Called when a race filter button is clicked — updates trend line and stat
function updateChartsForRace(race) {
  currentRace = race;

  // Update chart 1: trend line for selected race
  const series = getRentBurdenSeries(race);
  const years  = series.map(d => d.YEAR);
  const values = series.map(d => +(d.All_ * 100).toFixed(1));

  trendChart.load({
    columns: [
      ['x', ...years],
      ['Rent Burden %', ...values]
    ]
  });

  // Update the stat block
  updateBurdenStat(currentYear, race);
}

// Updates the big stat number at the top of the panel
function updateBurdenStat(year, race) {
  const row = rentBurdenData.find(
    d => d.YEAR === year && d.RACE === race && d.TENURE === 'Renters' && d.AGE === 'All'
  );

  const statEl = document.getElementById('burden-stat');
  const subEl  = document.getElementById('burden-year-label');

  if (row && statEl) {
    statEl.textContent = pct(row.All_);
  } else if (statEl) {
    statEl.textContent = '–';
  }

  if (subEl) {
    const raceLabel = race === 'All' ? 'All renters' : race + ' renters';
    subEl.textContent = raceLabel + ' · ' + year;
  }
}

// Resets charts to default state (2022, All races)
function resetCharts() {
  currentYear = 2022;
  currentRace = 'All';
  updateChartsForYear(2022);
  updateChartsForRace('All');
}
