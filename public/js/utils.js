let editor;
function setCardResult(caller, result) {
  $('.spinner-border').remove();
  const card = $(caller).parent('.card');
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
  const data = callApi(null, 'GET', url, null, false);
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
  const data = callApi(null, 'GET', url);
  setCardData(caller, div, data);
  return data;
}

function kbImport(caller, div, url) {
  result = getCardData(caller, div, url)
  esInfo.hasKibanaItems = result.ok
  $("#esImport").toggle(esInfo.hasKibanaItems && esInfo.templateVersion);
}

function drawHomeCards(data, parentKey) {
  Object.entries(data).map(([key, value]) => {
    if (key === `${parentKey}_version`) {
      // Add version to card header
      $('#card_header_' + parentKey).text(`${$('#card_header_' + parentKey).text()} - v.${value}`)
    } else {
      if (typeof value === 'object') {    // NESTED OBJECT
        drawHomeCards(value, key);
      } else {
        cardEntry = document.createElement("div");
        cardEntry.classList.add('.col-md-8');
        cardEntry.innerHTML = key;
        cardSpan = document.createElement("span");
        if (key.toLowerCase().indexOf('link') < 0) {
          cardSpan.classList.add('badge');
          cardSpan.classList.add(value === false ? 'bg-danger' : 'bg-success');
        } else {
          value = decodeURIComponent(value);
        };
        cardSpan.classList.add('position-absolute', 'end-0');
        cardSpan.innerHTML = value;
        cardEntry.appendChild(cardSpan);
        const card = document.getElementById(`card_${parentKey}`);
        card.appendChild(cardEntry);
      }
    }
  })
}

function drawTable(data, table, parentKey) {
  // CREATE DYNAMIC TABLE.
  if (!table) {
    table = document.createElement("table");
    table.classList.add('table', 'table-condensed', 'table-bordered', 'table-striped', 'tablesorter')
  }

  Object.entries(data).map(([key, value]) => {
    if (typeof value === 'object') {    // NESTED OBJECT
      drawTable(value, table, parentKey ? `${parentKey}.${key}` : key);
    } else {
      const tr = table.insertRow(-1);
      const keyCell = tr.insertCell(-1);
      keyCell.innerHTML = parentKey ? `${parentKey}.${key}` : key;
      var valueCell = tr.insertCell(-1);
      valueCell.innerHTML = value;
    }
  })

  // FINALLY ADD THE NEWLY CREATED TABLE WITH JSON DATA TO A CONTAINER.
  var divContainer = document.getElementById("divTable");
  divContainer.innerHTML = "";
  divContainer.appendChild(table);
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
        cb(e, null);
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
  if ('error' in json) {
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
  callApi(json, 'POST', '/config', 'json', false, (data) => {
    if (data.err) {
      $('#saveResult')
        .removeClass('alert-success')
        .addClass('alert-danger')
        .text(err.responseJSON.message || err)
        .show();
    } else {
      $('#saveResult')
        .removeClass('alert-danger')
        .addClass('alert-success')
        .text('file saved')
        .show();
    }
    setTimeout(function () {
      $('#saveResult').fadeOut('slow');
    }, 2000); // <-- time in milliseconds
  })
}