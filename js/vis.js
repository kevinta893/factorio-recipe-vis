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
var itemSlots = ["electronic-circuit", "boiler", "assembling-machine-1", "", "",
    "", "", "", "", "",
    "", "", "", "", "",
    "", "", "", "", "" ];
var itemSlotsVis = [];
var itemSlotsOverlay = [];
var itemCategoryIconLocation = "images/category/"
var itemIconLocation = "images/";
var itemBlankImage = "blank.png";
var itemCursor;


//recipe database
var recipes;


initVis();


function initVis(){
    $.getJSON("https://kevinta893.github.io/factorio-recipes-json/recipes.min.json", function (json, err){
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

        //setup item bar with the initial items
        for (var i = 0 ; i < itemSlots.length ; i++){
            if (itemSlots[i] != ""){
                setItemBarItem(i, itemSlots[i]);
            }
        }

        initInventoryMenu();

        console.log("Recipes Loaded");
        updateVis();
    });


    //setup click events
    d3.select("#reverse").on("click", updateVis);
    d3.select("#spread").on("click", updateVis);
    d3.select("#reset").on("click", updateVis)

    //initalize the item bar on vis
    d3.select("#item-bar-vis").append("div")
        .attr("class", "item-slot-container")
        .selectAll(".item-slot")
        .data(itemSlots)
        .enter()
            .append("div")
            .attr("id", function(d, i){
                return "item-slot-" + i;
            })
            .attr("index", function(d, i){return i})
            .attr("class", "item-slot")
            .append("img")
            .attr("src", itemIconLocation + itemBlankImage);


    $(".item-slot").on("click", function(e){
        showInventory();
        var itemSlot = $(this);
        var itemSlotIndex = parseInt(itemSlot.attr("index"));
        var slotItemId = itemSlot.attr("item-id");

        if (slotItemId != null){
            //there's an item in the slot
            removeItemBarItem(itemSlotIndex);
            attachItemToCursor(slotItemId);
        }
    });


    //setup inventory bar in the overlay. Clone from main page
    var itemBarVis = $("#item-bar-vis");
    var itemBar = itemBarVis.clone(true).appendTo("#inventory-overlay");
    itemBar.attr("id", "item-bar-overlay");
    itemBar.attr("class", "item-bar");
    $("#item-bar-overlay .item-slot").attr("class", "item-slot-overlay");

    //setup cursor item clicking
    itemCursor = $("#item-cursor");
    itemSlotsVis = [];
    $("#item-bar-vis .item-slot").each(function (i, obj){
        itemSlotsVis.push($(obj));
    });

    itemSlotsOverlay = [];
    $("#item-bar-overlay .item-slot-overlay").each(function (i, obj){
        $(obj).attr("id", "item-slot-overlay-" + i);
        itemSlotsOverlay.push($(obj));
    });

    $(document).on("mousemove", function(e){
        var mouseX = e.pageX;
        var mouseY = e.pageY;

        var width = itemCursor.width();
        var height = itemCursor.height();

        var maxX = $(document).width() - width;
        var maxY = $(document).height() - height;

        var minX = 0;
        var minY = 0;

        //clamp the position to within the page
        var x = Math.min(maxX, mouseX - (width/2));
        var y = Math.min(maxY, mouseY - (height/2));
        x = Math.max(minX, x);
        y = Math.max(minY, y);

        itemCursor.css({
            left: x,
            top: y,
            cursor: "pointer"
        });

        //anytime an item overlaps an itemslot, do the hover event
        if (itemCursor.is(":visible")){
            for (var i = 0 ; i < itemSlotsOverlay.length ; i++){
                var itemSlot = itemSlotsOverlay[i];
                var overlap = pointOverlap(mouseX, mouseY, itemSlot);
                if (overlap){
                    itemSlot.addClass("hover");
                }else{
                    itemSlot.removeClass("hover");
                }

            }
        }

    });

    //Event: detect when item is dropped onto the overlay item bar
    itemCursor.on("click", function(e){
        var mouseX = e.pageX;
        var mouseY = e.pageY;

        var slotOverlapped;
        for (var i = 0 ; i < itemSlotsOverlay.length ; i++){
            var itemSlot = itemSlotsOverlay[i];
            if (pointOverlap(mouseX, mouseY, itemSlot)){
                slotOverlapped = itemSlot;
                break;
            }
        }

        if (slotOverlapped != null){
            //dropped on top of an item slot. we add to that item slot
            var cursorItemValue = itemCursor.attr("item-id");
            var itemSlotIndex = parseInt(slotOverlapped.attr("index"));

            setItemBarItem(itemSlotIndex, cursorItemValue)
            itemSlot.removeClass("hover");
            clearItemCursor();
        } else{
            //not hovering over a slot just clear the cursor instead
            clearItemCursor();
        }
    });
}

function attachItemToCursor(itemId){
    var recipe = recipes[itemId];
    itemCursor.attr("src", itemIconLocation + "/" + recipe.id + ".png");
    itemCursor.attr("item-id", recipe.id)
    itemCursor.show();
}

function clearItemCursor(){
    itemCursor.hide();
    itemCursor.attr("src", "");
    itemCursor.attr("item-id", "")
    itemCursor.css({cursor: "auto"});

}

function setItemBarItem(index, itemId){
    var recipe = recipes[itemId];
    var imgSrc = itemIconLocation + recipe.id + ".png";

    itemSlotsVis[index].find("img").attr("src", imgSrc);
    itemSlotsOverlay[index].find("img").attr("src", imgSrc);

    itemSlotsVis[index].attr("item-id", recipe.id);
    itemSlotsOverlay[index].attr("item-id", recipe.id);

    itemSlots[index] = itemId;
}

function removeItemBarItem(index){
    itemSlotsVis[index].find("img").attr("src", itemIconLocation + itemBlankImage);
    itemSlotsOverlay[index].find("img").attr("src", itemIconLocation + itemBlankImage);
    itemSlotsVis[index].attr("item-id", "");
    itemSlotsOverlay[index].attr("item-id", "");

    itemSlots[index] = "";
}



function initInventoryMenu(){

    var logistics = [
        ["wooden-chest","iron-chest","steel-chest","storage-tank"],
        ["transport-belt","fast-transport-belt","express-transport-belt","underground-belt","fast-underground-belt","express-underground-belt","splitter","fast-splitter","express-splitter"],
        ["burner-inserter","inserter","long-handed-inserter","fast-inserter","filter-inserter","stack-inserter","stack-filter-inserter"],
        ["small-electric-pole","medium-electric-pole","big-electric-pole","substation","pipe","pipe-to-ground","pump"],
        ["rail","train-stop","rail-signal","rail-chain-signal","locomotive","cargo-wagon","fluid-wagon","artillery-wagon","car","tank"],
        ["logistic-robot","construction-robot","active-provider-chest","passive-provider-chest","storage-chest","buffer-chest","requester-chest","roboport"],
        ["lamp","red-wire","green-wire","arithmetic-combinator","decider-combinator","constant-combinator","power-switch","programmable-speaker"],
        ["stone-brick","concrete","hazard-concrete","refined-concrete","refined-hazard-concrete","landfill","cliff-explosives"]
    ];
    var production = [
        ["iron-axe","steel-axe","repair-pack","blueprint","deconstruction-planner","blueprint-book"],
        ["boiler","steam-engine","steam-turbine","solar-panel","accumulator","nuclear-reactor","heat-exchanger","heat-pipe"],
        ["burner-mining-drill","electric-mining-drill","offshore-pump","pumpjack"],
        ["stone-furnace","steel-furnace","electric-furnace"],
        ["assembling-machine-1","assembling-machine-2","assembling-machine-3","oil-refinery","chemical-plant","centrifuge","lab"],
        ["beacon","speed-module","speed-module-2","speed-module-3","efficiency-module","efficiency-module-2","efficiency-module-3","productivity-module","productivity-module-2","productivity-module-3"],

    ];
    var intermediateProducts = [
        ["raw-wood","coal","stone","iron-ore","copper-ore","uranium-ore","raw-fish","crude-oil","heavy-oil","light-oil","lubricant","petroleum-gas","sulfuric-acid","water","steam"],
        ["wood","iron-plate","copper-plate","solid-fuel","steel-plate","plastic-bar","sulfur","battery","explosives","uranium-processing"],
        ["copper-cable","iron-stick","iron-gear-wheel","empty-barrel","electronic-circuit","advanced-circuit","processing-unit","engine-unit","electric-engine-unit","flying-robot-frame","satellite","rocket-part","rocket-control-unit","low-density-structure","rocket-fuel","nuclear-fuel","uranium-235","uranium-238","uranium-fuel-cell","used-up-uranium-fuel-cell","nuclear-fuel-reprocessing","kovarex-enrichment-process"],
        ["science-pack-1","science-pack-2","science-pack-3","military-science-pack","production-science-pack","high-tech-science-pack","space-science-pack"]
    ];
    var combat = [
        ["pistol","submachine-gun","shotgun","combat-shotgun","rocket-launcher","flamethrower","land-mine"],
        ["firearm-magazine","piercing-rounds-magazine","uranium-rounds-magazine","shotgun-shells","piercing-shotgun-shells","cannon-shell","explosive-cannon-shell","uranium-cannon-shell","explosive-uranium-cannon-shell","artillery-shell","rocket","explosive-rocket","atomic-bomb","flamethrower-ammo"],
        ["grenade","cluster-grenade","poison-capsule","slowdown-capsule","defender-capsule","distractor-capsule","destroyer-capsule","discharge-defense-remote","artillery-targeting-remote"],
        ["light-armor","heavy-armor","modular-armor","power-armor","power-armor-mk2","portable-solar-panel","portable-fusion-reactor","energy-shield","energy-shield-mk2","battery-mk1","battery-mk2","personal-laser-defense","discharge-defense","exoskeleton","personal-roboport","personal-roboport-mk2","nightvision"],
        ["stone-wall","gate","gun-turret","laser-turret","flamethrower-turret","artillery-turret","radar","rocket-silo"]
    ];

    var inventoryCategories = [
        {"name": "Logistics", "id" : "logistics", "img": "logistics.png", "list": logistics},
        {"name": "Production","id" : "production",  "img": "production.png", "list": production},
        {"name": "Intermediate Products", "id" : "intermediate-products",  "img": "intermediate_products.png", "list": intermediateProducts},
        {"name": "Combat", "id" : "combat", "img": "combat.png", "list": combat},
    ];

    var imagesPath = "./images"
    var categoryImagesPath = "./images/category";


    var inventoryRoot = d3.select("#inventory");

    //prepare category buttons
    var categoryRoot = inventoryRoot.selectAll(".category")
        .data(inventoryCategories)
        .enter()
        .append("div")
        .attr("class", "category-button");

    //setup category heading
    categoryRoot.append("img")
        .attr("src", function(d){
            return categoryImagesPath + "/" + d.img;
        })
        .on("click", function(d){
            $(".category-items").hide();
            $("#cat-" + d.id).show();
        });

    //for each category, prepare each row
    var categoryItems = inventoryRoot.selectAll(".category-items")
        .data(inventoryCategories)
        .enter()
        .append("div")
        .attr("class", "category-items")
        .attr("id", function (d) {
            return "cat-" + d.id;
        });


    var itemRows = categoryItems.selectAll(".item-row").append("div")
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
        .append("img")
        .attr("src", function(d){
            return imagesPath + "/" + recipes[d].id + ".png";
        })
        .on("click", function (d) {
            attachItemToCursor(d);
        });


    //hide all but the first category
    $(".category-items").hide();
    $("#cat-" + inventoryCategories[0].name.toLowerCase()).show();
}

function showInventory(){
    $("#inventory-overlay").show();

    var itemBarVis = $("#item-bar-vis");
    //reset the item bar's position
    $("#item-bar-overlay").css({
        position : "absolute",
        width: itemBarVis.width(),
        height: itemBarVis.height(),
        left: itemBarVis.offset().left,
        top: itemBarVis.offset().top -16
    });
}

function closeInventory(){
    $("#inventory-overlay").hide();
    updateVis();
}


function getItemBarItems(){
    var selectedList = $(".item-slot").map(function(){return $(this).attr("item-id");}).get();

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
    var selectedRecipes = getItemBarItems();
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


function pointOverlap(x, y, $div1) {
    var x1 = $div1.offset().left;
    var y1 = $div1.offset().top;
    var h1 = $div1.outerHeight(true);
    var w1 = $div1.outerWidth(true);


    if (x < x1 || x > x1 + w1 || y < y1 || y > y1 + h1) return false;
    return true;
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

