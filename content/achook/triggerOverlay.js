/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

window.addEventListener("DOMContentLoaded", function ACHook_triggerOverlay_pre_init() {
  window.removeEventListener("DOMContentLoaded", ACHook_triggerOverlay_pre_init, false);

  const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
  const { Preferences } = Cu.import('resource://achook-modules/Preferences.js', {});
  const { PreferenceNames } = Cu.import('resource://achook-modules/PreferenceNames.js', {});
  const preferences = new Preferences("");

  const mailProvisionerPref = "mail.provider.enabled";
  if (preferences.get(PreferenceNames.disableGenericWizard) &&
      preferences.get(mailProvisionerPref)) {
    preferences.set(mailProvisionerPref, false);
  }
}, false);

window.addEventListener("load", function ACHook_triggerOverlay_init() {
  window.removeEventListener("load", ACHook_triggerOverlay_init, false);

  const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

  const { StaticConfig } = Cu.import("resource://achook-modules/StaticConfig.js", {});
  const { Preferences } = Cu.import('resource://achook-modules/Preferences.js', {});
  const { PreferenceNames } = Cu.import('resource://achook-modules/PreferenceNames.js', {});

  const preferences = new Preferences("");

  const Messages = {
    _messages : new Preferences("extensions.achook."),
    getLocalized: function (key, defaultValue) {
      if (this._messages.has(key + ".override"))
        key += ".override";
      return this._messages.getLocalized(key, defaultValue);
    }
  };

  var newAccountItem = document.getElementById("newMailAccountMenuItem") || // main window
                       document.getElementById("accountActionsAddMailAccount"); // account settings window
  var newCreateAccountItem = document.getElementById("newCreateEmailAccountMenuItem");
  var staticConfigItem = document.getElementById("newMailAccountMenuItem_achook_staticConfig");

  let label = Messages.getLocalized("newMailAccountMenuItem.label");
  label = label.replace(/%domain%/gi, StaticConfig.domain);
  let accesskey = Messages.getLocalized("newMailAccountMenuItem.accesskey");
  accesskey = accesskey.replace(/%domain%/gi, StaticConfig.domain).charAt(0);

  if (preferences.get(PreferenceNames.disableGenericWizard)) {
    // Hide the custom menu item, because the default wizard is always overridden.
    staticConfigItem.setAttribute("hidden", true);
    if (newCreateAccountItem)
      newCreateAccountItem.setAttribute("hidden", true);
    // Use the menu item for the generic wizard to start the custom wizard (but don't override the access key!)
    newAccountItem.setAttribute("label", label);
  } else {
    staticConfigItem.setAttribute("label", label);
    staticConfigItem.setAttribute("accesskey", accesskey);
    staticConfigItem.removeAttribute("hidden");
    if (newCreateAccountItem)
      newCreateAccountItem.removeAttribute("hidden");
  }

  if (!StaticConfig.available) {
    Application.console.log("achook: static config is not used. "+{
                              "StaticConfig.available" : StaticConfig.available,
                              "StaticConfig.domain"    : StaticConfig.domain,
                            }.toSource());
  }
}, false);
