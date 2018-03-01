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

//item bar initial config
var itemSlots = ["advanced-circuit", "boiler", "", "", "",
    "", "", "", "", "",
    "", "", "", "", "",
    "", "", "", "", "steam-engine", ];
var SLOT_SIZE = 40;             //pixels
var SLOT_MARGINS = 3;
var SLOT_OFFSET_TOP = 10;
var SLOT_OFFSET_LEFT = 10;

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

        selectedRecipes = Object.keys(recipes);
        shuffle(selectedRecipes);
        selectedRecipes = selectedRecipes.slice(0,4);

        initInventoryMenu();

        console.log("Recipes Loaded");
        updateVis();
    });


    //setup click events
    d3.select("#reverse").on("click", updateVis);
    d3.select("#spread").on("click", updateVis);
    d3.select("#reset").on("click", updateVis)

    //initalize the item bar
    d3.select("#item-bar").append("svg").selectAll(".item-slot")
        .data(itemSlots)
        .enter()
            .append("rect")
            .attr("class", "item-slot")
            .attr("width", SLOT_SIZE)
            .attr("height", SLOT_SIZE)
            .attr("x", function(d, i){
                return (i % 10)* (SLOT_SIZE + SLOT_MARGINS) + SLOT_OFFSET_LEFT;
            })
            .attr("y", function(d, i){
                return (Math.floor(i / 10) * (SLOT_SIZE + SLOT_MARGINS))+ SLOT_OFFSET_TOP;
            })
            .attr("value", function(d){
                return d;
            })
            .on("click", function(e){
                console.log(e);
                showInventory();
                if (e.length <= 0){
                    return;
                }
            });



}

function initInventoryMenu(){

    var logistics = [
        ["wooden-chest", "iron-chest", "steel-chest"],
        ["transport-belt"]
    ];
    var production = [
        ["iron-axe"],
        ["boiler"]
    ];
    var intermediateProducts = [
        ["raw-wood"],
        ["wood"]
    ];
    var combat = [
        ["pistol"],
        ["firearm-magazine"],
        ["grenade", "cluster-grenade"]
    ];

    var categoryImagesPath = "images/category"
    var inventoryCategories = [
        {"name": "Logistics", "img": "logistics.png", "list": logistics},
        {"name": "Production", "img": "production.png", "list": production},
        {"name": "Intermediate Products", "img": "intermediate_products.png", "list": intermediateProducts},
        {"name": "Combat", "img": "combat.png", "list": combat},
    ];



    var inventoryRoot = d3.select("#inventory");

    //prepare categories
    var categoryRoot = inventoryRoot.selectAll(".category")
        .data(inventoryCategories)
        .enter()
        .append("div")
        .attr("class", "category");

    categoryRoot.append("img")
            .attr("src", function(d){
                return categoryImagesPath + "/" + d.img;
            });

    //for each category, prepare each row
    var itemRows = categoryRoot.selectAll(".item-row").append("div")
        .data(function(d){
            return d.list;
        })
        .enter()
        .append("div")
        .attr("class", "item-row");

    //for each row, prepare the item itself.
    itemRows.selectAll(".item")
        .data(function(d){
            return d;
        })
        .enter()
        .append("div")
        .attr("class", "item")
        .text(function(d){
            return recipes[d].name;
        })

}

function showInventory(){
    $("#inventory-overlay").show();
}

function closeInventory(){
    $("#inventory-overlay").hide();
}


function getItemBarSelected(){
    var selectedList = $(".item-slot").map(function(){return $(this).attr("value");}).get();

    var hasItemList = [];
    for (var i = 0 ; i < selectedList.length ; i++){
        if(selectedList[i].length > 0){
            hasItemList.push(selectedList[i]);
        }
    }

    return hasItemList;
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
    var selectedRecipes = getItemBarSelected();
    console.log("Loading recipes: " + selectedRecipes);
    var sankeyData = recipesToSankey(selectedRecipes);
    iterations = 16 * sankeyData.nodes.length;


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



function recipesToSankey(recipeList) {

    var recipeSankey = {
        "nodes" : [],
        "links" : []
    };

    //get links and nodes for the supplied recipe list
    for (var i = 0; i < recipeList.length; i++) {

        currentRecipeSankey = recipeToSankeyRecurse(recipeList[i], 1, 0);
        recipeSankey.nodes = recipeSankey.nodes.concat(currentRecipeSankey.nodes);
        recipeSankey.links = recipeSankey.links.concat(currentRecipeSankey.links);
    }


    //build a set of the nodes
    var nodeSetIds = new Set([]);
    for (var i = 0; i < recipeSankey.nodes.length; i++) {
        nodeSetIds.add(recipeSankey.nodes[i].name)
    }


    //hashmap each item in the set
    var nodeIndicies = {};
    var nodeListIds = Array.from(nodeSetIds);
    var nodeListNames = [];
    for (var i = 0; i < nodeListIds.length; i++) {
        nodeIndicies[nodeListIds[i]] = i;

        //count total amounts
        var totalAmount = 0;
        for (var j = 0; j < recipeSankey.nodes.length ; j++){
            if (recipeSankey.nodes[j].name == nodeListIds[i]){
                totalAmount += recipeSankey.nodes[j].amount;
            }
        }

        nodeListNames.push({"name": recipes[nodeListIds[i]].name + ": " + totalAmount});

    }

    //add amounts for each node


    //assign set to sankey node list
    recipeSankey.nodes = nodeListNames;


    //turn all link targets and sources into indicies
    for (var i = 0; i < recipeSankey.links.length; i++) {
        recipeSankey.links[i].source = nodeIndicies[recipeSankey.links[i].source];
        recipeSankey.links[i].target = nodeIndicies[recipeSankey.links[i].target];

        //swap target and source order
        if (startWithPrimatives == true) {
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

    ret.nodes.push({"name" : recipeItem.id, "amount" : amount});

    //recurse
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


/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
}

