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
var reverseTree = false;
var showOres = false;
var stopItems = [				// items to stop recursing at to avoid redundant paths (e.g. iron-plate -> iron-ore)
	"iron-plate",
	"iron-gear-wheel",
	"copper-plate",
	"steel-plate"
];


//item bar initial config
var initItemSlots = [{id: "electronic-circuit", amount: 1},{id: "iron-gear-wheel", amount: 1}, {id: "assembling-machine-1", amount: 1}, {id: "", amount: 0},{id: "", amount: 0},
    {id: "", amount: 0},{id: "", amount: 0},{id: "", amount: 0},{id: "", amount: 0},{id: "", amount: 0}];
var itemSlots;
var itemCursor;

//keyboard hold downs
var isKeyDown = {};

//visualization runtime vars
var nodeSnapWidth = -1;


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
        for (var i = 0 ; i < initItemSlots.length ; i++){
            if (initItemSlots[i].id != ""){
                itemSlots.setItemSlot(i, initItemSlots[i].id, 1);
            }
        }

        initInventoryMenu();

        console.log("Recipes database loaded");
        updateVis();
    });


    //setup key events
    document.onkeydown = keyDown_Event;
    document.onkeyup = keyUp_Event;

    //setup click events
    d3.select("#reverse").on("click", updateVis);
    d3.select("#spread").on("click", updateVis);
    d3.select("#reset").on("click", updateVis)
    d3.select("#show-ores").on("click", updateVis);


    //initalize the item bar on vis
    itemSlots = new ItemBar("#item-bar-vis", 10, initItemSlots);

    //add initial items to the item bar
    for (var i = 0; i < initItemSlots.length; i++){
        var initItem = initItemSlots[i];
        itemSlots.setItemSlot(i, initItem.id, initItem.amount);
    }

    //setup the click event for all slot elements
    var itemSlotElements = itemSlots.getAllSlots();
    for (var i = 0 ; i < itemSlotElements.length ; i++ ) {
        itemSlotElements[i].element.on("click", function (e) {
            showInventory();
            var itemSlotIndex = parseInt($(this).attr("index"));
            var slotItem = itemSlots.getItemInSlot(itemSlotIndex);

            if (slotItem.id != "" && slotItem.id.length > 0) {
                //there's an item in the slot, add to cursor
                var itemAmount = slotItem.amount;
                itemCursor.setItem(slotItem.id, slotItem.amount);
                itemSlots.clearItemSlot(itemSlotIndex);
            }
        });
    }


    //inventory close event
    $("#inventory-background").on("click", closeInventory);




    //setup item cursor
    itemCursor = new ItemCursor();
    //setup cursor events
    itemCursor.element().on("click", function(e){
        var mouseX = e.pageX;
        var mouseY = e.pageY;

        //case 1, hovering over an item bar item slot
        //find the overlapping slot in the item bar
        var slotOverlapped;
        var itemSlotsOverlapList = itemSlots.getAllSlotElements();
        for (var i = 0 ; i < itemSlotsOverlapList.length ; i++){
            var itemSlot = itemSlotsOverlapList[i];
            if (pointOverlap(mouseX, mouseY, itemSlot)){
                slotOverlapped = itemSlot;
                break;
            }
        }

        //if there is a slot being hovered over, then attach item to the item slot
        if (slotOverlapped != null){
            //dropped on top of an item slot. we add to that item slot
            var cursorItemId = itemCursor.getItemId();
            var cursorAmount = itemCursor.getItemCount();
            var itemSlotIndex = parseInt(slotOverlapped.attr("index"));
            var itemInSlot = itemSlots.getItemInSlot(itemSlotIndex);

            if (itemInSlot.id != "" && itemInSlot.id != cursorItemId){
                //cursor has item, item bar has item, swap their contents
                swapItemBarWithCursor(itemSlotIndex);
                return;
            } else if (itemInSlot.id == cursorItemId){
                //cursor and item slot are both the same item, add together the amounts, clear cursor
                itemSlots.setItemSlot(itemSlotIndex, itemInSlot.id, itemInSlot.amount + cursorAmount);
                itemCursor.clearItem();
                return;
            } else{
                //empty slot otherwise
                itemSlots.setItemSlot(itemSlotIndex, cursorItemId, cursorAmount);
                itemCursor.clearItem();
                itemSlot.removeClass("hover");
                return;
            }
        }


        //case 2, hovering over top its own item slot
        var itemOriginal = $("#inventory-"+itemCursor.getItemId());
        var overlap = pointOverlap(mouseX, mouseY, itemOriginal);
        if (overlap){
            //clicked on own item slot, so increment the current amount
            itemOriginal.addClass("hover");

            //if shift, add 5
            if (isKeyDown.Shift){
                itemCursor.incrementItemCount(5);
            }else{
                itemCursor.incrementItemCount(1);
            }

            return;
        }


        //case 3, clicking anywhere else clears the cursor
        itemCursor.clearItem();
        return;
    });

    $(document).on("mousemove", function(e){
        var mouseX = e.pageX;
        var mouseY = e.pageY;

        var width = itemCursor.getWidth();
        var height = itemCursor.getHeight();

        var maxX = $(document).width() - width + (width/2);
        var maxY = $(document).height() - height + (height/2) -3;        //note that the height grows to fit, hence constant

        var minX = 0;
        var minY = 0;

        //clamp the position to within the page
        var x = Math.min(maxX, mouseX);
        var y = Math.min(maxY, mouseY);
        x = Math.max(minX, x);
        y = Math.max(minY, y);

        itemCursor.element().css({
            left: x-(width/2),
            top: y-(height/2),
            cursor: "none"
        });

        //anytime an item overlaps an itemslot, do the hover event
        if (itemCursor.isVisible()){
            //check if the cursor overlaps an item slot
            var itemSlotsOverlapList = itemSlots.getAllSlotElements();
            for (var i = 0 ; i < itemSlotsOverlapList.length ; i++){
                var itemSlot = itemSlotsOverlapList[i];
                if (pointOverlap(mouseX, mouseY, itemSlot)){
                    itemSlot.addClass("hover");
                } else{
                    itemSlot.removeClass("hover");
                }
            }



            //also check if the item hovers itself on the item list
            var itemOriginal = $("#inventory-"+itemCursor.getItemId());
            var overlap = pointOverlap(mouseX, mouseY, itemOriginal);
            if (overlap){
                itemOriginal.addClass("hover");
            }else{
                itemOriginal.removeClass("hover");
            }
        }
    });


    itemCursor.clearItem();




}

function swapItemBarWithCursor(itemBarIndex){
    var itemInSlot = itemSlots.getItemInSlot(itemBarIndex);
    var itemInCursor = {
        id:     itemCursor.getItemId(),
        amount: itemCursor.getItemCount()
    };

    itemCursor.clearItem();
    itemCursor.setItem( itemInSlot.id, itemInSlot.amount);
    itemSlots.clearItemSlot(itemBarIndex);
    itemSlots.setItemSlot(itemBarIndex, itemInCursor.id, itemInCursor.amount);
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
        ["raw-wood","coal","stone","iron-ore","copper-ore","uranium-ore","raw-fish"],
        ["crude-oil","heavy-oil","light-oil","lubricant","petroleum-gas","sulfuric-acid","water","steam"],
        ["wood","iron-plate","copper-plate","solid-fuel","steel-plate","plastic-bar","sulfur","battery","explosives","uranium-processing"],
        ["copper-cable","iron-stick","iron-gear-wheel","empty-barrel","electronic-circuit","advanced-circuit","processing-unit","engine-unit","electric-engine-unit","flying-robot-frame"],
        ["satellite","rocket-part","rocket-control-unit","low-density-structure","rocket-fuel"],
        ["nuclear-fuel","uranium-235","uranium-238","uranium-fuel-cell","used-up-uranium-fuel-cell","nuclear-fuel-reprocessing","kovarex-enrichment-process"],
        ["science-pack-1","science-pack-2","science-pack-3","military-science-pack","production-science-pack","high-tech-science-pack","space-science-pack"]
    ];
    var combat = [
        ["pistol","submachine-gun","shotgun","combat-shotgun","rocket-launcher","flamethrower","land-mine"],
        ["firearm-magazine","piercing-rounds-magazine","uranium-rounds-magazine","shotgun-shells","piercing-shotgun-shells","cannon-shell","explosive-cannon-shell","uranium-cannon-shell","explosive-uranium-cannon-shell","artillery-shell","rocket","explosive-rocket","atomic-bomb","flamethrower-ammo"],
        ["grenade","cluster-grenade","poison-capsule","slowdown-capsule","defender-capsule","distractor-capsule","destroyer-capsule","discharge-defense-remote","artillery-targeting-remote"],
        ["light-armor","heavy-armor","modular-armor","power-armor","power-armor-mk2"],
        ["portable-solar-panel","portable-fusion-reactor","energy-shield","energy-shield-mk2","battery-mk1","battery-mk2","personal-laser-defense","discharge-defense","exoskeleton","personal-roboport","personal-roboport-mk2","nightvision"],
        ["stone-wall","gate","gun-turret","laser-turret","flamethrower-turret","artillery-turret","radar","rocket-silo"]
    ];

    var inventoryCategories = [
        {"name": "Logistics", "id" : "logistics", "img": "logistics.png", "list": logistics},
        {"name": "Production","id" : "production",  "img": "production.png", "list": production},
        {"name": "Intermediate Products", "id" : "intermediate-products",  "img": "intermediate_products.png", "list": intermediateProducts},
        {"name": "Combat", "id" : "combat", "img": "combat.png", "list": combat},
    ];




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
            return itemCategoryIconLocation + "/" + d.img;
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
        .attr("id", function(d){
            return "inventory-"+ d;
        })
            .append("img")
            .attr("src", function(d){
                return itemIconLocation + "/" + recipes[d].id + ".png";
            })
            .on("click", function (d) {
                var itemId = d;
                //if we are already holding an item, add one
                if (itemCursor.getItemId() == itemId){
                    //if either the shift keys are down, instead add 5 units
                    if (isKeyDown.Shift){
                        console.log("??? Not supposed to be here");
                    }
                } else if (itemCursor.getItemId() == "") {
                    //nothing, attach to cursor
                    if(isKeyDown.Shift){
                        //shift is held, add 5 at a time
                        itemCursor.setItem(itemId, 5);
                    } else {
                        //regular click made, add one
                        itemCursor.setItem(itemId, 1);
                    }
                }
            })
        .on("mouseover", function(d){
            //hover, activate info panel
            setItemInfo(d);
        })
        .on("mouseleave", function(d){
            clearItemInfo();
        });


    //hide all but the first category
    $(".category-items").hide();
    $("#cat-" + inventoryCategories[0].name.toLowerCase()).show();
}

function setItemInfo(itemId){
    var recipe = recipes[itemId];

    $("#info-item-name").text(recipe.name);
    $("#info-item-img").attr("src", itemIconLocation + "/" + recipe.id + ".png");
    $("#info-item-wiki").attr("href", recipe.wiki_link);
}

function clearItemInfo(){
    $("#info-item-name").text("Select an item");
    $("#info-item-img").attr("src", itemIconLocation + "/" + "null" + ".png");
    $("#info-item-wiki").removeAttr("href");
}

function showInventory(){
    $("#inventory-overlay").show();
}

function closeInventory(){
    $("#inventory-overlay").hide();
    updateVis();
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
    var selectedRecipes = itemSlots.getFilledSlots();
    console.log("Loading recipes: ");
    console.log(selectedRecipes);
	
	if (selectedRecipes.length <= 0){
		//no recipes selected, notify on the chart
		var chartElem = $("#chart svg");
		var width = chartElem.width();
		var height = chartElem.height();


		var informationText = d3.select("#chart").select("svg").append("text")
			.text("Add some recipes to the item bar");

        var textWidth = informationText.node().getComputedTextLength();
        var textHeight = informationText.node().getBBox().height;
		informationText
			.attr("x", (width/2) - (textWidth/2))
			.attr("y", (height/2) - (textHeight/2))
			.attr("font-size", 20);
		return;
	}
	
	//we have some recipes, so compute the vis nodes and links
    var sankeyData = recipesToSankey(selectedRecipes);
    iterations = 16 * sankeyData.nodes.length;


    //update chart
    chart
        .nodeWidth(nodeWidth)
        .nodePadding(nodePadding)
        .iterations(iterations)
        .spread(spread);
    chart.draw(sankeyData);


    //chart has now been drawn, modify by adding "bells and whistles"

    //add icons with numbers and tooltips

    //remove default node text
    d3.selectAll(".node text")
        .attr("visibility", "hidden");

    //add icons for each
    var nodeGroup = d3.selectAll(".node");
    nodeGroup.append("image")
        .attr("href", function(d){
            return d.image;
        })
        .attr("width", function(d){
            var rectDimensions = d3.select(this.parentNode).select("rect").node().getBBox();
            return rectDimensions.width-8;
        })
        .attr("height", function(d){
            var rectDimensions = d3.select(this.parentNode).select("rect").node().getBBox();
            return rectDimensions.width-8;
        })
        .attr("x", function(d) {
            var rectDimensions = d3.select(this.parentNode).select("rect").node().getBBox();
            var iconDimensions = d3.select(this).node().getBBox();
            var rectWidth = rectDimensions.width;
            var imageWidth = iconDimensions.width;
            return (rectWidth /2) - (imageWidth /2);
        })
        .attr("y", function(d){
            var rectDimensions = d3.select(this.parentNode).select("rect").node().getBBox();
            var iconDimensions = d3.select(this).node().getBBox();
            var rectHeight = rectDimensions.height;
            var imageHeight = iconDimensions.height;
            return (rectHeight /2) - (imageHeight /2);
        });

    //add text for each icon
    nodeGroup.append("text")
        .attr("class", "item-icon-text")
        .text(function(d){
            return factorioNumbering(d.amount);
        })
        .attr("x", function(d) {
            var imageDimensions = d3.select(this.parentNode).select("image").node().getBBox();
            return imageDimensions.x + imageDimensions.width;
        })
        .attr("y", function(d){
            var imageDimensions = d3.select(this.parentNode).select("image").node().getBBox();
            return imageDimensions.y + imageDimensions.height -2;
        });

    //add tooltip for each node
    nodeGroup.append("title")
        .text(function(d){
            return d.name + ": " + d.amount;
        });

	//find the distance between all columns
    var minX = 1000000;
    $(".node").each(function(i, obj){
        var transform = $(obj).attr("transform");
        var prefix = "translate(";
        transform = transform.slice(transform.indexOf(prefix)+prefix.length, transform.length);
        transform = transform.substr(0, transform.indexOf(','));

        var nodeX = parseFloat(transform);
        if (nodeX < minX && nodeX > 0){
            minX = nodeX;
        }
    });
    nodeSnapWidth = minX;

    //add events for each node
    var nodes = d3.selectAll(".node")
        .call(d3.behavior.drag()
        .origin(function(d) { return d; })
        .on("dragstart", function() {
            this.parentNode.appendChild(this); })
        .on("drag", dragmove));
}


function dragmove(d) {

    var chartElem = $("#chart svg");
    var width = chartElem.width();
    var height = chartElem.height();
    var nodeWidth = parseFloat(d3.select(this).select("rect").attr("width"));

    //get mouse position inside chart
    var mousePos = d3.mouse(this);
    var mouseX = mousePos[0];
    var mouseY = mousePos[1];

    //allow deadzone while dragging left or right
    var deadZone = ((((nodeSnapWidth/2) -(mouseX % nodeSnapWidth) + (nodeWidth/2)) / nodeSnapWidth)- 0.5) * -1;
    var column = Math.floor(d.x / nodeSnapWidth);
    column = deadZone < -0.5 ? column - 1 : column;
    column = deadZone > 0.5 ? column + 1 : column;

    //clamp the column position to the chart's width
    var columnPos = column * nodeSnapWidth;
    maxWidth = Math.floor(width/nodeSnapWidth)*nodeSnapWidth;
    columnPos = Math.min(maxWidth, columnPos);
    columnPos = Math.max(0, columnPos);
    d3.select(this)
        .transition()
        .ease("expOut")
        .duration(0)
        .attr("transform", "translate(" + (
            //d.x
            d.x = columnPos
        ) + "," + (
            d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
        ) + ")");

    chart.d3.sankey.relayout();

    d3.selectAll(".link").attr("d", chart.d3.sankey.link());
}

//Gets the page's UI control data
function getControls(){
    reverseTree = $("#reverse").is(":checked");
    spread = $("#spread").is(":checked");
    showOres = $("#show-ores").is(":checked");
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

        currentRecipeSankey = recipeToSankeyRecurse(recipeList[i].id, recipeList[i].amount, 0);
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

        nodeListNames.push({"name": recipes[nodeListIds[i]].name, "image": "images/" + recipes[nodeListIds[i]].id + ".png", amount: totalAmount});

    }


    //assign set to sankey node list
    recipeSankey.nodes = nodeListNames;


    //turn all link targets and sources into indicies
    for (var i = 0; i < recipeSankey.links.length; i++) {
        recipeSankey.links[i].source = nodeIndicies[recipeSankey.links[i].source];
        recipeSankey.links[i].target = nodeIndicies[recipeSankey.links[i].target];

        //swap target and source order
        if (reverseTree == true) {
            var temp = recipeSankey.links[i].source
            recipeSankey.links[i].source = recipeSankey.links[i].target;
            recipeSankey.links[i].target = temp;
        }
    }

    /*
    //inject arbitrary number of columns
    var extraColumns = 7;
    var firstIndex = recipeSankey.nodes.length;
    for (var i =0 ; i < extraColumns ; i++){
        recipeSankey.nodes.push({"name": ""})
    }

    //inject arbitrary number of columns
    for (var i =0 ; i < extraColumns-1 ; i++){
        recipeSankey.links.push({"source": firstIndex + i , "target": firstIndex + (i + 1), "value": 1});
    }
    */


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
    if (recipeItem.type == "Resource" || recipeItem.type == "Liquid" || (showOres == false && stopItems.indexOf(recipeItem.id) >=0) || (showOres == true && recipeItem.type == "Resource")){
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
 * Converts a number into a shorter form using
 * k for thousand
 * m for million
 * b for billion
 * etc
 * @param number
 */
function factorioNumbering(number){

    //infinite when number is -1
    if (number < 0){
        return '\u221E'
    }

    //normal
    if(number < 1000){
        return number;
    }

    //thousand
    if(number < 1000000){
        return Number.parseFloat(number/1000).toFixed(0) + "k";
    }

    //million
    if (number < 1000000000){
        return Number.parseFloat(number/1000000).toFixed(0) + "m";
    }

    //billion
    if (number < 1000000000000){
        return Number.parseFloat(number/1000000000).toFixed(0) + "b";
    }

    return number;
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


function keyDown_Event(e){
    isKeyDown[e.key] = true;
}

function keyUp_Event(e){
    isKeyDown[e.key] = false;
}
