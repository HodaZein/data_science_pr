// Volunteering in Austria - interactive map
// state: pick metric -> recolour map + update legend
// click a state -> right panel shows full breakdown + tiny bar chart

const METRICS = [
  { key: "perc_volunteers_from_pop", label: "% volunteers (total)", suffix: "%" },
  { key: "perc_formal_from_pop",     label: "% formal volunteers", suffix: "%" },
  { key: "perc_informal_from_pop",   label: "% informal volunteers", suffix: "%" },
  { key: "avg_hours_vlntrs",         label: "avg weekly hours (all)", suffix: " h" },
  { key: "avg_hours_formal",         label: "avg weekly hours (formal)", suffix: " h" },
  { key: "avg_hours_informal",       label: "avg weekly hours (informal)", suffix: " h" },
  { key: "median_hours_vlntrs",      label: "median weekly hours (all)", suffix: " h" },
];

// 7-step palette (same family as before)
const PALETTE = ["#FFEDA0","#FED976","#FEB24C","#FD8D3C","#FC4E2A","#E31A1C","#BD0026","#800026"];

let map, geoLayer, regionData = {}, currentMetric = METRICS[0], allData = [], geo;
let legendCtl;

// build the dropdown
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
    redrawLegend();
  });
}

function rebuildRegionLookup() {
  regionData = {};
  allData.forEach(entry => {
    if (entry.state === "Austria") return; // keep national row separate
    regionData[entry.state] = entry[currentMetric.key];
  });
}

function getStops() {
  const vals = Object.values(regionData).filter(v => typeof v === "number");
  if (!vals.length) return [0, 1, 2, 3, 4, 5, 6];
  const mn = Math.min(...vals), mx = Math.max(...vals);
  // 7 evenly spaced thresholds (lower bounds for each bucket)
  const stops = [];
  for (let i = 0; i < 7; i++) {
    stops.push(mn + (mx - mn) * (i / 7));
  }
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

function redrawLegend() {
  if (!legendCtl) return;
  const stops = getStops();
  const div = legendCtl.getContainer();
  let html = `<strong>${currentMetric.label}</strong><br>`;
  for (let i = 0; i < stops.length; i++) {
    const lo = stops[i].toFixed(1);
    const hi = i < stops.length - 1 ? stops[i + 1].toFixed(1) : "+";
    html += `<div><i style="background:${PALETTE[i + 1] || PALETTE[PALETTE.length - 1]}"></i>${lo} - ${hi}${currentMetric.suffix}</div>`;
  }
  div.innerHTML = html;
}

function fmt(v, suffix) {
  if (v == null || isNaN(v)) return "—";
  return (Math.round(v * 10) / 10) + suffix;
}

function showPanel(stateName) {
  const row = allData.find(e => e.state === stateName);
  document.getElementById("panel-state").textContent = stateName;
  document.getElementById("panel-hint").textContent = row ? "values for this state" : "no data";
  if (!row) {
    document.getElementById("panel-numbers").innerHTML = "";
    document.getElementById("panel-chart").innerHTML = "";
    return;
  }
  const numsHtml = `
    <div class="kv"><span class="k">total volunteers (k)</span><span class="v">${fmt(row.total_volunteers, "")}</span></div>
    <div class="kv"><span class="k">% of population</span><span class="v">${fmt(row.perc_volunteers_from_pop, "%")}</span></div>
    <div class="kv"><span class="k">% formal</span><span class="v">${fmt(row.perc_formal_from_pop, "%")}</span></div>
    <div class="kv"><span class="k">% informal</span><span class="v">${fmt(row.perc_informal_from_pop, "%")}</span></div>
    <div class="kv"><span class="k">avg weekly hours</span><span class="v">${fmt(row.avg_hours_vlntrs, " h")}</span></div>
    <div class="kv"><span class="k">median weekly hours</span><span class="v">${fmt(row.median_hours_vlntrs, " h")}</span></div>
  `;
  document.getElementById("panel-numbers").innerHTML = numsHtml;

  // mini bar chart: shares of formal / informal / mixed
  const vals = [
    ["% volunteers", row.perc_volunteers_from_pop],
    ["% formal",     row.perc_formal_from_pop],
    ["% informal",   row.perc_informal_from_pop],
    ["formal+inf.",  row.perc_formal_informal_from_vlntrs],
    ["formal only",  row.perc_formal_only_from_vlntrs],
    ["informal only",row.perc_informal_only_from_vlntrs],
  ];
  const max = Math.max(...vals.map(v => v[1] || 0));
  const chartHtml = vals.map(([lbl, v]) => {
    const w = max ? Math.round(((v || 0) / max) * 100) : 0;
    return `<div class="bar-row">
      <span class="label">${lbl}</span>
      <span class="bar" style="width:${w}%"></span>
      <span class="num">${fmt(v, "%")}</span>
    </div>`;
  }).join("");
  document.getElementById("panel-chart").innerHTML = chartHtml;
}

function init() {
  map = L.map("map").setView([47.5162, 14.5501], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  legendCtl = L.control({ position: "bottomright" });
  legendCtl.onAdd = () => L.DomUtil.create("div", "legend");
  legendCtl.addTo(map);

  Promise.all([
    fetch("laender_999_geo.json").then(r => r.json()),
    fetch("data.json").then(r => r.json()),
  ]).then(([gj, vd]) => {
    geo = gj;
    allData = vd;
    rebuildRegionLookup();
    geoLayer = L.geoJson(geo, {
      style: () => ({
        fillColor: "#cccccc",
        weight: 1.5,
        color: "white",
        fillOpacity: 0.78,
      }),
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
          click: () => {
            map.fitBounds(layer.getBounds(), { padding: [20, 20] });
            showPanel(name);
          },
        });
      },
    }).addTo(map);
    redrawLayer();
    redrawLegend();
  });
}

buildSelect();
init();
