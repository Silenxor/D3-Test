function initialise()
{
	d3.select(".content")
		.append("h1")
		.text("Suncorp Life Claims");
	  
	d3.select(".content")
		.append("h2")
		.text("Open Claimscape");
	
    d3.select(".content")
		.append("div")
		.attr("class", "filterContainer");
    
	d3.select(".content")
		.append("div")
		.attr("class", "graphContainer");
};

var data_filtered;
var data_grouped;
var filter_channel
var data_inner;
var data_outer;
var data_underlying;
var selected_channel = "Retail";
var selected_assessor = "";
var svg;
var sortFlag = 1;

function process_data()
{
    d3.csv("/data/claimsdata.csv", function (data)
    {
        data_initialise();
        data_update();
        draw();
        
        function data_initialise()
        {

        }
        
        function data_update()
        {
            // group data by channel for inner donut
            data_inner = d3.nest()
                .key(function (d)
                {
                   return d.CHANNEL; 
                })
                .rollup(function(v) 
                {
                    return v.length;
                    
                })
                .entries(data);
            
            data_inner.sort(function(a, b)
            {
                return d3.ascending(a.key, b.key);
            });
            
            // group data by channel for outer donut
            data_outer = d3.nest()
                .key(function (d)
                {
                   return d.CHANNEL + "," + d.CLAIM_TYPE; 
                })
                .rollup(function(v)
                {
                    return v.length;    
                })
                .entries(data);
            
            data_outer.sort(function(a, b)
            {
                return d3.ascending(a.key, b.key);
            });
            
            // filter data for bars
            data_filtered = data.filter(function (d)
            {
                return d.CHANNEL == selected_channel;    
            });
            
            // group data by assessor
            data_grouped = d3.nest()
                .key(function (d)
                {
                   return d.ASSESSOR; 
                })
                .rollup(function(d) {
                    return {
                        IncomeProtection: d3.sum(d, function(e) { return e.CLAIM_TYPE == "IncomeProtection"; }),
                        TPD: d3.sum(d, function(e) { return e.CLAIM_TYPE == "TPD"; }),
                        Trauma: d3.sum(d, function(e) { return e.CLAIM_TYPE == "Trauma"; }),
                        Death: d3.sum(d, function(e) { return e.CLAIM_TYPE == "Death"; }),
                        Total: d3.sum(d, function(e) { return 1; })
                    };
                  })
                
                .entries(data_filtered);
            
            data_flattened = [];
            data_grouped.forEach(function (d)
            {
                data_flattened.push
                ({
                    key: d.key,
                    IncomeProtection: d.value.IncomeProtection,
                    TPD: d.value.TPD,
                    Trauma: d.value.Trauma,
                    Death: d.value.Death,
                    Total: d.value.Total
                });
            });
        }
        
        function draw()
        {
            svg = d3.select(".graphContainer").append("svg")
            draw_donut();
            //draw_bar();
        }
        
        function draw_bar()
        {   
            
            // exit
            d3.select("g.barchart")
                .remove()
                .exit();
            
            
            // tooltips
            var tooltip = d3.select(".content").append("div").attr("class", "toolTip");
            
             //variables
            var margin  = {top: 20, right: 20, bottom: 100, left:150},
                width   = 800 - margin.left - margin.right,
                height  = data_flattened.length * 20,
                y       = d3.scaleBand().rangeRound([0, height]).padding(0.2)
                x       = d3.scaleLinear().range([0, width]);
                z       = d3.scaleOrdinal()
                            .range(["#006F66", "#EB6411", "#FFCA3D", "#6A931B"]);
            // draw graph
            var graph = svg     
                .attr("class", "svgBar")
                .attr("width", width + margin.left + margin.right + 400)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("class", "barchart")
                .attr("transform", "translate(" + margin.left + "," + (margin.top + 30) + ")");
            
            // draw title
            graph.append("text")
                .text(selected_channel + " Open Claims")
                .attr("class", "barChartTitle")
                .attr("transform", "translate(-100, -20)")
            
            // draw axis
            var xAxis   = d3.axisBottom()
                .scale(x);

            var yAxis   = d3.axisLeft()
                .scale(y);
            
            var keysCol    = ["IncomeProtection", "TPD", "Trauma", "Death"];
            
            y.domain(data_flattened.map(function (d)
            {
                return d.key;
            }));

            x.domain([0, d3.max(data_flattened, function(d)
            {
                return d.Total;       
            })]);
            
            z.domain(keysCol);
            
            var bar = graph.selectAll("g")
                .data(d3.stack().keys(keysCol)(data_flattened))
                .enter()
                .append("g")
                .attr("fill", function(d)
                {
                    return getcolor(d.key);
                })
                .attr("class", function(d)
                {
                    return "bar " + d.key;    
                });
            
            var subbar = bar.selectAll("g")
                .data(function(d) 
                {
                    return d;
                })
                .enter()
                .append("g")
                .on("click", function (d)
                {
                    selected_assessor = d.data.key;
                    data_underlying = data.filter(function (d)
                    {
                        return (d.ASSESSOR == selected_assessor);    
                    });
                    data_underlying = data_underlying.filter(function (d)
                    {
                        return (d.CHANNEL == selected_channel);    
                    });
                    draw_underlying();
                    console.log(data_underlying);
                });
                
            subbar.append("rect")
                .attr("y", function (d)
                {
                    return y(d.data.key); 
                })
                .attr("height", y.bandwidth)
                .transition()
                    .duration(1000)
                    .attr("width", function (d)
                    {
                        return x(d[1]) - x(d[0]); 
                    })
                    .attr("x", function (d)
                    {
                        return x(d[0]);
                    });
            
            
            graph.append("g")
                .selectAll("text")
                .data(data_flattened)
                .enter()
                .append("text")
                .text(function (d)
                {
                    return d.Total; 
                })
                .attr("y", function (d)
                {
                    return y(d.key) + 10; 
                })
                .transition()
                    .duration(1000)
                    .attr("x", function(d)
                    {
                        return x(d.Total) + 3; 
                    })
            
            
            subbar.on("mousemove", function(d)
            {
                tooltip.style("left", d3.event.pageX+10+"px");
                tooltip.style("top", d3.event.pageY-25+"px");
                tooltip.style("display", "inline-block");
                tooltip.html((d.data.key)+"<br>"+(d[1] - d[0])+"<br>");
            });

            subbar.on("mouseout", function(d)
            {
                tooltip.style("display", "none");
            });
            
            
            graph.append("g")
                .attr("class", "yaxis")
                .on("click", changeSort)
                .transition()
                    .duration(1000)
                    .call(yAxis);
    
            graph.append("g")
                .attr("class", "xaxis")
                .attr("transform", "translate(0, " + height + ")")
                .transition()
                    .duration(1000)
                    .call(xAxis);
        }
        
        function draw_donut()
        {
             // tooltips
            var tooltip = d3.select(".content").append("div").attr("class", "toolTip");
            
            // clear
            /*
            var svg = d3.select("svg")
                .remove()
                .exit();
            */
            
            var width   = 1280,
                height  = 500,
                radius  = Math.min(width, height) / 2;

            var arcOut  = d3.arc()
                            .outerRadius(radius - 30)
                            .innerRadius(radius - 90);
            
            var arcIn  = d3.arc()
                            .outerRadius(radius - 90)
                            .innerRadius(radius - 160);
            
            var arcOutH  = d3.arc()
                            .outerRadius(radius)
                            .innerRadius(radius - 70);
            
            var arcInH  = d3.arc()
                            .outerRadius(radius - 70)
                            .innerRadius(radius - 170);

            var pie     = d3.pie()
                            .sort(null)
                            .value(function (d)
                            {
                                return d.value;
                            });

            var graph = svg
                            .attr("width", width)
                            .attr("height", height)
                            .append("g")
                            .attr("class", "donutchart")
                            .attr("transform", "translate(" + radius + "," + height / 2 + ")");
            
            
            var totalOpen;
            // append total text
            var centertext = graph.append("text")
                .attr("class", "donutCenterText")
                .text(d3.sum(data_inner, function (d)
                {
                    totalOpen = d.value;
                    return d.value;
                }));
            
            var centertext2 = graph.append("text")
                .attr("class", "donutCenterText2")
                .text("Open Claims")
                .attr("transform", "translate(0, 20)");

            
            var gOut       = graph.selectAll(".arc")
                            .data(pie(data_outer))
                            .enter()
                            .append("g")
                            .attr("class", "arc")
            
            gOut.append("path")
                .attr("d", arcOut)
                .style("fill", function (d)
                {
                    return getcolor(d.data.key);
                })
                .style("stroke", "white")
                .attr("class", function (d)
                {
                    return d.data.key.replace(",", " ");
                })
                .on("mouseover", function(d)
                {
                    tooltip.style("left", d3.event.pageX+10+"px");
                    tooltip.style("top", d3.event.pageY-25+"px");
                    tooltip.style("display", "inline-block");
                    tooltip.html((d.data.key.replace(",", " "))+"<br>"+d.data.value);
                })
                .on("mouseout", function(d)
                {
                    tooltip.style("display", "none");
                });
    
            
            var gIn           = graph.selectAll(".arc2")
                            .data(pie(data_inner))
                            .enter()
                            .append("g")
                            .attr("class", "arc2")
            
            var arcPath = gIn.append("path")
                .attr("d", arcIn)
                .attr("class", function (d)
                {
                    return d.data.key + "in";
                })
                .style("fill", function (d)
                {
                    return getcolor(d.data.key);
                })
                .style("stroke", "white")
                .on("mouseover", function (d) 
                {
                    d3.select(this)
                        .transition()
                        .attr("d", arcInH);
                    
                    d3.selectAll("." + d.data.key)
                        .transition()
                        .attr("d", arcOutH)
                    
                    tooltip.style("left", d3.event.pageX+10+"px");
                    tooltip.style("top", d3.event.pageY-25+"px");
                    tooltip.style("display", "inline-block");
                    tooltip.html((d.data.key)+"<br>"+getTextByChannel(d.data.key));
                })
                .on("mouseout", function (d) 
                {
                    d3.select(this)
                        .transition()
                        .attr("d", arcIn);

                    d3.selectAll("." + d.data.key)
                        .transition()
                        .attr("d", arcOut)
                    
                    tooltip.style("display", "none")
                });
            
            // draw a legend
            var legend_channel = ["Direct", "Group", "LegacyDirect", "Retail"];
            
            var legendObject = svg.append("g")
                                .attr("class", "legendContainer")
            
            legendObject.append("text")
                .attr("transform", "translate(650, 100)")
                .attr("class", "legendTitle")
                .text("Distribution Channels");
            
            var legend = legendObject.append("g")
                            .attr("class", "legend")
                            .attr("transform", "translate(650, 115)")
                            .selectAll("g.legend")
                            .data(legend_channel)
                            .enter()
                            .append("g")
                            .on("mouseover", function(d)
                            {
                                d3.selectAll("path")
                                    .transition()
                                    .style("opacity", 0.2);
                                
                                d3.selectAll("path." + d)
                                    .transition()
                                    .style("opacity", 1);
                                
                                d3.selectAll("path." + d + "in")
                                    .transition()
                                    .style("opacity", 1);
                                
                                for (i = 0; i < data_inner.length; i++)
                                {
                                    if (data_inner[i].key == d)
                                    {
                                        
                                        centertext.text(data_inner[i].value);
                                    }
                                }
                                
                                centertext2.text(d + " Claims");
                                
                            })
                            .on("mouseout", function(d)
                            {
                                d3.selectAll("path")
                                    .transition()
                                    .style("opacity", 1);
                                
                                centertext.text(d3.sum(data_inner, function (d)
                                {
                                    totalOpen = d.value;
                                    return d.value;
                                }));

                                centertext2.text("Open Claims");
                            })
                            .on("click", clearDonut)
                            .on("contextmenu", showDonut);
            
            legend.append("rect")
                .attr("y", function (d, i)
                {
                    return i * 25;
                })
                .attr("width", 20)
                .attr("height", 20)
                .style("fill", function(d)
                {
                    return getcolor(d)
                });
            
            legend.append("text")
                .attr("class", "legendText")
                .attr("x", 25)
                .attr("y", function (d, i)
                {
                    return i * 25 + 15;
                })
                .attr("width", 15)
                .attr("height", 15)
                .text(function (d)
                {
                    return d;
                });
            
            var legend_claimtype = ["Death", "IncomeProtection", "TPD", "Trauma"];
            
            legendObject.append("text")
                .attr("transform", "translate(650, 255)")
                .attr("class", "legendTitle")
                .text("Product Types");
            
            var legend = legendObject.append("g")
                            .attr("class", "legend")
                            .attr("transform", "translate(650, 270)")
                            .selectAll("g.legend")
                            .data(legend_claimtype)
                            .enter()
                            .append("g")
                            .on("mouseover", function(d)
                            {
                                d3.selectAll("path")
                                    .transition()
                                    .style("opacity", 0.2);
                                
                                d3.selectAll("path." + d)
                                    .transition()
                                    .style("opacity", 1);
                                
                                d3.selectAll("path." + d + "in")
                                    .transition()
                                    .style("opacity", 1);
                                
                                d3.selectAll("g.bar")
                                    .transition()
                                    .style("opacity", 0.2)
                                
                                d3.selectAll("g." + d)
                                    .transition()
                                    .style("opacity", 1)
                            })
                            .on("mouseout", function(d)
                            {
                                d3.selectAll("path")
                                    .transition()
                                    .style("opacity", 1);
                                
                                d3.selectAll("g.bar")
                                    .transition()
                                    .style("opacity", 1)
                            });
            
            legend.append("rect")
                .attr("y", function (d, i)
                {
                    return i * 25;
                })
                .attr("width", 20)
                .attr("height", 20)
                .style("fill", function(d)
                {
                    return getcolor(d)
                });
            
            legend.append("text")
                .attr("class", "legendText")
                .attr("x", 25)
                .attr("y", function (d, i)
                {
                    return i * 25 + 15;
                })
                .attr("width", 15)
                .attr("height", 15)
                .text(function (d)
                {
                    return d;
                });
            
            
            function clearDonut(d)
            {
                
                d3.selectAll(".donutchart")
                    .transition()
                    .duration(1250)
                    .attr("transform", "translate(-250, 250)");
                
                d3.selectAll(".legendContainer")
                    .transition()
                    .duration(1250)
                    .attr("transform", "translate(300,-80)")
                
                selected_channel = d;
                
                data_update();
                draw_bar();
                
                d3.selectAll(".barChartTitle")
                    .text(d + " Open Claims")
                
                selected_channel = d;
            }
            
            function showDonut(d)
            {
                d3.event.preventDefault();
                
                d3.selectAll(".barchart")
                    .transition()
                    .duration(1250)
                    .style("opacity", 0)
                
                 svg
                            .attr("width", width)
                            .attr("height", height)
                
                d3.selectAll(".donutchart")
                    .transition()
                    .duration(1250)
                    .attr("transform", "translate(" + radius + "," + height / 2 + ")");
                
                d3.selectAll(".legendContainer")
                    .transition()
                    .duration(1250)
                    .attr("transform", "translate(0, 0)")
                
                d3.selectAll(".barchart")
                    .transition()
                    .delay(1250)
                    .remove();
                
                var table = d3.select("table")
                table.transition().duration(750).style("opacity", 0)
                table.transition().delay(750).remove();
            }
        }
        
        function draw_underlying()
        {
            function tabulate(data, columns) 
            {
                d3.select("table").remove();
                
                var table = d3.select(".content")
                                .append('table')

                var thead = table.append('thead')
                var	tbody = table.append('tbody');

                // append the header row
                thead.append('tr')
                    .selectAll('th')
                    .data(columns).enter()
                    .append('th')
                    .text(function (column) { return column; });

                // create a row for each object in the data
                var rows = tbody.selectAll('tr')
                    .data(data_underlying)
                    .enter()
                    .append('tr');

                // create a cell in each row for each column
                var cells = rows.selectAll('td')
                    .data(function (row) 
                    {
                        return columns.map(function (column) 
                        {
                            return {column: column, value: row[column]};
                        });
                    })
                    .enter()
                    .append('td')
                    .text(function (d) { return d.value; });

                    return table;
	           }  

            // render the table(s)
            tabulate(data, ['CLAIM_NUMBER', 'POLICY_NUMBER','ASSESSOR','CHANNEL', 'CLAIM_TYPE','LEADER','COUNT_CLAIMS']); // 2 column table
            var table = d3.select("table").style("opacity", 0);
            table.transition().duration(750).style("opacity",1);
        }
        
        function getcolor(text)
        {
            if (text.includes("IncomeProtection")) { return "#EB6411"};
            if (text.includes("Death")) { return "#ECAB00"};
            if (text.includes("Trauma")) { return "#FFC125"};
            if (text.includes("TPD")) { return "#FFD56D"};
            
            switch (text)
            {
                case "Direct":
                    return "#38635F";
                case "Group":
                    return "#4D8983";
                case "LegacyDirect":
                    return "#5DA39C";
                case "Retail":
                    return "#7AB4AE";
            };
        }
        
        function getTextByChannel(channel)
        {
            var toolTipText = '';
            
            for (i = 0; i < data_outer.length; i++)
            {
                 if (data_outer[i].key.split(",")[0] == channel) 
                { 
                    toolTipText += data_outer[i].key.replace(channel + ",", "") + ": " + data_outer[i].value + "<br>";
                };
            }
            
            return toolTipText;
        }
        
        function changeSort()
        {
            if (sortFlag == 1)
            {
                data_flattened.sort(function(a, b)
                {
                    return d3.ascending(a.key, b.key);
                })
                sortFlag = 0;
            } else
            {
                data_flattened.sort(function(a, b)
                {
                    return a.Total - b.Total;
                });
                sortFlag = 1;
            }
            draw_bar();
        }
    });
};




/*
function visualize()
{
    var data_filtered;
    var data_grouped;
    var data_flattened = [];
    
    // tooltips
    var div = d3.select("body").append("div").attr("class", "toolTip");
    
    d3.csv("/data/claimsdata.csv", function (data)
    {
        // process data
        data.forEach(function (d)
        {
            d.COUNT_CLAIMS = +d.COUNT_CLAIMS;    
        });
        
        start();
        update();
        
        function start()
        {
            filter_channel();
            
            // initial filter
            data_filtered = data.filter(function (d)
            {
                return d.CHANNEL == "Retail";    
            });
            
            group_data();
            create_sort_button();
        }
        
        // bar graph =============================================================
        function update()
        {   
            // exit
            var svg = d3.select("svg")
                .remove()
                .exit();
            
             //variables
            var margin  = {top: 20, right: 20, bottom: 100, left:150},
                width   = 800 - margin.left - margin.right,
                height  = data_claims_by_assessor.length * 20,
                y       = d3.scaleBand().rangeRound([0, height]).padding(0.2)
                x       = d3.scaleLinear().range([0, width]);
                z       = d3.scaleOrdinal()
                            .range(["#006F66", "#EB6411", "#FFCA3D", "#6A931B"]);
            // draw graph
            svg     = d3.select(".graphContainer")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            
            // draw axis
            var xAxis   = d3.axisBottom()
                .scale(x);

            var yAxis   = d3.axisLeft()
                .scale(y);
            
            var keysCol    = ["IP", "TPD", "Trauma", "Death"];
            
            y.domain(data_flattened.map(function (d)
            {
                return d.key;
            }));

            x.domain([0, d3.max(data_flattened, function(d)
            {
                return d.Total;       
            })]);
            
            z.domain(keysCol);
            
            var bar = svg.selectAll("g")
                .data(d3.stack().keys(keysCol)(data_flattened))
                .enter()
                .append("g")
                .attr("fill", function(d)
                {
                    return z(d.key);
                })
                .attr("class", "bar");
            
            var subbar = bar.selectAll("g")
                .data(function(d) 
                {
                    return d;
                })
                .enter()
               .append("g");
                
            subbar.append("rect")
                .attr("y", function (d)
                {
                    return y(d.data.key); 
                })
                .attr("height", y.bandwidth)
                .transition()
                    .duration(1000)
                    .attr("width", function (d)
                    {
                        return x(d[1]) - x(d[0]); 
                    })
                    .attr("x", function (d)
                    {
                        return x(d[0]);
                    });
            
            
            svg.append("g")
                .selectAll("text")
                .data(data_flattened)
                .enter()
                .append("text")
                .text(function (d)
                {
                    return d.Total; 
                })
                .attr("y", function (d)
                {
                    return y(d.key) + 10; 
                })
                .transition()
                    .duration(1000)
                    .attr("x", function(d)
                    {
                        return x(d.Total) + 3; 
                    })
            
            
            subbar.on("mousemove", function(d)
            {
                div.style("left", d3.event.pageX+10+"px");
                div.style("top", d3.event.pageY-25+"px");
                div.style("display", "inline-block");
                div.html((d.data.key)+"<br>"+(d[1] - d[0])+"<br>");
            });

            subbar.on("mouseout", function(d)
            {
                div.style("display", "none");
            });
            
            
            svg.append("g")
                .attr("class", "yaxis")
                .transition()
                    .duration(1000)
                    .call(yAxis);
    
            svg.append("g")
                .attr("class", "xaxis")
                .attr("transform", "translate(0, " + height + ")")
                .transition()
                    .duration(1000)
                    .call(xAxis);
            
        };
        // end bar graph =========================================================
        
        function group_data()
        {
            // group data by assessor
            data_claims_by_assessor = d3.nest()
                .key(function (d)
                {
                   return d.ASSESSOR; 
                })
                .rollup(function(d) {
                    return {
                        IP: d3.sum(d, function(e) { return e.CLAIM_TYPE == "Income Protection"; }),
                        TPD: d3.sum(d, function(e) { return e.CLAIM_TYPE == "TPD"; }),
                        Trauma: d3.sum(d, function(e) { return e.CLAIM_TYPE == "Trauma"; }),
                        Death: d3.sum(d, function(e) { return e.CLAIM_TYPE == "Death"; }),
                        Total: d3.sum(d, function(e) { return 1; })
                    };
                  })
                
                .entries(data_filtered);
            
            data_flattened = [];
            data_claims_by_assessor.forEach(function (d)
            {
                data_flattened.push
                ({
                    key: d.key,
                    IP: d.value.IP,
                    TPD: d.value.TPD,
                    Trauma: d.value.Trauma,
                    Death: d.value.Death,
                    Total: d.value.Total
                });
            });
        }
        
        function changefilter()
        {
            var filtervalue = this.value;
            data_filtered = data.filter(function (d)
            {
                return d.CHANNEL == filtervalue;    
            });
            
            changeSort();
            update();
        }
        
        function filter_claim_type()
        {
        // creating a filter
            var filter_claim_types = d3.nest()
                .key(function (d)
                {
                   return d.CLAIM_TYPE; 
                })
                .rollup(function(v)
                {
                    return v.length;    
                })
                .entries(data);
            
            d3.select(".filterContainer")
                .append("select")
                .on("change", changefilter)
                .selectAll("option")
                .data(filter_claim_types)
                .enter()
                .append('option')
                .attr("value", function(d)
                {
                    return (d.key);
                })
                .text(function (d)
                {
                    return (d.key);    
                });
        }
        
        function create_sort_button()
        {
            d3.select(".filterContainer")
                .append("label")
                .text("Sort Values")
                .append("input")
                .attr("type", "checkbox")
                .on("change", changeSort);
        }
        
        function changeSort()
        {
            group_data();
            this.checked ?
            data_flattened.sort(function(a, b)
            {
                return d3.ascending(a.key, b.key);
            })
            :
            data_flattened.sort(function(a, b)
            {
                return a.Total - b.Total;
            });
            
            update();
        }
        
        function filter_channel()
        {
        // creating a filter
            var filter_channel = d3.nest()
                .key(function (d)
                {
                   return d.CHANNEL; 
                })
                .rollup(function(v)
                {
                    return v.length;    
                })
                .entries(data);
            
            d3.select(".filterContainer")
                .append("select")
                .on("change", changefilter)
                .selectAll("option")
                .data(filter_channel)
                .enter()
                .append('option')
                .attr("value", function(d)
                {
                    return (d.key);
                })
                .text(function (d)
                {
                    return (d.key);    
                });
        }
    });
    
};
*/

