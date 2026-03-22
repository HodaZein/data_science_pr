// Volunteering in Austria - leaflet choropleth
// single metric for now (% volunteers from population)

let map, geoLayer, regionData = {};

function getColor(value) {
  return value > 50 ? "#800026" :
         value > 45 ? "#BD0026" :
         value > 40 ? "#E31A1C" :
         value > 35 ? "#FC4E2A" :
         value > 30 ? "#FD8D3C" :
         value > 25 ? "#FEB24C" :
         value > 20 ? "#FED976" :
                      "#FFEDA0";
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
    vd.forEach(entry => {
      if (entry.state === "Austria") return;
      regionData[entry.state] = entry.perc_volunteers_from_pop;
    });

    geoLayer = L.geoJson(geo, {
      style: feature => ({
        fillColor: getColor(regionData[feature.properties.name] || 0),
        weight: 1.5,
        color: "white",
        fillOpacity: 0.78,
      }),
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name;
        const v = regionData[name];
        layer.bindTooltip(
          `<b>${name}</b><br>% volunteers: ${v != null ? v.toFixed(1) + "%" : "—"}`,
          { sticky: true }
        );
        layer.on({
          mouseover: () => layer.setStyle({ weight: 3, color: "#333" }),
          mouseout: () => geoLayer.resetStyle(layer),
        });
      },
    }).addTo(map);
  });
}

init();
