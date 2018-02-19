var build_list;
var selected_build;
var software_req_list;
/* this code doesn't quite work because of CORS security restrictions
// we get around this by importing countries.js
d3.json("data.json",
	function(error, data) {
		if (error) {
			console.log("we got an error", error);
			return;
		} else {
			console.log("data loaded ok");
		}
		
		//formatData();
		//createVis();
		//etc.
	}
);
*/


var root;

var margin = {
	top : 50,
	left: 50,
	bottom: 50,
	right: 50
};
var width = 1000 - margin.left * 2;
var height = 600 - margin.top * 2;

var xScale = d3.scale.linear().range([0, width]);
var yScale = d3.scale.linear().range([height, 0]);

var xAxis = d3.svg.axis().orient("bottom");
var yAxis = d3.svg.axis().orient("left");

var firstRun = true;

var part_type_list = [
	"CPU",
	"Video Card",
	"Memory",
	"Motherboard",
	"Storage",
	"Power Supply",
	"Case",
	"Miscellaneous"
];


//Asthetic controls
var barWidth = 100;
var MAX_RELATED_BUILDS_SHOW = 3;

var divisionLines = [
{
	x:145,
	y:0,
	width: 5,
	height: height,
	classAttr: "divider-line"
},
{
	x:145 - 8,
	y:-3,
	width: 21,
	height: 5,
	classAttr: "divider-line"
},
{
	x:145 - 8,
	y: height-3,
	width: 21,
	height: 5,
	classAttr: "divider-line"
}
];

var X_AXIS_POSITION = {
	top: 45,
	left: width/2
};

var Y_AXIS_POSITION = {
	top: height/2 + (-50),
	left: -1 * margin.left
};

var HOVER_MENU_PARAMS ={
	width: 150,
	height:30,
	rx: 5,
	ry: 5,
	
	mouse_offset_x: 10,
	mouse_offset_y: 10,
	
	label_padding_left: 5,
	label_spacing_top: 19,
	
	//see CSS for color and fill of hover menu
};

var X_AXIS_LABEL = "Total Price (USD)";
var Y_AXIS_LABEL = "Passmark 3D Score";




//Pre-render data filters
var min_price = 1;
var max_price = 10000;

var min_gpu_performance = 1;
var max_gpu_performance = 500000;

var min_cpu_performance = 1;
var max_cpu_performance = 500000;

var max_gpu_count = 4;
var max_cpu_count = 2;



initPage();


function initPage(){
	
	//format the data
	formatData(pc_list, software_list);
	
	//get the requested buildid
	selected_build = build_list.find(function(ele,index,arr){
		return ele.build_id === window.location.search.replace("?", "").split('=')[1];
	});
	
	//return error and quit when there's no pc selected
	if (typeof selected_build === "undefined"){
		$("#build-name-header").text("ERROR! No PC selected.");
		return;
	}
	
	console.log("Showing build details for: " + selected_build.build_id);
	setupPage(selected_build);
	
	
	
	createButtons();
	createVis();
	updateVis();
}




function formatData(pc_data, software_data) {
	build_list = pc_data;
	
	for (var i = 0; i < build_list.length ; i++){
		build_list[i].total_price = parseFloat(build_list[i].total_price);
		build_list[i].total_cpus = parseInt(build_list[i].total_cpus);
		build_list[i].total_gpus = parseInt(build_list[i].total_gpus);
		
	}
	
	var part_type_list_required = [
		"CPU",
		"Video Card",
		"Memory",
		"Motherboard",
		"Storage",
		"Power Supply",
		"Case"
	];
	
	//filter out partial builds
	build_list = build_list.filter(function (ele, index, arr){
		for(var i =0; i < part_type_list_required.length ; i++){
			if (hasPart(ele, part_type_list_required[i]) == false){
				return false;
			}
		}

		return true;
	});
	
	
	/*
	//filter out builds with parts with missing prices
	build_list = build_list.filter(function (ele, index, arr){
		var partsList = ele.parts_list;
		for (var i =0 ; i < partsList.length ; i++){
			if (typeof part_type_list_required.find(function (ele){
					return partsList[i].part_type == ele;
			}) !="undefined"){
				//Is a required part, now check if the price is valid
				if (isFinite(parseInt(partsList[i].part_price)) || isFinite(parseInt(partsList[i].part_price_alt))){}
				else{ return false;}
			}
		}

		return true;
			

	});
	//*/
	
	//narrow the range of PCs by total price 
	build_list = build_list.filter(function (ele, index, arr){
		return (ele.total_price >= min_price) && (ele.total_price <= max_price);
	});
	
	//filter out gpus by performance
	build_list = build_list.filter(function (ele, index, arr){
		return (ele.total_gpu_score >= min_gpu_performance) && (ele.total_gpu_score <= max_gpu_performance);
	});
	
	//filter out cpus by performance
	build_list = build_list.filter(function (ele, index, arr){
		return (ele.total_cpu_score >= min_cpu_performance) && (ele.total_cpu_score <= max_cpu_performance);
	});
	
	//remove builds that have more than MAX gpus
	build_list = build_list.filter(function (ele, index, arr){
		return (ele.total_gpus <= max_gpu_count);
	});
	
	//remove builds that have more than MAX cpus
	build_list = build_list.filter(function (ele, index, arr){
		return (ele.total_cpus <= max_cpu_count);
	});
	
	
	//sort by total price for entry transition
	build_list = build_list.sort(function (a,b){
		
		if (a.total_price < b.total_price){
			//sort in decending (highest to low)
			if (a.total_gpus < b.total_gpus){
				return -1;
			}
			else if (a.total_gpus > b.total_gpus){
				return 1;
			}
			else{
				return 0;
			}
		}
		else if (a.total_price > b.total_price){
			//sort in decending (highest to low)
			if (a.total_gpus < b.total_gpus){
				return -1;
			}
			else if (a.total_gpus > b.total_gpus){
				return 1;
			}
			else{
				return 0;
			}
		}
		return 0;
	});
	
	
	console.log("Total complete & valid PCs in Database: " + build_list.length);

	//==================================================
	//software list data formattting
	
	software_req_list = software_data;
	//set all nulls to zero
	for ( var i= 0; i< software_req_list.length ; i++){
		var d = software_req_list[i];
		software_req_list[i].min_cpu_bench = d.min_cpu_bench == "null" ? 0 : d.min_cpu_bench;
		software_req_list[i].min_gpu_bench = d.min_gpu_bench == "null" ? 0 : d.min_gpu_bench;
		software_req_list[i].rec_cpu_bench = d.rec_cpu_bench == "null" ? 0 : d.rec_cpu_bench;
		software_req_list[i].rec_gpu_bench = d.rec_gpu_bench == "null" ? 0 : d.rec_gpu_bench;

	}
	software_req_list = software_req_list.sort(function(a,b){
		//combine the total score for recommended requirements from both cpu and gpu
		//ignore nulls by setting them to default as zero
		var totalMinScoreA = a.rec_cpu_bench + a.rec_gpu_bench;
		var totalMinScoreB = b.rec_cpu_bench + b.rec_gpu_bench;
		
		//sort in decending (highest to low)
		if (totalMinScoreA < totalMinScoreB){
			return 1;
		}
		else if (totalMinScoreA > totalMinScoreB){
			return -1;
		}
		else{
			return 0;
		}
		
	});
	
	
	console.log("Total software in Database: " + software_req_list.length);
	
}


function setupPage(pc){
	//add pc name title
	$("#build-name-header").text("Build Details: " + pc.name);
	
	//add pc details
	var summaryData = [
		{label: "Name ", val: pc.name},
		{label: "Total price ", val: "$" + pc.total_price},
		{label: "Date published ", val: pc.date_published},
		{label: "PCPartsPicker Blog ", val: "<a href=\""+ pc.buildlink_href + "\" target=\"_blank\">View Blog</a>"}
	];
	
	var summaryList = d3.select("#details-summary").selectAll(".summary-element")
		.data(summaryData)
		.enter()
		.append("div")
			.attr("class", "summary-detail");
		
	summaryList.append("div")
		.attr("class", "summary-detail-label")
		.html(function(d) {
			return d.label;
		});
		
	summaryList.append("div")
		.attr("class", "summary-detail-value")
		.html(function(d) {
			return d.val;
		});
	
	
	
	//add all components except Custom
	var displayList = pc.parts_list;
	
	//priority sort by part type
	
	//assign priorities
	for (var i = 0 ; i< displayList.length ; i++){
		displayList[i].priority = part_type_list.indexOf(displayList[i].part_type);
		displayList[i].priority = displayList[i].priority == -1 ? 10000 : displayList[i].priority;		//put other parts last
		if (displayList[i].part_type == "Custom"){displayList[i].priority = 20000;}						//custom parts very last
	}
	
	displayList = displayList.sort(function(a,b) {
		if (a.priority > b.priority){
			return 1;
		}
		else if (a.priority < b.priority){
			return -1;
		}
		else {
			//same priority, now sort by price
			var priceA = parseFloat(a.part_price);
			var priceB = parseFloat(b.part_price);
			priceA = isFinite(priceA) ? priceA : 0;
			priceB = isFinite(priceB) ? priceB : 0;
			
			if (priceA > priceB){
				return -1;
			}
			else if (priceA < priceB){
				return 1;
			}
			return 0;
		}
	});

	var pcComponents = d3.select("#component-list").selectAll(".component")
		.data(displayList)
		.enter()
		.append("div")
			.attr("class", function(d){
				if (part_type_list.indexOf(d.part_type) == -1){
					return "component component-type-Miscellaneous";
				}
				var type = d.part_type.replace(new RegExp(' ','g'), '-');
				return "component component-type-" + type;
			});
	
	pcComponents.append("div")
		.attr("class", "component-type-label")
		.html(function (d){
			return d.part_type;
		});
		
	pcComponents.append("div")
		.attr("class", "component-price-label")
		.html(function (d){
			return isFinite(parseFloat(d.part_price)) ? ("$" + d.part_price) : "N/A";
		});	
		
	pcComponents.append("div")
		.attr("class", "component-name-label")
		.html(function (d){
			return d.part_name == "null" ? "Null" : "<a href=\"" + d.part_description_href + "\" target=\"_blank\">" + d.part_name + "</a>";
		});
		

		
		
}


function createVis() {
	//get related builds to the selected build
	var relatedBuilds = build_list.sort(function(a,b){
		var aPrice = parseFloat(a.total_price);
		var bPrice = parseFloat(b.total_price);
		if (aPrice < bPrice){
			return -1;
		}
		else if(aPrice > bPrice){
			return 1;
		}
		return 0;
	});
	
	
	var selfIndex = relatedBuilds.findIndex(function(ele, index, arr){
		return ele.build_id == selected_build.build_id;
	});
	
	//collect the nearest 100 builds upp and lower
	relatedBuilds = relatedBuilds.filter(function(ele, index, arr) {
		var minIndex = selfIndex-100;
		var maxIndex = selfIndex+100;
		return (index >= minIndex) && (index<= maxIndex) && (index != selfIndex);
	});
	


	
	createStackedBarChart(selected_build, 0);		//make selected build bar chart

	
	//create stacked bar charts for each related build
	for (var i = 0; i < MAX_RELATED_BUILDS_SHOW ; i++){
		
		var indexStep = relatedBuilds.length / (MAX_RELATED_BUILDS_SHOW +1);
		indexStep *= (i+1);
		indexStep = Math.floor(indexStep);
		createStackedBarChart(relatedBuilds[indexStep], 200 + (i*120));
	}
	
	// recompute the max value for the x and y and size scales
	yScale.domain([0, 100]);
	
	root = d3.select("#graphics");

	
	//start of chart, top left
	root = root.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")"); 

			
	root.selectAll(".dividerLine").data(divisionLines)
		.enter()
		.append("rect")
		.attr("class", function(d){return d.classAttr;})
		.attr("x", function(d){return d.x})
		.attr("y", function(d){return d.y})
		.attr("width", function(d){return d.width})
		.attr("height", function(d){return d.height});
		
		
	//create hover menu
	var hoverMenu = root.selectAll("#graphics").data([{}])
		.enter()
		.append("g")
			.attr("id", "hover-menu-group")
			.attr("transform", "translate(0,0)")
			.attr("visibility", "hidden");
		
	hoverMenu.append("rect")
		.attr("id", "hover-menu-box")
		.attr("x", 0)
		.attr("y", 0)
		.attr("rx", HOVER_MENU_PARAMS.rx)
		.attr("ry", HOVER_MENU_PARAMS.ry)
		.attr("width", HOVER_MENU_PARAMS.width)
		.attr("height", HOVER_MENU_PARAMS.height)
	
	hoverMenu.append("text")
		.attr("id", "hover-menu-text")
		.attr("x", HOVER_MENU_PARAMS.label_padding_left)
		.attr("y", HOVER_MENU_PARAMS.label_spacing_top)
		.html("Percentages: 1000%");
}

function createStackedBarChart(pc, xPos){
	// recompute the max value for the x and y and size scales
	yScale.domain([0, 100]);
	
	root = d3.select("#graphics");

	//start of chart, top left
	root = root.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")"); 

	

		
	root.append("text")
		.attr("class", "stacked-bar-pc-name")
		.attr("x",xPos)
		.attr("y",height + 20)
		.attr("width", barWidth)
		.on("click", function(d){
			window.location.href = "./pc_details.html?build_id=" + pc.build_id;
		})
		.text(pc.name.length <= 10 ? pc.name : pc.name.substring(0,10) + "...")
		.append("title")
			.html(function(d){
				return pc.name;
			});
		
	var barVals = categorizeParts(pc);
	barVals.reverse();

	//compute the y positions for each bar
	var prev = 0;
	for(var i =0; i < barVals.length ; i++){
		var barHeight = (barVals[i].percent/100.0) * height;
		prev = i==0? height: prev;
		var nextY = prev-barHeight;
		prev = nextY;
		
		barVals[i].barYPos = nextY;
		barVals[i].barHeight = barHeight;
	}

	//create each pc build
	var stackedBar = root.selectAll(".pc").data(barVals)
		.enter()
		.append("g")
			.attr("class", "pc-part-bar")
			.attr("transform", function(d, i) {
				
				return ret = "translate(" +
					xPos + "," + 
					d.barYPos + ")";
			});
			
		
	stackedBar.append("rect")
		.attr("width", barWidth)
		.attr("height", function(d,i){
			return d.barHeight;
		})
		.attr("class", function(d,i){
			var type = d.part_type.replace(new RegExp(' ','g'), '-');
			return "stack-bar bar-part-type-" + type;
		})
		.on("mouseenter", function(d){
			showHoverMenu(d.part_type + ": " + parseFloat(d.percent).toFixed(2) + "%", 
			xPos + (barWidth * 0.60), 
			d.barYPos + (d.barHeight/2) + HOVER_MENU_PARAMS.height);
		})
		.on("mouseleave", function(d){
			hideHoverMenu();
		});

	
	//add the price label
	root.append("text")
		.attr("class", "stacked-bar-pc-price")
		.attr("x",xPos + 13)
		.attr("y",prev-5)
		.attr("width", barWidth)
		.text("$" + pc.total_price)

	//=======================================
	//create software runnable piechart	
	
	//compute how many software that can be runned by this build
	var pieData = [
		{id: "none", val: 0},
		{id: "min", val: 0},
		{id: "rec", val: 0}
	];

	for (var i = 0 ; i < software_req_list.length; i++){
		var software = software_req_list[i];

		if ((pc.total_cpu_score >= software.rec_cpu_bench) && (pc.total_gpu_score >= software.rec_gpu_bench)){
			pieData[2].val++;
		}
		else if ((pc.total_cpu_score >= software.min_cpu_bench) && (pc.total_gpu_score >= software.min_gpu_bench)){
			pieData[1].val++;
		}
		else{
			pieData[0].val++;
		}
	}
	pieData.softwareCount = software_req_list.length;
	
	
	//now create the associated pie chart
	//Mike Bostock's Pie Chart, adapted for use here
	//https://bl.ocks.org/mbostock/3887235
	var pieWidth = 100;
	var pieHeight = 100;
	var radius = Math.min(pieWidth, pieHeight) / 2;		
		
	var pieXPos = xPos + radius;
	var pieYPos = height + radius + 50;

	var arc = d3.svg.arc()
		.outerRadius(radius - 10)
		.innerRadius(0);

	var labelArc = d3.svg.arc()
		.outerRadius(radius - 40)
		.innerRadius(radius - 40);
		
	var pie = d3.layout.pie()
		.sort(null)
		.value(function(d) { return d.val; });
		
	var g = root.selectAll(".arc")
		.data(pie(pieData))
		.enter()
		.append("g")
			.attr("transform", "translate(" + pieXPos + "," + pieYPos + ")")
			.attr("class", "arc");	
		  
		g.append("path")
			.attr("d", arc)
			.attr("class", function(d){
				return "pie-section-" + d.data.id;
			})
			.on("mouseenter", function(d){
				showHoverMenu(d.data.id + ": " + (100* parseFloat(d.data.val/pieData.softwareCount).toFixed(2)) + "%", 
				pieXPos + radius, pieYPos)
			})
			.on("mouseleave", function(d){
				hideHoverMenu();
			});

		g.append("text")
			.attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
			.attr("dy", ".35em")
			.text(function(d) { return d.data.age; });	
			
			
}

function hideHoverMenu(){
	$("#hover-menu-group").attr("visibility", "hidden");
}

function showHoverMenu(showText, x, y){
	
	$("#hover-menu-group").attr("transform", "translate(" + (x + HOVER_MENU_PARAMS.mouse_offset_x)+ "," + (y - HOVER_MENU_PARAMS.mouse_offset_y - HOVER_MENU_PARAMS.height) + ")");
	
	//add text, resize box
	$("#hover-menu-text").html(showText);
	$("#hover-menu-box").attr("width", showText.length * 6.5);
	
	$("#hover-menu-group").attr("visibility", "visible");

}

function updateVis() {
	// recompute the max value for the x and y and size scales
	yScale.domain([0, 100]);




	// update the scales for the x and y axes
	xAxis.scale(xScale);
	yAxis.scale(yScale);
	
	// redraw the axis, ticks, and labels
	root.select(".xAxis").call(xAxis)
		.select(".label").text(X_AXIS_LABEL);
	root.select(".yAxis").call(yAxis)
		.select(".label").text(Y_AXIS_LABEL);
		
	//first run of the visualization is now done
	if (firstRun === true){
		firstRun = false;
	}
}



function createButtons() {

	
}



//=======================================================
//pc parts helper functions

function categorizeParts(pc){

	var partsNormalized = [];
	var parts_list = pc.parts_list;
	
	
	//rig the sorting process
	for (var i =0 ; i< part_type_list.length ; i++){	
		partsNormalized.push({part_type: part_type_list[i], total_price: 0.0});
	}
	
	//accumulate all part prices by type category
	for (var i =0 ; i< parts_list.length ; i++){
		
		var exists = partsNormalized.find(function(ele, index, arr){
			return ele.part_type == parts_list[i].part_type;
		});
		
		
		var price = parseInt(parts_list[i].part_price);
		var price_alt = parseInt(parts_list[i].part_price_alt);
		price_alt = isFinite(price_alt) ? price_alt : 0.0;
		price = isFinite(price) ? price : price_alt;
		
		
		if (typeof exists ==="undefined"){
			//undefined, add to other category
			partsNormalized[partsNormalized.length-1].total_price+= price;
		}
		else{
			//exists, increase price
			exists.total_price += price
		}
	}
	
	//normalize all parts to percentage of total price
	for(var i = 0 ; i < partsNormalized.length ; i++){
		partsNormalized[i].percent = partsNormalized[i].total_price / pc.total_price;
		partsNormalized[i].percent *= 100.0;
	}
	
	return partsNormalized;
}


//checks if an a build has a particular part type
function hasPart(build, part_type){
	var part = build.parts_list.find(function(ele){
		return ele.part_type === part_type;
	});
	
	return !(typeof part === "undefined");
}

function getGPUCount(build){
	var gpuList = build.parts_list.filter(function(ele){
		return ele.part_type === "Video Card";
	});
	return gpuList.length;
}
