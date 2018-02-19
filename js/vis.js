//Factorio Recipe Vis
//Uses D3's Sankey char implementation
//Source from User wvengen: https://bl.ocks.org/wvengen/2a71af9df0a0655a470d



var chart = null;
timer = null;

//Visualization Config
var nodeWidth = 40;
var nodePadding = 20;
var iterations = 32;
var spread = false;
var chartType = "Sankey.Path"
var startWithPrimatives = false;


//
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
    updateVis();
});

d3.select("#reverse").on("click", updateVis);
/*
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
*/


// Updates the visualization parameters and redraws the vis
function updateVis() {

	getControls();

	//update the sankey type
    d3.select("#chart svg").remove();
    chart = d3.select("#chart").append("svg").chart(chartType);
    ["click", "mouseover", "mouseout"].forEach(function(evt) {
        chart.on("node:"+evt, function(node) { logEvent("node:"+evt, node.name); });
        chart.on("link:"+evt, function(link) { logEvent("link:"+evt, link.source.name+" → "+link.target.name); });
    });

    //update knobs
    chart
		.nodeWidth(nodeWidth)
		.nodePadding(nodePadding)
		.iterations(iterations)
		.spread(spread);

	//update recipe data
	updateRecipe(currentRecipe);
}

//Gets the page's UI control data
function getControls(){
    startWithPrimatives = d3.select("#reverse").node().checked;
}

//logs chart error events
function logEvent(name, s) {
	var e = d3.select("#events"),
		l = e.append("div");
	l.append("span").text(name);
	l.append("span").text(s);
	//e.node().scrollTop = e.node().scrollHeight;
}





function updateRecipe(recipeId){
	//recursively convert a recipe into data that the visualization engine can handle
	console.log("Loading recipe: " + recipes[recipeId].name);
	var sankeyData = recipeToSankey(recipeId);
    chart.draw(sankeyData);
}

function recipeToSankey(recipeId){

	var recipeSankey = recipeToSankeyRecurse(recipeId, 0);



    //build a set of the nodes
    var nodeSetIds = new Set([]);
	for (var i  = 0; i < recipeSankey.nodes.length ; i++){
        nodeSetIds.add(recipeSankey.nodes[i].name)
	}


    //hashmap each item in the set
    var nodeIndicies = {};
    var nodeListIds = Array.from(nodeSetIds);
    var nodeListNames = [];
    for (var i  = 0; i < nodeListIds.length ; i++) {
        nodeIndicies[nodeListIds[i]] = i;
        nodeListNames.push({"name" : recipes[nodeListIds[i]].name});
    }


    //assign set to sankey node list
	recipeSankey.nodes = nodeListNames;


    //turn all link targets and sources into indicies
	for (var i  = 0; i < recipeSankey.links.length ; i++) {
        recipeSankey.links[i].source = nodeIndicies[recipeSankey.links[i].source];
        recipeSankey.links[i].target = nodeIndicies[recipeSankey.links[i].target];

        //swap target and source order
        if (startWithPrimatives == true)
        {
        	var temp = recipeSankey.links[i].source
            recipeSankey.links[i].source = recipeSankey.links[i].target;
            recipeSankey.links[i].target = temp;
		}
    }

	return recipeSankey;
}

function recipeToSankeyRecurse(recipeId, level){
    var ret = {
        "nodes" : [],
        "links" : []
    }

    var recipeItem = recipes[recipeId];

    ret.nodes.push({"name" : recipeItem.id});

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
            var deeperRecipe = recipeToSankeyRecurse(recipePart.id, level + 1);
            ret.nodes = ret.nodes.concat(deeperRecipe.nodes);
            ret.links = ret.links.concat(deeperRecipe.links);
        }

        return ret;
	}


}

