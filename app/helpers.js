function checkHost() {
  let html = window.location.href;
  console.log(html);
  let checkStatus = html.split("&");
  if (checkStatus[1] != undefined) {
    return true;
  }
  return false;
}

// Courtesy of https://css-tricks.com/snippets/javascript/get-url-variables/
function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  }
  return false;
}

function convertToMinutes(ms) {
  let seconds = Math.floor((ms / 1000) % 60);
  let minutes = Math.floor((ms / (1000 * 60)) % 60);
  let hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  if (seconds < 10) {
    seconds = "0" + seconds;
  }

  if (hours > 0) {
    return hours + ":" + minutes + ":" + seconds;
  } else {
    return minutes + ":" + seconds;
  }
}

exports.convertToMinutes = convertToMinutes;
exports.getQueryVariable = getQueryVariable;
exports.checkHost = checkHost;