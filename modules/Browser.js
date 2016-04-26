/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["Browser"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

var Browser = {
  setTimeout: function setTimeout(f, i) {
    let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.initWithCallback(f, i, timer.TYPE_ONE_SHOT);
    return timer;
  },

  clearTimeout: function clearTimeout(timer) {
    timer.cancel();
  },

  setInterval: function setInterval(f, i) {
    let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.initWithCallback(f, i, timer.TYPE_REPEATING_SLACK);
    return timer;
  },

  clearInterval: function clearInterval(timer) {
    timer.cancel();
  }
};
