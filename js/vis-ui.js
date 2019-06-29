var itemCategoryIconLocation = "./images/category/";
var itemIconLocation = "./images/";
var itemBlankImage = "blank.png";
var itemBlankInfoImage = "blank_question.png"


class ItemCursor{

    constructor(parentDiv){
        this.parentElement = $(parentDiv);

        //fields
        this.itemId = "";
        this.itemCount = 0;

        //document layout vars
        this.cursor = $(parentDiv);
        d3.select(parentDiv).append("img")
            .attr("src", "")
            .attr("class", "item-cursor-icon");

        d3.select(parentDiv).append("div")
            .attr("class", "item-icon-text cursor-icon-text");

        this.cursorImage = this.cursor.find("img");
        this.cursorText = this.cursor.find("div");

    }

    isVisible(){
        return this.cursor.is(":visible");
    }

    setVisible(show){
        show ? this.cursor.show(): this.cursor.hide();
    }

    hasItem(){
        return this.itemId != "";
    }

    setItem(itemId, amount){

        //currently held item is not the same, then change and reset amount
        if (this.itemId != itemId){
            this.clearItem();
        }

        this.itemId = itemId;
        this.itemCount = amount;

        this.cursorImage.attr("src", itemIconLocation + itemId + ".png");
        this.cursorText.text(amount)

        this.setVisible(true);

        this.cursor.css({
            cursor: "none"
        });
    }

    incrementItemCount(amount){
        if (this.hasItem() == false){
            //cursor is currently cleared, do nothing
            return;
        }

        this.itemCount += amount;
        this.setItemCount(this.itemCount);
    }

    setItemCount(amount){
        this.itemCount = amount;
        this.cursorText.text(amount);
    }

    clearItem(){
        this.cursorImage.attr("src", "");
        this.cursorText.text(0);
        this.itemId = "";
        this.itemCount = 0;
        this.cursor.css({cursor: "auto"});
        $(".item").removeClass("hover");                //TODO, this should not be here

        this.setVisible(false);
    }

    getWidth(){ return this.cursor.width(); }
    getHeight(){ return this.cursor.height(); }
    getItemCount(){ return this.itemCount; }
    getItemId(){ return this.itemId; }
    element(){ return this.cursor; }                    //gets the JQuery object of the cursor
}


class ItemBar{

    /* Setup the item bar under a parent div
     * ParentDiv, the div ID to attach the itembar to
     * MaxItems, total number of slots for the item bar
     * InitialItems, a list of item id's and amount's to initialize the item bar with
     */
    constructor(parentDiv, maxItems, initialItems){

        this.parentElement = $(parentDiv);

        //setup slots model
        this.itemSlots = [];
        for (var i = 0; i < maxItems; i++){
            this.itemSlots.push({id: "", amount: 0});
        }

        //add initial items not beyond max
        for (var i = 0; i < initialItems.length && i < maxItems; i++){
            var initItem = initialItems[i];
            this.itemSlots[i] = {id: initItem.id, amount: initItem.amount};
        }


        //setup the visualization
        this.parentElement.attr("class", "item-bar");

        var itemSlotsElement = d3.select(parentDiv).append("div")
            .attr("class", "item-slot-container")
            .selectAll(".item-slot")
                .data(this.itemSlots)
                .enter()
                .append("div")
                .attr("index", function(d, i){return i})
                .attr("class", "item-slot");



        itemSlotsElement.append("img")
            .attr("src", itemIconLocation + itemBlankImage);

        //position the slot item text on the bottom right corner
        var slotContainer = d3.select(".item-slot-container").node().getBoundingClientRect();
        itemSlotsElement.append("div")
            .attr("class", "item-icon-text item-bar-icon-text")
            .text("")
            .attr("style", function (d){
                var slotDimensions = d3.select(this.parentNode).node().getBoundingClientRect();
                var textDimensions = d3.select(this).node().getBoundingClientRect();
                var x = slotDimensions.x - slotContainer.x + slotDimensions.width - textDimensions.width - 5;
                var y = slotDimensions.y - slotContainer.y + slotDimensions.height -  textDimensions.height -2;
                return "left: " + x + "; " +
                    "top: " + y + "; ";
            });


        //add all the html elements for the slots
        var slotElements = [];
        this.parentElement.find(".item-slot").each(function(){
            slotElements.push($(this));
        });

        for (var i = 0 ; i < slotElements.length ; i++){
            this.itemSlots[i].element = slotElements[i];
        }

    }

    setItemSlot(index, itemId, amount){

        if (itemId == ""){
            this.clearItemSlot(index);
            return;
        }

        //update the model
        this.itemSlots[index].id = itemId;
        this.itemSlots[index].amount = amount;

        var imgSrc = itemIconLocation + itemId + ".png";


        //update the view
        var slotElement = this.itemSlots[index].element;

        slotElement.find("img").attr("src", imgSrc);
        slotElement.attr("item-id", itemId);
        slotElement.attr("title", recipes[itemId].name);
        slotElement.find("div").text(amount);


        //set amount, recalcuate textbox positioning
        var itemBarContainer = this.parentElement.find(".item-slot-container")[0].getBoundingClientRect();
        //var referenceSlot = this.itemBar[0].element[0].getBoundingClientRect();
        var slotDimensions = this.itemSlots[index].element[0].getBoundingClientRect();
        var textDimensions = slotElement.find("div")[0].getBoundingClientRect();
        var x = slotDimensions.x - itemBarContainer.x + slotDimensions.width - textDimensions.width - 5;
        var y = slotDimensions.y - itemBarContainer.y + slotDimensions.height - textDimensions.height- 2;

        slotElement.find("div")
            .css({
                left: x,
                top: y
            });
    }

    clearItemSlot(index){

        //update the model
        this.itemSlots[index].id = "";
        this.itemSlots[index].amount = 0;


        //update the view
        var slotElement = this.itemSlots[index].element;

        slotElement.find("img").attr("src", itemIconLocation + itemBlankImage);
        slotElement.attr("item-id", "");
        slotElement.attr("title", "");
        slotElement.find("div").text("");

    }

    getItemInSlot(index){
        return this.itemSlots[index];
    }

    getAllSlots(){
        return this.itemSlots;
    }

    getFilledSlots(){
        var ret = [];
        for (var i = 0; i < this.itemSlots.length; i++){
            if (this.itemSlots[i].id != ""){
                ret.push(this.itemSlots[i]);
            }
        }

        return ret;
    }

    getMaxItems(){ return this.itemSlots.length; }
    getParentElement(){ return this.parentElement; }
    slotElement(index){ return this.itemSlots[i].element;}
    getAllSlotElements(){
        var ret = [];
        for (var i = 0; i < this.itemSlots.length; i++){
            ret.push(this.itemSlots[i].element);
        }

        return ret;
    }

}


class ItemInventory{

    constructor(parentDiv){
        this.parentElement = $(parentDiv);

        //rows of items
        var logistics = [
            ["wooden-chest","iron-chest","steel-chest","storage-tank"],
            ["transport-belt","fast-transport-belt","express-transport-belt","underground-belt","fast-underground-belt","express-underground-belt","splitter","fast-splitter","express-splitter"],
            ["burner-inserter","inserter","long-handed-inserter","fast-inserter","filter-inserter","stack-inserter","stack-filter-inserter"],
            ["small-electric-pole","medium-electric-pole","big-electric-pole","substation","pipe","pipe-to-ground","pump"],
            ["rail","train-stop","rail-signal","rail-chain-signal","locomotive","cargo-wagon","fluid-wagon","artillery-wagon","car","tank"],
            ["logistic-robot","construction-robot","logistic-chest-active-provider","logistic-chest-passive-provider","logistic-chest-storage","logistic-chest-buffer","logistic-chest-requester","roboport"],
            ["lamp","red-wire","green-wire","arithmetic-combinator","decider-combinator","constant-combinator","power-switch","programmable-speaker"],
            ["stone-brick","concrete","hazard-concrete","refined-concrete","refined-hazard-concrete","landfill","cliff-explosives"]
        ];
        var production = [
            ["iron-axe","steel-axe","repair-pack","blueprint","deconstruction-planner","blueprint-book"],
            ["boiler","steam-engine","steam-turbine","solar-panel","accumulator","nuclear-reactor","heat-exchanger","heat-pipe"],
            ["burner-mining-drill","electric-mining-drill","offshore-pump","pumpjack"],
            ["stone-furnace","steel-furnace","electric-furnace"],
            ["assembling-machine-1","assembling-machine-2","assembling-machine-3","oil-refinery","chemical-plant","centrifuge","lab"],
            ["beacon","speed-module","speed-module-2","speed-module-3","effectivity-module","effectivity-module-2","effectivity-module-3","productivity-module","productivity-module-2","productivity-module-3"],

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




        var inventoryRoot = d3.select(parentDiv);

        //prepare category buttons
        var categoryRoot = inventoryRoot.selectAll(".category")
            .data(inventoryCategories)
            .enter()
            .append("div")
            .attr("class", "category-button")
            .attr("category-id", function(d){
                return d.id;
            })
            .attr("category-index", function(d, i){
                return i;
            })
            .attr("title", function(d, i){
                return inventoryCategories[i].name;
            });

        //setup category heading
        categoryRoot.append("img")
            .attr("src", function(d){
                return itemCategoryIconLocation + d.img;
            });


        //for each category, prepare each row
        var categoryItems = inventoryRoot.selectAll(".category-items")
            .data(inventoryCategories)
            .enter()
            .append("div")
            .attr("class", "category-items")
            .attr("category-id", function (d) {
                return d.id;
            })
            .attr("category-index", function(d, i){
                return i;
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
                .attr("item-id", function(d){
                    return d;
                })
                .attr("title", function(d){
                    return recipes[d].name;
                })
                .append("img")
                    .attr("src", function(d){
                        return itemIconLocation + d + ".png";
                    });


        //collect all the items
        var itemElements = [];
        var itemElementsDictionary = {};
        $(parentDiv).find(".item").each(function(){
            var item = $(this);
            var obj = {
                id: item.attr("item-id"),
                element: item
            }
            itemElements.push(obj);
            itemElementsDictionary[obj.id] = obj;
        });
        this.itemElements = itemElements;
        this.itemElementsDictionary = itemElementsDictionary;


        //collect all the category button elements
        var categoryButtonElements = [];
        $(parentDiv).find(".category-button").each(function(){
            var categoryButton = $(this);
            var obj = {
                id: categoryButton.attr("category-id"),
                element: categoryButton
            }
            categoryButtonElements.push(obj);
        });
        this.categoryButtonElements = categoryButtonElements;


        //collect all category elements
        var categoryElements = [];
        $(parentDiv).find(".category-items").each(function(){
            var categoryElement = $(this);
            var obj = {
                id: categoryElement.attr("category-id"),
                element: categoryElement
            }
            categoryElements.push(obj);
        });
        this.categoryElements = categoryElements;


        //default show the first category
        this.showCategory(0);



        //setup events for the category buttons. Click event
        var categoryButtons = this.getAllCategoryButtonElements();
        var categories = this.getAllCategoryElements();
        for (var i = 0 ; i < categoryButtons.length ; i++){
            var buttonElement = categoryButtons[i].element;
            buttonElement.on("click", function (e){
                var categoryIndex = parseInt($(this).attr("category-index"));
                categories.forEach(function (c){
                    c.element.hide();
                });
                categoryButtons.forEach(function (c){
                    c.element.removeClass("selected");
                });


                categories[categoryIndex].element.show();
                categoryButtons[categoryIndex].element.addClass("selected");

            });
        }
    }


    getAllItemElements(){
        return this.itemElements;
    }

    getItemElement(itemId){
        return this.itemElementsDictionary[itemId];
    }

    getAllCategoryElements(){
        return this.categoryElements;
    }

    getAllCategoryButtonElements(){
        return this.categoryButtonElements;
    }



    showCategory(categoryIndex){
        for (var i =0 ; i < this.categoryElements.length ; i++){
            this.categoryElements[i].element.hide();
            this.categoryButtonElements[i].element.removeClass("selected");
        }

        this.categoryElements[categoryIndex].element.show();
        this.categoryButtonElements[categoryIndex].element.addClass("selected");
    }
}



class ItemInfoPanel{

    constructor(parentDiv){
        this.parentElement = $(parentDiv);


        //add header
        var headerContainer = d3.select(parentDiv).append("div");
        headerContainer.append("img")
            .attr("src", itemIconLocation + itemBlankInfoImage)
            .attr("class", "info-item-img");
        headerContainer.append("div")
            .text("Select an item")
            .attr("class", "info-item-name")
			.attr("id", "item-info-name-text");

		//time header
		var timeDiv = d3.select(parentDiv).append("div")
			.attr("class", "item-info-box");
		timeDiv.append("strong")
			.attr("class", "item-info-header")
			.text("Time");
		timeDiv.append("div")
			.attr("class", "item-info-data")
			.attr("id", "item-info-time-text")
			.text("");
			
		//yield header
		var yieldDiv = d3.select(parentDiv).append("div")
			.attr("class", "item-info-header");
		yieldDiv.append("strong")
			.attr("class", "item-info-header")
			.text("Yield");
		yieldDiv.append("div")
			.attr("class", "item-info-data")
			.attr("id", "item-info-yield-text")
			.text("");
		
		//category header
		var categoryDiv = d3.select(parentDiv).append("div")
			.attr("class", "item-info-header");
		categoryDiv.append("strong")
			.attr("class", "item-info-header")
			.text("Category");
		categoryDiv.append("div")
			.attr("class", "item-info-data")
			.attr("id", "item-info-category-text")
			.text("");
		
		//type header
		var typeHeader = d3.select(parentDiv).append("div")
			.attr("class", "item-info-header");
		typeHeader.append("strong")
			.attr("class", "item-info-header")
			.text("Type");
		typeHeader.append("div")
			.attr("class", "item-info-data")
			.attr("id", "item-info-type-text")
			.text("");
			
        //wiki link
        d3.select(parentDiv).append("a")
            .attr("target", "_blank")
			.attr("id", "item-info-wiki-link")
            .attr("class", "item-info-wiki-link")
            .text("\u{1f517}Item Wiki");

		//setup ui widgets for this view
        this.itemImage = this.parentElement.find("div").find("img");
        this.itemNameText = this.parentElement.find("#item-info-name-text");
        this.itemWikiLink = this.parentElement.find("#item-info-wiki-link");
		this.itemTimeText = this.parentElement.find("#item-info-time-text");
		this.itemYieldText = this.parentElement.find("#item-info-yield-text");
		this.itemCategoryText = this.parentElement.find("#item-info-category-text");
		this.itemTypeText = this.parentElement.find("#item-info-type-text");
    }

    showItemInfo(itemId){
        this.itemImage.attr("src", itemIconLocation + itemId + ".png")
        this.itemNameText.text(recipes[itemId].name);
        this.itemWikiLink.attr("href", recipes[itemId].wiki_link);
        this.itemWikiLink.attr("title", recipes[itemId].wiki_link);
		this.itemTimeText.text(recipes[itemId].recipe.time);
		this.itemYieldText.text(recipes[itemId].recipe.yield);
		this.itemCategoryText.text(recipes[itemId].category);
		this.itemTypeText.text(recipes[itemId].type);
    }

    clearItemInfo(){
        this.itemImage.attr("src", itemIconLocation + itemBlankInfoImage)
        this.itemNameText.text("Select an item");
        this.itemWikiLink.removeAttr("href");
        this.itemWikiLink.removeAttr("title")
    }

    getItemIconElement(){
        return this.itemImage;
    }
}