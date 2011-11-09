"use strict";

(function (exports) {
  const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

  const { Util } = Cu.import('resource://achook-modules/Util.js', {});
  const { Services } = Cu.import('resource://achook-modules/Services.js', {});
  const { Preferences } = Cu.import('resource://achook-modules/Preferences.js', {});
  const { PreferenceNames } = Cu.import('resource://achook-modules/PreferenceNames.js', {});

  let mozServices = {};
  Cu.import("resource://gre/modules/Services.jsm", mozServices);
  mozServices = mozServices.Services;

  const preferences = new Preferences("");

  function $(selector) document.querySelector(selector);
  let createElement = Util.getElementCreator(document);

  let elements = {
    get emailInputBox() $("#email"),
    get emailErrorIcon() $("#emailerroricon")
  };

  let domain = preferences.get(PreferenceNames.emailDomainPart);

  function buildFixedDomainView() {
    function getCurrentMailAddress() elements.emailLocalPartInputBox.value
      + "@" + domain;

    elements.emailInfoContainer = elements.emailInputBox.parentNode;
    elements.accountInfoContainer = elements.emailInfoContainer.parentNode;
    elements.emailNewElementsBase = elements.emailInputBox.nextSibling;

    // Create mail address input box

    elements.emailInfoContainer.insertBefore(
      elements.emailLocalPartInputBox = createElement("textbox", {
        emptytext: "please.input.your.account",
        class: "padded uri-element"
      }),
      elements.emailNewElementsBase
    );

    elements.emailInfoContainer.insertBefore(
      createElement("label", {
        value: "@" + domain
      }),
      elements.emailNewElementsBase
    );

    // Hide default input box and arrange event listeners

    elements.emailInputBox.hidden = true;
    elements.emailLocalPartInputBox.addEventListener("blur", function () {
      elements.emailInputBox.value = getCurrentMailAddress();
      // alert(elements.emailInputBox.value);
    }, false);
  }

  if (domain)
    buildFixedDomainView();


  var accountManager = Cc["@mozilla.org/messenger/account-manager;1"]
                         .getService(Ci.nsIMsgAccountManager);
  var smtpManager = Cc["@mozilla.org/messengercompose/smtp;1"]
                      .getService(Ci.nsISmtpService);

  let beforeAccounts = Util.toArray(accountManager.accounts, Ci.nsIMsgAccount).map(function(account) account.key);
  let beforeSMTPServers = Util.toArray(smtpManager.smtpServers, Ci.nsISmtpServer).map(function(server) server.key);

  window.addEventListener("unload", function ACHook_onUnload() {
    window.removeEventListener("unload", ACHook_onUnload, false);

    let config = gEmailConfigWizard._currentConfig;

    let afterAccounts = Util.toArray(accountManager.accounts, Ci.nsIMsgAccount);
    if (afterAccounts.length > beforeAccounts.length) {
      afterAccounts.some(function(account) {
        if (beforeAccounts.indexOf(account.key) > -1) return false;
        // apply configurations
        return true;
      });
    }

    let afterSMTPServers = Util.toArray(smtpManager.smtpServers, Ci.nsISmtpServer);
    if (afterSMTPServers.length > beforeSMTPServers.length) {
      afterSMTPServers.some(function(server) {
        if (beforeSMTPServers.indexOf(server.key) > -1) return false;
        // apply configurations
        return true;
      });
    }
  }, false);
})(window);
