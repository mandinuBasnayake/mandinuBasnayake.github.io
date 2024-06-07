function init() {
    const margin = { top: 30, right: 100, bottom: 50, left: 100 },
        width = 900 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#heatmap")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip");

    let isValueSorted = false;

    d3.json("data.json").then(data => {
        const processData = (dataType, yearMax, category = null) => {
            const years = Object.keys(data).filter(year => year <= yearMax);
            const TotalOfContients = {};

            const DataProcessed = years.flatMap(year => {
                return Object.keys(data[year]).map(continent => {
                    let value;
                    if (category) {
                        value = data[year][continent].totals[dataType].categories[category] || 0;
                    } else {
                        value = data[year][continent].totals[dataType].total;
                    }
                    if (!TotalOfContients[continent]) {
                        TotalOfContients[continent] = 0;
                    }
                    TotalOfContients[continent] += value;
                    return {
                        year: year,
                        continent: continent,
                        value: value
                    };
                });
            });

            const continents = Object.keys(data[years[0]]).sort();

            return { DataProcessed, continents, TotalOfContients, years };
        };

        const drawHeatmap = (dataType, category = null) => {
            const yearMax = parseInt(d3.select("#year-range-max").property("value"));

            const valueMin = parseInt(d3.select("#value-range-min").property("value"));
            const valueMax = parseInt(d3.select("#value-range-max").property("value"));

            const { DataProcessed, continents, TotalOfContients, years } = processData(dataType, yearMax, category);

            const continentSorted = isValueSorted ?
                continents.sort((a, b) => TotalOfContients[a] - TotalOfContients[b]) :
                continents.sort().reverse();

            const x = d3.scaleBand()
                .range([0, width])
                .domain(years)
                .padding(0.01);

            const y = d3.scaleBand()
                .range([height, 0])
                .domain(continentSorted)
                .padding(0.01);

            const colorScheme = d3.select("#color-scheme").property("value");
            const colorSchemes = {
                "Blue": d3.interpolateBlues,
                "Green": d3.interpolateGreens,
                "Red": d3.interpolateReds,
                "Protan": d3.scaleSequential(d3.interpolateYlGnBu),
                "Deutan": d3.scaleSequential(d3.interpolatePlasma),
                "Tritan": d3.scaleSequential(d3.interpolateCubehelixDefault)
            };
            const colorScale = d3.scaleSequential(colorSchemes[colorScheme])
                .domain([0, d3.max(DataProcessed, d => d.value)]);

            svg.selectAll("*").remove();

            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x).tickSize(0))
                .selectAll("text")
                .attr("dy", "1.5em");

            svg.append("g")
                .call(d3.axisLeft(y).tickSize(0))
                .selectAll("text")
                .attr("dx", "-0.5em");

            svg.selectAll()
                .data(DataProcessed)
                .enter()
                .append("rect")
                .attr("x", d => x(d.year))
                .attr("y", d => y(d.continent))
                .attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .style("fill", d => d.value >= valueMin && d.value <= valueMax ? colorScale(d.value) : "black")
                .on("mouseover", function(event, d) {
                    if (d.value >= valueMin && d.value <= valueMax) {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", .9);
                        tooltip.html(`
                            <div class="title">Year: ${d.year}</div>
                            <div class="value">Continent: ${d.continent}</div>
                            <div class="description">Value: $${d.value.toFixed(2)} (1m USD)</div>
                        `)
                            .style("left", (event.pageX + 5) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    }
                })
                .on("mousemove", function(event, d) {
                    if (d.value >= valueMin && d.value <= valueMax) {
                        tooltip.style("left", (event.pageX + 5) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    }
                })
                .on("mouseout", function(d) {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            svg.append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", height)
                .attr("y2", height)
                .attr("stroke", "black");

            svg.append("line")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", 0)
                .attr("y2", height)
                .attr("stroke", "black");

            const legendHeight = 300;
            const legendWidth = 20;
            const legend = svg.append("g")
                .attr("transform", `translate(${width + 10}, 0)`);

            const legendScale = d3.scaleSequential(colorSchemes[colorScheme])
                .domain([0, d3.max(DataProcessed, d => d.value)]);

            const legendAxis = d3.axisRight(d3.scaleLinear()
                .domain([0, d3.max(DataProcessed, d => d.value)])
                .range([legendHeight, 0]))
                .ticks(5);

            legend.append("g")
                .call(legendAxis)
                .attr("transform", `translate(${legendWidth}, 0)`);

            legend.append("rect")
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", "url(#gradient)");

            const defs = svg.append("defs");

            const gradient = defs.append("linearGradient")
                .attr("id", "gradient")
                .attr("x1", "0%")
                .attr("x2", "0%")
                .attr("y1", "100%")
                .attr("y2", "0%");

            gradient.selectAll("stop")
                .data([
                    { offset: "0%", color: colorScale(0) },
                    { offset: "100%", color: colorScale(d3.max(DataProcessed, d => d.value)) }
                ])
                .enter().append("stop")
                .attr("offset", d => d.offset)
                .attr("stop-color", d => d.color);

            const headingText = category ? `Category: ${category}` : `Category: Total ${dataType.charAt(0).toUpperCase() + dataType.slice(1)}`;
            d3.select("#category-heading").text(headingText);
        };

        const createCategoryButtons = (dataType) => {
            const sampleData = data[Object.keys(data)[0]][Object.keys(data[Object.keys(data)[0]])[0]];
            const categories = Object.keys(sampleData.totals[dataType].categories);

            const container = d3.select("#category-buttons-container");
            container.selectAll("*").remove();

            categories.forEach(category => {
                container.append("button")
                    .attr("class", "btn btn-info m-2 hidden")
                    .attr("data-category", category)
                    .text(category)
                    .on("click", function() {
                        drawHeatmap(dataType, category);
                    });
            });

            container.append("button")
                .attr("class", "btn btn-info m-2 hidden")
                .attr("data-category", "total")
                .text("Total")
                .on("click", function() {
                    drawHeatmap(dataType);
                });

            setTimeout(() => {
                d3.selectAll(".hidden").classed("visible", true).classed("hidden", false);
            }, 100);
        };

        const updateSliderLabels = () => {
            const minValue = parseInt(d3.select("#value-range-min").property("value"));
            const maxValue = parseInt(d3.select("#value-range-max").property("value"));
            d3.select("#value-range-min-label").text(`$${minValue}`);
            d3.select("#value-range-max-label").text(`$${maxValue}`);
        };

        d3.select("#government-totals-btn").on("click", () => {
            drawHeatmap("government");
            createCategoryButtons("government");
        });

        d3.select("#voluntary-totals-btn").on("click", () => {
            drawHeatmap("voluntary");
            createCategoryButtons("voluntary");
        });

        d3.select("#color-scheme").on("change", function() {
            drawHeatmap("government");
        });

        d3.select("#value-range-min").on("input", function() {
            updateSliderLabels();
            drawHeatmap("government");
        });

        d3.select("#value-range-max").on("input", function() {
            updateSliderLabels();
            drawHeatmap("government");
        });

        d3.select("#year-range-max").on("input", function() {
            drawHeatmap("government");
        });

        d3.select("#sort-btn").on("click", function() {
            isValueSorted = !isValueSorted;
            drawHeatmap("government");
        });

        drawHeatmap("government");
        createCategoryButtons("government");
        updateSliderLabels();
    });
}

window.onload = init;
