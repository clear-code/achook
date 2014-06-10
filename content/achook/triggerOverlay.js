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
  if ((preferences.get(PreferenceNames.disableGenericWizard) ||
       preferences.get(PreferenceNames.disableNewEmailAccountCreation)) &&
      preferences.get(mailProvisionerPref)) {
    preferences.set(mailProvisionerPref, false);
  }
}, false);

window.addEventListener("load", function ACHook_triggerOverlay_init() {
  window.removeEventListener("load", ACHook_triggerOverlay_init, false);

  const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

  const { StaticConfigManager } = Cu.import("resource://achook-modules/StaticConfig.js", {});
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

  var newAccountItems = [
        document.getElementById("newMailAccountMenuItem"), // main window, menu bar
        document.getElementById("appmenu_newMailAccountMenuItem"), // main window, application menu
        document.getElementById("accountActionsAddMailAccount"), // account settings window
        document.querySelector("#CreateAccount .acctCentralText.acctCentralLinkText:not(.achookNewCustomAccountItem)") // account central
      ];
  var newCreateAccountItems = [
        document.getElementById("newCreateEmailAccountMenuItem"), // menu bar
        document.getElementById("appmenu_newCreateEmailAccountMenuItem") // application menu
      ];
  var staticConfigItems = Array.slice(document.querySelectorAll(".achookNewCustomAccountItem"), 0);

  if (preferences.get(PreferenceNames.disableGenericWizard) &&
      StaticConfigManager.configs.length == 1) {
    // Hide the custom menu item, because the default wizard is always overridden.
    staticConfigItems.forEach(function(item) {
      if (item) item.setAttribute("hidden", true);
    });
    // Use the menu item for the generic wizard to start the custom wizard (but don't override the access key!)
    let config = StaticConfigManager.defaultConfig;
    newAccountItems.forEach(function(item) {
      if (!item) return;
      if (item.localName == "label") {
        item.setAttribute("value", config.label);
      } else {
        item.setAttribute("label", config.label);
      }
    });
  } else {
    staticConfigItems.forEach(function(item) {
      item.removeAttribute("hidden");
    });
  }

  if (preferences.get(PreferenceNames.disableGenericWizard) ||
      preferences.get(PreferenceNames.disableNewEmailAccountCreation)) {
    newCreateAccountItems.forEach(function(item) {
      if (item) item.setAttribute("hidden", true);
    });
  } else {
    newCreateAccountItems.forEach(function(item) {
      if (item) item.removeAttribute("hidden");
    });
  }

  if (!StaticConfigManager.anyAvailable) {
    Application.console.log("achook: static config is not used. "+StaticConfigManager.configs.map(function(aConfig) {
                              return {
                                aConfig.name + ".available" : aConfig.available,
                                aConfig.name + ".domain"    : aConfig.domain,
                                aConfig.name + ".source"    : !!aConfig.source,
                                aConfig.name + ".xml"       : !!aConfig.xml,
                              };
                            }).toSource());
  }
}, false);

function AchookNewCustomMailAccount(aConfigName, aMsgWindow) {
  var { StaticConfigManager } = Cu.import("resource://achook-modules/StaticConfig.js", {});
  var config = StaticConfigManager.namedConfigs[aConfigName];
  if (!aMsgWindow) {
    let mailSession = Components.classes["@mozilla.org/messenger/services/session;1"]
          .getService(Components.interfaces.nsIMsgMailSession);
    aMsgWindow = mailSession.topmostMsgWindow;
  }
  NewMailAccount(aMsgWindow, null, { __achook__staticConfig : config });
}
