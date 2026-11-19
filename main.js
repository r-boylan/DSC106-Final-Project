
const slider = document.querySelector("#year");
const yearValue = document.querySelector("#year-value");

// Update displayed year
slider.addEventListener("input", function() {
  yearValue.textContent = slider.value;
});

// Map dimensions
const width = 900;
const height = 400;

// Create SVG
const svg = d3.select("#map")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("width", "100%")
  .attr("height", "100%");

// Map projection
const projection = d3.geoNaturalEarth1()
  .scale(155)
  .translate([width / 2, height / 2]);

const path = d3.geoPath()
  .projection(projection);

// Countries associated with each aerosol source
const aerosolRegions = {
  dust: ["Algeria", "Egypt", "Saudi Arabia", "Sudan", "Niger"],
  wildfire: ["Australia", "Canada", "United States of America"],
  pollution: ["India", "China"]
};

let selectedCountry = null;
let activeSource = "all";
let countries;

// Update country colors based on selected source
function updateMap() {
  if (!countries) return;

  countries.attr("fill", function(d) {
    const name = d.properties.name;

    if (activeSource === "all") {
      return "#b8c9b8";
    }

    if (aerosolRegions[activeSource].includes(name)) {
      return "#e57343";
    }

    return "#d9d9d9";
  });
}

// Load world map
d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
  .then(function(world) {

    countries = svg.selectAll("path")
      .data(world.features)
      .join("path")
      .attr("d", path)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")

      .on("click", function(event, d) {
        selectedCountry = d.properties.name;

        d3.select("#chart")
          .html(`
            <div>
              <h3>${selectedCountry}</h3>
              <p>Selected region: ${selectedCountry}</p>
              <p>Aerosol trend data coming soon.</p>
            </div>
          `);

        updateMap();

        d3.select(this)
          .attr("fill", "#4169e1");
      });

    updateMap();

  })
  .catch(function(error) {
    console.error("Error loading world map:", error);
  });

// Aerosol filter buttons
d3.selectAll(".buttons button")
  .on("click", function() {

    activeSource = this.dataset.source;

    // Update button appearance
    d3.selectAll(".buttons button")
      .style("background-color", "#f0f0f0")
      .style("color", "#333");

    d3.select(this)
      .style("background-color", "#4169e1")
      .style("color", "white");

    updateMap();
  });
