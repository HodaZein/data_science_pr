// Initialize the Leaflet map
var map = L.map('map').setView([47.5162, 14.5501], 7); // Center on Austria

// Add a base map layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load GeoJSON data (Austrian state boundaries)
fetch('laender_999_geo.json')
    .then(response => response.json())
    .then(geojsonData => {
        // Load volunteer data
        fetch('data.json')
            .then(response => response.json())
            .then(volunteerData => {
                let regionData = {};
                
                // Convert volunteerData to a lookup table
                volunteerData.forEach(entry => {
                    regionData[entry.state] = entry.perc_volunteers_from_pop;
                });

                // Create the GeoJSON layer
                L.geoJson(geojsonData, {
                    style: feature => ({
                        fillColor: getColor(regionData[feature.properties.name] || 0),
                        weight: 2,
                        color: 'white',
                        fillOpacity: 0.7
                    }),
                    onEachFeature: (feature, layer) => {
                        let stateName = feature.properties.name;
                        let volunteerRate = regionData[stateName] || "No data";
                        layer.bindPopup(`<b>${stateName}</b><br>Volunteer Rate: ${volunteerRate}%`);
                    }
                }).addTo(map);
            });
    });

// Function to determine color based on volunteering rate
function getColor(value) {
    return value > 50 ? '#800026' :
           value > 45 ? '#BD0026' :
           value > 40 ? '#E31A1C' :
           value > 35 ? '#FC4E2A' :
           value > 30 ? '#FD8D3C' :
           value > 25 ? '#FEB24C' :
           value > 20 ? '#FED976' :
                        '#FFEDA0';
}
