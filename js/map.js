/* ============================================================
   map.js — Mapbox map, MHA zones layer, tooltips, layer toggle
   Depends on: charts.js and panel.js being loaded after this
   ============================================================ */

// NOTE: Replace with your own Mapbox token before deploying
mapboxgl.accessToken = 'pk.eyJ1IjoibmFsMTIiLCJhIjoiY21reXBkYmxtMDltbDNyb2NmcjZpaDdvdiJ9.ZX7GLNtaTYyTjLOhx4ITqg';

// Define EPSG:2285 (WA State Plane North, ftUS) — actual CRS of MHA file
proj4.defs('EPSG:2285', '+proj=lcc +lat_1=48.73333333333333 +lat_2=47.5 +lat_0=47 +lon_0=-120.8333333333333 +x_0=500000.00001016 +y_0=0 +ellps=GRS80 +to_meter=0.3048006096012192');

// Map is centered on Seattle, WA
// Mapbox GL JS uses Web Mercator (EPSG:3857) internally but accepts
// GeoJSON coordinates in WGS84 (EPSG:4326) — our data is in 4326, so no conversion needed
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [-122.335, 47.608],   // Seattle city center
  zoom: 11,
  minZoom: 10,
  maxZoom: 15
});

// Navigation controls (zoom + compass) — top right of map
map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// Shared popup instance — reused on mousemove to avoid stacking
const popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false,
  maxWidth: '260px'
});

// MHA tier → color mapping (matches legend in index.html)
const MHA_COLORS = {
  'M':  '#4fc3c3',   // teal — standard contribution
  'M1': '#f5a623',   // orange — higher contribution
  'M2': '#e74c3c',   // red — highest contribution
};

// Track whether MHA layer is currently visible
let mhaVisible = true;

// ============================================================
// LOAD MAP AND ADD LAYERS
// ============================================================
map.on('load', function () {
  fetch('assets/MHA_zones_.geojson')
    .then(function (res) { return res.json(); })
    .then(function (geojson) {

      // Reproject all coordinates from EPSG:2285 to WGS84
      function reprojectCoords(coords) {
        if (typeof coords[0] === 'number') {
          return proj4('EPSG:2285', 'WGS84', coords);
        }
        return coords.map(reprojectCoords);
      }
      geojson.features.forEach(function(f) {
        if (f.geometry) {
          f.geometry.coordinates = reprojectCoords(f.geometry.coordinates);
        }
      });
      delete geojson.crs;

      // Add the GeoJSON as a Mapbox source
      map.addSource('mha-zones', {
        type: 'geojson',
        data: geojson,
        generateId: true   // required for feature-state hover to work
      });

      // --- Fill layer: each zone colored by its MHA tier ---
      map.addLayer({
        id: 'mha-fill',
        type: 'fill',
        source: 'mha-zones',
        paint: {
          'fill-color': [
            'match',
            ['get', 'MHA_VALUE'],
            'M',  MHA_COLORS['M'],
            'M1', MHA_COLORS['M1'],
            'M2', MHA_COLORS['M2'],
            '#333333'   // fallback for null/missing MHA_VALUE
          ],
          'fill-opacity': 0.55
        }
      });

      // --- Outline layer: thin border on each zone polygon ---
      map.addLayer({
        id: 'mha-outline',
        type: 'line',
        source: 'mha-zones',
        paint: {
          'line-color': [
            'match',
            ['get', 'MHA_VALUE'],
            'M',  MHA_COLORS['M'],
            'M1', MHA_COLORS['M1'],
            'M2', MHA_COLORS['M2'],
            '#555555'
          ],
          'line-width': 0.6,
          'line-opacity': 0.8
        }
      });

      // --- Hover highlight layer: brightens zone on mouseover ---
      map.addLayer({
        id: 'mha-hover',
        type: 'fill',
        source: 'mha-zones',
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hovered'], false],
            0.12,   // visible when hovered
            0       // invisible otherwise
          ]
        }
      });

      // Wire up interaction events now that layers exist
      initMapInteractions();

      // Initialize charts now that map is ready
      // charts.js exposes initCharts() globally
      initCharts();

      // Initialize panel controls (year slider, race buttons, reset)
      // panel.js exposes initPanel() globally
      initPanel();

    })
    .catch(function (err) {
      console.error('Failed to load MHA zones GeoJSON:', err);
    });
});

// ============================================================
// MAP INTERACTIONS — hover tooltip, click, feature state
// ============================================================
function initMapInteractions() {

  let hoveredId = null;

  // --- Mousemove: show popup and highlight zone ---
  map.on('mousemove', 'mha-fill', function (e) {
    if (!e.features.length) return;
    map.getCanvas().style.cursor = 'pointer';

    const feat = e.features[0];
    const props = feat.properties;

    // Update feature state for the hover highlight layer
    if (hoveredId !== null) {
      map.setFeatureState(
        { source: 'mha-zones', id: hoveredId },
        { hovered: false }
      );
    }
    hoveredId = feat.id;
    map.setFeatureState(
      { source: 'mha-zones', id: hoveredId },
      { hovered: true }
    );

    // Build popup HTML
    const tier    = props.MHA_VALUE || 'N/A';
    const zone    = props.ZONING    || 'N/A';
    const cat     = props.CATEGORY_DESC || props.CLASS_DESC || 'N/A';
    const tierLabel = tier === 'M'  ? 'Standard (M)'
                    : tier === 'M1' ? 'Higher (M1)'
                    : tier === 'M2' ? 'Highest (M2)'
                    : 'No MHA';
    const tierColor = MHA_COLORS[tier] || '#888';

    popup
      .setLngLat(e.lngLat)
      .setHTML(
        '<div class="popup-title">' + zone + '</div>' +
        '<div class="popup-row"><span>Category</span><span>' + cat + '</span></div>' +
        '<div class="popup-row"><span>MHA Tier</span>' +
          '<span style="color:' + tierColor + '">' + tierLabel + '</span>' +
        '</div>'
      )
      .addTo(map);
  });

  // --- Mouseleave: remove popup and clear highlight ---
  map.on('mouseleave', 'mha-fill', function () {
    map.getCanvas().style.cursor = '';
    popup.remove();
    if (hoveredId !== null) {
      map.setFeatureState(
        { source: 'mha-zones', id: hoveredId },
        { hovered: false }
      );
      hoveredId = null;
    }
  });
}

// ============================================================
// LAYER TOGGLE — called by panel.js when buttons are clicked
// ============================================================
function setMapLayer(layerName) {
  const visibility = layerName === 'mha' ? 'visible' : 'none';
  mhaVisible = (layerName === 'mha');

  // Only toggle if layers exist (map may still be loading)
  if (map.getLayer('mha-fill')) {
    map.setLayoutProperty('mha-fill',    'visibility', visibility);
    map.setLayoutProperty('mha-outline', 'visibility', visibility);
    map.setLayoutProperty('mha-hover',   'visibility', visibility);
  }

  // Hide popup if layers are turned off
  if (!mhaVisible) popup.remove();
}

// ============================================================
// RESET MAP VIEW — called by panel.js reset button
// ============================================================
function resetMapView() {
  map.flyTo({
    center: [-122.335, 47.608],
    zoom: 11,
    duration: 800
  });
}
