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

function waterfall(div, resources, fltr) {
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
        for (var n = entries.length -1; n >= 0; n--) {
            if (fltr && entries[n].hasOwnProperty("initiatorType")) {
                if (fltr.indexOf("fltr_") === 0) {
                    // this is a type filter
                    var fltrType = fltr.replace("fltr_", "");
                    if (entryFilter(entries[n], fltrType) !== (fltrType !== 'oth')) {
                        entries.splice(n, 1);
                        continue;
                    } else if (fltrType === 'oth' && entries[n].mimeType !== 'other') {
                        entries.splice(n, 1);
                        continue;
                    }
                } else {
                    // must be a text filter
                    if (entries[n].uri.indexOf(fltr) < 0) {
                        entries.splice(n, 1);
                        continue;
                    }
                }
            }
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
            kibana = window.kibana_host+"/app/kibana#/dashboard/"+window.kibana_rename+"-Resources?_g=(time:" +
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

        var timings = Array.from(resources);

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
            ? strOut = str.substring(0, length * (leftCut)) + " ... " + str.slice(-length * (rightCut))
            : strOut = str;
    }
    return strOut;
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

function entryFilter(entry, fltrType) {
    var result = false;
    switch (fltrType) {
        case "xhr":
            if (entry.mimeType.toLowerCase() === 'xhr' || entry.initiatorType === "xmlhttprequest") {
                result = true;
            }
            break;
        case "js":
            if (entry.mimeType.toLowerCase() === "application/javascript" || entry.mimeType.toLowerCase() === "text/javascript") {
                result = true;
            }
            break;
        case "css":
            if (entry.mimeType.toLowerCase() === "text/css") {
                result = true;
            }
            break;
        case "img":
            if (entry.mimeType.indexOf("image/") === 0) {
                result = true;
            }
            break;
        case "med":
            if (entry.mimeType.indexOf("audio/") === 0 || entry.mimeType.indexOf("video/") === 0) {
                result = true;
            }
            break;
        case "fnt":
            if (entry.mimeType.indexOf("font/") === 0 || entry.mimeType.indexOf("application/font") === 0) {
                result = true;
            }
            break;
        default:
            result = false
    }
    return result;
};

function waterfallTable(div, resources, fltr) {
    $('#info').css('visibility', '');
    $('#filter').css('visibility', '');
    $(div).empty();
    var tbl_header = '<thead><tr>';
    tbl_header += '<th>#</th>';
    tbl_header += '<th>Resource</th>';
    tbl_header += '<th>Content-type</th>';
    tbl_header += '<th>Request Start</th>';
    tbl_header += '<th>Duration</th>';
    tbl_header += '<th>DNS Lookup</th>';
    tbl_header += '<th>TCP connect</th>';
    tbl_header += '<th>SSL time</th>';
    tbl_header += '<th>TTFB</th>';
    tbl_header += '<th>Content Download</th>';
    tbl_header += '<th>Bytes Downloaded</th></tr></thead>';
    $(div).append(tbl_header + '<tbody>');
    var onload = 0;

    for (var n = 0; n < resources.length; n++) {
        var entry = resources[n];
        if (fltr && entry.hasOwnProperty("initiatorType")) {
            if (fltr.indexOf("fltr_") === 0) {
                // this is a type filter
                var fltrType = fltr.replace("fltr_", "");
                if (this.entryFilter(entry, fltrType) !== (fltrType !== 'oth')) {
                    continue;
                } else if (fltrType === 'oth' && entry.mimeType !== 'other') {
                    continue;
                }
            } else {
                // must be a text filter
                if (entry.uri.indexOf(fltr) < 0) {
                    continue;
                }
            }
        }
        if (typeof entry === 'object' && !entry.hasOwnProperty("status")) {
            // This entry is from the 'resources' data
            if ("loadEventStart" in entry) {
                // Add value to the top table
                onload = entry.loadEventStart;
                $('#info tbody>tr:nth-child(2)>td:nth-child(8)').text(onload).css('color', 'blue');
            }
            //Create row for the main table
            var tbl_row = '<tr id="row_' + n + '">';

            //Check if the resource started before/after onload
            var beforeOnload = '';
            if (entry.start < onload) {
                beforeOnload += ' degrade';
            } else {
                beforeOnload += ' improve';
            }

            //Check if TAO opt-in is necessary (this is the case when responseStart is 0)
            //See also: https://github.com/w3c/resource-timing/issues/42#issuecomment-206508028
            //If this is the case, there will be no transferSize - we can use that cell to mention TAO!
            if (entry.responseStart === 0) {
                transferSize = 'TAO opt-in missing';
            } else if (entry.type === 'navtiming') {
                //Check if resource loaded from cache
                //We're passed the TAO check - if transferSize is still 0, the resource loaded from cache!
                var transferSize = '-';
            } else {
                //Check if resource loaded from cache
                //We're passed the TAO check - if transferSize is still 0, the resource loaded from cache!
                var transferSize = ("transferSize" in entry && entry.transferSize > 0) ? (entry.transferSize / 1000).toFixed(1) + ' KB' : 'cache';
            }

            tbl_row += '<td class="static' + beforeOnload + '" align="center">' + n + '</td>';
            var uri = entry.uri || entry.url;

            if (entry.type === 'navtiming') {
                uri = entry.dl;
                var link = window.kibana_host + "/app/kibana#/dashboard/" + window.kibana_rename + "-Dashboard?_g=(time:(from:now-7d,mode:quick,to:now))&_a=(query:(query_string:(analyze_wildcard:!t,query:"
                link += "'dl:" + encodeURIComponent('"' + uri + '"') + "')))";
            } else {
                var link = window.kibana_host + "/app/kibana#/dashboard/" + window.kibana_rename + "-Resources?_g=(time:(from:now-7d,mode:quick,to:now))&_a=(query:(query_string:(analyze_wildcard:!t,query:"
                link += "'uri:" + encodeURIComponent('"' + uri + '"') + "')))";
            }
            if (uri.length > 65) {
                uri = strShort(uri, 65, 'left');
            }

            tbl_row += '<td class="static' + beforeOnload + '" nowrap><a href="' + link + '" target="_blank">' + uri + '</a></td>';
            tbl_row += '<td class="static' + beforeOnload + '" nowrap>' + (entry.mimeType || 'other') + '</td>';
            tbl_row += '<td class="static' + beforeOnload + '" align="center" nowrap>' + (entry.start / 1000).toFixed(3) + ' s</td>';
            tbl_row += '<td class="static' + beforeOnload + '" align="center" nowrap>' + entry.duration.toFixed(2) + ' ms</td>';
            tbl_row += '<td class="static' + beforeOnload + '" align="center" nowrap>' + entry.dnsDuration.toFixed(2) + ' ms</td>';
            tbl_row += '<td class="static' + beforeOnload + '" align="center" nowrap>' + entry.tcpDuration.toFixed(2) + ' ms</td>';
            tbl_row += '<td class="static' + beforeOnload + '" align="center" nowrap>' + entry.sslDuration.toFixed(2) + ' ms</td>';
            tbl_row += '<td class="static' + beforeOnload + '" align="center" nowrap>' + entry.requestDuration.toFixed(2) + ' ms</td>';
            tbl_row += '<td class="static' + beforeOnload + '" align="center" nowrap>' + entry.responseDuration.toFixed(2) + ' ms</td>';
            tbl_row += '<td class="static' + beforeOnload + '" align="center" nowrap>' + transferSize + '</td>';
            tbl_row += '</tr>';
            $(div + ' tbody').append(tbl_row);
        } else if (entry.hasOwnProperty("status")) {
            // This entry is from the 'test results' data
            $('#title tbody>tr:nth-child(3)>td:nth-child(1)').text(entry.dl);
            $('#title tbody>tr:nth-child(3)>td:nth-child(2)').text(new Date(entry['@timestamp']).toLocaleString());
            $('#title tbody>tr:nth-child(3)>td:nth-child(3)').text(entry.log.team.toUpperCase());
            // Below is for GoDaddy compatibility
            var tester = '-field not used-';
            var target = '-field not used-';
            if ((entry.log.hasOwnProperty('env_tester') || entry.log.hasOwnProperty('platform')) && (entry.log.hasOwnProperty('env_target') || entry.log.hasOwnProperty('environment'))) {
                var tester = ('env_tester' in entry.log) ? entry.log.env_tester.toUpperCase() : entry.log.platform.toUpperCase();
                var target = ('env_target' in entry.log) ? entry.log.env_target.toUpperCase() : entry.log.environment.toUpperCase();
            }
            $('#title tbody>tr:nth-child(3)>td:nth-child(4)').text(tester);
            $('#title tbody>tr:nth-child(3)>td:nth-child(5)').text(target);

            $('#info tbody>tr:nth-child(2)>td:nth-child(1)').text(entry.info.assertMetric || 'n/a');
            $('#info tbody>tr:nth-child(1)>td:nth-child(2)').html('<strong>Measured ' + (entry.info.assertMetric || '') + '</strong>');
            if (entry.assertMetric === 'visualCompleteTime') {
                $('#info tbody>tr:nth-child(2)>td:nth-child(2)').text(entry.perf.visualComplete);
            } else {
                $('#info tbody>tr:nth-child(2)>td:nth-child(2)').text(entry.perf.measured);
            }
            if (entry.perf.baseline > 0) {
                $('#info tbody>tr:nth-child(2)>td:nth-child(3)').text(entry.perf.baseline).css('color', 'darkgreen');
            } else if (entry.info.ranBaseline) {
                $('#info tbody>tr:nth-child(2)>td:nth-child(3)').text('None found').css('color', 'red');
            } else {
                $('#info tbody>tr:nth-child(2)>td:nth-child(3)').text('Didn\'t run').css('color', 'red');
            }
            $('#info tbody>tr:nth-child(2)>td:nth-child(4)').text(entry.perf.threshold).css('color', 'purple');
            var status_color = entry.status.toUpperCase() === 'PASS' ? 'green' : 'red';
            $('#info tbody>tr:nth-child(2)>td:nth-child(5)').text(entry.status.toUpperCase()).css('color', status_color);
            $('#info tbody>tr:nth-child(2)>td:nth-child(6)').text(entry.nav.firstByteTime).css('color', 'lime');
            $('#info tbody>tr:nth-child(2)>td:nth-child(7)').text(entry.nav.domInteractive).css('color', 'orange');
            $('#info tbody>tr:nth-child(2)>td:nth-child(9)').text(entry.perf.visualComplete || 'n/a').css('color', 'red');
        }
    }
    //Sort table
    this.tableSorterSort(div, 0, 0);
};

function drawWaterfall(res_id) {
    // Draw the page here - should be called from 'loadPage'
    // Usually this is where you would make AJAX calls for any dynamic data

    // Grab data from the PERF-API server
    if (typeof window.resources == 'undefined') {
        var tmp_data = {
            "id": res_id
        };
        callApi(tmp_data, 'POST', '/v2/api/cicd/resources', 'json', true, function (err, res) {
            if (err) {
                console.warn('Missing Data', 'No data returned!');
            } else {
                if ("resources" in res && res.resources.length > 0) {
                    window.resources = res.resources
                    window.kibana_host = (res.kibana_port && res.kibana_port !== 80) ? res.kibana_host + ":" + res.kibana_port : res.kibana_host;
                    window.kibana_rename = res.kibana_rename || 'TIMINGS';
                    waterfall('#svg_canvas', res.resources);
                    this.waterfallTable('#tbl_resources', res.resources);
                } else {
                    $('#info').css('visibility', 'hidden');
                    $('#title tbody>tr:nth-child(3)>td:nth-child(1)').text('"Sorry - no resources available for this test!').css('color', 'red');
                }
            }
        });
    } else {
        waterfall('#svg_canvas', window.resources);
        this.waterfallTable('#tbl_resources', window.resources);
    }
};

function createWaterfall() {
    var id = getQueryStringParameterVal('id');
    if (id) {
        drawWaterfall(id);
        $('body').show();
    } else {
        $('#info').css('visibility', 'hidden');
        $('#title tbody>tr:nth-child(3)>td:nth-child(1)').text('No ID specified').css('color', 'red');
    };

    $("[id^=fltr_]").on("click", function () {
        $("[id^=fltr_]").removeClass("btn-info");
        $(this).addClass("btn-info");
        const fltr = (this.id === 'fltr_all') ? '' : this.id;
        waterfall('#svg_canvas', window.resources, fltr);
        waterfallTable('#tbl_resources', window.resources, fltr);
    })

    $("#srch-term").on("change paste keyup", function () {
        const fltr = this.value;
        waterfall('#svg_canvas', window.resources, fltr);
        waterfallTable('#tbl_resources', window.resources, fltr);
    })

    $(window).on('resize', function () {
        drawWaterfall(id);
    });
}
