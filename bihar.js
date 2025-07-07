// Basic map setup
const map = L.map('bihar-map', {
  zoomControl: true,
  attributionControl: false,
  minZoom: 6,
  maxZoom: 10
}).setView([25.9, 85.2], 7);

const sidebar = document.getElementById('district-sidebar');
const toggleBtn = document.getElementById('sidebar-toggle-btn');
const detailPanel = document.getElementById('district-detail-panel');

toggleBtn.onclick = () => {
  sidebar.classList.toggle('open');
  if (sidebar.classList.contains('open')) sidebar.scrollTop = 0;
};

map.on('click', function() {
  if (window.innerWidth < 900) sidebar.classList.remove('open');
  if (infoBox) infoBox.remove();
  if (detailPanel) {
    detailPanel.innerHTML = '';
    detailPanel.classList.remove("active");
  }
});

let currentDistrictLayer = null;
let infoBox = null;
let districtData = {};
let sheetDistrictList = [];

// Wait for both: Google Sheet data & GeoJSON
Promise.all([
  fetch('https://opensheet.vercel.app/1Y34kVeww80hHb1S2t7v1AGTKR91e5HN_jS_TaJ8J8TA/Sheet1').then(res => res.json()),
  fetch('stname_BIHAR.geojson').then(res => res.json())
]).then(([rows, data]) => {
  /// Parse Sheet rows
districtData = {};
sheetDistrictList = [];
rows.forEach(row => {
  const name = (row.district || row.District || '').trim();
  if (name) {
    districtData[name] = {
      hq: row.hq || row.HQ || '',
      special: row.special || row.Special || row['Special Features'] || '',
      famous: row.famous || row.Famous || row['Famous For'] || ''
    };
    sheetDistrictList.push(name);
  }
});


  // Make a GeoJSON layer
  const geoLayer = L.geoJSON(data, {
    onEachFeature: (feature, layer) => {
      const name = feature.properties.dtname || 'Unknown District';
      const districtCode = feature.properties.dtcode11 || 'N/A';

      // Map interaction
      layer.on('click', () => {
        focusOnDistrict(layer, name, districtCode);
      });
    },
    style: () => {
      const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
      return {
        color: '#000',
        weight: 2,
        fillColor: randomColor,
        fillOpacity: 0.65
      };
    }
  }).addTo(map);

  // --- Sheet order sidebar ---
  sheetDistrictList.forEach(name => {
    const listItem = document.createElement('li');
    listItem.textContent = name;
    listItem.onclick = () => {
      sidebar.classList.remove('open');
      // Find the corresponding GeoJSON layer and trigger focus
      geoLayer.eachLayer(layer => {
        if ((layer.feature && layer.feature.properties.dtname) === name) {
          focusOnDistrict(layer, name, layer.feature.properties.dtcode11 || '');
        }
      });
    };
    document.getElementById('district-list').appendChild(listItem);
  });

  // Highlight/focus code
  function focusOnDistrict(layer, name, code) {
    // Reset previous selection
    if (currentDistrictLayer) geoLayer.resetStyle(currentDistrictLayer);
    currentDistrictLayer = layer;

    geoLayer.eachLayer(l => l.setStyle({ fillOpacity: 0.12 }));
    layer.setStyle({ fillOpacity: 1 });

    const info = districtData[name] || {};

    // Desktop: Show floating popup
    if (window.innerWidth >= 900) {
      if (infoBox) infoBox.remove();
      infoBox = document.createElement('div');
      infoBox.className = 'district-popup';
      infoBox.innerHTML = `
        <button class="close-popup" onclick="window.resetMapView()" title="Close">&times;</button>
        <h3>${name}</h3>
        <p><strong>HQ:</strong> ${info.hq || 'N/A'}</p>
        <p><strong>Special:</strong> ${info.special || 'N/A'}</p>
        <p><strong>Famous For:</strong> ${info.famous || 'N/A'}</p>
        <button onclick="window.resetMapView()">Back to Bihar View</button>`;
      document.body.appendChild(infoBox);
    }

    // Mobile: Show sliding panel below map
    if (window.innerWidth < 900) {
      if (detailPanel) {
        detailPanel.innerHTML = `<h3>${name}</h3>
          <p><strong>HQ:</strong> ${info.hq || 'N/A'}</p>
          <p><strong>Special:</strong> ${info.special || 'N/A'}</p>
          <p><strong>Famous For:</strong> ${info.famous || 'N/A'}</p>
          <button style="margin-top:8px;background:#eaeaea;border:none;padding:7px 16px;border-radius:6px;font-size:1em;cursor:pointer;" onclick="window.resetMapView()">Back to Bihar View</button>`;
        detailPanel.classList.add("active");
        detailPanel.scrollIntoView({ behavior: "smooth" });
      }
    }
  }

  // Reset map view utility
  window.resetMapView = function () {
    geoLayer.eachLayer(l => geoLayer.resetStyle(l));
    if (infoBox) infoBox.remove();
    if (detailPanel) {
      detailPanel.innerHTML = '';
      detailPanel.classList.remove("active");
    }
  };

  // Optional: close sidebar when resizing to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) sidebar.classList.remove('open');
  });

});

// END
