// Volunteering in Austria - leaflet choropleth
// metric is now switchable

const METRICS = [
  { key: "perc_volunteers_from_pop", label: "% volunteers (total)", suffix: "%" },
  { key: "perc_formal_from_pop",     label: "% formal volunteers", suffix: "%" },
  { key: "perc_informal_from_pop",   label: "% informal volunteers", suffix: "%" },
];

const PALETTE = ["#FFEDA0","#FED976","#FEB24C","#FD8D3C","#FC4E2A","#E31A1C","#BD0026","#800026"];

let map, geoLayer, regionData = {}, currentMetric = METRICS[0], allData = [];

function buildSelect() {
  const sel = document.getElementById("metric");
  METRICS.forEach((m, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = m.label;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", e => {
    currentMetric = METRICS[parseInt(e.target.value, 10)];
    rebuildRegionLookup();
    redrawLayer();
  });
}

function rebuildRegionLookup() {
  regionData = {};
  allData.forEach(entry => {
    if (entry.state === "Austria") return;
    regionData[entry.state] = entry[currentMetric.key];
  });
}

function getStops() {
  const vals = Object.values(regionData).filter(v => typeof v === "number");
  if (!vals.length) return [0, 1, 2, 3, 4, 5, 6];
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const stops = [];
  for (let i = 0; i < 7; i++) stops.push(mn + (mx - mn) * (i / 7));
  return stops;
}

function colorFor(value, stops) {
  if (value == null || isNaN(value)) return "#eeeeee";
  for (let i = stops.length - 1; i >= 0; i--) {
    if (value >= stops[i]) return PALETTE[i + 1] || PALETTE[PALETTE.length - 1];
  }
  return PALETTE[0];
}

function redrawLayer() {
  const stops = getStops();
  if (geoLayer) {
    geoLayer.setStyle(feature => ({
      fillColor: colorFor(regionData[feature.properties.name], stops),
      weight: 1.5,
      color: "white",
      fillOpacity: 0.78,
    }));
  }
}

function fmt(v, suffix) {
  if (v == null || isNaN(v)) return "—";
  return (Math.round(v * 10) / 10) + suffix;
}

function init() {
  map = L.map("map").setView([47.5162, 14.5501], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  Promise.all([
    fetch("laender_999_geo.json").then(r => r.json()),
    fetch("data.json").then(r => r.json()),
  ]).then(([geo, vd]) => {
    allData = vd;
    rebuildRegionLookup();
    geoLayer = L.geoJson(geo, {
      style: () => ({ fillColor: "#cccccc", weight: 1.5, color: "white", fillOpacity: 0.78 }),
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name;
        layer.on({
          mouseover: () => {
            layer.setStyle({ weight: 3, color: "#333" });
            const v = regionData[name];
            layer.bindTooltip(
              `<b>${name}</b><br>${currentMetric.label}: ${fmt(v, currentMetric.suffix)}`,
              { sticky: true }
            ).openTooltip();
          },
          mouseout: () => geoLayer.resetStyle(layer),
        });
      },
    }).addTo(map);
    redrawLayer();
  });
}

buildSelect();
init();
