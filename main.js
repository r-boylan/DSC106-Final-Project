
const slider = document.querySelector("#year");
const yearValue = document.querySelector("#year-value");

slider.addEventListener("input", function() {
  yearValue.textContent = slider.value;
});
