var xml = '<?xml version="1.0"?>' +
'<!-- This Source Code Form is subject to the terms of the Mozilla Public' +
'   - License, v. 2.0. If a copy of the MPL was not distributed with this' +
'   - file, You can obtain one at http://mozilla.org/MPL/2.0/. -->' +
'<!-- See: https://wiki.mozilla.org/Thunderbird:Autoconfiguration:ConfigFileFormat -->' +
'<clientConfig version="1.1"' +
'  xmlns:achook="http://www.clear-code.com/thunderbird/achook">' +
'  <emailProvider id="example.com">' +
'    <domain>example.com</domain>' +

'    <displayName>Example Mail</displayName>' +
'    <displayShortName>Example Mail</displayShortName>' +

'    <!--' +
'     "%USERNAME%"      local part of the incomintServer.username' +
'     "%REAL_USERNAME%" incomintServer.username' +
'     "%HOSTNAME%"      incomingServer.hostName' +
'     "%PORT%"          incomingServer.port' +
'     "%NOT_DEFAULT_PORT_EXPRESSION%" ":8080" etc.' +

'     defualt: %USERNAME%@%HOSTNAME%%NOT_DEFAULT_PORT_EXPRESSION% ' +
'    -->' +
'    <achook:prettyNameFormat>%USERNAME%</achook:prettyNameFormat>' +

'    <incomingServer type="imap">' +
'      <hostname>imap.example.com</hostname>' +
'      <port>143</port>' +
'      <!-- "plain", "SSL" or "STARTTLS" -->' +
'      <socketType>plain</socketType>' +
'      <!-- "%EMAILADDRESS%", "%EMAILLOCALPART%", "%EMAILDOMAIN%", "%REALNAME%", or "%USERNAME%" (* it is achook specific) -->' +
'      <username>%USERNAME%</username>' +
'      <!-- "password-cleartext", "password-encrypted", "NTLM", "GSSAPI", "client-IP-address", "TLS-client-cert" or "none" -->' +
'      <authentication>password-cleartext</authentication>' +

'      <!-- you can disable account verification -->' +
'      <!--achook:requireVerification>false</achook:requireVerification-->' +

'      <!-- from nsIMsgIncomingServer -->' +
'      <achook:downloadOnBiff/>' +
'      <achook:doBiff/>' +
'      <achook:biffMinutes/>' +
'      <achook:emptyTrashOnExit/>' +
'      <achook:loginAtStartUp>true</achook:loginAtStartUp>' +
'      <achook:limitOfflineMessageSize/>' +
'      <achook:maxMessageSize/>' +
'      <achook:offlineSupportLevel/>' +
'      <achook:defaultCopiesAndFoldersPrefsToServer/>' +
'      <achook:canCreateFoldersOnServer/>' +
'      <achook:canFileMessagesOnServer/>' +
'      <achook:incomingDuplicateAction/>' +

'      <!-- from nsIImapIncomingServer -->' +
'      <achook:maximumConnectionsNumber/>' +
'      <achook:timeOutLimits/>' +
'      <achook:adminUrl/>' +
'      <achook:serverDirectory/>' +
'      <achook:capabilityPref/>' +
'      <achook:serverIDPref/>' +
'      <achook:cleanupInboxOnExit>true</achook:cleanupInboxOnExit>' +
'      <achook:deleteModel>0</achook:deleteModel>' +
'      <achook:dualUseFolders/>' +
'      <achook:emptyTrashThreshhold/>' +
'      <achook:personalNamespace/>' +
'      <achook:publicNamespace/>' +
'      <achook:otherUsersNamespace/>' +
'      <achook:offlineDownload/>' +
'      <achook:overrideNamespaces/>' +
'      <achook:usingSubscription/>' +
'      <achook:manageMailAccountUrl/>' +
'      <achook:fetchByChunks/>' +
'      <achook:mimePartsOnDemand/>' +
'      <achook:sendID/>' +
'      <achook:isAOLServer/>' +
'      <achook:useIdle/>' +
'      <achook:checkAllFoldersForNew/>' +
'      <achook:isGMailServer/>' +
'      <achook:useCondStore/>' +
'      <achook:useCompressDeflate/>' +
'      <achook:trashFolderName/>' +
'      <achook:downloadBodiesOnGetNewMail/>' +
'      <achook:autoSyncOfflineStores/>' +
'      <achook:autoSyncMaxAgeDays/>' +
'    </incomingServer>' +

'    <outgoingServer type="smtp">' +
'      <hostname>smtp.example.com</hostname>' +
'      <port>25</port>' +
'      <!-- "plain", "SSL" or "STARTTLS" -->' +
'      <socketType>plain</socketType>' +
'      <username>%EMAILLOCALPART%</username>' +
'      <!-- "password-cleartext", "password-encrypted", "NTLM", "GSSAPI", "client-IP-address", "TLS-client-cert" or "none" -->' +
'      <authentication>password-cleartext</authentication>' +
'    </outgoingServer>' +

'    <identity>' +
'      <!-- from nsIMsgIdentity -->' +
'      <!-- You can use the value "%INHERIT%" to inherit settings from the existing default account.' +
'           If there is no default account, it means nothing. -->' +
'      <achook:fullName/>' +
'      <achook:email/>' +
'      <achook:replyTo/>' +
'      <achook:organization/>' +
'      <achook:composeHtml>false</achook:composeHtml>' +
'      <achook:attachSignature>%INHERIT%</achook:attachSignature>' +
'      <achook:attachVCard/>' +
'      <achook:autoQuote/>' +
'      <achook:replyOnTop/>' +
'      <achook:sigBottom/>' +
'      <achook:sigOnForward/>' +
'      <achook:sigOnReply/>' +
'      <achook:htmlSigText>%INHERIT%</achook:htmlSigText>' +
'      <achook:htmlSigFormat>%INHERIT%</achook:htmlSigFormat>' +
'      <achook:suppressSigSep/>' +
'      <achook:escapedVCard/>' +
'      <achook:doFcc>true</achook:doFcc>' +
'      <achook:fccFolder>mailbox://nobody@Local%20Folders/Sent</achook:fccFolder>' +
'      <achook:fccReplyFollowsParent/>' +
'      <achook:fccFolderPickerMode/>' +
'      <achook:draftsFolderPickerMode/>' +
'      <achook:archivesFolderPickerMode/>' +
'      <achook:tmplFolderPickerMode/>' +
'      <achook:doCc/>' +
'      <achook:doCcList/>' +
'      <achook:doBcc/>' +
'      <achook:doBccList/>' +
'      <achook:draftFolder>mailbox://nobody@Local%20Folders/Drafts</achook:draftFolder>' +
'      <achook:archiveFolder>mailbox://nobody@Local%20Folders/Archives</achook:archiveFolder>' +
'      <achook:stationeryFolder>mailbox://nobody@Local%20Folders/Templates</achook:stationeryFolder>' +
'      <achook:archiveEnabled/>' +
'      <achook:archiveGranularity/>' +
'      <achook:archiveKeepFolderStructure/>' +
'      <achook:showSaveMsgDlg/>' +
'      <achook:directoryServer/>' +
'      <achook:overrideGlobalPref/>' +
'      <achook:autocompleteToMyDomain/>' +
'      <achook:requestReturnReceipt/>' +
'      <achook:receiptHeaderType/>' +
'      <achook:requestDSN/>' +
'    </identity>' +
'  </emailProvider>' +
'</clientConfig>';

var DOMParser = Cc['@mozilla.org/xmlextras/domparser;1']
                  .createInstance(Ci.nsIDOMParser);
xml = DOMParser.parseFromString(xml, 'text/xml');
xml = JXON.build(xml, 2);
_setClipBoard(JSON.stringify(xml));

