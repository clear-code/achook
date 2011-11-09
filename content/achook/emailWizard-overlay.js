"use strict";

(function (exports) {
  const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

  const { Util } = Cu.import('resource://tg-modules/Util.js', {});
  const { Services } = Cu.import('resource://tg-modules/Services.js', {});
  const { Preferences } = Cu.import('resource://tg-modules/Preferences.js', {});
  const { PreferenceNames } = Cu.import('resource://tg-modules/PreferenceNames.js', {});
  const { StringBundle } = Cu.import("resource://tg-modules/StringBundle.js", {});

  const preferences = new Preferences("");

  function $(selector) document.querySelector(selector);
  let createElement = Util.getElementCreator(document);

  let elements = {
    get emailInputBox() $("#email"),
    get emailErrorIcon() $("#emailerroricon")
  };

  function buildView() {
    function getCurrentMailAddress() elements.emailLocalPartInputBox.value
      + "@" + preferences.get(PreferenceNames.emailDomainPart);

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
        value: "@" + preferences.get(PreferenceNames.emailDomainPart)
      }),
      elements.emailNewElementsBase
    );

    // Create user number input box

    elements.accountInfoContainer.insertBefore(
      createElement("hbox", null, [
        createElement("label", {
          value: Services.
        }),
        createElement("textbox", {
          emptytext: "Worker number"
        })
      ]),
      elements.emailInfoContainer.nextSibling
    );

    // Hide default input box and arrange event listeners

    elements.emailInputBox.hidden = true;
    elements.emailLocalPartInputBox.addEventListener("blur", function () {
      elements.emailInputBox.value = getCurrentMailAddress();
      // alert(elements.emailInputBox.value);
    }, false);
  }

  buildView();
})(window);
