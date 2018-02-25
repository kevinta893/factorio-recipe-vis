//Factorio Recipe Vis
//Uses D3's Sankey char implementation
//Source from User wvengen: https://bl.ocks.org/wvengen/2a71af9df0a0655a470d



var chart = null;
timer = null;

//Visualization Config
var nodeWidth = 40;
var nodePadding = 20;
var iterations = 32;
var spread = true;
var chartType = "Sankey"
var startWithPrimatives = false;


var currentRecipe = "rocket-silo";

//recipe database
var recipes;


initVis();


function initVis(){

    $.getJSON("https://kevinta893.github.io/factorio-recipes-json/recipes.json", function (json, err){
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
    d3.select("#spread").on("click", updateVis);
    d3.select("#reset").on("click", updateVis)
}



// Updates the visualization parameters and redraws the vis
function updateVis() {

    //fetch UI data
    getControls();

    //update the sankey type
    d3.select("#chart svg").remove();
    chart = d3.select("#chart").append("svg").chart(chartType);
    ["click", "mouseover", "mouseout"].forEach(function(evt) {
        chart.on("node:"+evt, function(node) { logEvent("node:"+evt, node.name); });
        chart.on("link:"+evt, function(link) { logEvent("link:"+evt, link.source.name+" → "+link.target.name); });
    });



	//update recipe data
    console.log("Loading recipe: " + recipes[currentRecipe].name);
    var sankeyData = recipeToSankey(currentRecipe);
    iterations = 200 * sankeyData.nodes.length;


    //update chart
    chart
        .nodeWidth(nodeWidth)
        .nodePadding(nodePadding)
        .iterations(iterations)
        .spread(spread);
    chart.draw(sankeyData);

    //add events for each node
    var nodes = d3.selectAll(".node")
        .call(d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", function() {
            this.parentNode.appendChild(this); })
        .on("drag", dragmove));
}


function dragmove(d) {
    var width = $("#chart svg").width();
    var height = $("#chart svg").height();
    d3.select(this).attr("transform",
        "translate(" + (
            d.x
            //d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))
        ) + "," + (
            d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
        ) + ")");
    chart.d3.sankey.relayout();
    d3.selectAll(".link").attr("d", chart.d3.sankey.link());
}
//Gets the page's UI control data
function getControls(){
    startWithPrimatives = d3.select("#reverse").node().checked;
    spread = d3.select("#spread").node().checked;
}

//logs chart error events
function logEvent(name, s) {
	var e = d3.select("#events"),
		l = e.append("div");
	l.append("span").text(name);
	l.append("span").text(s);
	//e.node().scrollTop = e.node().scrollHeight;
}


function recipeToSankey(recipeId){

	var recipeSankey = recipeToSankeyRecurse(recipeId, 1, 0);



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

function recipeToSankeyRecurse(recipeId, amount, level){
    var ret = {
        "nodes" : [],
        "links" : [],
        "amount" : 0
    }

    var recipeItem = recipes[recipeId];

    ret.nodes.push({"name" : recipeItem.id});
    if (recipeItem.type == "Resource" || recipeItem.type == "Liquid"){
        ret.amount = amount;
        return ret;
    }
    else{
        var recipeIngredients = recipeItem.recipe.ingredients;
        for (var i = 0; i < recipeIngredients.length ; i++) {
            var recipePart = recipeIngredients[i];



            //recurse and combine results
            var deeperRecipe = recipeToSankeyRecurse(recipePart.id, recipePart.amount * amount, level + 1);
            ret.nodes = ret.nodes.concat(deeperRecipe.nodes);
            ret.links = ret.links.concat(deeperRecipe.links);
            ret.amount += deeperRecipe.amount;

            ret.links.push({
                "source": recipeId,
                "target": recipePart.id,
                "value": deeperRecipe.amount
            })
        }

        return ret;
    }


}

