/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["Services"];

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
var { XPCOMUtils } = Cu.import("resource://gre/modules/XPCOMUtils.jsm", {});

var Services = {};

function setService() {
  var args = Array.slice(arguments, 0);
  args.unshift(Services);
  XPCOMUtils.defineLazyServiceGetter.apply(XPCOMUtils, args);
}

setService("accountManager", "@mozilla.org/messenger/account-manager;1", "nsIMsgAccountManager");
setService("smtpService", "@mozilla.org/messengercompose/smtp;1", "nsISmtpService");
setService("userInfo", "@mozilla.org/userinfo;1", "nsIUserInfo");
setService("prefBranch", "@mozilla.org/preferences-service;1", "nsIPrefBranch2");
setService("imapProtocolInfo", "@mozilla.org/messenger/protocol/info;1?type=imap", "nsIMsgProtocolInfo");
setService("sBundleService", "@mozilla.org/intl/stringbundle;1", "nsIStringBundleService");
setService("prompts", "@mozilla.org/embedcomp/prompt-service;1", "nsIPromptService");
