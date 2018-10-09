class ItemCursor{

    constructor(itemIconLocation){
        //fields
        this.itemId = "";
        this.itemCount = 0;
        this.ITEM_ICON_LOCATION = itemIconLocation;

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

        this.cursorImage.attr("src", this.ITEM_ICON_LOCATION + itemId + ".png");
        this.cursorText.text(amount)

        this.setVisible(true);
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