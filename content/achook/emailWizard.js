/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// in strict mode, we cannot use E4X!
// "use strict";

(function (exports) {
  const DEBUG = true;
  function debugMessage(message) {
    if (DEBUG)
      Application.console.log("achook: "+message);
  }

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
    get stopButton() $("#stop_button"),
    get masterVBox() $("#mastervbox"),
    get statusMessage() $("#status_msg")
  };

  // Reset wizard status to "start".
  function resetStatus() {
    debugMessage("resetStatus");
    elements.statusMessage.textContent = "";
    gEmailConfigWizard.onStartOver();
    gEmailConfigWizard.checkStartDone();
  }

  var existingAccountRemoved = false;
  var lastConfigXML = null;

  var staticConfigUsed = StaticConfig.strictlyAvailable && shouldUseStaticConfig();
  debugMessage("staticConfigUsed = " + staticConfigUsed);
  if (staticConfigUsed) {
    suppressBuiltinLecture();
    useStaticConfig();
  } else {
    storeSourceXML();
  }

  var staticDomainUsed = StaticConfig.domainFromSource && shouldUseStaticConfig();
  debugMessage("staticDomainUsed = "+staticDomainUsed);
  if (staticDomainUsed) {
    buildFixedDomainView(StaticConfig.domain, StaticConfig.useSeparatedUsername);
    suppressSecurityWarning();
    suppressAccountDuplicationCheck();
  }

  activateUsernamePlaceholder();
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
        shouldUseStaticConfig()) {
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
  var beforeSMTPServerKeys = Util.toArray(smtpManager.smtpServers, Ci.nsISmtpServer).map(function (server) server.key);


  function blurElement(element) {
    let { activeElement } = document;
    element.focus();
    element.blur();
    if (activeElement)
      activeElement.focus();
  }

  function buildFixedDomainView(domain, useSeparatedUsername) {
    function getCurrentMailAddress() elements.emailLocalPartInputBox.value
      + "@" + domain;

    elements.emailInfoContainer = elements.emailInputBox.parentNode;
    elements.accountInfoContainer = elements.emailInfoContainer.parentNode;
    elements.emailNewElementsBase = elements.emailInputBox.nextSibling;

    // Create user id input box (it can be hidden)
    elements.accountInfoContainer.insertBefore(
      elements.usernameRow = createElement(
        elements.emailInfoContainer.nextSibling.localName,
        { align : "center", id: "usernameRow" },
        [
          createElement("label", {
            "class"   : "autoconfigLabel",
            accesskey : StringBundle.achook.GetStringFromName("accountCreationWizard.username.accessKey"),
            value     : StringBundle.achook.GetStringFromName("accountCreationWizard.username"),
            control   : "username"
          }),
          elements.usernameInputBox = createElement("textbox", {
            id          : "username",
            "class"     : "padded",
            placeholder : StringBundle.achook.GetStringFromName("accountCreationWizard.username.placeholder"),
            emptytext   : StringBundle.achook.GetStringFromName("accountCreationWizard.username.placeholder")
          }),
          createElement("label", {
            "class"   : "initialDesc",
            value     : StringBundle.achook.GetStringFromName("accountCreationWizard.username.description"),
            control   : "username"
          })
        ]
      ),
      elements.emailInfoContainer.nextSibling
    );
    elements.usernameRow.hidden = !useSeparatedUsername;

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

    var onUsernameInputTimer;
    function onUsernameInput() {
      notifyOverrideEmail(updateEmail());
      if (onUsernameInputTimer) window.clearTimeout(onUsernameInputTimer);
      onUsernameInputTimer = window.setTimeout(function(aStack) {
        debugMessage("onUsernameInput: username = "+elements.usernameInputBox.value+"\n"+aStack);
        onUsernameInputTimer = null;
      }, 500, (new Error()).stack);
    }
    elements.usernameInputBox.addEventListener("input", onUsernameInput, false);

    var onEmailUpdatedMessageTimer;
    function onEmailUpdated(newAddress) {
      if (onEmailUpdatedMessageTimer) window.clearTimeout(onEmailUpdatedMessageTimer);
      onEmailUpdatedMessageTimer = window.setTimeout(function(aStack) {
        debugMessage("onEmailUpdated: newAddress = "+newAddress+"\n"+aStack);
        onEmailUpdatedMessageTimer = null;
      }, 500, (new Error()).stack);

      if (newAddress !== elements.emailInputBox.value) {
        elements.emailInputBox.value = newAddress;
        gEmailConfigWizard.onInputEmail();
      }
    }

    var onLocalPartInputTimer;
    function onLocalPartInput() {
      let currentMailAddress = getCurrentMailAddress();

      if (onLocalPartInputTimer) window.clearTimeout(onLocalPartInputTimer);
      onLocalPartInputTimer = window.setTimeout(function(aStack) {
        debugMessage("onLocalPartInput: currentMailAddress = "+currentMailAddress+"\n"+aStack);
        onLocalPartInputTimer = null;
      }, 500, (new Error()).stack);

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

        $("#half-manual-test_button").hidden = true;
        $("#advanced-setup_button").hidden = true;
        elements.nextButton.hidden = true;
        elements.stopButton.hidden = true;

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
      debugMessage("Failed to remove account " + username + "@" + hostname + "(" + type +")\n" + x);
    }
  }

  function stringToBoolean(aString, aDefault) {
    aString = String(aString);
    return aString ? /^\s*(yes|true|1)\s*$/i.test(aString) : aDefault ;
  }

  function activateUsernamePlaceholder() {
    var originalReplaceVariable = window._replaceVariable;
    window._replaceVariable = function ACHook_readFromXML(variable, values) {
      var username = '';
      if (elements.usernameInputBox)
        username = elements.usernameInputBox.value.replace(/^\s+|\s+$/g, '');
      values.USERNAME = username || values.EMAILLOCALPART;
      return originalReplaceVariable.apply(this, arguments);
    };
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
          debugMessage(e);
          debugMessage(config.toSource());
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

  // Reset status to "start" when verification failed
  let (verifyConfig_original = verifyConfig) {
    verifyConfig = function (config, alter, msgWindow, successCallback, errorCallback) {
      verifyConfig_original(
        config, alter, msgWindow,
        function success() {
          successCallback.apply(this, arguments);
        },
        function error() {
          resetStatus();
          errorCallback.apply(this, arguments);
        }
      );
    };
  };
  // clear testing account for the "cancel" button
  let (verifyLogon_original = window.verifyLogon) {
    window.verifyLogon = function ACHook_verifyLogon(config, inServer, alter, msgWindow, successCallback, errorCallback) {
      let onUnload = function() {
        debugMessage('clear temporary incoming server (dialog is closed)');
        Services.accountManager.removeIncomingServer(inServer, true);
        window.removeEventListener('unload', onUnload, false);
      };
      window.addEventListener('unload', onUnload, false);

      let successCallback_original = successCallback;
      successCallback = function() {
        successCallback_original.apply(this, arguments);
        window.removeEventListener('unload', onUnload, false);
      };

      let errorCallback_original = errorCallback;
      errorCallback = function() {
        errorCallback_original.apply(this, arguments);
        window.removeEventListener('unload', onUnload, false);
      };

      try {
        return verifyLogon_original.call(this, config, inServer, alter, msgWindow, successCallback, errorCallback);
      } catch(e) {
        debugMessage('clear temporary incoming server (unknown error occurded):\n'+e+'\n'+e.stack);
        Services.accountManager.removeIncomingServer(inServer, true);
      }
    };
  }

  function suppressAccountDuplicationCheck() {
    let validateAndFinish_original = EmailConfigWizard.prototype.validateAndFinish;
    EmailConfigWizard.prototype.validateAndFinish = function () {
      let config = this.getConcreteConfig();

      let incomingServer = checkIncomingServerAlreadyExists(config);
      let outgoingServer = checkOutgoingServerAlreadyExists(config);

      if (incomingServer || outgoingServer) {
        debugMessage("incomingServer = "+incomingServer+" (override:"+preferences.get(PreferenceNames.overwriteExistingAccount_incomingServer, true)+")\n"+
                     "outgoingServer = "+outgoingServer+" (override:"+preferences.get(PreferenceNames.overwriteExistingAccount_outgoingServer, true)+")");
        if (incomingServer && !preferences.get(PreferenceNames.overwriteExistingAccount_incomingServer, true) ||
            outgoingServer && !preferences.get(PreferenceNames.overwriteExistingAccount_outgoingServer, true)) {
          Util.alert(
            Messages.getLocalized("alertExistingServers.title"),
            Messages.getLocalized("alertExistingServers.text"),
            window
          );
          return resetStatus();
        } else {
          const removeButtonIndex = 0;
          let serverType = incomingServer ? "all" : "outgoingServer" ;
          if (Util.confirmEx(
                window,
                StringBundle.achook.GetStringFromName("confirmRemoveExistingServers."+serverType+".title"),
                StringBundle.achook.GetStringFromName("confirmRemoveExistingServers."+serverType+".text"),
                Ci.nsIPromptService.BUTTON_POS_0 * Ci.nsIPromptService.BUTTON_TITLE_IS_STRING |
                Ci.nsIPromptService.BUTTON_POS_1 * Ci.nsIPromptService.BUTTON_TITLE_IS_STRING,
                StringBundle.achook.GetStringFromName("confirmRemoveExistingServers."+serverType+".remove"),
                StringBundle.achook.GetStringFromName("confirmRemoveExistingServers."+serverType+".keep"),
                null
              ) != removeButtonIndex) {
            // nothing to do
            return resetStatus();
          }
        }

        try {
          if (incomingServer) {
            debugMessage("deleting existing incoming server");
            Services.accountManager.removeIncomingServer(incomingServer, true);
          }
        } catch (x) {
          debugMessage(x);
        }

        try {
          if (outgoingServer) {
            debugMessage("deleting existing outgoing server");
            Services.smtpService.deleteSmtpServer(outgoingServer);
            beforeSMTPServerKeys = Util.toArray(smtpManager.smtpServers, Ci.nsISmtpServer).map(function (server) server.key);
          }
        } catch (x) {
          debugMessage(x);
        }

        existingAccountRemoved = true;
      }

      return validateAndFinish_original.apply(this, arguments);
    };
  }

  function shouldUseStaticConfig() {
    if (preferences.get(PreferenceNames.disableGenericWizard))
      return true;

    var arg = window.arguments && window.arguments.length > 0 && window.arguments[0];
    return arg && arg.extraData && arg.extraData.__achook__staticConfig;
  }

  function useStaticConfig() {
    var originalFetchConfigFromDisk = window.fetchConfigFromDisk;
    window.fetchConfigFromDisk = function ACHook_fetchConfigFromDisk(domain, successCallback, errorCallback) {
      elements.stopButton.hidden = true;
      return new TimeoutAbortable(runAsync(function ACHook_asyncFetchConfigCallback() {
        try {
          lastConfigXML = StaticConfig.xml;
          if (!lastConfigXML)
            throw new Error("failed to load static config file");
          successCallback(readFromXML(lastConfigXML = new XML(lastConfigXML)));
          elements.statusMessage.textContent = "";
          window.setTimeout(function() {
            elements.createButton.click();
          }, 0);
        } catch (e) {
          elements.stopButton.hidden = false;
          debugMessage(e);
          errorCallback(e);
        }
      }));
    };
    elements.nextButton.label = elements.createButton.label;
  }

  function outputDebugMessages() {
    eval('EmailConfigWizard.prototype.findConfig = '+EmailConfigWizard.prototype.findConfig.toSource()
      .replace(
        /(gEmailWizardLogger.info\(("[^"]+")\))/g,
        'debugMessage($2); $1'
      )
      .replace(
        /((?:this|self)\.(?:switchToMode|startSpinner)\(("[^"]+")\))/g,
        'debugMessage($2); $1'
      )
      .replace(
        '{',
        '{ debugMessage("domain = "+domain+" / email = " + email);'
      )
      .replace(
        /(function\s*\(e\)\s*\{)/,
        '$1 debugMessage("error : "+e);'
      )
    );
  }

  function concreteValue(aValue, aVariables) {
    Object.keys(aVariables).forEach(function(aKey) {
      aValue = aValue.replace(new RegExp("%"+aKey+"%", "gi"), aVariables[aKey]);
    });
    return aValue;
  }

  function setAccountValue(aTarget, aKey, aValue, aVariables) {
    if (!(aKey in aTarget))
      return "unknown key "+aKey+"="+aValue;

    switch (typeof aTarget[aKey]) {
      case "object":
        if (aTarget[aKey] !== null)
          return "object type key cannot be updated: "+aKey+"="+aValue+" ("+aTarget[aKey]+")";
      case "string":
        aValue = String(aValue);
        aValue = concreteValue(aValue, aVariables);
        break;
      case "number":
        aValue = Number(aValue);
        break;
      case "boolean":
        aValue = stringToBoolean(aValue);
        break;
      default:
        return "object type key cannot be updated: "+aKey+"="+aValue+" ("+(typeof aTarget[aKey])+")";
    }
    aTarget[aKey] = aValue;
    return "override "+aKey+"="+aValue+" for "+aTarget;
  }

  function extractKeyValuesFromXML(xml) {
    return [[property.localName(), property.text()]
            for each (property in xml)
            if (property.children().length())];
  }

  function setAccountValueFromKeyValues(target, keyValues, aVariables) {
    var results = keyValues.map(function ([key, value]) {
          try {
            return setAccountValue(target, key, value, aVariables);
          } catch (x) {
            return "Error while setting the property " + key + ":\n" + x;
          }
        });
    debugMessage("setAccountValueFromKeyValues for "+target+"\n"+results.join("\n"));
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

  function applyCustomPrettyName(incomingServer, identity, format) {
    let constructedPrettyName = String(format);

    let serverPort = incomingServer.port;
    let defaultServerPort = Services.imapProtocolInfo.getDefaultServerPort(false);
    let isDefaultPort = serverPort == defaultServerPort;

    let replacePairs = [
      [/%emailaddress%/gi, identity.email],
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

    var variables = {};

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

      var identity = account.defaultIdentity.QueryInterface(Ci.nsIMsgIdentity);
      variables.USERNAME = incomingServer.username;
      variables.EMAILADDRESS = identity.email;
      variables.EMAILLOCALPART = identity.email.split("@")[0];
      variables.EMAILDOMAIN = identity.email.split("@")[1];
      variables.REALNAME = identity.fullName;

      setAccountValueFromKeyValues(
        incomingServer,
        extractKeyValuesFromXML(config..incomingServer.ACHOOK::*),
        variables
      );

      setAccountValueFromKeyValues(
        identity,
        extractKeyValuesFromXML(config..identity.ACHOOK::*),
        variables
      );
    });

    var afterSMTPServers = Util.toArray(smtpManager.smtpServers, Ci.nsISmtpServer);
    var createdSMTPServers = afterSMTPServers.filter(function (server) beforeSMTPServerKeys.indexOf(server.key) < 0);
    createdSMTPServers.forEach(function (server) {
      server = server.QueryInterface(Ci.nsISmtpServer);
      setAccountValueFromKeyValues(
        server,
        extractKeyValuesFromXML(config..outgoingServer.ACHOOK::*),
        variables
      );
    });

    var createdAccount = createdAccounts[0] || null;
    if (createdAccount) {
      // When accounts are created, dispatch account-created event for the first account.
      var createdSMTPServer = createdSMTPServers[0] || null;
      var createdAccountIncomingServer = createdAccount.incomingServer;

      var prettyNameFormat = config.emailProvider.ACHOOK::prettyNameFormat;
      if (prettyNameFormat && prettyNameFormat.text())
        applyCustomPrettyName(
          createdAccountIncomingServer,
          createdAccount.defaultIdentity.QueryInterface(Ci.nsIMsgIdentity),
          prettyNameFormat.text()
        );

      dispatchAccountCreatedEvent(createdAccount, createdSMTPServer);
    }
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
