/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["StaticConfig", "StaticConfigManager"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "Application", function() {
  return Cc["@mozilla.org/steel/application;1"]
           .getService(Ci.steelIApplication);
});

XPCOMUtils.defineLazyGetter(this, "Util", function() {
  const { Util } = Cu.import("resource://achook-modules/Util.js", {});
  return Util;
});
XPCOMUtils.defineLazyGetter(this, "Preferences", function() {
  const { Preferences } = Cu.import("resource://achook-modules/Preferences.js", {});
  return Preferences;
});
XPCOMUtils.defineLazyGetter(this, "PreferenceNames", function() {
  const { PreferenceNames } = Cu.import("resource://achook-modules/PreferenceNames.js", {});
  return PreferenceNames;
});

XPCOMUtils.defineLazyGetter(this, "preferences", function() {
  return new Preferences("");
});


function StaticConfig(aName) {
  this._name = aName || "";
}
StaticConfig.prototype = {
  EVENT_TYPE_STATIC_CONFIG_READY : "nsDOMAcHookStaticConfigReady",
  EVENT_TYPE_STATIC_DOMAIN_READY : "nsDOMAcHookStaticDomainReady",

  get name() {
    return this._name || "default";
  },

  get prefPrefix() {
    var namePart = this._name ? (this._name + ".") : "" ;
    return PreferenceNames.staticConfigRoot + namePart;
  },

  get source() {
    return preferences.get(this.prefPrefix + "source");
  },
  get disableGenericWizard() {
    return preferences.get(PreferenceNames.disableGenericWizard);
  },
  get available() {
    return !!this.source && !!this.xml;
  },
  get strictlyAvailable() {
    return !!this.source && !!this.xmlFromSource;
  },

  get xml() {
    return this._lastXML || this.xmlFromSource;
  },
  get xmlFromSource() {
    return this._lastXML = this._loadXML();
  },
  _lastXML : null,
  _loadXML : function StaticConfig_loadXML() {
    try {
      var uri = Util.makeURIFromSpec(this.source);
      var contents = Util.readFromURI(uri, "UTF-8");
      contents = contents.replace(/<\?xml[^>]*\?>|<!--.*\?-->/g, "");
      return contents;
    } catch(e) {
      Components.utils.reportError(e);
      return null;
    }
  },

  get domain() {
    return this._lastDomain || this.domainFromSource;
  },
  get domainFromSource() {
    return this._lastDomain = this._loadDomain();
  },
  _lastDomain : null,
  _loadDomain : function StaticConfig_loadDomain() {
    var domain = preferences.get(this.prefPrefix + "domain");
    if (!domain) {
      try {
        domain = this.xml.emailProvider.domain.text();
      } catch (e) {
        Components.utils.reportError(e);
      }
    }
    return domain;
  },

  get useSeparatedUsername() {
    var shouldUse = preferences.get(this.prefPrefix + "separatedUsername");
    if (shouldUse === null) {
      try {
        shouldUse = this.xml.emailProvider.incomingServer.username.text() != "%EMAILLOCALPART%";
      } catch (e) {
        Components.utils.reportError(e);
      }
    }
    return shouldUse;
  }
};


var StaticConfigManager = {
  init: function() {
    this.configs = [];
    this.namedConfigs = [];

    var entries = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService)
                    .QueryInterface(Ci.nsIPrefBranch)
                    .QueryInterface(Ci.nsIPrefBranch2)
                    .getChildList(PreferenceNames.staticConfigRoot, []);
    var domainPrefMatcher = new RegExp("^" + PreferenceNames.staticConfigRoot.replace(/\./g, "\\.") + "(.*)\.domain$")
    entries.forEach(function(aKey) {
      var matched = aKey.match(domainPrefMatcher);
      if (!matched)
        return;

      var name = matched[1];
      var config = new StaticConfig(name);
      this.configs.push(config);
      this.namedConfigs[name] = config;
    }, this);

    var defaultConfig = new StaticConfig();
    if (defaultConfig.domain && !("default" in this.namedConfigs)) {
      this.configs.unshift(defaultConfig);
      this.namedConfigs[defaultConfig.name] = defaultConfig;
    }
  },

  get anyAvailable() {
    return this.configs.some(function(aConfig) {
      return aConfig.available;
    });
  },

  get anyStrictlyAvailable() {
    return this.configs.some(function(aConfig) {
      return aConfig.strictlyAvailable;
    });
  }
};
StaticConfigManager.init();
