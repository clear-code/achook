// in strict mode, we cannot use E4X!
// "use strict";

(function (exports) {
  const DEBUG = true;

  const ACHOOK = new Namespace("achook", "http://www.clear-code.com/thunderbird/achook");

  const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

  const { Util } = Cu.import('resource://achook-modules/Util.js', {});
  const { Services } = Cu.import('resource://achook-modules/Services.js', {});
  const { Preferences } = Cu.import('resource://achook-modules/Preferences.js', {});
  const { PreferenceNames } = Cu.import('resource://achook-modules/PreferenceNames.js', {});

  var mozServices = {};
  Cu.import("resource://gre/modules/Services.jsm", mozServices);
  mozServices = mozServices.Services;

  const preferences = new Preferences("");

  function $(selector) document.querySelector(selector);
  var createElement = Util.getElementCreator(document);

  var elements = {
    get emailInputBox() $("#email"),
    get emailErrorIcon() $("#emailerroricon"),
    get manualEditButton() $("#manual-edit_button"),
    get createButton() $("#create_button")
  };

  let domain = preferences.get(PreferenceNames.emailDomainPart);
  let domainIsGiven = !!domain;

  function blurElement(element) {
    let { activeElement } = document;
    element.focus();
    element.blur();
    if (activeElement)
      activeElement.focus();
  }

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
      gEmailConfigWizard.onInputEmail();
    }, false);
  }

  function suppressBuiltinLecture() {
    elements.manualEditButton.style.setProperty("display", "none", "important");
    // elements.manualEditButton.hidden = true;

    EmailConfigWizard.prototype._foundConfig2 =
      function _foundConfig2_override(config) {
        this._currentConfig   = config;
        this._currentModename = "result";

        $("#next_button").hidden = true;
        $("#half-manual-test_button").hidden = true;
        $("#stop_button").hidden = true;
        $("#advanced-setup_button").hidden = true;

        elements.createButton.disabled = false;
        elements.createButton.hidden = false;

        window.sizeToContent();

        // TODO: automatically click "create account" button?
    };
  }

  var lastConfigXML = null;
  function storeSourceXML() {
    var originalReadFromXML = window.readFromXML;
    window.readFromXML = function ACHook_readFromXML(clientConfigXML) {
      lastConfigXML = clientConfigXML;
      return originalReadFromXML.apply(this, arguments);
    };
  }

  function suppressAccountVerification() {
    var originalVerifyLogon = window.verifyLogon;
    window.verifyLogon = function ACHook_verifyLogon(config, inServer, alter, msgWindow, successCallback, errorCallback) {
      if (lastConfigXML) {
try{
        let incomingServer = lastConfigXML..incomingServer;
        let requireVerification = incomingServer && lastConfigXML..incomingServer.ACHOOK::requireVerification;
        if (requireVerification && /^\s*(no|false|0)\s*$/i.test(requireVerification.text()))
          return successCallback.call(this, config);
}catch(e){dump(e+'\n');dump(config.toSource()+'\n');throw e;}
      }
      return originalVerifyLogon.apply(this, arguments);
    };
  }

  if (domainIsGiven) {
    buildFixedDomainView();
    suppressBuiltinLecture();
  }

  storeSourceXML();
  suppressAccountVerification();

  function outputDebugMessages() {
    eval('EmailConfigWizard.prototype.findConfig = '+EmailConfigWizard.prototype.findConfig.toSource()
      .replace(
        /(gEmailWizardLogger.info\(("[^"]+")\))/g,
        'dump($2); dump("\\n"); $1'
      )
      .replace(
        /((?:this|self)\.(?:switchToMode|startSpinner)\(("[^"]+")\))/g,
        'dump($2); dump("\\n"); $1'
      )
      .replace(
        '{',
        '{ dump("domain = "+domain+" / email = " + email+"\\n");'
      )
      .replace(
        /(function\s*\(e\)\s*\{)/,
        '$1 dump("error : "+e+"\\n");'
      )
    );
  }

  if (DEBUG)
    outputDebugMessages();

  var accountManager = Cc["@mozilla.org/messenger/account-manager;1"]
                         .getService(Ci.nsIMsgAccountManager);
  var smtpManager = Cc["@mozilla.org/messengercompose/smtp;1"]
                      .getService(Ci.nsISmtpService);

  var beforeAccounts = Util.toArray(accountManager.accounts, Ci.nsIMsgAccount).map(function(account) account.key);
  var beforeSMTPServers = Util.toArray(smtpManager.smtpServers, Ci.nsISmtpServer).map(function(server) server.key);

  window.addEventListener("unload", function ACHook_onUnload() {
    window.removeEventListener("unload", ACHook_onUnload, false);

    var config = lastConfigXML;
dump('config : '+config+'\n');

    let afterAccounts = Util.toArray(accountManager.accounts, Ci.nsIMsgAccount);
dump('before : '+beforeAccounts.length+' => after : '+afterAccounts.length+'\n');
    if (afterAccounts.length > beforeAccounts.length) {
      afterAccounts.some(function(account) {
        if (beforeAccounts.indexOf(account.key) > -1) return false;

dump('INCOMING\n');
        var incomingServer = account.incomingServer;
        Array.forEach(config..incomingServer.ACHOOK::*, function(aProperty) {
          var key = aProperty.name();
          var value = aProperty.text();
dump(key+' = '+value+'\n');
        });

dump('IDENTITY\n');
        var identity = account.defaultIdentity;
        Array.forEach(config..identity.ACHOOK::*, function(aProperty) {
          var key = aProperty.name();
          var value = aProperty.text();
dump(key+' = '+value+'\n');
        });

        return true;
      });
    }

    var afterSMTPServers = Util.toArray(smtpManager.smtpServers, Ci.nsISmtpServer);
    if (afterSMTPServers.length > beforeSMTPServers.length) {
      afterSMTPServers.some(function(server) {
        if (beforeSMTPServers.indexOf(server.key) > -1) return false;
        // apply configurations
        return true;
      });
    }
  }, false);
})(window);
