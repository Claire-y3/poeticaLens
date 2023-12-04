async function predictReplicate(version, input, cb) {
  if (!version) {
    throw "Pass the model's version as the first parameter";
  }
  version =
    version.indexOf(":") == -1
      ? version
      : version.substring(version.indexOf(":") + 1);

  if (!input) {
    input = {};
  }

  // XXX: deep copy, recurse
  let transformInput = (obj) => {
    for (let prop in obj) {
      if (obj[prop] instanceof p5.Image) {
        obj[prop].loadPixels();
        obj[prop] = obj[prop].canvas.toDataURL();
      }
    }
  };
  transformInput(input);

  let prediction = await requestReplicate("POST", "/v1/predictions", {
    version: version,
    input: input,
  });

  if (!prediction) {
    return;
  }

  let checkStatus = async function () {
    let status = await requestReplicate(
      "GET",
      "/v1/predictions/" + prediction.id
    );

    if (!status) {
      return;
    } else if (status.status == "starting" || status.status == "processing") {
      setTimeout(checkStatus, 1000);
    } else if (status.status == "succeeded") {
      if (typeof cb == "function") {
        cb(status.output);
      }
      // XXX: promise
    } else if (status.status == "failed") {
      error.log("The prediction failed: " + status.error);
      if (typeof cb == "function") {
        cb();
      }
    } else if (status.status == "cancelled") {
      error.warn("The prediction was cancelled");
    }
  };

  setTimeout(checkStatus, 1000);
}

async function requestReplicate(method, path, parametersOrCb, cb) {
  if (!replicate_api_proxy) {
    throw "replicate_api_proxy is not set";
  }

  let options = {
    method: method,
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    redirect: "follow",
  };
  if (parametersOrCb && typeof parametersOrCb != "function") {
    options.body = JSON.stringify(parametersOrCb);
  }

  let res;
  try {
    res = await fetch(replicate_api_proxy + path, options);
  } catch (e) {
    console.error(
      "There was an error communicating to the Replicate API proxy. Is it offline?"
    );
  }

  let data;
  if (res && res.ok) {
    data = await res.json();
  } else if (res && !res.ok) {
    let message =
      "The Replicate API proxy returned an error with response code " +
      res.status;
    try {
      let error = await res.json();
      if (error && error.error) {
        message += ": " + error.error;
      }
    } catch (e) {}
    console.error(message);
  }

  if (typeof parametersOrCb == "function") {
    parametersOrCb(data);
  } else if (typeof cb == "function") {
    cb(data);
  }
  return data;
}
