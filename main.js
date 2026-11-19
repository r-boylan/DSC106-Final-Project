
const slider = document.querySelector("#year");
const yearValue = document.querySelector("#year-value");

const width = 900;
const height = 400;

const mapContainer = d3.select("#map")
  .style("position", "relative")
  .style("width", "100%")
  .style("aspect-ratio", `${width} / ${height}`)
  .style("overflow", "hidden");

mapContainer.selectAll("svg, canvas").remove();

const canvas = mapContainer.append("canvas")
  .attr("width", width)
  .attr("height", height)
  .style("position", "absolute")
  .style("inset", "0")
  .style("width", "100%")
  .style("height", "100%")
  .node();

const ctx = canvas.getContext("2d");

const svg = mapContainer.append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .style("position", "absolute")
  .style("inset", "0")
  .style("width", "100%")
  .style("height", "100%");

const projection = d3.geoNaturalEarth1()
  .fitExtent([[12, 12], [width - 12, height - 12]], {
    type: "Sphere"
  });

const path = d3.geoPath().projection(projection);
const canvasPath = d3.geoPath(projection, ctx);

const aerosolRegions = {
  dust: ["Algeria", "Egypt", "Saudi Arabia", "Sudan", "Niger"],
  wildfire: ["Australia", "Canada", "USA"],
  pollution: ["India", "China"]
};

const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
  .domain([0.05, 0.4])
  .clamp(true);

let selectedYear = +slider.value;
let selectedCountry = null;
let activeSource = "all";

let countries;
let regionData = [];
let dataByYear = new Map();

const countryLayer = svg.append("g");

function drawHeatmap() {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#e5edf4";
  ctx.fillRect(0, 0, width, height);

  ctx.save();

  ctx.beginPath();
  canvasPath({ type: "Sphere" });
  ctx.clip();

  ctx.fillStyle = "#f4f7fa";
  ctx.fillRect(0, 0, width, height);

  const yearData = dataByYear.get(selectedYear) || [];

  for (const d of yearData) {
    const lon = d.longitude;
    const lat = d.latitude;

    const corners = [
      [lon - 1, lat - 1],
      [lon + 1, lat - 1],
      [lon + 1, lat + 1],
      [lon - 1, lat + 1]
    ].map(point => projection(point));

    if (corners.some(point => !point)) continue;

    ctx.beginPath();
    ctx.moveTo(corners[0][0], corners[0][1]);

    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i][0], corners[i][1]);
    }

    ctx.closePath();
    ctx.fillStyle = colorScale(d.aod);
    ctx.fill();
  }

  ctx.restore();
}

function updateCountries() {
  if (!countries) return;

  countries
    .attr("fill", d => {
      const name = d.properties.name;

      if (name === selectedCountry) {
        return "rgba(37, 99, 235, 0.25)";
      }

      if (
        activeSource !== "all" &&
        aerosolRegions[activeSource].includes(name)
      ) {
        return "rgba(37, 99, 235, 0.35)";
      }

      return "transparent";
    })
    .attr("stroke", d => {
      const name = d.properties.name;

      if (name === selectedCountry) {
        return "#1d4ed8";
      }

      if (
        activeSource !== "all" &&
        aerosolRegions[activeSource].includes(name)
      ) {
        return "#1d4ed8";
      }

      return "#64748b";
    })
    .attr("stroke-width", d => {
      const name = d.properties.name;

      if (name === selectedCountry) {
        return 2.5;
      }

      if (
        activeSource !== "all" &&
        aerosolRegions[activeSource].includes(name)
      ) {
        return 2;
      }

      return 0.5;
    })
    .style("pointer-events", "all");
}

function updateMap() {
  drawHeatmap();
  updateCountries();
}

function drawChart(country) {
  const data = regionData
    .filter(d => d.country === country)
    .sort((a, b) => a.year - b.year);

  const chart = d3.select("#chart");
  chart.html("");

  const displayName = country === "USA"
    ? "United States"
    : country;

  chart.append("h3")
    .text(`${displayName} — Aerosol Optical Depth`);

  if (!data.length) {
    chart.append("p")
      .text("No satellite AOD measurements are available for this country.");
    return;
  }

  const current = data.find(d => d.year === selectedYear);

  if (current) {
    chart.append("p")
      .text(`${selectedYear} average AOD: ${current.aod.toFixed(4)}`);
  } else {
    chart.append("p")
      .text(`No AOD measurement available for ${selectedYear}.`);
  }

  const chartWidth = 700;
  const chartHeight = 300;

  const margin = {
    top: 25,
    right: 30,
    bottom: 45,
    left: 65
  };

  const chartSvg = chart.append("svg")
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
    .attr("width", "100%");

  const x = d3.scaleLinear()
    .domain([2003, 2024])
    .range([margin.left, chartWidth - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.aod) * 1.15 || 0.1])
    .range([chartHeight - margin.bottom, margin.top]);

  chartSvg.append("g")
    .attr("transform", `translate(0,${chartHeight - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .ticks(11)
        .tickFormat(d3.format("d"))
    );

  chartSvg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6));

  chartSvg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2.5)
    .attr("d", d3.line()
      .x(d => x(d.year))
      .y(d => y(d.aod))
    );

  chartSvg.selectAll(".data-point")
    .data(data)
    .join("circle")
    .attr("class", "data-point")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.aod))
    .attr("r", d => d.year === selectedYear ? 5 : 3)
    .attr("fill", d =>
      d.year === selectedYear ? "#ef4444" : "#2563eb"
    )
    .append("title")
    .text(d => `${d.year}: ${d.aod.toFixed(4)}`);

  chartSvg.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight - 5)
    .attr("text-anchor", "middle")
    .text("Year");

  chartSvg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -chartHeight / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .text("Average AOD");
}

Promise.all([
  d3.json("data/world.geojson"),
  d3.csv("data/aod_map.csv", d3.autoType),
  d3.csv("data/aod_regions.csv", d3.autoType)
])
.then(([world, map, regions]) => {
  dataByYear = d3.group(map, d => d.year);
  regionData = regions;

  countries = countryLayer.selectAll(".country")
    .data(world.features)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      selectedCountry = d.properties.name;
      updateCountries();
      drawChart(selectedCountry);
    });

  updateMap();

  d3.select("#chart")
    .html("<p>Click a country to view its aerosol optical depth trend.</p>");
})
.catch(error => {
  console.error("Error loading NASA data:", error);
  d3.select("#chart")
    .text("Unable to load NASA data. Check the browser console.");
});

slider.addEventListener("input", function() {
  selectedYear = +this.value;
  yearValue.textContent = selectedYear;

  updateMap();

  if (selectedCountry) {
    drawChart(selectedCountry);
  }
});

d3.selectAll(".buttons button")
  .on("click", function() {
    activeSource = this.dataset.source;

    d3.selectAll(".buttons button")
      .style("background-color", "#f0f0f0")
      .style("color", "#333");

    d3.select(this)
      .style("background-color", "#4169e1")
      .style("color", "white");

    updateCountries();
  });
