// map.js — Mapbox GL JS map initialization
// Handles: MHA choropleth, zone category layer, hover popups

mapboxgl.accessToken = 'pk.eyJ1IjoibmFsMTIiLCJhIjoiY21reXBkYmxtMDltbDNyb2NmcjZpaDdvdiJ9.ZX7GLNtaTYyTjLOhx4ITqg';

// ── Map object ────────────────────────────────────────────────
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [-122.335, 47.608],   // Seattle center
  zoom: 11,
  minZoom: 10,
  maxZoom: 16
});

map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// ── Color maps ────────────────────────────────────────────────

// By MHA contribution level (M, M1, M2)
const MHA_VALUE_COLORS = {
  'M':    '#f5a623',   // amber   — standard
  'M1':   '#e07b39',   // orange  — medium
  'M2':   '#c0392b',   // red     — high
  'none': '#4a5568'    // grey    — no MHA value
};

// By zone category (commercial, residential, etc.)
const CATEGORY_COLORS = {
  'Lowrise Multi-Family':       '#4fc3c3',
  'High-Density Multi-Family':  '#177e89',
  'Neighborhood Commercial':    '#f5a623',
  'Commercial':                 '#e07b39',
  'Seattle Mixed':              '#9b59b6',
  'Industrial':                 '#7f8c8d',
  'Downtown':                   '#e74c3c',
  'Major Institutions':         '#2ecc71'
};

// ── Mapbox paint expressions ──────────────────────────────────

function mhaValuePaint() {
  return [
    'match', ['get', 'MHA_VALUE'],
    'M',  MHA_VALUE_COLORS['M'],
    'M1', MHA_VALUE_COLORS['M1'],
    'M2', MHA_VALUE_COLORS['M2'],
    MHA_VALUE_COLORS['none']
  ];
}

function categoryPaint() {
  const expr = ['match', ['get', 'CATEGORY_DESC']];
  Object.entries(CATEGORY_COLORS).forEach(([k, v]) => expr.push(k, v));
  expr.push('#4a5568');   // fallback
  return expr;
}

// ── Hover popup ───────────────────────────────────────────────
const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

// ── Load map and add layers ───────────────────────────────────
map.on('load', function() {

  fetch('assets/mha_zones.geojson')
    .then(r => r.json())
    .then(function(geojson) {

      map.addSource('mha', {
        type: 'geojson',
        data: geojson,
        promoteId: 'OBJECTID'
      });

      // Fill layer — colored by MHA_VALUE by default
      map.addLayer({
        id: 'mha-fill',
        type: 'fill',
        source: 'mha',
        paint: {
          'fill-color': mhaValuePaint(),
          'fill-opacity': 0.75
        }
      });

      // Outline layer
      map.addLayer({
        id: 'mha-line',
        type: 'line',
        source: 'mha',
        paint: {
          'line-color': '#ffffff',
          'line-width': 0.3,
          'line-opacity': 0.3
        }
      });

      // Hover highlight layer
      map.addLayer({
        id: 'mha-hover',
        type: 'fill',
        source: 'mha',
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.2,
            0
          ]
        }
      });

      // ── Hover events ───────────────────────────────────────
      let hoveredId = null;

      map.on('mousemove', 'mha-fill', function(e) {
        map.getCanvas().style.cursor = 'pointer';

        if (hoveredId !== null) {
          map.setFeatureState({ source: 'mha', id: hoveredId }, { hover: false });
        }
        hoveredId = e.features[0].id;
        map.setFeatureState({ source: 'mha', id: hoveredId }, { hover: true });

        const p = e.features[0].properties;
        const mhaVal = p.MHA_VALUE || 'N/A';
        const zone = p.ZONING || 'N/A';
        const cat = p.CATEGORY_DESC || 'N/A';
        const desc = p.PUBLIC_DESCRIPTION
          ? p.PUBLIC_DESCRIPTION.charAt(0).toUpperCase() + p.PUBLIC_DESCRIPTION.slice(1)
          : '';

        popup.setLngLat(e.lngLat)
          .setHTML(`
            <div class="popup-title">${zone}</div>
            <div class="popup-row">Category: <span>${cat}</span></div>
            <div class="popup-row">MHA Level: <span>${mhaVal}</span></div>
            ${desc ? `<div class="popup-row" style="margin-top:6px;font-size:0.7rem;color:#7a9ab5;max-width:220px;">${desc}</div>` : ''}
          `)
          .addTo(map);
      });

      map.on('mouseleave', 'mha-fill', function() {
        map.getCanvas().style.cursor = '';
        popup.remove();
        if (hoveredId !== null) {
          map.setFeatureState({ source: 'mha', id: hoveredId }, { hover: false });
        }
        hoveredId = null;
      });

    })
    .catch(err => console.error('MHA GeoJSON load error:', err));
});

// ── Exposed functions for panel.js to call ────────────────────

// Switch fill to MHA value coloring
window.showMhaLayer = function() {
  if (!map.getLayer('mha-fill')) return;
  map.setPaintProperty('mha-fill', 'fill-color', mhaValuePaint());

  document.getElementById('legend-title').textContent = 'MHA Contribution Level';
  document.getElementById('legend-items').innerHTML = `
    <div class="legend-row"><div class="legend-swatch" style="background:#f5a623;"></div> M &mdash; Standard</div>
    <div class="legend-row"><div class="legend-swatch" style="background:#e07b39;"></div> M1 &mdash; Medium</div>
    <div class="legend-row"><div class="legend-swatch" style="background:#c0392b;"></div> M2 &mdash; High</div>
    <div class="legend-row"><div class="legend-swatch" style="background:#4a5568;"></div> No MHA Value</div>
  `;
};

// Switch fill to zone category coloring
window.showCategoryLayer = function() {
  if (!map.getLayer('mha-fill')) return;
  map.setPaintProperty('mha-fill', 'fill-color', categoryPaint());

  document.getElementById('legend-title').textContent = 'Zone Category';
  document.getElementById('legend-items').innerHTML = Object.entries(CATEGORY_COLORS).map(([k, v]) =>
    `<div class="legend-row"><div class="legend-swatch" style="background:${v};"></div> ${k}</div>`
  ).join('') + `<div class="legend-row"><div class="legend-swatch" style="background:#4a5568;"></div> Other</div>`;
};
