/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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
    var domain = preferences.get(PreferenceNames.staticConfigDomain);
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
    var shouldUse = preferences.get(PreferenceNames.staticConfigSeparatedUsername);
    if (shouldUse === null) {
      try {
        shouldUse = this.xml.emailProvider.incomingServer.username.text() != '%EMAILLOCALPART%';
      } catch (e) {
        Components.utils.reportError(e);
      }
    }
    return shouldUse;
  }
};
