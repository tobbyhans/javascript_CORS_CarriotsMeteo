// Create the XHR object.
function createCORSRequest(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    // XHR for Chrome/Firefox/Opera/Safari.
    xhr.open(method, url, true);

  } else {
    // CORS not supported.
    xhr = null;
  }
  return xhr;
}

// Make the actual CORS request.
function makeCorsRequest(meth, url) {
  var jsonData = null;
  var xhr = createCORSRequest(meth, url);
  var apikey= 'a3dd2a33c514de9ed0ad1e8e751a82a8c699916858b1ad0a6e2425d71cce48ea';
  var device = 'madrid@carriotsMeteo.carriotsMeteo';

  if (!xhr) {
    showWeatherError('CORS not supported');
    return;
  }
  
  xhr.setRequestHeader('carriots.apiKey', apikey);
  xhr.setRequestHeader('Accept', 'application/json');
  xhr.timeout = 15000;
  
  // Response handlers.
  xhr.onload = function() {
    if (xhr.status < 200 || xhr.status >= 300) {
      showWeatherError('Weather request failed (HTTP ' + xhr.status + ').');
      return;
    }
    try {
      decodeJson(xhr.responseText);
      $('#weather-error').text('').hide();
    } catch (error) {
      showWeatherError('Weather service returned invalid or incomplete data.');
    }
	//console.log(text);
  };

  xhr.onerror = function() {
    showWeatherError('Unable to connect to the weather service.');
  };

  xhr.ontimeout = function () { showWeatherError('Weather request timed out.'); };
  xhr.send(jsonData);
}

function showWeatherError(message) {
  $('#weather-error').text(message).show();
  $('#last_update').text('Weather data unavailable');
  ['#nowTemp', '#nowWind', '#nowHumidity'].forEach(function (id) {
    $(id).text('—').css('background', 'none');
  });
  for (var i = 1; i <= 4; i++) $('#chart_grow' + i).empty();
  $('#knob-dyn').val(0).trigger('change');
}

function weatherNumber(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && value.trim() === '')) {
    throw new Error('Missing numeric weather value');
  }
  var number = Number(value);
  if (!isFinite(number)) throw new Error('Invalid numeric weather value');
  return number;
}

function decodeJson(text) {
  var obj = JSON.parse(text);
  if (!obj || !Array.isArray(obj.result) || !obj.result.length) {
    throw new Error('No weather records');
  }
  // Validate the complete response before updating the display.
  var records = obj.result.map(function (record) {
    if (!record || !record.data) throw new Error('Missing weather record');
    var at = weatherNumber(record.at) * 1000;
    if (!isFinite(new Date(at).getTime())) throw new Error('Invalid timestamp');
    return {at: at, temp: weatherNumber(record.data.temp),
      wind: weatherNumber(record.data.wind_speed), hum: weatherNumber(record.data.hum),
      dir: weatherNumber(record.data.wind_dir), uv: weatherNumber(record.data.uv_rad)};
  }).sort(function (a, b) { return b.at - a.at; });
  var current = records[0], previous = records[1];
  $('#last_update').text('Last Update: ' + new Date(current.at).toLocaleString());
  function display(id, field, unit) {
    var change = previous ? current[field] - previous[field] : null;
    var trend = change === null ? '' : ' (' + (change > 0 ? '+' : '') +
      Math.round(change * 100) / 100 + ')';
    $(id).text(current[field] + ' ' + unit + trend).css('background', 'none');
  }
  display('#nowTemp', 'temp', '°C');
  display('#nowWind', 'wind', 'Km/H');
  display('#nowHumidity', 'hum', '%');
  $('#knob-dyn').val(current.dir).knob().trigger('change');
  var cutoff = current.at - 24 * 60 * 60 * 1000;
  var history = records.filter(function (record) { return record.at >= cutoff; }).reverse();
  [['wind', 'Km/H'], ['temp', '°C'], ['hum', '%'], ['uv', 'UV']].forEach(function (series, index) {
    var points = history.map(function (record) { return [record.at, record[series[0]]]; });
    Charts.initOtherCharts(series[1], index + 1, points);
  });
}
