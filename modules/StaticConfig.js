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


var StaticConfig = {};

XPCOMUtils.defineLazyGetter(StaticConfig, "available", function() {
  return !!this.location && !!this.xml;
});

XPCOMUtils.defineLazyGetter(StaticConfig, "location", function() {
  return preferences.get(PreferenceNames.staticConfigFile);
});

XPCOMUtils.defineLazyGetter(StaticConfig, "xml", function() {
  try {
    var uri = Util.makeURIFromSpec(this.location);
    var contents = Util.readFromURI(uri, "UTF-8");
    contents = contents.replace(/<\?xml[^>]*\?>/, "");
    return new XML(contents);
  } catch(e) {
    return null;
  }
});

XPCOMUtils.defineLazyGetter(StaticConfig, "domain", function() {
  var domain = preferences.get(PreferenceNames.staticConfigDomain);
  if (!domain) {
    try {
      domain = this.xml.emailProvider.domain.text();
    } catch (e) {
    }
  }
  return domain;
});
