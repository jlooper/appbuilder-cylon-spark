require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Cylon = require('cylon');

var robot = Cylon.robot({
  
  connections: {
    spark: { adaptor: 'spark', accessToken: 'my-access-token', deviceId: 'my-device-id' }
  },

  devices: {
    red: { driver: 'led', pin: 'D0'},
    green: { driver: 'led', pin: 'D1'}
  },

  work: function(my) {
    //start with both lights off
    my.red.turnOff()
    my.green.turnOff()   
  },
 
  lightUp: function(color) {
    if (color === "green"){
      robot.devices.red.turnOff()
      robot.devices.green.turnOn()
    }
    else {
      robot.devices.green.turnOff()
      robot.devices.red.turnOn()
    }
  }


}).start();

$( "#redBtn" ).click(function() {
      robot.commands.lightUp("red");
});
$( "#greenBtn" ).click(function() {
      robot.commands.lightUp("green");
});
},{"cylon":44}],2:[function(require,module,exports){
// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// UMD HEADER START 
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
  }
}(this, function () {
// UMD HEADER END

var XHR = XMLHttpRequest
if (!XHR) throw new Error('missing XMLHttpRequest')
request.log = {
  'trace': noop, 'debug': noop, 'info': noop, 'warn': noop, 'error': noop
}

var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

//
// request
//

function request(options, callback) {
  // The entry-point to the API: prep the options object and pass the real work to run_xhr.
  if(typeof callback !== 'function')
    throw new Error('Bad callback given: ' + callback)

  if(!options)
    throw new Error('No options given')

  var options_onResponse = options.onResponse; // Save this for later.

  if(typeof options === 'string')
    options = {'uri':options};
  else
    options = JSON.parse(JSON.stringify(options)); // Use a duplicate for mutating.

  options.onResponse = options_onResponse // And put it back.

  if (options.verbose) request.log = getLogger();

  if(options.url) {
    options.uri = options.url;
    delete options.url;
  }

  if(!options.uri && options.uri !== "")
    throw new Error("options.uri is a required argument");

  if(typeof options.uri != "string")
    throw new Error("options.uri must be a string");

  var unsupported_options = ['proxy', '_redirectsFollowed', 'maxRedirects', 'followRedirect']
  for (var i = 0; i < unsupported_options.length; i++)
    if(options[ unsupported_options[i] ])
      throw new Error("options." + unsupported_options[i] + " is not supported")

  options.callback = callback
  options.method = options.method || 'GET';
  options.headers = options.headers || {};
  options.body    = options.body || null
  options.timeout = options.timeout || request.DEFAULT_TIMEOUT

  if(options.headers.host)
    throw new Error("Options.headers.host is not supported");

  if(options.json) {
    options.headers.accept = options.headers.accept || 'application/json'
    if(options.method !== 'GET')
      options.headers['content-type'] = 'application/json'

    if(typeof options.json !== 'boolean')
      options.body = JSON.stringify(options.json)
    else if(typeof options.body !== 'string')
      options.body = JSON.stringify(options.body)
  }
  
  //BEGIN QS Hack
  var serialize = function(obj) {
    var str = [];
    for(var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  }
  
  if(options.qs){
    var qs = (typeof options.qs == 'string')? options.qs : serialize(options.qs);
    if(options.uri.indexOf('?') !== -1){ //no get params
        options.uri = options.uri+'&'+qs;
    }else{ //existing get params
        options.uri = options.uri+'?'+qs;
    }
  }
  //END QS Hack
  
  //BEGIN FORM Hack
  var multipart = function(obj) {
    //todo: support file type (useful?)
    var result = {};
    result.boundry = '-------------------------------'+Math.floor(Math.random()*1000000000);
    var lines = [];
    for(var p in obj){
        if (obj.hasOwnProperty(p)) {
            lines.push(
                '--'+result.boundry+"\n"+
                'Content-Disposition: form-data; name="'+p+'"'+"\n"+
                "\n"+
                obj[p]+"\n"
            );
        }
    }
    lines.push( '--'+result.boundry+'--' );
    result.body = lines.join('');
    result.length = result.body.length;
    result.type = 'multipart/form-data; boundary='+result.boundry;
    return result;
  }
  
  if(options.form){
    if(typeof options.form == 'string') throw('form name unsupported');
    if(options.method === 'POST'){
        var encoding = (options.encoding || 'application/x-www-form-urlencoded').toLowerCase();
        options.headers['content-type'] = encoding;
        switch(encoding){
            case 'application/x-www-form-urlencoded':
                options.body = serialize(options.form).replace(/%20/g, "+");
                break;
            case 'multipart/form-data':
                var multi = multipart(options.form);
                //options.headers['content-length'] = multi.length;
                options.body = multi.body;
                options.headers['content-type'] = multi.type;
                break;
            default : throw new Error('unsupported encoding:'+encoding);
        }
    }
  }
  //END FORM Hack

  // If onResponse is boolean true, call back immediately when the response is known,
  // not when the full request is complete.
  options.onResponse = options.onResponse || noop
  if(options.onResponse === true) {
    options.onResponse = callback
    options.callback = noop
  }

  // XXX Browsers do not like this.
  //if(options.body)
  //  options.headers['content-length'] = options.body.length;

  // HTTP basic authentication
  if(!options.headers.authorization && options.auth)
    options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);

  return run_xhr(options)
}

var req_seq = 0
function run_xhr(options) {
  var xhr = new XHR
    , timed_out = false
    , is_cors = is_crossDomain(options.uri)
    , supports_cors = ('withCredentials' in xhr)

  req_seq += 1
  xhr.seq_id = req_seq
  xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
  xhr._id = xhr.id // I know I will type "_id" from habit all the time.

  if(is_cors && !supports_cors) {
    var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri)
    cors_err.cors = 'unsupported'
    return options.callback(cors_err, xhr)
  }

  xhr.timeoutTimer = setTimeout(too_late, options.timeout)
  function too_late() {
    timed_out = true
    var er = new Error('ETIMEDOUT')
    er.code = 'ETIMEDOUT'
    er.duration = options.timeout

    request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
    return options.callback(er, xhr)
  }

  // Some states can be skipped over, so remember what is still incomplete.
  var did = {'response':false, 'loading':false, 'end':false}

  xhr.onreadystatechange = on_state_change
  xhr.open(options.method, options.uri, true) // asynchronous
  if(is_cors)
    xhr.withCredentials = !! options.withCredentials
  xhr.send(options.body)
  return xhr

  function on_state_change(event) {
    if(timed_out)
      return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

    request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

    if(xhr.readyState === XHR.OPENED) {
      request.log.debug('Request started', {'id':xhr.id})
      for (var key in options.headers)
        xhr.setRequestHeader(key, options.headers[key])
    }

    else if(xhr.readyState === XHR.HEADERS_RECEIVED)
      on_response()

    else if(xhr.readyState === XHR.LOADING) {
      on_response()
      on_loading()
    }

    else if(xhr.readyState === XHR.DONE) {
      on_response()
      on_loading()
      on_end()
    }
  }

  function on_response() {
    if(did.response)
      return

    did.response = true
    request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
    clearTimeout(xhr.timeoutTimer)
    xhr.statusCode = xhr.status // Node request compatibility

    // Detect failed CORS requests.
    if(is_cors && xhr.statusCode == 0) {
      var cors_err = new Error('CORS request rejected: ' + options.uri)
      cors_err.cors = 'rejected'

      // Do not process this request further.
      did.loading = true
      did.end = true

      return options.callback(cors_err, xhr)
    }

    options.onResponse(null, xhr)
  }

  function on_loading() {
    if(did.loading)
      return

    did.loading = true
    request.log.debug('Response body loading', {'id':xhr.id})
    // TODO: Maybe simulate "data" events by watching xhr.responseText
  }

  function on_end() {
    if(did.end)
      return

    did.end = true
    request.log.debug('Request done', {'id':xhr.id})

    xhr.body = xhr.responseText
    if(options.json) {
      try        { xhr.body = JSON.parse(xhr.responseText) }
      catch (er) { return options.callback(er, xhr)        }
    }

    options.callback(null, xhr, xhr.body)
  }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

//
// defaults
//

request.defaults = function(options, requester) {
  var def = function (method) {
    var d = function (params, callback) {
      if(typeof params === 'string')
        params = {'uri': params};
      else {
        params = JSON.parse(JSON.stringify(params));
      }
      for (var i in options) {
        if (params[i] === undefined) params[i] = options[i]
      }
      return method(params, callback)
    }
    return d
  }
  var de = def(request)
  de.get = def(request.get)
  de.post = def(request.post)
  de.put = def(request.put)
  de.head = def(request.head)
  return de
}

//
// HTTP method shortcuts
//

var shortcuts = [ 'get', 'put', 'post', 'head' ];
shortcuts.forEach(function(shortcut) {
  var method = shortcut.toUpperCase();
  var func   = shortcut.toLowerCase();

  request[func] = function(opts) {
    if(typeof opts === 'string')
      opts = {'method':method, 'uri':opts};
    else {
      opts = JSON.parse(JSON.stringify(opts));
      opts.method = method;
    }

    var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
    return request.apply(this, args);
  }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
  if(typeof options === 'string')
    options = {'uri':options}

  // Just use the request API to do JSON.
  options.json = true
  if(options.body)
    options.json = options.body
  delete options.body

  callback = callback || noop

  var xhr = request(options, couch_handler)
  return xhr

  function couch_handler(er, resp, body) {
    if(er)
      return callback(er, resp, body)

    if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
      // The body is a Couch JSON object indicating the error.
      er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
      for (var key in body)
        er[key] = body[key]
      return callback(er, resp, body);
    }

    return callback(er, resp, body);
  }
}

//
// Utility
//

function noop() {}

function getLogger() {
  var logger = {}
    , levels = ['trace', 'debug', 'info', 'warn', 'error']
    , level, i

  for(i = 0; i < levels.length; i++) {
    level = levels[i]

    logger[level] = noop
    if(typeof console !== 'undefined' && console && console[level])
      logger[level] = formatted(console, level)
  }

  return logger
}

function formatted(obj, method) {
  return formatted_logger

  function formatted_logger(str, context) {
    if(typeof context === 'object')
      str += ' ' + JSON.stringify(context)

    return obj[method].call(obj, str)
  }
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
  var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/

  // jQuery #8138, IE may throw an exception when accessing
  // a field from window.location if document.domain has been set
  var ajaxLocation
  try { ajaxLocation = location.href }
  catch (e) {
    // Use the href attribute of an A element since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
  }

  var ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
    , parts = rurl.exec(url.toLowerCase() )

  var result = !!(
    parts &&
    (  parts[1] != ajaxLocParts[1]
    || parts[2] != ajaxLocParts[2]
    || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
    )
  )

  //console.debug('is_crossDomain('+url+') -> ' + result)
  return result
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
        break;
        case 2:
            enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
}
    return request;
//UMD FOOTER START
}));
//UMD FOOTER END

},{}],3:[function(require,module,exports){
/*
 * Analog Sensor driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

var events = [
  /**
   * Emitted when the Analog Sensor has fetched a new value
   *
   * @event analogRead
   */
  "analogRead",

  /**
   * Emitted when the Analog Sensor reads a value above the specified upper
   * limit
   *
   * @event upperLimit
   */
  "upperLimit",

  /**
   * Emitted when the Analog Sensor reads a value below the specified lower
   * limit
   *
   * @event lowerLimit
   */
  "lowerLimit"
];

/**
 * An Analog Sensor driver
 *
 * @constructor analog-sensor
 *
 * @param {Object} opts
 * @param {String|Number} opts.pin the pin to connect to
 * @param {Number=} opts.upperLimit
 * @param {Number=} opts.lowerLimit
 */
var AnalogSensor = module.exports = function AnalogSensor(opts) {
  AnalogSensor.__super__.constructor.apply(this, arguments);

  this.upperLimit = opts.upperLimit || 256;
  this.lowerLimit = opts.lowerLimit || 0;
  this.analogVal = null;

  if (this.pin == null) {
    throw new Error("No pin specified for Analog Sensor. Cannot proceed");
  }

  this.commands = {
    analog_read: this.analogRead
  };

  this.events = events;
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(AnalogSensor, Cylon.Driver);

/**
 * Gets the current value from the Analog Sensor
 *
 * @return {Number} the current `this.analogVal`
 * @publish
 */
AnalogSensor.prototype.analogRead = function() {
  return this.analogVal;
};

/**
 * Starts the Analog Sensor
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
AnalogSensor.prototype.start = function(callback) {
  this.connection.analogRead(this.pin, function(err, readVal) {
    this.analogVal = readVal;
    this.emit("analogRead", readVal);

    if (readVal >= this.upperLimit) {
      this.emit("upperLimit", readVal);
    } else if (readVal <= this.lowerLimit) {
      this.emit("lowerLimit", readVal);
    }
  }.bind(this));

  callback();
};

/**
 * Stops the Analog Sensor
 *
 * @param {Function} callback to be triggered when stopped
 * @return {null}
 * @api private
 */
AnalogSensor.prototype.halt = function(callback) {
  callback();
};

},{"cylon":44}],4:[function(require,module,exports){
/*
 * Cylon button driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

var events = [
  /**
   * Emitted when the Button is pushed
   *
   * @event push
   */
  "push",

  /**
   * Emitted when the Button is released
   *
   * @event release
   */
  "release"
];

/**
 * A Button driver
 *
 * @constructor button
 *
 * @param {Object} opts
 * @param {String|Number} opts.pin the pin to connect to
 */
var Button = module.exports = function Button() {
  Button.__super__.constructor.apply(this, arguments);

  this.pressed = false;
  this.prevState = 0;

  if (this.pin == null) {
    throw new Error("No pin specified for Button. Cannot proceed");
  }

  this.commands = {
    is_pressed: this.isPressed
  };

  this.events = events;
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(Button, Cylon.Driver);

/**
 * Check whether or not the Button is currently pressed
 *
 * @return {Boolean} whether or not the button is pressed
 * @publish
 */
Button.prototype.isPressed = function() {
  return this.pressed;
};

/**
 * Starts the Button
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 * @private
 */
Button.prototype.start = function(callback) {
  this.connection.digitalRead(this.pin, function(err, data) {
    var previouslyPressed = this.pressed;
    this.pressed = (data === 1);

    if (this.pressed && !previouslyPressed) {
      this.pressed = true;
      this.emit("push");
    } else if (!this.pressed && previouslyPressed) {
      this.pressed = false;
      this.emit("release");
    }
  }.bind(this));

  callback();
};

/**
 * Stops the Analog Sensor
 *
 * @param {Function} callback to be triggered when stopped
 * @return {null}
 * @private
 */
Button.prototype.halt = function(callback) {
  callback();
};

},{"cylon":44}],5:[function(require,module,exports){
/*
 * Continuous Servo driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

/**
 * A Continuous Servo driver
 *
 * @constructor continuous-servo
 *
 * @param {Object} opts
 * @param {String|Number} opts.pin the pin to connect to
 */
var ContinuousServo = module.exports = function(opts) {
  ContinuousServo.__super__.constructor.apply(this, arguments);

  this.angleValue = 0;
  this.freq = opts.freq || null;
  this.pwmScale = opts.pwmScale || { bottom: 0, top: 180 };
  this.pulseWidth = opts.pulseWidth || { min: 500, max: 2400 };

  if (this.pin == null) {
    throw new Error("No pin specified for Continuous Servo. Cannot proceed");
  }

  this.commands = {
    clockwise: this.clockwise,
    counter_clockwise: this.counterClockwise,
    stop: this.stop
  };
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(ContinuousServo, Cylon.Driver);

/**
 * Starts the Continuous Servo
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
ContinuousServo.prototype.start = function(callback) {
  callback();
};

/**
 * Stops the Continuous Servo
 *
 * @param {Function} callback to be triggered when stopped
 * @return {null}
 */
ContinuousServo.prototype.halt = function(callback) {
  callback();
};

/**
 * Stops the Continuous Servo's rotation
 *
 * @param {Function} callback (err, val) triggers when write is complete
 * @return {Boolean|null}
 * @publish
 */
ContinuousServo.prototype.stop = function(callback) {
  var scaledDuty = (90).fromScale(
    this.pwmScale.bottom,
    this.pwmScale.top
  );

  this.connection.servoWrite(
    this.pin,
    scaledDuty,
    this.freq,
    this.pulseWidth,
    callback
  );
};

/**
 * Rotates the Continuous Servo clockwise
 *
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {Boolean|null}
 * @publish
 */
ContinuousServo.prototype.clockwise = function(callback) {
  return this.rotate("clockwise", callback);
};

/**
 * Rotates the Continuous Servo counter-clockwise
 *
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {Boolean|null}
 * @publish
 */
ContinuousServo.prototype.counterClockwise = function(callback) {
  return this.rotate("counter-clockwise", callback);
};

/**
 * Rotates the Continuous Servo
 *
 * @param {String} direction 'clockwise' or 'counter-clockwise'
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {Boolean|null}
 * @publish
 */
ContinuousServo.prototype.rotate = function(direction, callback) {
  var spin = (direction === "clockwise") ? 180 : 89;

  var scaledDuty = (spin).fromScale(
    this.pwmScale.bottom,
    this.pwmScale.top
  );

  this.connection.servoWrite(
    this.pin,
    scaledDuty,
    this.freq,
    this.pulseWidth,
    callback
  );
};

},{"cylon":44}],6:[function(require,module,exports){
/*
 * DirectPin driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

/**
 * A Direct Pin driver
 *
 * @constructor direct-pin
 *
 * @param {Object} opts
 * @param {String|Number} opts.pin the pin to connect to
 */
var DirectPin = module.exports = function DirectPin() {
  DirectPin.__super__.constructor.apply(this, arguments);

  this.readSet = false;
  this.high = false;

  if (this.pin == null) {
    throw new Error("No pin specified for Direct Pin. Cannot proceed");
  }

  this.commands = {
    digital_read: this.digitalRead,
    digital_write: this.digitalWrite,

    analog_read: this.analogRead,
    analog_write: this.analogWrite,

    pwm_write: this.pwmWrite,
    servo_write: this.servoWrite,
  };
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(DirectPin, Cylon.Driver);

/**
 * Starts the Direct Pin
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
DirectPin.prototype.start = function(callback) {
  callback();
};

/**
 * Stops the Direct Pin
 *
 * @param {Function} callback to be triggered when stopped
 * @return {null}
 */
DirectPin.prototype.halt = function(callback) {
  callback();
};

/**
 * Writes a digital value to the pin
 *
 * @param {Number} value value to write to the pin
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
DirectPin.prototype.digitalWrite = function(value, callback) {
  this.connection.digitalWrite(this.pin, value, callback);
};

/**
 * Writes an analog value to the pin
 *
 * @param {Number} value value to write to the pin
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
DirectPin.prototype.analogWrite = function(value, callback) {
  this.connection.analogWrite(this.pin, value, callback);
};

/**
 * Reads the value from the pin
 *
 * Triggers the provided callback when the pin state has been read.
 *
 * @param {Function} callback triggered when the pin state has been read
 * @return {null}
 * @publish
 */
DirectPin.prototype.digitalRead = function(callback) {
  this._read("d", callback);
};

/**
 * Reads the value from the pin
 *
 * Triggers the provided callback when the pin state has been read.
 *
 * @param {Function} callback triggered when the pin state has been read
 * @return {null}
 * @publish
 */
DirectPin.prototype.analogRead = function(callback) {
  this._read("a", callback);
};

DirectPin.prototype._read = function(type, callback) {
  if (!this.readSet) {
    switch(type){
      case "a":
        this.connection.analogRead(this.pin, callback);
        break;
      case "d":
        this.connection.digitalRead(this.pin, callback);
        break;
    }
    this.readSet = true;
  }
};

// Public: ServoWrite
/**
 * Writes a servo value to the pin
 *
 * @param {Number} value value to write to the pin
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
DirectPin.prototype.servoWrite = function(angle, callback) {
  return this.connection.servoWrite(this.pin, angle, callback);
};

/**
 * Writes a PWM value to the pin
 *
 * @param {Number} value value to write to the pin
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
DirectPin.prototype.pwmWrite = function(value, callback) {
  return this.connection.pwmWrite(this.pin, value, callback);
};

},{"cylon":44}],7:[function(require,module,exports){
(function (__dirname){
/*
 * SHARP IR Range Sensor driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");
var path = require("path");

var events = [
  /**
   * Emitted when the IR Range Sensor has detected the current range
   *
   * @event range
   * @value distance the current distance in inches
   */
  "range",

  /**
   * Emitted when the IR Range Sensor has detected the current range
   *
   * @event rangeCm
   * @value distance the current distance in centimeters
   */
  "rangeCm",
];

/**
 * A IR Range Sensor driver
 *
 * @constructor ir-range-sensor
 *
 * @param {Object} opts
 * @param {String|Number} opts.pin the pin to connect to
 * @param {String} opts.model the IR Range Sensor model number
 */
var IrRangeSensor = module.exports = function IrRangeSensor(opts) {
  IrRangeSensor.__super__.constructor.apply(this, arguments);

  this.model = opts.model;
  this.analogVal = 0;
  this.distanceCm = 0;
  this.distanceIn = 0;

  if (this.pin == null) {
    throw new Error("No pin specified for IR Range Sensor. Cannot proceed");
  }

  this._setRangeTable();

  this.commands = {
    analog_read: this.analogRead,
    range_cm: this.rangeCm,
    range: this.range
  };

  this.events = events;
};

Cylon.Utils.subclass(IrRangeSensor, Cylon.Driver);

IrRangeSensor.prototype._setRangeTable = function() {
  if (this.model) {
    var model = path.join(
      __dirname,
      "./ir_range_tables/" + this.model.toLowerCase() + ".js"
    );

    this.rangeTable = require(model);
  } else {
    this.rangeTable = {};

    var str = "IRSensor CANNOT calculate distance (range and rangecm) without ";
    str +=    "IR model number.\n";
    str +=    "Only analogRead() values will be available.\n";
    str +=    "To generate a distance range table, check ./node_modules";
    str +=    "/cylon-gpio/utilities/generate-ir-rage-sensor-table.js.\n";
    str +=    "Try passing model number as a device parameter.";
    Cylon.Logger.info(str);
  }
};
/**
 * Starts the IR Range Sensor
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
IrRangeSensor.prototype.start = function(callback) {
  this.connection.analogRead(this.pin, function(err, readVal) {
    this._calcDistances(readVal);
    this.emit("range", this.distanceIn);
    this.emit("rangeCm", this.distanceCm);
  }.bind(this));

  callback();
};

/**
 * Stops the IR Range Sensor
 *
 * @param {Function} callback to be triggered when stopped
 * @return {null}
 */
IrRangeSensor.prototype.halt = function(callback) {
  callback();
};

/**
 * Uses the range table to calculate distances
 *
 * Uses the calculated distance to set `this.analogVal`, `this.distanceCm`, and
 * `this.distanceIn`
 *
 * @param {Number} analogVal value to calculate distance for
 * @return {null}
 */
IrRangeSensor.prototype._calcDistances = function(analogVal) {
  var distance = 0,
      tmpRange = 0;

  for (var range in this.rangeTable.rangeDistances){
    tmpRange = parseInt(range);
    if ((analogVal <= tmpRange) && (analogVal + 5 > tmpRange)){
      distance = this.rangeTable.rangeDistances[range].dist;
      break;
    }
  }

  this.analogVal = analogVal;
  this.distanceCm = distance;
  this.distanceIn = distance / 2.54;
};

/**
 * Returns the current analog value from the pin
 *
 * @return {Number} current analog value, or 0 if it's not been read yet
 * @publish
 */
IrRangeSensor.prototype.analogRead = function() {
  return this.analogVal || 0;
};

/**
 * Returns the current range, in centimeters
 *
 * @return {Number} current detected range in centimeters
 * @publish
 */
IrRangeSensor.prototype.rangeCm = function() {
  return this.distanceCm;
};

/**
 * Returns the current range, in inches
 *
 * @return {Number} current detected range in inches
 * @publish
 */
IrRangeSensor.prototype.range = function() {
  return this.distanceIn;
};

}).call(this,"/../../../node_modules/cylon-gpio/lib")
},{"cylon":44,"path":76}],8:[function(require,module,exports){
/*
 * LED driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

/**
 * A LED driver
 *
 * @constructor led
 *
 * @param {Object} opts
 * @param {String|Number} opts.pin the pin to connect to
 * @param {Number} opts.freq
 * @param {Object=} opts.pwmScale
 * @param {Number} opts.pwmScale.bottom
 * @param {Number} opts.pwmScale.top
 */
var Led = module.exports = function Led(opts) {
  Led.__super__.constructor.apply(this, arguments);

  this.freq = opts.freq || null;
  this.isHigh = false;
  this.brightnessValue = 0;
  this.pwmScale = opts.pwmScale || { bottom: 0, top: 255 };

  if (this.pin == null) {
    throw new Error("No pin specified for LED. Cannot proceed");
  }

  this.commands = {
    is_on: this.isOn,

    turn_on: this.turnOn,
    turn_off: this.turnOff,
    toggle: this.toggle,

    brightness: this.brightness,
    current_brightness: this.currentBrightness
  };
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(Led, Cylon.Driver);

/**
 * Starts the LED
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
Led.prototype.start = function(callback) {
  callback();
};

/**
 * Stops the LED
 *
 * @param {Function} callback to be triggered when halted
 * @return {null}
 */
Led.prototype.halt = function(callback) {
  callback();
};

/**
 * Writes a HIGH (1) value to the pin, turning the LED on.
 *
 * Also sets `this.isHigh` to `true`.
 *
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
Led.prototype.turnOn = function(callback) {
  this.isHigh = true;
  this.connection.digitalWrite(this.pin, 1, callback);
};

/**
 * Writes a LOW (0) value to the pin, turning the LED off.
 *
 * Also sets `this.isHigh` to `false`.
 *
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
Led.prototype.turnOff = function(callback) {
  this.isHigh = false;
  this.connection.digitalWrite(this.pin, 0, callback);
};

/**
 * Toggles the LED on or off, depending on its current state
 *
 * @return {null}
 * @publish
 */
Led.prototype.toggle = function() {
  if (this.isHigh) {
    this.turnOff();
  } else {
    this.turnOn();
  }
};

/**
 * Returns the current brightness of the LED.
 *
 * @return {Number} the current LED brightness value (0-255)
 * @publish
 */
Led.prototype.currentBrightness = function() {
  return this.brightnessValue;
};

/**
 * Sets brightness of the LED to the specified value using PWM.
 *
 * @param {Number} value - PWM value to set the brightness to (0-255)
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
Led.prototype.brightness = function(value, callback) {
  var scaledDuty = (value).fromScale(this.pwmScale.bottom, this.pwmScale.top);

  this.connection.pwmWrite(
    this.pin,
    scaledDuty,
    this.freq,
    null,
    null,
    callback
  );

  this.brightnessValue = value;
};

/**
 * Returns whether or not the LED is currently on
 *
 * @return {Boolean} whether or not the LED is currently on
 * @publish
 */
Led.prototype.isOn = function(){
  return this.isHigh;
};

},{"cylon":44}],9:[function(require,module,exports){
/*
 * Cylon Makey Button driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

var events = [
  /**
   * Emitted when the Makey Button is pushed
   *
   * @event push
   */
  "push",

  /**
   * Emitted when the Makey Button is released
   *
   * @event release
   */
  "release"
];

/**
 * A Makey Button driver
 *
 * @constructor makey-button
 *
 * @param {Object} opts
 * @param {String|Number} opts.pin the pin to connect to
 */
var MakeyButton = module.exports = function MakeyButton() {
  MakeyButton.__super__.constructor.apply(this, arguments);

  this.isPressed = false;
  this.currentValue = 0;
  this.data = [];

  if (this.pin == null) {
    throw new Error("No pin specified for Makey Button. Cannot proceed");
  }

  this.events = events;
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(MakeyButton, Cylon.Driver);

/**
 * Starts the Makey Button
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
MakeyButton.prototype.start = function(callback) {
  this.connection.digitalRead(this.pin, function(err, data) {
    this.currentValue = data;
  }.bind(this));

  Cylon.Utils.every(50, function() {
    this.data.push(this.currentValue);
    if (this.data.length > 5) {
      this.data.shift();
    }

    if (this.averageData() <= 0.5 && !this.isPressed) {
      this.isPressed = true;
      this.emit("push");
    } else if (this.averageData() > 0.5 && this.isPressed) {
      this.isPressed = false;
      this.emit("release");
    }
  }.bind(this));

  callback();
};

/**
 * Stops the Makey Button
 *
 * @param {Function} callback to be triggered when halted
 * @return {null}
 */
MakeyButton.prototype.halt = function(callback) {
  callback();
};

/**
 * Averages read digital values
 *
 * @return {Number} averaged value
 */
MakeyButton.prototype.averageData = function() {
  var result = 0;

  if (this.data.length > 0) {
    this.data.forEach(function(n) { result += n; });
    result = result / this.data.length;
  }

  return result;
};

},{"cylon":44}],10:[function(require,module,exports){
/*
 * Maxbotix ultrasonic rangefinder driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

var events = [
  /**
   * Emitted when the Maxbotix has detected the current range
   *
   * @event range
   * @value distance the current distance in inches
   */
  "range",

  /**
   * Emitted when the Maxbotix has detected the current range
   *
   * @event rangeCm
   * @value distance the current distance in centimeters
   */
  "rangeCm",
];

/**
 * A Maxbotix driver
 *
 * @constructor maxbotix
 *
 * @param {Object} opts
 * @param {String|Number} opts.pin the pin to connect to
 */
var Maxbotix = module.exports = function Maxbotix(opts) {
  Maxbotix.__super__.constructor.apply(this, arguments);

  this.analogValue = 0;
  this.model = opts.model || "lv";

  if (this.pin == null) {
    throw new Error("No pin specified for Maxbotix. Cannot proceed");
  }

  this.commands = {
    range: this.range,
    rangeCm: this.rangeCm
  };

  this.events = events;
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(Maxbotix, Cylon.Driver);

/**
 * Starts the Maxbotix
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
Maxbotix.prototype.start = function(callback) {
  Cylon.Logger.debug("Maxbotix on pin " + this.pin + " started");

  this.connection.analogRead(this.pin, function(err, readVal) {
    this.analogValue = readVal;
    this.emit("range", this.range());
    this.emit("rangeCm", this.rangeCm());
  }.bind(this));

  callback();
};

/**
 * Stops the Maxbotix
 *
 * @param {Function} callback to be triggered when halted
 * @return {null}
 */
Maxbotix.prototype.halt = function(callback) {
  callback();
};

/**
 * Gets the distance measured by the sonar, in inches.
 *
 * @return {Number} the current measured distance, in inches
 * @publish
 */
Maxbotix.prototype.range = function() {
  var models = ["lv", "xl", "xl-long", "hr", "hr-long"],
      distance = this.rangeCm();

  if (models.indexOf(this.model) > -1) {
     distance = distance * 0.3937;
  }

  return distance;
};

/**
 * Gets the distance measured by the sonar, in centimeters.
 *
 * @return {Number} the current measured distance, in centimeters
 * @publish
 */
Maxbotix.prototype.rangeCm = function() {
  var distance;

  switch(this.model){
    case "lv":
      distance = (this.analogValue / 2.0) / 0.3937;
      break;
    case "xl-long":
      distance = this.analogValue * 2.0;
      break;
    case "hr":
      distance = this.analogValue * 0.5;
      break;
    case "xl":
    case "hr-long":
      distance = this.analogValue;
      break;
    default:
      distance = this.analogValue; // raw data, in case of unknown model
  }

  return distance;
};

},{"cylon":44}],11:[function(require,module,exports){
/*
 * Motor driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

/**
 * A Motor driver
 *
 * @constructor motor
 *
 * @param {Object} opts
 * @param {String|Number} opts.pin the pin to connect to
 * @param {Number} opts.freq
 * @param {Object=} opts.pwmScale
 * @param {Number} opts.pwmScale.bottom
 * @param {Number} opts.pwmScale.top
 */
var Motor = module.exports = function Motor(opts) {
  Motor.__super__.constructor.apply(this, arguments);

  this.freq = opts.freq || null;
  this.speedValue = 0;
  this.isOn = false;
  this.pwmScale = opts.pwmScale || { bottom: 0, top: 255 };

  if (this.pin == null) {
    throw new Error("No pin specified for Motor. Cannot proceed");
  }

  this.commands = {
    turn_on: this.turnOn,
    turn_off: this.turnOff,
    toggle: this.toggle,
    speed: this.speed,
    current_speed: this.currentSpeed
  };
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(Motor, Cylon.Driver);

/**
 * Starts the Motor
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
Motor.prototype.start = function(callback) {
  callback();
};

/**
 * Stops the Motor
 *
 * @param {Function} callback to be triggered when halted
 * @return {null}
 */
Motor.prototype.halt = function(callback) {
  callback();
};

/**
 * Turns the Motor on by writing a HIGH (1) value to the pin
 *
 * Also sets `this.isOn` to `true`.
 *
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
Motor.prototype.turnOn = function(callback) {
  this.isOn = true;
  this.connection.digitalWrite(this.pin, 1, callback);
};

/**
 * Turns the Motor off by writing a LOW (0) value to the pin
 *
 * Also sets `this.isOn` to `false`.
 *
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
Motor.prototype.turnOff = function(callback) {
  this.isOn = false;
  this.connection.digitalWrite(this.pin, 0, callback);
};

/**
 * Toggles the Motor on or off, depending on its current state
 *
 * @return {null}
 * @publish
 */
Motor.prototype.toggle = function() {
  if (this.isOn) {
    this.turnOff();
  } else {
    this.turnOn();
  }
};

/**
 * Returns the Motor's current speed value
 *
 * @return {Number} the current motor speed
 * @publish
 */
Motor.prototype.currentSpeed = function() {
  return this.speedValue;
};

// Public: Sets the speed of the motor to the value provided in the
// speed param, speed value must be an integer between 0 and 255.
//
// value- params
//
// Returns integer.

/**
 * Sets the Motor's speed to the PWM value provided (0-255)
 *
 * @param {Number} value PWM value to set the speed to (0-255)
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
Motor.prototype.speed = function(value, callback) {
  var scaledDuty = (value).fromScale(this.pwmScale.bottom, this.pwmScale.top);

  this.connection.pwmWrite(
    this.pin,
    scaledDuty,
    this. freq,
    null, null,
    callback
  );

  this.speedValue = value;
  this.isOn = this.speedValue > 0;
};

},{"cylon":44}],12:[function(require,module,exports){
/*
 * RGB LED strip driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

/**
 * RGB LED driver
 *
 * @constructor led
 *
 * @param {Object} opts
 * @param {String|Number} opts.redPin the red pin to connect to
 * @param {String|Number} opts.greenPin the green pin to connect to
 * @param {String|Number} opts.bluePin the blue pin to connect to
 */
var RGBLed = module.exports = function RGBLed(opts) {
  RGBLed.__super__.constructor.apply(this, arguments);

  this.redPin = opts.redPin || null;
  this.greenPin = opts.greenPin || null;
  this.bluePin = opts.bluePin || null;

  if (this.redPin == null) {
    throw new Error("No red pin specified for RGB LED. Cannot proceed");
  }

  if (this.greenPin == null) {
    throw new Error("No green pin specified for RGB LED. Cannot proceed");
  }

  if (this.bluePin == null) {
    throw new Error("No blue pin specified for RGB LED. Cannot proceed");
  }

  this.commands = {
    is_on: this.isOn,
    set_rgb: this.setRGB
  };
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(RGBLed, Cylon.Driver);

/**
 * Starts the RGBLed
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
RGBLed.prototype.start = function(callback) {
  callback();
};

/**
 * Stops the RGBLed
 *
 * @param {Function} callback to be triggered when halted
 * @return {null}
 */
RGBLed.prototype.halt = function(callback) {
  callback();
};

/**
 * Sets the RGB LED to a specific color
 *
 * @param {hex} The hex value for the LED e.g. 0xff00ff
 * @return {null}
 * @publish
 */
RGBLed.prototype.setRGB = function(hex) {
  var val = this._hexToRgb(hex);
  this.isHigh = true;
  this.connection.pwmWrite(this.redPin, val.r);
  this.connection.pwmWrite(this.greenPin, val.g);
  this.connection.pwmWrite(this.bluePin, val.b);
};


/**
 * Returns whether or not the RGB LED is currently on
 *
 * @return {Boolean} whether or not the LED is currently on
 * @publish
 */
RGBLed.prototype.isOn = function(){
  return this.isHigh;
};

RGBLed.prototype._hexToRgb = function(hex) {
  var param = hex.toString(16);
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(param);
  return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
  } : {r: 0, g: 0, b: 0};
};

},{"cylon":44}],13:[function(require,module,exports){
/*
 * Servo driver
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

/**
 * A Servo driver
 *
 * @constructor servo
 *
 * @param {Object} opts
 * @param {String|Number} opts.pin the pin to connect to
 * @param {Object=} opts.range
 * @param {Number} opts.range.min
 * @param {Number} opts.range.max
 * @param {Object=} opts.pulseWidth
 * @param {Number} opts.pulseWidth.min
 * @param {Number} opts.pulseWidth.max
 * @param {Object=} opts.pwmScale
 * @param {Number} opts.pwmScale.bottom
 * @param {Number} opts.pwmScale.top
 */
var Servo = module.exports = function Servo(opts) {
  Servo.__super__.constructor.apply(this, arguments);

  this.angleValue = 0;

  this.angleRange = opts.range || { min: 20, max: 160 };
  this.freq = opts.freq || null;
  this.pulseWidth = opts.pulseWidth || { min: 500, max: 2400 };
  this.pwmScale = opts.pwmScale || { bottom: 0, top: 180 };

  if (this.pin == null) {
    throw new Error("No pin specified for Servo. Cannot proceed");
  }

  this.commands = {
    angle: this.angle,
    current_angle: this.currentAngle
  };
};

/** Subclasses the Cylon.Driver class */
Cylon.Utils.subclass(Servo, Cylon.Driver);

/**
 * Starts the Servo
 *
 * @param {Function} callback to be triggered when started
 * @return {null}
 */
Servo.prototype.start = function(callback) {
  callback();
};

/**
 * Stop the Servo
 *
 * @param {Function} callback to be triggered when halted
 * @return {null}
 */
Servo.prototype.halt = function(callback) {
  callback();
};

/**
 * Returns the current angle of the Servo
 *
 * @return {Number} the current servo angle value (0-180)
 * @publish
 */
Servo.prototype.currentAngle = function() {
  return this.angleValue;
};

/**
 * Sets the angle of the servo to the provided value
 *
 * @param {Number} value - the angle to point the servo to (0-180)
 * @param {Function} [callback] - (err, val) triggers when write is complete
 * @return {null}
 * @publish
 */
Servo.prototype.angle = function(value, callback) {
  var scaledDuty = (this.safeAngle(value)).fromScale(
    this.pwmScale.bottom,
    this.pwmScale.top
  );

  this.connection.servoWrite(
    this.pin,
    scaledDuty,
    this.freq,
    this.pulseWidth,
    callback
  );
  this.angleValue = value;
};

// Public: Saves an specified angle, angle must be an
// integer value between 0 and 180.
//
// value - params
//
// Returns null.

/**
 * Given a servo angle, determines if it's safe or not, and returns a safe value
 *
 * @param {Number} value the angle the user wants to set the servo to
 * @return {Number} a made-safe angle to set the servo to
 * @publish
 */
Servo.prototype.safeAngle = function(value) {
  if (value < this.angleRange.min) {
    value = this.angleRange.min;
  } else {
    if (value > this.angleRange.max) {
      value = this.angleRange.max;
    }
  }
  return value;
};

},{"cylon":44}],14:[function(require,module,exports){
/*
 * Cylonjs Spark adaptor
 * http://cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon"),
    sparkApi = require("spark");

var Logger = Cylon.Logger;

/**
 * A Spark adaptor
 *
 * @constructor
 *
 * @param {Object} opts
 * @param {String} opts.deviceId
 * @param {String} opts.accessToken
 * @param {Number=} opts.readInterval
 */
var Spark = module.exports = function Spark(opts) {
  Spark.__super__.constructor.apply(this, arguments);

  opts = opts || {};

  this.deviceId = opts.deviceId;
  this.accessToken = opts.accessToken;

  if (this.deviceId == null || this.accessToken == null) {
    var err = "No deviceId and/or accessToken provided for Spark adaptor. ";
    err += "Cannot proceed";

    throw new Error(err);
  }

  this.readInterval = opts.readInterval || 2000;

  this.core = null;
  this.loginInfo = null;
};

Cylon.Utils.subclass(Spark, Cylon.Adaptor);

Spark.prototype.connect = function(callback) {
  var loginCallback = function(err, loginInfo) {
    if (!!err) {
      Logger.error("An error occured on login to Spark Cloud: ", err);
      callback(err, null);
      return;
    }

    this.loginInfo = loginInfo;

    sparkApi.getDevice(this.deviceId, function(err, core) {

      if (!!err) {
        Logger.error(
          "An error occured when retrieving core info from Spark Cloud: ",
          err
        );

        this.emit("error", err, core);
        callback(err, null);
        return;
      }

      this.core = core;

      callback(err, core);
    }.bind(this));
  }.bind(this);

  sparkApi.login({ accessToken: this.accessToken }, loginCallback);
};

Spark.prototype.disconnect = function(callback) {
  callback();
};

Spark.prototype.commands = [
  "connect",
  "digitalRead",
  "digitalWrite",
  "analogRead",
  "analogWrite",
  "pwmWrite",
  "servoWrite",
  "command",
  "callFunction",
  "variable",
  "getVariable",
  "onEvent",
  "coreAttrs"
];

var SERVO_PINS = {
  "A0": "S0",
  "A1": "S1",
  "A4": "S4",
  "A5": "S5",
  "A6": "S6",
  "A7": "S7",
  "D0": "S8",
  "D1": "S9"
};

/**
 * Calls a function on the Spark Core
 *
 * @param {String} functionName name of the function to call
 * @param {String[]} args arguments to pass to the function call
 * @param {Function} callback optional callback to be triggered with the
 * response_value from the API
 * @return {null}
 * @publish
 */
Spark.prototype.callFunction = function(functionName, args, callback) {
  args = args || [];

  var params = args.join(",");

  this.core.callFunction(functionName, params, callback);
};

/**
 * Alias to `#callFunction`
 *
 * @see callFunction
 */
Spark.prototype.command = Spark.prototype.callFunction;

/**
 * Requests the value of a variable from the Spark Core.
 *
 * @param {String} varName name of the variable to request
 * @param {Function} callback function to be triggered with the value
 * @return {null}
 * @publish
 */
Spark.prototype.getVariable = function(varName, callback) {
  // Spark's API truncates variable names after the 12th character.
  // So a variable called 'temperature_sensor' would be accessible via
  // 'temperature_'.
  varName = varName.substring(0, 12);

  this.core.getVariable(varName, callback);
};

Spark.prototype.variable = Spark.prototype.getVariable;

/**
 * Adds an event listener to a specified event on the Spark Core.
 *
 * Emits the same event from the adaptor.
 *
 * @param {String} varName name of the event to listen for
 * @param {Function} callback function to be triggered when the event is emitted
 * @return {null}
 * @publish
 */
Spark.prototype.onEvent = function(eventName, callback) {
  this.core.onEvent(eventName, function(err, event) {
    this.emit(eventName, event);
    if ("function" === typeof(callback)) { callback(err, event); }
  }.bind(this));
};

/**
 * Reads a value from a digital pin
 *
 * @param {Number} pin
 * @param {Function} callback triggered when the value has been read from the
 * pin
 * @return {null}
 * @publish
 */
Spark.prototype.digitalRead = function(pin, callback) {
  this._read("digitalread", pin, callback);
};

/**
 * Reads a value from an analog pin
 *
 * @param {Number} pin
 * @param {Function} callback triggered when the value has been read from the
 * pin
 * @return {null}
 * @publish
 */
Spark.prototype.analogRead = function(pin, callback) {
  this._read("analogread", pin, callback);
};

Spark.prototype._read = function(type, pin, callback) {
  var requestInProgress = false;

  var complete = function(err, data) {
    var value = null;
    requestInProgress = false;

    if (!err && (data != null) && (data.return_value != null)) {
      value = data.return_value;
    }
    if ("function" === typeof(callback)) {
      callback(err, value);
    }
  };

  Cylon.Utils.every(this.readInterval, function() {
    if (!requestInProgress) {
      requestInProgress = true;
      this.core.callFunction(type, pin, complete);
    }
  }.bind(this));
};

/**
 * Writes a value to a digital pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @param {Function} callback
 * @return {null}
 * @publish
 */
Spark.prototype.digitalWrite = function(pin, value, callback) {
  var params = pin + "," + this.pinVal(value);

  this.core.callFunction("digitalwrite", params, callback);
};

/**
 * Writes a value to an analog pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @param {Function} callback
 * @return {null}
 * @publish
 */
Spark.prototype.analogWrite = function(pin, value, callback) {
  var params = pin + "," + value;

  this.core.callFunction("analogwrite", params, callback);
};

/**
 * Writes a PWM value to a pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @param {Function} callback
 * @return {null}
 * @publish
 */
Spark.prototype.pwmWrite = function(pin, value, callback) {
  value = (value).toScale(0, 255);
  this.analogWrite(pin, value, callback);
};

/**
 * Writes a servo value to a pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @param {Function} callback
 * @return {null}
 * @publish
 */
Spark.prototype.servoWrite = function(pin, value, callback) {
  value = (value).toScale(0, 180);
  pin = SERVO_PINS[pin];

  this.analogWrite(pin, value, callback);
};

/**
 * Returns attributes of the Spark Core
 *
 * @return {Object} attributes
 * @publish
 */
Spark.prototype.coreAttrs = function() {
  return this.core.attributes;
};

/**
 * Checks if a value is HIGH or LOW
 *
 * @param {Number} value 1 or 0 value to check
 * @return {String} 'LOW' or 'HIGH'
 * @publish
 */
Spark.prototype.pinVal = function(value) {
  return (value === 1) ? "HIGH" : "LOW";
};

},{"cylon":44,"spark":21}],15:[function(require,module,exports){
/*
 * Cylonjs Spark connection
 * http://cylonjs.com
 *
 * Copyright (c) 2013 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Cylon = require("cylon");

/**
 * A Spark driver
 *
 * @constructor
 */
var Spark = module.exports = function() {
  Spark.__super__.constructor.apply(this, arguments);

  this.commands = {
    core: this.core,
    digitalRead: this.digitalRead,
    digitalWrite: this.digitalWrite,
    analogRead: this.analogRead,
    analogWrite: this.analogWrite,
    pwmWrite: this.pwmWrite,
    servoWrite: this.servoWrite,
    callFunction: this.callFunction,
    command: this.command,
    getVariable: this.getVariable,
    variable: this.variable,
    onEvent: this.onEvent
  };
};

Cylon.Utils.subclass(Spark, Cylon.Driver);

Spark.prototype.start = function(callback) {
  callback();
};

Spark.prototype.halt = function(callback) {
  callback();
};

/**
 * Returns attributes of the Spark Core
 *
 * @return {Object} attributes
 * @publish
 */
Spark.prototype.core = function() {
  return this.connection.coreAttrs();
};

/**
 * Reads a value from a digital pin
 *
 * @param {Number} pin
 * @param {Function} callback triggered when the value has been read from the
 * pin
 * @return {null}
 * @publish
 */
Spark.prototype.digitalRead = function(pin, callback) {
  this.connection.digitalRead(pin, callback);
};

/**
 * Writes a value to a digital pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @param {Function} callback
 * @return {null}
 * @publish
 */
Spark.prototype.digitalWrite = function(pin, val, callback) {
  this.connection.digitalWrite(pin, val, callback);
};

/**
 * Reads a value from an analog pin
 *
 * @param {Number} pin
 * @param {Function} callback triggered when the value has been read from the
 * pin
 * @return {null}
 * @publish
 */
Spark.prototype.analogRead = function(pin, callback) {
  this.connection.analogRead(pin, callback);
};

/**
 * Writes a value to an analog pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @param {Function} callback
 * @return {null}
 * @publish
 */
Spark.prototype.analogWrite = function(pin, val, callback) {
  this.connection.analogWrite(pin, val, callback);
};

/**
 * Writes a PWM value to a pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @param {Function} callback
 * @return {null}
 * @publish
 */
Spark.prototype.pwmWrite = function(pin, val, callback) {
  this.connection.pwmWrite(pin, val, callback);
};

/**
 * Writes a servo value to a pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @param {Function} callback
 * @return {null}
 * @publish
 */
Spark.prototype.servoWrite = function(pin, val, callback) {
  this.connection.servoWrite(pin, val, callback);
};

/**
 * Calls a function on the Spark Core
 *
 * @param {String} functionName name of the function to call
 * @param {String[]} args arguments to pass to the function call
 * @param {Function} callback optional callback to be triggered with the
 * response_value from the API
 * @return {null}
 * @publish
 */
Spark.prototype.callFunction = function(funcName, args, callback) {
  this.connection.callFunction(funcName, args, callback);
};

/**
 * Alias to `#callFunction`
 *
 * @see callFunction
 */
Spark.prototype.command = Spark.prototype.callFunction;

/**
 * Requests the value of a variable from the Spark Core.
 *
 * @param {String} varName name of the variable to request
 * @param {Function} callback function to be triggered with the value
 * @return {null}
 * @publish
 */
Spark.prototype.getVariable = function(varName, callback) {
  this.connection.getVariable(varName, callback);
};

/**
 * Alias to `#getVariable`
 *
 * @see getVariable
 */
Spark.prototype.variable = Spark.prototype.getVariable;

/**
 * Adds an event listener to a specified event on the Spark Core.
 *
 * Emits the same event from the adaptor.
 *
 * @param {String} varName name of the event to listen for
 * @param {Function} callback function to be triggered when the event is emitted
 * @return {null}
 * @publish
 */
Spark.prototype.onEvent = function(eventName, callback) {
  this.connection.onEvent(eventName, callback);
};

},{"cylon":44}],16:[function(require,module,exports){
/*
 * Cylonjs VoodooSpark adaptor
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var SparkIO = require("spark-io");

var Cylon = require("cylon");

/**
 * A VoodooSpark adaptor
 *
 * @constructor
 *
 * @param {Object} opts
 * @param {String} opts.deviceId
 * @param {String} opts.accessToken
 */
var VoodooSpark = module.exports = function VoodooSpark(opts) {
  VoodooSpark.__super__.constructor.apply(this, arguments);

  opts = opts || {};

  this.analogWrite = this.analogWrite.bind(this);

  this.deviceId = opts.deviceId;
  this.accessToken = opts.accessToken;

  if (this.deviceId == null || this.accessToken == null) {
    var e = "No deviceId and/or accessToken provided for VoodooSpark adaptor. ";
    e += "Cannot proceed";

    throw new Error(e);
  }
};

Cylon.Utils.subclass(VoodooSpark, Cylon.Adaptor);

VoodooSpark.prototype.commands = [
  "digitalRead",
  "digitalWrite",
  "analogRead",
  "analogWrite",
  "pwmWrite",
  "servoWrite"
];

VoodooSpark.prototype.connect = function(callback) {
  this.board = this._sparkio();

  this.board.on("ready", function() {
    callback();
  });
};

VoodooSpark.prototype.disconnect = function(callback) {
  callback();
};

/**
 * Reads a value from a digital pin
 *
 * @param {Number} pin
 * @param {Function} callback triggered when the value has been read from the
 * pin
 * @return {null}
 * @publish
 */
VoodooSpark.prototype.digitalRead = function(pin, callback) {
  this.board.pinMode(pin, this.board.MODES.INPUT);
  this.board.digitalRead(pin, function(data) {
    callback(null, data);
  });
};

/**
 * Reads a value from an analog pin
 *
 * @param {Number} pin
 * @param {Function} callback triggered when the value has been read from the
 * pin
 * @return {null}
 * @publish
 */
VoodooSpark.prototype.analogRead = function(pin, callback) {
  this.board.pinMode(pin, this.board.MODES.ANALOG);
  this.board.analogRead(pin, function(data) {
    callback(null, data);
  });
};

/**
 * Writes a value to a digital pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @return {null}
 * @publish
 */
VoodooSpark.prototype.digitalWrite = function(pin, value) {
  this.board.pinMode(pin, this.board.MODES.OUTPUT);
  this.board.digitalWrite(pin, value);
};

/**
 * Writes a value to an analog pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @return {null}
 * @publish
 */
VoodooSpark.prototype.analogWrite = function(pin, value) {
  this._write(this.board.MODES.PWM, 255, pin, value);
};

/**
 * Writes a PWM value to a pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @return {null}
 * @publish
 */
VoodooSpark.prototype.pwmWrite = function(pin, value) {
  this._write(this.board.MODES.PWM, 255, pin, value);
};

/**
 * Writes a servo value to a pin
 *
 * @param {Number} pin
 * @param {Number} value
 * @return {null}
 * @publish
 */
VoodooSpark.prototype.servoWrite = function(pin, value) {
 this._write(this.board.MODES.SERVO, 180, pin, value);
};

VoodooSpark.prototype._write = function(type, scale, pin, value) {
  value = (value).toScale(0, scale);
  this.board.pinMode(pin, type);

  switch(type){
    case this.board.MODES.SERVO:
      this.board.servoWrite(pin, value);
      break;
    case this.board.MODES.PWM:
      this.board.analogWrite(pin, value);
      break;
  }
};

/**
 * Checks if a value is HIGH or LOW
 *
 * @param {Number} value 1 or 0 value to check
 * @return {String} 'LOW' or 'HIGH'
 * @publish
 */
VoodooSpark.prototype.pinVal = function(value) {
  return (value === 1) ? "HIGH" : "LOW";
};

VoodooSpark.prototype._sparkio = function() {
  return new SparkIO({
    token: this.accessToken,
    deviceId: this.deviceId
  });
};



},{"cylon":44,"spark-io":17}],17:[function(require,module,exports){
(function (Buffer){
var es6 = require("es6-shim");
var net = require("net");
var Emitter = require("events").EventEmitter;
var https = require("https");
var priv = new Map();

var errors = {
  cloud: "Unable to connect to spark cloud.",
  firmware: "Unable to connect to the voodoospark firmware, has it been loaded?",
  instance: "Expected instance of Spark.",
  pwm: "PWM is only available on D0, D1, A0, A1, A4, A5, A6, A7"
};

var pins = [
  { id: "D0", modes: [0, 1, 3, 4] },
  { id: "D1", modes: [0, 1, 3, 4] },
  { id: "D2", modes: [0, 1] },
  { id: "D3", modes: [0, 1] },
  { id: "D4", modes: [0, 1] },
  { id: "D5", modes: [0, 1] },
  { id: "D6", modes: [0, 1] },
  { id: "D7", modes: [0, 1] },

  { id: "", modes: [] },
  { id: "", modes: [] },

  { id: "A0", modes: [0, 1, 2, 3, 4] },
  { id: "A1", modes: [0, 1, 2, 3, 4] },
  { id: "A2", modes: [0, 1, 2] },
  { id: "A3", modes: [0, 1, 2] },
  { id: "A4", modes: [0, 1, 2, 3, 4] },
  { id: "A5", modes: [0, 1, 2, 3, 4] },
  { id: "A6", modes: [0, 1, 2, 3, 4] },
  { id: "A7", modes: [0, 1, 2, 3, 4] }
];

var modes = Object.freeze({
  INPUT: 0,
  OUTPUT: 1,
  ANALOG: 2,
  PWM: 3,
  SERVO: 4
});

var modesMap = [
  "INPUT",
  "OUTPUT",
  "ANALOG",
  "PWM",
  "SERVO"
];

var DIGITAL_READ = 0x03;
var ANALOG_READ = 0x04;
var REPORTING = 0x05;

function service(deviceId) {
  return "https://api.spark.io/v1/devices/" + deviceId + "/";
}

function from7BitBytes(lsb, msb) {
  if (Array.isArray(lsb)) {
    msb = lsb[1];
    lsb = lsb[0];
  }
  return lsb | (msb << 0x07);
}

function to7BitBytes(value) {
  return [value & 0x7f, value >> 0x07 & 0x7f];
}


function processReceived(spark, data) {
  var dlength = data.length;
  var length, action, pin, pinName, pinIndex, port,
      lsb, msb, value, portValue, type, event;

  for (var i = 0; i < dlength; i++) {
    spark.buffer.push(data.readUInt8(i));
  }

  length = spark.buffer.length;

  if (length >= 4) {

    while (length && (length % 4) === 0) {
      action = spark.buffer.shift();
      pin = spark.buffer.shift();
      lsb = spark.buffer.shift();
      msb = spark.buffer.shift();

      value = from7BitBytes(lsb, msb);

      // Digital reads are allowed to be
      // reported on Analog pins
      //
      if (action === REPORTING) {
        port = +pin;
        portValue = +value;

        for (var k = 0; k < 8; k++) {
          pinIndex = k + (10 * port);
          event = "digital-read-" + (port ? "A" : "D") + k;
          value = portValue & (1 << k);

          if (typeof spark._events[event] !== "undefined") {
            spark.pins[pinIndex].value = value;
            spark.emit(event, value);
          }
        }
      }

      if (action === DIGITAL_READ ||
          action === ANALOG_READ) {

        if (action === ANALOG_READ) {
          pinName = "A" + (pin - 10);
          type = "analog";

          // This shifts the value 2 places to the left
          // for compatibility with firmata's 10-bit ADC
          // analog values. In the future it might be nice
          // to allow some
          value >>= 2;
        }

        if (action === DIGITAL_READ) {
          pinName = "D" + pin;
          type = "digital";
        }

        event = type + "-read-" + pinName;

        spark.pins[pin].value = value;
        spark.emit(event, value);
      }

      length = spark.buffer.length;
    }
  }
}

function Spark(opts) {
  Emitter.call(this);

  if (!(this instanceof Spark)) {
    return new Spark(opts);
  }

  var state = {
    isConnected: false,
    isReading: false,
    deviceId: opts.deviceId,
    token: opts.token,
    service: service(opts.deviceId),
    host: opts.host || null,
    port: opts.port || 8001,
    client: null,
    socket: null
  };

  this.name = "spark-io";
  this.buffer = [];
  this.isReady = false;

  this.pins = pins.map(function(pin) {
    return {
      name: pin.id,
      supportedModes: pin.modes,
      mode: pin.modes[0],
      value: 0
    };
  });

  this.analogPins = this.pins.slice(10).map(function(pin, i) {
    return i;
  });

  // Store private state
  priv.set(this, state);

  var afterCreate = function(error) {
    if (error) {
      this.emit("error", error);
    } else {
      state.isConnected = true;
      this.emit("connect");
    }
  }.bind(this);

  this.connect(function(error, data) {
    // console.log( "connect -> connect -> handler" );

    if (error !== undefined && error !== null) {
      this.emit("error", error);
    } else if (data.cmd !== "VarReturn") {
      this.emit("error", errors.firmware);
    } else {
      var address = data.result.split(":");
      state.host = address[0];
      state.port = parseInt(address[1], 10);
      // Moving into after connect so we can obtain the ip address
      Spark.Client.create(this, afterCreate);
    }
  }.bind(this));
}


Spark.Client = {
  create: function(spark, afterCreate) {
    if (!(spark instanceof Spark)) {
      throw new Error(errors.instance);
    }
    var state = priv.get(spark);
    var connection = {
      host: state.host,
      port: state.port
    };

    var socket = net.connect(connection, function() {
      // Set ready state bit
      spark.isReady = true;
      spark.emit("ready");

      if (!state.isReading) {
        state.isReading = true;
        socket.on("data", function(data) {
          processReceived(spark, data);
        });
      }
    });
    state.socket = socket;

    afterCreate();
  }
};

Spark.prototype = Object.create(Emitter.prototype, {
  constructor: {
    value: Spark
  },
  MODES: {
    value: modes
  },
  HIGH: {
    value: 1
  },
  LOW: {
    value: 0
  }
});

Spark.prototype.connect = function(handler) {
  var state = priv.get(this);
  var url = state.service;
  var action = "endpoint";
  var request;

  if (state.isConnected) {
    return this;
  }
  handler = handler.bind(this);

  request = https.get(url + action + "?access_token=" + state.token, function(res) {
    var body = "", err;
    res.on("data", function(d) {
      body += d;
    });
    res.on("end", function () {
      if (res.statusCode === 200) {
          var data = JSON.parse(body);
          if (data.error) {
            err = "ERROR: " + data.code + " " + data.error_description;
          }
          if (handler) {
            handler(err, data);
          }
      } else {
        err = errors.cloud + ": code: " + res.statusCode;
        if (handler) {
          handler(new Error(err));
        } else {
          throw new Error(err);
        }
      }
    });
  });

  return this;
};

Spark.prototype.pinMode = function(pin, mode) {
  var state = priv.get(this);
  var buffer;
  var offset;
  var pinInt;
  var sMode;

  sMode = mode = +mode;

  // Normalize when the mode is ANALOG (2)
  if (mode === 2) {
    // Normalize to pin string name if numeric pin
    if (typeof pin === "number") {
      pin = "A" + pin;
    }
  }

  // For PWM (3), writes will be executed via analogWrite
  if (mode === 3) {
    sMode = 1;
  }

  offset = pin[0] === "A" ? 10 : 0;
  pinInt = (pin.replace(/A|D/, "") | 0) + offset;

  // Throw if attempting to create a PWM or SERVO on an incapable pin
  // True PWM (3) is CONFIRMED available on:
  //
  //     D0, D1, A0, A1, A5
  //
  //
  if (this.pins[pinInt].supportedModes.indexOf(mode) === -1) {
    throw new Error("Unsupported pin mode: " + modesMap[mode] + " for " + pin);
  }

  // Track the mode that user expects to see.
  this.pins[pinInt].mode = mode;

  // Send the coerced mode
  buffer = new Buffer([ 0x00, pinInt, sMode ]);

  // console.log(buffer);
  state.socket.write(buffer);

  return this;
};

["analogWrite", "digitalWrite", "servoWrite"].forEach(function(fn) {
  var isAnalog = fn === "analogWrite";
  var isServo = fn === "servoWrite";
  var action = isAnalog ? 0x02 : (isServo ? 0x41 : 0x01);

  Spark.prototype[fn] = function(pin, value) {
    var state = priv.get(this);
    var buffer = new Buffer(3);
    var offset = pin[0] === "A" ? 10 : 0;
    var pinInt = (pin.replace(/A|D/i, "") | 0) + offset;

    buffer[0] = action;
    buffer[1] = pinInt;
    buffer[2] = value;

    // console.log(buffer);
    state.socket.write(buffer);
    this.pins[pinInt].value = value;

    return this;
  };
});

// TODO: Define protocol for gather this information.
["analogRead", "digitalRead"].forEach(function(fn) {
  var isAnalog = fn === "analogRead";
  // Use 0x05 to get a continuous read.
  var action = 0x05;
  // var action = isAnalog ? 0x04 : 0x03;
  // var offset = isAnalog ? 10 : 0;
  var value = isAnalog ? 2 : 1;
  var type = isAnalog ? "analog" : "digital";

  Spark.prototype[fn] = function(pin, handler) {
    var state = priv.get(this);
    var buffer = new Buffer(3);
    var pinInt;
    var event;

    if (isAnalog && typeof pin === "number") {
      pin = "A" + pin;
    }
    var offset = pin[0] === "A" ? 10 : 0;
    pinInt = (pin.replace(/A|D/i, "") | 0) + offset;
    event = type + "-read-" + pin;

    buffer[0] = action;
    buffer[1] = pinInt;
    buffer[2] = value;

    // register a handler for
    this.on(event, handler);

    if (!state.isReading) {
      state.isReading = true;
      state.socket.on("data", function(data) {
        processReceived(this, data);
      }.bind(this));
    }

    // Tell the board we have a new pin to read
    state.socket.write(buffer);

    return this;
  };
});

/**
 * Compatibility Shimming
 */
Spark.prototype.setSamplingInterval = function(interval) {
  var state = priv.get(this);
  var safeInterval = Math.max(Math.min(Math.pow(2, 14) - 1, interval), 10);

  priv.get(this).interval = safeInterval;

  state.socket.write(new Buffer([0x06].concat(to7BitBytes(safeInterval))));

  return this;
};

Spark.prototype.reset = function() {
  return this;
};

Spark.prototype.close = function() {
  var state = priv.get(this);
  state.socket.close();
  state.server.close();
};



module.exports = Spark;

}).call(this,require("buffer").Buffer)
},{"buffer":64,"es6-shim":18,"events":68,"https":73,"net":62}],18:[function(require,module,exports){
(function (process){
 /*!
  * https://github.com/paulmillr/es6-shim
  * @license es6-shim Copyright 2013-2015 by Paul Miller (http://paulmillr.com)
  *   and contributors,  MIT License
  * es6-shim: v0.27.1
  * see https://github.com/paulmillr/es6-shim/blob/0.27.1/LICENSE
  * Details and documentation:
  * https://github.com/paulmillr/es6-shim/
  */

// UMD (Universal Module Definition)
// see https://github.com/umdjs/umd/blob/master/returnExports.js
(function (root, factory) {
  /*global define, module, exports */
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like enviroments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.returnExports = factory();
  }
}(this, function () {
  'use strict';

  var isCallableWithoutNew = function (func) {
    try {
      func();
    } catch (e) {
      return false;
    }
    return true;
  };

  var supportsSubclassing = function (C, f) {
    /* jshint proto:true */
    try {
      var Sub = function () { C.apply(this, arguments); };
      if (!Sub.__proto__) { return false; /* skip test on IE < 11 */ }
      Object.setPrototypeOf(Sub, C);
      Sub.prototype = Object.create(C.prototype, {
        constructor: { value: C }
      });
      return f(Sub);
    } catch (e) {
      return false;
    }
  };

  var arePropertyDescriptorsSupported = function () {
    try {
      Object.defineProperty({}, 'x', {});
      return true;
    } catch (e) { /* this is IE 8. */
      return false;
    }
  };

  var startsWithRejectsRegex = function () {
    var rejectsRegex = false;
    if (String.prototype.startsWith) {
      try {
        '/a/'.startsWith(/a/);
      } catch (e) { /* this is spec compliant */
        rejectsRegex = true;
      }
    }
    return rejectsRegex;
  };

  /*jshint evil: true */
  var getGlobal = new Function('return this;');
  /*jshint evil: false */

  var globals = getGlobal();
  var global_isFinite = globals.isFinite;
  var supportsDescriptors = !!Object.defineProperty && arePropertyDescriptorsSupported();
  var startsWithIsCompliant = startsWithRejectsRegex();
  var _indexOf = Function.call.bind(String.prototype.indexOf);
  var _toString = Function.call.bind(Object.prototype.toString);
  var _hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
  var ArrayIterator; // make our implementation private
  var noop = function () {};

  var Symbol = globals.Symbol || {};
  var symbolSpecies = Symbol.species || '@@species';
  var Type = {
    object: function (x) { return x !== null && typeof x === 'object'; },
    string: function (x) { return _toString(x) === '[object String]'; },
    regex: function (x) { return _toString(x) === '[object RegExp]'; },
    symbol: function (x) {
      /*jshint notypeof: true */
      return typeof globals.Symbol === 'function' && typeof x === 'symbol';
      /*jshint notypeof: false */
    }
  };

  var defineProperty = function (object, name, value, force) {
    if (!force && name in object) { return; }
    if (supportsDescriptors) {
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: value
      });
    } else {
      object[name] = value;
    }
  };

  var Value = {
    getter: function (object, name, getter) {
      if (!supportsDescriptors) {
        throw new TypeError('getters require true ES5 support');
      }
      Object.defineProperty(object, name, {
        configurable: true,
        enumerable: false,
        get: getter
      });
    },
    proxy: function (originalObject, key, targetObject) {
      if (!supportsDescriptors) {
        throw new TypeError('getters require true ES5 support');
      }
      var originalDescriptor = Object.getOwnPropertyDescriptor(originalObject, key);
      Object.defineProperty(targetObject, key, {
        configurable: originalDescriptor.configurable,
        enumerable: originalDescriptor.enumerable,
        get: function getKey() { return originalObject[key]; },
        set: function setKey(value) { originalObject[key] = value; }
      });
    },
    redefine: function (object, property, newValue) {
      if (supportsDescriptors) {
        var descriptor = Object.getOwnPropertyDescriptor(object, property);
        descriptor.value = newValue;
        Object.defineProperty(object, property, descriptor);
      } else {
        object[property] = newValue;
      }
    },
    preserveToString: function (target, source) {
      defineProperty(target, 'toString', source.toString.bind(source), true);
    }
  };

  // Define configurable, writable and non-enumerable props
  // if they don’t exist.
  var defineProperties = function (object, map) {
    Object.keys(map).forEach(function (name) {
      var method = map[name];
      defineProperty(object, name, method, false);
    });
  };

  // Simple shim for Object.create on ES3 browsers
  // (unlike real shim, no attempt to support `prototype === null`)
  var create = Object.create || function (prototype, properties) {
    function Prototype() {}
    Prototype.prototype = prototype;
    var object = new Prototype();
    if (typeof properties !== 'undefined') {
      defineProperties(object, properties);
    }
    return object;
  };

  // This is a private name in the es6 spec, equal to '[Symbol.iterator]'
  // we're going to use an arbitrary _-prefixed name to make our shims
  // work properly with each other, even though we don't have full Iterator
  // support.  That is, `Array.from(map.keys())` will work, but we don't
  // pretend to export a "real" Iterator interface.
  var $iterator$ = Type.symbol(Symbol.iterator) ? Symbol.iterator : '_es6-shim iterator_';
  // Firefox ships a partial implementation using the name @@iterator.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=907077#c14
  // So use that name if we detect it.
  if (globals.Set && typeof new globals.Set()['@@iterator'] === 'function') {
    $iterator$ = '@@iterator';
  }
  var addIterator = function (prototype, impl) {
    if (!impl) { impl = function iterator() { return this; }; }
    var o = {};
    o[$iterator$] = impl;
    defineProperties(prototype, o);
    if (!prototype[$iterator$] && Type.symbol($iterator$)) {
      // implementations are buggy when $iterator$ is a Symbol
      prototype[$iterator$] = impl;
    }
  };

  // taken directly from https://github.com/ljharb/is-arguments/blob/master/index.js
  // can be replaced with require('is-arguments') if we ever use a build process instead
  var isArguments = function isArguments(value) {
    var str = _toString(value);
    var result = str === '[object Arguments]';
    if (!result) {
      result = str !== '[object Array]' &&
        value !== null &&
        typeof value === 'object' &&
        typeof value.length === 'number' &&
        value.length >= 0 &&
        _toString(value.callee) === '[object Function]';
    }
    return result;
  };

  var safeApply = Function.call.bind(Function.apply);

  var ES = {
    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-call-f-v-args
    Call: function Call(F, V) {
      var args = arguments.length > 2 ? arguments[2] : [];
      if (!ES.IsCallable(F)) {
        throw new TypeError(F + ' is not a function');
      }
      return safeApply(F, V, args);
    },

    RequireObjectCoercible: function (x, optMessage) {
      /* jshint eqnull:true */
      if (x == null) {
        throw new TypeError(optMessage || 'Cannot call method on ' + x);
      }
    },

    TypeIsObject: function (x) {
      /* jshint eqnull:true */
      // this is expensive when it returns false; use this function
      // when you expect it to return true in the common case.
      return x != null && Object(x) === x;
    },

    ToObject: function (o, optMessage) {
      ES.RequireObjectCoercible(o, optMessage);
      return Object(o);
    },

    IsCallable: function (x) {
      // some versions of IE say that typeof /abc/ === 'function'
      return typeof x === 'function' && _toString(x) === '[object Function]';
    },

    ToInt32: function (x) {
      return ES.ToNumber(x) >> 0;
    },

    ToUint32: function (x) {
      return ES.ToNumber(x) >>> 0;
    },

    ToNumber: function (value) {
      if (_toString(value) === '[object Symbol]') {
        throw new TypeError('Cannot convert a Symbol value to a number');
      }
      return +value;
    },

    ToInteger: function (value) {
      var number = ES.ToNumber(value);
      if (Number.isNaN(number)) { return 0; }
      if (number === 0 || !Number.isFinite(number)) { return number; }
      return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
    },

    ToLength: function (value) {
      var len = ES.ToInteger(value);
      if (len <= 0) { return 0; } // includes converting -0 to +0
      if (len > Number.MAX_SAFE_INTEGER) { return Number.MAX_SAFE_INTEGER; }
      return len;
    },

    SameValue: function (a, b) {
      if (a === b) {
        // 0 === -0, but they are not identical.
        if (a === 0) { return 1 / a === 1 / b; }
        return true;
      }
      return Number.isNaN(a) && Number.isNaN(b);
    },

    SameValueZero: function (a, b) {
      // same as SameValue except for SameValueZero(+0, -0) == true
      return (a === b) || (Number.isNaN(a) && Number.isNaN(b));
    },

    IsIterable: function (o) {
      return ES.TypeIsObject(o) && (typeof o[$iterator$] !== 'undefined' || isArguments(o));
    },

    GetIterator: function (o) {
      if (isArguments(o)) {
        // special case support for `arguments`
        return new ArrayIterator(o, 'value');
      }
      var itFn = o[$iterator$];
      if (!ES.IsCallable(itFn)) {
        throw new TypeError('value is not an iterable');
      }
      var it = itFn.call(o);
      if (!ES.TypeIsObject(it)) {
        throw new TypeError('bad iterator');
      }
      return it;
    },

    IteratorNext: function (it) {
      var result = arguments.length > 1 ? it.next(arguments[1]) : it.next();
      if (!ES.TypeIsObject(result)) {
        throw new TypeError('bad iterator');
      }
      return result;
    },

    Construct: function (C, args) {
      // CreateFromConstructor
      var obj;
      if (ES.IsCallable(C[symbolSpecies])) {
        obj = C[symbolSpecies]();
      } else {
        // OrdinaryCreateFromConstructor
        obj = create(C.prototype || null);
      }
      // Mark that we've used the es6 construct path
      // (see emulateES6construct)
      defineProperties(obj, { _es6construct: true });
      // Call the constructor.
      var result = ES.Call(C, obj, args);
      return ES.TypeIsObject(result) ? result : obj;
    },

    CreateHTML: function (string, tag, attribute, value) {
      var S = String(string);
      var p1 = '<' + tag;
      if (attribute !== '') {
        var V = String(value);
        var escapedV = V.replace(/"/g, '&quot;');
        p1 += ' ' + attribute + '="' + escapedV + '"';
      }
      var p2 = p1 + '>';
      var p3 = p2 + S;
      return p3 + '</' + tag + '>';
    }
  };

  var emulateES6construct = function (o) {
    if (!ES.TypeIsObject(o)) { throw new TypeError('bad object'); }
    // es5 approximation to es6 subclass semantics: in es6, 'new Foo'
    // would invoke Foo.@@species to allocation/initialize the new object.
    // In es5 we just get the plain object.  So if we detect an
    // uninitialized object, invoke o.constructor.@@species
    if (!o._es6construct) {
      if (o.constructor && ES.IsCallable(o.constructor[symbolSpecies])) {
        o = o.constructor[symbolSpecies](o);
      }
      defineProperties(o, { _es6construct: true });
    }
    return o;
  };


  var numberConversion = (function () {
    // from https://github.com/inexorabletash/polyfill/blob/master/typedarray.js#L176-L266
    // with permission and license, per https://twitter.com/inexorabletash/status/372206509540659200

    function roundToEven(n) {
      var w = Math.floor(n), f = n - w;
      if (f < 0.5) {
        return w;
      }
      if (f > 0.5) {
        return w + 1;
      }
      return w % 2 ? w + 1 : w;
    }

    function packIEEE754(v, ebits, fbits) {
      var bias = (1 << (ebits - 1)) - 1,
        s, e, f,
        i, bits, str, bytes;

      // Compute sign, exponent, fraction
      if (v !== v) {
        // NaN
        // http://dev.w3.org/2006/webapi/WebIDL/#es-type-mapping
        e = (1 << ebits) - 1;
        f = Math.pow(2, fbits - 1);
        s = 0;
      } else if (v === Infinity || v === -Infinity) {
        e = (1 << ebits) - 1;
        f = 0;
        s = (v < 0) ? 1 : 0;
      } else if (v === 0) {
        e = 0;
        f = 0;
        s = (1 / v === -Infinity) ? 1 : 0;
      } else {
        s = v < 0;
        v = Math.abs(v);

        if (v >= Math.pow(2, 1 - bias)) {
          e = Math.min(Math.floor(Math.log(v) / Math.LN2), 1023);
          f = roundToEven(v / Math.pow(2, e) * Math.pow(2, fbits));
          if (f / Math.pow(2, fbits) >= 2) {
            e = e + 1;
            f = 1;
          }
          if (e > bias) {
            // Overflow
            e = (1 << ebits) - 1;
            f = 0;
          } else {
            // Normal
            e = e + bias;
            f = f - Math.pow(2, fbits);
          }
        } else {
          // Subnormal
          e = 0;
          f = roundToEven(v / Math.pow(2, 1 - bias - fbits));
        }
      }

      // Pack sign, exponent, fraction
      bits = [];
      for (i = fbits; i; i -= 1) {
        bits.push(f % 2 ? 1 : 0);
        f = Math.floor(f / 2);
      }
      for (i = ebits; i; i -= 1) {
        bits.push(e % 2 ? 1 : 0);
        e = Math.floor(e / 2);
      }
      bits.push(s ? 1 : 0);
      bits.reverse();
      str = bits.join('');

      // Bits to bytes
      bytes = [];
      while (str.length) {
        bytes.push(parseInt(str.slice(0, 8), 2));
        str = str.slice(8);
      }
      return bytes;
    }

    function unpackIEEE754(bytes, ebits, fbits) {
      // Bytes to bits
      var bits = [], i, j, b, str,
          bias, s, e, f;

      for (i = bytes.length; i; i -= 1) {
        b = bytes[i - 1];
        for (j = 8; j; j -= 1) {
          bits.push(b % 2 ? 1 : 0);
          b = b >> 1;
        }
      }
      bits.reverse();
      str = bits.join('');

      // Unpack sign, exponent, fraction
      bias = (1 << (ebits - 1)) - 1;
      s = parseInt(str.slice(0, 1), 2) ? -1 : 1;
      e = parseInt(str.slice(1, 1 + ebits), 2);
      f = parseInt(str.slice(1 + ebits), 2);

      // Produce number
      if (e === (1 << ebits) - 1) {
        return f !== 0 ? NaN : s * Infinity;
      } else if (e > 0) {
        // Normalized
        return s * Math.pow(2, e - bias) * (1 + f / Math.pow(2, fbits));
      } else if (f !== 0) {
        // Denormalized
        return s * Math.pow(2, -(bias - 1)) * (f / Math.pow(2, fbits));
      } else {
        return s < 0 ? -0 : 0;
      }
    }

    function unpackFloat64(b) { return unpackIEEE754(b, 11, 52); }
    function packFloat64(v) { return packIEEE754(v, 11, 52); }
    function unpackFloat32(b) { return unpackIEEE754(b, 8, 23); }
    function packFloat32(v) { return packIEEE754(v, 8, 23); }

    var conversions = {
      toFloat32: function (num) { return unpackFloat32(packFloat32(num)); }
    };
    if (typeof Float32Array !== 'undefined') {
      var float32array = new Float32Array(1);
      conversions.toFloat32 = function (num) {
        float32array[0] = num;
        return float32array[0];
      };
    }
    return conversions;
  }());

  defineProperties(String, {
    fromCodePoint: function fromCodePoint(codePoints) {
      var result = [];
      var next;
      for (var i = 0, length = arguments.length; i < length; i++) {
        next = Number(arguments[i]);
        if (!ES.SameValue(next, ES.ToInteger(next)) || next < 0 || next > 0x10FFFF) {
          throw new RangeError('Invalid code point ' + next);
        }

        if (next < 0x10000) {
          result.push(String.fromCharCode(next));
        } else {
          next -= 0x10000;
          result.push(String.fromCharCode((next >> 10) + 0xD800));
          result.push(String.fromCharCode((next % 0x400) + 0xDC00));
        }
      }
      return result.join('');
    },

    raw: function raw(callSite) {
      var cooked = ES.ToObject(callSite, 'bad callSite');
      var rawValue = cooked.raw;
      var rawString = ES.ToObject(rawValue, 'bad raw value');
      var len = rawString.length;
      var literalsegments = ES.ToLength(len);
      if (literalsegments <= 0) {
        return '';
      }

      var stringElements = [];
      var nextIndex = 0;
      var nextKey, next, nextSeg, nextSub;
      while (nextIndex < literalsegments) {
        nextKey = String(nextIndex);
        next = rawString[nextKey];
        nextSeg = String(next);
        stringElements.push(nextSeg);
        if (nextIndex + 1 >= literalsegments) {
          break;
        }
        next = nextIndex + 1 < arguments.length ? arguments[nextIndex + 1] : '';
        nextSub = String(next);
        stringElements.push(nextSub);
        nextIndex++;
      }
      return stringElements.join('');
    }
  });

  // Firefox 31 reports this function's length as 0
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1062484
  if (String.fromCodePoint.length !== 1) {
    var originalFromCodePoint = Function.apply.bind(String.fromCodePoint);
    defineProperty(String, 'fromCodePoint', function fromCodePoint(codePoints) { return originalFromCodePoint(this, arguments); }, true);
  }

  // Fast repeat, uses the `Exponentiation by squaring` algorithm.
  // Perf: http://jsperf.com/string-repeat2/2
  var stringRepeat = function repeat(s, times) {
    if (times < 1) { return ''; }
    if (times % 2) { return repeat(s, times - 1) + s; }
    var half = repeat(s, times / 2);
    return half + half;
  };
  var stringMaxLength = Infinity;

  var StringShims = {
    repeat: function repeat(times) {
      ES.RequireObjectCoercible(this);
      var thisStr = String(this);
      times = ES.ToInteger(times);
      if (times < 0 || times >= stringMaxLength) {
        throw new RangeError('repeat count must be less than infinity and not overflow maximum string size');
      }
      return stringRepeat(thisStr, times);
    },

    startsWith: function (searchStr) {
      ES.RequireObjectCoercible(this);
      var thisStr = String(this);
      if (Type.regex(searchStr)) {
        throw new TypeError('Cannot call method "startsWith" with a regex');
      }
      searchStr = String(searchStr);
      var startArg = arguments.length > 1 ? arguments[1] : void 0;
      var start = Math.max(ES.ToInteger(startArg), 0);
      return thisStr.slice(start, start + searchStr.length) === searchStr;
    },

    endsWith: function (searchStr) {
      ES.RequireObjectCoercible(this);
      var thisStr = String(this);
      if (Type.regex(searchStr)) {
        throw new TypeError('Cannot call method "endsWith" with a regex');
      }
      searchStr = String(searchStr);
      var thisLen = thisStr.length;
      var posArg = arguments.length > 1 ? arguments[1] : void 0;
      var pos = typeof posArg === 'undefined' ? thisLen : ES.ToInteger(posArg);
      var end = Math.min(Math.max(pos, 0), thisLen);
      return thisStr.slice(end - searchStr.length, end) === searchStr;
    },

    includes: function includes(searchString) {
      var position = arguments.length > 1 ? arguments[1] : void 0;
      // Somehow this trick makes method 100% compat with the spec.
      return _indexOf(this, searchString, position) !== -1;
    },

    codePointAt: function (pos) {
      ES.RequireObjectCoercible(this);
      var thisStr = String(this);
      var position = ES.ToInteger(pos);
      var length = thisStr.length;
      if (position >= 0 && position < length) {
        var first = thisStr.charCodeAt(position);
        var isEnd = (position + 1 === length);
        if (first < 0xD800 || first > 0xDBFF || isEnd) { return first; }
        var second = thisStr.charCodeAt(position + 1);
        if (second < 0xDC00 || second > 0xDFFF) { return first; }
        return ((first - 0xD800) * 1024) + (second - 0xDC00) + 0x10000;
      }
    }
  };
  defineProperties(String.prototype, StringShims);

  var hasStringTrimBug = '\u0085'.trim().length !== 1;
  if (hasStringTrimBug) {
    delete String.prototype.trim;
    // whitespace from: http://es5.github.io/#x15.5.4.20
    // implementation from https://github.com/es-shims/es5-shim/blob/v3.4.0/es5-shim.js#L1304-L1324
    var ws = [
      '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003',
      '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028',
      '\u2029\uFEFF'
    ].join('');
    var trimRegexp = new RegExp('(^[' + ws + ']+)|([' + ws + ']+$)', 'g');
    defineProperties(String.prototype, {
      trim: function () {
        if (typeof this === 'undefined' || this === null) {
          throw new TypeError("can't convert " + this + ' to object');
        }
        return String(this).replace(trimRegexp, '');
      }
    });
  }

  // see https://people.mozilla.org/~jorendorff/es6-draft.html#sec-string.prototype-@@iterator
  var StringIterator = function (s) {
    ES.RequireObjectCoercible(s);
    this._s = String(s);
    this._i = 0;
  };
  StringIterator.prototype.next = function () {
    var s = this._s, i = this._i;
    if (typeof s === 'undefined' || i >= s.length) {
      this._s = void 0;
      return { value: void 0, done: true };
    }
    var first = s.charCodeAt(i), second, len;
    if (first < 0xD800 || first > 0xDBFF || (i + 1) === s.length) {
      len = 1;
    } else {
      second = s.charCodeAt(i + 1);
      len = (second < 0xDC00 || second > 0xDFFF) ? 1 : 2;
    }
    this._i = i + len;
    return { value: s.substr(i, len), done: false };
  };
  addIterator(StringIterator.prototype);
  addIterator(String.prototype, function () {
    return new StringIterator(this);
  });

  if (!startsWithIsCompliant) {
    // Firefox has a noncompliant startsWith implementation
    defineProperty(String.prototype, 'startsWith', StringShims.startsWith, true);
    defineProperty(String.prototype, 'endsWith', StringShims.endsWith, true);
  }

  var ArrayShims = {
    from: function from(iterable) {
      var mapFn = arguments.length > 1 ? arguments[1] : void 0;

      var list = ES.ToObject(iterable, 'bad iterable');
      if (typeof mapFn !== 'undefined' && !ES.IsCallable(mapFn)) {
        throw new TypeError('Array.from: when provided, the second argument must be a function');
      }

      var hasThisArg = arguments.length > 2;
      var thisArg = hasThisArg ? arguments[2] : void 0;

      var usingIterator = ES.IsIterable(list);
      // does the spec really mean that Arrays should use ArrayIterator?
      // https://bugs.ecmascript.org/show_bug.cgi?id=2416
      //if (Array.isArray(list)) { usingIterator=false; }

      var length;
      var result, i, value;
      if (usingIterator) {
        i = 0;
        result = ES.IsCallable(this) ? Object(new this()) : [];
        var it = usingIterator ? ES.GetIterator(list) : null;
        var iterationValue;

        do {
          iterationValue = ES.IteratorNext(it);
          if (!iterationValue.done) {
            value = iterationValue.value;
            if (mapFn) {
              result[i] = hasThisArg ? mapFn.call(thisArg, value, i) : mapFn(value, i);
            } else {
              result[i] = value;
            }
            i += 1;
          }
        } while (!iterationValue.done);
        length = i;
      } else {
        length = ES.ToLength(list.length);
        result = ES.IsCallable(this) ? Object(new this(length)) : new Array(length);
        for (i = 0; i < length; ++i) {
          value = list[i];
          if (mapFn) {
            result[i] = hasThisArg ? mapFn.call(thisArg, value, i) : mapFn(value, i);
          } else {
            result[i] = value;
          }
        }
      }

      result.length = length;
      return result;
    },

    of: function of() {
      return Array.from.call(this, arguments);
    }
  };
  defineProperties(Array, ArrayShims);

  var arrayFromSwallowsNegativeLengths = function () {
    try {
      return Array.from({ length: -1 }).length === 0;
    } catch (e) {
      return false;
    }
  };
  // Fixes a Firefox bug in v32
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1063993
  if (!arrayFromSwallowsNegativeLengths()) {
    defineProperty(Array, 'from', ArrayShims.from, true);
  }

  // Given an argument x, it will return an IteratorResult object,
  // with value set to x and done to false.
  // Given no arguments, it will return an iterator completion object.
  var iterator_result = function (x) {
    return { value: x, done: arguments.length === 0 };
  };

  // Our ArrayIterator is private; see
  // https://github.com/paulmillr/es6-shim/issues/252
  ArrayIterator = function (array, kind) {
      this.i = 0;
      this.array = array;
      this.kind = kind;
  };

  defineProperties(ArrayIterator.prototype, {
    next: function () {
      var i = this.i, array = this.array;
      if (!(this instanceof ArrayIterator)) {
        throw new TypeError('Not an ArrayIterator');
      }
      if (typeof array !== 'undefined') {
        var len = ES.ToLength(array.length);
        for (; i < len; i++) {
          var kind = this.kind;
          var retval;
          if (kind === 'key') {
            retval = i;
          } else if (kind === 'value') {
            retval = array[i];
          } else if (kind === 'entry') {
            retval = [i, array[i]];
          }
          this.i = i + 1;
          return { value: retval, done: false };
        }
      }
      this.array = void 0;
      return { value: void 0, done: true };
    }
  });
  addIterator(ArrayIterator.prototype);

  var ObjectIterator = function (object, kind) {
    this.object = object;
    // Don't generate keys yet.
    this.array = null;
    this.kind = kind;
  };

  function getAllKeys(object) {
    var keys = [];

    for (var key in object) {
      keys.push(key);
    }

    return keys;
  }

  defineProperties(ObjectIterator.prototype, {
    next: function () {
      var key, array = this.array;

      if (!(this instanceof ObjectIterator)) {
        throw new TypeError('Not an ObjectIterator');
      }

      // Keys not generated
      if (array === null) {
        array = this.array = getAllKeys(this.object);
      }

      // Find next key in the object
      while (ES.ToLength(array.length) > 0) {
        key = array.shift();

        // The candidate key isn't defined on object.
        // Must have been deleted, or object[[Prototype]]
        // has been modified.
        if (!(key in this.object)) {
          continue;
        }

        if (this.kind === 'key') {
          return iterator_result(key);
        } else if (this.kind === 'value') {
          return iterator_result(this.object[key]);
        } else {
          return iterator_result([key, this.object[key]]);
        }
      }

      return iterator_result();
    }
  });
  addIterator(ObjectIterator.prototype);

  var ArrayPrototypeShims = {
    copyWithin: function copyWithin(target, start) {
      var end = arguments[2]; // copyWithin.length must be 2
      var o = ES.ToObject(this);
      var len = ES.ToLength(o.length);
      target = ES.ToInteger(target);
      start = ES.ToInteger(start);
      var to = target < 0 ? Math.max(len + target, 0) : Math.min(target, len);
      var from = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
      end = typeof end === 'undefined' ? len : ES.ToInteger(end);
      var fin = end < 0 ? Math.max(len + end, 0) : Math.min(end, len);
      var count = Math.min(fin - from, len - to);
      var direction = 1;
      if (from < to && to < (from + count)) {
        direction = -1;
        from += count - 1;
        to += count - 1;
      }
      while (count > 0) {
        if (_hasOwnProperty(o, from)) {
          o[to] = o[from];
        } else {
          delete o[from];
        }
        from += direction;
        to += direction;
        count -= 1;
      }
      return o;
    },

    fill: function fill(value) {
      var start = arguments.length > 1 ? arguments[1] : void 0;
      var end = arguments.length > 2 ? arguments[2] : void 0;
      var O = ES.ToObject(this);
      var len = ES.ToLength(O.length);
      start = ES.ToInteger(typeof start === 'undefined' ? 0 : start);
      end = ES.ToInteger(typeof end === 'undefined' ? len : end);

      var relativeStart = start < 0 ? Math.max(len + start, 0) : Math.min(start, len);
      var relativeEnd = end < 0 ? len + end : end;

      for (var i = relativeStart; i < len && i < relativeEnd; ++i) {
        O[i] = value;
      }
      return O;
    },

    find: function find(predicate) {
      var list = ES.ToObject(this);
      var length = ES.ToLength(list.length);
      if (!ES.IsCallable(predicate)) {
        throw new TypeError('Array#find: predicate must be a function');
      }
      var thisArg = arguments.length > 1 ? arguments[1] : null;
      for (var i = 0, value; i < length; i++) {
        value = list[i];
        if (thisArg) {
          if (predicate.call(thisArg, value, i, list)) { return value; }
        } else if (predicate(value, i, list)) {
          return value;
        }
      }
    },

    findIndex: function findIndex(predicate) {
      var list = ES.ToObject(this);
      var length = ES.ToLength(list.length);
      if (!ES.IsCallable(predicate)) {
        throw new TypeError('Array#findIndex: predicate must be a function');
      }
      var thisArg = arguments.length > 1 ? arguments[1] : null;
      for (var i = 0; i < length; i++) {
        if (thisArg) {
          if (predicate.call(thisArg, list[i], i, list)) { return i; }
        } else if (predicate(list[i], i, list)) {
          return i;
        }
      }
      return -1;
    },

    keys: function keys() {
      return new ArrayIterator(this, 'key');
    },

    values: function values() {
      return new ArrayIterator(this, 'value');
    },

    entries: function entries() {
      return new ArrayIterator(this, 'entry');
    }
  };
  // Safari 7.1 defines Array#keys and Array#entries natively,
  // but the resulting ArrayIterator objects don't have a "next" method.
  if (Array.prototype.keys && !ES.IsCallable([1].keys().next)) {
    delete Array.prototype.keys;
  }
  if (Array.prototype.entries && !ES.IsCallable([1].entries().next)) {
    delete Array.prototype.entries;
  }

  // Chrome 38 defines Array#keys and Array#entries, and Array#@@iterator, but not Array#values
  if (Array.prototype.keys && Array.prototype.entries && !Array.prototype.values && Array.prototype[$iterator$]) {
    defineProperties(Array.prototype, {
      values: Array.prototype[$iterator$]
    });
    if (Type.symbol(Symbol.unscopables)) {
      Array.prototype[Symbol.unscopables].values = true;
    }
  }
  // Chrome 40 defines Array#values with the incorrect name, although Array#{keys,entries} have the correct name
  if (Array.prototype.values && Array.prototype.values.name !== 'values') {
    var originalArrayPrototypeValues = Array.prototype.values;
    defineProperty(Array.prototype, 'values', function values() { return originalArrayPrototypeValues.call(this); }, true);
    defineProperty(Array.prototype, $iterator$, Array.prototype.values, true);
    Value.preserveToString(Array.prototype.values, originalArrayPrototypeValues);
  }
  defineProperties(Array.prototype, ArrayPrototypeShims);

  addIterator(Array.prototype, function () { return this.values(); });
  // Chrome defines keys/values/entries on Array, but doesn't give us
  // any way to identify its iterator.  So add our own shimmed field.
  if (Object.getPrototypeOf) {
    addIterator(Object.getPrototypeOf([].values()));
  }

  var maxSafeInteger = Math.pow(2, 53) - 1;
  defineProperties(Number, {
    MAX_SAFE_INTEGER: maxSafeInteger,
    MIN_SAFE_INTEGER: -maxSafeInteger,
    EPSILON: 2.220446049250313e-16,

    parseInt: globals.parseInt,
    parseFloat: globals.parseFloat,

    isFinite: function (value) {
      return typeof value === 'number' && global_isFinite(value);
    },

    isInteger: function (value) {
      return Number.isFinite(value) && ES.ToInteger(value) === value;
    },

    isSafeInteger: function (value) {
      return Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
    },

    isNaN: function (value) {
      // NaN !== NaN, but they are identical.
      // NaNs are the only non-reflexive value, i.e., if x !== x,
      // then x is NaN.
      // isNaN is broken: it converts its argument to number, so
      // isNaN('foo') => true
      return value !== value;
    }
  });

  // Work around bugs in Array#find and Array#findIndex -- early
  // implementations skipped holes in sparse arrays. (Note that the
  // implementations of find/findIndex indirectly use shimmed
  // methods of Number, so this test has to happen down here.)
  /*jshint elision: true */
  if (![, 1].find(function (item, idx) { return idx === 0; })) {
    defineProperty(Array.prototype, 'find', ArrayPrototypeShims.find, true);
  }
  if ([, 1].findIndex(function (item, idx) { return idx === 0; }) !== 0) {
    defineProperty(Array.prototype, 'findIndex', ArrayPrototypeShims.findIndex, true);
  }
  /*jshint elision: false */

  if (supportsDescriptors) {
    defineProperties(Object, {
      // 19.1.3.1
      assign: function (target, source) {
        if (!ES.TypeIsObject(target)) {
          throw new TypeError('target must be an object');
        }
        return Array.prototype.reduce.call(arguments, function (target, source) {
          return Object.keys(Object(source)).reduce(function (target, key) {
            target[key] = source[key];
            return target;
          }, target);
        });
      },

      is: function (a, b) {
        return ES.SameValue(a, b);
      },

      // 19.1.3.9
      // shim from https://gist.github.com/WebReflection/5593554
      setPrototypeOf: (function (Object, magic) {
        var set;

        var checkArgs = function (O, proto) {
          if (!ES.TypeIsObject(O)) {
            throw new TypeError('cannot set prototype on a non-object');
          }
          if (!(proto === null || ES.TypeIsObject(proto))) {
            throw new TypeError('can only set prototype to an object or null' + proto);
          }
        };

        var setPrototypeOf = function (O, proto) {
          checkArgs(O, proto);
          set.call(O, proto);
          return O;
        };

        try {
          // this works already in Firefox and Safari
          set = Object.getOwnPropertyDescriptor(Object.prototype, magic).set;
          set.call({}, null);
        } catch (e) {
          if (Object.prototype !== {}[magic]) {
            // IE < 11 cannot be shimmed
            return;
          }
          // probably Chrome or some old Mobile stock browser
          set = function (proto) {
            this[magic] = proto;
          };
          // please note that this will **not** work
          // in those browsers that do not inherit
          // __proto__ by mistake from Object.prototype
          // in these cases we should probably throw an error
          // or at least be informed about the issue
          setPrototypeOf.polyfill = setPrototypeOf(
            setPrototypeOf({}, null),
            Object.prototype
          ) instanceof Object;
          // setPrototypeOf.polyfill === true means it works as meant
          // setPrototypeOf.polyfill === false means it's not 100% reliable
          // setPrototypeOf.polyfill === undefined
          // or
          // setPrototypeOf.polyfill ==  null means it's not a polyfill
          // which means it works as expected
          // we can even delete Object.prototype.__proto__;
        }
        return setPrototypeOf;
      }(Object, '__proto__'))
    });
  }

  // Workaround bug in Opera 12 where setPrototypeOf(x, null) doesn't work,
  // but Object.create(null) does.
  if (Object.setPrototypeOf && Object.getPrototypeOf &&
      Object.getPrototypeOf(Object.setPrototypeOf({}, null)) !== null &&
      Object.getPrototypeOf(Object.create(null)) === null) {
    (function () {
      var FAKENULL = Object.create(null);
      var gpo = Object.getPrototypeOf, spo = Object.setPrototypeOf;
      Object.getPrototypeOf = function (o) {
        var result = gpo(o);
        return result === FAKENULL ? null : result;
      };
      Object.setPrototypeOf = function (o, p) {
        if (p === null) { p = FAKENULL; }
        return spo(o, p);
      };
      Object.setPrototypeOf.polyfill = false;
    }());
  }

  var objectKeysAcceptsPrimitives = (function () {
    try {
      Object.keys('foo');
      return true;
    } catch (e) {
      return false;
    }
  }());
  if (!objectKeysAcceptsPrimitives) {
    var originalObjectKeys = Object.keys;
    defineProperty(Object, 'keys', function keys(value) {
      return originalObjectKeys(ES.ToObject(value));
    }, true);
    Value.preserveToString(Object.keys, originalObjectKeys);
  }

  if (Object.getOwnPropertyNames) {
    var objectGOPNAcceptsPrimitives = (function () {
      try {
        Object.getOwnPropertyNames('foo');
        return true;
      } catch (e) {
        return false;
      }
    }());
    if (!objectGOPNAcceptsPrimitives) {
      var originalObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
      defineProperty(Object, 'getOwnPropertyNames', function getOwnPropertyNames(value) {
        return originalObjectGetOwnPropertyNames(ES.ToObject(value));
      }, true);
      Value.preserveToString(Object.getOwnPropertyNames, originalObjectGetOwnPropertyNames);
    }
  }
  if (Object.getOwnPropertyDescriptor) {
    var objectGOPDAcceptsPrimitives = (function () {
      try {
        Object.getOwnPropertyDescriptor('foo', 'bar');
        return true;
      } catch (e) {
        return false;
      }
    }());
    if (!objectGOPDAcceptsPrimitives) {
      var originalObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
      defineProperty(Object, 'getOwnPropertyDescriptor', function getOwnPropertyDescriptor(value, property) {
        return originalObjectGetOwnPropertyDescriptor(ES.ToObject(value), property);
      }, true);
      Value.preserveToString(Object.getOwnPropertyDescriptor, originalObjectGetOwnPropertyDescriptor);
    }
  }
  if (Object.seal) {
    var objectSealAcceptsPrimitives = (function () {
      try {
        Object.seal('foo');
        return true;
      } catch (e) {
        return false;
      }
    }());
    if (!objectSealAcceptsPrimitives) {
      var originalObjectSeal = Object.seal;
      defineProperty(Object, 'seal', function seal(value) {
        if (!Type.object(value)) { return value; }
        return originalObjectSeal(value);
      }, true);
      Value.preserveToString(Object.seal, originalObjectSeal);
    }
  }
  if (Object.isSealed) {
    var objectIsSealedAcceptsPrimitives = (function () {
      try {
        Object.isSealed('foo');
        return true;
      } catch (e) {
        return false;
      }
    }());
    if (!objectIsSealedAcceptsPrimitives) {
      var originalObjectIsSealed = Object.isSealed;
      defineProperty(Object, 'isSealed', function isSealed(value) {
        if (!Type.object(value)) { return true; }
        return originalObjectIsSealed(value);
      }, true);
      Value.preserveToString(Object.isSealed, originalObjectIsSealed);
    }
  }
  if (Object.freeze) {
    var objectFreezeAcceptsPrimitives = (function () {
      try {
        Object.freeze('foo');
        return true;
      } catch (e) {
        return false;
      }
    }());
    if (!objectFreezeAcceptsPrimitives) {
      var originalObjectFreeze = Object.freeze;
      defineProperty(Object, 'freeze', function freeze(value) {
        if (!Type.object(value)) { return value; }
        return originalObjectFreeze(value);
      }, true);
      Value.preserveToString(Object.freeze, originalObjectFreeze);
    }
  }
  if (Object.isFrozen) {
    var objectIsFrozenAcceptsPrimitives = (function () {
      try {
        Object.isFrozen('foo');
        return true;
      } catch (e) {
        return false;
      }
    }());
    if (!objectIsFrozenAcceptsPrimitives) {
      var originalObjectIsFrozen = Object.isFrozen;
      defineProperty(Object, 'isFrozen', function isFrozen(value) {
        if (!Type.object(value)) { return true; }
        return originalObjectIsFrozen(value);
      }, true);
      Value.preserveToString(Object.isFrozen, originalObjectIsFrozen);
    }
  }
  if (Object.preventExtensions) {
    var objectPreventExtensionsAcceptsPrimitives = (function () {
      try {
        Object.preventExtensions('foo');
        return true;
      } catch (e) {
        return false;
      }
    }());
    if (!objectPreventExtensionsAcceptsPrimitives) {
      var originalObjectPreventExtensions = Object.preventExtensions;
      defineProperty(Object, 'preventExtensions', function preventExtensions(value) {
        if (!Type.object(value)) { return value; }
        return originalObjectPreventExtensions(value);
      }, true);
      Value.preserveToString(Object.preventExtensions, originalObjectPreventExtensions);
    }
  }
  if (Object.isExtensible) {
    var objectIsExtensibleAcceptsPrimitives = (function () {
      try {
        Object.isExtensible('foo');
        return true;
      } catch (e) {
        return false;
      }
    }());
    if (!objectIsExtensibleAcceptsPrimitives) {
      var originalObjectIsExtensible = Object.isExtensible;
      defineProperty(Object, 'isExtensible', function isExtensible(value) {
        if (!Type.object(value)) { return false; }
        return originalObjectIsExtensible(value);
      }, true);
      Value.preserveToString(Object.isExtensible, originalObjectIsExtensible);
    }
  }
  if (Object.getPrototypeOf) {
    var objectGetProtoAcceptsPrimitives = (function () {
      try {
        Object.getPrototypeOf('foo');
        return true;
      } catch (e) {
        return false;
      }
    }());
    if (!objectGetProtoAcceptsPrimitives) {
      var originalGetProto = Object.getPrototypeOf;
      defineProperty(Object, 'getPrototypeOf', function getPrototypeOf(value) {
        return originalGetProto(ES.ToObject(value));
      }, true);
      Value.preserveToString(Object.getPrototypeOf, originalGetProto);
    }
  }

  if (!RegExp.prototype.flags && supportsDescriptors) {
    var regExpFlagsGetter = function flags() {
      if (!ES.TypeIsObject(this)) {
        throw new TypeError('Method called on incompatible type: must be an object.');
      }
      var result = '';
      if (this.global) {
        result += 'g';
      }
      if (this.ignoreCase) {
        result += 'i';
      }
      if (this.multiline) {
        result += 'm';
      }
      if (this.unicode) {
        result += 'u';
      }
      if (this.sticky) {
        result += 'y';
      }
      return result;
    };

    Value.getter(RegExp.prototype, 'flags', regExpFlagsGetter);
  }

  var regExpSupportsFlagsWithRegex = (function () {
    try {
      return String(new RegExp(/a/g, 'i')) === '/a/i';
    } catch (e) {
      return false;
    }
  }());

  if (!regExpSupportsFlagsWithRegex && supportsDescriptors) {
    var OrigRegExp = RegExp;
    var RegExpShim = function RegExp(pattern, flags) {
      if (Type.regex(pattern) && Type.string(flags)) {
        return new RegExp(pattern.source, flags);
      }
      return new OrigRegExp(pattern, flags);
    };
    Value.preserveToString(RegExpShim, OrigRegExp);
    if (Object.setPrototypeOf) {
      // sets up proper prototype chain where possible
      Object.setPrototypeOf(OrigRegExp, RegExpShim);
    }
    Object.getOwnPropertyNames(OrigRegExp).forEach(function (key) {
      if (key === '$input') { return; } // Chrome < v39 & Opera < 26 have a nonstandard "$input" property
      if (key in noop) { return; }
      Value.proxy(OrigRegExp, key, RegExpShim);
    });
    RegExpShim.prototype = OrigRegExp.prototype;
    Value.redefine(OrigRegExp.prototype, 'constructor', RegExpShim);
    /*globals RegExp: true */
    RegExp = RegExpShim;
    Value.redefine(globals, 'RegExp', RegExpShim);
    /*globals RegExp: false */
  }

  var MathShims = {
    acosh: function (value) {
      var x = Number(value);
      if (Number.isNaN(x) || value < 1) { return NaN; }
      if (x === 1) { return 0; }
      if (x === Infinity) { return x; }
      return Math.log(x / Math.E + Math.sqrt(x + 1) * Math.sqrt(x - 1) / Math.E) + 1;
    },

    asinh: function (value) {
      value = Number(value);
      if (value === 0 || !global_isFinite(value)) {
        return value;
      }
      return value < 0 ? -Math.asinh(-value) : Math.log(value + Math.sqrt(value * value + 1));
    },

    atanh: function (value) {
      value = Number(value);
      if (Number.isNaN(value) || value < -1 || value > 1) {
        return NaN;
      }
      if (value === -1) { return -Infinity; }
      if (value === 1) { return Infinity; }
      if (value === 0) { return value; }
      return 0.5 * Math.log((1 + value) / (1 - value));
    },

    cbrt: function (value) {
      value = Number(value);
      if (value === 0) { return value; }
      var negate = value < 0, result;
      if (negate) { value = -value; }
      result = Math.pow(value, 1 / 3);
      return negate ? -result : result;
    },

    clz32: function (value) {
      // See https://bugs.ecmascript.org/show_bug.cgi?id=2465
      value = Number(value);
      var number = ES.ToUint32(value);
      if (number === 0) {
        return 32;
      }
      return 32 - (number).toString(2).length;
    },

    cosh: function (value) {
      value = Number(value);
      if (value === 0) { return 1; } // +0 or -0
      if (Number.isNaN(value)) { return NaN; }
      if (!global_isFinite(value)) { return Infinity; }
      if (value < 0) { value = -value; }
      if (value > 21) { return Math.exp(value) / 2; }
      return (Math.exp(value) + Math.exp(-value)) / 2;
    },

    expm1: function (value) {
      var x = Number(value);
      if (x === -Infinity) { return -1; }
      if (!global_isFinite(x) || value === 0) { return x; }
      if (Math.abs(x) > 0.5) {
        return Math.exp(x) - 1;
      }
      // A more precise approximation using Taylor series expansion
      // from https://github.com/paulmillr/es6-shim/issues/314#issuecomment-70293986
      var t = x;
      var sum = 0;
      var n = 1;
      while (sum + t !== sum) {
        sum += t;
        n += 1;
        t *= x / n;
      }
      return sum;
    },

    hypot: function (x, y) {
      var anyNaN = false;
      var allZero = true;
      var anyInfinity = false;
      var numbers = [];
      Array.prototype.every.call(arguments, function (arg) {
        var num = Number(arg);
        if (Number.isNaN(num)) {
          anyNaN = true;
        } else if (num === Infinity || num === -Infinity) {
          anyInfinity = true;
        } else if (num !== 0) {
          allZero = false;
        }
        if (anyInfinity) {
          return false;
        } else if (!anyNaN) {
          numbers.push(Math.abs(num));
        }
        return true;
      });
      if (anyInfinity) { return Infinity; }
      if (anyNaN) { return NaN; }
      if (allZero) { return 0; }

      numbers.sort(function (a, b) { return b - a; });
      var largest = numbers[0];
      var divided = numbers.map(function (number) { return number / largest; });
      var sum = divided.reduce(function (sum, number) { return sum + (number * number); }, 0);
      return largest * Math.sqrt(sum);
    },

    log2: function (value) {
      return Math.log(value) * Math.LOG2E;
    },

    log10: function (value) {
      return Math.log(value) * Math.LOG10E;
    },

    log1p: function (value) {
      var x = Number(value);
      if (x < -1 || Number.isNaN(x)) { return NaN; }
      if (x === 0 || x === Infinity) { return x; }
      if (x === -1) { return -Infinity; }

      return (1 + x) - 1 === 0 ? x : x * (Math.log(1 + x) / ((1 + x) - 1));
    },

    sign: function (value) {
      var number = +value;
      if (number === 0) { return number; }
      if (Number.isNaN(number)) { return number; }
      return number < 0 ? -1 : 1;
    },

    sinh: function (value) {
      var x = Number(value);
      if (!global_isFinite(value) || value === 0) { return value; }

      if (Math.abs(x) < 1) {
        return (Math.expm1(x) - Math.expm1(-x)) / 2;
      }
      return (Math.exp(x - 1) - Math.exp(-x - 1)) * Math.E / 2;
    },

    tanh: function (value) {
      var x = Number(value);
      if (Number.isNaN(value) || x === 0) { return x; }
      if (x === Infinity) { return 1; }
      if (x === -Infinity) { return -1; }
      var a = Math.expm1(x);
      var b = Math.expm1(-x);
      if (a === Infinity) { return 1; }
      if (b === Infinity) { return -1; }
      return (a - b) / (Math.exp(x) + Math.exp(-x));
    },

    trunc: function (value) {
      var number = Number(value);
      return number < 0 ? -Math.floor(-number) : Math.floor(number);
    },

    imul: function (x, y) {
      // taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
      x = ES.ToUint32(x);
      y = ES.ToUint32(y);
      var ah = (x >>> 16) & 0xffff;
      var al = x & 0xffff;
      var bh = (y >>> 16) & 0xffff;
      var bl = y & 0xffff;
      // the shift by 0 fixes the sign on the high part
      // the final |0 converts the unsigned value into a signed value
      return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
    },

    fround: function (x) {
      if (x === 0 || x === Infinity || x === -Infinity || Number.isNaN(x)) {
        return x;
      }
      var num = Number(x);
      return numberConversion.toFloat32(num);
    }
  };
  defineProperties(Math, MathShims);
  // Chrome 40 has an imprecise Math.tanh with very small numbers
  defineProperty(Math, 'tanh', MathShims.tanh, Math.tanh(-2e-17) !== -2e-17);
  // Chrome 40 loses Math.acosh precision with high numbers
  defineProperty(Math, 'acosh', MathShims.acosh, Math.acosh(Number.MAX_VALUE) === Infinity);
  // node 0.11 has an imprecise Math.sinh with very small numbers
  defineProperty(Math, 'sinh', MathShims.sinh, Math.sinh(-2e-17) !== -2e-17);
  // FF 35 on Linux reports 22025.465794806725 for Math.expm1(10)
  var expm1OfTen = Math.expm1(10);
  defineProperty(Math, 'expm1', MathShims.expm1, expm1OfTen > 22025.465794806719 || expm1OfTen < 22025.4657948067165168);

  var roundHandlesBoundaryConditions = Math.round(0.5 - Number.EPSILON / 4) === 0 && Math.round(-0.5 + Number.EPSILON / 3.99) === 1;
  var origMathRound = Math.round;
  defineProperty(Math, 'round', function round(x) {
    if (-0.5 <= x && x < 0.5 && x !== 0) {
      return Math.sign(x * 0);
    }
    return origMathRound(x);
  }, !roundHandlesBoundaryConditions);

  if (Math.imul(0xffffffff, 5) !== -5) {
    // Safari 6.1, at least, reports "0" for this value
    Math.imul = MathShims.imul;
  }

  // Promises
  // Simplest possible implementation; use a 3rd-party library if you
  // want the best possible speed and/or long stack traces.
  var PromiseShim = (function () {

    var Promise, Promise$prototype;

    ES.IsPromise = function (promise) {
      if (!ES.TypeIsObject(promise)) {
        return false;
      }
      if (!promise._promiseConstructor) {
        // _promiseConstructor is a bit more unique than _status, so we'll
        // check that instead of the [[PromiseStatus]] internal field.
        return false;
      }
      if (typeof promise._status === 'undefined') {
        return false; // uninitialized
      }
      return true;
    };

    // "PromiseCapability" in the spec is what most promise implementations
    // call a "deferred".
    var PromiseCapability = function (C) {
      if (!ES.IsCallable(C)) {
        throw new TypeError('bad promise constructor');
      }
      var capability = this;
      var resolver = function (resolve, reject) {
        capability.resolve = resolve;
        capability.reject = reject;
      };
      capability.promise = ES.Construct(C, [resolver]);
      // see https://bugs.ecmascript.org/show_bug.cgi?id=2478
      if (!capability.promise._es6construct) {
        throw new TypeError('bad promise constructor');
      }
      if (!(ES.IsCallable(capability.resolve) && ES.IsCallable(capability.reject))) {
        throw new TypeError('bad promise constructor');
      }
    };

    // find an appropriate setImmediate-alike
    var setTimeout = globals.setTimeout;
    var makeZeroTimeout;
    /*global window */
    if (typeof window !== 'undefined' && ES.IsCallable(window.postMessage)) {
      makeZeroTimeout = function () {
        // from http://dbaron.org/log/20100309-faster-timeouts
        var timeouts = [];
        var messageName = 'zero-timeout-message';
        var setZeroTimeout = function (fn) {
          timeouts.push(fn);
          window.postMessage(messageName, '*');
        };
        var handleMessage = function (event) {
          if (event.source === window && event.data === messageName) {
            event.stopPropagation();
            if (timeouts.length === 0) { return; }
            var fn = timeouts.shift();
            fn();
          }
        };
        window.addEventListener('message', handleMessage, true);
        return setZeroTimeout;
      };
    }
    var makePromiseAsap = function () {
      // An efficient task-scheduler based on a pre-existing Promise
      // implementation, which we can use even if we override the
      // global Promise below (in order to workaround bugs)
      // https://github.com/Raynos/observ-hash/issues/2#issuecomment-35857671
      var P = globals.Promise;
      return P && P.resolve && function (task) {
        return P.resolve().then(task);
      };
    };
    /*global process */
    var enqueue = ES.IsCallable(globals.setImmediate) ?
      globals.setImmediate.bind(globals) :
      typeof process === 'object' && process.nextTick ? process.nextTick :
      makePromiseAsap() ||
      (ES.IsCallable(makeZeroTimeout) ? makeZeroTimeout() :
      function (task) { setTimeout(task, 0); }); // fallback

    var updatePromiseFromPotentialThenable = function (x, capability) {
      if (!ES.TypeIsObject(x)) {
        return false;
      }
      var resolve = capability.resolve;
      var reject = capability.reject;
      try {
        var then = x.then; // only one invocation of accessor
        if (!ES.IsCallable(then)) { return false; }
        then.call(x, resolve, reject);
      } catch (e) {
        reject(e);
      }
      return true;
    };

    var triggerPromiseReactions = function (reactions, x) {
      reactions.forEach(function (reaction) {
        enqueue(function () {
          // PromiseReactionTask
          var handler = reaction.handler;
          var capability = reaction.capability;
          var resolve = capability.resolve;
          var reject = capability.reject;
          try {
            var result = handler(x);
            if (result === capability.promise) {
              throw new TypeError('self resolution');
            }
            var updateResult =
              updatePromiseFromPotentialThenable(result, capability);
            if (!updateResult) {
              resolve(result);
            }
          } catch (e) {
            reject(e);
          }
        });
      });
    };

    var promiseResolutionHandler = function (promise, onFulfilled, onRejected) {
      return function (x) {
        if (x === promise) {
          return onRejected(new TypeError('self resolution'));
        }
        var C = promise._promiseConstructor;
        var capability = new PromiseCapability(C);
        var updateResult = updatePromiseFromPotentialThenable(x, capability);
        if (updateResult) {
          return capability.promise.then(onFulfilled, onRejected);
        } else {
          return onFulfilled(x);
        }
      };
    };

    Promise = function (resolver) {
      var promise = this;
      promise = emulateES6construct(promise);
      if (!promise._promiseConstructor) {
        // we use _promiseConstructor as a stand-in for the internal
        // [[PromiseStatus]] field; it's a little more unique.
        throw new TypeError('bad promise');
      }
      if (typeof promise._status !== 'undefined') {
        throw new TypeError('promise already initialized');
      }
      // see https://bugs.ecmascript.org/show_bug.cgi?id=2482
      if (!ES.IsCallable(resolver)) {
        throw new TypeError('not a valid resolver');
      }
      promise._status = 'unresolved';
      promise._resolveReactions = [];
      promise._rejectReactions = [];

      var resolve = function (resolution) {
        if (promise._status !== 'unresolved') { return; }
        var reactions = promise._resolveReactions;
        promise._result = resolution;
        promise._resolveReactions = void 0;
        promise._rejectReactions = void 0;
        promise._status = 'has-resolution';
        triggerPromiseReactions(reactions, resolution);
      };
      var reject = function (reason) {
        if (promise._status !== 'unresolved') { return; }
        var reactions = promise._rejectReactions;
        promise._result = reason;
        promise._resolveReactions = void 0;
        promise._rejectReactions = void 0;
        promise._status = 'has-rejection';
        triggerPromiseReactions(reactions, reason);
      };
      try {
        resolver(resolve, reject);
      } catch (e) {
        reject(e);
      }
      return promise;
    };
    Promise$prototype = Promise.prototype;
    var _promiseAllResolver = function (index, values, capability, remaining) {
      var done = false;
      return function (x) {
        if (done) { return; } // protect against being called multiple times
        done = true;
        values[index] = x;
        if ((--remaining.count) === 0) {
          var resolve = capability.resolve;
          resolve(values); // call w/ this===undefined
        }
      };
    };

    defineProperty(Promise, symbolSpecies, function (obj) {
      var constructor = this;
      // AllocatePromise
      // The `obj` parameter is a hack we use for es5
      // compatibility.
      var prototype = constructor.prototype || Promise$prototype;
      obj = obj || create(prototype);
      defineProperties(obj, {
        _status: void 0,
        _result: void 0,
        _resolveReactions: void 0,
        _rejectReactions: void 0,
        _promiseConstructor: void 0
      });
      obj._promiseConstructor = constructor;
      return obj;
    });
    defineProperties(Promise, {
      all: function all(iterable) {
        var C = this;
        var capability = new PromiseCapability(C);
        var resolve = capability.resolve;
        var reject = capability.reject;
        try {
          if (!ES.IsIterable(iterable)) {
            throw new TypeError('bad iterable');
          }
          var it = ES.GetIterator(iterable);
          var values = [], remaining = { count: 1 };
          for (var index = 0; ; index++) {
            var next = ES.IteratorNext(it);
            if (next.done) {
              break;
            }
            var nextPromise = C.resolve(next.value);
            var resolveElement = _promiseAllResolver(
              index, values, capability, remaining
            );
            remaining.count++;
            nextPromise.then(resolveElement, capability.reject);
          }
          if ((--remaining.count) === 0) {
            resolve(values); // call w/ this===undefined
          }
        } catch (e) {
          reject(e);
        }
        return capability.promise;
      },

      race: function race(iterable) {
        var C = this;
        var capability = new PromiseCapability(C);
        var resolve = capability.resolve;
        var reject = capability.reject;
        try {
          if (!ES.IsIterable(iterable)) {
            throw new TypeError('bad iterable');
          }
          var it = ES.GetIterator(iterable);
          while (true) {
            var next = ES.IteratorNext(it);
            if (next.done) {
              // If iterable has no items, resulting promise will never
              // resolve; see:
              // https://github.com/domenic/promises-unwrapping/issues/75
              // https://bugs.ecmascript.org/show_bug.cgi?id=2515
              break;
            }
            var nextPromise = C.resolve(next.value);
            nextPromise.then(resolve, reject);
          }
        } catch (e) {
          reject(e);
        }
        return capability.promise;
      },

      reject: function reject(reason) {
        var C = this;
        var capability = new PromiseCapability(C);
        var rejectPromise = capability.reject;
        rejectPromise(reason); // call with this===undefined
        return capability.promise;
      },

      resolve: function resolve(v) {
        var C = this;
        if (ES.IsPromise(v)) {
          var constructor = v._promiseConstructor;
          if (constructor === C) { return v; }
        }
        var capability = new PromiseCapability(C);
        var resolvePromise = capability.resolve;
        resolvePromise(v); // call with this===undefined
        return capability.promise;
      }
    });

    defineProperties(Promise$prototype, {
      'catch': function (onRejected) {
        return this.then(void 0, onRejected);
      },

      then: function then(onFulfilled, onRejected) {
        var promise = this;
        if (!ES.IsPromise(promise)) { throw new TypeError('not a promise'); }
        // this.constructor not this._promiseConstructor; see
        // https://bugs.ecmascript.org/show_bug.cgi?id=2513
        var C = this.constructor;
        var capability = new PromiseCapability(C);
        if (!ES.IsCallable(onRejected)) {
          onRejected = function (e) { throw e; };
        }
        if (!ES.IsCallable(onFulfilled)) {
          onFulfilled = function (x) { return x; };
        }
        var resolutionHandler = promiseResolutionHandler(promise, onFulfilled, onRejected);
        var resolveReaction = { capability: capability, handler: resolutionHandler };
        var rejectReaction = { capability: capability, handler: onRejected };
        switch (promise._status) {
          case 'unresolved':
            promise._resolveReactions.push(resolveReaction);
            promise._rejectReactions.push(rejectReaction);
            break;
          case 'has-resolution':
            triggerPromiseReactions([resolveReaction], promise._result);
            break;
          case 'has-rejection':
            triggerPromiseReactions([rejectReaction], promise._result);
            break;
          default:
            throw new TypeError('unexpected');
        }
        return capability.promise;
      }
    });

    return Promise;
  }());

  // Chrome's native Promise has extra methods that it shouldn't have. Let's remove them.
  if (globals.Promise) {
    delete globals.Promise.accept;
    delete globals.Promise.defer;
    delete globals.Promise.prototype.chain;
  }

  // export the Promise constructor.
  defineProperties(globals, { Promise: PromiseShim });
  // In Chrome 33 (and thereabouts) Promise is defined, but the
  // implementation is buggy in a number of ways.  Let's check subclassing
  // support to see if we have a buggy implementation.
  var promiseSupportsSubclassing = supportsSubclassing(globals.Promise, function (S) {
    return S.resolve(42) instanceof S;
  });
  var promiseIgnoresNonFunctionThenCallbacks = (function () {
    try {
      globals.Promise.reject(42).then(null, 5).then(null, noop);
      return true;
    } catch (ex) {
      return false;
    }
  }());
  var promiseRequiresObjectContext = (function () {
    /*global Promise */
    try { Promise.call(3, noop); } catch (e) { return true; }
    return false;
  }());
  if (!promiseSupportsSubclassing || !promiseIgnoresNonFunctionThenCallbacks || !promiseRequiresObjectContext) {
    /*globals Promise: true */
    Promise = PromiseShim;
    /*globals Promise: false */
    defineProperty(globals, 'Promise', PromiseShim, true);
  }

  // Map and Set require a true ES5 environment
  // Their fast path also requires that the environment preserve
  // property insertion order, which is not guaranteed by the spec.
  var testOrder = function (a) {
    var b = Object.keys(a.reduce(function (o, k) {
      o[k] = true;
      return o;
    }, {}));
    return a.join(':') === b.join(':');
  };
  var preservesInsertionOrder = testOrder(['z', 'a', 'bb']);
  // some engines (eg, Chrome) only preserve insertion order for string keys
  var preservesNumericInsertionOrder = testOrder(['z', 1, 'a', '3', 2]);

  if (supportsDescriptors) {

    var fastkey = function fastkey(key) {
      if (!preservesInsertionOrder) {
        return null;
      }
      var type = typeof key;
      if (type === 'string') {
        return '$' + key;
      } else if (type === 'number') {
        // note that -0 will get coerced to "0" when used as a property key
        if (!preservesNumericInsertionOrder) {
          return 'n' + key;
        }
        return key;
      }
      return null;
    };

    var emptyObject = function emptyObject() {
      // accomodate some older not-quite-ES5 browsers
      return Object.create ? Object.create(null) : {};
    };

    var collectionShims = {
      Map: (function () {

        var empty = {};

        function MapEntry(key, value) {
          this.key = key;
          this.value = value;
          this.next = null;
          this.prev = null;
        }

        MapEntry.prototype.isRemoved = function () {
          return this.key === empty;
        };

        function MapIterator(map, kind) {
          this.head = map._head;
          this.i = this.head;
          this.kind = kind;
        }

        MapIterator.prototype = {
          next: function () {
            var i = this.i, kind = this.kind, head = this.head, result;
            if (typeof this.i === 'undefined') {
              return { value: void 0, done: true };
            }
            while (i.isRemoved() && i !== head) {
              // back up off of removed entries
              i = i.prev;
            }
            // advance to next unreturned element.
            while (i.next !== head) {
              i = i.next;
              if (!i.isRemoved()) {
                if (kind === 'key') {
                  result = i.key;
                } else if (kind === 'value') {
                  result = i.value;
                } else {
                  result = [i.key, i.value];
                }
                this.i = i;
                return { value: result, done: false };
              }
            }
            // once the iterator is done, it is done forever.
            this.i = void 0;
            return { value: void 0, done: true };
          }
        };
        addIterator(MapIterator.prototype);

        function Map(iterable) {
          var map = this;
          if (!ES.TypeIsObject(map)) {
            throw new TypeError("Constructor Map requires 'new'");
          }
          map = emulateES6construct(map);
          if (!map._es6map) {
            throw new TypeError('bad map');
          }

          var head = new MapEntry(null, null);
          // circular doubly-linked list.
          head.next = head.prev = head;

          defineProperties(map, {
            _head: head,
            _storage: emptyObject(),
            _size: 0
          });

          // Optionally initialize map from iterable
          if (typeof iterable !== 'undefined' && iterable !== null) {
            var it = ES.GetIterator(iterable);
            var adder = map.set;
            if (!ES.IsCallable(adder)) { throw new TypeError('bad map'); }
            while (true) {
              var next = ES.IteratorNext(it);
              if (next.done) { break; }
              var nextItem = next.value;
              if (!ES.TypeIsObject(nextItem)) {
                throw new TypeError('expected iterable of pairs');
              }
              adder.call(map, nextItem[0], nextItem[1]);
            }
          }
          return map;
        }
        var Map$prototype = Map.prototype;
        defineProperty(Map, symbolSpecies, function (obj) {
          var constructor = this;
          var prototype = constructor.prototype || Map$prototype;
          obj = obj || create(prototype);
          defineProperties(obj, { _es6map: true });
          return obj;
        });

        Value.getter(Map.prototype, 'size', function () {
          if (typeof this._size === 'undefined') {
            throw new TypeError('size method called on incompatible Map');
          }
          return this._size;
        });

        defineProperties(Map.prototype, {
          get: function (key) {
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              var entry = this._storage[fkey];
              if (entry) {
                return entry.value;
              } else {
                return;
              }
            }
            var head = this._head, i = head;
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                return i.value;
              }
            }
          },

          has: function (key) {
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              return typeof this._storage[fkey] !== 'undefined';
            }
            var head = this._head, i = head;
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                return true;
              }
            }
            return false;
          },

          set: function (key, value) {
            var head = this._head, i = head, entry;
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              if (typeof this._storage[fkey] !== 'undefined') {
                this._storage[fkey].value = value;
                return this;
              } else {
                entry = this._storage[fkey] = new MapEntry(key, value);
                i = head.prev;
                // fall through
              }
            }
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                i.value = value;
                return this;
              }
            }
            entry = entry || new MapEntry(key, value);
            if (ES.SameValue(-0, key)) {
              entry.key = +0; // coerce -0 to +0 in entry
            }
            entry.next = this._head;
            entry.prev = this._head.prev;
            entry.prev.next = entry;
            entry.next.prev = entry;
            this._size += 1;
            return this;
          },

          'delete': function (key) {
            var head = this._head, i = head;
            var fkey = fastkey(key);
            if (fkey !== null) {
              // fast O(1) path
              if (typeof this._storage[fkey] === 'undefined') {
                return false;
              }
              i = this._storage[fkey].prev;
              delete this._storage[fkey];
              // fall through
            }
            while ((i = i.next) !== head) {
              if (ES.SameValueZero(i.key, key)) {
                i.key = i.value = empty;
                i.prev.next = i.next;
                i.next.prev = i.prev;
                this._size -= 1;
                return true;
              }
            }
            return false;
          },

          clear: function () {
            this._size = 0;
            this._storage = emptyObject();
            var head = this._head, i = head, p = i.next;
            while ((i = p) !== head) {
              i.key = i.value = empty;
              p = i.next;
              i.next = i.prev = head;
            }
            head.next = head.prev = head;
          },

          keys: function () {
            return new MapIterator(this, 'key');
          },

          values: function () {
            return new MapIterator(this, 'value');
          },

          entries: function () {
            return new MapIterator(this, 'key+value');
          },

          forEach: function (callback) {
            var context = arguments.length > 1 ? arguments[1] : null;
            var it = this.entries();
            for (var entry = it.next(); !entry.done; entry = it.next()) {
              if (context) {
                callback.call(context, entry.value[1], entry.value[0], this);
              } else {
                callback(entry.value[1], entry.value[0], this);
              }
            }
          }
        });
        addIterator(Map.prototype, function () { return this.entries(); });

        return Map;
      }()),

      Set: (function () {
        // Creating a Map is expensive.  To speed up the common case of
        // Sets containing only string or numeric keys, we use an object
        // as backing storage and lazily create a full Map only when
        // required.
        var SetShim = function Set(iterable) {
          var set = this;
          if (!ES.TypeIsObject(set)) {
            throw new TypeError("Constructor Set requires 'new'");
          }
          set = emulateES6construct(set);
          if (!set._es6set) {
            throw new TypeError('bad set');
          }

          defineProperties(set, {
            '[[SetData]]': null,
            _storage: emptyObject()
          });

          // Optionally initialize map from iterable
          if (typeof iterable !== 'undefined' && iterable !== null) {
            var it = ES.GetIterator(iterable);
            var adder = set.add;
            if (!ES.IsCallable(adder)) { throw new TypeError('bad set'); }
            while (true) {
              var next = ES.IteratorNext(it);
              if (next.done) { break; }
              var nextItem = next.value;
              adder.call(set, nextItem);
            }
          }
          return set;
        };
        var Set$prototype = SetShim.prototype;
        defineProperty(SetShim, symbolSpecies, function (obj) {
          var constructor = this;
          var prototype = constructor.prototype || Set$prototype;
          obj = obj || create(prototype);
          defineProperties(obj, { _es6set: true });
          return obj;
        });

        // Switch from the object backing storage to a full Map.
        var ensureMap = function ensureMap(set) {
          if (!set['[[SetData]]']) {
            var m = set['[[SetData]]'] = new collectionShims.Map();
            Object.keys(set._storage).forEach(function (k) {
              // fast check for leading '$'
              if (k.charCodeAt(0) === 36) {
                k = k.slice(1);
              } else if (k.charAt(0) === 'n') {
                k = +k.slice(1);
              } else {
                k = +k;
              }
              m.set(k, k);
            });
            set._storage = null; // free old backing storage
          }
        };

        Value.getter(SetShim.prototype, 'size', function () {
          if (typeof this._storage === 'undefined') {
            // https://github.com/paulmillr/es6-shim/issues/176
            throw new TypeError('size method called on incompatible Set');
          }
          ensureMap(this);
          return this['[[SetData]]'].size;
        });

        defineProperties(SetShim.prototype, {
          has: function (key) {
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              return !!this._storage[fkey];
            }
            ensureMap(this);
            return this['[[SetData]]'].has(key);
          },

          add: function (key) {
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              this._storage[fkey] = true;
              return this;
            }
            ensureMap(this);
            this['[[SetData]]'].set(key, key);
            return this;
          },

          'delete': function (key) {
            var fkey;
            if (this._storage && (fkey = fastkey(key)) !== null) {
              var hasFKey = _hasOwnProperty(this._storage, fkey);
              return (delete this._storage[fkey]) && hasFKey;
            }
            ensureMap(this);
            return this['[[SetData]]']['delete'](key);
          },

          clear: function () {
            if (this._storage) {
              this._storage = emptyObject();
            } else {
              this['[[SetData]]'].clear();
            }
          },

          values: function () {
            ensureMap(this);
            return this['[[SetData]]'].values();
          },

          entries: function () {
            ensureMap(this);
            return this['[[SetData]]'].entries();
          },

          forEach: function (callback) {
            var context = arguments.length > 1 ? arguments[1] : null;
            var entireSet = this;
            ensureMap(entireSet);
            this['[[SetData]]'].forEach(function (value, key) {
              if (context) {
                callback.call(context, key, key, entireSet);
              } else {
                callback(key, key, entireSet);
              }
            });
          }
        });
        defineProperty(SetShim, 'keys', SetShim.values, true);
        addIterator(SetShim.prototype, function () { return this.values(); });

        return SetShim;
      }())
    };
    defineProperties(globals, collectionShims);

    if (globals.Map || globals.Set) {
      /*
        - In Firefox < 23, Map#size is a function.
        - In all current Firefox, Set#entries/keys/values & Map#clear do not exist
        - https://bugzilla.mozilla.org/show_bug.cgi?id=869996
        - In Firefox 24, Map and Set do not implement forEach
        - In Firefox 25 at least, Map and Set are callable without "new"
      */
      if (
        typeof globals.Map.prototype.clear !== 'function' ||
        new globals.Set().size !== 0 ||
        new globals.Map().size !== 0 ||
        typeof globals.Map.prototype.keys !== 'function' ||
        typeof globals.Set.prototype.keys !== 'function' ||
        typeof globals.Map.prototype.forEach !== 'function' ||
        typeof globals.Set.prototype.forEach !== 'function' ||
        isCallableWithoutNew(globals.Map) ||
        isCallableWithoutNew(globals.Set) ||
        !supportsSubclassing(globals.Map, function (M) {
          var m = new M([]);
          // Firefox 32 is ok with the instantiating the subclass but will
          // throw when the map is used.
          m.set(42, 42);
          return m instanceof M;
        })
      ) {
        globals.Map = collectionShims.Map;
        globals.Set = collectionShims.Set;
      }
    }
    if (globals.Set.prototype.keys !== globals.Set.prototype.values) {
      defineProperty(globals.Set.prototype, 'keys', globals.Set.prototype.values, true);
    }
    // Shim incomplete iterator implementations.
    addIterator(Object.getPrototypeOf((new globals.Map()).keys()));
    addIterator(Object.getPrototypeOf((new globals.Set()).keys()));
  }

  // Reflect
  if (!globals.Reflect) {
    defineProperty(globals, 'Reflect', {});
  }
  var Reflect = globals.Reflect;

  var throwUnlessTargetIsObject = function throwUnlessTargetIsObject(target) {
    if (!ES.TypeIsObject(target)) {
      throw new TypeError('target must be an object');
    }
  };

  // Some Reflect methods are basically the same as
  // those on the Object global, except that a TypeError is thrown if
  // target isn't an object. As well as returning a boolean indicating
  // the success of the operation.
  defineProperties(globals.Reflect, {
    // Apply method in a functional form.
    apply: function apply() {
      return ES.Call.apply(null, arguments);
    },

    // New operator in a functional form.
    construct: function construct(constructor, args) {
      if (!ES.IsCallable(constructor)) {
        throw new TypeError('First argument must be callable.');
      }

      return ES.Construct(constructor, args);
    },

    // When deleting a non-existent or configurable property,
    // true is returned.
    // When attempting to delete a non-configurable property,
    // it will return false.
    deleteProperty: function deleteProperty(target, key) {
      throwUnlessTargetIsObject(target);
      if (supportsDescriptors) {
        var desc = Object.getOwnPropertyDescriptor(target, key);

        if (desc && !desc.configurable) {
          return false;
        }
      }

      // Will return true.
      return delete target[key];
    },

    enumerate: function enumerate(target) {
      throwUnlessTargetIsObject(target);
      return new ObjectIterator(target, 'key');
    },

    has: function has(target, key) {
      throwUnlessTargetIsObject(target);
      return key in target;
    }
  });

  if (Object.getOwnPropertyNames) {
    defineProperties(globals.Reflect, {
      // Basically the result of calling the internal [[OwnPropertyKeys]].
      // Concatenating propertyNames and propertySymbols should do the trick.
      // This should continue to work together with a Symbol shim
      // which overrides Object.getOwnPropertyNames and implements
      // Object.getOwnPropertySymbols.
      ownKeys: function ownKeys(target) {
        throwUnlessTargetIsObject(target);
        var keys = Object.getOwnPropertyNames(target);

        if (ES.IsCallable(Object.getOwnPropertySymbols)) {
          keys.push.apply(keys, Object.getOwnPropertySymbols(target));
        }

        return keys;
      }
    });
  }

  if (Object.preventExtensions) {
    defineProperties(globals.Reflect, {
      isExtensible: function isExtensible(target) {
        throwUnlessTargetIsObject(target);
        return Object.isExtensible(target);
      },
      preventExtensions: function preventExtensions(target) {
        throwUnlessTargetIsObject(target);
        return callAndCatchException(function () {
          Object.preventExtensions(target);
        });
      }
    });
  }

  if (supportsDescriptors) {
    var internal_get = function get(target, key, receiver) {
      var desc = Object.getOwnPropertyDescriptor(target, key);

      if (!desc) {
        var parent = Object.getPrototypeOf(target);

        if (parent === null) {
          return undefined;
        }

        return internal_get(parent, key, receiver);
      }

      if ('value' in desc) {
        return desc.value;
      }

      if (desc.get) {
        return desc.get.call(receiver);
      }

      return undefined;
    };

    var internal_set = function set(target, key, value, receiver) {
      var desc = Object.getOwnPropertyDescriptor(target, key);

      if (!desc) {
        var parent = Object.getPrototypeOf(target);

        if (parent !== null) {
          return internal_set(parent, key, value, receiver);
        }

        desc = {
          value: void 0,
          writable: true,
          enumerable: true,
          configurable: true
        };
      }

      if ('value' in desc) {
        if (!desc.writable) {
          return false;
        }

        if (!ES.TypeIsObject(receiver)) {
          return false;
        }

        var existingDesc = Object.getOwnPropertyDescriptor(receiver, key);

        if (existingDesc) {
          return Reflect.defineProperty(receiver, key, {
            value: value
          });
        } else {
          return Reflect.defineProperty(receiver, key, {
            value: value,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }

      if (desc.set) {
        desc.set.call(receiver, value);
        return true;
      }

      return false;
    };

    var callAndCatchException = function ConvertExceptionToBoolean(func) {
      try { func(); } catch (_) { return false; }
      return true;
    };

    defineProperties(globals.Reflect, {
      defineProperty: function defineProperty(target, propertyKey, attributes) {
        throwUnlessTargetIsObject(target);
        return callAndCatchException(function () {
          Object.defineProperty(target, propertyKey, attributes);
        });
      },

      getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, propertyKey) {
        throwUnlessTargetIsObject(target);
        return Object.getOwnPropertyDescriptor(target, propertyKey);
      },

      // Syntax in a functional form.
      get: function get(target, key) {
        throwUnlessTargetIsObject(target);
        var receiver = arguments.length > 2 ? arguments[2] : target;

        return internal_get(target, key, receiver);
      },

      set: function set(target, key, value) {
        throwUnlessTargetIsObject(target);
        var receiver = arguments.length > 3 ? arguments[3] : target;

        return internal_set(target, key, value, receiver);
      }
    });
  }

  if (Object.getPrototypeOf) {
    var objectDotGetPrototypeOf = Object.getPrototypeOf;
    defineProperties(globals.Reflect, {
      getPrototypeOf: function getPrototypeOf(target) {
        throwUnlessTargetIsObject(target);
        return objectDotGetPrototypeOf(target);
      }
    });
  }

  if (Object.setPrototypeOf) {
    var willCreateCircularPrototype = function (object, proto) {
      while (proto) {
        if (object === proto) {
          return true;
        }
        proto = Reflect.getPrototypeOf(proto);
      }
      return false;
    };

    defineProperties(globals.Reflect, {
      // Sets the prototype of the given object.
      // Returns true on success, otherwise false.
      setPrototypeOf: function setPrototypeOf(object, proto) {
        throwUnlessTargetIsObject(object);
        if (proto !== null && !ES.TypeIsObject(proto)) {
          throw new TypeError('proto must be an object or null');
        }

        // If they already are the same, we're done.
        if (proto === Reflect.getPrototypeOf(object)) {
          return true;
        }

        // Cannot alter prototype if object not extensible.
        if (Reflect.isExtensible && !Reflect.isExtensible(object)) {
          return false;
        }

        // Ensure that we do not create a circular prototype chain.
        if (willCreateCircularPrototype(object, proto)) {
          return false;
        }

        Object.setPrototypeOf(object, proto);

        return true;
      }
    });
  }

  if (String(new Date(NaN)) !== 'Invalid Date') {
    var dateToString = Date.prototype.toString;
    var shimmedDateToString = function toString() {
      var valueOf = +this;
      if (valueOf !== valueOf) {
        return 'Invalid Date';
      }
      return dateToString.call(this);
    };
    defineProperty(shimmedDateToString, 'toString', dateToString.toString, true);
    defineProperty(Date.prototype, 'toString', shimmedDateToString, true);
  }

  // Annex B HTML methods
  // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-additional-properties-of-the-string.prototype-object
  var stringHTMLshims = {
    anchor: function anchor(name) { return ES.CreateHTML(this, 'a', 'name', name); },
    big: function big() { return ES.CreateHTML(this, 'big', '', ''); },
    blink: function blink() { return ES.CreateHTML(this, 'blink', '', ''); },
    bold: function bold() { return ES.CreateHTML(this, 'b', '', ''); },
    fixed: function fixed() { return ES.CreateHTML(this, 'tt', '', ''); },
    fontcolor: function fontcolor(color) { return ES.CreateHTML(this, 'font', 'color', color); },
    fontsize: function fontsize(size) { return ES.CreateHTML(this, 'font', 'size', size); },
    italics: function italics() { return ES.CreateHTML(this, 'i', '', ''); },
    link: function link(url) { return ES.CreateHTML(this, 'a', 'href', url); },
    small: function small() { return ES.CreateHTML(this, 'small', '', ''); },
    strike: function strike() { return ES.CreateHTML(this, 'strike', '', ''); },
    sub: function sub() { return ES.CreateHTML(this, 'sub', '', ''); },
    sup: function sub() { return ES.CreateHTML(this, 'sup', '', ''); }
  };
  defineProperties(String.prototype, stringHTMLshims);
  Object.keys(stringHTMLshims).forEach(function (key) {
    var method = String.prototype[key];
    var shouldOverwrite = false;
    if (ES.IsCallable(method)) {
      var output = method.call('', ' " ');
      var quotesCount = [].concat(output.match(/"/g)).length;
      shouldOverwrite = output !== output.toLowerCase() || quotesCount > 2;
    } else {
      shouldOverwrite = true;
    }
    if (shouldOverwrite) {
      defineProperty(String.prototype, key, stringHTMLshims[key], true);
    }
  });

  return globals;
}));

}).call(this,require('_process'))
},{"_process":77}],19:[function(require,module,exports){
/*
 ******************************************************************************
 * @file lib/device.js
 * @company Spark ( https://www.spark.io/ )
 * @source https://github.com/spark/sparkjs
 *
 * @Contributors
 *    David Middlecamp (david@spark.io)
 *    Edgar Silva (https://github.com/edgarsilva)
 *    Javier Cervantes (https://github.com/solojavier)
 *
 * @brief Basic Device class
 ******************************************************************************
  Copyright (c) 2014 Spark Labs, Inc.  All rights reserved.

  This program is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation, either
  version 3 of the License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this program; if not, see <http://www.gnu.org/licenses/>.
  ******************************************************************************
 */

/*jslint node: true */
'use strict';

var Device = function (attributes, spark) {
  this._spark = spark;
  this.attributes = {};
  this._updateAttrs(attributes);
  this.requirePlugins();
};

Device.prototype.remove = function(callback) {
  return this._spark.removeCore(this.id, callback);
};

Device.prototype.rename = function(name, callback) {
  return this._spark.renameCore(this.id, name, callback);
};

Device.prototype.signal = function(callback) {
  return this._spark.signalCore(this.id, true, callback);
};

Device.prototype.stopSignal = function(callback) {
  return this._spark.signalCore(this.id, false, callback);
};

Device.prototype.flash = function(files, callback) {
  return this._spark.flashCore(this.id, files, callback);
};

Device.prototype.sendPublicKey = function(buffer, callback) {
  return this._spark.sendPublicKey(this.id, buffer, callback);
};

Device.prototype.callFunction = function(name, params, callback) {
  return this._spark.callFunction(this.id, name, params, callback);
};

Device.prototype.subscribe = function(eventName, callback) {
  return this._spark.getEventStream(eventName, this.id, callback);
};

Device.prototype.createWebhook = function(eventName, url, callback) {
  return this._spark.createWebhook(eventName, url, this.id, callback);
};

Device.prototype.getVariable = function(name, callback) {
  return this._spark.getVariable(this.id, name, callback);
};

Device.prototype.getAttributes = function(callback) {
  this._spark.getAttributes(this.id, function(err, data) {
    if (!err) {
      this._updateAttrs(data);
    }
    callback(err, data);
  }.bind(this));
};

Device.prototype.onEvent = function(eventName, callback) {
  return this._spark.getEventStream(eventName, this.id, callback);
};

Device.prototype._updateAttrs = function(attrs) {
  var replacer = function(match){
    return match.toUpperCase().replace('_','');
  };

  var tmpKey = '';

  for (var key in attrs) {
    tmpKey = key.replace(/(\_[a-z])/g, replacer);
    this[tmpKey] =attrs[key];
    this.attributes[tmpKey] = attrs[key];
  }
};

Device.prototype.requirePlugins = function() {
  var plugins = this._spark.plugins;
  var Plugin = null;
  var name = '';
  var moduleName = '';

  for (var i in plugins) {
    name = plugins[i];
    moduleName = 'spark-' + name;
    Plugin = require(moduleName);
    this[name] = new Plugin(this.id, this._spark);
  }
};

module.exports = Device;

},{}],20:[function(require,module,exports){
(function (process){
/*
 ******************************************************************************
 * @file lib/spark-api.js
 * @company Spark ( https://www.spark.io/ )
 * @source https://github.com/spark/sparkjs
 *
 * @Contributors
 *    David Middlecamp (david@spark.io)
 *    Edgar Silva (https://github.com/edgarsilva)
 *    Javier Cervantes (https://github.com/solojavier)
 *
 * @brief Basic API request handler
 ******************************************************************************
  Copyright (c) 2014 Spark Labs, Inc.  All rights reserved.

  This program is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation, either
  version 3 of the License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this program; if not, see <http://www.gnu.org/licenses/>.
  ******************************************************************************
 */

/*jslint node: true */
'use strict';

var fs = require('fs'),
    path = require('path');

/**
 * Creates a new SparkApi obj
 * @constructor {SparkApi}
 * @param {Object} args - { clientId: 'clientId', clientSecret: 'clientSecret', baseUrl: 'https://api.spark.io' }
 */
var SparkApi = function(args) {
  this.request = require('request');
  this.clientId = args.clientId;
  this.clientSecret = args.clientSecret;
  this.baseUrl = args.baseUrl;
};

/**
 * Login to the Spark Cloud
 *
 * @param {Object} params - { username, password }
 * @param {callback} callback (err, data)
 * @returns {Promise}
 * @endpoint GET /oauth/token
 */
SparkApi.prototype.login = function (params, callback) {
  this.request({
    uri: this.baseUrl + '/oauth/token',
    method: 'POST',
    json: true,
    form: {
      username: params.username,
      password: params.password,
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret
    }
  }, callback);
};

/**
 * Returns a list of devices for the logged in user
 *
 * @this {SparkApi}
 * @param {object} params - { accessToken }
 * @param {function} callback(err, data)
 * @returns {Promise}
 * @endpoint GET /v1/devices
 */
SparkApi.prototype.listDevices = function (params, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices?access_token=' + params.accessToken,
    method: 'GET',
    json: true
  }, callback);
};

/**
 * Returns an object describing a core device
 *
 * @this {SparkApi}
 * @param {object} params - { deviceId, accessToken }
 * @param {function} callback(err, data)
 * @returns {Promise}
 * @endpoint GET /v1/devices
 */
SparkApi.prototype.getDevice = function (params, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices/' + params.deviceId + '?access_token=' + params.accessToken,
    method: 'GET',
    json: true
  }, callback);
};

/**
 * Creates an user in the Spark cloud
 *
 * @this {SparkApi}
 * @param {string} username - Email for the user to be registered
 * @param {string} password
 * @param {function} callback(err, data) - To be executed upon API call completion
 * @returns {Promise}
 * @endpoint POST /v1/users
 */
SparkApi.prototype.createUser = function (username, password, callback) {
  this.request({
    uri: this.baseUrl + '/v1/users',
    method: 'POST',
    form: {
      username: username,
      password: password
    },
    json: true
  }, callback);
};

/**
 * Removes accessToken from the Spark cloud for the specified user.
 *
 * @this {SparkApi}
 * @param {string} username - Email for the user to be registered
 * @param {string} password
 * @param {string} accessToken - the access_token to be removed
 * @param {function} callback(err, data) - To be executed upon API call completion
 * @returns {Promise}
 * @endpoint DELETE /v1/access_tokens/<access_token>
 */
SparkApi.prototype.removeAccessToken = function (username, password, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/access_tokens/' + accessToken,
    method: 'DELETE',
    auth: {
      username: username,
      password: password
    },
    form: {
      access_token: accessToken
    },
    json: true
  }, callback);
};

/**
 * Claims a core and adds it to the user currently logged in
 *
 * @param {string} coreId - The id of the Spark core you wish to claim
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint POST /v1/devices
 */
SparkApi.prototype.claimCore = function (coreId, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices',
    method: 'POST',
    form: {
      id: coreId,
      access_token: accessToken
    },
    json: true
  }, callback);
};

/**
 * Removes a core from the user currently logged in
 *
 * @param {string} coreId - The id of the Spark core you wish to claim
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint DELETE /v1/devices/<core_id>
 */
SparkApi.prototype.removeCore = function (coreId, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices/' + coreId,
    method: 'DELETE',
    form: {
      id: coreId,
      access_token: accessToken
    },
    json: true
  }, callback);
};

/**
 * Renames a core for the user currently logged in
 *
 * @param {string} coreId - The id of the Spark core you wish to claim
 * @param {string} name - New core name
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/devices/<core_id>
 */
SparkApi.prototype.renameCore = function (coreId, name, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices/' + coreId,
    method: 'PUT',
    form: {
      name: name,
      access_token: accessToken
    },
    json: true
  }, callback);
};

/**
 * Tries to change the product_id on the device
 *
 * @param {string} coreId - The id of the Spark core you wish to claim
 * @param {string} product_id - use this carefully, it will impact what updates you receive, and can only be used
 *                              for products that have given their permission
 * @param {string} should_update - if the device should be immediately updated after changing the product_id
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/devices/<core_id>
 */
SparkApi.prototype.changeProduct = function (coreId, product_id, should_update, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices/' + coreId,
    method: 'PUT',
    form: {
      product_id: product_id,
      update_after_claim: should_update,
      access_token: accessToken
    },
    json: true
  }, callback);
};

/**
 * Gets all attributes for a given core
 *
 * @param {string} coreId - The id of the Spark core you wish get attrs for
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint GET /v1/devices/<core_id>
 */
SparkApi.prototype.getAttributes = function (coreId, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices/' + coreId + '?access_token=' + accessToken,
    method: 'GET',
    json: true
  }, callback);
};

/**
 * Gets an attribute for a specific Core
 *
 * @param {string} coreId - The id of the Spark core you wish get attrs for
 * @param {string} name - The name of the variable/attr to retrieve
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint GET /v1/devices/<core_id>/<variable_name>
 */
SparkApi.prototype.getVariable = function (coreId, name, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices/' + coreId + '/' + name + '?access_token=' + accessToken,
    method: 'GET',
    json: true
  }, callback);
};

/**
 * Send a signal to a Core
 *
 * @param {string} coreId - The id of the Spark core you wish to signal
 * @param {boolean} signal - If the core should be emitting signals or not
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/devices/<core_id>
 */
SparkApi.prototype.signalCore = function (coreId, signal, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices/' + coreId,
    method: 'PUT',
    form: {
      signal: (signal) ? 1 : 0,
      access_token: accessToken
    },
    json: true
  }, callback);
};

/**
 * Flash Tinker firmware to a Core
 *
 * @param {string} coreId - The id of the Spark core you wish to signal
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/devices/<core_id>
 */
SparkApi.prototype.flashTinker = function (coreId, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices/' + coreId,
    method: 'PUT',
    form: {
      access_token: accessToken,
      app: 'tinker'
    },
    json: true
  }, callback);
};

/**
 * Flash firmware to a Core
 *
 * @param {string} coreId - The id of the Spark core you wish to signal
 * @param {[string]} files - An array of strings containing the files to flash
 * @param {function} accessToken
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/devices/<core_id>
 */
SparkApi.prototype.flashCore = function (coreId, files, accessToken, callback) {
  files = Array.isArray(files) ? files : [files];

  var r = this.request({
    uri: this.baseUrl + '/v1/devices/' + coreId + '?access_token=' + accessToken,
    method: 'PUT',
    json: true
  }, callback);

  var form = r.form(),
      paramName = 'file';

  for (var i in files) {
    form.append(paramName, fs.createReadStream(path.join(process.cwd(), files[i])), {
      filename: path.basename(files[i])
    });
    paramName = 'file' + i;
  }
};

/**
 * Compiles files in the Spark cloud
 *
 * @param {[string]} files - An array of strings containing the files to compile
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/binaries
 */
SparkApi.prototype.compileCode = function(files, accessToken, callback) {
  files = Array.isArray(files) ? files : [files];

  var r = this.request({
    uri: this.baseUrl + '/v1/binaries?access_token=' + accessToken,
    method: 'POST',
    json: true
  }, callback);

  var form = r.form(),
      paramName = 'file';

  for (var i in files) {
    form.append(i, fs.createReadStream(path.join(process.cwd(), files[i])), {
      filename: path.basename(files[i])
    });
    paramName = 'file' + i;
  }
};

/**
 * Download binary file from the spark cloud
 *
 * @param {string} url - The url for the binary
 * @param {string} filename
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint GET /<url>
 */
SparkApi.prototype.downloadBinary = function (url, filename, accessToken, callback) {
  var response = this.request({
    uri: this.baseUrl + url + '?access_token=' + accessToken,
    method: 'GET'
  }, callback);

  return response;
};

/**
 * Sends a public key to the Spark cloud
 *
 * @param {string} coreId - The id of the Core
 * @param {Buffer} buffer - The buffer for the public key
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @returns {Promise}
 * @endpoint GET /v1/provisioning/<core_id>
 */
SparkApi.prototype.sendPublicKey = function (coreId, buffer, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/provisioning/' + coreId,
    method: 'POST',
    form: {
      deviceID: coreId,
      publicKey: buffer.toString(),
      order: 'manual_' + ((new Date()).getTime()),
      filename: 'cli',
      access_token: accessToken
    },
    json: true
  }, callback);
};

/**
 * Call a function on a Core
 *
 * @param {string} coreId - The id of the Core
 * @param {string} functionName - The name of the function to call
 * @param {string} funcParam - Param for the function
 * @param {string} accessToken - current access token
 * @param {string} callback
 * @returns {Promise}
 * @endpoint GET /v1/devices/<core_id>/<function_name>
 */
SparkApi.prototype.callFunction = function (coreId, functionName, funcParam, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices/' + coreId + '/' + functionName,
    method: 'POST',
    form: {
      args: funcParam,
      access_token: accessToken
    },
    json: true
  }, callback);
};

/**
 * Get eventListener to an event stream in the Spark cloud
 *
 * @param {string} eventName - prefix filter for events, or null to receive all events
 * @param {string} coreId - ID or name of device, or the string 'mine'
 *                          to only listen to current user's devices, or
 *                          null to listen to the public firehose of events
 * @param {string} accessToken - current access token
 * @param {function} callback - handler to call for each event received from the API
 * @endpoint GET /v1/events/<optional_event_filter>
 * @endpoint GET /v1/devices/events/<optional_event_filter>
 * @endpoint GET /v1/devices/<core_id>/events/<optional_event_filter>
 *
 * @returns {Request}
 */
SparkApi.prototype.getEventStream = function (eventName, coreId, accessToken, callback) {
  var url;

  if (!coreId) {
    url = '/v1/events';
  } else if (coreId == 'mine') {
    url = '/v1/devices/events';
  } else {
    url = '/v1/devices/' + coreId + '/events';
  }

  if (eventName) {
    url += '/' + eventName;
  }

  var requestObj = this.request({
    uri: this.baseUrl + url + '?access_token=' + accessToken,
    method: 'GET'
  }, callback);

  return requestObj;
};

/**
 * Register an event stream in the Spark cloud
 * (This feature is in a limited beta, and is not yet generally available)
 *
 * @param {string} eventName - Event to register
 * @param {string} data - To be passed to the to the event
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @endpoint POST /v1/devices/events
 *
 * @returns {Promise}
 */
SparkApi.prototype.publishEvent = function (eventName, data, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/devices/events',
    method: 'POST',
    form: {
      name: eventName,
      data: data,
      access_token: accessToken
    },
    json: true
  }, callback);
};

/**
 * Creates a new webhook in the Spark cloud
 * (Spark server implementation is WIP)
 *
 * @param {string} eventName - Event to register
 * @param {string} url - To hook to
 * @param {string} coreId - Id of the Core
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @endpoint POST /v1/webhooks
 *
 * @returns {Promise}
 */
SparkApi.prototype.createWebhook = function (eventName, url, coreId, accessToken, callback) {
  var body = {
    event: eventName,
    url: url,
    access_token: accessToken
  };

  if (coreId === 'mine') {
    body.mydevices = true;
  } else {
    body.deviceid = coreId;
  }

  this.request({
    uri: this.baseUrl + '/v1/webhooks',
    method: 'POST',
    form: body,
    json: true
  }, callback);
};

/**
 * Deletes a webhook
 * (Spark server implementation is WIP)
 *
 * @param {string} hookId - Id of the webhook
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @endpoint DELETE /v1/webhooks/<hook_id>
 *
 * @returns {Promise}
 */
SparkApi.prototype.deleteWebhook = function (hookId, accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/webhooks/' + hookId + '?access_token=' + accessToken,
    method: 'DELETE',
    json: true
  }, callback);
};

/**
 * Gets a list of all webhooks
 * (Spark server implementation is WIP)
 *
 * @param {string} accessToken - current access token
 * @param {function} callback
 * @endpoint GET /v1/webhooks
 *
 * @returns {Promise}
 */
SparkApi.prototype.listWebhooks = function (accessToken, callback) {
  this.request({
    uri: this.baseUrl + '/v1/webhooks/?access_token=' + accessToken,
    method: 'GET',
    json: true
  }, callback);
};

module.exports = SparkApi;

}).call(this,require('_process'))
},{"_process":77,"fs":62,"path":76,"request":2}],21:[function(require,module,exports){
/*
 ******************************************************************************
 * @file lib/spark.js
 * @company Spark ( https://www.spark.io/ )
 * @source https://github.com/spark/sparkjs
 *
 * @Contributors
 *    David Middlecamp (david@spark.io)
 *    Edgar Silva (https://github.com/edgarsilva)
 *    Javier Cervantes (https://github.com/solojavier)
 *
 * @brief Main Spark Api class
 ******************************************************************************
  Copyright (c) 2014 Spark Labs, Inc.  All rights reserved.

  This program is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation, either
  version 3 of the License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this program; if not, see <http://www.gnu.org/licenses/>.
  ******************************************************************************
 */

/*jslint node: true */
'use strict';

var when = require('when'),
    pipeline = require('when/pipeline');

var fs = require('fs'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter,
    Device = require('./device'),
    SparkApi = require('./spark-api');

/**
 * Creates a new Spark obj
 * @constructor {Spark}
 */
var Spark = function() {
  this.clientId = 'Spark';
  this.clientSecret = 'Spark';
  this.baseUrl = 'https://api.spark.io';
  this.accessToken = null;
  this.plugins = [];
  this.devices = [];
  this.api = new SparkApi({
    clientId: this.clientId,
    clientSecret: this.clientSecret,
    baseUrl: this.baseUrl
  });
};

util.inherits(Spark, EventEmitter);

/**
 * Resolves an api response
 *
 * @this {Spark}
 * @param {string} defer - The defer object that will be resolved
 * @param {string} err - The error returned from reponse
 * @param {object} data - The data of the response
 * @param {function} callback - Function to execute on complete
 * @returns: null
 */
Spark.prototype.resolveDefer = function(defer, err, data, callback) {
  if (defer) {
    if (err) {
      defer.reject(err);
    } else{
      defer.resolve(data);
    }
  }
};
/**
 * Creates and returns a defet obj based on listeners and callback provided.
 *
 * @this {Spark}
 * @param {string} eventName
 * @param {function} callback
 * @returns: null
 */
Spark.prototype.createDefer = function(eventName, callback) {
  var defer = null;

  if (!callback && (this.listeners(eventName).length === 0)) {
    defer = when.defer();
  }

  return defer;
};

/**
 * Returns a default normalized err, created either by request or by response
 *
 * @this {Spark}
 * @param {Err} err - The err returned by request
 * @param {Object} data - Data returned by request
 * @param {function} callback - Callback to be executed upon completion
 * @returns: {Error} err - Normalized error
 */
Spark.prototype.normalizeErr = function(err, data, callback) {
  if (!err && data.error) {
    err = new Error(data.error);
  }

  return err;
};

/**
 * Emits an event and executes the callback
 *
 * @this {Spark}
 * @param {string} eventName - Name of the event to be emitted.
 * @param {error} err - Error thrown if any, or null.
 * @param {object} params - To be passed to the callback and event emitted.
 * @param {function} callback - To be executed, only if typeof returns 'function'.
 * @returns null
 */
Spark.prototype.emitAndCallback = function(eventName, err, data, callback) {
  if (!!err) { data = null; }
  this.emit(eventName, err, data);
  if ('function' === typeof(callback)) { callback(err, data); }
};

/**
 * Returns a default handler for generic ApiCalls
 *
 * @this {Spark}
 * @param {string} eventName - The event name to be triggered
 * @param {Defer} defer - The deferer to resolve/reject the promise
 * @param {function} userCb - Callback passed by the user to be executed on completion of request
 * @param {function} sparkCb - Callback created to setup attrs on request completion
 * @returns: {function} handler - the handler function to be passed to the request
 */
Spark.prototype.defaultHandler = function(eventName, defer, userCb, sparkCb) {
  var handler = function(err, response, data) {
    err = this.normalizeErr(err, data);
    if (!err && (typeof(sparkCb) === 'function')) { sparkCb(data); }
    this.resolveDefer(defer, err, data);
    this.emitAndCallback(eventName, err, data, userCb);
  }.bind(this);

  return handler;
};

Spark.prototype.include = function(plugins) {
  plugins = (Array.isArray(plugins) ? plugins : [plugins]);

  for (var i in plugins) {
    if (this.plugins.indexOf(plugins[i]) == -1) {
      this.plugins.push(plugins[i]);
    }
  }

};

/**
 * Login to the Spark Cloud
 *
 * @param {string} username - Email for the user
 * @param {string} password
 * @param {callback} callback(err, data)
 * @returns {Promise}
 * @endpoint GET /oauth/token
 */
Spark.prototype.login = function (params, callback) {
  var defer = this.createDefer('login', callback);

  var handler = this.defaultHandler('login', defer, callback, function(data) {
    this.accessToken = data.access_token || data.accessToken;
  }.bind(this));

  if (params.accessToken) {
    handler(null, params, params);
  } else {
    this.api.login(params, handler);
  }

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Returns a device based on the param deviceId
 *
 * @this {Spark}
 * @param {string} deviceId - the id of the core to retrieve
 * @param {function} callback(err, data)
 * @returns {Promise}
 * @endpoint GET /v1/devices
 */
Spark.prototype.getDevice = function (deviceId, callback) {
  var defer = this.createDefer('getDevice', callback);
  var device = null;

  var handler = function(err, response, data) {
    err = this.normalizeErr(err, data);
    if (data && (data.id == deviceId)) {
      device = new Device(data, this);
    }
    this.resolveDefer(defer, err, device);
    this.emitAndCallback('getDevice', err, device, callback);
  }.bind(this);

  this.api.getDevice({deviceId: deviceId, accessToken: this.accessToken }, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Returns a list of devices for the logged in user
 *
 * @this {Spark}
 * @param {function} callback(err, data)
 * @returns {Promise}
 * @endpoint GET /v1/devices
 */
Spark.prototype.listDevices = function (callback) {
  var defer = this.createDefer('listDevices', callback);

  var handler = function(err, response, data) {
    err = this.normalizeErr(err, data);
    this.devices = [];
    if (Array.isArray(data)) {
      for (var i in data) {
        this.devices.push(new Device(data[i], this));
      }
    }
    this.resolveDefer(defer, err, this.devices);
    this.emitAndCallback('listDevices', err, this.devices, callback);
  }.bind(this);

  this.api.listDevices({ accessToken: this.accessToken }, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Returns true if Spark has an accessToken and is able to make API calls
 *
 * @this {Spark}
 * @returns {boolean}
 */
Spark.prototype.ready = function() {
  return !!this.accessToken;
};

/**
 * Creates an user in the Spark cloud
 *
 * @this {Spark}
 * @param {string} username - Email for the user to be registered
 * @param {string} password
 * @param {function} callback(err, data) - To be executed upon API call completion
 * @returns {Promise}
 * @endpoint POST /v1/users
 */
Spark.prototype.createUser = function (username, password, callback) {
  var defer = this.createDefer('createUser', callback),
      emailRegex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;

  if (!username || (username === '') || (!emailRegex.test(username))) {
    var err = new Error('Username must be an email address.');
    this.emitAndCallback('createUser', err, null, callback);
    if (!!defer) { defer.reject(err); }
  } else {
    var handler = this.defaultHandler('createUser', defer, callback, function(data) {
      this.username = username;
      this.password = password;
    }.bind(this));

    this.api.createUser(username, password, handler);
  }

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Removes accessToken from the Spark cloud for the specified user.
 *
 * @this {Spark}
 * @param {string} username - Email for the user to be registered
 * @param {string} password
 * @param {string} accessToken - the access_token to be removed
 * @param {function} callback(err, data) - To be executed upon API call completion
 * @returns {Promise}
 * @endpoint DELETE /v1/access_tokens/<access_token>
 */
Spark.prototype.removeAccessToken = function (username, password, accessToken, callback) {
  var defer = this.createDefer('removeAccessToken', callback),
      handler = this.defaultHandler('removeAccessToken', defer, callback).bind(this);

  accessToken = accessToken || this.accessToken;

  this.api.removeAccessToken(username, password, accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Claims a core and adds it to the user currently logged in
 *
 * @param {string} coreId - The id of the Spark core you wish to claim
 * @param {function} callback
 * @returns {Promise}
 * @endpoint POST /v1/devices
 */
Spark.prototype.claimCore = function (coreId, callback) {
  var defer = this.createDefer('claimCore', callback),
      handler = this.defaultHandler('claimCore', defer, callback).bind(this);

  this.api.claimCore(coreId, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Removes a core from the user currently logged in
 *
 * @param {string} coreId - The id of the Spark core you wish to claim
 * @param {function} callback
 * @returns {Promise}
 * @endpoint DELETE /v1/devices/<core_id>
 */
Spark.prototype.removeCore = function (coreId, callback) {
  var defer = this.createDefer('removeCore', callback),
      handler = this.defaultHandler('removeCore', defer, callback).bind(this);

  this.api.removeCore(coreId, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Renames a core for the user currently logged in
 *
 * @param {string} coreId - The id of the Spark core you wish to claim
 * @param {string} name - New core name
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/devices/<core_id>
 */
Spark.prototype.renameCore = function (coreId, name, callback) {
  var defer = this.createDefer('renameCore', callback),
      handler = this.defaultHandler('renameCore', defer, callback).bind(this);

  this.api.renameCore(coreId, name, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Gets all attributes for a given core
 *
 * @param {string} coreId - The id of the Spark core you wish get attrs for
 * @param {function} callback
 * @returns {Promise}
 * @endpoint GET /v1/devices/<core_id>
 */
Spark.prototype.getAttributes = function (coreId, callback) {
  var defer = this.createDefer('getAttributes', callback),
      handler =  this.defaultHandler('getAttributes', defer, callback);

  this.api.getAttributes(coreId, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Gets an attribute for a specific Core
 *
 * @param {string} coreId - The id of the Spark core you wish get attrs for
 * @param {string} name - The name of the variable/attr to retrieve
 * @param {function} callback
 * @returns {Promise}
 * @endpoint GET /v1/devices/<core_id>/<variable_name>
 */
Spark.prototype.getVariable = function (coreId, name, callback) {
  var defer = this.createDefer('getVariable', callback),
      handler = this.defaultHandler('getVariable', defer, callback).bind(this);

  this.api.getVariable(coreId, name, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Send a signal to a Core
 *
 * @param {string} coreId - The id of the Spark core you wish to signal
 * @param {boolean} name - If the core should be emitting signals or not
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/devices/<core_id>
 */
Spark.prototype.signalCore = function (coreId, beSignalling, callback) {
  var defer = this.createDefer('signalCore', callback),
      handler = this.defaultHandler('signalCore', defer, callback).bind(this);

  this.api.signalCore(coreId, beSignalling, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Flash Tinker firmware to a Core
 *
 * @param {string} coreId - The id of the Spark core you wish to signal
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/devices/<core_id>
 */
Spark.prototype.flashTinker = function (coreId, callback) {
  var defer = this.createDefer('flashTinker', callback),
      handler = this.defaultHandler('flashTinker', defer, callback).bind(this);

  this.api.flashTinker(coreId, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Flash firmware to a Core
 *
 * @param {string} coreId - The id of the Spark core you wish to signal
 * @param {[string]} files - An array of strings containing the files to flash
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/devices/<core_id>
 */
Spark.prototype.flashCore = function (coreId, files, callback) {
  var defer = this.createDefer('flashCore', callback),
      handler = this.defaultHandler('flashCore', defer, callback).bind(this);

  this.api.flashCore(coreId, files, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Compiles files in the Spark cloud
 *
 * @param {[string]} files - An array of strings containing the files to compile
 * @param {function} callback
 * @returns {Promise}
 * @endpoint PUT /v1/binaries
 */
Spark.prototype.compileCode = function(files, callback) {
  var defer = this.createDefer('compileCode', callback),
      handler = this.defaultHandler('compileCode', defer, callback);

  this.api.compileCode(files, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Download binary file from the spark cloud
 *
 * @param {string} url - The url for the binary
 * @param {string} filename
 * @param {function} callback
 * @returns {Promise}
 * @endpoint GET /<url>
 */
Spark.prototype.downloadBinary = function (url, filename, callback) {
  var defer = this.createDefer('downloadBinary', callback),
      outFs = fs.createWriteStream(filename),
      handler = this.defaultHandler('downloadBinary', defer, callback).bind(this);

  this.api.downloadBinary(url, filename, this.accessToken, handler).pipe(outFs);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Sends a public key to the Spark cloud
 *
 * @param {string} coreId - The id of the Core
 * @param {Buffer} buffer - The buffer for the public key
 * @param {function} callback
 * @returns {Promise}
 * @endpoint GET /v1/provisioning/<core_id>
 */
Spark.prototype.sendPublicKey = function (coreId, buffer, callback) {
  var defer = this.createDefer('sendPublicKey', callback),
      handler = this.defaultHandler('sendPublicKey', defer, callback).bind(this);

  this.api.sendPublicKey(coreId, buffer, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Call a function on a Core
 *
 * @param {string} coreId - The id of the Core
 * @param {string} functionName - The name of the function to call
 * @param {string} funcParam - Param for the function
 * @returns {Promise}
 * @endpoint GET /v1/devices/<core_id>/<function_name>
 */
Spark.prototype.callFunction = function (coreId, functionName, funcParam, callback) {
  var defer = this.createDefer('callFunction', callback),
      handler = this.defaultHandler('callFunction', defer, callback).bind(this);

  this.api.callFunction(coreId, functionName, funcParam, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Lookup all attrs for a list of Cores
 *
 * @param {[string]} cores - An array of all the cores to get attributes for
 * @returns {Promise}
 */
Spark.prototype.lookupAttributesForAll = function (cores) {
  var defer = this.createDefer('lookupAttributesForAll', null);

  if (!cores || (cores.length === 0)) {
    this._attributeCache = null;
  } else {
    var promises = [];

    for (var i = 0; i < cores.length; i++) {
      var coreId = cores[i].id;

      if (cores[i].connected) {
        promises.push(this.getAttributes(coreId));
      } else {
        promises.push(when.resolve(cores[i]));
      }
    }

    when.all(promises).then(function (cores) {
      //sort alphabetically
      cores = cores.sort(function (a, b) {
        return (a.name || '').localeCompare(b.name);
      });

      this._attributeCache = cores;
      defer.resolve(cores);
    }.bind(this));
  }

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Retrieves all attributes for all cores for the currently logged in user
 *
 * @returns {Promise}
 */
Spark.prototype.getAttributesForAll = function () {
  if (this._attributeCache) {
    return when.resolve(this._attributeCache);
  }

  // TODO: Probably bind to this in pipeline execution
  return pipeline([
    this.listDevices.bind(this),
    this.lookupAttributesForAll.bind(this)
  ]);
};

/**
 * Get eventListener to an event stream in the Spark cloud
 *
 * @param {string} eventName - Event to register
 * @param {[string]} coreId - Optional Id for the core for which to get the listener
 * @param {function} callback
 * @endpoint GET /v1/devices/<core_id>/events
 *
 * @returns {Request}
 */
Spark.prototype.getEventStream = function (eventName, coreId, callback) {
  var defer = this.createDefer('getEventStream', callback),
      handler = this.defaultHandler('getEventStream', defer, callback).bind(this),
      requestObj = this.api.getEventStream(eventName, coreId, this.accessToken, handler);

    if (callback) {
        //if ((event !== '') && (typeof(callback) === 'function')) { callback(event); }
        var processor = this._createStreamProcessor();
        processor.watch(requestObj, callback);
    }

  return requestObj;
};

/**
 * Collects SSE pieces, and parses and returns them nicely
 * @private
 */
Spark.prototype._createStreamProcessor = function() {

    var Processor = function() {};
    Processor.prototype = {
        chunks: [],
        appendToQueue: function(arr) {
            for (var i = 0; i < arr.length; i++) {
                var line = (arr[i] || "").trim();
                if (line == "") {
                    continue;
                }
                this.chunks.push(line);
                if (line.indexOf("data:") == 0) {
                    this.processItem(this.chunks);
                    this.chunks = [];
                }
            }
        },
        processItem: function(arr) {
            var obj = {};
            for (var i = 0; i < arr.length; i++) {
                var line = arr[i];

                if (line.indexOf("event:") == 0) {
                    obj.name = line.replace("event:", "").trim();
                }
                else if (line.indexOf("data:") == 0) {
                    line = line.replace("data:", "");
                    var name = obj.name;
                    obj = JSON.parse(line);
                    obj.name = name;
                }
            }

            if (this.onDataReady) {
                this.onDataReady(obj);
            }
        },
        onData: function(event) {
            var chunk = event.toString();
            this.appendToQueue(chunk.split("\n"));
        },
        watch: function(eventer, callback) {
            //when we have a JSON object ready
            this.onDataReady = callback;

			if (eventer.on) {
				//when we get something from the SSE
            	eventer.on('data', this.onData.bind(this));
			}
			else if (eventer.onreadystatechange) {
				// in a browser?
				var that = this,
					idx = 0;
				eventer.onreadystatechange = function() {
					var text = eventer.responseText.substr(idx);
					idx = eventer.responseText.length;
					that.onData(text);
				};
			}
			else {
				console.error("event stream couldn't stream!");
			}
        }
    };

    return new Processor();
};

/**
 * Subscribe callback to a global event in the Spark cloud
 *
 * @param {string} eventName - Event to listen
 * @param {function} callback
 *
 * @returns {Request}
 */
Spark.prototype.onEvent = function(eventName, callback) {
  this.getEventStream(eventName, false, callback);
};

/**
 * Register an event stream in the Spark cloud
 *
 * @param {string} eventName - Event to register
 * @param {string} data - To be passed to the to the event
 * @param {function} callback
 * @endpoint POST /v1/devices/events
 *
 * @returns {Promise}
 */
Spark.prototype.publishEvent = function (eventName, data, callback) {
  var defer = this.createDefer('publishEvent', callback),
      handler = this.defaultHandler('publishEvent', defer, callback).bind(this);

  this.api.publishEvent(eventName, data, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Creates a new webhook in the Spark cloud
 *
 * @param {string} eventName - Event to register
 * @param {string} url - To hook to
 * @param {string} coreId - Id of the Core
 * @param {function} callback
 * @endpoint POST /v1/webhooks
 *
 * @returns {Promise}
 */
Spark.prototype.createWebhook = function (eventName, url, coreId, callback) {
  var defer = this.createDefer('createWebhook', callback),
      handler = this.defaultHandler('createWebhook', defer, callback).bind(this);

  this.api.createWebhook(eventName, url, coreId, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Deletes a webhook
 *
 * @param {string} hookId - Id of the webhook
 * @param {function} callback
 * @endpoint DELETE /v1/webhooks/<hook_id>
 *
 * @returns {Promise}
 */
Spark.prototype.deleteWebhook = function (hookId, callback) {
  var defer = this.createDefer('deleteWebhook', callback),
      handler = this.defaultHandler('deleteWebhook', defer, callback).bind(this);

  this.api.deleteWebhook(hookId, this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

/**
 * Gets a list of all webhooks
 *
 * @param {function} callback
 * @endpoint GET /v1/webhooks
 *
 * @returns {Promise}
 */
Spark.prototype.listWebhooks = function (callback) {
  var defer = this.createDefer('listWebhooks', callback),
      handler = this.defaultHandler('listWebhooks', defer,  callback).bind(this);

  this.api.listWebhooks(this.accessToken, handler);

  var promise = (!!defer) ? defer.promise : null;
  return promise;
};

module.exports = new Spark();

},{"./device":19,"./spark-api":20,"events":68,"fs":62,"util":97,"when":40,"when/pipeline":39}],22:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (require) {

	var makePromise = require('./makePromise');
	var Scheduler = require('./Scheduler');
	var async = require('./env').asap;

	return makePromise({
		scheduler: new Scheduler(async)
	});

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./Scheduler":23,"./env":35,"./makePromise":37}],23:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for next-tick conflation.

	/**
	 * Async task scheduler
	 * @param {function} async function to schedule a single async function
	 * @constructor
	 */
	function Scheduler(async) {
		this._async = async;
		this._running = false;

		this._queue = this;
		this._queueLen = 0;
		this._afterQueue = {};
		this._afterQueueLen = 0;

		var self = this;
		this.drain = function() {
			self._drain();
		};
	}

	/**
	 * Enqueue a task
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.enqueue = function(task) {
		this._queue[this._queueLen++] = task;
		this.run();
	};

	/**
	 * Enqueue a task to run after the main task queue
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.afterQueue = function(task) {
		this._afterQueue[this._afterQueueLen++] = task;
		this.run();
	};

	Scheduler.prototype.run = function() {
		if (!this._running) {
			this._running = true;
			this._async(this.drain);
		}
	};

	/**
	 * Drain the handler queue entirely, and then the after queue
	 */
	Scheduler.prototype._drain = function() {
		var i = 0;
		for (; i < this._queueLen; ++i) {
			this._queue[i].run();
			this._queue[i] = void 0;
		}

		this._queueLen = 0;
		this._running = false;

		for (i = 0; i < this._afterQueueLen; ++i) {
			this._afterQueue[i].run();
			this._afterQueue[i] = void 0;
		}

		this._afterQueueLen = 0;
	};

	return Scheduler;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],24:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	/**
	 * Custom error type for promises rejected by promise.timeout
	 * @param {string} message
	 * @constructor
	 */
	function TimeoutError (message) {
		Error.call(this);
		this.message = message;
		this.name = TimeoutError.name;
		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, TimeoutError);
		}
	}

	TimeoutError.prototype = Object.create(Error.prototype);
	TimeoutError.prototype.constructor = TimeoutError;

	return TimeoutError;
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
},{}],25:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	makeApply.tryCatchResolve = tryCatchResolve;

	return makeApply;

	function makeApply(Promise, call) {
		if(arguments.length < 2) {
			call = tryCatchResolve;
		}

		return apply;

		function apply(f, thisArg, args) {
			var p = Promise._defer();
			var l = args.length;
			var params = new Array(l);
			callAndResolve({ f:f, thisArg:thisArg, args:args, params:params, i:l-1, call:call }, p._handler);

			return p;
		}

		function callAndResolve(c, h) {
			if(c.i < 0) {
				return call(c.f, c.thisArg, c.params, h);
			}

			var handler = Promise._handler(c.args[c.i]);
			handler.fold(callAndResolveNext, c, void 0, h);
		}

		function callAndResolveNext(c, x, h) {
			c.params[c.i] = x;
			c.i -= 1;
			callAndResolve(c, h);
		}
	}

	function tryCatchResolve(f, thisArg, args, resolver) {
		try {
			resolver.resolve(f.apply(thisArg, args));
		} catch(e) {
			resolver.reject(e);
		}
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));



},{}],26:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var state = require('../state');
	var applier = require('../apply');

	return function array(Promise) {

		var applyFold = applier(Promise);
		var toPromise = Promise.resolve;
		var all = Promise.all;

		var ar = Array.prototype.reduce;
		var arr = Array.prototype.reduceRight;
		var slice = Array.prototype.slice;

		// Additional array combinators

		Promise.any = any;
		Promise.some = some;
		Promise.settle = settle;

		Promise.map = map;
		Promise.filter = filter;
		Promise.reduce = reduce;
		Promise.reduceRight = reduceRight;

		/**
		 * When this promise fulfills with an array, do
		 * onFulfilled.apply(void 0, array)
		 * @param {function} onFulfilled function to apply
		 * @returns {Promise} promise for the result of applying onFulfilled
		 */
		Promise.prototype.spread = function(onFulfilled) {
			return this.then(all).then(function(array) {
				return onFulfilled.apply(this, array);
			});
		};

		return Promise;

		/**
		 * One-winner competitive race.
		 * Return a promise that will fulfill when one of the promises
		 * in the input array fulfills, or will reject when all promises
		 * have rejected.
		 * @param {array} promises
		 * @returns {Promise} promise for the first fulfilled value
		 */
		function any(promises) {
			var p = Promise._defer();
			var resolver = p._handler;
			var l = promises.length>>>0;

			var pending = l;
			var errors = [];

			for (var h, x, i = 0; i < l; ++i) {
				x = promises[i];
				if(x === void 0 && !(i in promises)) {
					--pending;
					continue;
				}

				h = Promise._handler(x);
				if(h.state() > 0) {
					resolver.become(h);
					Promise._visitRemaining(promises, i, h);
					break;
				} else {
					h.visit(resolver, handleFulfill, handleReject);
				}
			}

			if(pending === 0) {
				resolver.reject(new RangeError('any(): array must not be empty'));
			}

			return p;

			function handleFulfill(x) {
				/*jshint validthis:true*/
				errors = null;
				this.resolve(x); // this === resolver
			}

			function handleReject(e) {
				/*jshint validthis:true*/
				if(this.resolved) { // this === resolver
					return;
				}

				errors.push(e);
				if(--pending === 0) {
					this.reject(errors);
				}
			}
		}

		/**
		 * N-winner competitive race
		 * Return a promise that will fulfill when n input promises have
		 * fulfilled, or will reject when it becomes impossible for n
		 * input promises to fulfill (ie when promises.length - n + 1
		 * have rejected)
		 * @param {array} promises
		 * @param {number} n
		 * @returns {Promise} promise for the earliest n fulfillment values
		 *
		 * @deprecated
		 */
		function some(promises, n) {
			/*jshint maxcomplexity:7*/
			var p = Promise._defer();
			var resolver = p._handler;

			var results = [];
			var errors = [];

			var l = promises.length>>>0;
			var nFulfill = 0;
			var nReject;
			var x, i; // reused in both for() loops

			// First pass: count actual array items
			for(i=0; i<l; ++i) {
				x = promises[i];
				if(x === void 0 && !(i in promises)) {
					continue;
				}
				++nFulfill;
			}

			// Compute actual goals
			n = Math.max(n, 0);
			nReject = (nFulfill - n + 1);
			nFulfill = Math.min(n, nFulfill);

			if(n > nFulfill) {
				resolver.reject(new RangeError('some(): array must contain at least '
				+ n + ' item(s), but had ' + nFulfill));
			} else if(nFulfill === 0) {
				resolver.resolve(results);
			}

			// Second pass: observe each array item, make progress toward goals
			for(i=0; i<l; ++i) {
				x = promises[i];
				if(x === void 0 && !(i in promises)) {
					continue;
				}

				Promise._handler(x).visit(resolver, fulfill, reject, resolver.notify);
			}

			return p;

			function fulfill(x) {
				/*jshint validthis:true*/
				if(this.resolved) { // this === resolver
					return;
				}

				results.push(x);
				if(--nFulfill === 0) {
					errors = null;
					this.resolve(results);
				}
			}

			function reject(e) {
				/*jshint validthis:true*/
				if(this.resolved) { // this === resolver
					return;
				}

				errors.push(e);
				if(--nReject === 0) {
					results = null;
					this.reject(errors);
				}
			}
		}

		/**
		 * Apply f to the value of each promise in a list of promises
		 * and return a new list containing the results.
		 * @param {array} promises
		 * @param {function(x:*, index:Number):*} f mapping function
		 * @returns {Promise}
		 */
		function map(promises, f) {
			return Promise._traverse(f, promises);
		}

		/**
		 * Filter the provided array of promises using the provided predicate.  Input may
		 * contain promises and values
		 * @param {Array} promises array of promises and values
		 * @param {function(x:*, index:Number):boolean} predicate filtering predicate.
		 *  Must return truthy (or promise for truthy) for items to retain.
		 * @returns {Promise} promise that will fulfill with an array containing all items
		 *  for which predicate returned truthy.
		 */
		function filter(promises, predicate) {
			var a = slice.call(promises);
			return Promise._traverse(predicate, a).then(function(keep) {
				return filterSync(a, keep);
			});
		}

		function filterSync(promises, keep) {
			// Safe because we know all promises have fulfilled if we've made it this far
			var l = keep.length;
			var filtered = new Array(l);
			for(var i=0, j=0; i<l; ++i) {
				if(keep[i]) {
					filtered[j++] = Promise._handler(promises[i]).value;
				}
			}
			filtered.length = j;
			return filtered;

		}

		/**
		 * Return a promise that will always fulfill with an array containing
		 * the outcome states of all input promises.  The returned promise
		 * will never reject.
		 * @param {Array} promises
		 * @returns {Promise} promise for array of settled state descriptors
		 */
		function settle(promises) {
			return all(promises.map(settleOne));
		}

		function settleOne(p) {
			var h = Promise._handler(p);
			if(h.state() === 0) {
				return toPromise(p).then(state.fulfilled, state.rejected);
			}

			h._unreport();
			return state.inspect(h);
		}

		/**
		 * Traditional reduce function, similar to `Array.prototype.reduce()`, but
		 * input may contain promises and/or values, and reduceFunc
		 * may return either a value or a promise, *and* initialValue may
		 * be a promise for the starting value.
		 * @param {Array|Promise} promises array or promise for an array of anything,
		 *      may contain a mix of promises and values.
		 * @param {function(accumulated:*, x:*, index:Number):*} f reduce function
		 * @returns {Promise} that will resolve to the final reduced value
		 */
		function reduce(promises, f /*, initialValue */) {
			return arguments.length > 2 ? ar.call(promises, liftCombine(f), arguments[2])
					: ar.call(promises, liftCombine(f));
		}

		/**
		 * Traditional reduce function, similar to `Array.prototype.reduceRight()`, but
		 * input may contain promises and/or values, and reduceFunc
		 * may return either a value or a promise, *and* initialValue may
		 * be a promise for the starting value.
		 * @param {Array|Promise} promises array or promise for an array of anything,
		 *      may contain a mix of promises and values.
		 * @param {function(accumulated:*, x:*, index:Number):*} f reduce function
		 * @returns {Promise} that will resolve to the final reduced value
		 */
		function reduceRight(promises, f /*, initialValue */) {
			return arguments.length > 2 ? arr.call(promises, liftCombine(f), arguments[2])
					: arr.call(promises, liftCombine(f));
		}

		function liftCombine(f) {
			return function(z, x, i) {
				return applyFold(f, void 0, [z,x,i]);
			};
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../apply":25,"../state":38}],27:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function flow(Promise) {

		var resolve = Promise.resolve;
		var reject = Promise.reject;
		var origCatch = Promise.prototype['catch'];

		/**
		 * Handle the ultimate fulfillment value or rejection reason, and assume
		 * responsibility for all errors.  If an error propagates out of result
		 * or handleFatalError, it will be rethrown to the host, resulting in a
		 * loud stack track on most platforms and a crash on some.
		 * @param {function?} onResult
		 * @param {function?} onError
		 * @returns {undefined}
		 */
		Promise.prototype.done = function(onResult, onError) {
			this._handler.visit(this._handler.receiver, onResult, onError);
		};

		/**
		 * Add Error-type and predicate matching to catch.  Examples:
		 * promise.catch(TypeError, handleTypeError)
		 *   .catch(predicate, handleMatchedErrors)
		 *   .catch(handleRemainingErrors)
		 * @param onRejected
		 * @returns {*}
		 */
		Promise.prototype['catch'] = Promise.prototype.otherwise = function(onRejected) {
			if (arguments.length < 2) {
				return origCatch.call(this, onRejected);
			}

			if(typeof onRejected !== 'function') {
				return this.ensure(rejectInvalidPredicate);
			}

			return origCatch.call(this, createCatchFilter(arguments[1], onRejected));
		};

		/**
		 * Wraps the provided catch handler, so that it will only be called
		 * if the predicate evaluates truthy
		 * @param {?function} handler
		 * @param {function} predicate
		 * @returns {function} conditional catch handler
		 */
		function createCatchFilter(handler, predicate) {
			return function(e) {
				return evaluatePredicate(e, predicate)
					? handler.call(this, e)
					: reject(e);
			};
		}

		/**
		 * Ensures that onFulfilledOrRejected will be called regardless of whether
		 * this promise is fulfilled or rejected.  onFulfilledOrRejected WILL NOT
		 * receive the promises' value or reason.  Any returned value will be disregarded.
		 * onFulfilledOrRejected may throw or return a rejected promise to signal
		 * an additional error.
		 * @param {function} handler handler to be called regardless of
		 *  fulfillment or rejection
		 * @returns {Promise}
		 */
		Promise.prototype['finally'] = Promise.prototype.ensure = function(handler) {
			if(typeof handler !== 'function') {
				return this;
			}

			return this.then(function(x) {
				return runSideEffect(handler, this, identity, x);
			}, function(e) {
				return runSideEffect(handler, this, reject, e);
			});
		};

		function runSideEffect (handler, thisArg, propagate, value) {
			var result = handler.call(thisArg);
			return maybeThenable(result)
				? propagateValue(result, propagate, value)
				: propagate(value);
		}

		function propagateValue (result, propagate, x) {
			return resolve(result).then(function () {
				return propagate(x);
			});
		}

		/**
		 * Recover from a failure by returning a defaultValue.  If defaultValue
		 * is a promise, it's fulfillment value will be used.  If defaultValue is
		 * a promise that rejects, the returned promise will reject with the
		 * same reason.
		 * @param {*} defaultValue
		 * @returns {Promise} new promise
		 */
		Promise.prototype['else'] = Promise.prototype.orElse = function(defaultValue) {
			return this.then(void 0, function() {
				return defaultValue;
			});
		};

		/**
		 * Shortcut for .then(function() { return value; })
		 * @param  {*} value
		 * @return {Promise} a promise that:
		 *  - is fulfilled if value is not a promise, or
		 *  - if value is a promise, will fulfill with its value, or reject
		 *    with its reason.
		 */
		Promise.prototype['yield'] = function(value) {
			return this.then(function() {
				return value;
			});
		};

		/**
		 * Runs a side effect when this promise fulfills, without changing the
		 * fulfillment value.
		 * @param {function} onFulfilledSideEffect
		 * @returns {Promise}
		 */
		Promise.prototype.tap = function(onFulfilledSideEffect) {
			return this.then(onFulfilledSideEffect)['yield'](this);
		};

		return Promise;
	};

	function rejectInvalidPredicate() {
		throw new TypeError('catch predicate must be a function');
	}

	function evaluatePredicate(e, predicate) {
		return isError(predicate) ? e instanceof predicate : predicate(e);
	}

	function isError(predicate) {
		return predicate === Error
			|| (predicate != null && predicate.prototype instanceof Error);
	}

	function maybeThenable(x) {
		return (typeof x === 'object' || typeof x === 'function') && x !== null;
	}

	function identity(x) {
		return x;
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],28:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */
/** @author Jeff Escalante */

(function(define) { 'use strict';
define(function() {

	return function fold(Promise) {

		Promise.prototype.fold = function(f, z) {
			var promise = this._beget();

			this._handler.fold(function(z, x, to) {
				Promise._handler(z).fold(function(x, z, to) {
					to.resolve(f.call(this, z, x));
				}, x, this, to);
			}, z, promise._handler.receiver, promise._handler);

			return promise;
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],29:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var inspect = require('../state').inspect;

	return function inspection(Promise) {

		Promise.prototype.inspect = function() {
			return inspect(Promise._handler(this));
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../state":38}],30:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function generate(Promise) {

		var resolve = Promise.resolve;

		Promise.iterate = iterate;
		Promise.unfold = unfold;

		return Promise;

		/**
		 * @deprecated Use github.com/cujojs/most streams and most.iterate
		 * Generate a (potentially infinite) stream of promised values:
		 * x, f(x), f(f(x)), etc. until condition(x) returns true
		 * @param {function} f function to generate a new x from the previous x
		 * @param {function} condition function that, given the current x, returns
		 *  truthy when the iterate should stop
		 * @param {function} handler function to handle the value produced by f
		 * @param {*|Promise} x starting value, may be a promise
		 * @return {Promise} the result of the last call to f before
		 *  condition returns true
		 */
		function iterate(f, condition, handler, x) {
			return unfold(function(x) {
				return [x, f(x)];
			}, condition, handler, x);
		}

		/**
		 * @deprecated Use github.com/cujojs/most streams and most.unfold
		 * Generate a (potentially infinite) stream of promised values
		 * by applying handler(generator(seed)) iteratively until
		 * condition(seed) returns true.
		 * @param {function} unspool function that generates a [value, newSeed]
		 *  given a seed.
		 * @param {function} condition function that, given the current seed, returns
		 *  truthy when the unfold should stop
		 * @param {function} handler function to handle the value produced by unspool
		 * @param x {*|Promise} starting value, may be a promise
		 * @return {Promise} the result of the last value produced by unspool before
		 *  condition returns true
		 */
		function unfold(unspool, condition, handler, x) {
			return resolve(x).then(function(seed) {
				return resolve(condition(seed)).then(function(done) {
					return done ? seed : resolve(unspool(seed)).spread(next);
				});
			});

			function next(item, newSeed) {
				return resolve(handler(item)).then(function() {
					return unfold(unspool, condition, handler, newSeed);
				});
			}
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],31:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function progress(Promise) {

		/**
		 * @deprecated
		 * Register a progress handler for this promise
		 * @param {function} onProgress
		 * @returns {Promise}
		 */
		Promise.prototype.progress = function(onProgress) {
			return this.then(void 0, void 0, onProgress);
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],32:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var env = require('../env');
	var TimeoutError = require('../TimeoutError');

	function setTimeout(f, ms, x, y) {
		return env.setTimer(function() {
			f(x, y, ms);
		}, ms);
	}

	return function timed(Promise) {
		/**
		 * Return a new promise whose fulfillment value is revealed only
		 * after ms milliseconds
		 * @param {number} ms milliseconds
		 * @returns {Promise}
		 */
		Promise.prototype.delay = function(ms) {
			var p = this._beget();
			this._handler.fold(handleDelay, ms, void 0, p._handler);
			return p;
		};

		function handleDelay(ms, x, h) {
			setTimeout(resolveDelay, ms, x, h);
		}

		function resolveDelay(x, h) {
			h.resolve(x);
		}

		/**
		 * Return a new promise that rejects after ms milliseconds unless
		 * this promise fulfills earlier, in which case the returned promise
		 * fulfills with the same value.
		 * @param {number} ms milliseconds
		 * @param {Error|*=} reason optional rejection reason to use, defaults
		 *   to a TimeoutError if not provided
		 * @returns {Promise}
		 */
		Promise.prototype.timeout = function(ms, reason) {
			var p = this._beget();
			var h = p._handler;

			var t = setTimeout(onTimeout, ms, reason, p._handler);

			this._handler.visit(h,
				function onFulfill(x) {
					env.clearTimer(t);
					this.resolve(x); // this = h
				},
				function onReject(x) {
					env.clearTimer(t);
					this.reject(x); // this = h
				},
				h.notify);

			return p;
		};

		function onTimeout(reason, h, ms) {
			var e = typeof reason === 'undefined'
				? new TimeoutError('timed out after ' + ms + 'ms')
				: reason;
			h.reject(e);
		}

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../TimeoutError":24,"../env":35}],33:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var setTimer = require('../env').setTimer;
	var format = require('../format');

	return function unhandledRejection(Promise) {

		var logError = noop;
		var logInfo = noop;
		var localConsole;

		if(typeof console !== 'undefined') {
			// Alias console to prevent things like uglify's drop_console option from
			// removing console.log/error. Unhandled rejections fall into the same
			// category as uncaught exceptions, and build tools shouldn't silence them.
			localConsole = console;
			logError = typeof localConsole.error !== 'undefined'
				? function (e) { localConsole.error(e); }
				: function (e) { localConsole.log(e); };

			logInfo = typeof localConsole.info !== 'undefined'
				? function (e) { localConsole.info(e); }
				: function (e) { localConsole.log(e); };
		}

		Promise.onPotentiallyUnhandledRejection = function(rejection) {
			enqueue(report, rejection);
		};

		Promise.onPotentiallyUnhandledRejectionHandled = function(rejection) {
			enqueue(unreport, rejection);
		};

		Promise.onFatalRejection = function(rejection) {
			enqueue(throwit, rejection.value);
		};

		var tasks = [];
		var reported = [];
		var running = null;

		function report(r) {
			if(!r.handled) {
				reported.push(r);
				logError('Potentially unhandled rejection [' + r.id + '] ' + format.formatError(r.value));
			}
		}

		function unreport(r) {
			var i = reported.indexOf(r);
			if(i >= 0) {
				reported.splice(i, 1);
				logInfo('Handled previous rejection [' + r.id + '] ' + format.formatObject(r.value));
			}
		}

		function enqueue(f, x) {
			tasks.push(f, x);
			if(running === null) {
				running = setTimer(flush, 0);
			}
		}

		function flush() {
			running = null;
			while(tasks.length > 0) {
				tasks.shift()(tasks.shift());
			}
		}

		return Promise;
	};

	function throwit(e) {
		throw e;
	}

	function noop() {}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../env":35,"../format":36}],34:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function addWith(Promise) {
		/**
		 * Returns a promise whose handlers will be called with `this` set to
		 * the supplied receiver.  Subsequent promises derived from the
		 * returned promise will also have their handlers called with receiver
		 * as `this`. Calling `with` with undefined or no arguments will return
		 * a promise whose handlers will again be called in the usual Promises/A+
		 * way (no `this`) thus safely undoing any previous `with` in the
		 * promise chain.
		 *
		 * WARNING: Promises returned from `with`/`withThis` are NOT Promises/A+
		 * compliant, specifically violating 2.2.5 (http://promisesaplus.com/#point-41)
		 *
		 * @param {object} receiver `this` value for all handlers attached to
		 *  the returned promise.
		 * @returns {Promise}
		 */
		Promise.prototype['with'] = Promise.prototype.withThis = function(receiver) {
			var p = this._beget();
			var child = p._handler;
			child.receiver = receiver;
			this._handler.chain(child, receiver);
			return p;
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));


},{}],35:[function(require,module,exports){
(function (process){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/*global process,document,setTimeout,clearTimeout,MutationObserver,WebKitMutationObserver*/
(function(define) { 'use strict';
define(function(require) {
	/*jshint maxcomplexity:6*/

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// setTimeout, and finally vertx, since its the only env that doesn't
	// have setTimeout

	var MutationObs;
	var capturedSetTimeout = typeof setTimeout !== 'undefined' && setTimeout;

	// Default env
	var setTimer = function(f, ms) { return setTimeout(f, ms); };
	var clearTimer = function(t) { return clearTimeout(t); };
	var asap = function (f) { return capturedSetTimeout(f, 0); };

	// Detect specific env
	if (isNode()) { // Node
		asap = function (f) { return process.nextTick(f); };

	} else if (MutationObs = hasMutationObserver()) { // Modern browser
		asap = initMutationObserver(MutationObs);

	} else if (!capturedSetTimeout) { // vert.x
		var vertxRequire = require;
		var vertx = vertxRequire('vertx');
		setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
		clearTimer = vertx.cancelTimer;
		asap = vertx.runOnLoop || vertx.runOnContext;
	}

	return {
		setTimer: setTimer,
		clearTimer: clearTimer,
		asap: asap
	};

	function isNode () {
		return typeof process !== 'undefined' && process !== null &&
			typeof process.nextTick === 'function';
	}

	function hasMutationObserver () {
		return (typeof MutationObserver === 'function' && MutationObserver) ||
			(typeof WebKitMutationObserver === 'function' && WebKitMutationObserver);
	}

	function initMutationObserver(MutationObserver) {
		var scheduled;
		var node = document.createTextNode('');
		var o = new MutationObserver(run);
		o.observe(node, { characterData: true });

		function run() {
			var f = scheduled;
			scheduled = void 0;
			f();
		}

		var i = 0;
		return function (f) {
			scheduled = f;
			node.data = (i ^= 1);
		};
	}
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

}).call(this,require('_process'))
},{"_process":77}],36:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return {
		formatError: formatError,
		formatObject: formatObject,
		tryStringify: tryStringify
	};

	/**
	 * Format an error into a string.  If e is an Error and has a stack property,
	 * it's returned.  Otherwise, e is formatted using formatObject, with a
	 * warning added about e not being a proper Error.
	 * @param {*} e
	 * @returns {String} formatted string, suitable for output to developers
	 */
	function formatError(e) {
		var s = typeof e === 'object' && e !== null && e.stack ? e.stack : formatObject(e);
		return e instanceof Error ? s : s + ' (WARNING: non-Error used)';
	}

	/**
	 * Format an object, detecting "plain" objects and running them through
	 * JSON.stringify if possible.
	 * @param {Object} o
	 * @returns {string}
	 */
	function formatObject(o) {
		var s = String(o);
		if(s === '[object Object]' && typeof JSON !== 'undefined') {
			s = tryStringify(o, s);
		}
		return s;
	}

	/**
	 * Try to return the result of JSON.stringify(x).  If that fails, return
	 * defaultValue
	 * @param {*} x
	 * @param {*} defaultValue
	 * @returns {String|*} JSON.stringify(x) or defaultValue
	 */
	function tryStringify(x, defaultValue) {
		try {
			return JSON.stringify(x);
		} catch(e) {
			return defaultValue;
		}
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],37:[function(require,module,exports){
(function (process){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function makePromise(environment) {

		var tasks = environment.scheduler;
		var emitRejection = initEmitRejection();

		var objectCreate = Object.create ||
			function(proto) {
				function Child() {}
				Child.prototype = proto;
				return new Child();
			};

		/**
		 * Create a promise whose fate is determined by resolver
		 * @constructor
		 * @returns {Promise} promise
		 * @name Promise
		 */
		function Promise(resolver, handler) {
			this._handler = resolver === Handler ? handler : init(resolver);
		}

		/**
		 * Run the supplied resolver
		 * @param resolver
		 * @returns {Pending}
		 */
		function init(resolver) {
			var handler = new Pending();

			try {
				resolver(promiseResolve, promiseReject, promiseNotify);
			} catch (e) {
				promiseReject(e);
			}

			return handler;

			/**
			 * Transition from pre-resolution state to post-resolution state, notifying
			 * all listeners of the ultimate fulfillment or rejection
			 * @param {*} x resolution value
			 */
			function promiseResolve (x) {
				handler.resolve(x);
			}
			/**
			 * Reject this promise with reason, which will be used verbatim
			 * @param {Error|*} reason rejection reason, strongly suggested
			 *   to be an Error type
			 */
			function promiseReject (reason) {
				handler.reject(reason);
			}

			/**
			 * @deprecated
			 * Issue a progress event, notifying all progress listeners
			 * @param {*} x progress event payload to pass to all listeners
			 */
			function promiseNotify (x) {
				handler.notify(x);
			}
		}

		// Creation

		Promise.resolve = resolve;
		Promise.reject = reject;
		Promise.never = never;

		Promise._defer = defer;
		Promise._handler = getHandler;

		/**
		 * Returns a trusted promise. If x is already a trusted promise, it is
		 * returned, otherwise returns a new trusted Promise which follows x.
		 * @param  {*} x
		 * @return {Promise} promise
		 */
		function resolve(x) {
			return isPromise(x) ? x
				: new Promise(Handler, new Async(getHandler(x)));
		}

		/**
		 * Return a reject promise with x as its reason (x is used verbatim)
		 * @param {*} x
		 * @returns {Promise} rejected promise
		 */
		function reject(x) {
			return new Promise(Handler, new Async(new Rejected(x)));
		}

		/**
		 * Return a promise that remains pending forever
		 * @returns {Promise} forever-pending promise.
		 */
		function never() {
			return foreverPendingPromise; // Should be frozen
		}

		/**
		 * Creates an internal {promise, resolver} pair
		 * @private
		 * @returns {Promise}
		 */
		function defer() {
			return new Promise(Handler, new Pending());
		}

		// Transformation and flow control

		/**
		 * Transform this promise's fulfillment value, returning a new Promise
		 * for the transformed result.  If the promise cannot be fulfilled, onRejected
		 * is called with the reason.  onProgress *may* be called with updates toward
		 * this promise's fulfillment.
		 * @param {function=} onFulfilled fulfillment handler
		 * @param {function=} onRejected rejection handler
		 * @param {function=} onProgress @deprecated progress handler
		 * @return {Promise} new promise
		 */
		Promise.prototype.then = function(onFulfilled, onRejected, onProgress) {
			var parent = this._handler;
			var state = parent.join().state();

			if ((typeof onFulfilled !== 'function' && state > 0) ||
				(typeof onRejected !== 'function' && state < 0)) {
				// Short circuit: value will not change, simply share handler
				return new this.constructor(Handler, parent);
			}

			var p = this._beget();
			var child = p._handler;

			parent.chain(child, parent.receiver, onFulfilled, onRejected, onProgress);

			return p;
		};

		/**
		 * If this promise cannot be fulfilled due to an error, call onRejected to
		 * handle the error. Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		Promise.prototype['catch'] = function(onRejected) {
			return this.then(void 0, onRejected);
		};

		/**
		 * Creates a new, pending promise of the same type as this promise
		 * @private
		 * @returns {Promise}
		 */
		Promise.prototype._beget = function() {
			return begetFrom(this._handler, this.constructor);
		};

		function begetFrom(parent, Promise) {
			var child = new Pending(parent.receiver, parent.join().context);
			return new Promise(Handler, child);
		}

		// Array combinators

		Promise.all = all;
		Promise.race = race;
		Promise._traverse = traverse;

		/**
		 * Return a promise that will fulfill when all promises in the
		 * input array have fulfilled, or will reject when one of the
		 * promises rejects.
		 * @param {array} promises array of promises
		 * @returns {Promise} promise for array of fulfillment values
		 */
		function all(promises) {
			return traverseWith(snd, null, promises);
		}

		/**
		 * Array<Promise<X>> -> Promise<Array<f(X)>>
		 * @private
		 * @param {function} f function to apply to each promise's value
		 * @param {Array} promises array of promises
		 * @returns {Promise} promise for transformed values
		 */
		function traverse(f, promises) {
			return traverseWith(tryCatch2, f, promises);
		}

		function traverseWith(tryMap, f, promises) {
			var handler = typeof f === 'function' ? mapAt : settleAt;

			var resolver = new Pending();
			var pending = promises.length >>> 0;
			var results = new Array(pending);

			for (var i = 0, x; i < promises.length && !resolver.resolved; ++i) {
				x = promises[i];

				if (x === void 0 && !(i in promises)) {
					--pending;
					continue;
				}

				traverseAt(promises, handler, i, x, resolver);
			}

			if(pending === 0) {
				resolver.become(new Fulfilled(results));
			}

			return new Promise(Handler, resolver);

			function mapAt(i, x, resolver) {
				if(!resolver.resolved) {
					traverseAt(promises, settleAt, i, tryMap(f, x, i), resolver);
				}
			}

			function settleAt(i, x, resolver) {
				results[i] = x;
				if(--pending === 0) {
					resolver.become(new Fulfilled(results));
				}
			}
		}

		function traverseAt(promises, handler, i, x, resolver) {
			if (maybeThenable(x)) {
				var h = getHandlerMaybeThenable(x);
				var s = h.state();

				if (s === 0) {
					h.fold(handler, i, void 0, resolver);
				} else if (s > 0) {
					handler(i, h.value, resolver);
				} else {
					resolver.become(h);
					visitRemaining(promises, i+1, h);
				}
			} else {
				handler(i, x, resolver);
			}
		}

		Promise._visitRemaining = visitRemaining;
		function visitRemaining(promises, start, handler) {
			for(var i=start; i<promises.length; ++i) {
				markAsHandled(getHandler(promises[i]), handler);
			}
		}

		function markAsHandled(h, handler) {
			if(h === handler) {
				return;
			}

			var s = h.state();
			if(s === 0) {
				h.visit(h, void 0, h._unreport);
			} else if(s < 0) {
				h._unreport();
			}
		}

		/**
		 * Fulfill-reject competitive race. Return a promise that will settle
		 * to the same state as the earliest input promise to settle.
		 *
		 * WARNING: The ES6 Promise spec requires that race()ing an empty array
		 * must return a promise that is pending forever.  This implementation
		 * returns a singleton forever-pending promise, the same singleton that is
		 * returned by Promise.never(), thus can be checked with ===
		 *
		 * @param {array} promises array of promises to race
		 * @returns {Promise} if input is non-empty, a promise that will settle
		 * to the same outcome as the earliest input promise to settle. if empty
		 * is empty, returns a promise that will never settle.
		 */
		function race(promises) {
			if(typeof promises !== 'object' || promises === null) {
				return reject(new TypeError('non-iterable passed to race()'));
			}

			// Sigh, race([]) is untestable unless we return *something*
			// that is recognizable without calling .then() on it.
			return promises.length === 0 ? never()
				 : promises.length === 1 ? resolve(promises[0])
				 : runRace(promises);
		}

		function runRace(promises) {
			var resolver = new Pending();
			var i, x, h;
			for(i=0; i<promises.length; ++i) {
				x = promises[i];
				if (x === void 0 && !(i in promises)) {
					continue;
				}

				h = getHandler(x);
				if(h.state() !== 0) {
					resolver.become(h);
					visitRemaining(promises, i+1, h);
					break;
				} else {
					h.visit(resolver, resolver.resolve, resolver.reject);
				}
			}
			return new Promise(Handler, resolver);
		}

		// Promise internals
		// Below this, everything is @private

		/**
		 * Get an appropriate handler for x, without checking for cycles
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandler(x) {
			if(isPromise(x)) {
				return x._handler.join();
			}
			return maybeThenable(x) ? getHandlerUntrusted(x) : new Fulfilled(x);
		}

		/**
		 * Get a handler for thenable x.
		 * NOTE: You must only call this if maybeThenable(x) == true
		 * @param {object|function|Promise} x
		 * @returns {object} handler
		 */
		function getHandlerMaybeThenable(x) {
			return isPromise(x) ? x._handler.join() : getHandlerUntrusted(x);
		}

		/**
		 * Get a handler for potentially untrusted thenable x
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandlerUntrusted(x) {
			try {
				var untrustedThen = x.then;
				return typeof untrustedThen === 'function'
					? new Thenable(untrustedThen, x)
					: new Fulfilled(x);
			} catch(e) {
				return new Rejected(e);
			}
		}

		/**
		 * Handler for a promise that is pending forever
		 * @constructor
		 */
		function Handler() {}

		Handler.prototype.when
			= Handler.prototype.become
			= Handler.prototype.notify // deprecated
			= Handler.prototype.fail
			= Handler.prototype._unreport
			= Handler.prototype._report
			= noop;

		Handler.prototype._state = 0;

		Handler.prototype.state = function() {
			return this._state;
		};

		/**
		 * Recursively collapse handler chain to find the handler
		 * nearest to the fully resolved value.
		 * @returns {object} handler nearest the fully resolved value
		 */
		Handler.prototype.join = function() {
			var h = this;
			while(h.handler !== void 0) {
				h = h.handler;
			}
			return h;
		};

		Handler.prototype.chain = function(to, receiver, fulfilled, rejected, progress) {
			this.when({
				resolver: to,
				receiver: receiver,
				fulfilled: fulfilled,
				rejected: rejected,
				progress: progress
			});
		};

		Handler.prototype.visit = function(receiver, fulfilled, rejected, progress) {
			this.chain(failIfRejected, receiver, fulfilled, rejected, progress);
		};

		Handler.prototype.fold = function(f, z, c, to) {
			this.when(new Fold(f, z, c, to));
		};

		/**
		 * Handler that invokes fail() on any handler it becomes
		 * @constructor
		 */
		function FailIfRejected() {}

		inherit(Handler, FailIfRejected);

		FailIfRejected.prototype.become = function(h) {
			h.fail();
		};

		var failIfRejected = new FailIfRejected();

		/**
		 * Handler that manages a queue of consumers waiting on a pending promise
		 * @constructor
		 */
		function Pending(receiver, inheritedContext) {
			Promise.createContext(this, inheritedContext);

			this.consumers = void 0;
			this.receiver = receiver;
			this.handler = void 0;
			this.resolved = false;
		}

		inherit(Handler, Pending);

		Pending.prototype._state = 0;

		Pending.prototype.resolve = function(x) {
			this.become(getHandler(x));
		};

		Pending.prototype.reject = function(x) {
			if(this.resolved) {
				return;
			}

			this.become(new Rejected(x));
		};

		Pending.prototype.join = function() {
			if (!this.resolved) {
				return this;
			}

			var h = this;

			while (h.handler !== void 0) {
				h = h.handler;
				if (h === this) {
					return this.handler = cycle();
				}
			}

			return h;
		};

		Pending.prototype.run = function() {
			var q = this.consumers;
			var handler = this.handler;
			this.handler = this.handler.join();
			this.consumers = void 0;

			for (var i = 0; i < q.length; ++i) {
				handler.when(q[i]);
			}
		};

		Pending.prototype.become = function(handler) {
			if(this.resolved) {
				return;
			}

			this.resolved = true;
			this.handler = handler;
			if(this.consumers !== void 0) {
				tasks.enqueue(this);
			}

			if(this.context !== void 0) {
				handler._report(this.context);
			}
		};

		Pending.prototype.when = function(continuation) {
			if(this.resolved) {
				tasks.enqueue(new ContinuationTask(continuation, this.handler));
			} else {
				if(this.consumers === void 0) {
					this.consumers = [continuation];
				} else {
					this.consumers.push(continuation);
				}
			}
		};

		/**
		 * @deprecated
		 */
		Pending.prototype.notify = function(x) {
			if(!this.resolved) {
				tasks.enqueue(new ProgressTask(x, this));
			}
		};

		Pending.prototype.fail = function(context) {
			var c = typeof context === 'undefined' ? this.context : context;
			this.resolved && this.handler.join().fail(c);
		};

		Pending.prototype._report = function(context) {
			this.resolved && this.handler.join()._report(context);
		};

		Pending.prototype._unreport = function() {
			this.resolved && this.handler.join()._unreport();
		};

		/**
		 * Wrap another handler and force it into a future stack
		 * @param {object} handler
		 * @constructor
		 */
		function Async(handler) {
			this.handler = handler;
		}

		inherit(Handler, Async);

		Async.prototype.when = function(continuation) {
			tasks.enqueue(new ContinuationTask(continuation, this));
		};

		Async.prototype._report = function(context) {
			this.join()._report(context);
		};

		Async.prototype._unreport = function() {
			this.join()._unreport();
		};

		/**
		 * Handler that wraps an untrusted thenable and assimilates it in a future stack
		 * @param {function} then
		 * @param {{then: function}} thenable
		 * @constructor
		 */
		function Thenable(then, thenable) {
			Pending.call(this);
			tasks.enqueue(new AssimilateTask(then, thenable, this));
		}

		inherit(Pending, Thenable);

		/**
		 * Handler for a fulfilled promise
		 * @param {*} x fulfillment value
		 * @constructor
		 */
		function Fulfilled(x) {
			Promise.createContext(this);
			this.value = x;
		}

		inherit(Handler, Fulfilled);

		Fulfilled.prototype._state = 1;

		Fulfilled.prototype.fold = function(f, z, c, to) {
			runContinuation3(f, z, this, c, to);
		};

		Fulfilled.prototype.when = function(cont) {
			runContinuation1(cont.fulfilled, this, cont.receiver, cont.resolver);
		};

		var errorId = 0;

		/**
		 * Handler for a rejected promise
		 * @param {*} x rejection reason
		 * @constructor
		 */
		function Rejected(x) {
			Promise.createContext(this);

			this.id = ++errorId;
			this.value = x;
			this.handled = false;
			this.reported = false;

			this._report();
		}

		inherit(Handler, Rejected);

		Rejected.prototype._state = -1;

		Rejected.prototype.fold = function(f, z, c, to) {
			to.become(this);
		};

		Rejected.prototype.when = function(cont) {
			if(typeof cont.rejected === 'function') {
				this._unreport();
			}
			runContinuation1(cont.rejected, this, cont.receiver, cont.resolver);
		};

		Rejected.prototype._report = function(context) {
			tasks.afterQueue(new ReportTask(this, context));
		};

		Rejected.prototype._unreport = function() {
			if(this.handled) {
				return;
			}
			this.handled = true;
			tasks.afterQueue(new UnreportTask(this));
		};

		Rejected.prototype.fail = function(context) {
			this.reported = true;
			emitRejection('unhandledRejection', this);
			Promise.onFatalRejection(this, context === void 0 ? this.context : context);
		};

		function ReportTask(rejection, context) {
			this.rejection = rejection;
			this.context = context;
		}

		ReportTask.prototype.run = function() {
			if(!this.rejection.handled && !this.rejection.reported) {
				this.rejection.reported = true;
				emitRejection('unhandledRejection', this.rejection) ||
					Promise.onPotentiallyUnhandledRejection(this.rejection, this.context);
			}
		};

		function UnreportTask(rejection) {
			this.rejection = rejection;
		}

		UnreportTask.prototype.run = function() {
			if(this.rejection.reported) {
				emitRejection('rejectionHandled', this.rejection) ||
					Promise.onPotentiallyUnhandledRejectionHandled(this.rejection);
			}
		};

		// Unhandled rejection hooks
		// By default, everything is a noop

		Promise.createContext
			= Promise.enterContext
			= Promise.exitContext
			= Promise.onPotentiallyUnhandledRejection
			= Promise.onPotentiallyUnhandledRejectionHandled
			= Promise.onFatalRejection
			= noop;

		// Errors and singletons

		var foreverPendingHandler = new Handler();
		var foreverPendingPromise = new Promise(Handler, foreverPendingHandler);

		function cycle() {
			return new Rejected(new TypeError('Promise cycle'));
		}

		// Task runners

		/**
		 * Run a single consumer
		 * @constructor
		 */
		function ContinuationTask(continuation, handler) {
			this.continuation = continuation;
			this.handler = handler;
		}

		ContinuationTask.prototype.run = function() {
			this.handler.join().when(this.continuation);
		};

		/**
		 * Run a queue of progress handlers
		 * @constructor
		 */
		function ProgressTask(value, handler) {
			this.handler = handler;
			this.value = value;
		}

		ProgressTask.prototype.run = function() {
			var q = this.handler.consumers;
			if(q === void 0) {
				return;
			}

			for (var c, i = 0; i < q.length; ++i) {
				c = q[i];
				runNotify(c.progress, this.value, this.handler, c.receiver, c.resolver);
			}
		};

		/**
		 * Assimilate a thenable, sending it's value to resolver
		 * @param {function} then
		 * @param {object|function} thenable
		 * @param {object} resolver
		 * @constructor
		 */
		function AssimilateTask(then, thenable, resolver) {
			this._then = then;
			this.thenable = thenable;
			this.resolver = resolver;
		}

		AssimilateTask.prototype.run = function() {
			var h = this.resolver;
			tryAssimilate(this._then, this.thenable, _resolve, _reject, _notify);

			function _resolve(x) { h.resolve(x); }
			function _reject(x)  { h.reject(x); }
			function _notify(x)  { h.notify(x); }
		};

		function tryAssimilate(then, thenable, resolve, reject, notify) {
			try {
				then.call(thenable, resolve, reject, notify);
			} catch (e) {
				reject(e);
			}
		}

		/**
		 * Fold a handler value with z
		 * @constructor
		 */
		function Fold(f, z, c, to) {
			this.f = f; this.z = z; this.c = c; this.to = to;
			this.resolver = failIfRejected;
			this.receiver = this;
		}

		Fold.prototype.fulfilled = function(x) {
			this.f.call(this.c, this.z, x, this.to);
		};

		Fold.prototype.rejected = function(x) {
			this.to.reject(x);
		};

		Fold.prototype.progress = function(x) {
			this.to.notify(x);
		};

		// Other helpers

		/**
		 * @param {*} x
		 * @returns {boolean} true iff x is a trusted Promise
		 */
		function isPromise(x) {
			return x instanceof Promise;
		}

		/**
		 * Test just enough to rule out primitives, in order to take faster
		 * paths in some code
		 * @param {*} x
		 * @returns {boolean} false iff x is guaranteed *not* to be a thenable
		 */
		function maybeThenable(x) {
			return (typeof x === 'object' || typeof x === 'function') && x !== null;
		}

		function runContinuation1(f, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject(f, h.value, receiver, next);
			Promise.exitContext();
		}

		function runContinuation3(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject3(f, x, h.value, receiver, next);
			Promise.exitContext();
		}

		/**
		 * @deprecated
		 */
		function runNotify(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.notify(x);
			}

			Promise.enterContext(h);
			tryCatchReturn(f, x, receiver, next);
			Promise.exitContext();
		}

		function tryCatch2(f, a, b) {
			try {
				return f(a, b);
			} catch(e) {
				return reject(e);
			}
		}

		/**
		 * Return f.call(thisArg, x), or if it throws return a rejected promise for
		 * the thrown exception
		 */
		function tryCatchReject(f, x, thisArg, next) {
			try {
				next.become(getHandler(f.call(thisArg, x)));
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * Same as above, but includes the extra argument parameter.
		 */
		function tryCatchReject3(f, x, y, thisArg, next) {
			try {
				f.call(thisArg, x, y, next);
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * @deprecated
		 * Return f.call(thisArg, x), or if it throws, *return* the exception
		 */
		function tryCatchReturn(f, x, thisArg, next) {
			try {
				next.notify(f.call(thisArg, x));
			} catch(e) {
				next.notify(e);
			}
		}

		function inherit(Parent, Child) {
			Child.prototype = objectCreate(Parent.prototype);
			Child.prototype.constructor = Child;
		}

		function snd(x, y) {
			return y;
		}

		function noop() {}

		function initEmitRejection() {
			/*global process, self, CustomEvent*/
			if(typeof process !== 'undefined' && process !== null
				&& typeof process.emit === 'function') {
				// Returning falsy here means to call the default
				// onPotentiallyUnhandledRejection API.  This is safe even in
				// browserify since process.emit always returns falsy in browserify:
				// https://github.com/defunctzombie/node-process/blob/master/browser.js#L40-L46
				return function(type, rejection) {
					return type === 'unhandledRejection'
						? process.emit(type, rejection.value, rejection)
						: process.emit(type, rejection);
				};
			} else if(typeof self !== 'undefined' && typeof CustomEvent === 'function') {
				return (function(noop, self, CustomEvent) {
					var hasCustomEvent = false;
					try {
						var ev = new CustomEvent('unhandledRejection');
						hasCustomEvent = ev instanceof CustomEvent;
					} catch (e) {}

					return !hasCustomEvent ? noop : function(type, rejection) {
						var ev = new CustomEvent(type, {
							detail: {
								reason: rejection.value,
								key: rejection
							},
							bubbles: false,
							cancelable: true
						});

						return !self.dispatchEvent(ev);
					};
				}(noop, self, CustomEvent));
			}

			return noop;
		}

		return Promise;
	};
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

}).call(this,require('_process'))
},{"_process":77}],38:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return {
		pending: toPendingState,
		fulfilled: toFulfilledState,
		rejected: toRejectedState,
		inspect: inspect
	};

	function toPendingState() {
		return { state: 'pending' };
	}

	function toRejectedState(e) {
		return { state: 'rejected', reason: e };
	}

	function toFulfilledState(x) {
		return { state: 'fulfilled', value: x };
	}

	function inspect(handler) {
		var state = handler.state();
		return state === 0 ? toPendingState()
			 : state > 0   ? toFulfilledState(handler.value)
			               : toRejectedState(handler.value);
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],39:[function(require,module,exports){
/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * pipeline.js
 *
 * Run a set of task functions in sequence, passing the result
 * of the previous as an argument to the next.  Like a shell
 * pipeline, e.g. `cat file.txt | grep 'foo' | sed -e 's/foo/bar/g'
 *
 * @author Brian Cavalier
 * @author John Hann
 */

(function(define) {
define(function(require) {

	var when = require('./when');
	var all = when.Promise.all;
	var slice = Array.prototype.slice;

	/**
	 * Run array of tasks in a pipeline where the next
	 * tasks receives the result of the previous.  The first task
	 * will receive the initialArgs as its argument list.
	 * @param tasks {Array|Promise} array or promise for array of task functions
	 * @param [initialArgs...] {*} arguments to be passed to the first task
	 * @return {Promise} promise for return value of the final task
	 */
	return function pipeline(tasks /* initialArgs... */) {
		// Self-optimizing function to run first task with multiple
		// args using apply, but subsequence tasks via direct invocation
		var runTask = function(args, task) {
			runTask = function(arg, task) {
				return task(arg);
			};

			return task.apply(null, args);
		};

		return all(slice.call(arguments, 1)).then(function(args) {
			return when.reduce(tasks, function(arg, task) {
				return runTask(arg, task);
			}, args);
		});
	};

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });



},{"./when":40}],40:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */

/**
 * Promises/A+ and when() implementation
 * when is part of the cujoJS family of libraries (http://cujojs.com/)
 * @author Brian Cavalier
 * @author John Hann
 * @version 3.7.2
 */
(function(define) { 'use strict';
define(function (require) {

	var timed = require('./lib/decorators/timed');
	var array = require('./lib/decorators/array');
	var flow = require('./lib/decorators/flow');
	var fold = require('./lib/decorators/fold');
	var inspect = require('./lib/decorators/inspect');
	var generate = require('./lib/decorators/iterate');
	var progress = require('./lib/decorators/progress');
	var withThis = require('./lib/decorators/with');
	var unhandledRejection = require('./lib/decorators/unhandledRejection');
	var TimeoutError = require('./lib/TimeoutError');

	var Promise = [array, flow, fold, generate, progress,
		inspect, withThis, timed, unhandledRejection]
		.reduce(function(Promise, feature) {
			return feature(Promise);
		}, require('./lib/Promise'));

	var apply = require('./lib/apply')(Promise);

	// Public API

	when.promise     = promise;              // Create a pending promise
	when.resolve     = Promise.resolve;      // Create a resolved promise
	when.reject      = Promise.reject;       // Create a rejected promise

	when.lift        = lift;                 // lift a function to return promises
	when['try']      = attempt;              // call a function and return a promise
	when.attempt     = attempt;              // alias for when.try

	when.iterate     = Promise.iterate;      // DEPRECATED (use cujojs/most streams) Generate a stream of promises
	when.unfold      = Promise.unfold;       // DEPRECATED (use cujojs/most streams) Generate a stream of promises

	when.join        = join;                 // Join 2 or more promises

	when.all         = all;                  // Resolve a list of promises
	when.settle      = settle;               // Settle a list of promises

	when.any         = lift(Promise.any);    // One-winner race
	when.some        = lift(Promise.some);   // Multi-winner race
	when.race        = lift(Promise.race);   // First-to-settle race

	when.map         = map;                  // Array.map() for promises
	when.filter      = filter;               // Array.filter() for promises
	when.reduce      = lift(Promise.reduce);       // Array.reduce() for promises
	when.reduceRight = lift(Promise.reduceRight);  // Array.reduceRight() for promises

	when.isPromiseLike = isPromiseLike;      // Is something promise-like, aka thenable

	when.Promise     = Promise;              // Promise constructor
	when.defer       = defer;                // Create a {promise, resolve, reject} tuple

	// Error types

	when.TimeoutError = TimeoutError;

	/**
	 * Get a trusted promise for x, or by transforming x with onFulfilled
	 *
	 * @param {*} x
	 * @param {function?} onFulfilled callback to be called when x is
	 *   successfully fulfilled.  If promiseOrValue is an immediate value, callback
	 *   will be invoked immediately.
	 * @param {function?} onRejected callback to be called when x is
	 *   rejected.
	 * @param {function?} onProgress callback to be called when progress updates
	 *   are issued for x. @deprecated
	 * @returns {Promise} a new promise that will fulfill with the return
	 *   value of callback or errback or the completion value of promiseOrValue if
	 *   callback and/or errback is not supplied.
	 */
	function when(x, onFulfilled, onRejected, onProgress) {
		var p = Promise.resolve(x);
		if (arguments.length < 2) {
			return p;
		}

		return p.then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Creates a new promise whose fate is determined by resolver.
	 * @param {function} resolver function(resolve, reject, notify)
	 * @returns {Promise} promise whose fate is determine by resolver
	 */
	function promise(resolver) {
		return new Promise(resolver);
	}

	/**
	 * Lift the supplied function, creating a version of f that returns
	 * promises, and accepts promises as arguments.
	 * @param {function} f
	 * @returns {Function} version of f that returns promises
	 */
	function lift(f) {
		return function() {
			for(var i=0, l=arguments.length, a=new Array(l); i<l; ++i) {
				a[i] = arguments[i];
			}
			return apply(f, this, a);
		};
	}

	/**
	 * Call f in a future turn, with the supplied args, and return a promise
	 * for the result.
	 * @param {function} f
	 * @returns {Promise}
	 */
	function attempt(f /*, args... */) {
		/*jshint validthis:true */
		for(var i=0, l=arguments.length-1, a=new Array(l); i<l; ++i) {
			a[i] = arguments[i+1];
		}
		return apply(f, this, a);
	}

	/**
	 * Creates a {promise, resolver} pair, either or both of which
	 * may be given out safely to consumers.
	 * @return {{promise: Promise, resolve: function, reject: function, notify: function}}
	 */
	function defer() {
		return new Deferred();
	}

	function Deferred() {
		var p = Promise._defer();

		function resolve(x) { p._handler.resolve(x); }
		function reject(x) { p._handler.reject(x); }
		function notify(x) { p._handler.notify(x); }

		this.promise = p;
		this.resolve = resolve;
		this.reject = reject;
		this.notify = notify;
		this.resolver = { resolve: resolve, reject: reject, notify: notify };
	}

	/**
	 * Determines if x is promise-like, i.e. a thenable object
	 * NOTE: Will return true for *any thenable object*, and isn't truly
	 * safe, since it may attempt to access the `then` property of x (i.e.
	 *  clever/malicious getters may do weird things)
	 * @param {*} x anything
	 * @returns {boolean} true if x is promise-like
	 */
	function isPromiseLike(x) {
		return x && typeof x.then === 'function';
	}

	/**
	 * Return a promise that will resolve only once all the supplied arguments
	 * have resolved. The resolution value of the returned promise will be an array
	 * containing the resolution values of each of the arguments.
	 * @param {...*} arguments may be a mix of promises and values
	 * @returns {Promise}
	 */
	function join(/* ...promises */) {
		return Promise.all(arguments);
	}

	/**
	 * Return a promise that will fulfill once all input promises have
	 * fulfilled, or reject when any one input promise rejects.
	 * @param {array|Promise} promises array (or promise for an array) of promises
	 * @returns {Promise}
	 */
	function all(promises) {
		return when(promises, Promise.all);
	}

	/**
	 * Return a promise that will always fulfill with an array containing
	 * the outcome states of all input promises.  The returned promise
	 * will only reject if `promises` itself is a rejected promise.
	 * @param {array|Promise} promises array (or promise for an array) of promises
	 * @returns {Promise} promise for array of settled state descriptors
	 */
	function settle(promises) {
		return when(promises, Promise.settle);
	}

	/**
	 * Promise-aware array map function, similar to `Array.prototype.map()`,
	 * but input array may contain promises or values.
	 * @param {Array|Promise} promises array of anything, may contain promises and values
	 * @param {function(x:*, index:Number):*} mapFunc map function which may
	 *  return a promise or value
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function map(promises, mapFunc) {
		return when(promises, function(promises) {
			return Promise.map(promises, mapFunc);
		});
	}

	/**
	 * Filter the provided array of promises using the provided predicate.  Input may
	 * contain promises and values
	 * @param {Array|Promise} promises array of promises and values
	 * @param {function(x:*, index:Number):boolean} predicate filtering predicate.
	 *  Must return truthy (or promise for truthy) for items to retain.
	 * @returns {Promise} promise that will fulfill with an array containing all items
	 *  for which predicate returned truthy.
	 */
	function filter(promises, predicate) {
		return when(promises, function(promises) {
			return Promise.filter(promises, predicate);
		});
	}

	return when;
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./lib/Promise":22,"./lib/TimeoutError":24,"./lib/apply":25,"./lib/decorators/array":26,"./lib/decorators/flow":27,"./lib/decorators/fold":28,"./lib/decorators/inspect":29,"./lib/decorators/iterate":30,"./lib/decorators/progress":31,"./lib/decorators/timed":32,"./lib/decorators/unhandledRejection":33,"./lib/decorators/with":34}],41:[function(require,module,exports){
/*
 * adaptor
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Basestar = require("./basestar"),
    Utils = require("./utils"),
    _ = require("./utils/helpers");

// Public: Creates a new Adaptor
//
// opts - hash of acceptable params
//   name - name of the Adaptor, used when printing to console
//   connection - Connection the adaptor will use to proxy commands/events
//
// Returns a new Adaptor
var Adaptor = module.exports = function Adaptor(opts) {
  opts = opts || {};

  this.name = opts.name;

  // the Robot the adaptor belongs to
  this.robot = opts.robot;

  // some default options
  this.host = opts.host;
  this.port = opts.port;

  // misc. details provided in args hash
  this.details = {};

  _.each(opts, function(opt, name) {
    if (!~["robot", "name", "adaptor", "events"].indexOf(name)) {
      this.details[name] = opt;
    }
  }, this);
};

Utils.subclass(Adaptor, Basestar);

// Public: Expresses the Connection in JSON format
//
// Returns an Object containing Connection data
Adaptor.prototype.toJSON = function() {
  return {
    name: this.name,
    adaptor: this.constructor.name || this.name,
    details: this.details
  };
};

},{"./basestar":42,"./utils":58,"./utils/helpers":59}],42:[function(require,module,exports){
/*
 * basestar
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var EventEmitter = require("events").EventEmitter;

var Utils = require("./utils"),
    _ = require("./utils/helpers");

// Basestar is a base class to be used when writing external Cylon adaptors and
// drivers. It provides some useful base methods and functionality
//
// It also extends EventEmitter, so child classes are capable of emitting events
// for other parts of the system to handle.
var Basestar = module.exports = function Basestar() {
};

Utils.subclass(Basestar, EventEmitter);

// Public: Proxies calls from all methods in the object to a target object
//
// methods - array of methods to proxy
// target - object to proxy methods to
// source - object to proxy methods from
// force - whether or not to overwrite existing method definitions
//
// Returns the klass where the methods have been proxied
Basestar.prototype.proxyMethods = Utils.proxyFunctionsToObject;

// Public: Defines an event handler that proxies events from a source object
// to a target object
//
// opts - object containing options:
//   - targetEventName or eventName - event that should be emitted from the
//                                    target
//   - target - object to proxy event to
//   - source - object to proxy event from
//   - sendUpdate - whether or not to send an "update" event
//
// Returns the source
Basestar.prototype.defineEvent = function(opts) {
  opts.sendUpdate = opts.sendUpdate || false;
  opts.targetEventName = opts.targetEventName || opts.eventName;

  opts.source.on(opts.eventName, function() {
    var args = arguments.length >= 1 ? [].slice.call(arguments, 0) : [];
    args.unshift(opts.targetEventName);
    opts.target.emit.apply(opts.target, args);

    if (opts.sendUpdate) {
      args.unshift("update");
      opts.target.emit.apply(opts.target, args);
    }
  });

  return opts.source;
};

// Public: Creates an event handler that proxies events from an adaptor"s
// "connector" (reference to whatever module is actually talking to the hw)
// to the adaptor
//
// opts - hash of opts to be passed to defineEvent()
//
// Returns this.connector
Basestar.prototype.defineAdaptorEvent = function(opts) {
  return this._proxyEvents(opts, this.connector, this);
};

// Public: Creates an event handler that proxies events from a driver"s
// connection to the driver
//
// opts - hash of opts to be passed to defineEvent()
//
// Returns this.connection
Basestar.prototype.defineDriverEvent = function(opts) {
  return this._proxyEvents(opts, this.connection, this);
};

Basestar.prototype._proxyEvents = function(opts, source, target) {
  opts = _.isString(opts) ? { eventName: opts } : opts;

  opts.source = source;
  opts.target = target;

  return this.defineEvent(opts);
};

},{"./utils":58,"./utils/helpers":59,"events":68}],43:[function(require,module,exports){
/*
 * Cylon - Internal Configuration
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

module.exports = {
  logging: {},

  // are we in TDR test mode? Used to stub out adaptors/drivers.
  testMode: false
};

},{}],44:[function(require,module,exports){
(function (process){
/*
 * cylon
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Async = require("async");

var Logger = require("./logger"),
    Robot = require("./robot"),
    Config = require("./config"),
    Utils = require("./utils"),
    _ = require("./utils/helpers");

var EventEmitter = require("events").EventEmitter;

var Cylon = module.exports = new EventEmitter();

Cylon.Logger = Logger;
Cylon.Driver = require("./driver");
Cylon.Adaptor = require("./adaptor");
Cylon.Utils = Utils;

Cylon.IO = {
  DigitalPin: require("./io/digital-pin"),
  Utils: require("./io/utils")
};

Cylon.apiInstances = [];

Cylon.robots = {};
Cylon.commands = {};

Cylon.events = [ "robot_added", "robot_removed" ];

// Public: Creates a new Robot
//
// opts - hash of Robot attributes
//
// Returns a shiny new Robot
// Examples:
//   Cylon.robot
//     connection: { name: "arduino", adaptor: "firmata" }
//     device: { name: "led", driver: "led", pin: 13 }
//
//     work: (me) ->
//       me.led.toggle()
Cylon.robot = function robot(opts) {
  opts = opts || {};

  // check if a robot with the same name exists already
  if (opts.name && this.robots[opts.name]) {
    var original = opts.name;
    opts.name = Utils.makeUnique(original, Object.keys(this.robots));

    var str = "Robot names must be unique. Renaming '";
    str += original + "' to '" + opts.name + "'";

    Logger.warn(str);
  }

  var bot = new Robot(opts);
  this.robots[bot.name] = bot;
  this.emit("robot_added", bot.name);

  return bot;
};

// Public: Initializes an API instance based on provided options.
//
// Returns nothing
Cylon.api = function api(Server, opts) {
  // if only passed options (or nothing), assume HTTP server
  if (Server == null || _.isObject(Server) && !_.isFunction(Server)) {
    opts = Server;
    Server = "http";
  }

  opts = opts || {};

  if (_.isString(Server)) {
    var req = "cylon-api-" + Server;

    try {
      Server = require(req);
    } catch (e) {
      if (e.code === "MODULE_NOT_FOUND") {
        var messages;

        if (req === "cylon-api-http") {
          messages = [
            "The HTTP API is no longer included in Cylon by default.",
            "To use it, install the plugin module: `npm install cylon-api-http`"
          ];
        } else {
          messages = [
            "Cannot find the " + req + " API module.",
            "You may be able to install it: `npm install " + req + "`"
          ];
        }

        _.each(messages, _.arity(Logger.error, 1));
        return;
      } else {
        throw e;
      }
    }
  }

  opts.mcp = this;
  var instance = new Server(opts);
  this.apiInstances.push(instance);
  instance.start();
};

// Public: Starts up the API and the robots
//
// Returns nothing
Cylon.start = function start() {
  var starters = _.pluck(this.robots, "start");

  Async.parallel(starters, function() {
    var mode = Utils.fetch(Config, "workMode", "async");

    if (mode === "sync") {
      _.invoke(this.robots, "startWork");
    }
  }.bind(this));
};

// Public: Sets the internal configuration, based on passed options
//
// opts - object containing configuration key/value pairs
//
// Returns the current config
Cylon.config = function(opts) {
  var loggingChanged = (
    opts.logging && Config.logging !== _.extend(Config.logging, opts.logging)
  );

  if (_.isObject(opts)) {
    Config = _.extend(Config, opts);
  }

  if (loggingChanged) {
    Logger.setup();
  }

  return Config;
};

// Public: Halts the API and the robots
//
// callback - callback to be triggered when Cylon is ready to shutdown
//
// Returns nothing
Cylon.halt = function halt(callback) {
  callback = callback || function() {};

  var fns = _.pluck(this.robots, "halt");

  // if robots can"t shut down quickly enough, forcefully self-terminate
  var timeout = Config.haltTimeout || 3000;
  Utils.after(timeout, callback);

  Async.parallel(fns, callback);
};

Cylon.toJSON = function() {
  return {
    robots: _.invoke(this.robots, "toJSON"),
    commands: Object.keys(this.commands),
    events: this.events
  };
};

if (process.platform === "win32") {
  var readline = require("readline"),
      io = { input: process.stdin, output: process.stdout };

  readline.createInterface(io).on("SIGINT", function() {
    process.emit("SIGINT");
  });
}

process.on("SIGINT", function() {
  Cylon.halt(function() {
    process.kill(process.pid);
  });
});

}).call(this,require('_process'))
},{"./adaptor":41,"./config":43,"./driver":45,"./io/digital-pin":47,"./io/utils":48,"./logger":49,"./robot":53,"./utils":58,"./utils/helpers":59,"_process":77,"async":61,"events":68,"readline":62}],45:[function(require,module,exports){
/*
 * driver
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Basestar = require("./basestar"),
    Utils = require("./utils"),
    _ = require("./utils/helpers");

// Public: Creates a new Driver
//
// opts - hash of acceptable params
//   name - name of the Driver, used when printing to console
//   device - Device the driver will use to proxy commands/events
//
// Returns a new Driver
var Driver = module.exports = function Driver(opts) {
  opts = opts || {};

  this.name = opts.name;
  this.robot = opts.robot;

  this.connection = opts.connection;

  this.commands = {};
  this.events = [];

  // some default options
  this.pin = opts.pin;
  this.interval = opts.interval || 10;

  this.details = {};

  _.each(opts, function(opt, name) {
    var banned = ["robot", "name", "connection", "driver", "events"];

    if (!~banned.indexOf(name)) {
      this.details[name] = opt;
    }
  }, this);
};

Utils.subclass(Driver, Basestar);

Driver.prototype.setupCommands = function(commands, proxy) {
  if (proxy == null) {
    proxy = this.connection;
  }

  Utils.proxyFunctionsToObject(commands, proxy, this);

  commands.forEach(function(command) {
    var snake_case = command.replace(/[A-Z]+/g, function(match) {
      if (match.length > 1) {
        match = match.replace(/[A-Z]$/, function(m) {
          return "_" + m.toLowerCase();
        });
      }

      return "_" + match.toLowerCase();
    }).replace(/^_/, "");

    this.commands[snake_case] = this[command];
  }, this);
};

Driver.prototype.toJSON = function() {
  return {
    name: this.name,
    driver: this.constructor.name || this.name,
    connection: this.connection.name,
    commands: Object.keys(this.commands),
    events: this.events,
    details: this.details
  };
};

},{"./basestar":42,"./utils":58,"./utils/helpers":59}],46:[function(require,module,exports){
(function (process){
/*
 * Device/Connection Initializer
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Registry = require("./registry"),
    Config = require("./config"),
    _ = require("./utils/helpers");

function testMode() {
  return process.env.NODE_ENV === "test" && Config.testMode;
}

module.exports = function Initializer(type, opts) {
  var mod;

  mod = Registry.findBy(type, opts[type]);

  if (!mod) {
    if (opts.module) {
      Registry.register(opts.module);
    } else {
      Registry.register("cylon-" + opts[type]);
    }

    mod = Registry.findBy(type, opts[type]);
  }

  var obj = mod[type](opts);

  _.each(obj, function(prop, name) {
    if (name === "constructor") {
      return;
    }

    if (_.isFunction(prop)) {
      obj[name] = prop.bind(obj);
    }
  });

  if (testMode()) {
    var test = Registry.findBy(type, "test")[type](opts);

    _.each(obj, function(prop, name) {
      if (_.isFunction(prop) && !test[name]) {
        test[name] = function() { return true; };
      }
    });

    return test;
  }

  return obj;
};

}).call(this,require('_process'))
},{"./config":43,"./registry":52,"./utils/helpers":59,"_process":77}],47:[function(require,module,exports){
/*
 * Linux IO DigitalPin
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var FS = require("fs"),
    EventEmitter = require("events").EventEmitter;

var Utils = require("../utils");

var GPIO_PATH = "/sys/class/gpio";

var GPIO_READ = "in";
var GPIO_WRITE = "out";

// DigitalPin class offers an interface with the Linux GPIO system present in
// single-board computers such as a Raspberry Pi, or a BeagleBone
var DigitalPin = module.exports = function DigitalPin(opts) {
  this.pinNum = opts.pin.toString();
  this.status = "low";
  this.ready = false;
  this.mode = opts.mode;
};

Utils.subclass(DigitalPin, EventEmitter);

DigitalPin.prototype.connect = function(mode) {
  if (this.mode == null) {
    this.mode = mode;
  }

  FS.exists(this._pinPath(), function(exists) {
    if (exists) {
      this._openPin();
    } else {
      this._createGPIOPin();
    }
  }.bind(this));
};

DigitalPin.prototype.close = function() {
  FS.writeFile(this._unexportPath(), this.pinNum, function(err) {
    this._closeCallback(err);
  }.bind(this));
};

DigitalPin.prototype.closeSync = function() {
  FS.writeFileSync(this._unexportPath(), this.pinNum);
  this._closeCallback(false);
};

DigitalPin.prototype.digitalWrite = function(value) {
  if (this.mode !== "w") {
    this._setMode("w");
  }

  this.status = value === 1 ? "high" : "low";

  FS.writeFile(this._valuePath(), value, function(err) {
    if (err) {
      var str = "Error occurred while writing value ";
      str += value + " to pin " + this.pinNum;

      this.emit("error", str);
    } else {
      this.emit("digitalWrite", value);
    }
  }.bind(this));

  return value;
};

// Public: Reads the digial pin"s value periodicly on a supplied interval,
// and emits the result or an error
//
// interval - time (in milliseconds) to read from the pin at
//
// Returns the defined interval
DigitalPin.prototype.digitalRead = function(interval) {
  if (this.mode !== "r") { this._setMode("r"); }

  Utils.every(interval, function() {
    FS.readFile(this._valuePath(), function(err, data) {
      if (err) {
        var error = "Error occurred while reading from pin " + this.pinNum;
        this.emit("error", error);
      } else {
        var readData = parseInt(data.toString());
        this.emit("digitalRead", readData);
      }
    }.bind(this));
  }.bind(this));
};

DigitalPin.prototype.setHigh = function() {
  return this.digitalWrite(1);
};

DigitalPin.prototype.setLow = function() {
  return this.digitalWrite(0);
};

DigitalPin.prototype.toggle = function() {
  return (this.status === "low") ? this.setHigh() : this.setLow();
};

// Creates the GPIO file to read/write from
DigitalPin.prototype._createGPIOPin = function() {
  FS.writeFile(this._exportPath(), this.pinNum, function(err) {
    if (err) {
      this.emit("error", "Error while creating pin files");
    } else {
      this._openPin();
    }
  }.bind(this));
};

DigitalPin.prototype._openPin = function() {
  this._setMode(this.mode, true);
  this.emit("open");
};

DigitalPin.prototype._closeCallback = function(err) {
  if (err) {
    this.emit("error", "Error while closing pin files");
  } else {
    this.emit("close", this.pinNum);
  }
};

// Sets the mode for the pin by writing the values to the pin reference files
DigitalPin.prototype._setMode = function(mode, emitConnect) {
  if (emitConnect == null) { emitConnect = false; }

  this.mode = mode;

  var data = (mode === "w") ? GPIO_WRITE : GPIO_READ;

  FS.writeFile(this._directionPath(), data, function(err) {
    this._setModeCallback(err, emitConnect);
  }.bind(this));
};

DigitalPin.prototype._setModeCallback = function(err, emitConnect) {
  if (err) {
    return this.emit("error", "Setting up pin direction failed");
  }

  this.ready = true;

  if (emitConnect) {
    this.emit("connect", this.mode);
  }
};

DigitalPin.prototype._directionPath = function() {
  return this._pinPath() + "/direction";
};

DigitalPin.prototype._valuePath = function() {
  return this._pinPath() + "/value";
};

DigitalPin.prototype._pinPath = function() {
  return GPIO_PATH + "/gpio" + this.pinNum;
};

DigitalPin.prototype._exportPath = function() {
  return GPIO_PATH + "/export";
};

DigitalPin.prototype._unexportPath = function() {
  return GPIO_PATH + "/unexport";
};

},{"../utils":58,"events":68,"fs":62}],48:[function(require,module,exports){
"use strict";

module.exports = {
  // Returns { period: int, duty: int }
  // Calculated based on params value, freq, pulseWidth = { min: int, max: int }
  // pulseWidth min and max need to be specified in microseconds
  periodAndDuty: function(scaledDuty, freq, pulseWidth, polarity) {
    var period, duty, maxDuty;

    polarity = polarity || "high";
    period = Math.round(1.0e9 / freq);

    if (pulseWidth != null) {
      var pulseWidthMin = pulseWidth.min * 1000,
          pulseWidthMax = pulseWidth.max * 1000;

      maxDuty =  pulseWidthMax - pulseWidthMin;
      duty = Math.round(pulseWidthMin + (maxDuty * scaledDuty));
    } else {
      duty = Math.round(period * scaledDuty);
    }

    if (polarity === "low") {
      duty = period - duty;
    }

    return { period: period, duty: duty };
  }
};

},{}],49:[function(require,module,exports){
/*
 * logger
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var levels = ["debug", "info", "warn", "error", "fatal"];

var BasicLogger = require("./logger/basic_logger"),
    NullLogger = require("./logger/null_logger"),
    Config = require("./config"),
    _ = require("./utils/helpers");

var Logger = module.exports = {
  setup: function(opts) {
    if (_.isObject(opts)) {
      Config.logging = _.extend(Config.logging, opts);
    }

    var logger = Config.logging.logger,
        level  = Config.logging.level || "info";

    logger = (logger == null) ? BasicLogger : logger;

    this.logger = logger || NullLogger;
    this.level = level;

    return this;
  },

  toString: function() {
    return this.logger.toString();
  }
};

Logger.setup();

levels.forEach(function(level) {
  Logger[level] = function() {
    if (levels.indexOf(level) >= levels.indexOf(Logger.level)) {
      return Logger.logger[level].apply(Logger.logger, arguments);
    }
  };
});

},{"./config":43,"./logger/basic_logger":50,"./logger/null_logger":51,"./utils/helpers":59}],50:[function(require,module,exports){
"use strict";

var getArgs = function(args) {
  return args.length >= 1 ? [].slice.call(args, 0) : [];
};

var logString = function(type) {
  var time = new Date().toISOString(),
      upcase = String(type).toUpperCase(),
      padded = String("      " + upcase).slice(-5);

  return upcase[0] + ", [" + time + "] " + padded + " -- :";
};

// The BasicLogger logs to console.log
var BasicLogger = module.exports = {
  toString: function() { return "BasicLogger"; },
};

["debug", "info", "warn", "error", "fatal"].forEach(function(type) {
  BasicLogger[type] = function() {
    var args = getArgs(arguments);
    return console.log.apply(console, [].concat(logString(type), args));
  };
});

},{}],51:[function(require,module,exports){
"use strict";

// The NullLogger is designed for cases where you want absolutely nothing to
// print to anywhere. Every proxied method from the Logger returns a noop.
var NullLogger = module.exports = {
  toString: function() { return "NullLogger"; }
};

["debug", "info", "warn", "error", "fatal"].forEach(function(type) {
  NullLogger[type] = function() {};
});

},{}],52:[function(require,module,exports){
(function (process){
/*
 * Registry
 *
 * The Registry contains references to all Drivers and Adaptors Cylon is aware
 * of, along with which module they live in (e.g. cylon-firmata).
 *
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Logger = require("./logger");

// Explicitly these modules here, so Browserify can grab them later
require("./test/loopback");
require("./test/test-adaptor");
require("./test/test-driver");
require("./test/ping");

var missingModuleError = function(module) {
  var str = "Cannot find the '" + module + "' module.\n";
  str += "This problem might be fixed by installing it with ";
  str +="'npm install " + module + "' and trying again.";

  console.log(str);

  process.emit("SIGINT");
};

var Registry = module.exports = {
  data: {},

  register: function(module) {
    if (this.data[module]) {
      return this.data[module].module;
    }

    var pkg;

    try {
      pkg = require(module);
    } catch (e) {
      if (e.code === "MODULE_NOT_FOUND") {
        missingModuleError(module);
      }

      throw e;
    }

    this.data[module] = {
      module: pkg,
      adaptors: pkg.adaptors || [],
      drivers: pkg.drivers || [],
      dependencies: pkg.dependencies || []
    };

    this.logRegistration(module, this.data[module]);

    this.data[module].dependencies.forEach(function(dep) {
      Registry.register(dep);
    });

    return this.data[module].module;
  },

  findBy: function(prop, name) {
    // pluralize, if necessary
    if (!/s$/.test(name)) {
      prop += "s";
    }

    return this.search(prop, name);
  },

  findByModule: function(module) {
    if (!this.data[module]) {
      return null;
    }

    return this.data[module].module;
  },

  logRegistration: function(name) {
    var module = this.data[name];

    Logger.debug("Registering module " + name);

    ["adaptors", "drivers", "dependencies"].forEach(function(field) {
      if (module[field].length) {
        Logger.debug("  " + field + ":");
        module[field].forEach(function(item) {
          Logger.debug("    - " + item);
        });
      }
    });
  },

  search: function(entry, value) {
    for (var name in this.data) {
      var repo = this.data[name];

      if (~repo[entry].indexOf(value)) {
        return repo.module;
      }
    }

    return false;
  }
};

// Default drivers/adaptors:
["loopback", "ping", "test-adaptor", "test-driver"].forEach(function(module) {
  Registry.register("./test/" + module);
});

}).call(this,require('_process'))
},{"./logger":49,"./test/loopback":54,"./test/ping":55,"./test/test-adaptor":56,"./test/test-driver":57,"_process":77}],53:[function(require,module,exports){
(function (process){
/*
 * robot
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var initializer = require("./initializer"),
    Logger = require("./logger"),
    Utils = require("./utils"),
    Config = require("./config"),
    _ = require("./utils/helpers");

var Async = require("async"),
    EventEmitter = require("events").EventEmitter;

// Public: Creates a new Robot
//
// opts - object containing Robot options
//   name - optional, string name of the robot
//   connection/connections - object connections to connect to
//   device/devices - object devices to connect to
//   work - work to be performed when the Robot is started
//
// Returns a new Robot
var Robot = module.exports = function Robot(opts) {
  opts = opts || {};

  var methods = [
    "toString",
    "halt",
    "startDevices",
    "startConnections",
    "start",
    "initRobot",
    "initDevices",
    "initConnections",
    "log"
  ];

  methods.forEach(function(method) {
    this[method] = this[method].bind(this);
  }, this);

  this.initRobot(opts);
  this.initConnections(opts);
  this.initDevices(opts);

  _.each(opts, function(opt, name) {
    if (this[name] !== undefined) {
      return;
    }

    this[name] = opt;

    if (opts.commands == null && _.isFunction(opt)) {
      this.commands[name] = opt;
    }
  }, this);

  if (opts.commands) {
    var cmds;

    if (_.isFunction(opts.commands)) {
      cmds = opts.commands.call(this);
    } else {
      cmds = opts.commands;
    }

    if (_.isObject(cmds)) {
      this.commands = cmds;
    } else {
      var err = "#commands must be an object ";
      err += "or a function that returns an object";
      throw new Error(err);
    }
  }

  var mode = Utils.fetch(Config, "mode", "manual");

  if (mode === "auto") {
    // run on the next tick, to allow for "work" event handlers to be set up
    setTimeout(this.start, 0);
  }
};

Utils.subclass(Robot, EventEmitter);

// Public: Generates a random name for a Robot.
//
// Returns a string name
Robot.randomName = function() {
  return "Robot " + (Math.floor(Math.random() * 100000));
};

// Public: Expresses the Robot in a JSON-serializable format
//
// Returns an Object containing Robot data
Robot.prototype.toJSON = function() {
  return {
    name: this.name,
    connections: _.invoke(this.connections, "toJSON"),
    devices: _.invoke(this.devices, "toJSON"),
    commands: Object.keys(this.commands),
    events: _.isArray(this.events) ? this.events : []
  };
};

Robot.prototype.connection = function(name, conn) {
  conn.robot = this;
  conn.name = name;

  if (this.connections[conn.name]) {
    var original = conn.name,
        str;

    conn.name = Utils.makeUnique(original, Object.keys(this.connections));

    str = "Connection names must be unique.";
    str += "Renaming '" + original + "' to '" + conn.name + "'";
    this.log("warn", str);
  }

  this.connections[conn.name] = initializer("adaptor", conn);

  return this;
};

// Public: Initializes all vars for robot
//
// opts - options array passed to constructor
//
// Returns null
Robot.prototype.initRobot = function(opts) {
  this.name = opts.name || Robot.randomName();
  this.connections = {};
  this.devices = {};
  this.adaptors = {};
  this.drivers = {};
  this.commands = {};
  this.running = false;
  this.work = opts.work || opts.play;

  if (!this.work) {
    this.work = function() { this.log("debug", "No work yet."); };
  }
};

// Public: Initializes all connections for the robot
//
// opts - options array passed to constructor
//
// Returns initialized connections
Robot.prototype.initConnections = function(opts) {
  this.log("info", "Initializing connections.");

  if (opts.connection == null && opts.connections == null) {
    return this.connections;
  }

  if (opts.connection) {
    this.deprecationWarning("connection");
    this.connection(opts.connection.name, opts.connection);
    return this.connections;
  }

  if (_.isObjectLoose(opts.connections)) {
    if (_.isArray(opts.connections)) {
      this.performArraySetup(opts.connections, "connection", "connections");
      return this.connections;
    }

    _.each(opts.connections, function(conn, key) {
      var name = _.isString(key) ? key : conn.name;

      if (conn.devices) {
        opts.devices = opts.devices || {};

        _.each(conn.devices, function(device, d) {
          device.connection = name;
          opts.devices[d] = device;
        });

        delete conn.devices;
      }

      this.connection(name, conn);
    }, this);
  }

  return this.connections;
};

Robot.prototype.device = function(name, device) {
  var str;

  device.robot = this;
  device.name = name;

  if (this.devices[device.name]) {
    var original = device.name;
    device.name = Utils.makeUnique(original, Object.keys(this.devices));

    str = "Device names must be unique.";
    str += "Renaming '" + original + "' to '" + device.name + "'";
    this.log("warn", str);
  }

  if (_.isString(device.connection)) {
    if (this.connections[device.connection] == null) {
      str = "No connection found with the name " + device.connection + ".\n";
      this.log("fatal", str);
      process.emit("SIGINT");
    }

    device.connection = this.connections[device.connection];
  } else {
    for (var c in this.connections) {
      device.connection = this.connections[c];
      break;
    }
  }

  this.devices[device.name] = initializer("driver", device);

  return this;
};

// Public: Initializes all devices for the robot
//
// opts - options array passed to constructor
//
// Returns initialized devices
Robot.prototype.initDevices = function(opts) {
  this.log("info", "Initializing devices.");

  if (opts.device == null && opts.devices == null) {
    return this.devices;
  }

  // check that there are connections to use
  if (!Object.keys(this.connections).length) {
    throw new Error("No connections specified");
  }

  if (opts.device) {
    this.deprecationWarning("device");
    this.device(opts.device.name, opts.device);
    return this.devices;
  }

  if (_.isObjectLoose(opts.devices)) {
    if (_.isArray(opts.devices)) {
      this.performArraySetup(opts.devices, "device", "devices");
      return this.devices;
    }

    _.each(opts.devices, function(device, key) {
      var name = _.isString(key) ? key : device.name;
      this.device(name, device);
    }, this);
  }

  return this.devices;
};

// Public: Starts the Robot working.
//
// Starts the connections, devices, and work.
//
// Returns the result of the work
Robot.prototype.start = function(callback) {
  if (this.running) {
    return this;
  }

  var mode = Utils.fetch(Config, "workMode", "async");

  var start = function() {
    if (mode === "async") {
      this.startWork();
    }
  }.bind(this);

  Async.series([
    this.startConnections,
    this.startDevices,
    start
  ], function(err, results) {
    if (!!err) {
      this.log("fatal", "An error occured while trying to start the robot:");
      this.log("fatal", err);

      this.halt(function() {
        if (_.isFunction(this.error)) {
          this.error.call(this, err);
        }

        if (this.listeners("error").length) {
          this.emit("error", err);
        }
      }.bind(this));
    }

    if (_.isFunction(callback)) {
      callback(err, results);
    }
  }.bind(this));

  return this;
};

// Public: Starts the Robot"s work and triggers a callback
//
// callback - callback function to be triggered
//
// Returns nothing
Robot.prototype.startWork = function() {
  this.log("info", "Working.");

  this.emit("ready", this);
  this.work.call(this, this);
  this.running = true;
};

// Public: Starts the Robot"s connections and triggers a callback
//
// callback - callback function to be triggered
//
// Returns nothing
Robot.prototype.startConnections = function(callback) {
  this.log("info", "Starting connections.");

  var starters = _.map(this.connections, function(conn, name) {
    this[name] = conn;

    return function(cb) {
      var str = "Starting connection '" + name + "'";

      if (conn.host) {
        str += " on host " + conn.host;
      } else if (conn.port) {
        str += " on port " + conn.port;
      }

      this.log("debug", str + ".");
      return conn.connect.call(conn, cb);
    }.bind(this);
  }, this);

  return Async.parallel(starters, callback);
};

// Public: Starts the Robot"s devices and triggers a callback
//
// callback - callback function to be triggered
//
// Returns nothing
Robot.prototype.startDevices = function(callback) {
  var log = this.log;

  log("info", "Starting devices.");

  var starters = _.map(this.devices, function(device, name) {
    this[name] = device;

    return function(cb) {
      var str = "Starting device '" + name + "'";

      if (device.pin) {
        str += " on pin " + device.pin;
      }

      log("debug", str + ".");
      return device.start.call(device, cb);
    };
  }, this);

  return Async.parallel(starters, callback);
};

// Public: Halts the Robot.
//
// Halts the devices, disconnects the connections.
//
// callback - callback to be triggered when the Robot is stopped
//
// Returns nothing
Robot.prototype.halt = function(callback) {
  callback = callback || function() {};

  if (!this.isRunning) {
    return callback();
  }

  var devices = _.pluck(this.devices, "halt"),
      connections = _.pluck(this.connections, "disconnect");

  try {
    Async.parallel(devices, function() {
      Async.parallel(connections, callback);
    });
  } catch (e) {
    var msg = "An error occured while attempting to safely halt the robot";
    this.log("error", msg);
    this.log("error", e.message);
  }

  this.running = false;
};

// Public: Returns basic info about the robot as a String
//
// Returns a String
Robot.prototype.toString = function() {
  return "[Robot name='" + this.name + "']";
};

Robot.prototype.log = function(level) {
  var args = Array.prototype.slice.call(arguments, 1);
  args.unshift("[" + this.name + "] -");
  Logger[level].apply(null, args);
};

Robot.prototype.performArraySetup = function(things, typeOfThing, arrayName) {
  var str = "Specifying ";
  str += arrayName;
  str += " as an array is deprecated. ";
  str += "It will be removed in 1.0.0.";

  this.log("warn", str);

  things.forEach(function(t, key) {
    var name = _.isString(key) === "string" ? key : t.name;
    this[typeOfThing](name, t);
  }, this);
};

Robot.prototype.deprecationWarning = function(kind) {
  var msg = "Specifying a single ";
  msg += kind;
  msg += " with the '";
  msg += kind;
  msg += "' key ";
  msg += "is deprecated. It will be removed in 1.0.0.";

  this.log("warn", msg);
};

}).call(this,require('_process'))
},{"./config":43,"./initializer":46,"./logger":49,"./utils":58,"./utils/helpers":59,"_process":77,"async":61,"events":68}],54:[function(require,module,exports){
/*
 * Loopback adaptor
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Adaptor = require("../adaptor"),
    Utils = require("../utils");

var Loopback;

module.exports = Loopback = function Loopback() {
  Loopback.__super__.constructor.apply(this, arguments);
};

Utils.subclass(Loopback, Adaptor);

Loopback.prototype.connect = function(callback) {
  callback();
};

Loopback.prototype.disconnect = function(callback) {
  callback();
};

Loopback.adaptors = ["loopback"];
Loopback.adaptor = function(opts) { return new Loopback(opts); };

},{"../adaptor":41,"../utils":58}],55:[function(require,module,exports){
/*
 * Ping driver
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Driver = require("../driver"),
    Utils = require("../utils");

var Ping = module.exports = function Ping() {
  Ping.__super__.constructor.apply(this, arguments);

  this.commands = {
    ping: this.ping
  };

  this.events = ["ping"];
};

Utils.subclass(Ping, Driver);

Ping.prototype.ping = function() {
  this.emit("ping", "ping");
  return "pong";
};

Ping.prototype.start = function(callback) {
  callback();
};

Ping.prototype.halt = function(callback) {
  callback();
};

Ping.drivers = ["ping"];
Ping.driver = function(opts) { return new Ping(opts); };

},{"../driver":45,"../utils":58}],56:[function(require,module,exports){
/*
 * Test adaptor
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Adaptor = require("../adaptor"),
    Utils = require("../utils");

var TestAdaptor;

module.exports = TestAdaptor = function TestAdaptor() {
  TestAdaptor.__super__.constructor.apply(this, arguments);
};

Utils.subclass(TestAdaptor, Adaptor);

TestAdaptor.adaptors = ["test"];
TestAdaptor.adaptor = function(opts) { return new TestAdaptor(opts); };

},{"../adaptor":41,"../utils":58}],57:[function(require,module,exports){
/*
 * Test driver
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Driver = require("../driver"),
    Utils = require("../utils");

var TestDriver;

module.exports = TestDriver = function TestDriver() {
  TestDriver.__super__.constructor.apply(this, arguments);
};

Utils.subclass(TestDriver, Driver);

TestDriver.drivers = ["test"];
TestDriver.driver = function(opts) { return new TestDriver(opts); };

},{"../driver":45,"../utils":58}],58:[function(require,module,exports){
(function (global){
/*
 * Cylon - Utils
 * cylonjs.com
 *
 * Copyright (c) 2013-2015 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var _ = require("./utils/helpers");

var monkeyPatches = require("./utils/monkey-patches");

var Utils = module.exports = {
  // Public: Alias to setInterval, combined with Number monkeypatches below to
  // create an artoo-like syntax.
  //
  // interval - interval to run action on
  // action - action to perform at interval
  //
  // Examples
  //
  //   every((5).seconds(), function() {
  //     console.log("Hello world (and again in 5 seconds)!");
  //   });
  //
  // Returns an interval
  every: function every(interval, action) {
    return setInterval(action, interval);
  },

  // Public: Alias to setTimeout, combined with Number monkeypatches below to
  // create an artoo-like syntax.
  //
  // interval - interval to run action on
  // action - action to perform at interval
  //
  // Examples
  //
  //   after((10).seconds(), function() {
  //     console.log("Hello world from ten seconds ago!");
  //   });
  //
  // Returns an interval
  after: function after(delay, action) {
    return setTimeout(action, delay);
  },

  // Public: Alias to the `every` function, but passing 0
  // Examples
  //
  //   constantly(function() {
  //     console.log("hello world (and again and again)!");
  //   });
  //
  // Returns an interval
  constantly: function constantly(action) {
    return every(0, action);
  },

  // Public: Sleep - do nothing for some duration of time.
  //
  // ms - number of ms to sleep for
  //
  // Examples
  //
  //   sleep((1).second());
  //
  // Returns a function
  sleep: function sleep(ms) {
    var start = Date.now(),
        i;

    while(Date.now() < start + ms) {
      i = 0;
    }
  },

  // Public: Function to use for class inheritance.
  // Based on CoffeeScript's implementation.
  //
  // Example
  //
  //    var Sphero = function Sphero() {};
  //
  //    subclass(Sphero, ParentClass);
  //
  //    // Sphero is now a subclass of Parent, and can access parent methods
  //    // through Sphero.__super__
  //
  // Returns subclass
  subclass: function subclass(child, parent) {
    var Ctor = function() {
      this.constructor = child;
    };

    for (var key in parent) {
      if (parent.hasOwnProperty(key)) {
        child[key] = parent[key];
      }
    }

    Ctor.prototype = parent.prototype;
    child.prototype = new Ctor();
    child.__super__ = parent.prototype;
    return child;
  },

  proxyFunctions: function proxyFunctions(source, target) {
    _.each(source, function(prop, key) {
      if (_.isFunction(prop) && !target[key]) {
        target[key] = prop.bind(source);
      }
    });
  },

  // Public: Proxies a list of methods from one object to another. It will not
  // overwrite existing methods unless told to.
  //
  // methods - array of functions to proxy
  // target  - object to proxy the functions to
  // base    - (optional) object that proxied functions will be declared on.
  //           Defaults to 'this'.
  // force   - (optional) boolean - whether or not to force method assignment
  //
  // Returns base
  proxyFunctionsToObject: function(methods, target, base, force) {
    if (base == null) {
      base = this;
    }

    force = force || false;

    methods.forEach(function(method) {
      if (_.isFunction(base[method]) && !force) {
        return;
      }

      base[method] = function() {
        return target[method].apply(target, arguments);
      };
    });

    return base;
  },

  // Public: Analogue to Ruby"s Hash#fetch method for looking up object
  // properties.
  //
  // obj - object to do property lookup on
  // property - string property name to attempt to look up
  // fallback - either:
  //    - a fallback value to return if `property` can"t be found
  //    - a function to be executed if `property` can"t be found. The function
  //    will be passed `property` as an argument.
  //
  //  Examples
  //
  //    var object = { property: "hello world" };
  //    fetch(object, "property");
  //    //=> "hello world"
  //
  //    fetch(object, "notaproperty", "default value");
  //    //=> "default value"
  //
  //    var notFound = function(prop) { return prop + " not found!" };
  //    fetch(object, "notaproperty", notFound)
  //    // "notaproperty not found!"
  //
  //    var badFallback = function(prop) { prop + " not found!" };
  //    fetch(object, "notaproperty", badFallback)
  //    // Error: no return value from provided callback function
  //
  //    fetch(object, "notaproperty");
  //    // Error: key not found: "notaproperty"
  //
  // Returns the value of obj[property], a fallback value, or the results of
  // running "fallback". If the property isn"t found, and "fallback" hasn"t been
  // provided, will throw an error.
  fetch: function(obj, property, fallback) {
    if (obj.hasOwnProperty(property)) {
      return obj[property];
    }

    if (fallback === void 0) {
      throw new Error("key not found: \"" + property + "\"");
    }

    if (_.isFunction(fallback)) {
      var value = fallback(property);

      if (value === void 0) {
        throw new Error("no return value from provided fallback function");
      }

      return value;
    }

    return fallback;
  },

  // Public: Given a name, and an array of existing names, returns a unique
  // name.
  //
  // name - name that"s colliding with existing names
  // arr - array of existing names
  //
  // Returns the new name as a string
  makeUnique: function(name, arr) {
    var newName;

    if (!~arr.indexOf(name)) {
      return name;
    }

    for (var n = 1; ; n++) {
      newName = name + "-" + n;
      if (!~arr.indexOf(newName)) {
        return newName;
      }
    }
  },

  // Public: Adds necessary utils to global namespace, along with base class
  // extensions.
  //
  // Examples
  //
  //    Number.prototype.seconds // undefined
  //    after                    // undefined
  //
  //    Utils.bootstrap();
  //
  //    Number.prototype.seconds // [function]
  //    (after === Utils.after)  // true
  //
  // Returns Cylon.Utils
  bootstrap: function bootstrap() {
    global.every = this.every;
    global.after = this.after;
    global.constantly = this.constantly;

    monkeyPatches.install();

    return this;
  }
};

Utils.bootstrap();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./utils/helpers":59,"./utils/monkey-patches":60}],59:[function(require,module,exports){
// A collection of useful helper functions, used internally but not exported
// with the rest of Cylon. 
"use strict";

var __slice = Array.prototype.slice;

var H = module.exports = {};

function identity(value) {
  return value;
}

function extend(base, source) {
  var isArray = Array.isArray(source);

  if (base == null) {
    base = isArray ? [] : {};
  }

  if (isArray) {
    source.forEach(function(e, i) {
      if (typeof base[i] === "undefined") {
        base[i] = e;
      } else if (typeof e === "object") {
        base[i] = extend(base[i], e);
      } else {
        if (!~base.indexOf(e)) {
          base.push(e);
        }
      }
    });
  } else {
    var key;

    for (key in source) {
      if (typeof source[key] !== "object" || !source[key]) {
        base[key] = source[key];
      } else {
        if (base[key]) {
          extend(base[key], source[key]);
        } else {
          base[key] = source[key];
        }
      }
    }
  }

  return base;
}

extend(H, {
  identity: identity,
  extend: extend
});

function kind(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}

function isA(type) {
  return function(thing) {
    return kind(thing) === type;
  };
}

extend(H, {
  isObject:      isA("Object"),
  isObjectLoose: function(thing) { return typeof thing === "object"; },
  isFunction:    isA("Function"),
  isArray:       isA("Array"),
  isString:      isA("String"),
  isNumber:      isA("Number"),
  isArguments:   isA("Arguments"),
  isUndefined:   isA("Undefined")
});

function iterate(thing, fn, thisVal) {
  if (H.isArray(thing)) {
    thing.forEach(fn, thisVal);
    return;
  }

  if (H.isObject(thing)) {
    for (var key in thing) {
      var value = thing[key];
      fn.call(thisVal, value, key);
    }
  }

  return [];
}

function pluck(collection, key) {
  var keys = [];

  iterate(collection, function(object) {
    if (H.isObject(object)) {
      if (H.isFunction(object[key])) {
        keys.push(object[key].bind(object));
      } else {
        keys.push(object[key]);
      }
    }
  });

  return keys;
}

function map(collection, fn, thisVal) {
  var vals = [];

  if (fn == null) {
    fn = identity;
  }

  iterate(collection, function(object, index) {
    vals.push(fn.call(thisVal, object, index));
  });

  return vals;
}

function invoke(collection, fn) {
  var args = __slice.call(arguments, 2),
      vals = [];

  iterate(collection, function(object) {
    if (H.isFunction(fn)) {
      vals.push(fn.apply(object, args));
      return;
    }

    vals.push(object[fn].apply(object, arguments));
  });

  return vals;
}

function reduce(collection, iteratee, accumulator, thisVal) {
  var isArray = H.isArray(collection);

  if (!isArray && !H.isObjectLoose(collection)) {
    return null;
  }

  if (iteratee == null) {
    iteratee = identity;
  }

  if (accumulator == null) {
    if (isArray) {
      accumulator = collection.shift();
    } else {
      for (var key in collection) {
        accumulator = collection[key];
        delete collection[key];
        break;
      }
    }
  }

  iterate(collection, function(object, key) {
    accumulator = iteratee.call(thisVal, accumulator, object, key);
  });

  return accumulator;
}

extend(H, {
  pluck: pluck,
  each: iterate,
  map: map,
  invoke: invoke,
  reduce: reduce
});

function arity(fn, n) {
  return function() {
    var args = __slice.call(arguments, 0, n);
    return fn.apply(null, args);
  };
}

function partial(fn) {
  var args = __slice.call(arguments, 1);

  return function() {
    return fn.apply(null, args.concat(__slice.call(arguments)));
  };
}

function partialRight(fn) {
  var args = __slice.call(arguments, 1);

  return function() {
    return fn.apply(null, __slice.call(arguments).concat(args));
  };
}

extend(H, {
  arity: arity,
  partial: partial,
  partialRight: partialRight
});

},{}],60:[function(require,module,exports){
"use strict";

var max = Math.max,
    min = Math.min;

module.exports.install = function() {
  // Public: Monkey-patches Number to have Rails-like //seconds() function.
  // Warning, due to the way the Javascript parser works, applying functions on
  // numbers is kind of weird. See examples for details.
  //
  // Examples
  //
  //   2.seconds()
  //   //=> SyntaxError: Unexpected token ILLEGAL
  //
  //   10..seconds()
  //   //=> 10000
  //
  //   (5).seconds()
  //   //=> 5000
  //   // This is the preferred way to represent numbers when calling these
  //   // methods on them
  //
  // Returns an integer representing time in milliseconds

  /**
   * Multiplies a number by 1000 to get time in milliseconds
   *
   * @example
   * (2).seconds(); //=> 2000
   * @return {Number} time in milliseconds
   */
  Number.prototype.seconds = function() {
    return this * 1000;
  };

  /**
   * Alias for Number.prototype.seconds
   *
   * @see Number.prototype.seconds
   * @example
   * (1).second(); //=> 1000
   * @return {Number} time in milliseconds
   */
  Number.prototype.second = Number.prototype.seconds;

  /**
   * Converts a number from a current scale to a 0 - 1 scale.
   *
   * @param {Number} start low point of scale to convert from
   * @param {Number} end high point of scale to convert from
   * @example
   * (5).fromScale(0, 10) //=> 0.5
   * @return {Number} the scaled value
   */
  Number.prototype.fromScale = function(start, end) {
    var val = (this - min(start, end)) / (max(start, end) - min(start, end));

    if (val > 1) {
      return 1;
    }

    if (val < 0){
      return 0;
    }

    return val;
  };

  /**
   * Converts a number from a 0 - 1 scale to the specified scale.
   *
   * @param {Number} start low point of scale to convert to
   * @param {Number} end high point of scale to convert to
   * @example
   * (0.5).toScale(0, 10) //=> 5
   * @return {Number} the scaled value
   */
  Number.prototype.toScale = function(start, end) {
    var i = this * (max(start, end) - min(start, end)) + min(start, end);

    if (i < start) {
      return start;
    }

    if (i > end) {
      return end;
    }

    return i;
  };
};

},{}],61:[function(require,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };
    
    async.priorityQueue = function (worker, concurrency) {
        
        function _compareTasks(a, b){
          return a.priority - b.priority;
        };
        
        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }
        
        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };
              
              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }
        
        // Start with a normal queue
        var q = async.queue(worker, concurrency);
        
        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };
        
        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'))
},{"_process":77}],62:[function(require,module,exports){

},{}],63:[function(require,module,exports){
arguments[4][62][0].apply(exports,arguments)
},{"dup":62}],64:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding) {
  var self = this
  if (!(self instanceof Buffer)) return new Buffer(subject, encoding)

  var type = typeof subject
  var length

  if (type === 'number') {
    length = +subject
  } else if (type === 'string') {
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) {
    // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data)) subject = subject.data
    length = +subject.length
  } else {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (length > kMaxLength) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum size: 0x' +
      kMaxLength.toString(16) + ' bytes')
  }

  if (length < 0) length = 0
  else length >>>= 0 // coerce to uint32

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    self = Buffer._augment(new Uint8Array(length)) // eslint-disable-line consistent-this
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    self.length = length
    self._isBuffer = true
  }

  var i
  if (Buffer.TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    self._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++) {
        self[i] = subject.readUInt8(i)
      }
    } else {
      for (i = 0; i < length; i++) {
        self[i] = ((subject[i] % 256) + 256) % 256
      }
    }
  } else if (type === 'string') {
    self.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer.TYPED_ARRAY_SUPPORT) {
    for (i = 0; i < length; i++) {
      self[i] = 0
    }
  }

  if (length > 0 && length <= Buffer.poolSize) self.parent = rootParent

  return self
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, totalLength) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.byteLength = function byteLength (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    case 'hex':
      ret = str.length >>> 1
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    default:
      ret = str.length
  }
  return ret
}

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function toString (encoding, start, end) {
  var loweredCase = false

  start = start >>> 0
  end = end === undefined || end === Infinity ? this.length : end >>> 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0

  if (length < 0 || offset < 0 || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new TypeError('Unknown encoding: ' + encoding)
  }
  return ret
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) >>> 0 & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) >>> 0 & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(
      this, value, offset, byteLength,
      Math.pow(2, 8 * byteLength - 1) - 1,
      -Math.pow(2, 8 * byteLength - 1)
    )
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkInt(
      this, value, offset, byteLength,
      Math.pow(2, 8 * byteLength - 1) - 1,
      -Math.pow(2, 8 * byteLength - 1)
    )
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, target_start, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (target_start >= target.length) target_start = target.length
  if (!target_start) target_start = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (target_start < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - target_start < end - start) {
    end = target.length - target_start + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":65,"ieee754":66,"is-array":67}],65:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],66:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],67:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],68:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],69:[function(require,module,exports){
var http = module.exports;
var EventEmitter = require('events').EventEmitter;
var Request = require('./lib/request');
var url = require('url')

http.request = function (params, cb) {
    if (typeof params === 'string') {
        params = url.parse(params)
    }
    if (!params) params = {};
    if (!params.host && !params.port) {
        params.port = parseInt(window.location.port, 10);
    }
    if (!params.host && params.hostname) {
        params.host = params.hostname;
    }

    if (!params.protocol) {
        if (params.scheme) {
            params.protocol = params.scheme + ':';
        } else {
            params.protocol = window.location.protocol;
        }
    }

    if (!params.host) {
        params.host = window.location.hostname || window.location.host;
    }
    if (/:/.test(params.host)) {
        if (!params.port) {
            params.port = params.host.split(':')[1];
        }
        params.host = params.host.split(':')[0];
    }
    if (!params.port) params.port = params.protocol == 'https:' ? 443 : 80;
    
    var req = new Request(new xhrHttp, params);
    if (cb) req.on('response', cb);
    return req;
};

http.get = function (params, cb) {
    params.method = 'GET';
    var req = http.request(params, cb);
    req.end();
    return req;
};

http.Agent = function () {};
http.Agent.defaultMaxSockets = 4;

var xhrHttp = (function () {
    if (typeof window === 'undefined') {
        throw new Error('no window object present');
    }
    else if (window.XMLHttpRequest) {
        return window.XMLHttpRequest;
    }
    else if (window.ActiveXObject) {
        var axs = [
            'Msxml2.XMLHTTP.6.0',
            'Msxml2.XMLHTTP.3.0',
            'Microsoft.XMLHTTP'
        ];
        for (var i = 0; i < axs.length; i++) {
            try {
                var ax = new(window.ActiveXObject)(axs[i]);
                return function () {
                    if (ax) {
                        var ax_ = ax;
                        ax = null;
                        return ax_;
                    }
                    else {
                        return new(window.ActiveXObject)(axs[i]);
                    }
                };
            }
            catch (e) {}
        }
        throw new Error('ajax not supported in this browser')
    }
    else {
        throw new Error('ajax not supported in this browser');
    }
})();

http.STATUS_CODES = {
    100 : 'Continue',
    101 : 'Switching Protocols',
    102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
    200 : 'OK',
    201 : 'Created',
    202 : 'Accepted',
    203 : 'Non-Authoritative Information',
    204 : 'No Content',
    205 : 'Reset Content',
    206 : 'Partial Content',
    207 : 'Multi-Status',               // RFC 4918
    300 : 'Multiple Choices',
    301 : 'Moved Permanently',
    302 : 'Moved Temporarily',
    303 : 'See Other',
    304 : 'Not Modified',
    305 : 'Use Proxy',
    307 : 'Temporary Redirect',
    400 : 'Bad Request',
    401 : 'Unauthorized',
    402 : 'Payment Required',
    403 : 'Forbidden',
    404 : 'Not Found',
    405 : 'Method Not Allowed',
    406 : 'Not Acceptable',
    407 : 'Proxy Authentication Required',
    408 : 'Request Time-out',
    409 : 'Conflict',
    410 : 'Gone',
    411 : 'Length Required',
    412 : 'Precondition Failed',
    413 : 'Request Entity Too Large',
    414 : 'Request-URI Too Large',
    415 : 'Unsupported Media Type',
    416 : 'Requested Range Not Satisfiable',
    417 : 'Expectation Failed',
    418 : 'I\'m a teapot',              // RFC 2324
    422 : 'Unprocessable Entity',       // RFC 4918
    423 : 'Locked',                     // RFC 4918
    424 : 'Failed Dependency',          // RFC 4918
    425 : 'Unordered Collection',       // RFC 4918
    426 : 'Upgrade Required',           // RFC 2817
    428 : 'Precondition Required',      // RFC 6585
    429 : 'Too Many Requests',          // RFC 6585
    431 : 'Request Header Fields Too Large',// RFC 6585
    500 : 'Internal Server Error',
    501 : 'Not Implemented',
    502 : 'Bad Gateway',
    503 : 'Service Unavailable',
    504 : 'Gateway Time-out',
    505 : 'HTTP Version Not Supported',
    506 : 'Variant Also Negotiates',    // RFC 2295
    507 : 'Insufficient Storage',       // RFC 4918
    509 : 'Bandwidth Limit Exceeded',
    510 : 'Not Extended',               // RFC 2774
    511 : 'Network Authentication Required' // RFC 6585
};
},{"./lib/request":70,"events":68,"url":95}],70:[function(require,module,exports){
var Stream = require('stream');
var Response = require('./response');
var Base64 = require('Base64');
var inherits = require('inherits');

var Request = module.exports = function (xhr, params) {
    var self = this;
    self.writable = true;
    self.xhr = xhr;
    self.body = [];
    
    self.uri = (params.protocol || 'http:') + '//'
        + params.host
        + (params.port ? ':' + params.port : '')
        + (params.path || '/')
    ;
    
    if (typeof params.withCredentials === 'undefined') {
        params.withCredentials = true;
    }

    try { xhr.withCredentials = params.withCredentials }
    catch (e) {}
    
    if (params.responseType) try { xhr.responseType = params.responseType }
    catch (e) {}
    
    xhr.open(
        params.method || 'GET',
        self.uri,
        true
    );

    xhr.onerror = function(event) {
        self.emit('error', new Error('Network error'));
    };

    self._headers = {};
    
    if (params.headers) {
        var keys = objectKeys(params.headers);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (!self.isSafeRequestHeader(key)) continue;
            var value = params.headers[key];
            self.setHeader(key, value);
        }
    }
    
    if (params.auth) {
        //basic auth
        this.setHeader('Authorization', 'Basic ' + Base64.btoa(params.auth));
    }

    var res = new Response;
    res.on('close', function () {
        self.emit('close');
    });
    
    res.on('ready', function () {
        self.emit('response', res);
    });

    res.on('error', function (err) {
        self.emit('error', err);
    });
    
    xhr.onreadystatechange = function () {
        // Fix for IE9 bug
        // SCRIPT575: Could not complete the operation due to error c00c023f
        // It happens when a request is aborted, calling the success callback anyway with readyState === 4
        if (xhr.__aborted) return;
        res.handle(xhr);
    };
};

inherits(Request, Stream);

Request.prototype.setHeader = function (key, value) {
    this._headers[key.toLowerCase()] = value
};

Request.prototype.getHeader = function (key) {
    return this._headers[key.toLowerCase()]
};

Request.prototype.removeHeader = function (key) {
    delete this._headers[key.toLowerCase()]
};

Request.prototype.write = function (s) {
    this.body.push(s);
};

Request.prototype.destroy = function (s) {
    this.xhr.__aborted = true;
    this.xhr.abort();
    this.emit('close');
};

Request.prototype.end = function (s) {
    if (s !== undefined) this.body.push(s);

    var keys = objectKeys(this._headers);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = this._headers[key];
        if (isArray(value)) {
            for (var j = 0; j < value.length; j++) {
                this.xhr.setRequestHeader(key, value[j]);
            }
        }
        else this.xhr.setRequestHeader(key, value)
    }

    if (this.body.length === 0) {
        this.xhr.send('');
    }
    else if (typeof this.body[0] === 'string') {
        this.xhr.send(this.body.join(''));
    }
    else if (isArray(this.body[0])) {
        var body = [];
        for (var i = 0; i < this.body.length; i++) {
            body.push.apply(body, this.body[i]);
        }
        this.xhr.send(body);
    }
    else if (/Array/.test(Object.prototype.toString.call(this.body[0]))) {
        var len = 0;
        for (var i = 0; i < this.body.length; i++) {
            len += this.body[i].length;
        }
        var body = new(this.body[0].constructor)(len);
        var k = 0;
        
        for (var i = 0; i < this.body.length; i++) {
            var b = this.body[i];
            for (var j = 0; j < b.length; j++) {
                body[k++] = b[j];
            }
        }
        this.xhr.send(body);
    }
    else if (isXHR2Compatible(this.body[0])) {
        this.xhr.send(this.body[0]);
    }
    else {
        var body = '';
        for (var i = 0; i < this.body.length; i++) {
            body += this.body[i].toString();
        }
        this.xhr.send(body);
    }
};

// Taken from http://dxr.mozilla.org/mozilla/mozilla-central/content/base/src/nsXMLHttpRequest.cpp.html
Request.unsafeHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "content-transfer-encoding",
    "date",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "user-agent",
    "via"
];

Request.prototype.isSafeRequestHeader = function (headerName) {
    if (!headerName) return false;
    return indexOf(Request.unsafeHeaders, headerName.toLowerCase()) === -1;
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var indexOf = function (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (xs[i] === x) return i;
    }
    return -1;
};

var isXHR2Compatible = function (obj) {
    if (typeof Blob !== 'undefined' && obj instanceof Blob) return true;
    if (typeof ArrayBuffer !== 'undefined' && obj instanceof ArrayBuffer) return true;
    if (typeof FormData !== 'undefined' && obj instanceof FormData) return true;
};

},{"./response":71,"Base64":72,"inherits":74,"stream":93}],71:[function(require,module,exports){
var Stream = require('stream');
var util = require('util');

var Response = module.exports = function (res) {
    this.offset = 0;
    this.readable = true;
};

util.inherits(Response, Stream);

var capable = {
    streaming : true,
    status2 : true
};

function parseHeaders (res) {
    var lines = res.getAllResponseHeaders().split(/\r?\n/);
    var headers = {};
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === '') continue;
        
        var m = line.match(/^([^:]+):\s*(.*)/);
        if (m) {
            var key = m[1].toLowerCase(), value = m[2];
            
            if (headers[key] !== undefined) {
            
                if (isArray(headers[key])) {
                    headers[key].push(value);
                }
                else {
                    headers[key] = [ headers[key], value ];
                }
            }
            else {
                headers[key] = value;
            }
        }
        else {
            headers[line] = true;
        }
    }
    return headers;
}

Response.prototype.getResponse = function (xhr) {
    var respType = String(xhr.responseType).toLowerCase();
    if (respType === 'blob') return xhr.responseBlob || xhr.response;
    if (respType === 'arraybuffer') return xhr.response;
    return xhr.responseText;
}

Response.prototype.getHeader = function (key) {
    return this.headers[key.toLowerCase()];
};

Response.prototype.handle = function (res) {
    if (res.readyState === 2 && capable.status2) {
        try {
            this.statusCode = res.status;
            this.headers = parseHeaders(res);
        }
        catch (err) {
            capable.status2 = false;
        }
        
        if (capable.status2) {
            this.emit('ready');
        }
    }
    else if (capable.streaming && res.readyState === 3) {
        try {
            if (!this.statusCode) {
                this.statusCode = res.status;
                this.headers = parseHeaders(res);
                this.emit('ready');
            }
        }
        catch (err) {}
        
        try {
            this._emitData(res);
        }
        catch (err) {
            capable.streaming = false;
        }
    }
    else if (res.readyState === 4) {
        if (!this.statusCode) {
            this.statusCode = res.status;
            this.emit('ready');
        }
        this._emitData(res);
        
        if (res.error) {
            this.emit('error', this.getResponse(res));
        }
        else this.emit('end');
        
        this.emit('close');
    }
};

Response.prototype._emitData = function (res) {
    var respBody = this.getResponse(res);
    if (respBody.toString().match(/ArrayBuffer/)) {
        this.emit('data', new Uint8Array(respBody, this.offset));
        this.offset = respBody.byteLength;
        return;
    }
    if (respBody.length > this.offset) {
        this.emit('data', respBody.slice(this.offset));
        this.offset = respBody.length;
    }
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

},{"stream":93,"util":97}],72:[function(require,module,exports){
;(function () {

  var object = typeof exports != 'undefined' ? exports : this; // #8: web workers
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  function InvalidCharacterError(message) {
    this.message = message;
  }
  InvalidCharacterError.prototype = new Error;
  InvalidCharacterError.prototype.name = 'InvalidCharacterError';

  // encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  object.btoa || (
  object.btoa = function (input) {
    for (
      // initialize result and counter
      var block, charCode, idx = 0, map = chars, output = '';
      // if the next input index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
      input.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = input.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) {
        throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  });

  // decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  object.atob || (
  object.atob = function (input) {
    input = input.replace(/=+$/, '');
    if (input.length % 4 == 1) {
      throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = input.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  });

}());

},{}],73:[function(require,module,exports){
var http = require('http');

var https = module.exports;

for (var key in http) {
    if (http.hasOwnProperty(key)) https[key] = http[key];
};

https.request = function (params, cb) {
    if (!params) params = {};
    params.scheme = 'https';
    return http.request.call(this, params, cb);
}

},{"http":69}],74:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],75:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],76:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":77}],77:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],78:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],79:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],80:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],81:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":79,"./encode":80}],82:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":83}],83:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'))
},{"./_stream_readable":85,"./_stream_writable":87,"_process":77,"core-util-is":88,"inherits":74}],84:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":86,"core-util-is":88,"inherits":74}],85:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;


/*<replacement>*/
var debug = require('util');
if (debug && debug.debuglog) {
  debug = debug.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/


util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  var Duplex = require('./_stream_duplex');

  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (util.isString(chunk) && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (util.isNullOrUndefined(chunk)) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      if (!addToFront)
        state.reading = false;

      // if we want the data now, just emit it.
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit('data', chunk);
        stream.read(0);
      } else {
        // update the buffer info.
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);

        if (state.needReadable)
          emitReadable(stream);
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || util.isNull(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (!util.isNumber(n) || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);
    else
      emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (util.isNull(ret)) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0)
    endReadable(this);

  if (!util.isNull(ret))
    this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      process.nextTick(function() {
        emitReadable_(stream);
      });
    else
      emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain &&
        (!dest._writableState || dest._writableState.needDrain))
      ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      debug('false write response, pause',
            src._readableState.awaitDrain);
      src._readableState.awaitDrain++;
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain)
      state.awaitDrain--;
    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        var self = this;
        process.nextTick(function() {
          debug('readable nexttick read 0');
          self.read(0);
        });
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    if (!state.reading) {
      debug('resume read 0');
      this.read(0);
    }
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(function() {
      resume_(stream, state);
    });
  }
}

function resume_(stream, state) {
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}

Readable.prototype.pause = function() {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    debug('wrapped data');
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))
},{"./_stream_duplex":83,"_process":77,"buffer":64,"core-util-is":88,"events":68,"inherits":74,"isarray":75,"stream":93,"string_decoder/":94,"util":63}],86:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (!util.isNullOrUndefined(data))
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('prefinish', function() {
    if (util.isFunction(this._flush))
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":83,"core-util-is":88,"inherits":74}],87:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.writableObjectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (util.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (!util.isFunction(cb))
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function() {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function() {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing &&
        !state.corked &&
        !state.finished &&
        !state.bufferProcessing &&
        state.buffer.length)
      clearBuffer(this, state);
  }
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      util.isString(chunk)) {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (util.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing || state.corked)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, false, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev)
    stream._writev(chunk, state.onwrite);
  else
    stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      state.pendingcb--;
      cb(er);
    });
  else {
    state.pendingcb--;
    cb(er);
  }

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished &&
        !state.corked &&
        !state.bufferProcessing &&
        state.buffer.length) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  if (stream._writev && state.buffer.length > 1) {
    // Fast case, write everything using _writev()
    var cbs = [];
    for (var c = 0; c < state.buffer.length; c++)
      cbs.push(state.buffer[c].callback);

    // count the one we are adding, as well.
    // TODO(isaacs) clean this up
    state.pendingcb++;
    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
      for (var i = 0; i < cbs.length; i++) {
        state.pendingcb--;
        cbs[i](err);
      }
    });

    // Clear buffer
    state.buffer = [];
  } else {
    // Slow case, write chunks one-by-one
    for (var c = 0; c < state.buffer.length; c++) {
      var entry = state.buffer[c];
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);

      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        c++;
        break;
      }
    }

    if (c < state.buffer.length)
      state.buffer = state.buffer.slice(c);
    else
      state.buffer.length = 0;
  }

  state.bufferProcessing = false;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));

};

Writable.prototype._writev = null;

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (util.isFunction(chunk)) {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (!util.isNullOrUndefined(chunk))
    this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else
      prefinish(stream, state);
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))
},{"./_stream_duplex":83,"_process":77,"buffer":64,"core-util-is":88,"inherits":74,"stream":93}],88:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)
},{"buffer":64}],89:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":84}],90:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = require('stream');
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":83,"./lib/_stream_passthrough.js":84,"./lib/_stream_readable.js":85,"./lib/_stream_transform.js":86,"./lib/_stream_writable.js":87,"stream":93}],91:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":86}],92:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":87}],93:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":68,"inherits":74,"readable-stream/duplex.js":82,"readable-stream/passthrough.js":89,"readable-stream/readable.js":90,"readable-stream/transform.js":91,"readable-stream/writable.js":92}],94:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":64}],95:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":78,"querystring":81}],96:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],97:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":96,"_process":77,"inherits":74}],"cylon-gpio":[function(require,module,exports){
/*
 * cylon-gpio
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Drivers = {
  "analog-sensor": require("./analog-sensor"),
  "analogSensor": require("./analog-sensor"),
  "button": require("./button"),
  "continuous-servo": require("./continuous-servo"),
  "led": require("./led"),
  "makey-button": require("./makey-button"),
  "maxbotix": require("./maxbotix"),
  "motor": require("./motor"),
  "servo": require("./servo"),
  "ir-range-sensor": require("./ir-range-sensor"),
  "direct-pin": require("./direct-pin"),
  "rgb-led": require("./rgb-led")
};

module.exports = {
  drivers: Object.keys(Drivers),

  driver: function(opts) {
    for (var d in Drivers) {
      if (opts.driver === d) {
        return new Drivers[d](opts);
      }
    }

    return null;
  }
};

},{"./analog-sensor":3,"./button":4,"./continuous-servo":5,"./direct-pin":6,"./ir-range-sensor":7,"./led":8,"./makey-button":9,"./maxbotix":10,"./motor":11,"./rgb-led":12,"./servo":13}],"cylon-spark":[function(require,module,exports){
/*
 * cylon-spark
 * http://cylonjs.com
 *
 * Copyright (c) 2013-2014 The Hybrid Group
 * Licensed under the Apache 2.0 license.
*/

"use strict";

var Spark = require("./spark-adaptor"),
    Driver = require("./spark-driver.js"),
    VoodooSpark = require("./voodoospark-adaptor");

module.exports = {
  adaptors: ["spark", "voodoospark"],
  drivers: ["spark"],
  dependencies: ["cylon-gpio"],

  adaptor: function(args) {
    if (args.adaptor === "spark") {
      return new Spark(args);
    } else if (args.adaptor === "voodoospark") {
      return new VoodooSpark(args);
    }
  },

  driver: function(args) {
    if (args.driver === "spark") {
      return new Driver(args);
    }
  }
};

},{"./spark-adaptor":14,"./spark-driver.js":15,"./voodoospark-adaptor":16}]},{},[1]);
