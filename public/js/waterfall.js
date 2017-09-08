/*
 * Uses Resource Timing API to build a page load waterfall
 *
 * Only currently works in IE10, and Chromium nightly builds, has a few issues still to be fixed,
 * contributions welcomed!
 *
 * Feel free to do what you want with it, @andydavies
 *
 * To use, create a bookmark with the script below in, load a page, click the bookmark
 *
 * javascript:(function(){var el=document.createElement('script');el.type='text/javascript';el.src='http://andydavies.me/sandbox/waterfall.js';document.getElementsByTagName('body')[0].appendChild(el);})();
 */

function waterfall(div, resources) {
    $(div).empty();

    var xmlns = "http://www.w3.org/2000/svg";
    var w = window,
        d = document;

    var barColors = {
        blocked: "rgb(204, 204, 204)",
        thirdParty: "rgb(0, 0, 0)",
        redirect: "rgb(255, 221, 0)",
        appCache: "rgb(161, 103, 38)",
        dns: "rgb(48, 150, 158)",
        tcp: "rgb(255, 157, 66)",
        ssl: "rgb(213,102, 223)",
        request: "rgb(64, 255, 64)",
        response: "rgb(52, 150, 255)"
    }

    /**
     * Draw waterfall
     * @param {object[]} entries
     */
    function drawWaterfall(entries) {

        var maxTime = 0;
        for (var n = 0; n < entries.length; n++) {
            if (entries[n].hasOwnProperty("status") && (entries[n].sla_pageLoadTime <= (entries[n].act_pageLoadTime * 2)) ) {
                maxTime = Math.max(maxTime, entries[n].sla_pageLoadTime) + 50;
            } else if (!entries[n].hasOwnProperty("status")) {
                maxTime = Math.max(maxTime, entries[n].start + entries[n].duration) + 50;
            }
        }

        var containerID = div.replace('#', ''),
            container = d.getElementById(containerID)

        var rowHeight = 16;
        var smallRowHeight = rowHeight / 2;
        var smallRowOffset = smallRowHeight / 2;
        var rowPadding = 3;
        var barOffset = 450;

        //calculate size of chart
        // - max time
        // - number of entries
        var width = $(div).width() - 15;
        var height = (entries.length + 1) * (rowHeight + rowPadding); // +1 for axis

        container.width = width;
        container.height = height;

        var svg = createSVG(width, height);

        // scale TO DO - When to switch from seconds to milliseconds ???
        var scaleFactor = maxTime / (width - 5 - barOffset);

        // draw axis
        var interval = (maxTime < 2500)
            ? (100 / scaleFactor)
            : (1000 / scaleFactor);
        var numberOfLines = maxTime / interval;
        var x1 = barOffset,
            y1 = rowHeight + rowPadding,
            y2 = height;

        for (var n = 0; n < numberOfLines; n++) {
            var lineMark = (maxTime < 2500)
                ? n * 100
                : n;
            svg.appendChild(createSVGText(x1, -5, 0, rowHeight, "font: 10px sans-serif;", "middle", lineMark));
            svg.appendChild(createSVGLine(x1, y1, x1, y2, "stroke: #ccc;"));
            x1 += interval;
        }

        // draw resource entries
        var nav_entry = {};
        n = 1;
        entries.forEach( function(entry) {
            if (entry.type === 'navtiming') {
                nav_entry.nav_requestStart = entry.requestStart;
            }
            if ("status" in entry) {
                nav_entry = Object.assign(nav_entry, entry);
                return;
            };

            var row = createSVGGroup("translate(0," + n * (rowHeight + rowPadding) + ")");

            // Created stiped appearance
            if (n % 2) {
                row.appendChild(createSVGRect(5, 0, width, rowHeight+2,"fill: lightGrey;fill-opacity: 0.2;"));
            }

            row.appendChild(createSVGText(6, -4, 0, rowHeight, "font: 11px sans-serif;", "start", "[" + n + "] " + (entry.uri || entry.url)));

            // Add duration to end of bar
            var posDuration = barOffset + ((entry.start + entry.duration) / scaleFactor) + 5;
            row.appendChild(createSVGText(posDuration, -4, 0, rowHeight, "font: 9px sans-serif;", "start", entry.duration.toFixed(2) + ' ms'));

            row.appendChild(drawBar(entry, barOffset, rowHeight, smallRowHeight, smallRowOffset, scaleFactor));

            svg.appendChild(row);
            n++;
        })

        // Draw markers
        if ("status" in nav_entry) {
            drawMarkers(svg, nav_entry, y1, y2, barOffset, rowHeight, smallRowHeight, smallRowOffset, scaleFactor);
        }

        container.appendChild(svg);
    }

    function drawMarkers(svg, entry, y1, y2, barOffset, rowHeight, smallRowHeight, smallRowOffset, scaleFactor) {
        // Add onload marker
        x1 = barOffset + (entry.perf.measured / scaleFactor);
        // svg.appendChild(createSVGText(x1, 20, 5, rowHeight, "font: 11px sans-serif; fill: blue;", "left", 'onLoad'));
        svg.appendChild(createSVGLine(x1, y1, x1, y2, "stroke: blue;stroke-width: 2; stroke-opacity: 0.5;"));
        // Add threshold marker
        x1 = barOffset + (entry.perf.threshold / scaleFactor);
        // svg.appendChild(createSVGText(x1, 40, 5, rowHeight, "font: 11px sans-serif; fill: purple;", "left", 'Threshold'));
        svg.appendChild(createSVGLine(x1, y1, x1, y2, "stroke: purple;stroke-width: 2; stroke-opacity: 0.5;"));

        if (entry.nav.requestStart && entry.nav.firstByteTime) {
            // Add domInteractive marker
            x1 = barOffset + ((entry.nav.requestStart + entry.nav.firstByteTime) / scaleFactor);
            // svg.appendChild(createSVGText(x1, 10, 5, rowHeight, "font: 11px sans-serif; fill: orange;", "left", 'DOM Interactive'));
            svg.appendChild(createSVGLine(x1, y1, x1, y2, "stroke: lime;stroke-width: 2; stroke-opacity: 0.5;"));
        }
        if (entry.nav.domInteractive && entry.nav.domInteractive > 0) {
            // Add domInteractive marker
            x1 = barOffset + (entry.nav.domInteractive / scaleFactor);
            // svg.appendChild(createSVGText(x1, 10, 5, rowHeight, "font: 11px sans-serif; fill: orange;", "left", 'DOM Interactive'));
            svg.appendChild(createSVGLine(x1, y1, x1, y2, "stroke: orange;stroke-width: 2; stroke-opacity: 0.5;"));
        }
        if (entry.perf.baseline > 0) {
            // Add Baseline marker
            x1 = barOffset + (entry.perf.baseline / scaleFactor);
            // svg.appendChild(createSVGText(x1, 30, 5, rowHeight, "font: 11px sans-serif; fill: darkgreen;", "left", 'Baseline'));
            svg.appendChild(createSVGLine(x1, y1, x1, y2, "stroke: darkgreen;stroke-width: 2; stroke-opacity: 0.5;"));
        }
        if (entry.perf.visualComplete > 0) {
            // Add Baseline marker
            x1 = barOffset + (entry.perf.visualComplete / scaleFactor);
            // svg.appendChild(createSVGText(x1, 50, 5, rowHeight, "font: 11px sans-serif; fill: red;", "left", 'Visual Complete'));
            svg.appendChild(createSVGLine(x1, y1, x1, y2, "stroke: red;stroke-width: 2; stroke-opacity: 0.5;"));
        }
    }

    // TODO: Split out row, bar and axis drawing drawAxis drawRow()

    /**
     * Draw bar for resource
     * @param {object} entry Details of URL, and timings for individual resource
     * @param {int} barOffset Offset of the start of the bar along  x axis
     * @param {int} rowHeight
     * @param {double} scaleFactor Factor used to scale down chart elements
     * @returns {element} SVG Group element containing bar
     *
     * TODO: Scale bar using SVG transform? - any accuracy issues?
     */
    function drawBar(entry, barOffset, rowHeight, smallRowHeight, smallRowOffset, scaleFactor) {

        var uri = entry.type === 'navtiming' 
            ? entry.dl
            : (entry.uri || entry.url);
        var bar = createSVGGroup("translate(" + barOffset + ", 0)", uri, entry.type, entry.team);

        // add tooltip
        var title = document.createElementNS(xmlns, "title")

        var tooltipText = "";
        for (var key in entry) {
            var value = entry[key];
            if (typeof value == "object") 
                continue;
            
            // keep tooltip to just non-zero durations.
            if (!key.endsWith('Start') && value.toFixed && typeof value.toFixed === 'function' && value != 0) 
                tooltipText += key + ": " + value.toFixed(1) + "\n";
            }
        title.textContent = tooltipText;

        // title.textContent = JSON.stringify(entry, function (key, value) {     if
        // (typeof value == "object") return value;     // keep tooltip to just non-zero
        // durations.     if (!key.endsWith('Start') && value.toFixed && typeof
        // value.toFixed === 'function' && value != 0)         return value.toFixed(1);
        // }, '  ');
        bar.appendChild(title);

        bar.appendChild(createSVGRect(entry.start / scaleFactor, 4, entry.duration / scaleFactor, (rowHeight - 8), "fill:" + barColors.blocked));

        // TODO: Test for 3rd party and colour appropriately

        if (entry.redirectDuration > 0) {
            bar.appendChild(createSVGRect(entry.redirectStart / scaleFactor, 0, entry.redirectDuration / scaleFactor, rowHeight, "fill:" + barColors.redirect));
        }

        if (entry.appCacheDuration > 0) {
            bar.appendChild(createSVGRect(entry.appCacheStart / scaleFactor, 0, entry.appCacheDuration / scaleFactor, rowHeight, "fill:" + barColors.appCache));
        }

        if (entry.dnsDuration > 0) {
            bar.appendChild(createSVGRect(entry.dnsStart / scaleFactor, smallRowOffset, entry.dnsDuration / scaleFactor, smallRowHeight, "fill:" + barColors.dns));
        }

        if (entry.tcpDuration > 0) {
            bar.appendChild(createSVGRect(entry.tcpStart / scaleFactor, smallRowOffset, entry.tcpDuration / scaleFactor, smallRowHeight, "fill:" + barColors.tcp));
        }

        if (entry.sslDuration > 0) {
            bar.appendChild(createSVGRect(entry.sslStart / scaleFactor, smallRowOffset, entry.sslDuration / scaleFactor, smallRowHeight, "fill:" + barColors.ssl));
        }

        if (entry.requestDuration > 0) {
            bar.appendChild(createSVGRect(entry.requestStart / scaleFactor, 0, entry.requestDuration / scaleFactor, rowHeight, "fill:" + barColors.request));
        }

        if (entry.responseDuration > 0) {
            bar.appendChild(createSVGRect(entry.responseStart / scaleFactor, 0, entry.responseDuration / scaleFactor, rowHeight, "fill:" + barColors.response));
        }

        return bar;
    }

    // drawBarSegment - start, length, height, fill

    /**
     * Shorten URLs over 40 characters
     * @param {string} url URL to be shortened
     * @returns {string} Truncated URL
     *
     * TODO: Remove protocol
     */
    function shortenURL(url) {
        // Strip off any query string and fragment var strippedURL = url.match("[^?#]*")
        // var shorterURL = url;
        if (url.length > 60) {
            url = url.slice(0, 45) + " ... " + url.slice(-25);
        }

        return url;
    }

    /**
     * Create SVG element
     * @param {int} width
     * @param {int} height
     * @returns {element} SVG element
     */
    function createSVG(width, height) {
        var el = d.createElementNS(xmlns, "svg");

        el.setAttribute("width", width);
        el.setAttribute("height", height);

        return el;
    }

    /**
     * Create SVG Group element
     * @param {string} transform SVG tranformation to apply to group element
     * @returns {element} SVG Group element
     */
    function createSVGGroup(transform, uri = "", type = "", team = "") {
        var el = d.createElementNS(xmlns, "g");

        el.setAttribute("transform", transform);

        // mverkerk: add click event listener for bars
        var kibana = "";
        if (uri) {
            if (type === 'navtiming') {
                uri = 'dl:"' + encodeURIComponent(uri) + '"';
            } else {
                uri = 'uri:"' + encodeURIComponent(uri) + '"';
            }
            kibana = "http://"+window.kibana_host+"/app/kibana#/dashboard/CICD-Resources?_g=(time:" +
                    "(from:now-7d,mode:quick,to:now))&_a=(query:(query_string:(analyze_wildcard:!t,qu" +
                    "ery:'" + uri + "')))"

            el.setAttribute("style", "cursor:pointer;");
            el.addEventListener('click', function (e) {
                e.preventDefault();
                //Turn into Lucent filter as needed
                window.open(kibana);
            })
        }

        return el;
    }

    /**
     * Create SVG Rect element
     * @param {int} x
     * @param {int} y
     * @param {int} width
     * @param {int} height
     * @param {string} style
     * @returns {element} SVG Rect element
     */
    function createSVGRect(x, y, width, height, style) {
        var el = d.createElementNS(xmlns, "rect");

        el.setAttribute("x", x);
        el.setAttribute("y", y);
        el.setAttribute("width", width);
        el.setAttribute("height", height);
        el.setAttribute("style", style);
        // el.setAttribute("style", "cursor: pointer;")

        return el;
    }

    /**
     * Create SVG Rect element
     * @param {int} x1
     * @param {int} y1
     * @param {int} x2
     * @param {int} y2
     * @param {string} style
     * @returns {element} SVG Line element
     */
    function createSVGLine(x1, y1, x2, y2, style) {
        var el = d.createElementNS(xmlns, "line");

        el.setAttribute("x1", x1);
        el.setAttribute("y1", y1);
        el.setAttribute("x2", x2);
        el.setAttribute("y2", y2);
        el.setAttribute("style", style);

        return el;
    }

    /**
     * Create SVG Text element
     * @param {int} x
     * @param {int} y
     * @param {int} dx
     * @param {int} dy
     * @param {string} style
     * @param {string} anchor
     * @param {string} text
     * @returns {element} SVG Text element
     */
    function createSVGText(x, y, dx, dy, style, anchor, text) {
        var el = d.createElementNS(xmlns, "text");

        if (typeof text === 'string' && text.indexOf("http") >= 0) {
            // add tooltip for full URL
            var title = document.createElementNS(xmlns, "title")
            title.textContent = text;
            el.appendChild(title);
            text = shortenURL(text);
        }

        el.setAttribute("x", x);
        el.setAttribute("y", y);
        el.setAttribute("dx", dx);
        el.setAttribute("dy", dy);
        el.setAttribute("style", style);
        el.setAttribute("text-anchor", anchor);

        el.appendChild(d.createTextNode(text));

        return el;
    }

    /**
     * Add Events On DOM Elements
     * @param {element} elem
     * @param {event} event
     * @param {function} fn
     * return {EventListener} listener that fires event
     */
    function addEvent(elem, event, fn) {
        if (elem.addEventListener) {
            elem.addEventListener(event, fn, false);
        } else {
            elem
                .attachEvent("on" + event, function () {
                    return (fn.call(elem, w.event));
                });
        }
    }

    // Check for Navigation Timing and Resource Timing APIs

    if (w.performance !== undefined && (w.performance.getEntriesByType !== undefined || w.performance.webkitGetEntriesByType !== undefined)) {

        var timings = resources;

        drawWaterfall(timings);
    } else {
        alert("Resource Timing API not supported");
    }
}

function strShort(str, length, side) {
    // Function will shorten a string with '...' as a filler between the left and
    // right side Example strShort('very very very very long striiiiinnnng', 10,
    // 'right') will be converted to 'very very ... iinnnng'
    //
    // str = string to cut length = length of the string to cut at side = which side
    // to shorten
    var strOut = '';
    if (str) {
        side === 'left'
            ? leftCut = 1 / 5
            : leftCut = 4 / 5;
        side === 'left'
            ? rightCut = 4 / 5
            : rightCut = 1 / 5;
        str.length > length
            ? strOut = str.substr(0, length * (leftCut)) + " ... " + str.slice(-length * (rightCut))
            : strOut = str;
    }
    return strOut;
};

function callAjax(ajaxData, type, url, dataType, cache, cb) {
    var result = null;
    if (typeof(cache) != 'boolean') {
        cache = true;
    }

    $.ajaxSetup({
        error: function (jqXHR, exception, errorThrown) {
            var responseMsg,
                errorMsg = "";
            if (jqXHR.responseText) {
                var msgArray = jqXHR
                    .responseText
                    .replace(/[\r\n]/g, ' ')
                    .match(/<p.*>(.*)<\/p>/);
                if (typeof msgArray === 'array' && msgArray.length() > 0) {
                    //There is a full HTML response message WITH a <p> paragraph in there! Grab it!
                    responseMsg = msgArray[1];
                } else {
                    responseMsg = jqXHR.responseText;
                }
            }
            if (jqXHR.status === 0) {
                errorMsg = 'Not connect.\n Verify Network.';
            } else if (jqXHR.status == 404) {
                errorMsg = 'Requested page not found. [404]';
            } else if (jqXHR.status == 500) {
                errorMsg = 'Internal Server Error [500].';
            } else if (exception === 'parsererror') {
                errorMsg = 'Requested JSON parse failed.';
            } else if (exception === 'timeout') {
                errorMsg = 'Time out error.';
            } else if (exception === 'abort') {
                errorMsg = 'Ajax request aborted.';
            } else {
                errorMsg = 'Uncaught Error.';
            }
            console.warn('Ajax Error', 'Message: ' + errorMsg + '<br>' + responseMsg, 'error');
        },
        timeout: 20000
    });
    var hasCallBack = typeof(cb) === 'function';

    var contentType = "application/x-www-form-urlencoded";
    if (dataType.toUpperCase() === "JSON") {
        contentType = "application/json"
        ajaxData = (typeof(ajaxData) === 'object')
            ? JSON.stringify(ajaxData)
            : ajaxData;
    }

    $.ajax({
        url: url,
        data: ajaxData,
        type: type,
        dataType: dataType,
        contentType: contentType + ";charset=UTF-8",
        async: hasCallBack,
        cache: cache,
        success: function (data) {
            if (hasCallBack) {
                cb(null, data);
            }
            result = data;
        }
    })
        .fail(function (e) {
            console.warn("ajax 'error' for [" + this.type + "] to [" + this.url + "]\nResponse text: " + e.responseText);
        })
    return result;
};

function tableSorterSort(tbl, col, dir, sticky) {
    // Args: tbl = table ID to sort col = column for initial sort (starting at 0)
    // dir = direction of sort (0 = asc, 1 = desc)
    //
    // Return: sortOption variable downloadJSDynamic('/js/jquery.tablesorter.min.js,
    // /js/jquery.tablesorter.widgets.min.js', callbackJSLoad); function
    // callbackJSLoad() {
    typeof(col) !== 'number'
        ? sortCol = ''
        : sortCol = col;
    typeof(dir) !== 'number'
        ? sortDir = ''
        : sortDir = dir;
    // get the parent table for Sticky headers
    var stickyElem = $(tbl)
        .parent()
        .prop('id');
    var sortOptions = {
        sortList: [
            [sortCol, sortDir]
        ],
        theme: 'blue',
        widgets: [
            "zebra", "stickyHeaders", "filter", "columnSelector"
        ],
        widgetOptions: {
            // filter_anyMatch replaced! Instead use the filter_external option Set to use a
            // jQuery selector (or jQuery object) pointing to the external filter (column
            // specific or any match)
            filter_external: '.search',
            // add a default type search to the first name column
            filter_defaultFilter: {
                1: '~{query}'
            },
            // include column filters
            filter_columnFilters: false,
            filter_placeholder: {
                search: 'Type your search here ...'
            },
            filter_saveFilters: true,
            filter_reset: '.reset'
        }
    };
    var sortOptions2 = {
        widgetOptions: {
            // extra class name added to the sticky header row
            stickyHeaders: '',
            // number or jquery selector targeting the position:fixed element
            stickyHeaders_offset: 0,
            // added to table ID, if it exists
            stickyHeaders_cloneId: '-sticky',
            // trigger "resize" event on headers
            stickyHeaders_addResizeEvent: true,
            // if false and a caption exist, it won't be included in the sticky header
            stickyHeaders_includeCaption: true,
            // The zIndex of the stickyHeaders, allows the user to adjust this to their
            // needs
            stickyHeaders_zIndex: 2,
            // jQuery selector or object to attach sticky header to
            stickyHeaders_attachTo: $('#' + stickyElem),
            // jQuery selector or object to monitor horizontal scroll position (defaults:
            // xScroll > attachTo > window)
            stickyHeaders_xScroll: $('#' + stickyElem),
            // jQuery selector or object to monitor vertical scroll position (defaults:
            // yScroll > attachTo > window)
            stickyHeaders_yScroll: $('#' + stickyElem),
            // scroll table top into view after filtering
            stickyHeaders_filteredToTop: true
        }
    };
    if (sticky === 0) {
        $(tbl).tablesorter(sortOptions);
    } else {
        $(tbl).tablesorter($.extend(true, sortOptions, sortOptions2));
    }
    $(tbl).trigger("updateAll");
    //}
};

function getQueryStringParameterVal(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
};
