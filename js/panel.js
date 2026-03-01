/* ============================================================
   panel.js — controls for the left info panel and map overlays
   Handles:
     - Year slider → updates charts and stat block
     - Race filter buttons → updates trend chart and stat block
     - Layer toggle buttons → shows/hides MHA map layer
   
   Depends on: map.js (setMapLayer, resetMapView)
               charts.js (updateChartsForYear, updateChartsForRace)
   ============================================================ */

// Default state
const DEFAULT_YEAR = 2022;
const DEFAULT_RACE = 'All';
const DEFAULT_LAYER = 'mha';

// ============================================================
// INIT — wire up all panel controls
// Called by map.js after map and charts are ready
// ============================================================
function initPanel() {
  initYearSlider();
  initRaceButtons();
  initLayerToggle();
}

// ============================================================
// YEAR SLIDER
// ============================================================
function initYearSlider() {
  const slider  = document.getElementById('year-slider');
  const display = document.getElementById('year-display');
  if (!slider) return;

  slider.addEventListener('input', function () {
    const year = parseInt(this.value);

    // Update the year badge next to the slider
    if (display) display.textContent = year;

    // Update charts for the new year
    updateChartsForYear(year);
  });
}

// ============================================================
// RACE FILTER BUTTONS
// ============================================================
function initRaceButtons() {
  const buttons = document.querySelectorAll('.race-btn');
  if (!buttons.length) return;

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {

      // Remove active class from all buttons
      buttons.forEach(b => b.classList.remove('active'));

      // Set active on clicked button
      this.classList.add('active');

      const race = this.dataset.race;

      // Update trend chart and stat block for selected race
      updateChartsForRace(race);
    });
  });
}

// ============================================================
// LAYER TOGGLE BUTTONS (MHA Zones / Base Only)
// ============================================================
function initLayerToggle() {
  const buttons = document.querySelectorAll('.layer-btn');
  if (!buttons.length) return;

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {

      // Remove active class from all layer buttons
      buttons.forEach(b => b.classList.remove('active'));

      // Set active on clicked button
      this.classList.add('active');

      const layer = this.dataset.layer;

      // Tell map.js to show or hide the MHA layer
      setMapLayer(layer);

      // Hide or show the legend based on layer visibility
      const legend = document.getElementById('legend');
      if (legend) {
        legend.style.opacity = layer === 'mha' ? '1' : '0.3';
      }
    });
  });
}
