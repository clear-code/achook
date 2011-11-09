"use strict";

(function (exports) {
  const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

  const { Util } = Cu.import('resource://achook-modules/Util.js', {});
  const { Services } = Cu.import('resource://achook-modules/Services.js', {});
  const { Preferences } = Cu.import('resource://achook-modules/Preferences.js', {});
  const { PreferenceNames } = Cu.import('resource://achook-modules/PreferenceNames.js', {});

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
})(window);
