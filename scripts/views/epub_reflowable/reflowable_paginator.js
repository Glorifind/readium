
Readium.Views.ReflowablePaginator = Backbone.Model.extend({

    initialize: function (options) {
        // make sure we have proper vendor prefixed props for when we need them
    },

    // ------------------------------------------------------------------------------------ //
    //  "PUBLIC" METHODS (THE API)                                                          //
    // ------------------------------------------------------------------------------------ //

    paginateContentDocument : function (readiumBookViewEl, spineDivider, isTwoUp, offsetDir, epubContentDocument, readiumFlowingContent, flowingWrapper, firstPageOffset, currentPages, ppd, currentMargin, fontSize) {

        this.toggleSyntheticLayout(
            readiumBookViewEl, 
            spineDivider, 
            isTwoUp
            );

        var page = this.adjustIframeColumns(
            offsetDir, 
            epubContentDocument, 
            readiumFlowingContent, 
            flowingWrapper, 
            isTwoUp, 
            firstPageOffset, 
            currentPages, 
            ppd, 
            currentMargin
            );

        var numPages = this.setFontSize(
            fontSize, 
            epubContentDocument, 
            isTwoUp
            );

        return [numPages, page];
    },

    // ------------------------------------------------------------------------------------ //
    //  PRIVATE HELPERS                                                                     //
    // ------------------------------------------------------------------------------------ //

    getColumnAxisCssName : function () {
        var columnAxisName = Modernizr.prefixed('columnAxis') || 'columnAxis';
        return this.createCssPropertyName(columnAxisName);
    },

    getColumnGapCssName : function () {
        var columnGapName = Modernizr.prefixed('columnGap') || 'columnGap';
        return this.createCssPropertyName(columnGapName);
    },

    getColumnWidthCssName : function () {
        var columnWidthName = Modernizr.prefixed('columnWidth') || 'columnWidth';
        return this.createCssPropertyName(columnWidthName);
    },

    createCssPropertyName : function (modernizrName) {

        return modernizrName.replace(/([A-Z])/g, function (modernizrName, m1) {  
            return '-' + m1.toLowerCase(); 
        }).replace(/^ms-/,'-ms-');
    },

    // ------------------------------------------------------------------------------------ //
    //  PRIVATE METHODS
    // ------------------------------------------------------------------------------------ //

    // Description: Changes the html to make either 1 or 2 pages visible in their iframes
    toggleSyntheticLayout : function (readiumBookViewEl, spineDivider, isTwoUp) {

        $(readiumBookViewEl).toggleClass("two-up", isTwoUp);
        $(spineDivider).toggle(isTwoUp);
    },

    // Description: calculate the number of pages in the current section,
    //   based on section length : page size ratio
    calcNumPages : function (epubContentDocument, isTwoUp, offsetDir) {

        var body, offset, width, num;
        
        // get a reference to the dom body
        body = epubContentDocument;

        // cache the current offset 
        offset = body.style[offsetDir];

        // set the offset to 0 so that all overflow is part of
        // the scroll width
        body.style[offsetDir] = "0px";

        // grab the scrollwidth => total content width
        width = epubContentDocument.scrollWidth;

        // reset the offset to its original value
        body.style[offsetDir] = offset;

        // perform calculation and return result...
        num = Math.floor( (width + this.gap_width) / (this.gap_width + this.page_width) );

        // in two up mode, always set to an even number of pages
        if( num % 2 === 0 && isTwoUp) {
            //num += 1;
        }
        return num;
    },

    getFrameWidth : function (flowingWrapperWidth, currentMargin, isTwoUp) {

        var width;
        var margin = currentMargin;
        if (margin === 1) {
            isTwoUp ? (width = 0.95) : (width = 0.90);
        }
        else if (margin === 2) {
            isTwoUp ? (width = 0.89) : (width = 0.80);
        }
        else if (margin === 3) {
            isTwoUp ? (width = 0.83) : (width = 0.70); 
        }
        else if (margin === 4) {
            isTwoUp ? (width = 0.77) : (width = 0.60); 
        }
        else {
            isTwoUp ? (width = 0.70) : (width = 0.50); 
        }
        
        return Math.floor( flowingWrapperWidth * width );
    },

    // Rationale: on iOS frames are automatically expanded to fit the content dom
    //   thus we cannot use relative size for the iframe and must set abs 
    //   pixel size
    setFrameSize : function (flowingWrapperWidth, flowingWrapperHeight, readiumFlowingContent, currentMargin, isTwoUp) {

        var width = this.getFrameWidth(flowingWrapperWidth, currentMargin, isTwoUp).toString() + "px";

        var height = flowingWrapperHeight.toString() + "px"; 

        $(readiumFlowingContent).attr("width", width);
        $(readiumFlowingContent).attr("height", height);
        $(readiumFlowingContent).css("width", width);
        $(readiumFlowingContent).css("height", height);
    },

    getBodyColumnCss : function () {
        var css = {};
        css[this.getColumnAxisCssName()] = "horizontal";
        css[this.getColumnGapCssName()] = this.gap_width.toString() + "px";
        css[this.getColumnWidthCssName()] = this.page_width.toString() + "px";
        css["padding"] = "0px";
        css["margin"] = "0px";
        css["position"] = "absolute";
        css["width"] = this.page_width.toString() + "px";
        css["height"] = this.frame_height.toString() + "px";
        return css;
    },

    // Description: This method accounts for the case in which the page-spread-* property is set on the current 
    //   content document. When this property is set, it requires that the first page of content is offset by 1, 
    //   creating a blank page as the first page in a synthetic spread.
    accountForOffset : function (readiumFlowingContent, isTwoUp, firstPageIsOffset, currentPages, ppd) {

        var $reflowableIframe = $(readiumFlowingContent);

        if (isTwoUp) {
            // If the first page is offset, adjust the window to only show one page
            var firstPageIsOffset = firstPageIsOffset;
            var firstPageOffsetValue;

            // Rationale: A current page of [0, 1] indicates that the current display is synthetic, and that 
            //   only the first page should be showing in that display
            var onFirstPage = 
                currentPages[0] === 0 &&
                currentPages[1] === 1 
                ? true : false;

            if (firstPageIsOffset && onFirstPage) {

                if (ppd === "rtl") {

                    firstPageOffset = -(2 * (this.page_width + this.gap_width));
                    $reflowableIframe.css("margin-left", firstPageOffset + "px");
                }
                // Left-to-right pagination
                else {

                    firstPageOffset = this.page_width + (this.gap_width * 2);
                    $reflowableIframe.css("margin-left", firstPageOffset + "px");
                }

                return 1;
            }
            else {

                $reflowableIframe.css("margin-left", "0px");
                return currentPages[0];
            }
        }
        else {

            $reflowableIframe.css("margin-left", "0px");
            return currentPages[0];
        }
    },

    adjustIframeColumns : function (offsetDir, epubContentDocument, readiumFlowingContent, flowingWrapper, isTwoUp, firstPageOffset, currentPages, ppd, currentMargin ) {

        var prop_dir = offsetDir;
        var $frame = $(readiumFlowingContent);
        var page;

        this.setFrameSize($(flowingWrapper).width(), $(flowingWrapper).height(), readiumFlowingContent, currentMargin, isTwoUp);

        this.frame_width = parseInt($frame.width(), 10);
        this.frame_height = parseInt($frame.height(), 10);
        this.gap_width = Math.floor(this.frame_width / 7);
        if (isTwoUp) {
            this.page_width = Math.floor((this.frame_width - this.gap_width) / 2);
        }
        else {
            this.page_width = this.frame_width;
        }

        // it is important for us to make sure there is no padding or
        // margin on the <html> elem, or it will mess with our column code
        $(epubContentDocument).css( this.getBodyColumnCss() );

        page = this.accountForOffset(readiumFlowingContent, isTwoUp, firstPageOffset, currentPages, ppd);
        return page;
    },

    setFontSize : function (fontSize, epubContentDocument, isTwoUp) {

        var size = fontSize / 10;
        $(epubContentDocument).css("font-size", size + "em");

        // the content size has changed so recalc the number of 
        // pages
        return this.calcNumPages(epubContentDocument, isTwoUp);
    }
});