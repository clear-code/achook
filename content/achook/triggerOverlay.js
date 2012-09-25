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

  var plainItem = document.getElementById("newMailAccountMenuItem");
  var staticConfigItem = document.getElementById("newMailAccountMenuItem_achook_staticConfig");

  if ((StaticConfig.available || StaticConfig.domain) && !plainItem.hidden) {
    if (preferences.get(PreferenceNames.disableGenericWizard)) {
      // Hide the custom menu item, because the default wizard is always overridden.
      staticConfigItem.setAttribute("hidden", true);
    } else {
      let label = Messages.getLocalized("newMailAccountMenuItem.label");
      let accesskey = Messages.getLocalized("newMailAccountMenuItem.accesskey");
      staticConfigItem.setAttribute("label", label.replace(/%domain%/gi, StaticConfig.domain));
      staticConfigItem.setAttribute("accesskey", accesskey.replace(/%domain%/gi, StaticConfig.domain).charAt(0));
      staticConfigItem.removeAttribute("hidden");
    }
  } else {
    Application.console.log("achook: static config is not used. "+{
                              "StaticConfig.available" : StaticConfig.available,
                              "StaticConfig.domain"    : StaticConfig.domain,
                              "plainItem.hidden"       : plainItem.hidden
                            }.toSource());
    staticConfigItem.setAttribute("hidden", true);
  }
}, false);

// initial wizard should use static config
if ("AutoConfigWizard" in window) {
  eval("window.AutoConfigWizard = "+window.AutoConfigWizard.toSource().replace(
    /(NewMailAccount\([^;]+okCallback)(\))/g,
    "$1, { __achook__staticConfig : true }$2"
  ));
} else {
  Application.console.log("achook: AutoConfigWizard is not defined. I don't override the initial wizard.");
}
