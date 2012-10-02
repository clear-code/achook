/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["StringBundle"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
const { XPCOMUtils } = Cu.import("resource://gre/modules/XPCOMUtils.jsm", {});
const { Services } = Cu.import("resource://achook-modules/Services.js", {});

var StringBundle = {};

function defineLazyStringBundle(target, name, path) {
  target.__defineGetter__(name, function () {
    var privateName = "_" + name;
    if (!target[privateName])
      target[privateName] = Services.sBundleService.createBundle(path);
    return target[privateName];
  });
}

defineLazyStringBundle(StringBundle, "achook", "chrome://achook/locale/achook.properties");
