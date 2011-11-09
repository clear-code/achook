var EXPORTED_SYMBOLS = ["Util"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

const { Browser } = Cu.import('resource://nc4migrator-modules/Browser.js', {});
const { Deferred } = Cu.import('resource://nc4migrator-modules/jsdeferred.js', {});
const { NetUtil } = Cu.import("resource://gre/modules/NetUtil.jsm", {});
const { StringBundle } = Cu.import("resource://nc4migrator-modules/StringBundle.js", {});

const Application = Cc['@mozilla.org/steel/application;1']
  .getService(Ci.steelIApplication);

var Util = {
  DEBUG: false,

  getEnv: function (aName, aDefault) {
    var env = Cc['@mozilla.org/process/environment;1']
      .getService(Ci.nsIEnvironment);

    return env.exists(aName) ?
      env.get(aName) : (1 in arguments ? arguments[1] : null);
  },

  or: function (aValue, aDefault) {
    return typeof aValue === "undefined" ? aDefault : aValue;
  },

  openFile: function (aPath) {
    let file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    file.initWithPath(aPath);

    return file;
  },

  getFile: function (aTarget) {
    let file;
    if (aTarget instanceof Ci.nsIFile) {
      file = aTarget.clone();
    } else {
      file = Util.openFile(aTarget);
    }

    return file;
  },

  readFile: function (aTarget, aOptions) {
    aOptions = aOptions || {};

    let file = Util.getFile(aTarget);
    if (!file.exists())
      throw new Error(file.path + " not found");

    let fileStream = Cc["@mozilla.org/network/file-input-stream;1"]
      .createInstance(Ci.nsIFileInputStream);
    fileStream.init(file,
                    Util.or(aOptions.ioFlags, 1),
                    Util.or(aOptions.permission, 0),
                    Util.or(aOptions.behaviorFlags, false));

    let converter = aOptions.converter;
    if (!converter) {
      converter = Cc["@mozilla.org/intl/converter-input-stream;1"]
        .createInstance(Ci.nsIConverterInputStream);

      converter.init(fileStream,
                     Util.or(aOptions.charset, 'UTF-8'),
                     fileStream.available(),
                     converter.DEFAULT_REPLACEMENT_CHARACTER);
    }

    let out = {};
    converter.readString(fileStream.available(), out);
    fileStream.close();

    return out.value;
  },

  writeFile: function (aTarget, aData, aOptions) {
    aOptions = aOptions || {};

    let file = Util.getFile(aTarget);
    if (file.exists() && !Util.or(aOptions.overwrite, true))
      throw new Error(file.path + " already exists");

    let fileStream = Cc["@mozilla.org/network/file-output-stream;1"]
      .createInstance(Ci.nsIFileOutputStream);
    fileStream.init(file,
                    Util.or(aOptions.ioFlags, 0x02 | 0x08 | 0x20),
                    Util.or(aOptions.permission, 0644),
                    Util.or(aOptions.behaviorFlags, false));

    let wrote = fileStream.write(aData, aData.length);
    if (wrote != aData.length)
      throw new Error("Failed to write data to " + file.path);

    fileStream.close();

    return wrote;
  },

  copyFileAsync: function (fromFile, toFile, callback) {
    let ostream = Cc["@mozilla.org/network/file-output-stream;1"].
      createInstance(Ci.nsIFileOutputStream);
    ostream.init(toFile, -1, -1, 0);

    let istream = Cc['@mozilla.org/network/file-input-stream;1']
          .createInstance(Ci.nsIFileInputStream);
    istream.init(fromFile, -1, -1, 0);

    NetUtil.asyncCopy(istream, ostream, function (resCode) {
      try {
        ostream.close();
      } catch ([]) {}
      try {
        istream.close();
      } catch ([]) {}
      if (typeof callback === "function")
        callback(Components.isSuccessCode(resCode));
    });
  },

  deferredCopyFile: function (fromFile, toFile) {
    var deferred = new Deferred();
    Util.copyFileAsync(fromFile, toFile, function (succeeded) {
      deferred.call(succeeded);
    });
    return deferred;
  },

  deferredCopyDirectory: function (fromDir, toDir, fileTransformer, onProgress) {
    return Deferred.next(function () {
      var deferreds = [];
      var entries = fromDir.directoryEntries;

      if (typeof onProgress === "function") {
        try {
          onProgress();
        } catch (x) {
          Util.log("deferredCopyDirectory: onProgress: " + x);
        }
      }

      if (typeof fileTransformer === "function") {
        try {
          let transformed = fileTransformer(toDir, fromDir);
          if (transformed && transformed != toDir)
            toDir = transformed;
        } catch (x) {
          Util.log("deferredCopyDirectory: " + x);
        }
      }

      if (!toDir.exists())
        toDir.create(Ci.nsIFile.DIRECTORY_TYPE, 0775); // XXX: permission

      while (entries.hasMoreElements()) {
        let nextFromFile = entries.getNext().QueryInterface(Ci.nsIFile);
        let nextToFile   = let (cloned = toDir.clone()) (cloned.append(nextFromFile.leafName), cloned);
        if (nextFromFile.isDirectory())
          deferreds.push(Util.deferredCopyDirectory(nextFromFile, nextToFile, fileTransformer));
        else
          deferreds.push(Util.deferredCopyFile(nextFromFile, nextToFile));
      }

      if (!deferreds.length)
        return true;

      var deferred = new Deferred();
      // Call Util.deferredCopyDirectory() and Util.deferredCopyFile() asynchronously
      Deferred.parallel(deferreds).next(function (results) {
        // Because results and deferreds have different global object,
        // jsdeferred doesn't set "length" property of results.
        // We have to set results.length explicitly.
        results.length = deferreds.length;
        deferred.call(Array.every(results, function (result) result));
      });

      return deferred;
    });
  },

  readJSON: function (aTarget) {
    return JSON.stringify(Util.readFile(aTarget));
  },

  writeJSON: function (aTarget, aObject) {
    return Util.writeFile(aTarget, JSON.stringify(aObject));
  },

  getSpecialDirectory: function (aProp) {
    var dirService = Cc['@mozilla.org/file/directory_service;1']
      .getService(Ci.nsIProperties);

    return dirService.get(aProp, Ci.nsILocalFile);
  },

  copyDirectoryAs: function (source, dest) {
    let sourceDir = this.getFile(source);
    let destDir = this.getFile(dest);

    if (destDir.exists())
      destDir.remove(true);
    sourceDir.copyTo(destDir.parent, destDir.leafName);
  },

  getRootDrives: function () {
    const FileProtocolHandler = Cc["@mozilla.org/network/protocol;1?name=file"]
      .getService(Ci.nsIFileProtocolHandler);
    const RDF = Cc["@mozilla.org/rdf/rdf-services;1"].getService(Ci.nsIRDFService);
    const NC_ROOT = "NC:FilesRoot",
    NC_CHILD = "http://home.netscape.com/NC-rdf#child";

    var rdfFiles = RDF.GetDataSource("rdf:files");
    var enumerator = rdfFiles.GetTargets(NC_ROOT, NC_CHILD, true); // nsISimpleEnumerator
    var drives = [];
    while (enumerator.hasMoreElements()){
      var resource = enumerator.getNext().QueryInterface(Ci.nsIRDFResource);
      var file = FileProtocolHandler.getFileFromURLSpec(resource.Value);
      drives.push(file);
    }

    return drives;
  },

  readDirectory: function (directory) {
    directory = Util.getFile(directory);

    if (directory.exists() && directory.isDirectory()) {
      let entries = directory.directoryEntries;
      let array = [];
      while (entries.hasMoreElements())
        array.push(entries.getNext().QueryInterface(Ci.nsIFile));
      return array;
    }

    return null;
  },

  traverseDirectory: function (directory, visitor) {
    try {
      visitor(directory);
    } catch (x) {
      Util.log("traverseDirectory: " + x);
    }

    if (directory.isDirectory()) {
      let entries = directory.directoryEntries;
      while (entries.hasMoreElements()) {
        let nextDir = entries.getNext().QueryInterface(Ci.nsIFile);
        Util.traverseDirectory(nextDir, visitor);
      }
    }
  },

  deferredTraverseDirectory: function (directory, visitor, timeout) {
    if (!directory)
      return Deferred.next(function() {
               return true;
             });

    return Deferred.next(function() {
             var result;
             try {
               result = visitor(directory);
             } catch (x) {
               Util.log("deferredTraverseDirectory: " + x);
             }

             if (result === false)
               return false;

             try{
               if (!directory.isDirectory())
                 return result;

               var deferreds = [];
               var entries = directory.directoryEntries;
             } catch (x) {
               Util.log("deferredTraverseDirectory: " + x);
               return result;
             }

             while (entries.hasMoreElements()) {
               let nextDir = entries.getNext().QueryInterface(Ci.nsIFile);
               deferreds.push(Util.deferredTraverseDirectory(nextDir, visitor));
             }
             if (!deferreds.length)
               return result;

             var deferred = new Deferred();
             var timer;
             var traversing = Deferred.parallel(deferreds)
                                .next(function(results) {
                                  if (timer) timer.cancel();
                                  results.length = deferreds.length;
                                  deferred.call(Array.every(results, function(result) result ));
                                });
             if (timeout) {
               timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
               timer.initWithCallback(function() {
                 if (traversing) traversing.cancel();
                 deferred.call(false);
               }, timeout, timer.TYPE_ONE_SHOT);
             }
             return deferred;
           });
  },

  // getQuota: function () {
  // },

  // Get file for file-1, file-2, file-3, ...
  // Currently, for directory only (do not consider suffixes)
  getIdenticalFileFor: function (originalFile) {
    var parent       = originalFile.parent;
    var file         = originalFile;
    var originalName = originalFile.leafName;

    var i = 0;
    while (file.exists()) {
      file = parent.clone();
      file.append(originalName + "-" + (++i));
    }

    return file;
  },

  format: function (formatString) {
    formatString = "" + formatString;

    var values = Array.slice(arguments, 1);

    return formatString.replace(/%s/g, function () {
      return Util.or(values.shift(), "");
    });
  },

  formatBytes: function (bytes, base) {
    base = base || 1024;

    var notations = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];
    var number = bytes;

    while (number >= base && notations.length > 1) {
      number /= base;
      notations.shift();
    }

    return [number.toFixed(0), notations[0] + "B"];
  },

  formatTime: function formatTime(sec, precise) {
    precise = precise || 0;

    function formatter(number, bases) {
      let [base, name] = bases.shift();
      if ((number / base) >= 1 && bases.length)
        return formatter(number / base, bases);
      return [number.toFixed(precise), name];
    }

    return formatter(sec, [
      [60, StringBundle.nc4migrator.GetStringFromName("timeFormat_second")],
      [60, StringBundle.nc4migrator.GetStringFromName("timeFormat_minute")],
      [24, StringBundle.nc4migrator.GetStringFromName("timeFormat_hour")]
    ]);
  },

  log: function () {
    if (this.DEBUG)
      Application.console.log(Util.format.apply(Util, arguments));
  },

  _loader: null,
  loadSubScriptInEnvironment: function (path, context) {
    if (!this._loader)
      this._loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader);
    this._loader.loadSubScript("resource://nc4migrator-modules/eval.js", context);
    return context;
  },

  evalInContext: function (aCode, aContext) {
    const EVAL_ERROR  = "__nc4_eval_error";
    const EVAL_RESULT = "__nc4_eval_result";
    const EVAL_STRING = "__nc4_eval_string";

    try {
      if (!aContext)
        aContext = this.userContext;

      aContext[EVAL_ERROR]  = null;
      aContext[EVAL_STRING] = aCode;
      aContext[EVAL_RESULT] = null;

      Cc["@mozilla.org/moz/jssubscript-loader;1"]
        .getService(Ci.mozIJSSubScriptLoader)
        .loadSubScript("resource://nc4migrator-modules/eval.js", aContext);

      if (aContext[EVAL_ERROR])
        throw aContext[EVAL_ERROR];

      return aContext[EVAL_RESULT];
    } finally {
      delete aContext[EVAL_ERROR];
      delete aContext[EVAL_RESULT];
      delete aContext[EVAL_STRING];
    }
  },

  LOGGER_INDENTATION: 2,
  LOGGER_INDENT_CHAR: " ",
  logger: function (indent) {
    var self = {
      indent: indent || 0,
      next: function (f, self) {
        f.call(self, Util.logger(indent + Util.LOGGER_INDENTATION));
      },
      log: function (msg) {
        var indentedMsg = msg.split("\n").map(
          function (l)
          (new Array(self.indent)).join(Util.LOGGER_INDENT_CHAR)
        );
        Util.log(indentedMsg);
      }
    };

    return self;
  },

  generateUUID: function () {
    return Cc["@mozilla.org/uuid-generator;1"]
      .getService(Ci.nsIUUIDGenerator)
      .generateUUID();
  },

  openFileFromURL: function (urlSpec) {
    let ios = Cc['@mozilla.org/network/io-service;1']
          .getService(Ci.nsIIOService);
    var fileHandler = ios.getProtocolHandler('file')
          .QueryInterface(Ci.nsIFileProtocolHandler);
    return fileHandler.getFileFromURLSpec(urlSpec);
  },

  chromeToURLSpec: function (aUrl) {
    if (!aUrl || !(/^chrome:/.test(aUrl)))
      return null;

    let ios = Cc['@mozilla.org/network/io-service;1']
          .getService(Ci["nsIIOService"]);
    let uri = ios.newURI(aUrl, "UTF-8", null);
    let cr = Cc['@mozilla.org/chrome/chrome-registry;1']
          .getService(Ci.nsIChromeRegistry);
    let urlSpec = cr.convertChromeURL(uri).spec;

    return urlSpec;
  },

  launchProcess: function (exe, args) {
    let process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
    let exe = Util.getFile(exe);
    process.init(exe);
    process.run(false, args, args.length);
    return process;
  },

  commands: {
    diskfree: "chrome://nc4migrator/content/bin/diskfree.bat"
  },

  get diskFreeCommand() {
    return Util.openFileFromURL(
      Util.chromeToURLSpec(Util.commands.diskfree)
    );
  },

  get getDiskSpace() {
    if (!this._getDiskSpace) {
      let { ctypes } = Cu.import("resource://gre/modules/ctypes.jsm", {});
      this._getDiskSpace = !!ctypes.ArrayType
        ? Cu.import('resource://nc4migrator-modules/diskspace.win32.js', {}).getDiskSpace
        : null;
    }

    return this._getDiskSpace;
  },

  getDiskQuota: function (targetDirectory) {
    targetDirectory = Util.getFile(targetDirectory);

    let getDiskSpace = this.getDiskSpace;

    if (!getDiskSpace)
      return this.getDiskQuotaLegacy(targetDirectory);

    let tryCount = 0;
    const tryCountMax = 42;
    return Deferred.next(function tryGetDiskSpace() {
      tryCount++;
      let size = getDiskSpace(targetDirectory);
      return size < 0 && tryCount < tryCountMax ? Deferred.wait(0.3).next(tryGetDiskSpace) : size;
    });
  },

  // legacy version for Gecko 1.9.2 or olders
  getDiskQuotaLegacy: function (targetDirectory) {
    let tmpFile = Util.getSpecialDirectory("TmpD");
    tmpFile.append(Util.generateUUID());
    if (tmpFile.exists())
      tmpFile.remove(true);

    let args = [targetDirectory.path, tmpFile.path];
    let process = Util.launchProcess(Util.diskFreeCommand, args);

    return Deferred
      .wait(0.1)
      .next(function tryToGetResult() {
        if (!tmpFile.exists())
          return Deferred.wait(0.1).next(tryToGetResult);
      })
      .next(function () {
        let tryCount = 0;
        return Deferred.next(function tryToParseResult() {
          tryCount++;
          let resultString = Util.readFile(tmpFile, {
            charset: "shift_jis"
          });
          let matchResult = resultString.match(/:[ \t]*([0-9]+)/);
          if (!matchResult) {
            if (tryCount < 50)
              return Deferred.wait(0.1).next(tryToParseResult);
          }
          let [, quotaString] = matchResult;
          return Number(quotaString);
        });
      })
      .next(function (quota) {
        let tryCount = 0;
        Deferred.next(function tryRemoveTempFile() {
          tryCount++;
          try {
            tmpFile.remove(true);
          } catch([]) {
            if (tryCount < 50)
              Deferred.wait(0.1).next(tryRemoveTempFile);
          }
        });

        return quota;
      })
      .error(function (error) {
        Util.log(error);
        return 0;
      });
  },

  restartApplication: function () {
    const nsIAppStartup = Ci.nsIAppStartup;

    let os         = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(Ci.nsISupportsPRBool);

    os.notifyObservers(cancelQuit, "quit-application-requested", null);
    if (cancelQuit.data)
      return;

    os.notifyObservers(null, "quit-application-granted", null);
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    let windows = wm.getEnumerator(null);

    while (windows.hasMoreElements()) {
      let win = windows.getNext();
      if (("tryToClose" in win) && !win.tryToClose())
        return;
    }

    Cc["@mozilla.org/toolkit/app-startup;1"].getService(nsIAppStartup)
      .quit(nsIAppStartup.eRestart | nsIAppStartup.eAttemptQuit);
  },

  getMainWindow: function () {
    return Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService(Ci.nsIWindowMediator)
      .getMostRecentWindow("mail:3pane");
  },

  openDialog: function (owner, url, name, features, arguments) {
    let windowWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"]
      .getService(Ci.nsIWindowWatcher);

    if (arguments !== undefined && arguments !== null) {
      let array = Cc["@mozilla.org/supports-array;1"]
                    .createInstance(Ci.nsISupportsArray);
      arguments.forEach(function(aItem) {
        if (aItem === null ||
          aItem === void(0) ||
          aItem instanceof Ci.nsISupports) {
          array.AppendElement(aItem);
        } else {
          let variant = Cc["@mozilla.org/variant;1"]
                        .createInstance(Ci.nsIVariant)
                        .QueryInterface(Ci.nsIWritableVariant);
          variant.setFromVariant(aItem);
          aItem = variant;
        }
        array.AppendElement(aItem);
      }, this);
      arguments = array;
    }

    windowWatcher.openWindow(owner || null, url, name, features, arguments || null);
  },

  // ============================================================
  // DOM
  // ============================================================

  alert: function (aTitle, aMessage, aWindow) {
    let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
          .getService(Ci.nsIPromptService);
    prompts.alert(aWindow, aTitle, aMessage);
  },

  alert2: function () {
    let message = Util.format.apply(Util, arguments);
    Util.alert("Alert", message);
  },

  confirmEx: function (parent, title, message, flags, firstbutton, secondbutton, thirdbutton, checkboxlabel, checked) {
    let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
          .getService(Ci.nsIPromptService);
    return prompts.confirmEx(
      parent || null,
      title,
      message,
      flags,
      firstbutton || null,
      secondbutton || null,
      thirdbutton || null,
      checkboxlabel || null,
      checked || {}
    );
  },

  getElementCreator: function (doc) {
    return function elementCreator(name, attrs, children) {
      let elem = doc.createElement(name);

      if (attrs)
        for (let [k, v] in Iterator(attrs))
          elem.setAttribute(k, v);

      if (children)
        for (let [, v] in Iterator(children))
          elem.appendChild(v);

      return elem;
    };
  },

  http: {
    params:
    function params(prm) {
      let pt = typeof prm;

      if (prm && pt === "object")
        prm = [k + "=" + v for ([k, v] in Iterator(prm))].join("&");
      else if (pt !== "string")
        prm = "";

      return prm;
    },

    request:
    function request(method, url, callback, params, opts) {
      opts = opts || {};

      let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
      req.QueryInterface(Ci.nsIXMLHttpRequest);

      const async = (typeof callback === "function");

      if (async)
        req.onreadystatechange = function () { if (req.readyState === 4) callback(req); };

      req.open(method, url, async, opts.username, opts.password);

      if (opts.raw)
        req.overrideMimeType('text/plain; charset=x-user-defined');

      for (let [name, value] in Iterator(opts.header || {}))
        req.setRequestHeader(name, value);

      req.send(params || null);

      return async ? void 0 : req;
    },

    get:
    function get(url, callback, params, opts) {
      params = this.params(params);
      if (params)
        url += "?" + params;

      return this.request("GET", url, callback, null, opts);
    },

    post:
    function post(url, callback, params, opts) {
      params = this.params(params);

      opts = opts || {};
      opts.header = opts.header || {};
      opts.header["Content-type"] = "application/x-www-form-urlencoded";
      opts.header["Content-length"] = params.length;
      opts.header["Connection"] = "close";

      return this.request("POST", url, callback, params, opts);
    }
  },

  toArray: function (enumerator, iface) {
    iface = iface || Ci.nsISupports;
    let array = [];

    if (enumerator instanceof Ci.nsISupportsArray) {
      let count = enumerator.Count();
      for (let i = 0; i < count; ++i)
        array.push(enumerator.QueryElementAt(i, iface));
    } else if (enumerator instanceof Ci.nsISimpleEnumerator) {
      while (enumerator.hasMoreElements())
        array.push(enumerator.getNext());
    }

    return array;
  },

  equal: function (a, b, propNames) {
    return propNames.every(function (propName) a[propName] === b[propName]);
  }
};
