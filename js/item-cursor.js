var itemCategoryIconLocation = "./images/category/";
var itemIconLocation = "./images/";
var itemBlankImage = "blank.png";



class ItemCursor{

    constructor(itemIconLocation){
        //fields
        this.itemId = "";
        this.itemCount = 0;

        //document layout vars
        this.cursor = $("#item-cursor");
        this.cursorImage = $("#item-cursor-icon");
        this.cursorText = $("#item-cursor-amount");

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
        $(parentDiv).find(".item-slot").each(function(element){
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
        slotElement.find("div").text(amount);

        slotElement.find("div").text(amount);

        //set amount, recalcuate textbox positioning
        var slotContainer = $("#item-bar-vis .item-slot-container")[0].getBoundingClientRect();
        var referenceSlot = this.itemSlots[0].element[0].getBoundingClientRect();
        var slotDimensions = this.itemSlots[index].element[0].getBoundingClientRect();
        /*
        var slotDimensions = {
            x: referenceSlot.offset().x,
            y: referenceSlot.offset().y,
            width: referenceSlot.width(),
            height: referenceSlot.height()
        };
        */

        var textDimensions = slotElement.find("div")[0].getBoundingClientRect();
        var x = slotDimensions.x - slotContainer.x + slotDimensions.width - textDimensions.width - 5;
        var y = slotDimensions.y - slotContainer.y + slotDimensions.height - textDimensions.height- 2;

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
    parentElement(){ return this.itemSlots}
    slotElement(index){ return this.itemSlots}
    getAllSlotElements(){
        var ret = [];
        for (var i = 0; i < this.itemSlots.length; i++){
            ret.push(this.itemSlots[i].element);
        }

        return ret;
    }

}