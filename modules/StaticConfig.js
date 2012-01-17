const EXPORTED_SYMBOLS = ["StaticConfig"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "Application", function() {
  return Cc['@mozilla.org/steel/application;1']
           .getService(Ci.steelIApplication);
});

XPCOMUtils.defineLazyGetter(this, "Util", function() {
  const { Util } = Cu.import('resource://achook-modules/Util.js', {});
  return Util;
});
XPCOMUtils.defineLazyGetter(this, "Preferences", function() {
  const { Preferences } = Cu.import('resource://achook-modules/Preferences.js', {});
  return Preferences;
});
XPCOMUtils.defineLazyGetter(this, "PreferenceNames", function() {
  const { PreferenceNames } = Cu.import('resource://achook-modules/PreferenceNames.js', {});
  return PreferenceNames;
});

XPCOMUtils.defineLazyGetter(this, "preferences", function() {
  return new Preferences("");
});


var StaticConfig = {
  EVENT_TYPE_STATIC_CONFIG_READY : "nsDOMAcHookStaticConfigReady",
  EVENT_TYPE_STATIC_DOMAIN_READY : "nsDOMAcHookStaticDomainReady",

  get source() {
    return preferences.get(PreferenceNames.staticConfigSource);
  },
  get always() {
    return preferences.get(PreferenceNames.staticConfigAlways);
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
    var xml = this._loadXML();
    if (xml) this._lastXML = xml;
    return xml;
  },
  _lastXML : null,
  _loadXML : function StaticConfig_loadXML() {
    try {
      var uri = Util.makeURIFromSpec(this.source);
      var contents = Util.readFromURI(uri, "UTF-8");
      contents = contents.replace(/<\?xml[^>]*\?>/, "");
      return new XML(contents);
    } catch(e) {
      return null;
    }
  },

  get domain() {
    return this._lastDomain || this.domainFromSource;
  },
  get domainFromSource() {
    var domain = this._loadDomain();
    if (domain) this._lastDomain = domain;
    return domain;
  },
  _lastDomain : null,
  _loadDomain : function StaticConfig_loadDomain() {
    var domain = preferences.get(PreferenceNames.staticConfigDomain);
    if (!domain) {
      try {
        domain = this.xml.emailProvider.domain.text();
      } catch (e) {
      }
    }
    return domain;
  }
};
