//Factorio Recipe Vis
//Uses D3's Sankey char implementation
//Source from User wvengen: https://bl.ocks.org/wvengen/2a71af9df0a0655a470d



var chart = null;
timer = null;

//Config
var nodeWidth = 40;
var nodePadding = 20;
var iterations = 32;
var spread = true;


//local
var currentRecipe = "burner_mining_drill";


//Load the recipes database
var recipes;
$.getJSON("./js/data/recipes.json", function (json, err){
	if (err != "success"){
		console.log("Error cannot load json\n" + err);
		return;
	}

	//parse the list into a hashmap
	var rawList = json;
	recipes = {};
	for (var i = 0 ; i < rawList.length ; i++){
		var recipe = rawList[i];
		recipes[recipe.id] = recipe;
	}
	console.log("Recipes Loaded");
    updateRecipe();
});



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





function updateRecipe(){
	//recursively convert a recipe into data that the visualization engine can handle
	console.log("Loading recipe: " + recipes[currentRecipe].name);
	var sankeyData = recipeToSankey(currentRecipe);
    chart.draw(sankeyData);
}

function recipeToSankey(recipeId){
	var nodeSet = new Set([]);
	var recipeSankey = recipeToSankeyRecurse(recipeId, nodeSet, 0);

	//turn all link targets and sources into indicies

	//hashmap each item in the set
	var nodeList = Array.from(nodeSet);
	var nodeIndicies = {};
	for (var i  = 0; i < nodeList.length ; i++){
        nodeIndicies[nodeList[i]] = i;
	}


	for (var i  = 0; i < recipeSankey.links.length ; i++) {
        recipeSankey.links[i].source = nodeIndicies[recipeSankey.links[i].source];
        recipeSankey.links[i].target = nodeIndicies[recipeSankey.links[i].target];
    }

	return recipeSankey;
}

function recipeToSankeyRecurse(recipeId, nodeSet, level){
    var ret = {
        "nodes" : [],
        "links" : []
    }

    var recipeItem = recipes[recipeId];

    ret.nodes.push({"name" : recipeItem.name});
    nodeSet.add(recipeItem.id);


	if (recipeItem.type == "primative"){
    	return ret;
	}
	else{
    	var recipeItems = recipeItem.recipe0.items;
    	for (var i = 0; i < recipeItems.length ; i++) {
            var recipePart = recipeItems[i];
            ret.links.push({
                "source": recipeId,
                "target": recipePart.id,
                "value": recipePart.amount
            })


            //recurse and combine results
            var deeperRecipe = recipeToSankeyRecurse(recipePart.id, nodeSet, level + 1);
            ret.nodes = ret.nodes.concat(deeperRecipe.nodes);
            ret.links = ret.links.concat(deeperRecipe.links);
        }

        return ret;
	}


}



updateType();
