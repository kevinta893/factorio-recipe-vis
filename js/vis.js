//Factorio Recipe Vis
//Uses D3's Sankey char implementation
//Source from User wvengen: https://bl.ocks.org/wvengen/2a71af9df0a0655a470d



var chart = null;
timer = null;

//Config
var recipeData = "./js/data/recipies.js"
var nodeWidth = 40;
var nodePadding = 20;
var iterations = 32;
var spread = true;


d3.selectAll(".controls input").on("change", updateKnobs);
d3.select("#source").on("change", updateSource);
d3.select("#type").on("change", updateType);
d3.select("#rewind").on("click", function() {
	numberControl("iterations", 0);
})
d3.select("#play").on("click", function() {
	if (timer !== null) {
	  clearInterval(timer); timer = null;
	} else {
	  timer = setInterval(function() {
		numberControl("iterations", numberControl("iterations") + 1);
		return true;
	  }, 200);
	}
	d3.select(this).classed("active", timer !== null);
})


function updateKnobs() {
	chart
	  .nodeWidth(numberControl("nodeWidth"))
	  .nodePadding(numberControl("nodePadding"))
	  .iterations(numberControl("iterations"))
	  .spread(checkControl("spread"));
}


function updateSource() {
	d3.json(d3.select("#source").node().value, function(error, json) {
	  chart.draw(json);
	});
}


function updateType() {
	var type = d3.select("#type").node().value;
	d3.select("#chart svg").remove();
	chart = d3.select("#chart").append("svg").chart(type);
	["click", "mouseover", "mouseout"].forEach(function(evt) {
		chart.on("node:"+evt, function(node) { logEvent("node:"+evt, node.name); });
		chart.on("link:"+evt, function(link) { logEvent("link:"+evt, link.source.name+" → "+link.target.name); });
	});
	updateKnobs();
	updateSource();
}

function numberControl(id, value) {
	var o = d3.select("#"+id);
	if (typeof value !== "undefined") {
	  o.node().value = String(value);
	  updateKnobs();
	}
	return Number(o.node().value);
}

function checkControl(id, value) {
	var o = d3.select("#"+id);
	if (typeof value !== "undefined") {
	  o.node().checked = value;
	  updateKnobs();
	}
	return o.node().checked;
}

function logEvent(name, s) {
	var e = d3.select("#events"),
		l = e.append("div");
	l.append("span").text(name);
	l.append("span").text(s);
	e.node().scrollTop = e.node().scrollHeight;
}

updateType();