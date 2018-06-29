//Papa.parse(file, config)
console.log(Papa);

// Papa.parse('../parse.csv', {
//
// })
var start, end, parsedData;
var downloadCount = 1;
var stepped = 0, rowCount = 0, errorCount = 0, firstError;
var firstRun = true;

var config = {
  header: true,
  comments: "",
  delimiter: "",
  download: false,
  dynamicTyping: false,
  encoding: "",
  error: errorFn,
  complete: completeFn,
  preview: 0,
  skipEmptyLines: false,
  step: undefined,
  worker: false,
};


$('#parse').prop('disabled', true);
$('#normalize').prop('disabled', true);
$('#unparse').prop('disabled', true);


$(function() {

  // Upload CSV file CSV => JSON
  $('#parse').click(function() {

    stepped = 0;
    rowCount = 0;
    errorCount = 0;
    firstError = undefined;

    // Allow only one parse at a time
    $(this).prop('disabled', true);
    $('#parse').removeClass('glow');
    $('#loader').removeClass('hidden');

    if (!firstRun)
      console.log("--------------------------------------------------");
    else
      firstRun = false;

    if (!$('#file-uploader')[0].files.length) {
      alert("Please choose at least one file to parse.");
      $('#loader').addClass('hidden');
      $(this).prop('disabled', false);
    } else {
      $('#file-uploader').parse({
        config: config,
        before: function(file, inputElem) {
          start = now();
          console.log("Parsing file...", file);
        },
        error: function(err, file) {
          console.log("ERROR:", err, file);
          firstError = firstError || err;
          errorCount++;
        },
        complete: function() {
          end = now();
          printStats("Done with all files");
        }
      });
    }
  });

  // Normalize data
  $('#normalize').click(function () {

    $(this).prop('disabled', true);
    $('#loader').removeClass('hidden');

    $('#table-container').empty('');

    // Hackie
    setTimeout(function () {
      parsedData.data = normalizeData(parsedData.data);
      renderTable(parsedData);

      console.log("--------------------------------------------------");
      console.log("  Row count:", parsedData.data.length);
      console.log("  Result:", parsedData);

      $('#loader').addClass('hidden');
      $('#normalize').prop('disabled', false);
      $('#normalize').removeClass('glow');
      $('#unparse').addClass('glow');
    }, 100);
  });

  // Unparse data JSON => CSV
  $('#unparse').click(function () {

    stepped = 0;
    rowCount = 0;
    errorCount = 0;
    firstError = undefined;

    // Allow only one parse at a time
    $(this).prop('disabled', true);
    $('#loader').removeClass('hidden');

    if (!firstRun)
      console.log("--------------------------------------------------");
    else
      firstRun = false;


    if (!parsedData.data) {
      alert("Please enter a valid JSON string to convert to CSV.");
      $('#loader').addClass('hidden');
      $(this).prop('disabled', false);
    }

    start = now();

    var stringifid = JSON.stringify(parsedData.data);
    var csv = Papa.unparse(stringifid, config);

    end = now();

    console.log("Unparse complete");
    console.log("Time:", (end-start || "(Unknown; your browser does not support the Performance API)"), "ms");

    $('#loader').addClass('hidden');
    $('#unparse').removeClass('glow');
    $(this).prop('disabled', false);
    $('#csv').removeClass('hidden');
    document.getElementById('csv').value = csv;

    console.log(csv);

    downloadCSV(csv);

    setTimeout(enableButton, 100);	// hackity-hack
  });

});

function completeFn(results) {
  end = now();

  if (results && results.errors) {
    if (results.errors) {
      errorCount = results.errors.length;
      firstError = results.errors[0];
    }
    if (results.data && results.data.length > 0)
      rowCount = results.data.length;
  }

  printStats("Parse complete");
  console.log("    Results:", results);

  renderSelectByFilter(results.meta.fields);

  renderTable(results);
  parsedData = results;

  $('#loader').addClass('hidden');
  setTimeout(enableButton, 100);
  $('#normalize').prop('disabled', false);
  $('#normalize').addClass('glow');
  $('#unparse').prop('disabled', false);
  $('#search-container').removeClass('hide');
}

function errorFn(err, file) {
  end = now();
  console.log("ERROR:", err, file);
  $('#loader').addClass('hidden');
  enableButton();
}


function downloadCSV(csv) {
  var filename = 'csv' + downloadCount + '.csv';

  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}


function normalizeData(data) {
  var normalizedData = [];
  data.forEach(function (row) {
    var isRowDenormalizedObj = isRowDenormalized(row);

    if (isRowDenormalizedObj.flag) {
      var cellValue = row[isRowDenormalizedObj.key];
      var isDenormalizedObj = isDenormalized(cellValue);

      if (isDenormalizedObj.flag) {
        if (isDenormalizedObj.type === 'array') {

          isDenormalizedObj.data.forEach(function (value) {
            var normalizedObj = Object.assign({}, row, { answer: value });
            normalizedData.push(normalizedObj)
          });

        }
      }
    } else {
      normalizedData.push(row);
    }

  });

  return normalizedData;
}

function isRowDenormalized(row) {
  for (var k in row) {
    var cellValue = row[k];
    var isDenormalizedObj = isDenormalized(cellValue);
    if (isDenormalizedObj.flag) return { flag: true, key: k };
  }

  return { flag: false };
}


function printStats(msg) {
  if (msg) {
    console.log(msg);
  }
  console.log("       Time:", (end-start || "(Unknown; your browser does not support the Performance API)"), "ms");
  console.log("  Row count:", rowCount);
  if (stepped) {
    console.log("    Stepped:", stepped);
  }
  console.log("     Errors:", errorCount);
  if (errorCount) {
    console.log("First error:", firstError);
  }
}


function now() {
  return typeof window.performance !== 'undefined'
    ? window.performance.now()
    : 0;
}

function isDenormalized(value) {
  var isDenormalized = {
    flag: true,
    type: '',
    data: null
  };

  if (IsJsonString(value)) {
    var parsed = JSON.parse(value);

    if (typeof parsed === 'number') {
      isDenormalized.type = typeof value;
      isDenormalized.flag = false;
      return isDenormalized;
    } else if (Array.isArray(parsed)) {
      isDenormalized.type = 'array';
      isDenormalized.flag = true;
      isDenormalized.data = parsed;
    } else if (typeof parsed === 'object') {
      isDenormalized.type = 'object';
      isDenormalized.flag = true;
      isDenormalized.data = parsed;
    }

  } else {
    if (typeof value === 'undefined' || value === null) {
      isDenormalized.type = 'null';
      isDenormalized.flag = false;
      return isDenormalized;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      isDenormalized.type = typeof value;
      isDenormalized.flag = false;
      return isDenormalized;
    }
  }

  return isDenormalized

}


function IsJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

function enableButton() {
  $('#submit').prop('disabled', false);
}

function handleFileUpload() {
  var fileName = $('#file-uploader')[0].value;
  document.getElementById('file-name').innerHTML = 'File uploaded: ' + fileName;
  $('#file-upload-container').removeClass('glow');
  $('#parse').prop('disabled', false);
  $('#parse').addClass('glow');
}

function renderTable(results) {
  var headers = results.meta.fields;
  var data = results.data;

  $('#table-container').empty();

  var table = '<table id="table" class="table table-dark table-striped table-bordered">';
  table = table + renderTableHeader(headers);
  table = table + renderTableBody(data);
  table = table + '</table>';

  $('#table-container').append(table);
}

function renderTableHeader(headers) {
  var tableHeader = '<thead>';
  tableHeader = tableHeader + '<tr>';

  for (var i = 0; i < headers.length; i++) {
    tableHeader = tableHeader + '<th scope="col">' + headers[i] + '</th>'
  }

  tableHeader = tableHeader + '</tr>';
  tableHeader = tableHeader + '</thead>';

  return tableHeader;
}

function renderTableBody(data) {
  var tableBody = '<tbody>';

  for (var i = 0; i < data.length; i++) {
    tableBody = tableBody + '<tr>';

    for (var k in data[i]) {
      var cellValue = data[i][k];
      var isDenormalizedObj = isDenormalized(cellValue);
      var cellColor = isDenormalizedObj.flag ? 'bg-danger' : '';
      tableBody = tableBody + '<td class="' + cellColor + '">' + data[i][k] + '</td>';
    }

    tableBody = tableBody + '</tr>';
  }

  tableBody = tableBody + '</tbody>';

  return tableBody;
}

function renderSelectByFilter(headers) {
  var select = '<select id="filter-by">';

  for (var i = 0; i < headers.length; i++) {
    select = select + '<option value="' + i + '">' + headers[i] + '</option>';
  }

  select = select + '</select>';

  $('#filter-by-container').append(select);
}

function search() {
  var input, filter, table, tr, td, i;
  var $filterBy = document.getElementById('filter-by');
  var filterByIndex = $filterBy.options[$filterBy.selectedIndex].value;

  input = document.getElementById('search');
  filter = input.value.toUpperCase();
  table = document.getElementById('table');
  tr = table.getElementsByTagName('tr');

  for (i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName('td')[filterByIndex];
    if (td) {
      if (td.innerHTML.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }
  }
}
