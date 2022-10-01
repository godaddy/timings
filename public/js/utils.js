let editor;
function setCardResult(caller, result) {
  $('.spinner-border').remove();
  const card = $(caller).parents('.card');
  $(card).children('.is-result').addClass('bg-opacity-75');
  $(card).children('.is-result').addClass('text-white');
  if (result) {
    $(card).find('.is-result').removeClass('bg-danger').addClass('bg-success');
    $(card).find('.is-result-pre').removeClass('text-danger').addClass('text-success');
  } else {
    $(card).find('.is-result').removeClass('bg-success').addClass('bg-danger');
    $(card).find('.is-result-pre').removeClass('text-success').addClass('text-danger');
  }
}

function esUpgrade(caller, div, url) {
  const data = callApi(null, 'GET', url, null, true);
  $(div).text(typeof data === 'object'
    ? JSON.stringify(data, null, 2)
    : data);
  setCardResult(caller, data.ok);
  $(caller).siblings().children('button').toggle();
}

function setCardData(caller, div, data) {
  $(div).text(typeof data === 'object'
    ? JSON.stringify(data, null, 2)
    : data);
  setCardResult(caller, data.ok);
  if (data.ok === false) { $(caller).siblings().children('button').toggle() };
}

function getCardData(caller, div, url) {
  if ($(caller).prop('nodeName') === 'BUTTON') {
    // Turn on spinner
    templ = document.createElement('template');
    templ.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>';
    $(caller).prepend(templ.content.childNodes);
  }
  $(div).text('Working on it ...')
  const data = callApi(null, 'GET', `${url}?f=json`, null, true);
  setCardData(caller, div, data);
  return data;
}

function kbImport(caller, div, url) {
  result = getCardData(caller, div, url)
  esInfo.hasKibanaObjects = result.ok
  if (esInfo.hasKibanaObjects) {
    $("#esImport").show();
  }
}

function drawHomeCards(data, subKey, parentKey) {
  if (!parentKey) parentKey = subKey;
  Object.entries(data).map(([key, value]) => {
    if (key === `${parentKey}_version`) {
      // Add card header
      cardHead = document.createElement("div");
      cardHead.className = 'text-white bg-dark rounded-3 p-3 m-3';
      cardHead.innerHTML = `<h2 id="card_header_${parentKey}" class="text-center">${parentKey.toUpperCase()} - v.${value}</h2><hr><div id="card_${parentKey}"></div>`;
      const cards = document.getElementById(`cards`);
      cards.appendChild(cardHead);
    } else {
      if (typeof value === 'object') {    // NESTED OBJECT
        drawHomeCards(value, key, parentKey);
      } else {
        cardKey = document.createElement("div");
        cardKey.className = 'row m-1';
        if (key.toLowerCase().indexOf('link') >= 0) {
          value = decodeURIComponent(value);
          cardKey.innerHTML = `<div class="col-lg-3 text-center mb-1">${key}</div><div class="col-lg-9 text-center mb-1"><a href="${value}" target="_blank">TIMINGS-Dashboard</a></div>`;
        } else {
          cardKey.innerHTML = `<div class="col-lg-3 text-center mb-1">${key}</div><div class="col-lg-9 badge ${(value === false || value.indexOf('[false]') >= 0) ? 'bg-danger' : 'bg-success'} text-white text-center mb-1">${value}</div>`;
        }
        const card = document.getElementById(`card_${parentKey}`);
        card.appendChild(cardKey);
      }
    }
  })
}

function callApi(ajaxData, type, url, dataType, cache, cb) {
  if (type === 'POST') url = `/v2/api/cicd${url}`;
  var result = null;
  if (typeof (cache) != 'boolean') {
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
  var hasCallBack = typeof (cb) === 'function';

  var contentType = "application/x-www-form-urlencoded";
  if (dataType && dataType.toUpperCase() === "JSON") {
    contentType = "application/json"
    ajaxData = (typeof (ajaxData) === 'object')
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
    cache: cache
  })
    .done(function (data) {
      if (hasCallBack) {
        cb(null, data);
      }
      result = data;
    })
    .fail(function (e) {
      if (hasCallBack) {
        cb(e);
      }
      result = { err: true, errorMessage: "ajax 'error' for [" + this.type + "] to [" + this.url + "]\nResponse text: " + e.responseText };
    })
    .always(function () {
      // stop spinner(s)?
    });
  return result;
};

// set json
function setEditor(elem, json) {
  const container = document.getElementById(elem);
  let modes = ['tree', 'text'];
  if ('error' in json || json.editable === false) {
    modes = ['text'];
    $('#saveEditor').prop('disabled', true).hide();
  }
  const options = {
    modes: modes,
    search: true,
    navigationBar: true
  };
  editor = new JSONEditor(container, options);
  editor.set(json);
  if (!('error' in json)) {
    editor.expandAll();
  }
}

// get json
function saveEditor() {
  const json = editor.get();
  callApi(json, 'POST', '/config', 'json', false, (err, data) => {
    if (err) {
      $('#saveResult')
        .removeClass('text-success')
        .addClass('text-danger')
        .text(err.responseJSON?.message || err)
        .show();
    } else {
      $('#saveResult')
        .removeClass('text-danger')
        .addClass('text-success')
        .text('file was saved successfully & server was restarted...')
        .show();
    }
    setTimeout(function () {
      $('#saveResult').fadeOut('slow');
    }, 2000); // <-- time in milliseconds
  })
}

function getLogs(type = 'access') {
  const data = callApi(null, 'GET', `/getlog?log=${type}&f=json`, null, true);
  if (data && data[type]) {
    const output = data[type].map((logEntry) => {
      const entry = JSON.parse(logEntry);
      return entry;
    });
    drawLogsTable(output, 'logviewer');
  }
}

function drawLogsTable(data) {
  const tableBody = document.getElementById('logBody');
  let keyCell;
  Object.entries(data).map(([key, value]) => {
    const tr = tableBody.insertRow();
    keyCell = tr.insertCell();
    keyCell.innerHTML = new Date(value.timestamp).toLocaleString();
    keyCell = tr.insertCell();
    keyCell.innerHTML = value.level.toUpperCase();
    if (value.req && typeof value.req === 'object') {
      if (key === "0") {
        // Add header cells only on first row
        Object.keys(value.req).map((header) => {
          if (header !== 'headers') {
            $('#logHeadRow').append(`<th>${header}</th>`);
          }
        });
      }
      Object.entries(value.req).map(([key, value]) => {
        if (key !== 'headers') {
          keyCell = tr.insertCell();
          keyCell.innerHTML = typeof value === 'object' ? JSON.stringify(value, null, 2) : value;
        }
      });
    } else {
      if (key === "0") {
        $('#logHeadRow').append(`<th>Message</th>`);
      }
      keyCell = tr.insertCell();
      keyCell.innerHTML = value.message;
    }
    if (value.responseTime) {
      if (key === "0") {
        $('#logHeadRow').append(`<th>Response time</th>`);
      }
      keyCell = tr.insertCell();
      keyCell.innerHTML = value.responseTime;
    }
    tableBody.appendChild(tr);
  });
  loadTablesorter();
}

function loadTablesorter() {
  pagerOptions = {
    pageReset: true, // Reset pager to this page after filtering
    container: $(".pager"),
    updateArrows: true,
    savePages: true,
    storageKey: 'tablesorter-pager',
    fixedHeight: true,
    // css class names of pager arrows
    cssNext: '.next', // next page arrow
    cssPrev: '.prev', // previous page arrow
    cssFirst: '.first', // go to first page arrow
    cssLast: '.last', // go to last page arrow
    cssGoto: '.gotoPage', // select dropdown to allow choosing a page
    cssPageDisplay: '.pagedisplay', // location of where the "output" is displayed
    cssPageSize: '.pagesize', // page size selector - select dropdown that sets the "size" option
    // class added to arrows when at the extremes (i.e. prev/first arrows are "disabled" when on the first page)
    cssDisabled: 'disabled', // Note there is no period "." in front of this class name
    cssErrorRow: 'tablesorter-errorRow', // ajax error information row
    page: 0,
    size: 20,
    output: '{startRow} to {endRow} of {filteredRows} total rows'
  }
  $("table").tablesorter({
    sortList: [[0,1]],
    theme: 'blue',
    // this is the default setting
    cssChildRow: "tablesorter-childRow",
    // sortList: [[1, 0]],
    // initialize zebra and filter widgets
    widgets: ["zebra", "filter", "pager"],

    widgetOptions: {
      pager_pageReset: 0,
      filter_columnFilters: true,
      filter_placeholder: { search: 'Search...' },
      filter_saveFilters: false,
      // include child row content while filtering, if true
      filter_childRows: true,
      // class name applied to filter row and each input
      filter_cssFilter: 'tablesorter-filter',
      // search from beginning
      filter_startsWith: false,
      // Set this option to false to make the searches case sensitive
      filter_ignoreCase: true,
      filter_external: '.search',
      filter_reset: '.reset_filter',
      filter_formatter: {
        // Date (two inputs)
        0: function ($cell, indx) {
          return $.tablesorter.filterFormatter.uiDatepicker($cell, indx, {
            // from : '08/01/2013', // default from date
            // to   : '1/18/2014',  // default to date
            textFrom: 'From: ',
            textTo: '\nTo: ',
            changeMonth: true,
            changeYear: true
          });
        }
      }
    },
    headers: {
      99: {
        sorter: false,
        filter: false
      }
    }
  }).tablesorterPager(pagerOptions).toggle();
}