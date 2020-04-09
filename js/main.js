// JavaScript by Greg Farnsworth, 2020

(function(){
    
    //pseudo-global variables
    var attrArray = ["geo_id",
                     "geo_name",
                     "geo_abbrv",
                     "geo_pop",
                     "geo_acres",
                     "acreTotal",
                     "acrePark",
                     "acreMonument",
                     "acreHistorical",
                     "acreBattlefield",
                     "acreMemorial",
                     "acrePreserve",
                     "acreOther",
                     "normTotal",
                     "normPark",
                     "normMonument",
                     "normHistorical",
                     "normBattlefield",
                     "normMemorial",
                     "normPreserve",
                     "normOther",
                     "pctTotal",
                     "pctPark",
                     "pctMonument",
                     "pctHistorical",
                     "pctBattlefield",
                     "pctMemorial",
                     "pctPreserve",
                     "pctOther",
                     "place",
                     "linked"
                    ],
        procArray = [   ["normTotal",
                         "normPark",
                         "normMonument",
                         "normHistorical",
                         "normBattlefield",
                         "normMemorial",
                         "normPreserve",
                         "normOther"
                        ],
                        ["pctTotal",
                         "pctPark",
                         "pctMonument",
                         "pctHistorical",
                         "pctBattlefield",
                         "pctMemorial",
                         "pctPreserve",
                         "pctOther"
                        ]
                    ],
        acreArray = ["acreTotal",
                     "acrePark",
                     "acreMonument",
                     "acreHistorical",
                     "acreBattlefield",
                     "acreMemorial",
                     "acrePreserve",
                     "acreOther"
                    ],
        droplistOne = ["All National Park Service Sites",
                      "National Parks",
                      "National Monuments",
                      "Historical Parks",
                      "Battlefields & Military Parks",
                      "National Memorials",
                      "Preserves incl. Sea/Lakeshores",
                      "Recreation Areas, Trails & Parkways"
                     ],
        droplistTwo = ["per Land Area (100K acres)",
                       "per Capita (100K people)"
                      ];
    
    var expressed = procArray[0][0],
        displayed = acreArray[0],
        drop1Choice = droplistOne[0],
        drop2Choice = droplistTwo[0];
    
    
    //chart frame dimensions
    var mapWidth = window.innerWidth * 0.55,
        chartWidth = window.innerWidth * 0.36,
        labelWidth = chartWidth * 0.06,
        flavorWidth = mapWidth,
        minHeight = 650;

    var mapHeight = window.innerHeight * 0.70;
    var chartHeight, labelHeight = chartHeight = window.innerHeight * 0.80;
    var flavorHeight = chartHeight - mapHeight - 15;
    
    var wScale;
    var comma = d3.format(",");
    var linkNPS = "https://www.nps.gov/findapark/index.htm";

    
    //begin script when window loads
    window.onload = setPage();

    //set up choropleth map
    function setPage(){
        
        d3.select("body").style("background-size", window.innerWidth+"px "+window.innerHeight+"px");
        d3.select(".flex").style("height", window.innerHeight+"px");
        
        //create new svg container for the map
        var map = d3.select(".flex")
            .append("svg")
            .attr("class", "map")
            .attr("width", mapWidth)
            .attr("height", mapHeight);
        
        //create Albers equal area conic projection centered on us
        var projection = d3.geoAlbers()
              .parallels([32, 45])
              .rotate([91.15, 0])
              .center([0, 41.5])
              .scale(1100);

        var path = d3.geoPath()
            .projection(projection);

        d3.queue()
            .defer(d3.csv, "data/dataNationalParks.csv") //load attributes from csv
            .defer(d3.json, "data/Country.topojson") //load background spatial data
            .defer(d3.json, "data/State.topojson") //load choropleth spatial data
            .await(callback);

        function callback(error, csvData, tCountry, tState){

            //place graticule on the map
            setGraticule(map, path);

            //translate na and us TopoJSONs
            var mCountry = topojson.feature(tCountry, tCountry.objects.Country),
                mState = topojson.feature(tState, tState.objects.State).features;
            
            //add na countries to map
            var countries = map.append("path")
                .datum(mCountry)
                .attr("class", "countries")
                .attr("d", path);

            //join csv data to GeoJSON enumeration units
            mState = joinData(mState, csvData);

            //create the color scale
            var colorScale = naturalColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(mState, map, path, colorScale);
            
            createDropdownOne(csvData);
            createDropdownTwo(csvData);
            
            setFlavorBox();

            //add coordinated visualization to the map
            setLabelChart(csvData, colorScale);

        };
    }; //end of setMap()

    
    function setGraticule(map, path){
        
        var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
    };

    
    function joinData(mState, csvData){
        
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvState = csvData[i]; //the current region
            var csvKey = csvState.geo_name; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<mState.length; a++){

                var geojsonProps = mState[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.geo_name; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        if (isNaN(csvState[attr])) {
                          var val = csvState[attr];
                        } else {
                          var val = parseFloat(csvState[attr]);
                        } 
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                }
            }
        }
        return mState;
    };


    function setEnumerationUnits(mState, map, path, colorScale){

        //add us regions to map
        var states = map.selectAll(".states")
            .data(mState)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.geo_id;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            })
            .on("click", function(d){
                goLink(d.properties.linked);
            })
            .on("mousemove", moveInfobox);
        
        var desc = states.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.25px"}');
    };

    
    //function to create color scale generator
    function quantileColorScale(data){
        var colorClasses = ['#edf8e9','#c7e9c0','#a1d99b','#74c476','#31a354','#006d2c'];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            if (typeof val == 'number' && !isNaN(val)){
                domainArray.push(val);
            } 
        };
        
        wScale = d3.scalePow()
            .exponent(0.25)
            .range([0, chartWidth])
            .domain([d3.min(domainArray), d3.max(domainArray)]);

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    };
    
    function intervalColorScale(data){
        var colorClasses = ['#edf8e9','#c7e9c0','#a1d99b','#74c476','#31a354','#006d2c'];

        //create color scale generator
        var colorScale = d3.scaleInterval()
            .range(colorClasses);

        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
            d3.min(data, function(d) { return parseFloat(d[expressed]); }),
            d3.max(data, function(d) { return parseFloat(d[expressed]); })
        ];
        
        wScale = d3.scalePow()
            .exponent(0.25)
            .range([0, chartWidth])
            .domain([d3.min(domainArray), d3.max(minmax)]);
        
        //assign two-value array as scale domain
        colorScale.domain(minmax);

        return colorScale;
    };

    function naturalColorScale(data){
        var colorClasses = ['#edf8e9','#c7e9c0','#a1d99b','#74c476','#31a354','#006d2c'];

        //create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            if (typeof val == 'number' && !isNaN(val)){
                domainArray.push(val);
            } 
        };

        //create a scale to size bars proportionally to frame and for axis
        wScale = d3.scalePow()
            .exponent(0.25)
            .range([0, chartWidth])
            .domain([d3.min(domainArray), d3.max(domainArray)]);

        //cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ckmeans(domainArray, 6);
        //reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        
        //remove first value from domain array to create class breakpoints
        domainArray.shift();

        //assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;
    };
    
    
    //function to test for data value and return color
    function choropleth(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);

        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };
    

    //function to create coordinated bar chart
    function setLabelChart(csvData, colorScale){
 
        //create a second svg element to hold the bar chart labels
        var lbl = d3.select(".flex")
            .append("svg")
            .attr("width", labelWidth)
            .attr("height", labelHeight)
            .attr("x", 0)
            .attr("y", 0)
            .attr("class", "lbl");
        
        var labels = lbl.selectAll(".labels")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function(a, b){
                return b[expressed] - a[expressed] || d3.ascending(a.geo_abbrv, b.geo_abbrv);
            })
            .attr("class", function(d){
                return "labels";
            })
//            .attr("text-anchor", "middle")
            .text(function(d){
                return d.geo_abbrv;
            })
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveInfobox);

        
        //create a third svg element to hold the bar chart
        var chart = d3.select(".flex")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");
        
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.geo_id
            })
            .attr("height", chartHeight / csvData.length - 1)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveInfobox)            
            .on("click", function(d){
                goLink(d.linked);
            });

        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

        var chartTitle = drop1Choice;
        
        var chartTitle = chart.append("text")
            .attr("x", chartWidth - chartTitle.length)
            .attr("y", chartHeight - chartTitle.length)
            .attr("text-anchor", "end")
            .attr("text-align", "right")
            .attr("class", "chartTitle")
            .text(drop1Choice);

        updateChart(bars, labels, csvData.length, colorScale);
    }; 
    
    
    //function to create a dropdown menu for attribute selection
    function createDropdownOne(csvData){

        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .attr("id", "ddOne")
            .on("change", function(){
                drop1Choice = this.value
                changeAttribute(this.value, csvData)
            });

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(droplistOne)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
        
        var cordsM = d3.select("svg.map")
            .node()
            .getBoundingClientRect();
        
        var mapXRight = cordsM.right;
        var mapYTop = cordsM.top;
        
        var cordsD = d3.select("#ddOne")
            .node()
            .getBoundingClientRect();
        
        var dropWidth = cordsD.width;
        var dropHeight = cordsD.height;

        var dropX = mapXRight - dropWidth - dropHeight*2;
        var dropY = mapYTop + dropHeight*1.1;

        d3.select("#ddOne").style("left", dropX.toFixed(0)+"px").style("top", dropY.toFixed(0)+"px");
    };
   
    
    //function to create a dropdown menu for attribute selection
    function createDropdownTwo(csvData){

        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .attr("id", "ddTwo")
            .on("change", function(){
                drop2Choice = this.value
                changeAttribute(this.value, csvData)
            });

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(droplistTwo)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
        
        var cordsM = d3.select("svg.map")
            .node()
            .getBoundingClientRect();
        
        var mapXRight = cordsM.right;
        var mapYTop = cordsM.top;
        
        var cordsD = d3.select("#ddTwo")
            .node()
            .getBoundingClientRect();
        
        var dropWidth = cordsD.width;
        var dropHeight = cordsD.height;

        var dropX = mapXRight - dropWidth - dropHeight*2;
        var dropY = mapYTop + dropHeight*1.1 + 40;

        d3.select("#ddTwo").style("left", dropX.toFixed(0)+"px").style("top", dropY.toFixed(0)+"px");
    };
    
    
    //dropdown change listener handler
    function changeAttribute(attribute, csvData){
        
        expressed = procArray[droplistTwo.indexOf(drop2Choice)][droplistOne.indexOf(drop1Choice)];
        displayed = acreArray[droplistOne.indexOf(drop1Choice)];
    
        var existArray = [];
        for (var i=0; i<csvData.length; i++){
            var val = parseFloat(csvData[i][expressed]);
            if (typeof val == 'number' && !isNaN(val)){
                existArray.push(val);
            } 
        };
        
        //recreate the color scale
        var colorScale = naturalColorScale(csvData);

        //recolor enumeration units
        var states = d3.selectAll(".states")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });

        //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //re-sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);

        var labels = d3.selectAll(".labels")
            .sort(function(a, b){
                return b[expressed] - a[expressed] || d3.ascending(a.geo_abbrv, b.geo_abbrv);
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);
        
        updateChart(bars, labels, existArray.length, colorScale);
    };
    
    
    //function to position, size, and color bars in chart
    function updateChart(bars, labels, n, colorScale){

        //position bars
        bars.attr("x", 0)
            //size/resize bars
            .attr("y", function(d, i){
                return i * (chartHeight / n)
            })
            .attr("width", function(d){
                var ww = wScale(d[expressed]);
                if (ww>0) {
                    return wScale(d[expressed]);
                } else {
                    return 0;
                }    
            })
            .attr("height", chartHeight / n - 1)
            //color/recolor bars
            .style("fill", function(d){
                return choropleth(d, colorScale);
            });

        labels.attr("x", +7)
            .attr("y", function(d, i){
                return (i * (labelHeight / n)) + (labelHeight / n * .5) + 5;
            });
        
        d3.select(".chartTitle").text(drop1Choice);      
    };
    
    
    //function to highlight enumeration units and bars
    function highlight(props){

        //change stroke
        var selected = d3.selectAll("." + props.geo_id)
            .style("stroke", "blue")
            .style("stroke-width", "2");
        
        var newTxt = "NPS Highlights in " + props.geo_name + " include: " + props.place;
        d3.select(".linkTxt")
            .attr("x", 20)
            .attr("y", flavorHeight/1.5)
            .attr("text-anchor", "start")
            .text(newTxt);
        
        setInfobox(props);
    };
    
    //function to reset the element style on mouseout
    function dehighlight(props){
        
        d3.select(".linkTxt")
            .attr("x", flavorWidth/2)
            .attr("y", flavorHeight/1.5)
            .attr("text-anchor", "middle")
            .text("Explore the National Park Service!");
        
        d3.select(".infolabel")
            .remove();
        var selected = d3.selectAll("." + props.geo_id)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
    };
    
    //function to create dynamic label
    function setInfobox(props){
        
        var infoValue, i = infoValue = 0;
        do {
            var infoValue = parseFloat(props[expressed]).toFixed(i);
            i++;
        }
        while (infoValue <= 0);
        
        if (isNaN(infoValue)) {
            var infoValue, infoAcres = infoValue = 0;
        } else {
            var infoValue = comma(parseFloat(props[expressed]).toFixed(i));
            var infoAcres = comma(props[displayed]);
        }

        var infoDesc2 = "Acreage " + drop2Choice;
        var infoDesc1 = "Total Acreage of " + drop1Choice;
        
        //label content
        var infoAttribute1 = '<h2><span id="inf">' + infoDesc1 + ': </span> ' + infoAcres + '</h2>';
        var infoAttribute2 = '<h2><span id="inf">' + infoDesc2 + ': </span> ' + infoValue + '</h2>';
        var stateName = '<h2>' + props.geo_name + '</h2>';
        
        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.geo_id + "_label")
            .html(stateName);

        var stateName = infolabel.append("div")
            .attr("class", "infogoo")
            .html(infoAttribute1);
        var stateName = infolabel.append("div")
            .attr("class", "infogoo")
            .html(infoAttribute2);
    };

    function moveInfobox(){
        //get width of label
        var infoboxWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
        
        var infoboxHeight = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .height;
        
        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 30,
            y1 = d3.event.clientY + 20,
            x2 = d3.event.clientX - infoboxWidth - 10,
            y2 = d3.event.clientY - infoboxHeight - 10;

        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - infoboxWidth - 50 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY > window.innerHeight - infoboxHeight - (flavorHeight*2) ? y2 : y1; 

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    
    //function to create dynamic label
    function setFlavorBox(){
                          
        var flavor = d3.select(".flex")
            .append("svg")
            .attr("class", "flavor")
            .attr("width", flavorWidth)
            .attr("height", flavorHeight);

        // draw a rectangle
        var flLink = flavor.append("rect") 
            .attr("class", "linkBox")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", flavorHeight)
            .attr("width", flavorWidth);
        var flText = flavor.append("text")
            .attr("class", "linkTxt")
            .attr("x", flavorWidth/2)
            .attr("y", flavorHeight/1.5)
            .attr("text-anchor", "middle")
            .text("Explore the National Park Service!");
    };
      
    function goLink(linkNPS){

        window.open(linkNPS);
    };
    
    
    function cycleBackgrounds() {
        var index = 0;

        $imageEls = $('.toggle-image'); // Get the images to be cycled.

        setInterval(function () {
            // Get the next index.  If at end, restart to the beginning.
            index = index + 1 < $imageEls.length ? index + 1 : 0;
            // Show the next image.
            $imageEls.eq(index).addClass('show');
            // Hide the previous image.
            $imageEls.eq(index - 1).removeClass('show');

        }, 8000);
    };

    // Document Ready.
    $(function () {
        cycleBackgrounds();
    });
    
    
})(); //last line of main.js
