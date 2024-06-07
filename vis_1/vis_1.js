// Vis_1.js

window.onload = init;

function init() 
{
    const width = 600, height = 600;                                            // Dimensions and radius for the chart
    const innerRadius = 50, outerRadius = Math.min(width, height) / 2 - 70;

    const svg = d3.select("#chart")                     // SVG container for the chart
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const color = d3.scaleOrdinal([
        "#003f5c", "#374c80", "#7a5195", "#bc5090", "#ef5675", "#ff764a", "#ffa600"     // Colour scale with the provided colors
    ]);
    const angle = d3.scaleBand().range([0, 2 * Math.PI]);
    const radius = d3.scaleLinear().range([innerRadius, outerRadius]);

    let datasets = {};
    let currentYear = 2015;
    let currentCountry = "Australia";           // Variables to hold the data and initial state
    let isPlaying = false;
    let flag = false;
    let playbackInterval;

    d3.json("data_1.json").then(data => {
        datasets = data;

        const yearRadios = document.querySelectorAll('#year-slider input[type="radio"]');
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const sortBtn = document.getElementById('sort-btn');
        const countryButtonsContainer = document.getElementById('country-buttons');
        const currentCountryText = document.getElementById('current-country');

        const countries = Object.keys(datasets[currentYear]);

        countries.forEach(country => {
            const button = document.createElement('button');                // Create buttons for each country
            button.innerText = country;
            button.classList.add('btn', 'btn-secondary', 'm-1');
            button.id = `btn-${country}`;
            button.addEventListener('click', () => {
                currentCountry = country;
                updateChart(currentYear, currentCountry);
                updateLegend(currentYear, currentCountry);
                currentCountryText.innerText = `Current Country: ${currentCountry}`;
                highlightCountryButton(currentCountry);
            });
            countryButtonsContainer.appendChild(button);
        });

        yearRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                currentYear = radio.value;
                updateChart(currentYear, currentCountry);
                updateLegend(currentYear, currentCountry);
            });
        });

        function updateChart(year, country, sort = false) {                // Function to update the chart based on selected year and country
            let data = datasets[year][country];                     
            data = data.filter(d => d.value > 0);
            if (sort) {
                data.sort((a, b) => b.value - a.value);                    // Descending order sorting
            }
            angle.domain(data.map(d => d.category));
            radius.domain([0, d3.max(data, d => d.value)]);

            const paths = svg.selectAll("path").data(data);
            paths.enter().append("path")
                .merge(paths)
                .transition().duration(750)
                .attr("fill", d => color(d.category))
                .attr("d", d3.arc()
                    .innerRadius(innerRadius)
                    .outerRadius(d => radius(d.value))
                    .startAngle(d => angle(d.category))
                    .endAngle(d => angle(d.category) + angle.bandwidth())
                    .padAngle(0.01)
                    .padRadius(innerRadius)
                );

            paths.exit().remove();

            svg.selectAll("path")                                           // Hover effects on chart sections
                .on("mouseover", function (event, d) {
                    if (isPlaying) {
                        pausePlayback();
                        flag = true;
                    }
                    highlightLegend(d.category);
                    if (!isPlaying) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", .9);
                        tooltip.html(`
                            <div class="title">${d.category}</div>
                            <div class="value">${d.value.toLocaleString()}%</div>
                            <div class="description">Health care spending</div>
                        `)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 40) + "px");
                    }
                })
                .on("mouseout", function (d) {
                    svg.selectAll("path")
                        .attr("opacity", 1)
                        .attr("stroke", "none")
                        .classed("highlight", false);

                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                    clearLegendHighlight();
                    if (flag) {
                        flag = false;
                        startPlayback();
                    }
                });
        }

        function updateLegend(year, country) {                              // Function to update the legend based on selected year and country
            const data = datasets[year][country].filter(d => d.value > 0);
            const categories = data.map(d => d.category);
            const legend = d3.select("#legend").selectAll("div").data(categories);

            legend.enter().append("div")
                .attr("class", "legend-item")
                .each(function (d, i) {
                    d3.select(this).append("svg")
                        .attr("width", 15)
                        .attr("height", 15)
                        .append("rect")
                        .attr("width", 15)
                        .attr("height", 15)
                        .attr("fill", color(d));

                    d3.select(this).append("span")
                        .attr("class", "legend-text")
                        .style("margin-left", "5px")
                        .style("font-family", "'Inter', sans-serif") 
                        .style("font-size", "14px") 
                        .text(d);
                });

            legend.select("rect").attr("fill", color);
            legend.select(".legend-text").text(d => d);

            legend.exit().remove();

            legend.on("mouseover", function (event, category) {             // Hover effect for focused section and stop playback
                if (isPlaying) {
                    pausePlayback();
                    flag = true;
                }
                svg.selectAll("path")
                    .attr("opacity", 0.3);
                svg.selectAll("path")
                    .filter(d => d.category === category)
                    .attr("opacity", 1)
                    .attr("stroke", color(category)) 
                    .attr("stroke-width",
                        2)
                    .classed("highlight", true);

                const categoryData = data.find(d => d.category === category);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                        <div class="title">${categoryData.category}</div>
                        <div class="value">${categoryData.value.toLocaleString()}%</div>
                        <div class="description">Health care spending</div>
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 40) + "px");
            })
                .on("mouseout", function () {
                    svg.selectAll("path")
                        .attr("opacity", 1)
                        .attr("stroke", "none")
                        .classed("highlight", false);

                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                    if (flag) {
                        flag = false;
                        startPlayback();
                    }

                });
        }

        function startPlayback() {                                          // Function to start the automatic playback of countries
            if (!isPlaying) {
                isPlaying = true;
                playbackInterval = setInterval(() => {
                    let countryIndex = countries.indexOf(currentCountry);
                    countryIndex = countryIndex < countries.length - 1 ? countryIndex + 1 : 0;
                    currentCountry = countries[countryIndex];
                    updateChart(currentYear, currentCountry);
                    updateLegend(currentYear, currentCountry);
                    currentCountryText.innerText = `Current Country: ${currentCountry}`;
                    highlightCountryButton(currentCountry);
                }, 1000);
            }
        }

        function pausePlayback() {                                          // Function to pause the automatic playback of countries
            if (isPlaying) {
                clearInterval(playbackInterval);
                isPlaying = false;
            }
        }

        function highlightCountryButton(country) {                                    // Function to highlight the current country button
            document.querySelectorAll('#country-buttons button').forEach(btn => {
                btn.classList.remove('active-country');
            });
            document.getElementById(`btn-${country}`).classList.add('active-country');
        }

        function highlightLegend(category) {                                // Function to highlight the legend 
            d3.selectAll(".legend-item")
                .style("opacity", 0.3);
            d3.selectAll(".legend-item")
                .filter(d => d === category)
                .style("opacity", 1)
                .style("font-weight", "bold");
        }

        function clearLegendHighlight() {                                   // Function to clear the legend highlight
            d3.selectAll(".legend-item")
                .style("opacity", 1)
                .style("font-weight", "normal");
        }

        playBtn.addEventListener('click', startPlayback);
        pauseBtn.addEventListener('click', pausePlayback);

        sortBtn.addEventListener('click', () => {
            if (!isPlaying) {
                updateChart(currentYear, currentCountry, true);
            }
        });

        updateChart(currentYear, currentCountry);
        updateLegend(currentYear, currentCountry);
        currentCountryText.innerText = `Current Country: ${currentCountry}`;
        startPlayback();
    }).catch(error => {
        console.error('Error loading the data:', error);
    });

}
