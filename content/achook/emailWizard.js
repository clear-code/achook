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
  const { StringBundle } = Cu.import("resource://achook-modules/StringBundle.js", {});
  const { StaticConfig } = Cu.import("resource://achook-modules/StaticConfig.js", {});

  var mozServices = {};
  Cu.import("resource://gre/modules/Services.jsm", mozServices);
  mozServices = mozServices.Services;

  const preferences = new Preferences("");

  const Messages = {
    _messages : new Preferences("extensions.achook.wizard."),
    getLocalized: function (key, defaultValue) {
      if (this._messages.has(key + ".override"))
        key += ".override";
      return this._messages.getLocalized(key, defaultValue);
    }
  };

  function $(selector) document.querySelector(selector);
  var createElement = Util.getElementCreator(document);

  var elements = {
    get emailInputBox() $("#email"),
    get emailErrorIcon() $("#emailerroricon"),
    get manualEditButton() $("#manual-edit_button"),
    get nextButton() $("#next_button"),
    get createButton() $("#create_button"),
    get masterVBox() $("#mastervbox"),
    get statusMessage() $("#status_msg")
  };

  var existingAccountRemoved = false;
  var lastConfigXML = null;

  var staticConfigUsed = StaticConfig.strictlyAvailable && shouldUseStaticConfig();
  if (staticConfigUsed) {
    suppressBuiltinLecture();
    useStaticConfig();
  } else {
    storeSourceXML();
  }

  var staticDomainUsed = StaticConfig.domainFromSource && shouldUseStaticConfig();
  if (staticDomainUsed) {
    buildFixedDomainView(StaticConfig.domain);
    suppressSecurityWarning();
    suppressAccountDuplicationCheck();
  }

  suppressAccountVerification();

  if (DEBUG)
    outputDebugMessages();

  window.addEventListener("DOMContentLoaded", function ACHook_onDOMContentLoaded() {
    window.removeEventListener("DOMContentLoaded", ACHook_onDOMContentLoaded, false);

    if (staticConfigUsed)
      document.dispatchEvent(createDataContainerEvent(StaticConfig.EVENT_TYPE_STATIC_CONFIG_READY, {
        source : StaticConfig.source
      }));

    if (staticDomainUsed)
      document.dispatchEvent(createDataContainerEvent(StaticConfig.EVENT_TYPE_STATIC_DOMAIN_READY, {
        domain : StaticConfig.domain
      }));

    if (!StaticConfig.available &&
        shouldUseStaticConfig() &&
        preferences.get(PreferenceNames.staticConfigRequired)) {
        window.addEventListener("load", function ACHook_onLoad() {
          window.removeEventListener("load", ACHook_onLoad, false);
          window.setTimeout(function() {
            Util.alert(
              Messages.getLocalized("missingStaticConfig.title"),
              Messages.getLocalized("missingStaticConfig.text"),
              window
            );
            window.close();
          });
        }, false);
    }
  }, false);

  window.addEventListener("unload", function ACHook_onUnload() {
    window.removeEventListener("unload", ACHook_onUnload, false);
    overrideAccountConfig();
    confirmRestart();
  }, false);

  const accountManager = Cc["@mozilla.org/messenger/account-manager;1"]
                           .getService(Ci.nsIMsgAccountManager);
  const smtpManager = Cc["@mozilla.org/messengercompose/smtp;1"]
                        .getService(Ci.nsISmtpService);

  var beforeAccountKeys = Util.toArray(accountManager.accounts, Ci.nsIMsgAccount).map(function(account) account.key);
  var afterSMTPServers = Util.toArray(smtpManager.smtpServers, Ci.nsISmtpServer);
  var beforeSMTPServerKeys = Util.toArray(smtpManager.smtpServers, Ci.nsISmtpServer).map(function (server) server.key);


  function blurElement(element) {
    let { activeElement } = document;
    element.focus();
    element.blur();
    if (activeElement)
      activeElement.focus();
  }

  function buildFixedDomainView(domain) {
    function getCurrentMailAddress() elements.emailLocalPartInputBox.value
      + "@" + domain;

    elements.emailInfoContainer = elements.emailInputBox.parentNode;
    elements.accountInfoContainer = elements.emailInfoContainer.parentNode;
    elements.emailNewElementsBase = elements.emailInputBox.nextSibling;

    // Create mail address input box

    elements.emailInfoContainer.insertBefore(
      elements.emailLocalPartInputBox = createElement("textbox", {
        placeholder : StringBundle.achook.GetStringFromName("accountCreationWizard.address.placeholder"),
        emptytext   : StringBundle.achook.GetStringFromName("accountCreationWizard.address.placeholder"),
        "class"     : "padded uri-element",
        "id"        : "emailLocalPartInputBox"
      }),
      elements.emailNewElementsBase
    );

    elements.emailInfoContainer.insertBefore(
      createElement("label", {
        value : "@" + domain
      }),
      elements.emailNewElementsBase
    );

    // Hide default input box and arrange event listeners

    elements.emailInputBox.hidden = true;

    function onEmailUpdated(newAddress) {
      if (newAddress !== elements.emailInputBox.value) {
        elements.emailInputBox.value = newAddress;
        gEmailConfigWizard.onInputEmail();
      }
    }

    function onLocalPartInput() {
      let currentMailAddress = getCurrentMailAddress();
      if (elements.emailLocalPartInputBox.dispatchEvent(createDataContainerEvent("AcHookMailAddressInput", {
            value: currentMailAddress
          }, true))) {
          onEmailUpdated(currentMailAddress);
      }
    }
    elements.emailLocalPartInputBox.addEventListener("input", onLocalPartInput, false);
    elements.emailLocalPartInputBox.addEventListener("blur", onLocalPartInput, false);

    document.addEventListener("AcHookMailAddressOverride", function (ev) {
      onEmailUpdated(ev.getData("value"));
    }, false);
  }

  function suppressBuiltinLecture() {
    var shownElements = ["initialSettings", "status_area", "buttons_area"];
    Array.forEach(elements.masterVBox.childNodes, function(aElement) {
      if (aElement.nodeType != Ci.nsIDOMNode.ELEMENT_NODE || aElement.localName == "spacer")
        return;

      if (shownElements.indexOf(aElement.id) < 0)
        aElement.style.setProperty("display", "none", "important");
    });

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

  function storeSourceXML() {
    var originalReadFromXML = window.readFromXML;
    window.readFromXML = function ACHook_readFromXML(clientConfigXML) {
      lastConfigXML = clientConfigXML;
      return originalReadFromXML.apply(this, arguments);
    };
  }

  function ensureNoDuplicatedOldAccount(username, hostname, type) {
    var server;
    try {
      server = accountManager.FindServer(username, hostname, type);
      let targetAccounts = [];
      for (let i = 0; i < accountManager.accounts.Count(); ++i) {
        let account = accountManager.accounts.QueryElementAt(i, Ci.nsISupports);
        account.QueryInterface(Ci.nsIMsgAccount);
        if (account.incomingServer == server)
          targetAccounts.push(account);
      }
      targetAccounts.forEach(function (account) accountManager.removeAccount(account));
    } catch (x) {
      dump("Failed to remove account " + username + "@" + hostname + "(" + type +")\n" + x + "\n");
    }
  }

  function stringToBoolean(aString, aDefault) {
    aString = String(aString);
    return aString ? /^\s*(yes|true|1)\s*$/i.test(aString) : aDefault ;
  }

  function suppressAccountVerification() {
    var originalVerifyLogon = window.verifyLogon;
    window.verifyLogon = function ACHook_verifyLogon(config, inServer, alter, msgWindow, successCallback, errorCallback) {
      ensureNoDuplicatedOldAccount(config.incoming.username, config.incoming.hostname, config.incoming.type); // XXX for debugging!
      if (lastConfigXML) {
        try{
          let incomingServer = lastConfigXML..incomingServer;
          let requireVerification = incomingServer && lastConfigXML..incomingServer.ACHOOK::requireVerification;
          if (requireVerification && !stringToBoolean(requireVerification.text(), true)) {
            accountManager.removeIncomingServer(inServer, true);
            return successCallback.call(this, config);
          }
        } catch(e) {
          dump(e+"\n");
          dump(config.toSource()+"\n");
          throw e;
        }
      }
      return originalVerifyLogon.apply(this, arguments);
    };
  }

  function suppressSecurityWarning() {
    // emailWizard.js#1715
    gSecurityWarningDialog.open = function (
      configSchema, configFilledIn, onlyIfNeeded,
      okCallback, cancelCallback
    ) {
      okCallback();
    };
  }

  function suppressAccountDuplicationCheck() {
    let validateAndFinish_original = EmailConfigWizard.prototype.validateAndFinish;
    EmailConfigWizard.prototype.validateAndFinish = function () {
      let config = this.getConcreteConfig();

      let incomingServer = checkIncomingServerAlreadyExists(config);
      let outgoingServer = checkOutgoingServerAlreadyExists(config);

      if (incomingServer || outgoingServer) {
        if (preferences.get(PreferenceNames.overwriteExistingAccount, true)) {
          const removeButtonIndex = 0;
          if (Util.confirmEx(
                window,
                StringBundle.achook.GetStringFromName("confirmRemoveExistingServers.title"),
                StringBundle.achook.GetStringFromName("confirmRemoveExistingServers.text"),
                Ci.nsIPromptService.BUTTON_POS_0 * Ci.nsIPromptService.BUTTON_TITLE_IS_STRING |
                Ci.nsIPromptService.BUTTON_POS_1 * Ci.nsIPromptService.BUTTON_TITLE_IS_STRING,
                StringBundle.achook.GetStringFromName("confirmRemoveExistingServers.remove"),
                StringBundle.achook.GetStringFromName("confirmRemoveExistingServers.keep"),
                null
              ) != removeButtonIndex) {
            // nothing to do
            return null;
          }
        } else {
          Util.alert(
            Messages.getLocalized("alertExistingServers.title"),
            Messages.getLocalized("alertExistingServers.text"),
            window
          );
          return null;
        }

        try {
          Services.accountManager.removeIncomingServer(incomingServer, true);
        } catch (x) {
          dump(x);
        }

        try {
          Services.smtpService.deleteSmtpServer(outgoingServer);
        } catch (x) {
          dump(x);
        }

        existingAccountRemoved = true;
      }

      return validateAndFinish_original.apply(this, arguments);
    };
  }

  function shouldUseStaticConfig() {
    if (StaticConfig.always)
      return true;

    var arg = window.arguments && window.arguments.length > 0 && window.arguments[0];
    return arg && arg.extraData && arg.extraData.__achook__staticConfig;
  }

  function useStaticConfig() {
    var originalFetchConfigFromDisk = window.fetchConfigFromDisk;
    window.fetchConfigFromDisk = function ACHook_fetchConfigFromDisk(domain, successCallback, errorCallback) {
      return new TimeoutAbortable(runAsync(function ACHook_asyncFetchConfigCallback() {
        try {
          lastConfigXML = StaticConfig.xml;
          if (!lastConfigXML)
            throw new Error("failed to load static config file");
          successCallback(readFromXML(lastConfigXML));
          elements.statusMessage.textContent = StringBundle.achook.GetStringFromName("accountCreationWizard.staticConfigUsed");
          window.setTimeout(function() {
            elements.createButton.click();
          }, 0);
        } catch (e) {
          dump(e+'\n');
          if (preferences.get(PreferenceNames.staticConfigRequired))
            errorCallback(e);
          else
            originalFetchConfigFromDisk.apply(this, arguments);
        }
      }));
    };
    elements.nextButton.label = elements.createButton.label;
  }

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

  function setAccountValue(aTarget, aKey, aValue) {
    if (!(aKey in aTarget)) {
      dump("unknown key "+aKey+"="+aValue+" for "+aTarget+"\n");
      return;
    }
    switch (typeof aTarget[aKey]) {
      case "string": aValue = String(aValue); break;
      case "number": aValue = Number(aValue); break;
      case "boolean": aValue = stringToBoolean(aValue); break;
      default:
        dump("object type key cannot be updated: "+aKey+"="+aValue+" for "+aTarget+"\n");
        return;
    }
    dump("override "+aKey+"="+aValue+" for "+aTarget+"\n");
    aTarget[aKey] = aValue;
  }

  function extractKeyValuesFromXML(xml) {
    return [[property.localName(), property.text()]
            for each (property in xml)
            if (property.children().length())];
  }

  function setAccountValueFromKeyValues(target, keyValues) {
    keyValues.forEach(function ([key, value]) {
      try {
        setAccountValue(target, key, value);
      } catch (x) {
        dump("Error while setting the property " + key);
      }
    });
  }

  function createDataContainerEvent(name, properties, cancellable) {
    var event = document.createEvent("DataContainerEvent");
    event.initEvent(name, true, cancellable);

    for (let [key, value] in Iterator(properties)) {
      event.setData(key, value);
    }

    return event;
  }

  function dispatchAccountCreatedEvent(createdAccount, createdSMTPServer) {
    return document.dispatchEvent(createDataContainerEvent("AcHookAccountCreated", {
             account: createdAccount,
             smtpServer: createdSMTPServer
           }));
  }

  function applyCustomPrettyName(incomingServer, format) {
    let constructedPrettyName = String(format);

    let serverPort = incomingServer.port;
    let defaultServerPort = Services.imapProtocolInfo.getDefaultServerPort(false);
    let isDefaultPort = serverPort == defaultServerPort;

    let replacePairs = [
      [/%username%/gi, incomingServer.username.split("@")[0]],
      [/%real_username%/gi, incomingServer.username],
      [/%hostname%/gi, incomingServer.hostName],
      [/%port%/gi, incomingServer.port],
      [/%not_default_port_expression%/gi, isDefaultPort ? "" : ":" + serverPort]
    ];

    replacePairs.forEach(function ([pattern, replacer]) {
      constructedPrettyName = constructedPrettyName.replace(pattern, replacer);
    });

    incomingServer.prettyName = constructedPrettyName;
  }

  function overrideAccountConfig() {
    var config = lastConfigXML;

    var afterAccounts = Util.toArray(accountManager.accounts, Ci.nsIMsgAccount);
    var createdAccounts = afterAccounts.filter(function (account) beforeAccountKeys.indexOf(account.key) < 0);

    createdAccounts.forEach(function (account) {
      if (!account.defaultIdentity) // ignore local folder account
        return;

      var incomingServer = account.incomingServer.QueryInterface(Ci.nsIMsgIncomingServer);
      switch (incomingServer.type) {
      case "pop3":
        incomingServer = incomingServer.QueryInterface(Ci.nsIPop3IncomingServer);
        break;
      case "imap":
        incomingServer = incomingServer.QueryInterface(Ci.nsIImapIncomingServer);
        break;
      case "nntp":
        incomingServer = incomingServer.QueryInterface(Ci.nsINntpIncomingServer);
        break;
      }

      setAccountValueFromKeyValues(
        incomingServer,
        extractKeyValuesFromXML(config..incomingServer.ACHOOK::*)
      );

      var identity = account.defaultIdentity.QueryInterface(Ci.nsIMsgIdentity);
      setAccountValueFromKeyValues(
        identity,
        extractKeyValuesFromXML(config..identity.ACHOOK::*)
      );
    });

    var afterSMTPServers = Util.toArray(smtpManager.smtpServers, Ci.nsISmtpServer);
    var createdSMTPServers = afterSMTPServers.filter(function (server) beforeSMTPServerKeys.indexOf(server.key) < 0);
    createdSMTPServers.forEach(function (server) {
      server = server.QueryInterface(Ci.nsISmtpServer);
      setAccountValueFromKeyValues(
        server,
        extractKeyValuesFromXML(config..outgoingServer.ACHOOK::*)
      );
    });

    var createdAccount = createdAccounts[0] || null;
    var createdSMTPServer = createdSMTPServers[0] || null;
    var createdAccountIncomingServer = createdAccount.incomingServer;

    var prettyNameFormat = config.emailProvider.ACHOOK::prettyNameFormat;
    if (prettyNameFormat && prettyNameFormat.text())
      applyCustomPrettyName(createdAccountIncomingServer, prettyNameFormat.text());

    dispatchAccountCreatedEvent(createdAccount, createdSMTPServer);
  }

  function confirmRestart() {
    const restartButtonIndex = 0;
    if (existingAccountRemoved && (Util.confirmEx(
          window,
          StringBundle.achook.GetStringFromName("confirmRestartNow.title"),
          StringBundle.achook.GetStringFromName("confirmRestartNow.text"),
          Ci.nsIPromptService.BUTTON_POS_0 * Ci.nsIPromptService.BUTTON_TITLE_IS_STRING |
          Ci.nsIPromptService.BUTTON_POS_1 * Ci.nsIPromptService.BUTTON_TITLE_IS_STRING,
          StringBundle.achook.GetStringFromName("confirmRestartNow.restart"),
          StringBundle.achook.GetStringFromName("confirmRestartNow.later"),
          null
        ) == restartButtonIndex)) {
      Util.restartApplication();
    }
  };
})(window);
