/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["StaticConfig", "StaticConfigManager"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import('resource://gre/modules/Services.jsm');
try {
  Cu.import("resource:///modules/JXON.js");
}
catch(e) {
  Cu.import("resource://gre/modules/JXON.js");
}

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


const Messages = {
  _messages : new Preferences("extensions.achook."),
  getLocalized: function (key, defaultValue) {
    if (this._messages.has(key + ".override"))
      key += ".override";
    return this._messages.getLocalized(key, defaultValue);
  }
};


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

  get label() {
    var label = Messages.getLocalized("newMailAccountMenuItem.label");
    return label.replace(/%domain%/gi, this.displayName);
  },
  get shortLabel() {
    var label = Messages.getLocalized("newMailAccountMenuItem.shortLabel");
    return label.replace(/%domain%/gi, this.displayName);
  },
  get accesskey() {
    var accesskey = Messages.getLocalized("newMailAccountMenuItem.accesskey");
    return accesskey.replace(/%domain%/gi, this.domain).charAt(0);
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
      Components.utils.reportError(new Error(this.name + ": failed to load XML from "+this.source +" ("+this.prefPrefix + "source"+")"));
      Components.utils.reportError(e);
      return null;
    }
  },

  get jxon() {
    // Verbose level = 2 or high, because low verbose level (1=default) parses
    // an empty node to "true" unexepctedly.
    return this._lastJXON || this._loadJXON(2);
  },
  _lastJXON : null,
  get jxonForReadFromXML() {
    // However, Thunderbird's "readFromXML" must receive verbose level = 1 JXON.
    return this._lastJXONForReadFromXML || this._loadJXON();
  },
  _loadJXON : function StaticConfig_loadJXON(aVerboseLevel) {
    var xml = this.xml;
    if (!xml)
      throw new Error(this.name + ": failed to load XML from "+this.source);

    var DOMParser = Cc["@mozilla.org/xmlextras/domparser;1"]
                     .createInstance(Ci.nsIDOMParser);
    var DOMConfig = DOMParser.parseFromString(xml, "text/xml");
    if (aVerboseLevel === undefined)
      return JXON.build(DOMConfig);
    else
      return JXON.build(DOMConfig, aVerboseLevel);
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
        domain = this.jxon.clientConfig.emailProvider.domain.value;
      } catch (e) {
        Components.utils.reportError(e);
      }
    }
    return domain;
  },

  get displayName() {
    return this._lastDisplayName || (this._lastDisplayName = this._loadDisplayName());
  },
  _lastDisplayName : null,
  _loadDisplayName : function StaticConfig_loadDisplayName() {
    try {
      return this.jxon.clientConfig.emailProvider.displayName.value;
    } catch (e) {
      Components.utils.reportError(e);
      return this.domain;
    }
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

    var entries = Services.prefs.getChildList(PreferenceNames.staticConfigRoot, []);
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

    if (!("default" in this.namedConfigs)) {
      let defaultConfig = this.defaultConfig || new StaticConfig();
      if (defaultConfig.domain) {
        if (this.configs.indexOf(defaultConfig) < 0)
          this.configs.unshift(defaultConfig);
        this.namedConfigs[defaultConfig.name] = defaultConfig;
      }
    }
  },

  get defaultConfig() {
    return this.configs[0];
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
