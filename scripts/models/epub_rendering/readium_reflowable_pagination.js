
Readium.Models.ReadiumReflowablePagination = Backbone.Model.extend({ 

    defaults: {
        "num_pages" : 0,
        "current_page" : [1]
    },

    // ------------------------------------------------------------------------------------ //
    //  "PUBLIC" METHODS (THE API)                                                          //
    // ------------------------------------------------------------------------------------ //

    initialize: function () {

        this.epubController = this.get("model");

        // Instantiate an object responsible for deciding which pages to display
        this.pageNumberDisplayLogic = new Readium.Models.ReflowablePageNumberLogic();
        
        // if content reflows and the number of pages in the section changes
        // we need to adjust the the current page
        // Probably a memory leak here, should add a destructor
        this.on("change:num_pages", this.adjustCurrentPage, this);
    },

    // Description: This method determines which page numbers to display when switching
    //   between a single page and side-by-side page views and vice versa.
    toggleTwoUp: function() {

        if (this.epubController.epub.get("can_two_up")) {

            var newPages = this.pageNumberDisplayLogic.getPageNumbersForTwoUp (
                this.epubController.get("two_up"), 
                this.get("current_page"),
                this.epubController.getCurrentSection().firstPageOffset()
                );

            this.set({current_page: newPages});
        }   
    },

    // REFACTORING CANDIDATE: This needs to be investigated, but I bet if the prevPage and nextPage methods were 
    //   called directly (goRight and goLeft were removed), the new page number display logic would account for the 
    //   page progression direction and that all this logic could be simplified in both this model and the 
    //   PageNumberDisplayLogic model
    // 
    // Description: turn pages in the rightward direction
    //   ie progression direction is dependent on 
    //   page progression dir
    goRight: function() {
        if (this.epubController.epub.get("page_prog_dir") === "rtl") {
            this.prevPage();
        }
        else {
            this.nextPage();    
        }
    },

    // Description: Turn pages in the leftward direction
    //   ie progression direction is dependent on 
    //   page progression dir
    goLeft: function() {
        if (this.epubController.epub.get("page_prog_dir") === "rtl") {
            this.nextPage();
        }
        else {
            this.prevPage();    
        }
    },

    goToPage: function(gotoPageNumber) {

        var pagesToGoto = this.pageNumberDisplayLogic.getGotoPageNumsToDisplay(
                            gotoPageNumber,
                            this.epubController.get("two_up"),
                            this.epubController.getCurrentSection().firstPageOffset()
                            );
        this.set("current_page", pagesToGoto);
    },

    // Description: Return true if the pageNum argument is a currently visible 
    //   page. Return false if it is not; which will occur if it cannot be found in 
    //   the array.
    isPageVisible: function(pageNum) {
        return this.get("current_page").indexOf(pageNum) !== -1;
    },

    // REFACTORING CANDIDATE: prevPage and nextPage are public but not sure it should be; it's called from the navwidget and viewer.js.
    //   Additionally the logic in this method, as well as that in nextPage(), could be refactored to more clearly represent that 
    //   multiple different cases involved in switching pages.
    prevPage: function() {

        var previousPage = this.get("current_page")[0] - 1;

        // Single page navigation
        if (!this.epubController.get("two_up")){

            this.set("current_page", [previousPage]);
        }
        // Move to previous page with two side-by-side pages
        else {

            var pagesToDisplay = this.pageNumberDisplayLogic.getPrevPageNumsToDisplay(
                                previousPage
                                );
            this.set("current_page", pagesToDisplay);
        }
    },

    nextPage: function() {

        var curr_pg = this.get("current_page");
        var firstPage = curr_pg[curr_pg.length - 1] + 1;

        // Single page is up
        if (!this.epubController.get("two_up")) {

            this.set("current_page", [firstPage]);
        }
        // Two pages are being displayed
        else {

            var pagesToDisplay = this.pageNumberDisplayLogic.getNextPageNumsToDisplay(
                                firstPage
                                );
            this.set("current_page", pagesToDisplay);
        }
    },

    // ------------------------------------------------------------------------------------ //
    //  "PRIVATE" HELPERS                                                                   //
    // ------------------------------------------------------------------------------------ //

    // REFACTORING CANDIDATE: This method seems to correct the page position if the current page number 
    //   exceeds the number of pages, which should not happen. 
    adjustCurrentPage: function() {
        var cp = this.get("current_page");
        // Removing this appears to cause a problem with backbone, somehow. This method should eventually be removed. 
        Acc.page = '#' + cp;

    },  

    // REFACTORING CANDIDATE: this is strange in that it does not seem to account for 
    //   possibly crossing over a section boundary
    goToLastPage: function() {
        var page = this.get("num_pages");
        this.goToPage(page);
    }
});