// prettier-ignore
// /node_modules/@promptbook/remote-server/umd/index.umd.js
// TODO: [🚋] There is a problem with the remote server handling errors and sending them back to the client

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('colors'), require('http'), require('socket.io'), require('spacetrim'), require('fs/promises'), require('child_process'), require('util'), require('path'), require('prettier'), require('prettier/parser-html'), require('waitasecond'), require('papaparse'), require('crypto-js'), require('crypto-js/enc-hex'), require('mime-types')) :
  typeof define === 'function' && define.amd ? define(['exports', 'colors', 'http', 'socket.io', 'spacetrim', 'fs/promises', 'child_process', 'util', 'path', 'prettier', 'prettier/parser-html', 'waitasecond', 'papaparse', 'crypto-js', 'crypto-js/enc-hex', 'mime-types'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["promptbook-remote-server"] = {}, global.colors, global.http, global.socket_io, global.spaceTrim, global.promises, global.child_process, global.util, global.path, global.prettier, global.parserHtml, global.waitasecond, global.papaparse, global.cryptoJs, global.hexEncoder, global.mimeTypes));
})(this, (function (exports, colors, http, socket_io, spaceTrim, promises, child_process, util, path, prettier, parserHtml, waitasecond, papaparse, cryptoJs, hexEncoder, mimeTypes) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var colors__default = /*#__PURE__*/_interopDefaultLegacy(colors);
  var http__default = /*#__PURE__*/_interopDefaultLegacy(http);
  var spaceTrim__default = /*#__PURE__*/_interopDefaultLegacy(spaceTrim);
  var parserHtml__default = /*#__PURE__*/_interopDefaultLegacy(parserHtml);
  var hexEncoder__default = /*#__PURE__*/_interopDefaultLegacy(hexEncoder);

  // ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
  /**
   * The version of the Book language
   *
   * @generated
   * @see https://github.com/webgptorg/book
   */
  var BOOK_LANGUAGE_VERSION = '1.0.0';
  /**
   * The version of the Promptbook engine
   *
   * @generated
   * @see https://github.com/webgptorg/promptbook
   */
  var PROMPTBOOK_ENGINE_VERSION = '0.83.0';
  /**
   * TODO: string_promptbook_version should be constrained to the all versions of Promptbook engine
   * Note: [💞] Ignore a discrepancy between file name and entity name
   */

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation.

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** */
  /* global Reflect, Promise */

  var extendStatics = function(d, b) {
      extendStatics = Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
          function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
      return extendStatics(d, b);
  };

  function __extends(d, b) {
      if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }

  var __assign = function() {
      __assign = Object.assign || function __assign(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
              s = arguments[i];
              for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
          }
          return t;
      };
      return __assign.apply(this, arguments);
  };

  function __awaiter(thisArg, _arguments, P, generator) {
      function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
      return new (P || (P = Promise))(function (resolve, reject) {
          function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
          function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
          function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
  }

  function __generator(thisArg, body) {
      var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
      function verb(n) { return function (v) { return step([n, v]); }; }
      function step(op) {
          if (f) throw new TypeError("Generator is already executing.");
          while (_) try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
              if (y = 0, t) op = [op[0] & 2, t.value];
              switch (op[0]) {
                  case 0: case 1: t = op; break;
                  case 4: _.label++; return { value: op[1], done: false };
                  case 5: _.label++; y = op[1]; op = [0]; continue;
                  case 7: op = _.ops.pop(); _.trys.pop(); continue;
                  default:
                      if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                      if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                      if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                      if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                      if (t[2]) _.ops.pop();
                      _.trys.pop(); continue;
              }
              op = body.call(thisArg, _);
          } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
          if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
      }
  }

  function __values(o) {
      var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
      if (m) return m.call(o);
      if (o && typeof o.length === "number") return {
          next: function () {
              if (o && i >= o.length) o = void 0;
              return { value: o && o[i++], done: !o };
          }
      };
      throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
  }

  function __read(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
          while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      }
      catch (error) { e = { error: error }; }
      finally {
          try {
              if (r && !r.done && (m = i["return"])) m.call(i);
          }
          finally { if (e) throw e.error; }
      }
      return ar;
  }

  function __spreadArray(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
          if (ar || !(i in from)) {
              if (!ar) ar = Array.prototype.slice.call(from, 0, i);
              ar[i] = from[i];
          }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
  }

  /**
   * Returns the same value that is passed as argument.
   * No side effects.
   *
   * Note: It can be usefull for:
   *
   * 1) Leveling indentation
   * 2) Putting always-true or always-false conditions without getting eslint errors
   *
   * @param value any values
   * @returns the same values
   * @private within the repository
   */
  function just(value) {
      if (value === undefined) {
          return undefined;
      }
      return value;
  }

  /**
   * Name for the Promptbook
   *
   * TODO: [🗽] Unite branding and make single place for it
   *
   * @public exported from `@promptbook/core`
   */
  var NAME = "Promptbook";
  /**
   * Email of the responsible person
   *
   * @public exported from `@promptbook/core`
   */
  var ADMIN_EMAIL = 'me@pavolhejny.com';
  /**
   * Name of the responsible person for the Promptbook on GitHub
   *
   * @public exported from `@promptbook/core`
   */
  var ADMIN_GITHUB_NAME = 'hejny';
  /**
   * When the title is not provided, the default title is used
   *
   * @public exported from `@promptbook/core`
   */
  var DEFAULT_BOOK_TITLE = "\u2728 Untitled Book";
  // <- TODO: [🧠] Better system for generator warnings - not always "code" and "by `@promptbook/cli`"
  /**
   * The maximum number of iterations for a loops
   *
   * @private within the repository - too low-level in comparison with other `MAX_...`
   */
  var LOOP_LIMIT = 1000;
  /**
   * Strings to represent various values in the context of parameter values
   *
   * @public exported from `@promptbook/utils`
   */
  var VALUE_STRINGS = {
      empty: '(nothing; empty string)',
      null: '(no value; null)',
      undefined: '(unknown value; undefined)',
      nan: '(not a number; NaN)',
      infinity: '(infinity; ∞)',
      negativeInfinity: '(negative infinity; -∞)',
      unserializable: '(unserializable value)',
  };
  /**
   * Small number limit
   *
   * @public exported from `@promptbook/utils`
   */
  var SMALL_NUMBER = 0.001;
  /**
   * Short time interval to prevent race conditions in milliseconds
   *
   * @private within the repository - too low-level in comparison with other `MAX_...`
   */
  var IMMEDIATE_TIME = 10;
  /**
   * Strategy for caching the intermediate results for knowledge sources
   *
   * @public exported from `@promptbook/core`
   */
  var DEFAULT_INTERMEDIATE_FILES_STRATEGY = 'HIDE_AND_KEEP';
  //                                                     <- TODO: [😡] Change to 'VISIBLE'
  /**
   * The maximum number of (LLM) tasks running in parallel
   *
   * @public exported from `@promptbook/core`
   */
  var DEFAULT_MAX_PARALLEL_COUNT = 5; // <- TODO: [🤹‍♂️]
  /**
   * The maximum number of attempts to execute LLM task before giving up
   *
   * @public exported from `@promptbook/core`
   */
  var DEFAULT_MAX_EXECUTION_ATTEMPTS = 3; // <- TODO: [🤹‍♂️]
  /**
   * Where to store the scrape cache
   *
   * Note: When the folder does not exist, it is created recursively
   *
   * @public exported from `@promptbook/core`
   */
  var DEFAULT_SCRAPE_CACHE_DIRNAME = './.promptbook/scrape-cache';
  // <- TODO: [🧜‍♂️]
  /**
   * @@@
   *
   * @public exported from `@promptbook/core`
   */
  var DEFAULT_CSV_SETTINGS = Object.freeze({
      delimiter: ',',
      quoteChar: '"',
      newline: '\n',
      skipEmptyLines: true,
  });
  /**
   * @@@
   *
   * @public exported from `@promptbook/core`
   */
  var DEFAULT_IS_VERBOSE = false;
  /**
   * @@@
   *
   * @public exported from `@promptbook/core`
   */
  var DEFAULT_IS_AUTO_INSTALLED = false;
  /**
   * @@@
   *
   * @private within the repository
   */
  var IS_PIPELINE_LOGIC_VALIDATED = just(
  /**/
  // Note: In normal situations, we check the pipeline logic:
  true);
  /**
   * Note: [💞] Ignore a discrepancy between file name and entity name
   * TODO: [🧠][🧜‍♂️] Maybe join remoteUrl and path into single value
   */

  /**
   * This error type indicates that you try to use a feature that is not available in the current environment
   *
   * @public exported from `@promptbook/core`
   */
  var EnvironmentMismatchError = /** @class */ (function (_super) {
      __extends(EnvironmentMismatchError, _super);
      function EnvironmentMismatchError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'EnvironmentMismatchError';
          Object.setPrototypeOf(_this, EnvironmentMismatchError.prototype);
          return _this;
      }
      return EnvironmentMismatchError;
  }(Error));

  /**
   * Detects if the code is running in a Node.js environment
   *
   * Note: `$` is used to indicate that this function is not a pure function - it looks at the global object to determine the environment
   *
   * @public exported from `@promptbook/utils`
   */
  var $isRunningInNode = new Function("\n    try {\n        return this === global;\n    } catch (e) {\n        return false;\n    }\n");

  /**
   * @@@
   *
   * @public exported from `@promptbook/node`
   */
  function $provideFilesystemForNode(options) {
      if (!$isRunningInNode()) {
          throw new EnvironmentMismatchError('Function `$provideFilesystemForNode` works only in Node.js environment');
      }
      (options || {}).isVerbose;
      return {
          stat: promises.stat,
          access: promises.access,
          constants: promises.constants,
          readFile: promises.readFile,
          writeFile: promises.writeFile,
          readdir: promises.readdir,
      };
  }
  /**
   * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
   */

  /**
   * This error type indicates that some part of the code is not implemented yet
   *
   * @public exported from `@promptbook/core`
   */
  var NotYetImplementedError = /** @class */ (function (_super) {
      __extends(NotYetImplementedError, _super);
      function NotYetImplementedError(message) {
          var _this = _super.call(this, spaceTrim.spaceTrim(function (block) { return "\n                    ".concat(block(message), "\n\n                    Note: This feature is not implemented yet but it will be soon.\n\n                    If you want speed up the implementation or just read more, look here:\n                    https://github.com/webgptorg/promptbook\n\n                    Or contact us on me@pavolhejny.com\n\n                "); })) || this;
          _this.name = 'NotYetImplementedError';
          Object.setPrototypeOf(_this, NotYetImplementedError.prototype);
          return _this;
      }
      return NotYetImplementedError;
  }(Error));

  /**
   * Make error report URL for the given error
   *
   * @private private within the repository
   */
  function getErrorReportUrl(error) {
      var report = {
          title: "\uD83D\uDC1C Error report from ".concat(NAME),
          body: spaceTrim__default["default"](function (block) { return "\n\n\n            `".concat(error.name || 'Error', "` has occurred in the [").concat(NAME, "], please look into it @").concat(ADMIN_GITHUB_NAME, ".\n\n            ```\n            ").concat(block(error.message || '(no error message)'), "\n            ```\n\n\n            ## More info:\n\n            - **Promptbook engine version:** ").concat(PROMPTBOOK_ENGINE_VERSION, "\n            - **Book language version:** ").concat(BOOK_LANGUAGE_VERSION, "\n            - **Time:** ").concat(new Date().toISOString(), "\n\n            <details>\n            <summary>Stack trace:</summary>\n\n            ## Stack trace:\n\n            ```stacktrace\n            ").concat(block(error.stack || '(empty)'), "\n            ```\n            </details>\n\n        "); }),
      };
      var reportUrl = new URL("https://github.com/webgptorg/promptbook/issues/new");
      reportUrl.searchParams.set('labels', 'bug');
      reportUrl.searchParams.set('assignees', ADMIN_GITHUB_NAME);
      reportUrl.searchParams.set('title', report.title);
      reportUrl.searchParams.set('body', report.body);
      return reportUrl;
  }

  /**
   * This error type indicates that the error should not happen and its last check before crashing with some other error
   *
   * @public exported from `@promptbook/core`
   */
  var UnexpectedError = /** @class */ (function (_super) {
      __extends(UnexpectedError, _super);
      function UnexpectedError(message) {
          var _this = _super.call(this, spaceTrim.spaceTrim(function (block) { return "\n                    ".concat(block(message), "\n\n                    Note: This error should not happen.\n                    It's probbably a bug in the pipeline collection\n\n                    Please report issue:\n                    ").concat(block(getErrorReportUrl(new Error(message)).href), "\n\n                    Or contact us on ").concat(ADMIN_EMAIL, "\n\n                "); })) || this;
          _this.name = 'UnexpectedError';
          Object.setPrototypeOf(_this, UnexpectedError.prototype);
          return _this;
      }
      return UnexpectedError;
  }(Error));

  /**
   * @@@
   *
   * Note: `$` is used to indicate that this function is not a pure function - it access global scope
   *
   *  @private internal function of `$Register`
   */
  function $getGlobalScope() {
      return Function('return this')();
  }

  /**
   * @@@
   *
   * @param text @@@
   * @returns @@@
   * @example 'HELLO_WORLD'
   * @example 'I_LOVE_PROMPTBOOK'
   * @public exported from `@promptbook/utils`
   */
  function normalizeTo_SCREAMING_CASE(text) {
      var e_1, _a;
      var charType;
      var lastCharType = 'OTHER';
      var normalizedName = '';
      try {
          for (var text_1 = __values(text), text_1_1 = text_1.next(); !text_1_1.done; text_1_1 = text_1.next()) {
              var char = text_1_1.value;
              var normalizedChar = void 0;
              if (/^[a-z]$/.test(char)) {
                  charType = 'LOWERCASE';
                  normalizedChar = char.toUpperCase();
              }
              else if (/^[A-Z]$/.test(char)) {
                  charType = 'UPPERCASE';
                  normalizedChar = char;
              }
              else if (/^[0-9]$/.test(char)) {
                  charType = 'NUMBER';
                  normalizedChar = char;
              }
              else {
                  charType = 'OTHER';
                  normalizedChar = '_';
              }
              if (charType !== lastCharType &&
                  !(lastCharType === 'UPPERCASE' && charType === 'LOWERCASE') &&
                  !(lastCharType === 'NUMBER') &&
                  !(charType === 'NUMBER')) {
                  normalizedName += '_';
              }
              normalizedName += normalizedChar;
              lastCharType = charType;
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (text_1_1 && !text_1_1.done && (_a = text_1.return)) _a.call(text_1);
          }
          finally { if (e_1) throw e_1.error; }
      }
      normalizedName = normalizedName.replace(/_+/g, '_');
      normalizedName = normalizedName.replace(/_?\/_?/g, '/');
      normalizedName = normalizedName.replace(/^_/, '');
      normalizedName = normalizedName.replace(/_$/, '');
      return normalizedName;
  }
  /**
   * TODO: Tests
   *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: 'Moje tabule' })).toEqual('/VtG7sR9rRJqwNEdM2/Moje tabule');
   *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: 'ěščřžžýáíúů' })).toEqual('/VtG7sR9rRJqwNEdM2/escrzyaieuu');
   *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: '  ahoj  ' })).toEqual('/VtG7sR9rRJqwNEdM2/ahoj');
   *     > expect(encodeRoutePath({ uriId: 'VtG7sR9rRJqwNEdM2', name: '  ahoj_ahojAhoj    ahoj  ' })).toEqual('/VtG7sR9rRJqwNEdM2/ahoj-ahoj-ahoj-ahoj');
   * TODO: [🌺] Use some intermediate util splitWords
   */

  /**
   * @@@
   *
   * @param text @@@
   * @returns @@@
   * @example 'hello_world'
   * @example 'i_love_promptbook'
   * @public exported from `@promptbook/utils`
   */
  function normalizeTo_snake_case(text) {
      return normalizeTo_SCREAMING_CASE(text).toLowerCase();
  }

  /**
   * Register is @@@
   *
   * Note: `$` is used to indicate that this function is not a pure function - it accesses and adds variables in global scope.
   *
   * @private internal utility, exported are only signleton instances of this class
   */
  var $Register = /** @class */ (function () {
      function $Register(registerName) {
          this.registerName = registerName;
          var storageName = "_promptbook_".concat(normalizeTo_snake_case(registerName));
          var globalScope = $getGlobalScope();
          if (globalScope[storageName] === undefined) {
              globalScope[storageName] = [];
          }
          else if (!Array.isArray(globalScope[storageName])) {
              throw new UnexpectedError("Expected (global) ".concat(storageName, " to be an array, but got ").concat(typeof globalScope[storageName]));
          }
          this.storage = globalScope[storageName];
      }
      $Register.prototype.list = function () {
          // <- TODO: ReadonlyDeep<ReadonlyArray<TRegistered>>
          return this.storage;
      };
      $Register.prototype.register = function (registered) {
          var packageName = registered.packageName, className = registered.className;
          var existingRegistrationIndex = this.storage.findIndex(function (item) { return item.packageName === packageName && item.className === className; });
          var existingRegistration = this.storage[existingRegistrationIndex];
          if (!existingRegistration) {
              this.storage.push(registered);
          }
          else {
              this.storage[existingRegistrationIndex] = registered;
          }
          return {
              registerName: this.registerName,
              packageName: packageName,
              className: className,
              get isDestroyed() {
                  return false;
              },
              destroy: function () {
                  throw new NotYetImplementedError("Registration to ".concat(this.registerName, " is permanent in this version of Promptbook"));
              },
          };
      };
      return $Register;
  }());

  /**
   * @@@
   *
   * Note: `$` is used to indicate that this interacts with the global scope
   * @singleton Only one instance of each register is created per build, but thare can be more @@@
   * @public exported from `@promptbook/core`
   */
  var $scrapersRegister = new $Register('scraper_constructors');
  /**
   * TODO: [®] DRY Register logic
   */

  /**
   * @@@
   *
   * 1) @@@
   * 2) @@@
   *
   * @public exported from `@promptbook/node`
   */
  function $provideScrapersForNode(tools, options) {
      return __awaiter(this, void 0, void 0, function () {
          var _a, scrapers, _d, _e, scraperFactory, scraper, e_1_1;
          var e_1, _f;
          return __generator(this, function (_g) {
              switch (_g.label) {
                  case 0:
                      if (!$isRunningInNode()) {
                          throw new EnvironmentMismatchError('Function `$getScrapersForNode` works only in Node.js environment');
                      }
                      _a = options || {}, _a.isAutoInstalled, _a.isVerbose;
                      scrapers = [];
                      _g.label = 1;
                  case 1:
                      _g.trys.push([1, 6, 7, 8]);
                      _d = __values($scrapersRegister.list()), _e = _d.next();
                      _g.label = 2;
                  case 2:
                      if (!!_e.done) return [3 /*break*/, 5];
                      scraperFactory = _e.value;
                      return [4 /*yield*/, scraperFactory(tools, options || {})];
                  case 3:
                      scraper = _g.sent();
                      scrapers.push(scraper);
                      _g.label = 4;
                  case 4:
                      _e = _d.next();
                      return [3 /*break*/, 2];
                  case 5: return [3 /*break*/, 8];
                  case 6:
                      e_1_1 = _g.sent();
                      e_1 = { error: e_1_1 };
                      return [3 /*break*/, 8];
                  case 7:
                      try {
                          if (_e && !_e.done && (_f = _d.return)) _f.call(_d);
                      }
                      finally { if (e_1) throw e_1.error; }
                      return [7 /*endfinally*/];
                  case 8: return [2 /*return*/, scrapers];
              }
          });
      });
  }
  /**
   * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
   */

  /**
   * This error indicates errors during the execution of the pipeline
   *
   * @public exported from `@promptbook/core`
   */
  var PipelineExecutionError = /** @class */ (function (_super) {
      __extends(PipelineExecutionError, _super);
      function PipelineExecutionError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'PipelineExecutionError';
          Object.setPrototypeOf(_this, PipelineExecutionError.prototype);
          return _this;
      }
      return PipelineExecutionError;
  }(Error));

  /**
   * This error indicates problems parsing the format value
   *
   * For example, when the format value is not a valid JSON or CSV
   * This is not thrown directly but in extended classes
   *
   * @public exported from `@promptbook/core`
   */
  var AbstractFormatError = /** @class */ (function (_super) {
      __extends(AbstractFormatError, _super);
      // Note: To allow instanceof do not put here error `name`
      // public readonly name = 'AbstractFormatError';
      function AbstractFormatError(message) {
          var _this = _super.call(this, message) || this;
          Object.setPrototypeOf(_this, AbstractFormatError.prototype);
          return _this;
      }
      return AbstractFormatError;
  }(Error));

  /**
   * This error indicates problem with parsing of CSV
   *
   * @public exported from `@promptbook/core`
   */
  var CsvFormatError = /** @class */ (function (_super) {
      __extends(CsvFormatError, _super);
      function CsvFormatError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'CsvFormatError';
          Object.setPrototypeOf(_this, CsvFormatError.prototype);
          return _this;
      }
      return CsvFormatError;
  }(AbstractFormatError));

  /**
   * This error indicates that the pipeline collection cannot be propperly loaded
   *
   * @public exported from `@promptbook/core`
   */
  var CollectionError = /** @class */ (function (_super) {
      __extends(CollectionError, _super);
      function CollectionError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'CollectionError';
          Object.setPrototypeOf(_this, CollectionError.prototype);
          return _this;
      }
      return CollectionError;
  }(Error));

  /**
   * This error occurs when some expectation is not met in the execution of the pipeline
   *
   * @public exported from `@promptbook/core`
   * Note: Do not throw this error, its reserved for `checkExpectations` and `createPipelineExecutor` and public ONLY to be serializable through remote server
   * Note: Always thrown in `checkExpectations` and catched in `createPipelineExecutor` and rethrown as `PipelineExecutionError`
   * Note: This is a kindof subtype of PipelineExecutionError
   */
  var ExpectError = /** @class */ (function (_super) {
      __extends(ExpectError, _super);
      function ExpectError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'ExpectError';
          Object.setPrototypeOf(_this, ExpectError.prototype);
          return _this;
      }
      return ExpectError;
  }(Error));

  /**
   * This error indicates that the promptbook can not retrieve knowledge from external sources
   *
   * @public exported from `@promptbook/core`
   */
  var KnowledgeScrapeError = /** @class */ (function (_super) {
      __extends(KnowledgeScrapeError, _super);
      function KnowledgeScrapeError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'KnowledgeScrapeError';
          Object.setPrototypeOf(_this, KnowledgeScrapeError.prototype);
          return _this;
      }
      return KnowledgeScrapeError;
  }(Error));

  /**
   * This error type indicates that some limit was reached
   *
   * @public exported from `@promptbook/core`
   */
  var LimitReachedError = /** @class */ (function (_super) {
      __extends(LimitReachedError, _super);
      function LimitReachedError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'LimitReachedError';
          Object.setPrototypeOf(_this, LimitReachedError.prototype);
          return _this;
      }
      return LimitReachedError;
  }(Error));

  /**
   * This error type indicates that some tools are missing for pipeline execution or preparation
   *
   * @public exported from `@promptbook/core`
   */
  var MissingToolsError = /** @class */ (function (_super) {
      __extends(MissingToolsError, _super);
      function MissingToolsError(message) {
          var _this = _super.call(this, spaceTrim.spaceTrim(function (block) { return "\n                    ".concat(block(message), "\n\n                    Note: You have probbably forgot to provide some tools for pipeline execution or preparation\n\n                "); })) || this;
          _this.name = 'MissingToolsError';
          Object.setPrototypeOf(_this, MissingToolsError.prototype);
          return _this;
      }
      return MissingToolsError;
  }(Error));

  /**
   * This error indicates that promptbook not found in the collection
   *
   * @public exported from `@promptbook/core`
   */
  var NotFoundError = /** @class */ (function (_super) {
      __extends(NotFoundError, _super);
      function NotFoundError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'NotFoundError';
          Object.setPrototypeOf(_this, NotFoundError.prototype);
          return _this;
      }
      return NotFoundError;
  }(Error));

  /**
   * This error indicates that the promptbook in a markdown format cannot be parsed into a valid promptbook object
   *
   * @public exported from `@promptbook/core`
   */
  var ParseError = /** @class */ (function (_super) {
      __extends(ParseError, _super);
      function ParseError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'ParseError';
          Object.setPrototypeOf(_this, ParseError.prototype);
          return _this;
      }
      return ParseError;
  }(Error));
  /**
   * TODO: Maybe split `ParseError` and `ApplyError`
   */

  /**
   * This error indicates that the promptbook object has valid syntax (=can be parsed) but contains logical errors (like circular dependencies)
   *
   * @public exported from `@promptbook/core`
   */
  var PipelineLogicError = /** @class */ (function (_super) {
      __extends(PipelineLogicError, _super);
      function PipelineLogicError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'PipelineLogicError';
          Object.setPrototypeOf(_this, PipelineLogicError.prototype);
          return _this;
      }
      return PipelineLogicError;
  }(Error));

  /**
   * This error indicates errors in referencing promptbooks between each other
   *
   * @public exported from `@promptbook/core`
   */
  var PipelineUrlError = /** @class */ (function (_super) {
      __extends(PipelineUrlError, _super);
      function PipelineUrlError(message) {
          var _this = _super.call(this, message) || this;
          _this.name = 'PipelineUrlError';
          Object.setPrototypeOf(_this, PipelineUrlError.prototype);
          return _this;
      }
      return PipelineUrlError;
  }(Error));

  /**
   * Index of all custom errors
   *
   * @public exported from `@promptbook/core`
   */
  var PROMPTBOOK_ERRORS = {
      AbstractFormatError: AbstractFormatError,
      CsvFormatError: CsvFormatError,
      CollectionError: CollectionError,
      EnvironmentMismatchError: EnvironmentMismatchError,
      ExpectError: ExpectError,
      KnowledgeScrapeError: KnowledgeScrapeError,
      LimitReachedError: LimitReachedError,
      MissingToolsError: MissingToolsError,
      NotFoundError: NotFoundError,
      NotYetImplementedError: NotYetImplementedError,
      ParseError: ParseError,
      PipelineExecutionError: PipelineExecutionError,
      PipelineLogicError: PipelineLogicError,
      PipelineUrlError: PipelineUrlError,
      UnexpectedError: UnexpectedError,
      // TODO: [🪑]> VersionMismatchError,
  };
  /**
   * Index of all javascript errors
   *
   * @private for internal usage
   */
  var COMMON_JAVASCRIPT_ERRORS = {
      Error: Error,
      EvalError: EvalError,
      RangeError: RangeError,
      ReferenceError: ReferenceError,
      SyntaxError: SyntaxError,
      TypeError: TypeError,
      URIError: URIError,
      AggregateError: AggregateError,
      /*
    Note: Not widely supported
    > InternalError,
    > ModuleError,
    > HeapError,
    > WebAssemblyCompileError,
    > WebAssemblyRuntimeError,
    */
  };
  /**
   * Index of all errors
   *
   * @private for internal usage
   */
  var ALL_ERRORS = __assign(__assign({}, PROMPTBOOK_ERRORS), COMMON_JAVASCRIPT_ERRORS);
  /**
   * Note: [💞] Ignore a discrepancy between file name and entity name
   */

  /**
   * Serializes an error into a [🚉] JSON-serializable object
   *
   * @public exported from `@promptbook/utils`
   */
  function serializeError(error) {
      var name = error.name, message = error.message, stack = error.stack;
      if (!Object.keys(ALL_ERRORS).includes(name)) {
          console.error(spaceTrim__default["default"](function (block) { return "\n          \n                    Cannot serialize error with name \"".concat(name, "\"\n\n                    ").concat(block(stack || message), "\n                \n                "); }));
      }


console.log('-------');
console.log(stack);
console.log('-------');


      return {
          name: name,
          message: message,
          stack: '---',
          /*
          stack: `
at new NotYetImplementedError (C:\\Users\\me\\work\\webgpt\\promptbook-studio\\src\\errors\\NotYetImplementedError.ts:11:9)
at PdfScraper.<anonymous> (C:\\Users\\me\\work\\webgpt\\promptbook-studio\\src\\scrapers\\pdf\\PdfScraper.ts:68:15)
at step (C:\\Users\\me\\work\\webgpt\\promptbook-studio\\node_modules\\node_modules\\tslib\\tslib.es6.js:102:23)
at Object.next (C:\\Users\\me\\work\\webgpt\\promptbook-studio\\node_modules\\node_modules\\tslib\\tslib.es6.js:83:53)
at C:\\Users\\me\\work\\webgpt\\promptbook-studio\\node_modules\\node_modules\\tslib\\tslib.es6.js:76:71
at new Promise (<anonymous>)
at __awaiter (C:\\Users\\me\\work\\webgpt\\promptbook-studio\\node_modules\\node_modules\\tslib\\tslib.es6.js:72:12)
at PdfScraper.scrape (C:\\Users\\me\\work\\webgpt\\promptbook-studio\\node_modules\\@promptbook\\pdf\\umd\\index.umd.js:6203:20)
at C:\\Users\\me\\work\\webgpt\\promptbook-studio\\src\\scrapers\\_common\\prepareKnowledgePieces.ts:45:79
at step (C:\\Users\\me\\work\\webgpt\\promptbook-studio\\node_modules\\node_modules\\tslib\\tslib.es6.js:102:23)
          `,
          */
          //message: message,
          //stack: stack,
      };
  }

  // Note: We want to use the `exec` as async function
  var exec$1 = util.promisify(child_process.exec);
  /**
   * @@@
   *
   * @private within the repository
   */
  function locateAppOnLinux(_a) {
      var appName = _a.appName, linuxWhich = _a.linuxWhich;
      return __awaiter(this, void 0, void 0, function () {
          var _b, stderr, stdout, error_1;
          return __generator(this, function (_c) {
              switch (_c.label) {
                  case 0:
                      _c.trys.push([0, 2, , 3]);
                      return [4 /*yield*/, exec$1("which ".concat(linuxWhich))];
                  case 1:
                      _b = _c.sent(), stderr = _b.stderr, stdout = _b.stdout;
                      if (!stderr && stdout) {
                          return [2 /*return*/, stdout.trim()];
                      }
                      throw new Error("Can not locate app ".concat(appName, " on Linux.\n ").concat(stderr));
                  case 2:
                      error_1 = _c.sent();
                      if (!(error_1 instanceof Error)) {console.log('!(error instanceof Error)')
                          throw error_1;
                      }
                      return [2 /*return*/, null];
                  case 3: return [2 /*return*/];
              }
          });
      });
  }
  /**
   * TODO: [🧠][♿] Maybe export through `@promptbook/node`
   * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
   */

  /**
   * Checks if the file is executable
   *
   * @private within the repository
   */
  function isExecutable(path, fs) {
      return __awaiter(this, void 0, void 0, function () {
          return __generator(this, function (_a) {
              switch (_a.label) {
                  case 0:
                      _a.trys.push([0, 2, , 3]);
                      return [4 /*yield*/, fs.access(path, fs.constants.X_OK)];
                  case 1:
                      _a.sent();
                      return [2 /*return*/, true];
                  case 2:
                      _a.sent();
                      return [2 /*return*/, false];
                  case 3: return [2 /*return*/];
              }
          });
      });
  }
  /**
   * Note: Not [~🟢~] because it is not directly dependent on `fs
   * TODO: [🖇] What about symlinks?
   */

  // Note: Module `userhome` has no types available, so it is imported using `require`
  //       @see https://stackoverflow.com/questions/37000981/how-to-import-node-module-in-typescript-without-type-definitions
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  var userhome = require('userhome');
  // Note: We want to use the `exec` as async function
  var exec = util.promisify(child_process.exec);
  /**
   * @@@
   *
   * @private within the repository
   */
  function locateAppOnMacOs(_a) {
      var appName = _a.appName, macOsName = _a.macOsName;
      return __awaiter(this, void 0, void 0, function () {
          var toExec, regPath, altPath, _b, stderr, stdout, error_1;
          return __generator(this, function (_c) {
              switch (_c.label) {
                  case 0:
                      _c.trys.push([0, 6, , 7]);
                      toExec = "/Contents/MacOS/".concat(macOsName);
                      regPath = "/Applications/".concat(macOsName, ".app") + toExec;
                      altPath = userhome(regPath.slice(1));
                      return [4 /*yield*/, isExecutable(regPath, $provideFilesystemForNode())];
                  case 1:
                      if (!_c.sent()) return [3 /*break*/, 2];
                      return [2 /*return*/, regPath];
                  case 2: return [4 /*yield*/, isExecutable(altPath, $provideFilesystemForNode())];
                  case 3:
                      if (_c.sent()) {
                          return [2 /*return*/, altPath];
                      }
                      _c.label = 4;
                  case 4: return [4 /*yield*/, exec("mdfind 'kMDItemDisplayName == \"".concat(macOsName, "\" && kMDItemKind == Application'"))];
                  case 5:
                      _b = _c.sent(), stderr = _b.stderr, stdout = _b.stdout;
                      if (!stderr && stdout) {
                          return [2 /*return*/, stdout.trim() + toExec];
                      }
                      throw new Error("Can not locate app ".concat(appName, " on macOS.\n ").concat(stderr));
                  case 6:
                      error_1 = _c.sent();
                      if (!(error_1 instanceof Error)) {console.log('!(error instanceof Error)')
                          throw error_1;
                      }
                      return [2 /*return*/, null];
                  case 7: return [2 /*return*/];
              }
          });
      });
  }
  /**
   * TODO: [🧠][♿] Maybe export through `@promptbook/node`
   * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
   */

  /**
   * @@@
   *
   * @private within the repository
   */
  function locateAppOnWindows(_a) {
      var appName = _a.appName, windowsSuffix = _a.windowsSuffix;
      return __awaiter(this, void 0, void 0, function () {
          var prefixes, prefixes_1, prefixes_1_1, prefix, path$1, e_1_1, error_1;
          var e_1, _b;
          return __generator(this, function (_c) {
              switch (_c.label) {
                  case 0:
                      _c.trys.push([0, 9, , 10]);
                      prefixes = [
                          process.env.LOCALAPPDATA,
                          path.join(process.env.LOCALAPPDATA || '', 'Programs'),
                          process.env.PROGRAMFILES,
                          process.env['PROGRAMFILES(X86)'],
                      ];
                      _c.label = 1;
                  case 1:
                      _c.trys.push([1, 6, 7, 8]);
                      prefixes_1 = __values(prefixes), prefixes_1_1 = prefixes_1.next();
                      _c.label = 2;
                  case 2:
                      if (!!prefixes_1_1.done) return [3 /*break*/, 5];
                      prefix = prefixes_1_1.value;
                      path$1 = prefix + windowsSuffix;
                      return [4 /*yield*/, isExecutable(path$1, $provideFilesystemForNode())];
                  case 3:
                      if (_c.sent()) {
                          return [2 /*return*/, path$1];
                      }
                      _c.label = 4;
                  case 4:
                      prefixes_1_1 = prefixes_1.next();
                      return [3 /*break*/, 2];
                  case 5: return [3 /*break*/, 8];
                  case 6:
                      e_1_1 = _c.sent();
                      e_1 = { error: e_1_1 };
                      return [3 /*break*/, 8];
                  case 7:
                      try {
                          if (prefixes_1_1 && !prefixes_1_1.done && (_b = prefixes_1.return)) _b.call(prefixes_1);
                      }
                      finally { if (e_1) throw e_1.error; }
                      return [7 /*endfinally*/];
                  case 8: throw new Error("Can not locate app ".concat(appName, " on Windows."));
                  case 9:
                      error_1 = _c.sent();
                      if (!(error_1 instanceof Error)) {console.log('!(error instanceof Error)')
                          throw error_1;
                      }
                      return [2 /*return*/, null];
                  case 10: return [2 /*return*/];
              }
          });
      });
  }
  /**
   * TODO: [🧠][♿] Maybe export through `@promptbook/node`
   * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
   */

  /**
   * Locates an application on the system
   *
   * @private within the repository
   */
  function locateApp(options) {
      if (!$isRunningInNode()) {
          throw new EnvironmentMismatchError('Locating apps works only in Node.js environment');
      }
      var appName = options.appName, linuxWhich = options.linuxWhich, windowsSuffix = options.windowsSuffix, macOsName = options.macOsName;
      if (process.platform === 'win32') {
          if (windowsSuffix) {
              return locateAppOnWindows({ appName: appName, windowsSuffix: windowsSuffix });
          }
          else {
              throw new Error("".concat(appName, " is not available on Windows."));
          }
      }
      else if (process.platform === 'darwin') {
          if (macOsName) {
              return locateAppOnMacOs({ appName: appName, macOsName: macOsName });
          }
          else {
              throw new Error("".concat(appName, " is not available on macOS."));
          }
      }
      else {
          if (linuxWhich) {
              return locateAppOnLinux({ appName: appName, linuxWhich: linuxWhich });
          }
          else {
              throw new Error("".concat(appName, " is not available on Linux."));
          }
      }
  }
  /**
   * TODO: [🧠][♿] Maybe export through `@promptbook/node`
   * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
   */

  /**
   * @@@
   *
   * @private within the repository
   */
  function locateLibreoffice() {
      return locateApp({
          appName: 'Libreoffice',
          linuxWhich: 'libreoffice',
          windowsSuffix: '\\LibreOffice\\program\\soffice.exe',
          macOsName: 'LibreOffice',
      });
  }
  /**
   * TODO: [🧠][♿] Maybe export through `@promptbook/node` OR `@promptbook/legacy-documents`
   * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
   */

  /**
   * @@@
   *
   * @private within the repository
   */
  function locatePandoc() {
      return locateApp({
          appName: 'Pandoc',
          linuxWhich: 'pandoc',
          windowsSuffix: '\\Pandoc\\pandoc.exe',
          macOsName: 'Pandoc',
      });
  }
  /**
   * TODO: [🧠][♿] Maybe export through `@promptbook/node` OR `@promptbook/documents`
   * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
   */

  /**
   * @@@
   *
   * @public exported from `@promptbook/node`
   */
  function $provideExecutablesForNode(options) {
      return __awaiter(this, void 0, void 0, function () {
          var _a;
          var _d;
          return __generator(this, function (_e) {
              switch (_e.label) {
                  case 0:
                      if (!$isRunningInNode()) {
                          throw new EnvironmentMismatchError('Function `$getScrapersForNode` works only in Node.js environment');
                      }
                      _a = options || {}, _a.isAutoInstalled, _a.isVerbose;
                      _d = {};
                      return [4 /*yield*/, locatePandoc()];
                  case 1:
                      _d.pandocPath = (_e.sent()) || undefined;
                      return [4 /*yield*/, locateLibreoffice()];
                  case 2: return [2 /*return*/, (_d.libreOfficePath = (_e.sent()) || undefined,
                          _d)];
              }
          });
      });
  }
  /**
   * TODO: [🧠] Allow to override the executables without need to call `locatePandoc` / `locateLibreoffice` in case of provided
   * Note: [🟢] Code in this file should never be never released in packages that could be imported into browser environment
   */

  /**
   * Multiple LLM Execution Tools is a proxy server that uses multiple execution tools internally and exposes the executor interface externally.
   *
   * Note: Internal utility of `joinLlmExecutionTools` but exposed type
   * @public exported from `@promptbook/core`
   */
  var MultipleLlmExecutionTools = /** @class */ (function () {
      /**
       * Gets array of execution tools in order of priority
       */
      function MultipleLlmExecutionTools() {
          var llmExecutionTools = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              llmExecutionTools[_i] = arguments[_i];
          }
          this.llmExecutionTools = llmExecutionTools;
      }
      Object.defineProperty(MultipleLlmExecutionTools.prototype, "title", {
          get: function () {
              return 'Multiple LLM Providers';
          },
          enumerable: false,
          configurable: true
      });
      Object.defineProperty(MultipleLlmExecutionTools.prototype, "description", {
          get: function () {
              return this.llmExecutionTools.map(function (_a, index) {
                  var title = _a.title;
                  return "".concat(index + 1, ") `").concat(title, "`");
              }).join('\n');
          },
          enumerable: false,
          configurable: true
      });
      /**
       * Check the configuration of all execution tools
       */
      MultipleLlmExecutionTools.prototype.checkConfiguration = function () {
          return __awaiter(this, void 0, void 0, function () {
              var _a, _b, llmExecutionTools, e_1_1;
              var e_1, _c;
              return __generator(this, function (_d) {
                  switch (_d.label) {
                      case 0:
                          _d.trys.push([0, 5, 6, 7]);
                          _a = __values(this.llmExecutionTools), _b = _a.next();
                          _d.label = 1;
                      case 1:
                          if (!!_b.done) return [3 /*break*/, 4];
                          llmExecutionTools = _b.value;
                          return [4 /*yield*/, llmExecutionTools.checkConfiguration()];
                      case 2:
                          _d.sent();
                          _d.label = 3;
                      case 3:
                          _b = _a.next();
                          return [3 /*break*/, 1];
                      case 4: return [3 /*break*/, 7];
                      case 5:
                          e_1_1 = _d.sent();
                          e_1 = { error: e_1_1 };
                          return [3 /*break*/, 7];
                      case 6:
                          try {
                              if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                          }
                          finally { if (e_1) throw e_1.error; }
                          return [7 /*endfinally*/];
                      case 7: return [2 /*return*/];
                  }
              });
          });
      };
      /**
       * List all available models that can be used
       * This lists is a combination of all available models from all execution tools
       */
      MultipleLlmExecutionTools.prototype.listModels = function () {
          return __awaiter(this, void 0, void 0, function () {
              var availableModels, _a, _b, llmExecutionTools, models, e_2_1;
              var e_2, _c;
              return __generator(this, function (_d) {
                  switch (_d.label) {
                      case 0:
                          availableModels = [];
                          _d.label = 1;
                      case 1:
                          _d.trys.push([1, 6, 7, 8]);
                          _a = __values(this.llmExecutionTools), _b = _a.next();
                          _d.label = 2;
                      case 2:
                          if (!!_b.done) return [3 /*break*/, 5];
                          llmExecutionTools = _b.value;
                          return [4 /*yield*/, llmExecutionTools.listModels()];
                      case 3:
                          models = _d.sent();
                          availableModels.push.apply(availableModels, __spreadArray([], __read(models), false));
                          _d.label = 4;
                      case 4:
                          _b = _a.next();
                          return [3 /*break*/, 2];
                      case 5: return [3 /*break*/, 8];
                      case 6:
                          e_2_1 = _d.sent();
                          e_2 = { error: e_2_1 };
                          return [3 /*break*/, 8];
                      case 7:
                          try {
                              if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                          }
                          finally { if (e_2) throw e_2.error; }
                          return [7 /*endfinally*/];
                      case 8: return [2 /*return*/, availableModels];
                  }
              });
          });
      };
      /**
       * Calls the best available chat model
       */
      MultipleLlmExecutionTools.prototype.callChatModel = function (prompt) {
          return this.callCommonModel(prompt);
      };
      /**
       * Calls the best available completion model
       */
      MultipleLlmExecutionTools.prototype.callCompletionModel = function (prompt) {
          return this.callCommonModel(prompt);
      };
      /**
       * Calls the best available embedding model
       */
      MultipleLlmExecutionTools.prototype.callEmbeddingModel = function (prompt) {
          return this.callCommonModel(prompt);
      };
      // <- Note: [🤖]
      /**
       * Calls the best available model
       *
       * Note: This should be private or protected but is public to be usable with duck typing
       */
      MultipleLlmExecutionTools.prototype.callCommonModel = function (prompt) {
          return __awaiter(this, void 0, void 0, function () {
              var errors, _a, _b, llmExecutionTools, _c, error_1, e_3_1;
              var e_3, _d;
              var _this = this;
              return __generator(this, function (_e) {
                  switch (_e.label) {
                      case 0:
                          errors = [];
                          _e.label = 1;
                      case 1:
                          _e.trys.push([1, 15, 16, 17]);
                          _a = __values(this.llmExecutionTools), _b = _a.next();
                          _e.label = 2;
                      case 2:
                          if (!!_b.done) return [3 /*break*/, 14];
                          llmExecutionTools = _b.value;
                          _e.label = 3;
                      case 3:
                          _e.trys.push([3, 12, , 13]);
                          _c = prompt.modelRequirements.modelVariant;
                          switch (_c) {
                              case 'CHAT': return [3 /*break*/, 4];
                              case 'COMPLETION': return [3 /*break*/, 6];
                              case 'EMBEDDING': return [3 /*break*/, 8];
                          }
                          return [3 /*break*/, 10];
                      case 4:
                          if (llmExecutionTools.callChatModel === undefined) {
                              return [3 /*break*/, 13];
                          }
                          return [4 /*yield*/, llmExecutionTools.callChatModel(prompt)];
                      case 5: return [2 /*return*/, _e.sent()];
                      case 6:
                          if (llmExecutionTools.callCompletionModel === undefined) {
                              return [3 /*break*/, 13];
                          }
                          return [4 /*yield*/, llmExecutionTools.callCompletionModel(prompt)];
                      case 7: return [2 /*return*/, _e.sent()];
                      case 8:
                          if (llmExecutionTools.callEmbeddingModel === undefined) {
                              return [3 /*break*/, 13];
                          }
                          return [4 /*yield*/, llmExecutionTools.callEmbeddingModel(prompt)];
                      case 9: return [2 /*return*/, _e.sent()];
                      case 10: throw new UnexpectedError("Unknown model variant \"".concat(prompt.modelRequirements.modelVariant, "\""));
                      case 11: return [3 /*break*/, 13];
                      case 12:
                          error_1 = _e.sent();
                          if (!(error_1 instanceof Error) || error_1 instanceof UnexpectedError) {
                              throw error_1;
                          }
                          errors.push(error_1);
                          return [3 /*break*/, 13];
                      case 13:
                          _b = _a.next();
                          return [3 /*break*/, 2];
                      case 14: return [3 /*break*/, 17];
                      case 15:
                          e_3_1 = _e.sent();
                          e_3 = { error: e_3_1 };
                          return [3 /*break*/, 17];
                      case 16:
                          try {
                              if (_b && !_b.done && (_d = _a.return)) _d.call(_a);
                          }
                          finally { if (e_3) throw e_3.error; }
                          return [7 /*endfinally*/];
                      case 17:
                          if (errors.length === 1) {
                              throw errors[0];
                          }
                          else if (errors.length > 1) {
                              throw new PipelineExecutionError(
                              // TODO: Tell which execution tools failed like
                              //     1) OpenAI throw PipelineExecutionError: Parameter `{knowledge}` is not defined
                              //     2) AnthropicClaude throw PipelineExecutionError: Parameter `{knowledge}` is not defined
                              //     3) ...
                              spaceTrim__default["default"](function (block) { return "\n                          All execution tools failed:\n\n                          ".concat(block(errors
                                  .map(function (error, i) { return "".concat(i + 1, ") **").concat(error.name || 'Error', ":** ").concat(error.message); })
                                  .join('\n')), "\n\n                    "); }));
                          }
                          else if (this.llmExecutionTools.length === 0) {
                              throw new PipelineExecutionError("You have not provided any `LlmExecutionTools`");
                          }
                          else {
                              throw new PipelineExecutionError(spaceTrim__default["default"](function (block) { return "\n                          You have not provided any `LlmExecutionTools` that support model variant \"".concat(prompt.modelRequirements.modelVariant, "\"\n\n                          Available `LlmExecutionTools`:\n                          ").concat(block(_this.description), "\n\n                    "); }));
                          }
                  }
              });
          });
      };
      return MultipleLlmExecutionTools;
  }());
  /**
   * TODO: [🧠][🎛] Aggregating multiple models - have result not only from one first aviable model BUT all of them
   * TODO: [🏖] If no llmTools have for example not defined `callCompletionModel` this will still return object with defined `callCompletionModel` which just throws `PipelineExecutionError`, make it undefined instead
   *       Look how `countTotalUsage` (and `cacheLlmTools`) implements it
   */

  /**
   * Joins multiple LLM Execution Tools into one
   *
   * @returns {LlmExecutionTools} Single wrapper for multiple LlmExecutionTools
   *
   * 0) If there is no LlmExecutionTools, it warns and returns valid but empty LlmExecutionTools
   * 1) If there is only one LlmExecutionTools, it returns it wrapped in a proxy object
   * 2) If there are multiple LlmExecutionTools, first will be used first, second will be used if the first hasn`t defined model variant or fails, etc.
   * 3) When all LlmExecutionTools fail, it throws an error with a list of all errors merged into one
   *
   *
   * Tip: You don't have to use this function directly, just pass an array of LlmExecutionTools to the `ExecutionTools`
   *
   * @public exported from `@promptbook/core`
   */
  function joinLlmExecutionTools() {
      var llmExecutionTools = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          llmExecutionTools[_i] = arguments[_i];
      }
      if (llmExecutionTools.length === 0) {
          var warningMessage = spaceTrim__default["default"]("\n            You have not provided any `LlmExecutionTools`\n            This means that you won't be able to execute any prompts that require large language models like GPT-4 or Anthropic's Claude.\n\n            Technically, it's not an error, but it's probably not what you want because it does not make sense to use Promptbook without language models.\n        ");
          // TODO: [🟥] Detect browser / node and make it colorfull
          console.warn(warningMessage);
          /*
          return {
              async listModels() {
                  // TODO: [🟥] Detect browser / node and make it colorfull
                  console.warn(
                      spaceTrim(
                          (block) => `

                              You can't list models because you have no LLM Execution Tools defined:

                              tl;dr

                              ${block(warningMessage)}
                          `,
                      ),
                  );
                  return [];
              },
          };
          */
      }
      return new (MultipleLlmExecutionTools.bind.apply(MultipleLlmExecutionTools, __spreadArray([void 0], __read(llmExecutionTools), false)))();
  }
  /**
   * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
   */

  /**
   * @@@
   *
   * Note: `$` is used to indicate that this interacts with the global scope
   * @singleton Only one instance of each register is created per build, but thare can be more @@@
   * @public exported from `@promptbook/core`
   */
  var $llmToolsRegister = new $Register('llm_execution_tools_constructors');
  /**
   * TODO: [®] DRY Register logic
   */

  /**
   * @@@
   *
   * Note: `$` is used to indicate that this interacts with the global scope
   * @singleton Only one instance of each register is created per build, but thare can be more @@@
   * @public exported from `@promptbook/core`
   */
  var $llmToolsMetadataRegister = new $Register('llm_tools_metadata');
  /**
   * TODO: [®] DRY Register logic
   */

  /**
   * Creates a message with all registered LLM tools
   *
   * Note: This function is used to create a (error) message when there is no constructor for some LLM provider
   *
   * @private internal function of `createLlmToolsFromConfiguration` and `$provideLlmToolsFromEnv`
   */
  function $registeredLlmToolsMessage() {
      var e_1, _a, e_2, _b;
      var env;
      if ($isRunningInNode()) {
          env = process.env;
          // <- TODO: [⚛] Some DRY way how to get to `process.env` and pass it into functions - ACRY search for `env`
      }
      else {
          env = {};
      }
      /**
       * Mixes registered LLM tools from $llmToolsMetadataRegister and $llmToolsRegister
       */
      var all = [];
      var _loop_1 = function (title, packageName, className, envVariables) {
          if (all.some(function (item) { return item.packageName === packageName && item.className === className; })) {
              return "continue";
          }
          all.push({ title: title, packageName: packageName, className: className, envVariables: envVariables });
      };
      try {
          for (var _c = __values($llmToolsMetadataRegister.list()), _d = _c.next(); !_d.done; _d = _c.next()) {
              var _e = _d.value, title = _e.title, packageName = _e.packageName, className = _e.className, envVariables = _e.envVariables;
              _loop_1(title, packageName, className, envVariables);
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
          }
          finally { if (e_1) throw e_1.error; }
      }
      var _loop_2 = function (packageName, className) {
          if (all.some(function (item) { return item.packageName === packageName && item.className === className; })) {
              return "continue";
          }
          all.push({ packageName: packageName, className: className });
      };
      try {
          for (var _f = __values($llmToolsRegister.list()), _g = _f.next(); !_g.done; _g = _f.next()) {
              var _h = _g.value, packageName = _h.packageName, className = _h.className;
              _loop_2(packageName, className);
          }
      }
      catch (e_2_1) { e_2 = { error: e_2_1 }; }
      finally {
          try {
              if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
          }
          finally { if (e_2) throw e_2.error; }
      }
      var metadata = all.map(function (metadata) {
          var _a, _b;
          var isMetadataAviailable = $llmToolsMetadataRegister
              .list()
              .find(function (_a) {
              var packageName = _a.packageName, className = _a.className;
              return metadata.packageName === packageName && metadata.className === className;
          });
          var isInstalled = $llmToolsRegister
              .list()
              .find(function (_a) {
              var packageName = _a.packageName, className = _a.className;
              return metadata.packageName === packageName && metadata.className === className;
          });
          var isFullyConfigured = ((_a = metadata.envVariables) === null || _a === void 0 ? void 0 : _a.every(function (envVariableName) { return env[envVariableName] !== undefined; })) || false;
          var isPartiallyConfigured = ((_b = metadata.envVariables) === null || _b === void 0 ? void 0 : _b.some(function (envVariableName) { return env[envVariableName] !== undefined; })) || false;
          // <- Note: [🗨]
          return __assign(__assign({}, metadata), { isMetadataAviailable: isMetadataAviailable, isInstalled: isInstalled, isFullyConfigured: isFullyConfigured, isPartiallyConfigured: isPartiallyConfigured });
      });
      if (metadata.length === 0) {
          return "No LLM providers are available.";
      }
      return spaceTrim__default["default"](function (block) { return "\n            Relevant environment variables:\n            ".concat(block(Object.keys(env)
          .filter(function (envVariableName) {
          return metadata.some(function (_a) {
              var envVariables = _a.envVariables;
              return envVariables === null || envVariables === void 0 ? void 0 : envVariables.includes(envVariableName);
          });
      })
          .map(function (envVariableName) { return "- `".concat(envVariableName, "`"); })
          .join('\n')), "\n\n            Available LLM providers are:\n            ").concat(block(metadata
          .map(function (_a, i) {
          var title = _a.title, packageName = _a.packageName, className = _a.className, envVariables = _a.envVariables, isMetadataAviailable = _a.isMetadataAviailable, isInstalled = _a.isInstalled, isFullyConfigured = _a.isFullyConfigured, isPartiallyConfigured = _a.isPartiallyConfigured;
          var morePieces = [];
          if (just(false)) ;
          else if (!isMetadataAviailable && !isInstalled) {
              // TODO: [�][�] Maybe do allow to do auto-install if package not registered and not found
              morePieces.push("Not installed and no metadata, looks like a unexpected behavior");
          }
          else if (isMetadataAviailable && !isInstalled) {
              // TODO: [�][�]
              morePieces.push("Not installed");
          }
          else if (!isMetadataAviailable && isInstalled) {
              morePieces.push("No metadata but installed, looks like a unexpected behavior");
          }
          else if (isMetadataAviailable && isInstalled) {
              morePieces.push("Installed");
          }
          else {
              morePieces.push("unknown state, looks like a unexpected behavior");
          } /* not else */
          if (isFullyConfigured) {
              morePieces.push("Configured");
          }
          else if (isPartiallyConfigured) {
              morePieces.push("Partially confugured, missing ".concat(envVariables === null || envVariables === void 0 ? void 0 : envVariables.filter(function (envVariable) { return env[envVariable] === undefined; }).join(' + ')));
          }
          else {
              if (envVariables !== null) {
                  morePieces.push("Not configured, to configure set env ".concat(envVariables === null || envVariables === void 0 ? void 0 : envVariables.join(' + ')));
              }
              else {
                  morePieces.push("Not configured"); // <- Note: Can not be configured via environment variables
              }
          }
          var providerMessage = spaceTrim__default["default"]("\n                                ".concat(i + 1, ") **").concat(title, "** `").concat(className, "` from `").concat(packageName, "`\n                                    ").concat(morePieces.join('; '), "\n                            "));
          if ($isRunningInNode) {
              if (isInstalled && isFullyConfigured) {
                  providerMessage = colors__default["default"].green(providerMessage);
              }
              else if (isInstalled && isPartiallyConfigured) {
                  providerMessage = colors__default["default"].yellow(providerMessage);
              }
              else {
                  providerMessage = colors__default["default"].gray(providerMessage);
              }
          }
          return providerMessage;
      })
          .join('\n')), "\n        "); });
  }
  /**
   * TODO: [®] DRY Register logic
   * TODO: [🧠][⚛] Maybe pass env as argument
   */

  /**
   * @@@
   *
   * Note: This function is not cached, every call creates new instance of `MultipleLlmExecutionTools`
   *
   * @returns @@@
   * @public exported from `@promptbook/core`
   */
  function createLlmToolsFromConfiguration(configuration, options) {
      if (options === void 0) { options = {}; }
      var _a = options.isVerbose, isVerbose = _a === void 0 ? DEFAULT_IS_VERBOSE : _a, userId = options.userId;
      var llmTools = configuration.map(function (llmConfiguration) {
          var registeredItem = $llmToolsRegister
              .list()
              .find(function (_a) {
              var packageName = _a.packageName, className = _a.className;
              return llmConfiguration.packageName === packageName && llmConfiguration.className === className;
          });
          if (registeredItem === undefined) {
              throw new Error(spaceTrim__default["default"](function (block) { return "\n                        There is no constructor for LLM provider `".concat(llmConfiguration.className, "` from `").concat(llmConfiguration.packageName, "`\n\n                        You have probably forgotten install and import the provider package.\n                        To fix this issue, you can:\n\n                        Install:\n\n                        > npm install ").concat(llmConfiguration.packageName, "\n\n                        And import:\n\n                        > import '").concat(llmConfiguration.packageName, "';\n\n\n                        ").concat(block($registeredLlmToolsMessage()), "\n                    "); }));
          }
          return registeredItem(__assign({ isVerbose: isVerbose, userId: userId }, llmConfiguration.options));
      });
      return joinLlmExecutionTools.apply(void 0, __spreadArray([], __read(llmTools), false));
  }
  /**
   * TODO: [🎌] Together with `createLlmToolsFromConfiguration` + 'EXECUTION_TOOLS_CLASSES' gets to `@promptbook/core` ALL model providers, make this more efficient
   * TODO: [🧠][🎌] Dynamically install required providers
   * TODO: @@@ write discussion about this - wizzard
   * TODO: [🧠][🍛] Which name is better `createLlmToolsFromConfig` or `createLlmToolsFromConfiguration`?
   * TODO: [🧠] Is there some meaningfull way how to test this util
   * TODO: This should be maybe not under `_common` but under `utils`
   * TODO: [®] DRY Register logic
   */

  var PipelineCollection = [{title:"Prepare Knowledge from Markdown",pipelineUrl:"https://promptbook.studio/promptbook/prepare-knowledge-from-markdown.book.md",formfactorName:"GENERIC",parameters:[{name:"knowledgeContent",description:"Markdown document content",isInput:true,isOutput:false},{name:"knowledgePieces",description:"The knowledge JSON object",isInput:false,isOutput:true}],tasks:[{taskType:"PROMPT_TASK",name:"knowledge",title:"Knowledge",content:"You are experienced data researcher, extract the important knowledge from the document.\n\n# Rules\n\n-   Make pieces of information concise, clear, and easy to understand\n-   One piece of information should be approximately 1 paragraph\n-   Divide the paragraphs by markdown horizontal lines ---\n-   Omit irrelevant information\n-   Group redundant information\n-   Write just extracted information, nothing else\n\n# The document\n\nTake information from this document:\n\n> {knowledgeContent}",resultingParameterName:"knowledgePieces",dependentParameterNames:["knowledgeContent"]}],personas:[],preparations:[],knowledgeSources:[],knowledgePieces:[],sources:[{type:"BOOK",path:null,content:"# Prepare Knowledge from Markdown\n\n-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-knowledge-from-markdown.book`\n-   INPUT PARAMETER `{knowledgeContent}` Markdown document content\n-   OUTPUT PARAMETER `{knowledgePieces}` The knowledge JSON object\n\n## Knowledge\n\n<!-- TODO: [🍆] -FORMAT JSON -->\n\n```markdown\nYou are experienced data researcher, extract the important knowledge from the document.\n\n# Rules\n\n-   Make pieces of information concise, clear, and easy to understand\n-   One piece of information should be approximately 1 paragraph\n-   Divide the paragraphs by markdown horizontal lines ---\n-   Omit irrelevant information\n-   Group redundant information\n-   Write just extracted information, nothing else\n\n# The document\n\nTake information from this document:\n\n> {knowledgeContent}\n```\n\n`-> {knowledgePieces}`\n"}],sourceFile:"./books/prepare-knowledge-from-markdown.book.md"},{title:"Prepare Keywords",pipelineUrl:"https://promptbook.studio/promptbook/prepare-knowledge-keywords.book.md",formfactorName:"GENERIC",parameters:[{name:"knowledgePieceContent",description:"The content",isInput:true,isOutput:false},{name:"keywords",description:"Keywords separated by comma",isInput:false,isOutput:true}],tasks:[{taskType:"PROMPT_TASK",name:"knowledge",title:"Knowledge",content:"You are experienced data researcher, detect the important keywords in the document.\n\n# Rules\n\n-   Write just keywords separated by comma\n\n# The document\n\nTake information from this document:\n\n> {knowledgePieceContent}",resultingParameterName:"keywords",dependentParameterNames:["knowledgePieceContent"]}],personas:[],preparations:[],knowledgeSources:[],knowledgePieces:[],sources:[{type:"BOOK",path:null,content:"# Prepare Keywords\n\n-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-knowledge-keywords.book`\n-   INPUT PARAMETER `{knowledgePieceContent}` The content\n-   OUTPUT PARAMETER `{keywords}` Keywords separated by comma\n\n## Knowledge\n\n<!-- TODO: [🍆] -FORMAT JSON -->\n\n```markdown\nYou are experienced data researcher, detect the important keywords in the document.\n\n# Rules\n\n-   Write just keywords separated by comma\n\n# The document\n\nTake information from this document:\n\n> {knowledgePieceContent}\n```\n\n`-> {keywords}`\n"}],sourceFile:"./books/prepare-knowledge-keywords.book.md"},{title:"Prepare Knowledge-piece Title",pipelineUrl:"https://promptbook.studio/promptbook/prepare-knowledge-title.book.md",formfactorName:"GENERIC",parameters:[{name:"knowledgePieceContent",description:"The content",isInput:true,isOutput:false},{name:"title",description:"The title of the document",isInput:false,isOutput:true}],tasks:[{taskType:"PROMPT_TASK",name:"knowledge",title:"Knowledge",content:"You are experienced content creator, write best title for the document.\n\n# Rules\n\n-   Write just title, nothing else\n-   Write maximum 5 words for the title\n\n# The document\n\n> {knowledgePieceContent}",resultingParameterName:"title",expectations:{words:{min:1,max:8}},dependentParameterNames:["knowledgePieceContent"]}],personas:[],preparations:[],knowledgeSources:[],knowledgePieces:[],sources:[{type:"BOOK",path:null,content:"# Prepare Knowledge-piece Title\n\n-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-knowledge-title.book`\n-   INPUT PARAMETER `{knowledgePieceContent}` The content\n-   OUTPUT PARAMETER `{title}` The title of the document\n\n## Knowledge\n\n-   EXPECT MIN 1 WORD\n-   EXPECT MAX 8 WORDS\n\n```markdown\nYou are experienced content creator, write best title for the document.\n\n# Rules\n\n-   Write just title, nothing else\n-   Write maximum 5 words for the title\n\n# The document\n\n> {knowledgePieceContent}\n```\n\n`-> {title}`\n"}],sourceFile:"./books/prepare-knowledge-title.book.md"},{title:"Prepare Persona",pipelineUrl:"https://promptbook.studio/promptbook/prepare-persona.book.md",formfactorName:"GENERIC",parameters:[{name:"availableModelNames",description:"List of available model names separated by comma (,)",isInput:true,isOutput:false},{name:"personaDescription",description:"Description of the persona",isInput:true,isOutput:false},{name:"modelRequirements",description:"Specific requirements for the model",isInput:false,isOutput:true}],tasks:[{taskType:"PROMPT_TASK",name:"make-model-requirements",title:"Make modelRequirements",content:"You are experienced AI engineer, you need to create virtual assistant.\nWrite\n\n## Example\n\n```json\n{\n\"modelName\": \"gpt-4o\",\n\"systemMessage\": \"You are experienced AI engineer and helpfull assistant.\",\n\"temperature\": 0.7\n}\n```\n\n## Instructions\n\n-   Your output format is JSON object\n-   Write just the JSON object, no other text should be present\n-   It contains the following keys:\n    -   `modelName`: The name of the model to use\n    -   `systemMessage`: The system message to provide context to the model\n    -   `temperature`: The sampling temperature to use\n\n### Key `modelName`\n\nPick from the following models:\n\n-   {availableModelNames}\n\n### Key `systemMessage`\n\nThe system message is used to communicate instructions or provide context to the model at the beginning of a conversation. It is displayed in a different format compared to user messages, helping the model understand its role in the conversation. The system message typically guides the model's behavior, sets the tone, or specifies desired output from the model. By utilizing the system message effectively, users can steer the model towards generating more accurate and relevant responses.\n\nFor example:\n\n> You are an experienced AI engineer and helpful assistant.\n\n> You are a friendly and knowledgeable chatbot.\n\n### Key `temperature`\n\nThe sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use log probability to automatically increase the temperature until certain thresholds are hit.\n\nYou can pick a value between 0 and 2. For example:\n\n-   `0.1`: Low temperature, extremely conservative and deterministic\n-   `0.5`: Medium temperature, balanced between conservative and creative\n-   `1.0`: High temperature, creative and bit random\n-   `1.5`: Very high temperature, extremely creative and often chaotic and unpredictable\n-   `2.0`: Maximum temperature, completely random and unpredictable, for some extreme creative use cases\n\n# The assistant\n\nTake this description of the persona:\n\n> {personaDescription}",resultingParameterName:"modelRequirements",format:"JSON",dependentParameterNames:["availableModelNames","personaDescription"]}],personas:[],preparations:[],knowledgeSources:[],knowledgePieces:[],sources:[{type:"BOOK",path:null,content:"# Prepare Persona\n\n-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-persona.book`\n-   INPUT PARAMETER `{availableModelNames}` List of available model names separated by comma (,)\n-   INPUT PARAMETER `{personaDescription}` Description of the persona\n-   OUTPUT PARAMETER `{modelRequirements}` Specific requirements for the model\n\n## Make modelRequirements\n\n-   FORMAT JSON\n\n```markdown\nYou are experienced AI engineer, you need to create virtual assistant.\nWrite\n\n## Example\n\n\\`\\`\\`json\n{\n\"modelName\": \"gpt-4o\",\n\"systemMessage\": \"You are experienced AI engineer and helpfull assistant.\",\n\"temperature\": 0.7\n}\n\\`\\`\\`\n\n## Instructions\n\n-   Your output format is JSON object\n-   Write just the JSON object, no other text should be present\n-   It contains the following keys:\n    -   `modelName`: The name of the model to use\n    -   `systemMessage`: The system message to provide context to the model\n    -   `temperature`: The sampling temperature to use\n\n### Key `modelName`\n\nPick from the following models:\n\n-   {availableModelNames}\n\n### Key `systemMessage`\n\nThe system message is used to communicate instructions or provide context to the model at the beginning of a conversation. It is displayed in a different format compared to user messages, helping the model understand its role in the conversation. The system message typically guides the model's behavior, sets the tone, or specifies desired output from the model. By utilizing the system message effectively, users can steer the model towards generating more accurate and relevant responses.\n\nFor example:\n\n> You are an experienced AI engineer and helpful assistant.\n\n> You are a friendly and knowledgeable chatbot.\n\n### Key `temperature`\n\nThe sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use log probability to automatically increase the temperature until certain thresholds are hit.\n\nYou can pick a value between 0 and 2. For example:\n\n-   `0.1`: Low temperature, extremely conservative and deterministic\n-   `0.5`: Medium temperature, balanced between conservative and creative\n-   `1.0`: High temperature, creative and bit random\n-   `1.5`: Very high temperature, extremely creative and often chaotic and unpredictable\n-   `2.0`: Maximum temperature, completely random and unpredictable, for some extreme creative use cases\n\n# The assistant\n\nTake this description of the persona:\n\n> {personaDescription}\n```\n\n`-> {modelRequirements}`\n"}],sourceFile:"./books/prepare-persona.book.md"},{title:"Prepare Title",pipelineUrl:"https://promptbook.studio/promptbook/prepare-title.book.md",formfactorName:"GENERIC",parameters:[{name:"book",description:"The book to prepare the title for",isInput:true,isOutput:false},{name:"title",description:"Best title for the book",isInput:false,isOutput:true}],tasks:[{taskType:"PROMPT_TASK",name:"make-title",title:"Make title",content:"Make best title for given text which describes the workflow:\n\n## Rules\n\n-   Write just title, nothing else\n-   Title should be concise and clear - Write maximum ideally 2 words, maximum 5 words\n-   Title starts with emoticon\n-   Title should not mention the input and output of the workflow but the main purpose of the workflow\n    _For example, not \"✍ Convert Knowledge-piece to title\" but \"✍ Title\"_\n\n## The workflow\n\n> {book}",resultingParameterName:"title",expectations:{words:{min:1,max:8},lines:{min:1,max:1}},dependentParameterNames:["book"]}],personas:[],preparations:[],knowledgeSources:[],knowledgePieces:[],sources:[{type:"BOOK",path:null,content:"# Prepare Title\n\n-   PIPELINE URL `https://promptbook.studio/promptbook/prepare-title.book`\n-   INPUT PARAMETER `{book}` The book to prepare the title for\n-   OUTPUT PARAMETER `{title}` Best title for the book\n\n## Make title\n\n-   EXPECT MIN 1 Word\n-   EXPECT MAX 8 Words\n-   EXPECT EXACTLY 1 Line\n\n```markdown\nMake best title for given text which describes the workflow:\n\n## Rules\n\n-   Write just title, nothing else\n-   Title should be concise and clear - Write maximum ideally 2 words, maximum 5 words\n-   Title starts with emoticon\n-   Title should not mention the input and output of the workflow but the main purpose of the workflow\n    _For example, not \"✍ Convert Knowledge-piece to title\" but \"✍ Title\"_\n\n## The workflow\n\n> {book}\n```\n\n`-> {title}`\n"}],sourceFile:"./books/prepare-title.book.md"}];

  /**
   * Function isValidJsonString will tell you if the string is valid JSON or not
   *
   * @public exported from `@promptbook/utils`
   */
  function isValidJsonString(value /* <- [👨‍⚖️] */) {
      try {
          JSON.parse(value);
          return true;
      }
      catch (error) {
          if (!(error instanceof Error)) {console.log('!(error instanceof Error)')
              throw error;
          }
          if (error.message.includes('Unexpected token')) {
              return false;
          }
          return false;
      }
  }

  /**
   * Function `validatePipelineString` will validate the if the string is a valid pipeline string
   * It does not check if the string is fully logically correct, but if it is a string that can be a pipeline string or the string looks completely different.
   *
   * @param {string} pipelineString the candidate for a pipeline string
   * @returns {PipelineString} the same string as input, but validated as valid
   * @throws {ParseError} if the string is not a valid pipeline string
   * @public exported from `@promptbook/core`
   */
  function validatePipelineString(pipelineString) {
      if (isValidJsonString(pipelineString)) {
          throw new ParseError('Expected a book, but got a JSON string');
      }
      // <- TODO: Implement the validation + add tests when the pipeline logic considered as invalid
      return pipelineString;
  }
  /**
   * TODO: [🧠][🈴] Where is the best location for this file
   */

  /**
   * Prettify the html code
   *
   * @param content raw html code
   * @returns formatted html code
   * @private withing the package because of HUGE size of prettier dependency
   */
  function prettifyMarkdown(content) {
      try {
          return prettier.format(content, {
              parser: 'markdown',
              plugins: [parserHtml__default["default"]],
              // TODO: DRY - make some import or auto-copy of .prettierrc
              endOfLine: 'lf',
              tabWidth: 4,
              singleQuote: true,
              trailingComma: 'all',
              arrowParens: 'always',
              printWidth: 120,
              htmlWhitespaceSensitivity: 'ignore',
              jsxBracketSameLine: false,
              bracketSpacing: true,
          });
      }
      catch (error) {
          // TODO: [🟥] Detect browser / node and make it colorfull
          console.error('There was an error with prettifying the markdown, using the original as the fallback', {
              error: error,
              html: content,
          });
          return content;
      }
  }

  /**
   * Makes first letter of a string uppercase
   *
   * @public exported from `@promptbook/utils`
   */
  function capitalize(word) {
      return word.substring(0, 1).toUpperCase() + word.substring(1);
  }

  /**
   * Converts promptbook in JSON format to string format
   *
   * @deprecated TODO: [🥍][🧠] Backup original files in `PipelineJson` same as in Promptbook.studio
   * @param pipelineJson Promptbook in JSON format (.book.json)
   * @returns Promptbook in string format (.book.md)
   * @public exported from `@promptbook/core`
   */
  function pipelineJsonToString(pipelineJson) {
      var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e, e_6, _f;
      var title = pipelineJson.title, pipelineUrl = pipelineJson.pipelineUrl, bookVersion = pipelineJson.bookVersion, description = pipelineJson.description, parameters = pipelineJson.parameters, tasks = pipelineJson.tasks;
      var pipelineString = "# ".concat(title);
      if (description) {
          pipelineString += '\n\n';
          pipelineString += description;
      }
      var commands = [];
      if (pipelineUrl) {
          commands.push("PIPELINE URL ".concat(pipelineUrl));
      }
      if (bookVersion !== "undefined") {
          commands.push("BOOK VERSION ".concat(bookVersion));
      }
      // TODO: [main] !!5 This increases size of the bundle and is probbably not necessary
      pipelineString = prettifyMarkdown(pipelineString);
      try {
          for (var _g = __values(parameters.filter(function (_a) {
              var isInput = _a.isInput;
              return isInput;
          })), _h = _g.next(); !_h.done; _h = _g.next()) {
              var parameter = _h.value;
              commands.push("INPUT PARAMETER ".concat(taskParameterJsonToString(parameter)));
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (_h && !_h.done && (_a = _g.return)) _a.call(_g);
          }
          finally { if (e_1) throw e_1.error; }
      }
      try {
          for (var _j = __values(parameters.filter(function (_a) {
              var isOutput = _a.isOutput;
              return isOutput;
          })), _k = _j.next(); !_k.done; _k = _j.next()) {
              var parameter = _k.value;
              commands.push("OUTPUT PARAMETER ".concat(taskParameterJsonToString(parameter)));
          }
      }
      catch (e_2_1) { e_2 = { error: e_2_1 }; }
      finally {
          try {
              if (_k && !_k.done && (_b = _j.return)) _b.call(_j);
          }
          finally { if (e_2) throw e_2.error; }
      }
      pipelineString += '\n\n';
      pipelineString += commands.map(function (command) { return "- ".concat(command); }).join('\n');
      try {
          for (var tasks_1 = __values(tasks), tasks_1_1 = tasks_1.next(); !tasks_1_1.done; tasks_1_1 = tasks_1.next()) {
              var task = tasks_1_1.value;
              var
              /* Note: Not using:> name, */
              title_1 = task.title, description_1 = task.description,
              /* Note: dependentParameterNames, */
              jokers = task.jokerParameterNames, taskType = task.taskType, content = task.content, postprocessing = task.postprocessingFunctionNames, expectations = task.expectations, format = task.format, resultingParameterName = task.resultingParameterName;
              pipelineString += '\n\n';
              pipelineString += "## ".concat(title_1);
              if (description_1) {
                  pipelineString += '\n\n';
                  pipelineString += description_1;
              }
              var commands_1 = [];
              var contentLanguage = 'text';
              if (taskType === 'PROMPT_TASK') {
                  var modelRequirements = task.modelRequirements;
                  var _l = modelRequirements || {}, modelName = _l.modelName, modelVariant = _l.modelVariant;
                  // Note: Do nothing, it is default
                  // commands.push(`PROMPT`);
                  if (modelVariant) {
                      commands_1.push("MODEL VARIANT ".concat(capitalize(modelVariant)));
                  }
                  if (modelName) {
                      commands_1.push("MODEL NAME `".concat(modelName, "`"));
                  }
              }
              else if (taskType === 'SIMPLE_TASK') {
                  commands_1.push("SIMPLE TEMPLATE");
                  // Note: Nothing special here
              }
              else if (taskType === 'SCRIPT_TASK') {
                  commands_1.push("SCRIPT");
                  if (task.contentLanguage) {
                      contentLanguage = task.contentLanguage;
                  }
                  else {
                      contentLanguage = '';
                  }
              }
              else if (taskType === 'DIALOG_TASK') {
                  commands_1.push("DIALOG");
                  // Note: Nothing special here
              } // <- }else if([🅱]
              if (jokers) {
                  try {
                      for (var jokers_1 = (e_4 = void 0, __values(jokers)), jokers_1_1 = jokers_1.next(); !jokers_1_1.done; jokers_1_1 = jokers_1.next()) {
                          var joker = jokers_1_1.value;
                          commands_1.push("JOKER {".concat(joker, "}"));
                      }
                  }
                  catch (e_4_1) { e_4 = { error: e_4_1 }; }
                  finally {
                      try {
                          if (jokers_1_1 && !jokers_1_1.done && (_d = jokers_1.return)) _d.call(jokers_1);
                      }
                      finally { if (e_4) throw e_4.error; }
                  }
              } /* not else */
              if (postprocessing) {
                  try {
                      for (var postprocessing_1 = (e_5 = void 0, __values(postprocessing)), postprocessing_1_1 = postprocessing_1.next(); !postprocessing_1_1.done; postprocessing_1_1 = postprocessing_1.next()) {
                          var postprocessingFunctionName = postprocessing_1_1.value;
                          commands_1.push("POSTPROCESSING `".concat(postprocessingFunctionName, "`"));
                      }
                  }
                  catch (e_5_1) { e_5 = { error: e_5_1 }; }
                  finally {
                      try {
                          if (postprocessing_1_1 && !postprocessing_1_1.done && (_e = postprocessing_1.return)) _e.call(postprocessing_1);
                      }
                      finally { if (e_5) throw e_5.error; }
                  }
              } /* not else */
              if (expectations) {
                  try {
                      for (var _m = (e_6 = void 0, __values(Object.entries(expectations))), _o = _m.next(); !_o.done; _o = _m.next()) {
                          var _p = __read(_o.value, 2), unit = _p[0], _q = _p[1], min = _q.min, max = _q.max;
                          if (min === max) {
                              commands_1.push("EXPECT EXACTLY ".concat(min, " ").concat(capitalize(unit + (min > 1 ? 's' : ''))));
                          }
                          else {
                              if (min !== undefined) {
                                  commands_1.push("EXPECT MIN ".concat(min, " ").concat(capitalize(unit + (min > 1 ? 's' : ''))));
                              } /* not else */
                              if (max !== undefined) {
                                  commands_1.push("EXPECT MAX ".concat(max, " ").concat(capitalize(unit + (max > 1 ? 's' : ''))));
                              }
                          }
                      }
                  }
                  catch (e_6_1) { e_6 = { error: e_6_1 }; }
                  finally {
                      try {
                          if (_o && !_o.done && (_f = _m.return)) _f.call(_m);
                      }
                      finally { if (e_6) throw e_6.error; }
                  }
              } /* not else */
              if (format) {
                  if (format === 'JSON') {
                      // TODO: @deprecated remove
                      commands_1.push("FORMAT JSON");
                  }
              } /* not else */
              pipelineString += '\n\n';
              pipelineString += commands_1.map(function (command) { return "- ".concat(command); }).join('\n');
              pipelineString += '\n\n';
              pipelineString += '```' + contentLanguage;
              pipelineString += '\n';
              pipelineString += spaceTrim__default["default"](content);
              //                   <- TODO: [main] !!3 Escape
              //                   <- TODO: [🧠] Some clear strategy how to spaceTrim the blocks
              pipelineString += '\n';
              pipelineString += '```';
              pipelineString += '\n\n';
              pipelineString += "`-> {".concat(resultingParameterName, "}`"); // <- TODO: [main] !!3 If the parameter here has description, add it and use taskParameterJsonToString
          }
      }
      catch (e_3_1) { e_3 = { error: e_3_1 }; }
      finally {
          try {
              if (tasks_1_1 && !tasks_1_1.done && (_c = tasks_1.return)) _c.call(tasks_1);
          }
          finally { if (e_3) throw e_3.error; }
      }
      return validatePipelineString(pipelineString);
  }
  /**
   * @private internal utility of `pipelineJsonToString`
   */
  function taskParameterJsonToString(taskParameterJson) {
      var name = taskParameterJson.name, description = taskParameterJson.description;
      var parameterString = "{".concat(name, "}");
      if (description) {
          parameterString = "".concat(parameterString, " ").concat(description);
      }
      return parameterString;
  }
  /**
   * TODO: [🛋] Implement new features and commands into `pipelineJsonToString` + `taskParameterJsonToString` , use `stringifyCommand`
   * TODO: [🧠] Is there a way to auto-detect missing features in pipelineJsonToString
   * TODO: [🏛] Maybe make some markdown builder
   * TODO: [🏛] Escape all
   * TODO: [🧠] Should be in generated .book.md file GENERATOR_WARNING
   */

  /**
   * Orders JSON object by keys
   *
   * @returns The same type of object as the input re-ordered
   * @public exported from `@promptbook/utils`
   */
  function orderJson(options) {
      var value = options.value, order = options.order;
      var orderedValue = __assign(__assign({}, (order === undefined ? {} : Object.fromEntries(order.map(function (key) { return [key, undefined]; })))), value);
      return orderedValue;
  }

  /**
   * Freezes the given object and all its nested objects recursively
   *
   * Note: `$` is used to indicate that this function is not a pure function - it mutates given object
   * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
   *
   * @returns The same object as the input, but deeply frozen
   * @public exported from `@promptbook/utils`
   */
  function $deepFreeze(objectValue) {
      var e_1, _a;
      if (Array.isArray(objectValue)) {
          return Object.freeze(objectValue.map(function (item) { return $deepFreeze(item); }));
      }
      var propertyNames = Object.getOwnPropertyNames(objectValue);
      try {
          for (var propertyNames_1 = __values(propertyNames), propertyNames_1_1 = propertyNames_1.next(); !propertyNames_1_1.done; propertyNames_1_1 = propertyNames_1.next()) {
              var propertyName = propertyNames_1_1.value;
              var value = objectValue[propertyName];
              if (value && typeof value === 'object') {
                  $deepFreeze(value);
              }
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (propertyNames_1_1 && !propertyNames_1_1.done && (_a = propertyNames_1.return)) _a.call(propertyNames_1);
          }
          finally { if (e_1) throw e_1.error; }
      }
      Object.freeze(objectValue);
      return objectValue;
  }
  /**
   * TODO: [🧠] Is there a way how to meaningfully test this utility
   */

  /**
   * Checks if the value is [🚉] serializable as JSON
   * If not, throws an UnexpectedError with a rich error message and tracking
   *
   * - Almost all primitives are serializable BUT:
   * - `undefined` is not serializable
   * - `NaN` is not serializable
   * - Objects and arrays are serializable if all their properties are serializable
   * - Functions are not serializable
   * - Circular references are not serializable
   * - `Date` objects are not serializable
   * - `Map` and `Set` objects are not serializable
   * - `RegExp` objects are not serializable
   * - `Error` objects are not serializable
   * - `Symbol` objects are not serializable
   * - And much more...
   *
   * @throws UnexpectedError if the value is not serializable as JSON
   * @public exported from `@promptbook/utils`
   */
  function checkSerializableAsJson(options) {
      var e_1, _a;
      var value = options.value, name = options.name, message = options.message;
      if (value === undefined) {
          throw new UnexpectedError("".concat(name, " is undefined"));
      }
      else if (value === null) {
          return;
      }
      else if (typeof value === 'boolean') {
          return;
      }
      else if (typeof value === 'number' && !isNaN(value)) {
          return;
      }
      else if (typeof value === 'string') {
          return;
      }
      else if (typeof value === 'symbol') {
          throw new UnexpectedError("".concat(name, " is symbol"));
      }
      else if (typeof value === 'function') {
          throw new UnexpectedError("".concat(name, " is function"));
      }
      else if (typeof value === 'object' && Array.isArray(value)) {
          for (var i = 0; i < value.length; i++) {
              checkSerializableAsJson({ name: "".concat(name, "[").concat(i, "]"), value: value[i], message: message });
          }
      }
      else if (typeof value === 'object') {
          if (value instanceof Date) {
              throw new UnexpectedError(spaceTrim__default["default"](function (block) { return "\n                        `".concat(name, "` is Date\n\n                        Use `string_date_iso8601` instead\n\n                        Additional message for `").concat(name, "`:\n                        ").concat(block(message || '(nothing)'), "\n                    "); }));
          }
          else if (value instanceof Map) {
              throw new UnexpectedError("".concat(name, " is Map"));
          }
          else if (value instanceof Set) {
              throw new UnexpectedError("".concat(name, " is Set"));
          }
          else if (value instanceof RegExp) {
              throw new UnexpectedError("".concat(name, " is RegExp"));
          }
          else if (value instanceof Error) {
              throw new UnexpectedError(spaceTrim__default["default"](function (block) { return "\n                        `".concat(name, "` is unserialized Error\n\n                        Use function `serializeError`\n\n                        Additional message for `").concat(name, "`:\n                        ").concat(block(message || '(nothing)'), "\n\n                    "); }));
          }
          else {
              try {
                  for (var _b = __values(Object.entries(value)), _c = _b.next(); !_c.done; _c = _b.next()) {
                      var _d = __read(_c.value, 2), subName = _d[0], subValue = _d[1];
                      if (subValue === undefined) {
                          // Note: undefined in object is serializable - it is just omited
                          continue;
                      }
                      checkSerializableAsJson({ name: "".concat(name, ".").concat(subName), value: subValue, message: message });
                  }
              }
              catch (e_1_1) { e_1 = { error: e_1_1 }; }
              finally {
                  try {
                      if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                  }
                  finally { if (e_1) throw e_1.error; }
              }
              try {
                  JSON.stringify(value); // <- TODO: [0]
              }
              catch (error) {
                  if (!(error instanceof Error)) {console.log('!(error instanceof Error)')
                      throw error;
                  }
                  throw new UnexpectedError(spaceTrim__default["default"](function (block) { return "\n                            `".concat(name, "` is not serializable\n\n                            ").concat(block(error.stack || error.message), "\n\n                            Additional message for `").concat(name, "`:\n                            ").concat(block(message || '(nothing)'), "\n                        "); }));
              }
              /*
              TODO: [0] Is there some more elegant way to check circular references?
              const seen = new Set();
              const stack = [{ value }];
              while (stack.length > 0) {
                  const { value } = stack.pop()!;
                  if (typeof value === 'object' && value !== null) {
                      if (seen.has(value)) {
                          throw new UnexpectedError(`${name} has circular reference`);
                      }
                      seen.add(value);
                      if (Array.isArray(value)) {
                          stack.push(...value.map((value) => ({ value })));
                      } else {
                          stack.push(...Object.values(value).map((value) => ({ value })));
                      }
                  }
              }
              */
              return;
          }
      }
      else {
          throw new UnexpectedError(spaceTrim__default["default"](function (block) { return "\n                    `".concat(name, "` is unknown type\n\n                    Additional message for `").concat(name, "`:\n                    ").concat(block(message || '(nothing)'), "\n                "); }));
      }
  }
  /**
   * TODO: Can be return type more type-safe? like `asserts options.value is JsonValue`
   * TODO: [🧠][main] !!3 In-memory cache of same values to prevent multiple checks
   * Note: [🐠] This is how `checkSerializableAsJson` + `isSerializableAsJson` together can just retun true/false or rich error message
   */

  /**
   * @@@
   *
   * @public exported from `@promptbook/utils`
   */
  function deepClone(objectValue) {
      return JSON.parse(JSON.stringify(objectValue));
      /*
      TODO: [🧠] Is there a better implementation?
      > const propertyNames = Object.getOwnPropertyNames(objectValue);
      > for (const propertyName of propertyNames) {
      >     const value = (objectValue as really_any)[propertyName];
      >     if (value && typeof value === 'object') {
      >         deepClone(value);
      >     }
      > }
      > return Object.assign({}, objectValue);
      */
  }
  /**
   * TODO: [🧠] Is there a way how to meaningfully test this utility
   */

  /**
   * Utility to export a JSON object from a function
   *
   * 1) Checks if the value is serializable as JSON
   * 2) Makes a deep clone of the object
   * 2) Orders the object properties
   * 2) Deeply freezes the cloned object
   *
   * Note: This function does not mutates the given object
   *
   * @returns The same type of object as the input but read-only and re-ordered
   * @public exported from `@promptbook/utils`
   */
  function exportJson(options) {
      var name = options.name, value = options.value, order = options.order, message = options.message;
      checkSerializableAsJson({ name: name, value: value, message: message });
      var orderedValue =
      // TODO: Fix error "Type instantiation is excessively deep and possibly infinite."
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      order === undefined
          ? deepClone(value)
          : orderJson({
              value: value,
              // <- Note: checkSerializableAsJson asserts that the value is serializable as JSON
              order: order,
          });
      $deepFreeze(orderedValue);
      return orderedValue;
  }
  /**
   * TODO: [🧠] Is there a way how to meaningfully test this utility
   */

  /**
   * Order of keys in the pipeline JSON
   *
   * @public exported from `@promptbook/core`
   */
  var ORDER_OF_PIPELINE_JSON = [
      // Note: [🍙] In this order will be pipeline serialized
      'title',
      'pipelineUrl',
      'bookVersion',
      'description',
      'formfactorName',
      'parameters',
      'tasks',
      'personas',
      'preparations',
      'knowledgeSources',
      'knowledgePieces',
      'sources', // <- TODO: [🧠] Where should the `sources` be
  ];
  /**
   * Nonce which is used for replacing things in strings
   *
   * @private within the repository
   */
  var REPLACING_NONCE = 'u$k42k%!V2zo34w7Fu#@QUHYPW';
  /**
   * @@@
   *
   * @private within the repository
   */
  var RESERVED_PARAMETER_MISSING_VALUE = 'MISSING-' + REPLACING_NONCE;
  /**
   * @@@
   *
   * @private within the repository
   */
  var RESERVED_PARAMETER_RESTRICTED = 'RESTRICTED-' + REPLACING_NONCE;
  /**
   * The names of the parameters that are reserved for special purposes
   *
   * @public exported from `@promptbook/core`
   */
  var RESERVED_PARAMETER_NAMES = exportJson({
      name: 'RESERVED_PARAMETER_NAMES',
      message: "The names of the parameters that are reserved for special purposes",
      value: [
          'content',
          'context',
          'knowledge',
          'examples',
          'modelName',
          'currentDate',
          // <- TODO: list here all command names
          // <- TODO: Add more like 'date', 'modelName',...
          // <- TODO: Add [emoji] + instructions ACRY when adding new reserved parameter
      ],
  });
  /**
   * Note: [💞] Ignore a discrepancy between file name and entity name
   */

  /**
   * Tests if given string is valid semantic version
   *
   * Note: There are two simmilar functions:
   * - `isValidSemanticVersion` which tests any semantic version
   * - `isValidPromptbookVersion` *(this one)* which tests just Promptbook versions
   *
   * @public exported from `@promptbook/utils`
   */
  function isValidSemanticVersion(version) {
      if (typeof version !== 'string') {
          return false;
      }
      if (version.startsWith('0.0.0')) {
          return false;
      }
      return /^\d+\.\d+\.\d+(-\d+)?$/i.test(version);
  }

  /**
   * Tests if given string is valid promptbook version
   * It looks into list of known promptbook versions.
   *
   * @see https://www.npmjs.com/package/promptbook?activeTab=versions
   * Note: When you are using for example promptbook 2.0.0 and there already is promptbook 3.0.0 it don`t know about it.
   * Note: There are two simmilar functions:
   * - `isValidSemanticVersion` which tests any semantic version
   * - `isValidPromptbookVersion` *(this one)* which tests just Promptbook versions
   *
   * @public exported from `@promptbook/utils`
   */
  function isValidPromptbookVersion(version) {
      if (!isValidSemanticVersion(version)) {
          return false;
      }
      if ( /* version === '1.0.0' || */version === '2.0.0' || version === '3.0.0') {
          return false;
      }
      // <- TODO: [main] !!3 Check isValidPromptbookVersion against PROMPTBOOK_ENGINE_VERSIONS
      return true;
  }

  /**
   * Checks if an URL is reserved for private networks or localhost.
   *
   * Note: There are two simmilar functions:
   * - `isUrlOnPrivateNetwork` which tests full URL
   * - `isHostnameOnPrivateNetwork` *(this one)* which tests just hostname
   *
   * @public exported from `@promptbook/utils`
   */
  function isHostnameOnPrivateNetwork(hostname) {
      if (hostname === 'example.com' ||
          hostname === 'localhost' ||
          hostname.endsWith('.localhost') ||
          hostname.endsWith('.local') ||
          hostname.endsWith('.test') ||
          hostname === '127.0.0.1' ||
          hostname === '::1') {
          return true;
      }
      if (hostname.includes(':')) {
          // IPv6
          var ipParts = hostname.split(':');
          return ipParts[0] === 'fc00' || ipParts[0] === 'fd00' || ipParts[0] === 'fe80';
      }
      else {
          // IPv4
          var ipParts = hostname.split('.').map(function (part) { return Number.parseInt(part, 10); });
          return (ipParts[0] === 10 ||
              (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) ||
              (ipParts[0] === 192 && ipParts[1] === 168));
      }
  }

  /**
   * Checks if an IP address or hostname is reserved for private networks or localhost.
   *
   * Note: There are two simmilar functions:
   * - `isUrlOnPrivateNetwork` *(this one)* which tests full URL
   * - `isHostnameOnPrivateNetwork` which tests just hostname
   *
   * @param {string} ipAddress - The IP address to check.
   * @returns {boolean} Returns true if the IP address is reserved for private networks or localhost, otherwise false.
   * @public exported from `@promptbook/utils`
   */
  function isUrlOnPrivateNetwork(url) {
      if (typeof url === 'string') {
          url = new URL(url);
      }
      return isHostnameOnPrivateNetwork(url.hostname);
  }

  /**
   * Tests if given string is valid URL.
   *
   * Note: Dataurl are considered perfectly valid.
   * Note: There are two simmilar functions:
   * - `isValidUrl` which tests any URL
   * - `isValidPipelineUrl` *(this one)* which tests just promptbook URL
   *
   * @public exported from `@promptbook/utils`
   */
  function isValidUrl(url) {
      if (typeof url !== 'string') {
          return false;
      }
      try {
          if (url.startsWith('blob:')) {
              url = url.replace(/^blob:/, '');
          }
          var urlObject = new URL(url /* because fail is handled */);
          if (!['http:', 'https:', 'data:'].includes(urlObject.protocol)) {
              return false;
          }
          return true;
      }
      catch (error) {
          return false;
      }
  }

  /**
   * Tests if given string is valid pipeline URL URL.
   *
   * Note: There are two simmilar functions:
   * - `isValidUrl` which tests any URL
   * - `isValidPipelineUrl` *(this one)* which tests just pipeline URL
   *
   * @public exported from `@promptbook/utils`
   */
  function isValidPipelineUrl(url) {
      if (!isValidUrl(url)) {
          return false;
      }
      if (!url.startsWith('https://')) {
          return false;
      }
      if (url.includes('#')) {
          // TODO: [🐠]
          return false;
      }
      if (isUrlOnPrivateNetwork(url)) {
          return false;
      }
      return true;
  }
  /**
   * TODO: [🐠] Maybe more info why the URL is invalid
   */

  /**
   * Validates PipelineJson if it is logically valid
   *
   * It checks:
   * -   if it has correct parameters dependency
   *
   * It does NOT check:
   * -   if it is valid json
   * -   if it is meaningful
   *
   * @param pipeline valid or invalid PipelineJson
   * @returns the same pipeline if it is logically valid
   * @throws {PipelineLogicError} on logical error in the pipeline
   * @public exported from `@promptbook/core`
   */
  function validatePipeline(pipeline) {
      if (IS_PIPELINE_LOGIC_VALIDATED) {
          validatePipeline_InnerFunction(pipeline);
      }
      else {
          try {
              validatePipeline_InnerFunction(pipeline);
          }
          catch (error) {
              if (!(error instanceof PipelineLogicError)) {
                  throw error;
              }
              console.error(spaceTrim.spaceTrim(function (block) { return "\n                        Pipeline is not valid but logic errors are temporarily disabled via `IS_PIPELINE_LOGIC_VALIDATED`\n\n                        ".concat(block(error.message), "\n                    "); }));
          }
      }
      return pipeline;
  }
  /**
   * @private internal function for `validatePipeline`
   */
  function validatePipeline_InnerFunction(pipeline) {
      // TODO: [🧠] Maybe test if promptbook is a promise and make specific error case for that
      var e_1, _a, e_2, _b, e_3, _c;
      var pipelineIdentification = (function () {
          // Note: This is a 😐 implementation of [🚞]
          var _ = [];
          if (pipeline.sourceFile !== undefined) {
              _.push("File: ".concat(pipeline.sourceFile));
          }
          if (pipeline.pipelineUrl !== undefined) {
              _.push("Url: ".concat(pipeline.pipelineUrl));
          }
          return _.join('\n');
      })();
      if (pipeline.pipelineUrl !== undefined && !isValidPipelineUrl(pipeline.pipelineUrl)) {
          // <- Note: [🚲]
          throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                    Invalid promptbook URL \"".concat(pipeline.pipelineUrl, "\"\n\n                    ").concat(block(pipelineIdentification), "\n                "); }));
      }
      if (pipeline.bookVersion !== undefined && !isValidPromptbookVersion(pipeline.bookVersion)) {
          // <- Note: [🚲]
          throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                    Invalid Promptbook Version \"".concat(pipeline.bookVersion, "\"\n\n                    ").concat(block(pipelineIdentification), "\n                "); }));
      }
      // TODO: [🧠] Maybe do here some propper JSON-schema / ZOD checking
      if (!Array.isArray(pipeline.parameters)) {
          // TODO: [🧠] what is the correct error tp throw - maybe PromptbookSchemaError
          throw new ParseError(spaceTrim.spaceTrim(function (block) { return "\n                    Pipeline is valid JSON but with wrong structure\n\n                    `PipelineJson.parameters` expected to be an array, but got ".concat(typeof pipeline.parameters, "\n\n                    ").concat(block(pipelineIdentification), "\n                "); }));
      }
      // TODO: [🧠] Maybe do here some propper JSON-schema / ZOD checking
      if (!Array.isArray(pipeline.tasks)) {
          // TODO: [🧠] what is the correct error tp throw - maybe PromptbookSchemaError
          throw new ParseError(spaceTrim.spaceTrim(function (block) { return "\n                    Pipeline is valid JSON but with wrong structure\n\n                    `PipelineJson.tasks` expected to be an array, but got ".concat(typeof pipeline.tasks, "\n\n                    ").concat(block(pipelineIdentification), "\n                "); }));
      }
      var _loop_1 = function (parameter) {
          if (parameter.isInput && parameter.isOutput) {
              throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n\n                        Parameter `{".concat(parameter.name, "}` can not be both input and output\n\n                        ").concat(block(pipelineIdentification), "\n                    "); }));
          }
          // Note: Testing that parameter is either intermediate or output BUT not created and unused
          if (!parameter.isInput &&
              !parameter.isOutput &&
              !pipeline.tasks.some(function (task) { return task.dependentParameterNames.includes(parameter.name); })) {
              throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                        Parameter `{".concat(parameter.name, "}` is created but not used\n\n                        You can declare {").concat(parameter.name, "} as output parameter by adding in the header:\n                        - OUTPUT PARAMETER `{").concat(parameter.name, "}` ").concat(parameter.description || '', "\n\n                        ").concat(block(pipelineIdentification), "\n\n                    "); }));
          }
          // Note: Testing that parameter is either input or result of some task
          if (!parameter.isInput && !pipeline.tasks.some(function (task) { return task.resultingParameterName === parameter.name; })) {
              throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                        Parameter `{".concat(parameter.name, "}` is declared but not defined\n\n                        You can do one of these:\n                        1) Remove declaration of `{").concat(parameter.name, "}`\n                        2) Add task that results in `-> {").concat(parameter.name, "}`\n\n                        ").concat(block(pipelineIdentification), "\n                    "); }));
          }
      };
      try {
          /*
          TODO: [🧠][🅾] Should be empty pipeline valid or not
          // Note: Check that pipeline has some tasks
          if (pipeline.tasks.length === 0) {
              throw new PipelineLogicError(
                  spaceTrim(
                      (block) => `
                        Pipeline must have at least one task

                        ${block(pipelineIdentification)}
                    `,
                  ),
              );
          }
          */
          // Note: Check each parameter individually
          for (var _d = __values(pipeline.parameters), _e = _d.next(); !_e.done; _e = _d.next()) {
              var parameter = _e.value;
              _loop_1(parameter);
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
          }
          finally { if (e_1) throw e_1.error; }
      }
      // Note: All input parameters are defined - so that they can be used as result of some task
      var definedParameters = new Set(pipeline.parameters.filter(function (_a) {
          var isInput = _a.isInput;
          return isInput;
      }).map(function (_a) {
          var name = _a.name;
          return name;
      }));
      var _loop_2 = function (task) {
          var e_4, _h, e_5, _j;
          if (definedParameters.has(task.resultingParameterName)) {
              throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                        Parameter `{".concat(task.resultingParameterName, "}` is defined multiple times\n\n                        ").concat(block(pipelineIdentification), "\n                    "); }));
          }
          if (RESERVED_PARAMETER_NAMES.includes(task.resultingParameterName)) {
              throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                        Parameter name {".concat(task.resultingParameterName, "} is reserved, please use different name\n\n                        ").concat(block(pipelineIdentification), "\n                    "); }));
          }
          definedParameters.add(task.resultingParameterName);
          if (task.jokerParameterNames && task.jokerParameterNames.length > 0) {
              if (!task.format &&
                  !task.expectations /* <- TODO: Require at least 1 -> min <- expectation to use jokers */) {
                  throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                            Joker parameters are used for {".concat(task.resultingParameterName, "} but no expectations are defined\n\n                            ").concat(block(pipelineIdentification), "\n                        "); }));
              }
              var _loop_4 = function (joker) {
                  if (!task.dependentParameterNames.includes(joker)) {
                      throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                                Parameter `{".concat(joker, "}` is used for {").concat(task.resultingParameterName, "} as joker but not in `dependentParameterNames`\n\n                                ").concat(block(pipelineIdentification), "\n                            "); }));
                  }
              };
              try {
                  for (var _k = (e_4 = void 0, __values(task.jokerParameterNames)), _l = _k.next(); !_l.done; _l = _k.next()) {
                      var joker = _l.value;
                      _loop_4(joker);
                  }
              }
              catch (e_4_1) { e_4 = { error: e_4_1 }; }
              finally {
                  try {
                      if (_l && !_l.done && (_h = _k.return)) _h.call(_k);
                  }
                  finally { if (e_4) throw e_4.error; }
              }
          }
          if (task.expectations) {
              var _loop_5 = function (unit, min, max) {
                  if (min !== undefined && max !== undefined && min > max) {
                      throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                                Min expectation (=".concat(min, ") of ").concat(unit, " is higher than max expectation (=").concat(max, ")\n\n                                ").concat(block(pipelineIdentification), "\n                            "); }));
                  }
                  if (min !== undefined && min < 0) {
                      throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                                Min expectation of ".concat(unit, " must be zero or positive\n\n                                ").concat(block(pipelineIdentification), "\n                            "); }));
                  }
                  if (max !== undefined && max <= 0) {
                      throw new PipelineLogicError(spaceTrim.spaceTrim(function (block) { return "\n                                Max expectation of ".concat(unit, " must be positive\n\n                                ").concat(block(pipelineIdentification), "\n                            "); }));
                  }
              };
              try {
                  for (var _m = (e_5 = void 0, __values(Object.entries(task.expectations))), _o = _m.next(); !_o.done; _o = _m.next()) {
                      var _p = __read(_o.value, 2), unit = _p[0], _q = _p[1], min = _q.min, max = _q.max;
                      _loop_5(unit, min, max);
                  }
              }
              catch (e_5_1) { e_5 = { error: e_5_1 }; }
              finally {
                  try {
                      if (_o && !_o.done && (_j = _m.return)) _j.call(_m);
                  }
                  finally { if (e_5) throw e_5.error; }
              }
          }
      };
      try {
          // Note: Checking each task individually
          for (var _f = __values(pipeline.tasks), _g = _f.next(); !_g.done; _g = _f.next()) {
              var task = _g.value;
              _loop_2(task);
          }
      }
      catch (e_2_1) { e_2 = { error: e_2_1 }; }
      finally {
          try {
              if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
          }
          finally { if (e_2) throw e_2.error; }
      }
      // Note: Detect circular dependencies
      var resovedParameters = pipeline.parameters
          .filter(function (_a) {
          var isInput = _a.isInput;
          return isInput;
      })
          .map(function (_a) {
          var name = _a.name;
          return name;
      });
      try {
          // Note: All reserved parameters are resolved
          for (var RESERVED_PARAMETER_NAMES_1 = __values(RESERVED_PARAMETER_NAMES), RESERVED_PARAMETER_NAMES_1_1 = RESERVED_PARAMETER_NAMES_1.next(); !RESERVED_PARAMETER_NAMES_1_1.done; RESERVED_PARAMETER_NAMES_1_1 = RESERVED_PARAMETER_NAMES_1.next()) {
              var reservedParameterName = RESERVED_PARAMETER_NAMES_1_1.value;
              resovedParameters = __spreadArray(__spreadArray([], __read(resovedParameters), false), [reservedParameterName], false);
          }
      }
      catch (e_3_1) { e_3 = { error: e_3_1 }; }
      finally {
          try {
              if (RESERVED_PARAMETER_NAMES_1_1 && !RESERVED_PARAMETER_NAMES_1_1.done && (_c = RESERVED_PARAMETER_NAMES_1.return)) _c.call(RESERVED_PARAMETER_NAMES_1);
          }
          finally { if (e_3) throw e_3.error; }
      }
      var unresovedTasks = __spreadArray([], __read(pipeline.tasks), false);
      var loopLimit = LOOP_LIMIT;
      var _loop_3 = function () {
          if (loopLimit-- < 0) {
              // Note: Really UnexpectedError not LimitReachedError - this should not happen and be caught below
              throw new UnexpectedError(spaceTrim.spaceTrim(function (block) { return "\n                        Loop limit reached during detection of circular dependencies in `validatePipeline`\n\n                        ".concat(block(pipelineIdentification), "\n                    "); }));
          }
          var currentlyResovedTasks = unresovedTasks.filter(function (task) {
              return task.dependentParameterNames.every(function (name) { return resovedParameters.includes(name); });
          });
          if (currentlyResovedTasks.length === 0) {
              throw new PipelineLogicError(
              // TODO: [🐎] DRY
              spaceTrim.spaceTrim(function (block) { return "\n\n                        Can not resolve some parameters:\n                        Either you are using a parameter that is not defined, or there are some circular dependencies.\n\n                        ".concat(block(pipelineIdentification), "\n\n                        **Can not resolve:**\n                        ").concat(block(unresovedTasks
                  .map(function (_a) {
                  var resultingParameterName = _a.resultingParameterName, dependentParameterNames = _a.dependentParameterNames;
                  return "- Parameter `{".concat(resultingParameterName, "}` which depends on ").concat(dependentParameterNames
                      .map(function (dependentParameterName) { return "`{".concat(dependentParameterName, "}`"); })
                      .join(' and '));
              })
                  .join('\n')), "\n\n                        **Resolved:**\n                        ").concat(block(resovedParameters
                  .filter(function (name) {
                  return !RESERVED_PARAMETER_NAMES.includes(name);
              })
                  .map(function (name) { return "- Parameter `{".concat(name, "}`"); })
                  .join('\n')), "\n\n\n                        **Reserved (which are available):**\n                        ").concat(block(resovedParameters
                  .filter(function (name) {
                  return RESERVED_PARAMETER_NAMES.includes(name);
              })
                  .map(function (name) { return "- Parameter `{".concat(name, "}`"); })
                  .join('\n')), "\n\n\n                    "); }));
          }
          resovedParameters = __spreadArray(__spreadArray([], __read(resovedParameters), false), __read(currentlyResovedTasks.map(function (_a) {
              var resultingParameterName = _a.resultingParameterName;
              return resultingParameterName;
          })), false);
          unresovedTasks = unresovedTasks.filter(function (task) { return !currentlyResovedTasks.includes(task); });
      };
      while (unresovedTasks.length > 0) {
          _loop_3();
      }
      // Note: Check that formfactor is corresponding to the pipeline interface
      // TODO: !!6 Implement this
      // pipeline.formfactorName
  }
  /**
   * TODO: [🧞‍♀️] Do not allow joker + foreach
   * TODO: [🧠] Work with promptbookVersion
   * TODO: Use here some json-schema, Zod or something similar and change it to:
   *     > /**
   *     >  * Validates PipelineJson if it is logically valid.
   *     >  *
   *     >  * It checks:
   *     >  * -   it has a valid structure
   *     >  * -   ...
   *     >  ex port function validatePipeline(promptbook: really_unknown): asserts promptbook is PipelineJson {
   */
  /**
   * TODO: [🧳][main] !!4 Validate that all examples match expectations
   * TODO: [🧳][🐝][main] !!4 Validate that knowledge is valid (non-void)
   * TODO: [🧳][main] !!4 Validate that persona can be used only with CHAT variant
   * TODO: [🧳][main] !!4 Validate that parameter with reserved name not used RESERVED_PARAMETER_NAMES
   * TODO: [🧳][main] !!4 Validate that reserved parameter is not used as joker
   * TODO: [🧠] Validation not only logic itself but imports around - files and websites and rerefenced pipelines exists
   * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
   */

  /**
   * Parses the task and returns the list of all parameter names
   *
   * @param template the string template with parameters in {curly} braces
   * @returns the list of parameter names
   * @public exported from `@promptbook/utils`
   */
  function extractParameterNames(template) {
      var e_1, _a;
      var matches = template.matchAll(/{\w+}/g);
      var parameterNames = new Set();
      try {
          for (var matches_1 = __values(matches), matches_1_1 = matches_1.next(); !matches_1_1.done; matches_1_1 = matches_1.next()) {
              var match = matches_1_1.value;
              var parameterName = match[0].slice(1, -1);
              parameterNames.add(parameterName);
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (matches_1_1 && !matches_1_1.done && (_a = matches_1.return)) _a.call(matches_1);
          }
          finally { if (e_1) throw e_1.error; }
      }
      return parameterNames;
  }

  /**
   * Unprepare just strips the preparation data of the pipeline
   *
   * @deprecated In future version this function will be removed or deprecated
   * @public exported from `@promptbook/core`
   */
  function unpreparePipeline(pipeline) {
      var personas = pipeline.personas, knowledgeSources = pipeline.knowledgeSources, tasks = pipeline.tasks;
      personas = personas.map(function (persona) { return (__assign(__assign({}, persona), { modelRequirements: undefined, preparationIds: undefined })); });
      knowledgeSources = knowledgeSources.map(function (knowledgeSource) { return (__assign(__assign({}, knowledgeSource), { preparationIds: undefined })); });
      tasks = tasks.map(function (task) {
          var dependentParameterNames = task.dependentParameterNames;
          var parameterNames = extractParameterNames(task.preparedContent || '');
          dependentParameterNames = dependentParameterNames.filter(function (dependentParameterName) { return !parameterNames.has(dependentParameterName); });
          var taskUnprepared = __assign(__assign({}, task), { dependentParameterNames: dependentParameterNames });
          delete taskUnprepared.preparedContent;
          return taskUnprepared;
      });
      return exportJson({
          name: 'pipelineJson',
          message: "Result of `unpreparePipeline`",
          order: ORDER_OF_PIPELINE_JSON,
          value: __assign(__assign({}, pipeline), { tasks: tasks, knowledgeSources: knowledgeSources, knowledgePieces: [], personas: personas, preparations: [] }),
      });
  }
  /**
   * TODO: [🧿] Maybe do same process with same granularity and subfinctions as `preparePipeline`
   * TODO: Write tests for `preparePipeline`
   * TODO: [🍙] Make some standard order of json properties
   */

  /**
   * Library of pipelines that groups together pipelines for an application.
   * This implementation is a very thin wrapper around the Array / Map of pipelines.
   *
   * @private internal function of `createCollectionFromJson`, use `createCollectionFromJson` instead
   * @see https://github.com/webgptorg/pipeline#pipeline-collection
   */
  var SimplePipelineCollection = /** @class */ (function () {
      /**
       * Constructs a pipeline collection from pipelines
       *
       * @param pipelines @@@
       *
       * Note: During the construction logic of all pipelines are validated
       * Note: It is not recommended to use this constructor directly, use `createCollectionFromJson` *(or other variant)* instead
       */
      function SimplePipelineCollection() {
          var e_1, _a;
          var pipelines = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              pipelines[_i] = arguments[_i];
          }
          this.collection = new Map();
          try {
              for (var pipelines_1 = __values(pipelines), pipelines_1_1 = pipelines_1.next(); !pipelines_1_1.done; pipelines_1_1 = pipelines_1.next()) {
                  var pipeline = pipelines_1_1.value;
                  // TODO: [👠] DRY
                  if (pipeline.pipelineUrl === undefined) {
                      throw new PipelineUrlError(spaceTrim.spaceTrim("\n                        Pipeline with name \"".concat(pipeline.title, "\" does not have defined URL\n\n                        File:\n                        ").concat(pipeline.sourceFile || 'Unknown', "\n\n                        Note: Pipelines without URLs are called anonymous pipelines\n                              They can be used as standalone pipelines, but they cannot be referenced by other pipelines\n                              And also they cannot be used in the pipeline collection\n\n                    ")));
                  }
                  // Note: [🐨]
                  validatePipeline(pipeline);
                  // TODO: [🦄] DRY
                  // Note: [🦄]
                  if (
                  // TODO: [🐽]
                  this.collection.has(pipeline.pipelineUrl) &&
                      pipelineJsonToString(unpreparePipeline(pipeline)) !==
                          pipelineJsonToString(unpreparePipeline(this.collection.get(pipeline.pipelineUrl)))) {
                      var existing = this.collection.get(pipeline.pipelineUrl);
                      throw new PipelineUrlError(spaceTrim.spaceTrim("\n                        Pipeline with URL ".concat(pipeline.pipelineUrl, " is already in the collection \uD83C\uDF4E\n\n                        Conflicting files:\n                        ").concat(existing.sourceFile || 'Unknown', "\n                        ").concat(pipeline.sourceFile || 'Unknown', "\n\n                        Note: You have probably forgotten to run \"ptbk make\" to update the collection\n                        Note: Pipelines with the same URL are not allowed\n                              Only exepction is when the pipelines are identical\n\n                    ")));
                  }
                  // Note: [🧠] Overwrite existing pipeline with the same URL
                  this.collection.set(pipeline.pipelineUrl, pipeline);
              }
          }
          catch (e_1_1) { e_1 = { error: e_1_1 }; }
          finally {
              try {
                  if (pipelines_1_1 && !pipelines_1_1.done && (_a = pipelines_1.return)) _a.call(pipelines_1);
              }
              finally { if (e_1) throw e_1.error; }
          }
      }
      /**
       * Gets all pipelines in the collection
       */
      SimplePipelineCollection.prototype.listPipelines = function () {
          return Array.from(this.collection.keys());
      };
      /**
       * Gets pipeline by its URL
       *
       * Note: This is not a direct fetching from the URL, but a lookup in the collection
       */
      SimplePipelineCollection.prototype.getPipelineByUrl = function (url) {
          var _this = this;
          var pipeline = this.collection.get(url);
          if (!pipeline) {
              if (this.listPipelines().length === 0) {
                  throw new NotFoundError(spaceTrim.spaceTrim("\n                            Pipeline with url \"".concat(url, "\" not found\n\n                            No pipelines available\n                        ")));
              }
              throw new NotFoundError(spaceTrim.spaceTrim(function (block) { return "\n                        Pipeline with url \"".concat(url, "\" not found\n\n                        Available pipelines:\n                        ").concat(block(_this.listPipelines()
                  .map(function (pipelineUrl) { return "- ".concat(pipelineUrl); })
                  .join('\n')), "\n\n                    "); }));
          }
          return pipeline;
      };
      /**
       * Checks whether given prompt was defined in any pipeline in the collection
       */
      SimplePipelineCollection.prototype.isResponsibleForPrompt = function (prompt) {
          return true;
      };
      return SimplePipelineCollection;
  }());

  /**
   * Creates PipelineCollection from array of PipelineJson or PipelineString
   *
   * Note: Functions `collectionToJson` and `createCollectionFromJson` are complementary
   * Note: Syntax, parsing, and logic consistency checks are performed on all sources during build
   *
   * @param promptbookSources
   * @returns PipelineCollection
   * @public exported from `@promptbook/core`
   */
  function createCollectionFromJson() {
      var promptbooks = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          promptbooks[_i] = arguments[_i];
      }
      return new (SimplePipelineCollection.bind.apply(SimplePipelineCollection, __spreadArray([void 0], __read(promptbooks), false)))();
  }

  /**
   * Deserializes the error object
   *
   * @public exported from `@promptbook/utils`
   */
  function deserializeError(error) {
      var name = error.name, stack = error.stack;
      var message = error.message;
      var ErrorClass = ALL_ERRORS[error.name];
      if (ErrorClass === undefined) {
          ErrorClass = Error;
          message = "".concat(name, ": ").concat(message);
      }
      if (stack !== undefined && stack !== '') {
          message = spaceTrim__default["default"](function (block) { return "\n                ".concat(block(message), "\n\n                Original stack trace:\n                ").concat(block(stack || ''), "\n            "); });
      }
      return new ErrorClass(message);
  }

  /**
   * Asserts that the execution of a Promptbook is successful
   *
   * @param executionResult - The partial result of the Promptbook execution
   * @throws {PipelineExecutionError} If the execution is not successful or if multiple errors occurred
   * @public exported from `@promptbook/core`
   */
  function assertsExecutionSuccessful(executionResult) {
      var isSuccessful = executionResult.isSuccessful, errors = executionResult.errors;
      if (isSuccessful === true) {
          return;
      }
      if (errors.length === 0) {
          throw new PipelineExecutionError("Promptbook Execution failed because of unknown reason");
      }
      else if (errors.length === 1) {
          throw deserializeError(errors[0]);
      }
      else {
          throw new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                    Multiple errors occurred during Promptbook execution\n\n                    ".concat(block(errors
              .map(function (_a, index) {
              var name = _a.name, stack = _a.stack, message = _a.message;
              return spaceTrim.spaceTrim(function (block) { return "\n                                        ".concat(name, " ").concat(index + 1, ":\n                                        ").concat(block(stack || message), "\n                                    "); });
          })
              .join('\n')), "\n                "); }));
      }
  }
  /**
   * TODO: [🐚] This function should be removed OR changed OR be completely rewritten
   * TODO: [🧠] Can this return type be better typed than void
   */

  /**
   * Determine if the pipeline is fully prepared
   *
   * @see https://github.com/webgptorg/promptbook/discussions/196
   *
   * @public exported from `@promptbook/core`
   */
  function isPipelinePrepared(pipeline) {
      // Note: Ignoring `pipeline.preparations` @@@
      // Note: Ignoring `pipeline.knowledgePieces` @@@
      if (pipeline.title === undefined || pipeline.title === '' || pipeline.title === DEFAULT_BOOK_TITLE) {
          return false;
      }
      if (!pipeline.personas.every(function (persona) { return persona.modelRequirements !== undefined; })) {
          return false;
      }
      if (!pipeline.knowledgeSources.every(function (knowledgeSource) { return knowledgeSource.preparationIds !== undefined; })) {
          return false;
      }
      /*
      TODO: [🧠][🍫] `tasks` can not be determined if they are fully prepared SO ignoring them
      > if (!pipeline.tasks.every(({ preparedContent }) => preparedContent === undefined)) {
      >     return false;
      > }
      */
      return true;
  }
  /**
   * TODO: [🔃][main] If the pipeline was prepared with different version or different set of models, prepare it once again
   * TODO: [🐠] Maybe base this on `makeValidator`
   * TODO: [🧊] Pipeline can be partially prepared, this should return true ONLY if fully prepared
   * TODO: [🧿] Maybe do same process with same granularity and subfinctions as `preparePipeline`
   *     - [🏍] ? Is context in each task
   *     - [♨] Are examples prepared
   *     - [♨] Are tasks prepared
   */

  /**
   * Format either small or big number
   *
   * @public exported from `@promptbook/utils`
   */
  function numberToString(value) {
      if (value === 0) {
          return '0';
      }
      else if (Number.isNaN(value)) {
          return VALUE_STRINGS.nan;
      }
      else if (value === Infinity) {
          return VALUE_STRINGS.infinity;
      }
      else if (value === -Infinity) {
          return VALUE_STRINGS.negativeInfinity;
      }
      for (var exponent = 0; exponent < 15; exponent++) {
          var factor = Math.pow(10, exponent);
          var valueRounded = Math.round(value * factor) / factor;
          if (Math.abs(value - valueRounded) / value < SMALL_NUMBER) {
              return valueRounded.toFixed(exponent);
          }
      }
      return value.toString();
  }

  /**
   * Function `valueToString` will convert the given value to string
   * This is useful and used in the `templateParameters` function
   *
   * Note: This function is not just calling `toString` method
   *       It's more complex and can handle this conversion specifically for LLM models
   *       See `VALUE_STRINGS`
   *
   * Note: There are 2 similar functions
   * - `valueToString` converts value to string for LLM models as human-readable string
   * - `asSerializable` converts value to string to preserve full information to be able to convert it back
   *
   * @public exported from `@promptbook/utils`
   */
  function valueToString(value) {
      try {
          if (value === '') {
              return VALUE_STRINGS.empty;
          }
          else if (value === null) {
              return VALUE_STRINGS.null;
          }
          else if (value === undefined) {
              return VALUE_STRINGS.undefined;
          }
          else if (typeof value === 'string') {
              return value;
          }
          else if (typeof value === 'number') {
              return numberToString(value);
          }
          else if (value instanceof Date) {
              return value.toISOString();
          }
          else {
              return JSON.stringify(value);
          }
      }
      catch (error) {
          if (!(error instanceof Error)) {console.log('!(error instanceof Error)')
              throw error;
          }
          console.error(error);
          return VALUE_STRINGS.unserializable;
      }
  }

  /**
   * Represents the usage with no resources consumed
   *
   * @public exported from `@promptbook/core`
   */
  var ZERO_USAGE = $deepFreeze({
      price: { value: 0 },
      input: {
          tokensCount: { value: 0 },
          charactersCount: { value: 0 },
          wordsCount: { value: 0 },
          sentencesCount: { value: 0 },
          linesCount: { value: 0 },
          paragraphsCount: { value: 0 },
          pagesCount: { value: 0 },
      },
      output: {
          tokensCount: { value: 0 },
          charactersCount: { value: 0 },
          wordsCount: { value: 0 },
          sentencesCount: { value: 0 },
          linesCount: { value: 0 },
          paragraphsCount: { value: 0 },
          pagesCount: { value: 0 },
      },
  });
  /**
   * Represents the usage with unknown resources consumed
   *
   * @public exported from `@promptbook/core`
   */
  $deepFreeze({
      price: { value: 0, isUncertain: true },
      input: {
          tokensCount: { value: 0, isUncertain: true },
          charactersCount: { value: 0, isUncertain: true },
          wordsCount: { value: 0, isUncertain: true },
          sentencesCount: { value: 0, isUncertain: true },
          linesCount: { value: 0, isUncertain: true },
          paragraphsCount: { value: 0, isUncertain: true },
          pagesCount: { value: 0, isUncertain: true },
      },
      output: {
          tokensCount: { value: 0, isUncertain: true },
          charactersCount: { value: 0, isUncertain: true },
          wordsCount: { value: 0, isUncertain: true },
          sentencesCount: { value: 0, isUncertain: true },
          linesCount: { value: 0, isUncertain: true },
          paragraphsCount: { value: 0, isUncertain: true },
          pagesCount: { value: 0, isUncertain: true },
      },
  });
  /**
   * Note: [💞] Ignore a discrepancy between file name and entity name
   */

  /**
   * Function `addUsage` will add multiple usages into one
   *
   * Note: If you provide 0 values, it returns ZERO_USAGE
   *
   * @public exported from `@promptbook/core`
   */
  function addUsage() {
      var usageItems = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          usageItems[_i] = arguments[_i];
      }
      return usageItems.reduce(function (acc, item) {
          var e_1, _a, e_2, _b;
          var _c;
          acc.price.value += ((_c = item.price) === null || _c === void 0 ? void 0 : _c.value) || 0;
          try {
              for (var _d = __values(Object.keys(acc.input)), _e = _d.next(); !_e.done; _e = _d.next()) {
                  var key = _e.value;
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  //@ts-ignore
                  if (item.input[key]) {
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      //@ts-ignore
                      acc.input[key].value += item.input[key].value || 0;
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      //@ts-ignore
                      if (item.input[key].isUncertain) {
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          //@ts-ignore
                          acc.input[key].isUncertain = true;
                      }
                  }
              }
          }
          catch (e_1_1) { e_1 = { error: e_1_1 }; }
          finally {
              try {
                  if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
              }
              finally { if (e_1) throw e_1.error; }
          }
          try {
              for (var _f = __values(Object.keys(acc.output)), _g = _f.next(); !_g.done; _g = _f.next()) {
                  var key = _g.value;
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  //@ts-ignore
                  if (item.output[key]) {
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      //@ts-ignore
                      acc.output[key].value += item.output[key].value || 0;
                      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                      //@ts-ignore
                      if (item.output[key].isUncertain) {
                          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                          //@ts-ignore
                          acc.output[key].isUncertain = true;
                      }
                  }
              }
          }
          catch (e_2_1) { e_2 = { error: e_2_1 }; }
          finally {
              try {
                  if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
              }
              finally { if (e_2) throw e_2.error; }
          }
          return acc;
      }, deepClone(ZERO_USAGE));
  }

  /**
   * Parses the given script and returns the list of all used variables that are not defined in the script
   *
   * @param script from which to extract the variables
   * @returns the list of variable names
   * @throws {ParseError} if the script is invalid
   * @public exported from `@promptbook/utils` <- Note: [👖] This is usable elsewhere than in Promptbook, so keeping in utils
   */
  function extractVariablesFromScript(script) {
      var variables = new Set();
      var originalScript = script;
      script = "(()=>{".concat(script, "})()");
      try {
          for (var i = 0; i < 100 /* <- TODO: This limit to configuration */; i++)
              try {
                  eval(script);
              }
              catch (error) {
                  if (!(error instanceof ReferenceError)) {
                      throw error;
                  }
                  /*
                  Note: Parsing the error
                        🌟 Most devices:
                        [PipelineUrlError: thing is not defined]

                        🍏 iPhone`s Safari:
                        [PipelineUrlError: Can't find variable: thing]
                  */
                  var variableName = undefined;
                  if (error.message.startsWith("Can't")) {
                      // 🍏 Case
                      variableName = error.message.split(' ').pop();
                  }
                  else {
                      // 🌟 Case
                      variableName = error.message.split(' ').shift();
                  }
                  if (variableName === undefined) {
                      throw error;
                  }
                  if (script.includes(variableName + '(')) {
                      script = "const ".concat(variableName, " = ()=>'';") + script;
                  }
                  else {
                      variables.add(variableName);
                      script = "const ".concat(variableName, " = '';") + script;
                  }
              }
      }
      catch (error) {
          if (!(error instanceof Error)) {console.log('!(error instanceof Error)')
              throw error;
          }
          throw new ParseError(spaceTrim.spaceTrim(function (block) { return "\n                    Can not extract variables from the script\n                    ".concat(block(error.stack || error.message), "\n\n                    Found variables:\n                    ").concat(Array.from(variables)
              .map(function (variableName, i) { return "".concat(i + 1, ") ").concat(variableName); })
              .join('\n'), "\n\n\n                    The script:\n\n                    ```javascript\n                    ").concat(block(originalScript), "\n                    ```\n                "); }));
      }
      return variables;
  }
  /**
   * TODO: [🔣] Support for multiple languages - python, java,...
   */

  /**
   * Parses the task and returns the set of all used parameters
   *
   * @param task the task with used parameters
   * @returns the set of parameter names
   * @throws {ParseError} if the script is invalid
   * @public exported from `@promptbook/core` <- Note: [👖] This utility is so tightly interconnected with the Promptbook that it is not exported as util but in core
   */
  function extractParameterNamesFromTask(task) {
      var e_1, _a, e_2, _b, e_3, _c, e_4, _d;
      var title = task.title, description = task.description, taskType = task.taskType, content = task.content, preparedContent = task.preparedContent, jokerParameterNames = task.jokerParameterNames, foreach = task.foreach;
      var parameterNames = new Set();
      try {
          for (var _e = __values(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], __read(extractParameterNames(title)), false), __read(extractParameterNames(description || '')), false), __read(extractParameterNames(content)), false), __read(extractParameterNames(preparedContent || '')), false)), _f = _e.next(); !_f.done; _f = _e.next()) {
              var parameterName = _f.value;
              parameterNames.add(parameterName);
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (_f && !_f.done && (_a = _e.return)) _a.call(_e);
          }
          finally { if (e_1) throw e_1.error; }
      }
      if (taskType === 'SCRIPT_TASK') {
          try {
              for (var _g = __values(extractVariablesFromScript(content)), _h = _g.next(); !_h.done; _h = _g.next()) {
                  var parameterName = _h.value;
                  parameterNames.add(parameterName);
              }
          }
          catch (e_2_1) { e_2 = { error: e_2_1 }; }
          finally {
              try {
                  if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
              }
              finally { if (e_2) throw e_2.error; }
          }
      }
      try {
          for (var _j = __values(jokerParameterNames || []), _k = _j.next(); !_k.done; _k = _j.next()) {
              var jokerName = _k.value;
              parameterNames.add(jokerName);
          }
      }
      catch (e_3_1) { e_3 = { error: e_3_1 }; }
      finally {
          try {
              if (_k && !_k.done && (_c = _j.return)) _c.call(_j);
          }
          finally { if (e_3) throw e_3.error; }
      }
      parameterNames.delete('content');
      //                      <- Note {websiteContent} is used in `preparedContent`
      // Note: [🍭] Fixing dependent subparameterName from FOREACH command
      if (foreach !== undefined) {
          try {
              for (var _l = __values(foreach.inputSubparameterNames), _m = _l.next(); !_m.done; _m = _l.next()) {
                  var subparameterName = _m.value;
                  if (parameterNames.has(subparameterName)) {
                      parameterNames.delete(subparameterName);
                      parameterNames.add(foreach.parameterName);
                      // <- TODO: [🚎] Warn/logic error when `subparameterName` not used
                  }
              }
          }
          catch (e_4_1) { e_4 = { error: e_4_1 }; }
          finally {
              try {
                  if (_m && !_m.done && (_d = _l.return)) _d.call(_l);
              }
              finally { if (e_4) throw e_4.error; }
          }
      }
      return parameterNames;
  }
  /**
   * TODO: [🔣] If script require contentLanguage
   */

  /**
   * Create difference set of two sets.
   *
   * @deprecated use new javascript set methods instead @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
   * @public exported from `@promptbook/utils`
   */
  function difference(a, b, isEqual) {
      var e_1, _a;
      if (isEqual === void 0) { isEqual = function (a, b) { return a === b; }; }
      var diff = new Set();
      var _loop_1 = function (itemA) {
          if (!Array.from(b).some(function (itemB) { return isEqual(itemA, itemB); })) {
              diff.add(itemA);
          }
      };
      try {
          for (var _b = __values(Array.from(a)), _c = _b.next(); !_c.done; _c = _b.next()) {
              var itemA = _c.value;
              _loop_1(itemA);
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          }
          finally { if (e_1) throw e_1.error; }
      }
      return diff;
  }
  /**
   * TODO: [🧠][💯] Maybe also implement symmetricDifference
   */

  /**
   * Creates a new set with all elements that are present in either set
   *
   * @deprecated use new javascript set methods instead @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
   * @public exported from `@promptbook/utils`
   */
  function union() {
      var e_1, _a, e_2, _b;
      var sets = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          sets[_i] = arguments[_i];
      }
      var union = new Set();
      try {
          for (var sets_1 = __values(sets), sets_1_1 = sets_1.next(); !sets_1_1.done; sets_1_1 = sets_1.next()) {
              var set = sets_1_1.value;
              try {
                  for (var _c = (e_2 = void 0, __values(Array.from(set))), _d = _c.next(); !_d.done; _d = _c.next()) {
                      var item = _d.value;
                      union.add(item);
                  }
              }
              catch (e_2_1) { e_2 = { error: e_2_1 }; }
              finally {
                  try {
                      if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                  }
                  finally { if (e_2) throw e_2.error; }
              }
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (sets_1_1 && !sets_1_1.done && (_a = sets_1.return)) _a.call(sets_1);
          }
          finally { if (e_1) throw e_1.error; }
      }
      return union;
  }

  /**
   * @@@
   *
   * @public exported from `@promptbook/core`
   */
  var MANDATORY_CSV_SETTINGS = Object.freeze({
      header: true,
      // encoding: 'utf-8',
  });

  /**
   * Definition for CSV spreadsheet
   *
   * @public exported from `@promptbook/core`
   *                          <- TODO: [🏢] Export from package `@promptbook/csv`
   */
  var CsvFormatDefinition = {
      formatName: 'CSV',
      aliases: ['SPREADSHEET', 'TABLE'],
      isValid: function (value, settings, schema) {
          return true;
      },
      canBeValid: function (partialValue, settings, schema) {
          return true;
      },
      heal: function (value, settings, schema) {
          throw new Error('Not implemented');
      },
      subvalueDefinitions: [
          {
              subvalueName: 'ROW',
              mapValues: function (value, outputParameterName, settings, mapCallback) {
                  return __awaiter(this, void 0, void 0, function () {
                      var csv, mappedData;
                      var _this = this;
                      return __generator(this, function (_a) {
                          switch (_a.label) {
                              case 0:
                                  csv = papaparse.parse(value, __assign(__assign({}, settings), MANDATORY_CSV_SETTINGS));
                                  if (csv.errors.length !== 0) {
                                      throw new CsvFormatError(spaceTrim__default["default"](function (block) { return "\n                                CSV parsing error\n\n                                Error(s) from CSV parsing:\n                                ".concat(block(csv.errors.map(function (error) { return error.message; }).join('\n\n')), "\n\n                                The CSV setings:\n                                ").concat(block(JSON.stringify(__assign(__assign({}, settings), MANDATORY_CSV_SETTINGS), null, 2)), "\n\n                                The CSV data:\n                                ").concat(block(value), "\n                            "); }));
                                  }
                                  return [4 /*yield*/, Promise.all(csv.data.map(function (row, index) { return __awaiter(_this, void 0, void 0, function () {
                                          var _a, _b;
                                          var _c;
                                          return __generator(this, function (_d) {
                                              switch (_d.label) {
                                                  case 0:
                                                      if (row[outputParameterName]) {
                                                          throw new CsvFormatError("Can not overwrite existing column \"".concat(outputParameterName, "\" in CSV row"));
                                                      }
                                                      _a = [__assign({}, row)];
                                                      _c = {};
                                                      _b = outputParameterName;
                                                      return [4 /*yield*/, mapCallback(row, index)];
                                                  case 1: return [2 /*return*/, __assign.apply(void 0, _a.concat([(_c[_b] = _d.sent(), _c)]))];
                                              }
                                          });
                                      }); }))];
                              case 1:
                                  mappedData = _a.sent();
                                  return [2 /*return*/, papaparse.unparse(mappedData, __assign(__assign({}, settings), MANDATORY_CSV_SETTINGS))];
                          }
                      });
                  });
              },
          },
          {
              subvalueName: 'CELL',
              mapValues: function (value, outputParameterName, settings, mapCallback) {
                  return __awaiter(this, void 0, void 0, function () {
                      var csv, mappedData;
                      var _this = this;
                      return __generator(this, function (_a) {
                          switch (_a.label) {
                              case 0:
                                  csv = papaparse.parse(value, __assign(__assign({}, settings), MANDATORY_CSV_SETTINGS));
                                  if (csv.errors.length !== 0) {
                                      throw new CsvFormatError(spaceTrim__default["default"](function (block) { return "\n                                CSV parsing error\n\n                                Error(s) from CSV parsing:\n                                ".concat(block(csv.errors.map(function (error) { return error.message; }).join('\n\n')), "\n\n                                The CSV setings:\n                                ").concat(block(JSON.stringify(__assign(__assign({}, settings), MANDATORY_CSV_SETTINGS), null, 2)), "\n\n                                The CSV data:\n                                ").concat(block(value), "\n                            "); }));
                                  }
                                  return [4 /*yield*/, Promise.all(csv.data.map(function (row, rowIndex) { return __awaiter(_this, void 0, void 0, function () {
                                          var _this = this;
                                          return __generator(this, function (_a) {
                                              return [2 /*return*/, /* not await */ Promise.all(Object.entries(row).map(function (_a, columnIndex) {
                                                      var _b = __read(_a, 2), key = _b[0], value = _b[1];
                                                      return __awaiter(_this, void 0, void 0, function () {
                                                          var index;
                                                          var _c;
                                                          return __generator(this, function (_d) {
                                                              index = rowIndex * Object.keys(row).length + columnIndex;
                                                              return [2 /*return*/, /* not await */ mapCallback((_c = {}, _c[key] = value, _c), index)];
                                                          });
                                                      });
                                                  }))];
                                          });
                                      }); }))];
                              case 1:
                                  mappedData = _a.sent();
                                  return [2 /*return*/, papaparse.unparse(mappedData, __assign(__assign({}, settings), MANDATORY_CSV_SETTINGS))];
                          }
                      });
                  });
              },
          },
      ],
  };
  /**
   * TODO: [🍓] In `CsvFormatDefinition` implement simple `isValid`
   * TODO: [🍓] In `CsvFormatDefinition` implement partial `canBeValid`
   * TODO: [🍓] In `CsvFormatDefinition` implement `heal
   * TODO: [🍓] In `CsvFormatDefinition` implement `subvalueDefinitions`
   * TODO: [🏢] Allow to expect something inside CSV objects and other formats
   */

  /**
   * Definition for JSON format
   *
   * @private still in development [🏢]
   */
  var JsonFormatDefinition = {
      formatName: 'JSON',
      mimeType: 'application/json',
      isValid: function (value, settings, schema) {
          return isValidJsonString(value);
      },
      canBeValid: function (partialValue, settings, schema) {
          return true;
      },
      heal: function (value, settings, schema) {
          throw new Error('Not implemented');
      },
      subvalueDefinitions: [],
  };
  /**
   * TODO: [🧠] Maybe propper instance of object
   * TODO: [0] Make string_serialized_json
   * TODO: [1] Make type for JSON Settings and Schema
   * TODO: [🧠] What to use for validating JSONs - JSON Schema, ZoD, typescript types/interfaces,...?
   * TODO: [🍓] In `JsonFormatDefinition` implement simple `isValid`
   * TODO: [🍓] In `JsonFormatDefinition` implement partial `canBeValid`
   * TODO: [🍓] In `JsonFormatDefinition` implement `heal
   * TODO: [🍓] In `JsonFormatDefinition` implement `subvalueDefinitions`
   * TODO: [🏢] Allow to expect something inside JSON objects and other formats
   */

  /**
   * Definition for any text - this will be always valid
   *
   * Note: This is not useful for validation, but for splitting and mapping with `subvalueDefinitions`
   *
   * @public exported from `@promptbook/core`
   */
  var TextFormatDefinition = {
      formatName: 'TEXT',
      isValid: function (value) {
          return typeof value === 'string';
      },
      canBeValid: function (partialValue) {
          return typeof partialValue === 'string';
      },
      heal: function () {
          throw new UnexpectedError('It does not make sense to call `TextFormatDefinition.heal`');
      },
      subvalueDefinitions: [
          {
              subvalueName: 'LINE',
              mapValues: function (value, outputParameterName, settings, mapCallback) {
                  return __awaiter(this, void 0, void 0, function () {
                      var lines, mappedLines;
                      return __generator(this, function (_a) {
                          switch (_a.label) {
                              case 0:
                                  lines = value.split('\n');
                                  return [4 /*yield*/, Promise.all(lines.map(function (lineContent, lineNumber) {
                                          // TODO: [🧠] Maybe option to skip empty line
                                          /* not await */ return mapCallback({
                                              lineContent: lineContent,
                                              // TODO: [🧠] Maybe also put here `lineNumber`
                                          }, lineNumber);
                                      }))];
                              case 1:
                                  mappedLines = _a.sent();
                                  return [2 /*return*/, mappedLines.join('\n')];
                          }
                      });
                  });
              },
          },
          // <- TODO: [🧠][🤠] Here should be all words, characters, lines, paragraphs, pages aviable as subvalues
      ],
  };
  /**
   * TODO: [1] Make type for XML Text and Schema
   * TODO: [🧠][🤠] Here should be all words, characters, lines, paragraphs, pages aviable as subvalues
   * TODO: [🍓] In `TextFormatDefinition` implement simple `isValid`
   * TODO: [🍓] In `TextFormatDefinition` implement partial `canBeValid`
   * TODO: [🍓] In `TextFormatDefinition` implement `heal
   * TODO: [🍓] In `TextFormatDefinition` implement `subvalueDefinitions`
   * TODO: [🏢] Allow to expect something inside each item of list and other formats
   */

  /**
   * Definition for XML format
   *
   * @private still in development [🏢]
   */
  var XmlFormatDefinition = {
      formatName: 'XML',
      mimeType: 'application/xml',
      isValid: function (value, settings, schema) {
          return true;
      },
      canBeValid: function (partialValue, settings, schema) {
          return true;
      },
      heal: function (value, settings, schema) {
          throw new Error('Not implemented');
      },
      subvalueDefinitions: [],
  };
  /**
   * TODO: [🧠] Maybe propper instance of object
   * TODO: [0] Make string_serialized_xml
   * TODO: [1] Make type for XML Settings and Schema
   * TODO: [🧠] What to use for validating XMLs - XSD,...
   * TODO: [🍓] In `XmlFormatDefinition` implement simple `isValid`
   * TODO: [🍓] In `XmlFormatDefinition` implement partial `canBeValid`
   * TODO: [🍓] In `XmlFormatDefinition` implement `heal
   * TODO: [🍓] In `XmlFormatDefinition` implement `subvalueDefinitions`
   * TODO: [🏢] Allow to expect something inside XML and other formats
   */

  /**
   * Definitions for all formats supported by Promptbook
   *
   * @private internal index of `...` <- TODO [🏢]
   */
  var FORMAT_DEFINITIONS = [
      JsonFormatDefinition,
      XmlFormatDefinition,
      TextFormatDefinition,
      CsvFormatDefinition,
  ];
  /**
   * Note: [💞] Ignore a discrepancy between file name and entity name
   */

  /**
   * Maps available parameters to expected parameters
   *
   * The strategy is:
   * 1) @@@
   * 2) @@@
   *
   * @throws {PipelineExecutionError} @@@
   * @private within the repository used in `createPipelineExecutor`
   */
  function mapAvailableToExpectedParameters(options) {
      var e_1, _a;
      var expectedParameters = options.expectedParameters, availableParameters = options.availableParameters;
      var availableParametersNames = new Set(Object.keys(availableParameters));
      var expectedParameterNames = new Set(Object.keys(expectedParameters));
      var mappedParameters = {};
      try {
          // Phase 1️⃣: Matching mapping
          for (var _b = __values(Array.from(union(availableParametersNames, expectedParameterNames))), _c = _b.next(); !_c.done; _c = _b.next()) {
              var parameterName = _c.value;
              // Situation: Parameter is available and expected
              if (availableParametersNames.has(parameterName) && expectedParameterNames.has(parameterName)) {
                  mappedParameters[parameterName] = availableParameters[parameterName];
                  // <- Note: [👩‍👩‍👧] Maybe detect parameter collision here?
                  availableParametersNames.delete(parameterName);
                  expectedParameterNames.delete(parameterName);
              }
              // Situation: Parameter is available but NOT expected
              else if (availableParametersNames.has(parameterName) && !expectedParameterNames.has(parameterName)) {
                  // [🐱‍👤] Do not pass this parameter to prompt - Maybe use it non-matching mapping
              }
              // Situation: Parameter is NOT available BUT expected
              else if (!availableParametersNames.has(parameterName) && expectedParameterNames.has(parameterName)) {
                  //  Do nothing here - this will be maybe fixed in the non-matching mapping
              }
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          }
          finally { if (e_1) throw e_1.error; }
      }
      if (expectedParameterNames.size === 0) {
          // Note: [👨‍👨‍👧] Now we can freeze `mappedParameters` to prevent @@@
          Object.freeze(mappedParameters);
          return mappedParameters;
      }
      // Phase 2️⃣: Non-matching mapping
      if (expectedParameterNames.size !== availableParametersNames.size) {
          throw new PipelineExecutionError(spaceTrim__default["default"](function (block) { return "\n                    Can not map available parameters to expected parameters\n\n                    Mapped parameters:\n                    ".concat(block(Object.keys(mappedParameters)
              .map(function (parameterName) { return "- {".concat(parameterName, "}"); })
              .join('\n')), "\n\n                    Expected parameters which can not be mapped:\n                    ").concat(block(Array.from(expectedParameterNames)
              .map(function (parameterName) { return "- {".concat(parameterName, "}"); })
              .join('\n')), "\n\n                    Remaining available parameters:\n                    ").concat(block(Array.from(availableParametersNames)
              .map(function (parameterName) { return "- {".concat(parameterName, "}"); })
              .join('\n')), "\n\n                "); }));
      }
      var expectedParameterNamesArray = Array.from(expectedParameterNames);
      var availableParametersNamesArray = Array.from(availableParametersNames);
      for (var i = 0; i < expectedParameterNames.size; i++) {
          mappedParameters[expectedParameterNamesArray[i]] = availableParameters[availableParametersNamesArray[i]];
      }
      // Note: [👨‍👨‍👧] Now we can freeze `mappedParameters` to prevent @@@
      Object.freeze(mappedParameters);
      return mappedParameters;
  }

  /**
   * Extracts all code blocks from markdown.
   *
   * Note: There are multiple simmilar function:
   * - `extractBlock` just extracts the content of the code block which is also used as build-in function for postprocessing
   * - `extractJsonBlock` extracts exactly one valid JSON code block
   * - `extractOneBlockFromMarkdown` extracts exactly one code block with language of the code block
   * - `extractAllBlocksFromMarkdown` extracts all code blocks with language of the code block
   *
   * @param markdown any valid markdown
   * @returns code blocks with language and content
   * @throws {ParseError} if block is not closed properly
   * @public exported from `@promptbook/markdown-utils`
   */
  function extractAllBlocksFromMarkdown(markdown) {
      var e_1, _a;
      var codeBlocks = [];
      var lines = markdown.split('\n');
      // Note: [0] Ensure that the last block notated by gt > will be closed
      lines.push('');
      var currentCodeBlock = null;
      try {
          for (var lines_1 = __values(lines), lines_1_1 = lines_1.next(); !lines_1_1.done; lines_1_1 = lines_1.next()) {
              var line = lines_1_1.value;
              if (line.startsWith('> ') || line === '>') {
                  if (currentCodeBlock === null) {
                      currentCodeBlock = { blockNotation: '>', language: null, content: '' };
                  } /* not else */
                  if (currentCodeBlock.blockNotation === '>') {
                      if (currentCodeBlock.content !== '') {
                          currentCodeBlock.content += '\n';
                      }
                      currentCodeBlock.content += line.slice(2);
                  }
              }
              else if (currentCodeBlock !== null && currentCodeBlock.blockNotation === '>' /* <- Note: [0] */) {
                  codeBlocks.push(currentCodeBlock);
                  currentCodeBlock = null;
              }
              /* not else */
              if (line.startsWith('```')) {
                  var language = line.slice(3).trim() || null;
                  if (currentCodeBlock === null) {
                      currentCodeBlock = { blockNotation: '```', language: language, content: '' };
                  }
                  else {
                      if (language !== null) {
                          throw new ParseError("".concat(capitalize(currentCodeBlock.language || 'the'), " code block was not closed and already opening new ").concat(language, " code block"));
                      }
                      codeBlocks.push(currentCodeBlock);
                      currentCodeBlock = null;
                  }
              }
              else if (currentCodeBlock !== null && currentCodeBlock.blockNotation === '```') {
                  if (currentCodeBlock.content !== '') {
                      currentCodeBlock.content += '\n';
                  }
                  currentCodeBlock.content += line.split('\\`\\`\\`').join('```') /* <- TODO: Maybe make propper unescape */;
              }
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (lines_1_1 && !lines_1_1.done && (_a = lines_1.return)) _a.call(lines_1);
          }
          finally { if (e_1) throw e_1.error; }
      }
      if (currentCodeBlock !== null) {
          throw new ParseError("".concat(capitalize(currentCodeBlock.language || 'the'), " code block was not closed at the end of the markdown"));
      }
      return codeBlocks;
  }
  /**
   * TODO: Maybe name for `blockNotation` instead of  '```' and '>'
   */

  /**
   * Extracts  extracts exactly one valid JSON code block
   *
   * - When given string is a valid JSON as it is, it just returns it
   * - When there is no JSON code block the function throws a `ParseError`
   * - When there are multiple JSON code blocks the function throws a `ParseError`
   *
   * Note: It is not important if marked as ```json BUT if it is VALID JSON
   * Note: There are multiple simmilar function:
   * - `extractBlock` just extracts the content of the code block which is also used as build-in function for postprocessing
   * - `extractJsonBlock` extracts exactly one valid JSON code block
   * - `extractOneBlockFromMarkdown` extracts exactly one code block with language of the code block
   * - `extractAllBlocksFromMarkdown` extracts all code blocks with language of the code block
   *
   * @public exported from `@promptbook/markdown-utils`
   * @throws {ParseError} if there is no valid JSON block in the markdown
   */
  function extractJsonBlock(markdown) {
      if (isValidJsonString(markdown)) {
          return markdown;
      }
      var codeBlocks = extractAllBlocksFromMarkdown(markdown);
      var jsonBlocks = codeBlocks.filter(function (_a) {
          var content = _a.content;
          return isValidJsonString(content);
      });
      if (jsonBlocks.length === 0) {
          throw new Error('There is no valid JSON block in the markdown');
      }
      if (jsonBlocks.length > 1) {
          throw new Error('There are multiple JSON code blocks in the markdown');
      }
      return jsonBlocks[0].content;
  }
  /**
   * TODO: Add some auto-healing logic + extract YAML, JSON5, TOML, etc.
   * TODO: [🏢] Make this logic part of `JsonFormatDefinition` or `isValidJsonString`
   */

  /**
   * Takes an item or an array of items and returns an array of items
   *
   * 1) Any item except array and undefined returns array with that one item (also null)
   * 2) Undefined returns empty array
   * 3) Array returns itself
   *
   * @private internal utility
   */
  function arrayableToArray(input) {
      if (input === undefined) {
          return [];
      }
      if (input instanceof Array) {
          return input;
      }
      return [input];
  }

  /**
   * Replaces parameters in template with values from parameters object
   *
   * Note: This function is not places strings into string,
   *       It's more complex and can handle this operation specifically for LLM models
   *
   * @param template the template with parameters in {curly} braces
   * @param parameters the object with parameters
   * @returns the template with replaced parameters
   * @throws {PipelineExecutionError} if parameter is not defined, not closed, or not opened
   * @public exported from `@promptbook/utils`
   */
  function templateParameters(template, parameters) {
      var e_1, _a;
      try {
          for (var _b = __values(Object.entries(parameters)), _c = _b.next(); !_c.done; _c = _b.next()) {
              var _d = __read(_c.value, 2), parameterName = _d[0], parameterValue = _d[1];
              if (parameterValue === RESERVED_PARAMETER_MISSING_VALUE) {
                  throw new UnexpectedError("Parameter `{".concat(parameterName, "}` has missing value"));
              }
              else if (parameterValue === RESERVED_PARAMETER_RESTRICTED) {
                  // TODO: [🍵]
                  throw new UnexpectedError("Parameter `{".concat(parameterName, "}` is restricted to use"));
              }
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          }
          finally { if (e_1) throw e_1.error; }
      }
      var replacedTemplates = template;
      var match;
      var loopLimit = LOOP_LIMIT;
      var _loop_1 = function () {
          if (loopLimit-- < 0) {
              throw new LimitReachedError('Loop limit reached during parameters replacement in `templateParameters`');
          }
          var precol = match.groups.precol;
          var parameterName = match.groups.parameterName;
          if (parameterName === '') {
              return "continue";
          }
          if (parameterName.indexOf('{') !== -1 || parameterName.indexOf('}') !== -1) {
              throw new PipelineExecutionError('Parameter is already opened or not closed');
          }
          if (parameters[parameterName] === undefined) {
              throw new PipelineExecutionError("Parameter `{".concat(parameterName, "}` is not defined"));
          }
          var parameterValue = parameters[parameterName];
          if (parameterValue === undefined) {
              throw new PipelineExecutionError("Parameter `{".concat(parameterName, "}` is not defined"));
          }
          parameterValue = valueToString(parameterValue);
          // Escape curly braces in parameter values to prevent prompt-injection
          parameterValue = parameterValue.replace(/[{}]/g, '\\$&');
          if (parameterValue.includes('\n') && /^\s*\W{0,3}\s*$/.test(precol)) {
              parameterValue = parameterValue
                  .split('\n')
                  .map(function (line, index) { return (index === 0 ? line : "".concat(precol).concat(line)); })
                  .join('\n');
          }
          replacedTemplates =
              replacedTemplates.substring(0, match.index + precol.length) +
                  parameterValue +
                  replacedTemplates.substring(match.index + precol.length + parameterName.length + 2);
      };
      while ((match = /^(?<precol>.*){(?<parameterName>\w+)}(.*)/m /* <- Not global */
          .exec(replacedTemplates))) {
          _loop_1();
      }
      // [💫] Check if there are parameters that are not closed properly
      if (/{\w+$/.test(replacedTemplates)) {
          throw new PipelineExecutionError('Parameter is not closed');
      }
      // [💫] Check if there are parameters that are not opened properly
      if (/^\w+}/.test(replacedTemplates)) {
          throw new PipelineExecutionError('Parameter is not opened');
      }
      return replacedTemplates;
  }

  /**
   * Counts number of characters in the text
   *
   * @public exported from `@promptbook/utils`
   */
  function countCharacters(text) {
      // Remove null characters
      text = text.replace(/\0/g, '');
      // Replace emojis (and also ZWJ sequence) with hyphens
      text = text.replace(/(\p{Extended_Pictographic})\p{Modifier_Symbol}/gu, '$1');
      text = text.replace(/(\p{Extended_Pictographic})[\u{FE00}-\u{FE0F}]/gu, '$1');
      text = text.replace(/\p{Extended_Pictographic}(\u{200D}\p{Extended_Pictographic})*/gu, '-');
      return text.length;
  }

  /**
   * Number of characters per standard line with 11pt Arial font size.
   *
   * @public exported from `@promptbook/utils`
   */
  var CHARACTERS_PER_STANDARD_LINE = 63;
  /**
   * Number of lines per standard A4 page with 11pt Arial font size and standard margins and spacing.
   *
   * @public exported from `@promptbook/utils`
   */
  var LINES_PER_STANDARD_PAGE = 44;
  /**
   * TODO: [🧠] Should be this `constants.ts` or `config.ts`?
   * Note: [💞] Ignore a discrepancy between file name and entity name
   */

  /**
   * Counts number of lines in the text
   *
   * Note: This does not check only for the presence of newlines, but also for the length of the standard line.
   *
   * @public exported from `@promptbook/utils`
   */
  function countLines(text) {
      text = text.replace('\r\n', '\n');
      text = text.replace('\r', '\n');
      var lines = text.split('\n');
      return lines.reduce(function (count, line) { return count + Math.ceil(line.length / CHARACTERS_PER_STANDARD_LINE); }, 0);
  }

  /**
   * Counts number of pages in the text
   *
   * Note: This does not check only for the count of newlines, but also for the length of the standard line and length of the standard page.
   *
   * @public exported from `@promptbook/utils`
   */
  function countPages(text) {
      return Math.ceil(countLines(text) / LINES_PER_STANDARD_PAGE);
  }

  /**
   * Counts number of paragraphs in the text
   *
   * @public exported from `@promptbook/utils`
   */
  function countParagraphs(text) {
      return text.split(/\n\s*\n/).filter(function (paragraph) { return paragraph.trim() !== ''; }).length;
  }

  /**
   * Split text into sentences
   *
   * @public exported from `@promptbook/utils`
   */
  function splitIntoSentences(text) {
      return text.split(/[.!?]+/).filter(function (sentence) { return sentence.trim() !== ''; });
  }
  /**
   * Counts number of sentences in the text
   *
   * @public exported from `@promptbook/utils`
   */
  function countSentences(text) {
      return splitIntoSentences(text).length;
  }

  var defaultDiacriticsRemovalMap = [
      {
          base: 'A',
          letters: '\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F',
      },
      { base: 'AA', letters: '\uA732' },
      { base: 'AE', letters: '\u00C6\u01FC\u01E2' },
      { base: 'AO', letters: '\uA734' },
      { base: 'AU', letters: '\uA736' },
      { base: 'AV', letters: '\uA738\uA73A' },
      { base: 'AY', letters: '\uA73C' },
      {
          base: 'B',
          letters: '\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181',
      },
      {
          base: 'C',
          letters: '\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E',
      },
      {
          base: 'D',
          letters: '\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779\u00D0',
      },
      { base: 'DZ', letters: '\u01F1\u01C4' },
      { base: 'Dz', letters: '\u01F2\u01C5' },
      {
          base: 'E',
          letters: '\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E',
      },
      { base: 'F', letters: '\u0046\u24BB\uFF26\u1E1E\u0191\uA77B' },
      {
          base: 'G',
          letters: '\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E',
      },
      {
          base: 'H',
          letters: '\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D',
      },
      {
          base: 'I',
          letters: '\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197',
      },
      { base: 'J', letters: '\u004A\u24BF\uFF2A\u0134\u0248' },
      {
          base: 'K',
          letters: '\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2',
      },
      {
          base: 'L',
          letters: '\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780',
      },
      { base: 'LJ', letters: '\u01C7' },
      { base: 'Lj', letters: '\u01C8' },
      { base: 'M', letters: '\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C' },
      {
          base: 'N',
          letters: '\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4',
      },
      { base: 'NJ', letters: '\u01CA' },
      { base: 'Nj', letters: '\u01CB' },
      {
          base: 'O',
          letters: '\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C',
      },
      { base: 'OI', letters: '\u01A2' },
      { base: 'OO', letters: '\uA74E' },
      { base: 'OU', letters: '\u0222' },
      { base: 'OE', letters: '\u008C\u0152' },
      { base: 'oe', letters: '\u009C\u0153' },
      {
          base: 'P',
          letters: '\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754',
      },
      { base: 'Q', letters: '\u0051\u24C6\uFF31\uA756\uA758\u024A' },
      {
          base: 'R',
          letters: '\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782',
      },
      {
          base: 'S',
          letters: '\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784',
      },
      {
          base: 'T',
          letters: '\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786',
      },
      { base: 'TZ', letters: '\uA728' },
      {
          base: 'U',
          letters: '\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244',
      },
      { base: 'V', letters: '\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245' },
      { base: 'VY', letters: '\uA760' },
      {
          base: 'W',
          letters: '\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72',
      },
      { base: 'X', letters: '\u0058\u24CD\uFF38\u1E8A\u1E8C' },
      {
          base: 'Y',
          letters: '\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE',
      },
      {
          base: 'Z',
          letters: '\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762',
      },
      {
          base: 'a',
          letters: '\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250',
      },
      { base: 'aa', letters: '\uA733' },
      { base: 'ae', letters: '\u00E6\u01FD\u01E3' },
      { base: 'ao', letters: '\uA735' },
      { base: 'au', letters: '\uA737' },
      { base: 'av', letters: '\uA739\uA73B' },
      { base: 'ay', letters: '\uA73D' },
      {
          base: 'b',
          letters: '\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253',
      },
      {
          base: 'c',
          letters: '\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184',
      },
      {
          base: 'd',
          letters: '\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A',
      },
      { base: 'dz', letters: '\u01F3\u01C6' },
      {
          base: 'e',
          letters: '\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD',
      },
      { base: 'f', letters: '\u0066\u24D5\uFF46\u1E1F\u0192\uA77C' },
      {
          base: 'g',
          letters: '\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F',
      },
      {
          base: 'h',
          letters: '\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265',
      },
      { base: 'hv', letters: '\u0195' },
      {
          base: 'i',
          letters: '\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131',
      },
      { base: 'j', letters: '\u006A\u24D9\uFF4A\u0135\u01F0\u0249' },
      {
          base: 'k',
          letters: '\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3',
      },
      {
          base: 'l',
          letters: '\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747',
      },
      { base: 'lj', letters: '\u01C9' },
      { base: 'm', letters: '\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F' },
      {
          base: 'n',
          letters: '\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5',
      },
      { base: 'nj', letters: '\u01CC' },
      {
          base: 'o',
          letters: '\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275',
      },
      { base: 'oi', letters: '\u01A3' },
      { base: 'ou', letters: '\u0223' },
      { base: 'oo', letters: '\uA74F' },
      {
          base: 'p',
          letters: '\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755',
      },
      { base: 'q', letters: '\u0071\u24E0\uFF51\u024B\uA757\uA759' },
      {
          base: 'r',
          letters: '\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783',
      },
      {
          base: 's',
          letters: '\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B',
      },
      {
          base: 't',
          letters: '\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787',
      },
      { base: 'tz', letters: '\uA729' },
      {
          base: 'u',
          letters: '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289',
      },
      { base: 'v', letters: '\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C' },
      { base: 'vy', letters: '\uA761' },
      {
          base: 'w',
          letters: '\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73',
      },
      { base: 'x', letters: '\u0078\u24E7\uFF58\u1E8B\u1E8D' },
      {
          base: 'y',
          letters: '\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF',
      },
      {
          base: 'z',
          letters: '\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763',
      },
  ];
  /**
   * Map of letters from diacritic variant to diacritless variant
   * Contains lowercase and uppercase separatelly
   *
   * > "á" => "a"
   * > "ě" => "e"
   * > "Ă" => "A"
   * > ...
   *
   * @public exported from `@promptbook/utils`
   */
  var DIACRITIC_VARIANTS_LETTERS = {};
  // tslint:disable-next-line: prefer-for-of
  for (var i = 0; i < defaultDiacriticsRemovalMap.length; i++) {
      var letters = defaultDiacriticsRemovalMap[i].letters;
      // tslint:disable-next-line: prefer-for-of
      for (var j = 0; j < letters.length; j++) {
          DIACRITIC_VARIANTS_LETTERS[letters[j]] = defaultDiacriticsRemovalMap[i].base;
      }
  }
  // <- TODO: [🍓] Put to maker function to save execution time if not needed
  /*
    @see https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
     Licensed under the Apache License, Version 2.0 (the "License");
     you may not use this file except in compliance with the License.
     You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

     Unless required by applicable law or agreed to in writing, software
     distributed under the License is distributed on an "AS IS" BASIS,
     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     See the License for the specific language governing permissions and
     limitations under the License.
  */

  /**
   * @@@
   *
   * @param input @@@
   * @returns @@@
   * @public exported from `@promptbook/utils`
   */
  function removeDiacritics(input) {
      /*eslint no-control-regex: "off"*/
      return input.replace(/[^\u0000-\u007E]/g, function (a) {
          return DIACRITIC_VARIANTS_LETTERS[a] || a;
      });
  }
  /**
   * TODO: [Ж] Variant for cyrillic (and in general non-latin) letters
   */

  /**
   * Counts number of words in the text
   *
   * @public exported from `@promptbook/utils`
   */
  function countWords(text) {
      text = text.replace(/[\p{Extended_Pictographic}]/gu, 'a');
      text = removeDiacritics(text);
      return text.split(/[^a-zа-я0-9]+/i).filter(function (word) { return word.length > 0; }).length;
  }

  /**
   * Index of all counter functions
   *
   * @public exported from `@promptbook/utils`
   */
  var CountUtils = {
      CHARACTERS: countCharacters,
      WORDS: countWords,
      SENTENCES: countSentences,
      PARAGRAPHS: countParagraphs,
      LINES: countLines,
      PAGES: countPages,
  };
  /**
   * TODO: [🧠][🤠] This should be probbably as part of `TextFormatDefinition`
   * Note: [💞] Ignore a discrepancy between file name and entity name
   */

  /**
   * Function checkExpectations will check if the expectations on given value are met
   *
   * Note: There are two simmilar functions:
   * - `checkExpectations` which throws an error if the expectations are not met
   * - `isPassingExpectations` which returns a boolean
   *
   * @throws {ExpectError} if the expectations are not met
   * @returns {void} Nothing
   * @private internal function of `createPipelineExecutor`
   */
  function checkExpectations(expectations, value) {
      var e_1, _a;
      try {
          for (var _b = __values(Object.entries(expectations)), _c = _b.next(); !_c.done; _c = _b.next()) {
              var _d = __read(_c.value, 2), unit = _d[0], _e = _d[1], max = _e.max, min = _e.min;
              var amount = CountUtils[unit.toUpperCase()](value);
              if (min && amount < min) {
                  throw new ExpectError("Expected at least ".concat(min, " ").concat(unit, " but got ").concat(amount));
              } /* not else */
              if (max && amount > max) {
                  throw new ExpectError("Expected at most ".concat(max, " ").concat(unit, " but got ").concat(amount));
              }
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          }
          finally { if (e_1) throw e_1.error; }
      }
  }
  /**
   * TODO: [💝] Unite object for expecting amount and format
   * TODO: [🧠][🤠] This should be part of `TextFormatDefinition`
   * Note: [💝] and [🤠] are interconnected together
   */

  /**
   * @@@
   *
   * @private internal utility of `createPipelineExecutor`
   */
  function executeAttempts(options) {
      return __awaiter(this, void 0, void 0, function () {
          var jokerParameterNames, priority, maxAttempts, preparedContent, parameters, task, preparedPipeline, tools, $executionReport, pipelineIdentification, maxExecutionAttempts, $ongoingTaskResult, _llms, llmTools, _loop_1, attempt, state_1;
          return __generator(this, function (_a) {
              switch (_a.label) {
                  case 0:
                      jokerParameterNames = options.jokerParameterNames, priority = options.priority, maxAttempts = options.maxAttempts, preparedContent = options.preparedContent, parameters = options.parameters, task = options.task, preparedPipeline = options.preparedPipeline, tools = options.tools, $executionReport = options.$executionReport, pipelineIdentification = options.pipelineIdentification, maxExecutionAttempts = options.maxExecutionAttempts;
                      $ongoingTaskResult = {
                          $result: null,
                          $resultString: null,
                          $expectError: null,
                          $scriptPipelineExecutionErrors: [],
                      };
                      _llms = arrayableToArray(tools.llm);
                      llmTools = _llms.length === 1 ? _llms[0] : joinLlmExecutionTools.apply(void 0, __spreadArray([], __read(_llms), false));
                      _loop_1 = function (attempt) {
                          var isJokerAttempt, jokerParameterName, _b, modelRequirements, _c, _d, _e, _f, _g, scriptTools, _h, error_1, e_1_1, _j, _k, _l, functionName, postprocessingError, _m, _o, scriptTools, _p, error_2, e_2_1, e_3_1, error_3;
                          var e_1, _q, e_3, _r, e_2, _s;
                          return __generator(this, function (_t) {
                              switch (_t.label) {
                                  case 0:
                                      isJokerAttempt = attempt < 0;
                                      jokerParameterName = jokerParameterNames[jokerParameterNames.length + attempt];
                                      // TODO: [🧠][🍭] JOKERS, EXPECTATIONS, POSTPROCESSING and FOREACH
                                      if (isJokerAttempt && !jokerParameterName) {
                                          throw new UnexpectedError(spaceTrim.spaceTrim(function (block) { return "\n                        Joker not found in attempt ".concat(attempt, "\n\n                        ").concat(block(pipelineIdentification), "\n                    "); }));
                                      }
                                      $ongoingTaskResult.$result = null;
                                      $ongoingTaskResult.$resultString = null;
                                      $ongoingTaskResult.$expectError = null;
                                      if (isJokerAttempt) {
                                          if (parameters[jokerParameterName] === undefined) {
                                              throw new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                            Joker parameter {".concat(jokerParameterName, "} not defined\n\n                            ").concat(block(pipelineIdentification), "\n                        "); }));
                                              // <- TODO: This is maybe `PipelineLogicError` which should be detected in `validatePipeline` and here just thrown as `UnexpectedError`
                                          }
                                          else {
                                              $ongoingTaskResult.$resultString = parameters[jokerParameterName];
                                          }
                                      }
                                      _t.label = 1;
                                  case 1:
                                      _t.trys.push([1, 43, 44, 45]);
                                      if (!!isJokerAttempt) return [3 /*break*/, 25];
                                      _b = task.taskType;
                                      switch (_b) {
                                          case 'SIMPLE_TASK': return [3 /*break*/, 2];
                                          case 'PROMPT_TASK': return [3 /*break*/, 3];
                                          case 'SCRIPT_TASK': return [3 /*break*/, 11];
                                          case 'DIALOG_TASK': return [3 /*break*/, 22];
                                      }
                                      return [3 /*break*/, 24];
                                  case 2:
                                      $ongoingTaskResult.$resultString = templateParameters(preparedContent, parameters);
                                      return [3 /*break*/, 25];
                                  case 3:
                                      modelRequirements = __assign(__assign({ modelVariant: 'CHAT' }, (preparedPipeline.defaultModelRequirements || {})), (task.modelRequirements || {}));
                                      $ongoingTaskResult.$prompt = {
                                          title: task.title,
                                          pipelineUrl: "".concat(preparedPipeline.pipelineUrl
                                              ? preparedPipeline.pipelineUrl
                                              : 'anonymous' /* <- TODO: [🧠] How to deal with anonymous pipelines, do here some auto-url like SHA-256 based ad-hoc identifier? */, "#").concat(task.name
                                          // <- TODO: Here should be maybe also subformat index to distinguish between same task with different subformat values
                                          ),
                                          parameters: parameters,
                                          content: preparedContent,
                                          modelRequirements: modelRequirements,
                                          expectations: __assign(__assign({}, (preparedPipeline.personas.find(function (_a) {
                                              var name = _a.name;
                                              return name === task.personaName;
                                          }) || {})), task.expectations),
                                          format: task.format,
                                          postprocessingFunctionNames: task.postprocessingFunctionNames,
                                      }; // <- TODO: Not very good type guard
                                      _c = modelRequirements.modelVariant;
                                      switch (_c) {
                                          case 'CHAT': return [3 /*break*/, 4];
                                          case 'COMPLETION': return [3 /*break*/, 6];
                                          case 'EMBEDDING': return [3 /*break*/, 8];
                                      }
                                      return [3 /*break*/, 9];
                                  case 4:
                                      _d = $ongoingTaskResult;
                                      return [4 /*yield*/, llmTools.callChatModel(
                                          // <- TODO: [🧁] Check that `callChatModel` is defined
                                          $deepFreeze($ongoingTaskResult.$prompt))];
                                  case 5:
                                      _d.$chatResult = _t.sent();
                                      // TODO: [🍬] Destroy chatThread
                                      $ongoingTaskResult.$result = $ongoingTaskResult.$chatResult;
                                      $ongoingTaskResult.$resultString = $ongoingTaskResult.$chatResult.content;
                                      return [3 /*break*/, 10];
                                  case 6:
                                      _e = $ongoingTaskResult;
                                      return [4 /*yield*/, llmTools.callCompletionModel(
                                          // <- TODO: [🧁] Check that `callCompletionModel` is defined
                                          $deepFreeze($ongoingTaskResult.$prompt))];
                                  case 7:
                                      _e.$completionResult = _t.sent();
                                      $ongoingTaskResult.$result = $ongoingTaskResult.$completionResult;
                                      $ongoingTaskResult.$resultString = $ongoingTaskResult.$completionResult.content;
                                      return [3 /*break*/, 10];
                                  case 8: throw new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                                                Embedding model can not be used in pipeline\n\n                                                This should be catched during parsing\n\n                                                ".concat(block(pipelineIdentification), "\n\n                                            "); }));
                                  case 9: throw new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                                                Unknown model variant \"".concat(task.modelRequirements.modelVariant, "\"\n\n                                                ").concat(block(pipelineIdentification), "\n\n                                            "); }));
                                  case 10: return [3 /*break*/, 25];
                                  case 11:
                                      if (arrayableToArray(tools.script).length === 0) {
                                          throw new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                                        No script execution tools are available\n\n                                        ".concat(block(pipelineIdentification), "\n                                    "); }));
                                      }
                                      if (!task.contentLanguage) {
                                          throw new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                                        Script language is not defined for SCRIPT TASK \"".concat(task.name, "\"\n\n                                        ").concat(block(pipelineIdentification), "\n                                    "); }));
                                      }
                                      _t.label = 12;
                                  case 12:
                                      _t.trys.push([12, 19, 20, 21]);
                                      _f = (e_1 = void 0, __values(arrayableToArray(tools.script))), _g = _f.next();
                                      _t.label = 13;
                                  case 13:
                                      if (!!_g.done) return [3 /*break*/, 18];
                                      scriptTools = _g.value;
                                      _t.label = 14;
                                  case 14:
                                      _t.trys.push([14, 16, , 17]);
                                      _h = $ongoingTaskResult;
                                      return [4 /*yield*/, scriptTools.execute($deepFreeze({
                                              scriptLanguage: task.contentLanguage,
                                              script: preparedContent,
                                              parameters: parameters,
                                          }))];
                                  case 15:
                                      _h.$resultString = _t.sent();
                                      return [3 /*break*/, 18];
                                  case 16:
                                      error_1 = _t.sent();
                                      if (!(error_1 instanceof Error)) {console.log('!(error instanceof Error)')
                                          throw error_1;
                                      }
                                      if (error_1 instanceof UnexpectedError) {
                                          throw error_1;
                                      }
                                      $ongoingTaskResult.$scriptPipelineExecutionErrors.push(error_1);
                                      return [3 /*break*/, 17];
                                  case 17:
                                      _g = _f.next();
                                      return [3 /*break*/, 13];
                                  case 18: return [3 /*break*/, 21];
                                  case 19:
                                      e_1_1 = _t.sent();
                                      e_1 = { error: e_1_1 };
                                      return [3 /*break*/, 21];
                                  case 20:
                                      try {
                                          if (_g && !_g.done && (_q = _f.return)) _q.call(_f);
                                      }
                                      finally { if (e_1) throw e_1.error; }
                                      return [7 /*endfinally*/];
                                  case 21:
                                      if ($ongoingTaskResult.$resultString !== null) {
                                          return [3 /*break*/, 25];
                                      }
                                      if ($ongoingTaskResult.$scriptPipelineExecutionErrors.length === 1) {
                                          throw $ongoingTaskResult.$scriptPipelineExecutionErrors[0];
                                      }
                                      else {
                                          throw new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                                        Script execution failed ".concat($ongoingTaskResult.$scriptPipelineExecutionErrors.length, "x\n\n                                        ").concat(block(pipelineIdentification), "\n\n                                        ").concat(block($ongoingTaskResult.$scriptPipelineExecutionErrors
                                              .map(function (error) { return '- ' + error.message; })
                                              .join('\n\n')), "\n                                    "); }));
                                      }
                                  case 22:
                                      if (tools.userInterface === undefined) {
                                          throw new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                                        User interface tools are not available\n\n                                        ".concat(block(pipelineIdentification), "\n                                    "); }));
                                      }
                                      // TODO: [🌹] When making next attempt for `DIALOG TASK`, preserve the previous user input
                                      _j = $ongoingTaskResult;
                                      return [4 /*yield*/, tools.userInterface.promptDialog($deepFreeze({
                                              promptTitle: task.title,
                                              promptMessage: templateParameters(task.description || '', parameters),
                                              defaultValue: templateParameters(preparedContent, parameters),
                                              // TODO: [🧠] Figure out how to define placeholder in .book.md file
                                              placeholder: undefined,
                                              priority: priority,
                                          }))];
                                  case 23:
                                      // TODO: [🌹] When making next attempt for `DIALOG TASK`, preserve the previous user input
                                      _j.$resultString = _t.sent();
                                      return [3 /*break*/, 25];
                                  case 24: throw new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                                    Unknown execution type \"".concat(task.taskType, "\"\n\n                                    ").concat(block(pipelineIdentification), "\n                                "); }));
                                  case 25:
                                      if (!(!isJokerAttempt && task.postprocessingFunctionNames)) return [3 /*break*/, 42];
                                      _t.label = 26;
                                  case 26:
                                      _t.trys.push([26, 40, 41, 42]);
                                      _k = (e_3 = void 0, __values(task.postprocessingFunctionNames)), _l = _k.next();
                                      _t.label = 27;
                                  case 27:
                                      if (!!_l.done) return [3 /*break*/, 39];
                                      functionName = _l.value;
                                      postprocessingError = null;
                                      _t.label = 28;
                                  case 28:
                                      _t.trys.push([28, 35, 36, 37]);
                                      _m = (e_2 = void 0, __values(arrayableToArray(tools.script))), _o = _m.next();
                                      _t.label = 29;
                                  case 29:
                                      if (!!_o.done) return [3 /*break*/, 34];
                                      scriptTools = _o.value;
                                      _t.label = 30;
                                  case 30:
                                      _t.trys.push([30, 32, , 33]);
                                      _p = $ongoingTaskResult;
                                      return [4 /*yield*/, scriptTools.execute({
                                              scriptLanguage: "javascript" /* <- TODO: Try it in each languages; In future allow postprocessing with arbitrary combination of languages to combine */,
                                              script: "".concat(functionName, "(resultString)"),
                                              parameters: {
                                                  resultString: $ongoingTaskResult.$resultString || '',
                                                  // Note: No ...parametersForTask, because working with result only
                                              },
                                          })];
                                  case 31:
                                      _p.$resultString = _t.sent();
                                      postprocessingError = null;
                                      return [3 /*break*/, 34];
                                  case 32:
                                      error_2 = _t.sent();
                                      if (!(error_2 instanceof Error)) {console.log('!(error instanceof Error)')
                                          throw error_2;
                                      }
                                      if (error_2 instanceof UnexpectedError) {
                                          throw error_2;
                                      }
                                      postprocessingError = error_2;
                                      $ongoingTaskResult.$scriptPipelineExecutionErrors.push(error_2);
                                      return [3 /*break*/, 33];
                                  case 33:
                                      _o = _m.next();
                                      return [3 /*break*/, 29];
                                  case 34: return [3 /*break*/, 37];
                                  case 35:
                                      e_2_1 = _t.sent();
                                      e_2 = { error: e_2_1 };
                                      return [3 /*break*/, 37];
                                  case 36:
                                      try {
                                          if (_o && !_o.done && (_s = _m.return)) _s.call(_m);
                                      }
                                      finally { if (e_2) throw e_2.error; }
                                      return [7 /*endfinally*/];
                                  case 37:
                                      if (postprocessingError) {
                                          throw postprocessingError;
                                      }
                                      _t.label = 38;
                                  case 38:
                                      _l = _k.next();
                                      return [3 /*break*/, 27];
                                  case 39: return [3 /*break*/, 42];
                                  case 40:
                                      e_3_1 = _t.sent();
                                      e_3 = { error: e_3_1 };
                                      return [3 /*break*/, 42];
                                  case 41:
                                      try {
                                          if (_l && !_l.done && (_r = _k.return)) _r.call(_k);
                                      }
                                      finally { if (e_3) throw e_3.error; }
                                      return [7 /*endfinally*/];
                                  case 42:
                                      // TODO: [💝] Unite object for expecting amount and format
                                      if (task.format) {
                                          if (task.format === 'JSON') {
                                              if (!isValidJsonString($ongoingTaskResult.$resultString || '')) {
                                                  // TODO: [🏢] Do more universally via `FormatDefinition`
                                                  try {
                                                      $ongoingTaskResult.$resultString = extractJsonBlock($ongoingTaskResult.$resultString || '');
                                                  }
                                                  catch (error) {
                                                      throw new ExpectError(spaceTrim.spaceTrim(function (block) { return "\n                                        Expected valid JSON string\n\n                                        ".concat(block(
                                                      /*<- Note: No need for `pipelineIdentification`, it will be catched and added later */ ''), "\n                                    "); }));
                                                  }
                                              }
                                          }
                                          else {
                                              throw new UnexpectedError(spaceTrim.spaceTrim(function (block) { return "\n                                Unknown format \"".concat(task.format, "\"\n\n                                ").concat(block(pipelineIdentification), "\n                            "); }));
                                          }
                                      }
                                      // TODO: [💝] Unite object for expecting amount and format
                                      if (task.expectations) {
                                          checkExpectations(task.expectations, $ongoingTaskResult.$resultString || '');
                                      }
                                      return [2 /*return*/, "break-attempts"];
                                  case 43:
                                      error_3 = _t.sent();
                                      if (!(error_3 instanceof ExpectError)) {
                                          throw error_3;
                                      }
                                      $ongoingTaskResult.$expectError = error_3;
                                      return [3 /*break*/, 45];
                                  case 44:
                                      if (!isJokerAttempt &&
                                          task.taskType === 'PROMPT_TASK' &&
                                          $ongoingTaskResult.$prompt
                                      //    <- Note:  [2] When some expected parameter is not defined, error will occur in templateParameters
                                      //              In that case we don’t want to make a report about it because it’s not a llm execution error
                                      ) {
                                          // TODO: [🧠] Maybe put other taskTypes into report
                                          $executionReport.promptExecutions.push({
                                              prompt: __assign({}, $ongoingTaskResult.$prompt),
                                              result: $ongoingTaskResult.$result || undefined,
                                              error: $ongoingTaskResult.$expectError === null
                                                  ? undefined
                                                  : serializeError($ongoingTaskResult.$expectError),
                                          });
                                      }
                                      return [7 /*endfinally*/];
                                  case 45:
                                      if ($ongoingTaskResult.$expectError !== null && attempt === maxAttempts - 1) {
                                          throw new PipelineExecutionError(spaceTrim.spaceTrim(function (block) {
                                              var _a, _b, _c;
                                              return "\n                        LLM execution failed ".concat(maxExecutionAttempts, "x\n\n                        ").concat(block(pipelineIdentification), "\n\n                        ---\n                        The Prompt:\n                        ").concat(block((((_a = $ongoingTaskResult.$prompt) === null || _a === void 0 ? void 0 : _a.content) || '')
                                                  .split('\n')
                                                  .map(function (line) { return "> ".concat(line); })
                                                  .join('\n')), "\n\n                        Last error ").concat(((_b = $ongoingTaskResult.$expectError) === null || _b === void 0 ? void 0 : _b.name) || '', ":\n                        ").concat(block((((_c = $ongoingTaskResult.$expectError) === null || _c === void 0 ? void 0 : _c.message) || '')
                                                  .split('\n')
                                                  .map(function (line) { return "> ".concat(line); })
                                                  .join('\n')), "\n\n                        Last result:\n                        ").concat(block($ongoingTaskResult.$resultString === null
                                                  ? 'null'
                                                  : $ongoingTaskResult.$resultString
                                                      .split('\n')
                                                      .map(function (line) { return "> ".concat(line); })
                                                      .join('\n')), "\n                        ---\n                    ");
                                          }));
                                      }
                                      return [2 /*return*/];
                              }
                          });
                      };
                      attempt = -jokerParameterNames.length;
                      _a.label = 1;
                  case 1:
                      if (!(attempt < maxAttempts)) return [3 /*break*/, 4];
                      return [5 /*yield**/, _loop_1(attempt)];
                  case 2:
                      state_1 = _a.sent();
                      switch (state_1) {
                          case "break-attempts": return [3 /*break*/, 4];
                      }
                      _a.label = 3;
                  case 3:
                      attempt++;
                      return [3 /*break*/, 1];
                  case 4:
                      if ($ongoingTaskResult.$resultString === null) {
                          throw new UnexpectedError(spaceTrim.spaceTrim(function (block) { return "\n                    Something went wrong and prompt result is null\n\n                    ".concat(block(pipelineIdentification), "\n                "); }));
                      }
                      return [2 /*return*/, $ongoingTaskResult.$resultString];
              }
          });
      });
  }
  /**
   * TODO: Break into smaller functions
   */

  /**
   * @@@
   *
   * @private internal utility of `createPipelineExecutor`
   */
  function executeFormatSubvalues(options) {
      return __awaiter(this, void 0, void 0, function () {
          var task, jokerParameterNames, parameters, priority, csvSettings, pipelineIdentification, parameterValue, formatDefinition, subvalueDefinition, formatSettings, resultString;
          var _this = this;
          return __generator(this, function (_a) {
              switch (_a.label) {
                  case 0:
                      task = options.task, jokerParameterNames = options.jokerParameterNames, parameters = options.parameters, priority = options.priority, csvSettings = options.csvSettings, pipelineIdentification = options.pipelineIdentification;
                      if (task.foreach === undefined) {
                          return [2 /*return*/, /* not await */ executeAttempts(options)];
                      }
                      if (jokerParameterNames.length !== 0) {
                          throw new UnexpectedError(spaceTrim__default["default"](function (block) { return "\n                    JOKER parameters are not supported together with FOREACH command\n\n                    [\uD83E\uDDDE\u200D\u2640\uFE0F] This should be prevented in `validatePipeline`\n\n                    ".concat(block(pipelineIdentification), "\n                "); }));
                      }
                      parameterValue = parameters[task.foreach.parameterName] || '';
                      formatDefinition = FORMAT_DEFINITIONS.find(function (formatDefinition) {
                          return __spreadArray([formatDefinition.formatName], __read((formatDefinition.aliases || [])), false).includes(task.foreach.formatName);
                      });
                      if (formatDefinition === undefined) {
                          throw new UnexpectedError(
                          // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as plugins (=> change UnexpectedError)
                          spaceTrim__default["default"](function (block) { return "\n                    Unsupported format \"".concat(task.foreach.formatName, "\"\n\n                    Available formats:\n                    ").concat(block(FORMAT_DEFINITIONS.map(function (formatDefinition) { return formatDefinition.formatName; })
                              .map(function (formatName) { return "- ".concat(formatName); })
                              .join('\n')), "\n\n                    [\u26F7] This should never happen because format name should be validated during parsing\n\n                    ").concat(block(pipelineIdentification), "\n                "); }));
                      }
                      subvalueDefinition = formatDefinition.subvalueDefinitions.find(function (subvalueDefinition) {
                          return __spreadArray([subvalueDefinition.subvalueName], __read((subvalueDefinition.aliases || [])), false).includes(task.foreach.subformatName);
                      });
                      if (subvalueDefinition === undefined) {
                          throw new UnexpectedError(
                          // <- TODO: [🧠][🧐] Should be formats fixed per promptbook version or behave as plugins (=> change UnexpectedError)
                          spaceTrim__default["default"](function (block) { return "\n                    Unsupported subformat name \"".concat(task.foreach.subformatName, "\" for format \"").concat(task.foreach.formatName, "\"\n\n                    Available subformat names for format \"").concat(formatDefinition.formatName, "\":\n                    ").concat(block(formatDefinition.subvalueDefinitions
                              .map(function (subvalueDefinition) { return subvalueDefinition.subvalueName; })
                              .map(function (subvalueName) { return "- ".concat(subvalueName); })
                              .join('\n')), "\n\n                    [\u26F7] This should never happen because subformat name should be validated during parsing\n\n                    ").concat(block(pipelineIdentification), "\n                "); }));
                      }
                      if (formatDefinition.formatName === 'CSV') {
                          formatSettings = csvSettings;
                          // <- TODO: [🤹‍♂️] More universal, make simmilar pattern for other formats for example \n vs \r\n in text
                      }
                      return [4 /*yield*/, subvalueDefinition.mapValues(parameterValue, task.foreach.outputSubparameterName, formatSettings, function (subparameters, index) { return __awaiter(_this, void 0, void 0, function () {
                              var mappedParameters, allSubparameters, subresultString;
                              return __generator(this, function (_a) {
                                  switch (_a.label) {
                                      case 0:
                                          // TODO: [🤹‍♂️][🪂] Limit to N concurrent executions
                                          // TODO: When done [🐚] Report progress also for each subvalue here
                                          try {
                                              mappedParameters = mapAvailableToExpectedParameters({
                                                  expectedParameters: Object.fromEntries(task.foreach.inputSubparameterNames.map(function (subparameterName) { return [subparameterName, null]; })),
                                                  availableParameters: subparameters,
                                              });
                                          }
                                          catch (error) {
                                              if (!(error instanceof PipelineExecutionError)) {
                                                  throw error;
                                              }
                                              throw new PipelineExecutionError(spaceTrim__default["default"](function (block) { return "\n                        ".concat(error.message, "\n\n                        This is error in FOREACH command\n                        You have probbably passed wrong data to pipeline or wrong data was generated which are processed by FOREACH command\n\n                        ").concat(block(pipelineIdentification), "\n                        Subparameter index: ").concat(index, "\n                    "); }));
                                          }
                                          allSubparameters = __assign(__assign({}, parameters), mappedParameters);
                                          // Note: [👨‍👨‍👧] Now we can freeze `subparameters` because we are sure that all and only used parameters are defined and are not going to be changed
                                          Object.freeze(allSubparameters);
                                          return [4 /*yield*/, executeAttempts(__assign(__assign({}, options), { priority: priority + index, parameters: allSubparameters, pipelineIdentification: spaceTrim__default["default"](function (block) { return "\n                        ".concat(block(pipelineIdentification), "\n                        Subparameter index: ").concat(index, "\n                    "); }) }))];
                                      case 1:
                                          subresultString = _a.sent();
                                          return [2 /*return*/, subresultString];
                                  }
                              });
                          }); })];
                  case 1:
                      resultString = _a.sent();
                      return [2 /*return*/, resultString];
              }
          });
      });
  }

  /**
   * @@@
   *
   * @private internal utility of `createPipelineExecutor`
   */
  function getContextForTask(task) {
      return __awaiter(this, void 0, void 0, function () {
          return __generator(this, function (_a) {
              return [2 /*return*/, RESERVED_PARAMETER_MISSING_VALUE /* <- TODO: [🏍] Implement */];
          });
      });
  }

  /**
   * @@@
   *
   * @private internal utility of `createPipelineExecutor`
   */
  function getExamplesForTask(task) {
      return __awaiter(this, void 0, void 0, function () {
          return __generator(this, function (_a) {
              return [2 /*return*/, RESERVED_PARAMETER_MISSING_VALUE /* <- TODO: [♨] Implement */];
          });
      });
  }

  /**
   * @@@
   *
   * @private internal utility of `createPipelineExecutor`
   */
  function getKnowledgeForTask(options) {
      return __awaiter(this, void 0, void 0, function () {
          var preparedPipeline;
          return __generator(this, function (_a) {
              preparedPipeline = options.preparedPipeline, options.task;
              return [2 /*return*/, preparedPipeline.knowledgePieces.map(function (_a) {
                      var content = _a.content;
                      return "- ".concat(content);
                  }).join('\n')];
          });
      });
  }

  /**
   * @@@
   *
   * @private internal utility of `createPipelineExecutor`
   */
  function getReservedParametersForTask(options) {
      return __awaiter(this, void 0, void 0, function () {
          var preparedPipeline, task, pipelineIdentification, context, knowledge, examples, currentDate, modelName, reservedParameters, _loop_1, RESERVED_PARAMETER_NAMES_1, RESERVED_PARAMETER_NAMES_1_1, parameterName;
          var e_1, _a;
          return __generator(this, function (_b) {
              switch (_b.label) {
                  case 0:
                      preparedPipeline = options.preparedPipeline, task = options.task, pipelineIdentification = options.pipelineIdentification;
                      return [4 /*yield*/, getContextForTask()];
                  case 1:
                      context = _b.sent();
                      return [4 /*yield*/, getKnowledgeForTask({ preparedPipeline: preparedPipeline, task: task })];
                  case 2:
                      knowledge = _b.sent();
                      return [4 /*yield*/, getExamplesForTask()];
                  case 3:
                      examples = _b.sent();
                      currentDate = new Date().toISOString();
                      modelName = RESERVED_PARAMETER_MISSING_VALUE;
                      reservedParameters = {
                          content: RESERVED_PARAMETER_RESTRICTED,
                          context: context,
                          knowledge: knowledge,
                          examples: examples,
                          currentDate: currentDate,
                          modelName: modelName,
                      };
                      _loop_1 = function (parameterName) {
                          if (reservedParameters[parameterName] === undefined) {
                              throw new UnexpectedError(spaceTrim.spaceTrim(function (block) { return "\n                        Reserved parameter {".concat(parameterName, "} is not defined\n\n                        ").concat(block(pipelineIdentification), "\n                    "); }));
                          }
                      };
                      try {
                          // Note: Doublecheck that ALL reserved parameters are defined:
                          for (RESERVED_PARAMETER_NAMES_1 = __values(RESERVED_PARAMETER_NAMES), RESERVED_PARAMETER_NAMES_1_1 = RESERVED_PARAMETER_NAMES_1.next(); !RESERVED_PARAMETER_NAMES_1_1.done; RESERVED_PARAMETER_NAMES_1_1 = RESERVED_PARAMETER_NAMES_1.next()) {
                              parameterName = RESERVED_PARAMETER_NAMES_1_1.value;
                              _loop_1(parameterName);
                          }
                      }
                      catch (e_1_1) { e_1 = { error: e_1_1 }; }
                      finally {
                          try {
                              if (RESERVED_PARAMETER_NAMES_1_1 && !RESERVED_PARAMETER_NAMES_1_1.done && (_a = RESERVED_PARAMETER_NAMES_1.return)) _a.call(RESERVED_PARAMETER_NAMES_1);
                          }
                          finally { if (e_1) throw e_1.error; }
                      }
                      return [2 /*return*/, reservedParameters];
              }
          });
      });
  }

  /**
   * @@@
   *
   * @private internal utility of `createPipelineExecutor`
   */
  function executeTask(options) {
      return __awaiter(this, void 0, void 0, function () {
          var currentTask, preparedPipeline, parametersToPass, tools, onProgress, $executionReport, pipelineIdentification, maxExecutionAttempts, maxParallelCount, csvSettings, isVerbose, rootDirname, cacheDirname, intermediateFilesStrategy, isAutoInstalled, isNotPreparedWarningSupressed, name, title, priority, usedParameterNames, dependentParameterNames, definedParameters, _a, _b, _c, definedParameterNames, parameters, _loop_1, _d, _e, parameterName, maxAttempts, jokerParameterNames, preparedContent, resultString;
          var e_1, _f, _g;
          return __generator(this, function (_h) {
              switch (_h.label) {
                  case 0:
                      currentTask = options.currentTask, preparedPipeline = options.preparedPipeline, parametersToPass = options.parametersToPass, tools = options.tools, onProgress = options.onProgress, $executionReport = options.$executionReport, pipelineIdentification = options.pipelineIdentification, maxExecutionAttempts = options.maxExecutionAttempts, maxParallelCount = options.maxParallelCount, csvSettings = options.csvSettings, isVerbose = options.isVerbose, rootDirname = options.rootDirname, cacheDirname = options.cacheDirname, intermediateFilesStrategy = options.intermediateFilesStrategy, isAutoInstalled = options.isAutoInstalled, isNotPreparedWarningSupressed = options.isNotPreparedWarningSupressed;
                      name = "pipeline-executor-frame-".concat(currentTask.name);
                      title = currentTask.title;
                      priority = preparedPipeline.tasks.length - preparedPipeline.tasks.indexOf(currentTask);
                      return [4 /*yield*/, onProgress({
                              name: name,
                              title: title,
                              isStarted: false,
                              isDone: false,
                              taskType: currentTask.taskType,
                              parameterName: currentTask.resultingParameterName,
                              parameterValue: null,
                              // <- [🍸]
                          })];
                  case 1:
                      _h.sent();
                      usedParameterNames = extractParameterNamesFromTask(currentTask);
                      dependentParameterNames = new Set(currentTask.dependentParameterNames);
                      // TODO: [👩🏾‍🤝‍👩🏻] Use here `mapAvailableToExpectedParameters`
                      if (union(difference(usedParameterNames, dependentParameterNames), difference(dependentParameterNames, usedParameterNames)).size !== 0) {
                          throw new UnexpectedError(spaceTrim.spaceTrim(function (block) { return "\n                    Dependent parameters are not consistent with used parameters:\n\n                    Dependent parameters:\n                    ".concat(Array.from(dependentParameterNames)
                              .map(function (name) { return "{".concat(name, "}"); })
                              .join(', '), "\n\n                    Used parameters:\n                    ").concat(Array.from(usedParameterNames)
                              .map(function (name) { return "{".concat(name, "}"); })
                              .join(', '), "\n\n                    ").concat(block(pipelineIdentification), "\n\n                "); }));
                      }
                      _b = (_a = Object).freeze;
                      _c = [{}];
                      return [4 /*yield*/, getReservedParametersForTask({
                              preparedPipeline: preparedPipeline,
                              task: currentTask,
                              pipelineIdentification: pipelineIdentification,
                          })];
                  case 2:
                      definedParameters = _b.apply(_a, [__assign.apply(void 0, [__assign.apply(void 0, _c.concat([(_h.sent())])), parametersToPass])]);
                      definedParameterNames = new Set(Object.keys(definedParameters));
                      parameters = {};
                      _loop_1 = function (parameterName) {
                          // Situation: Parameter is defined and used
                          if (definedParameterNames.has(parameterName) && usedParameterNames.has(parameterName)) {
                              parameters[parameterName] = definedParameters[parameterName];
                          }
                          // Situation: Parameter is defined but NOT used
                          else if (definedParameterNames.has(parameterName) && !usedParameterNames.has(parameterName)) ;
                          // Situation: Parameter is NOT defined BUT used
                          else if (!definedParameterNames.has(parameterName) && usedParameterNames.has(parameterName)) {
                              // Houston, we have a problem
                              // Note: Checking part is also done in `validatePipeline`, but it’s good to doublecheck
                              throw new UnexpectedError(spaceTrim.spaceTrim(function (block) { return "\n                        Parameter `{".concat(parameterName, "}` is NOT defined\n                        BUT used in task \"").concat(currentTask.title || currentTask.name, "\"\n\n                        This should be catched in `validatePipeline`\n\n                        ").concat(block(pipelineIdentification), "\n\n                    "); }));
                          }
                      };
                      try {
                          // Note: [2] Check that all used parameters are defined and removing unused parameters for this task
                          // TODO: [👩🏾‍🤝‍👩🏻] Use here `mapAvailableToExpectedParameters`
                          for (_d = __values(Array.from(union(definedParameterNames, usedParameterNames, dependentParameterNames))), _e = _d.next(); !_e.done; _e = _d.next()) {
                              parameterName = _e.value;
                              _loop_1(parameterName);
                          }
                      }
                      catch (e_1_1) { e_1 = { error: e_1_1 }; }
                      finally {
                          try {
                              if (_e && !_e.done && (_f = _d.return)) _f.call(_d);
                          }
                          finally { if (e_1) throw e_1.error; }
                      }
                      // Note: [👨‍👨‍👧] Now we can freeze `parameters` because we are sure that all and only used parameters are defined and are not going to be changed
                      Object.freeze(parameters);
                      maxAttempts = currentTask.taskType === 'DIALOG_TASK' ? Infinity : maxExecutionAttempts;
                      jokerParameterNames = currentTask.jokerParameterNames || [];
                      preparedContent = (currentTask.preparedContent || '{content}').split('{content}').join(currentTask.content);
                      return [4 /*yield*/, executeFormatSubvalues({
                              jokerParameterNames: jokerParameterNames,
                              priority: priority,
                              maxAttempts: maxAttempts,
                              preparedContent: preparedContent,
                              parameters: parameters,
                              task: currentTask,
                              preparedPipeline: preparedPipeline,
                              tools: tools,
                              $executionReport: $executionReport,
                              pipelineIdentification: pipelineIdentification,
                              maxExecutionAttempts: maxExecutionAttempts,
                              maxParallelCount: maxParallelCount,
                              csvSettings: csvSettings,
                              isVerbose: isVerbose,
                              rootDirname: rootDirname,
                              cacheDirname: cacheDirname,
                              intermediateFilesStrategy: intermediateFilesStrategy,
                              isAutoInstalled: isAutoInstalled,
                              isNotPreparedWarningSupressed: isNotPreparedWarningSupressed,
                          })];
                  case 3:
                      resultString = _h.sent();
                      return [4 /*yield*/, onProgress({
                              name: name,
                              title: title,
                              isStarted: true,
                              isDone: true,
                              taskType: currentTask.taskType,
                              parameterName: currentTask.resultingParameterName,
                              parameterValue: resultString,
                              // <- [🍸]
                          })];
                  case 4:
                      _h.sent();
                      return [2 /*return*/, Object.freeze((_g = {},
                              _g[currentTask.resultingParameterName] =
                              // <- Note: [👩‍👩‍👧] No need to detect parameter collision here because pipeline checks logic consistency during construction
                              resultString,
                              _g))];
              }
          });
      });
  }
  /**
   * TODO: [🤹‍♂️]
   */
  /**
   * TODO: [🐚] Change onProgress to object that represents the running execution, can be subscribed via RxJS to and also awaited
   */

  /**
   * @@@
   *
   * @private internal utility of `createPipelineExecutor`
   */
  function filterJustOutputParameters(options) {
      var e_1, _a;
      var preparedPipeline = options.preparedPipeline, parametersToPass = options.parametersToPass, $warnings = options.$warnings, pipelineIdentification = options.pipelineIdentification;
      var outputParameters = {};
      var _loop_1 = function (parameter) {
          if (parametersToPass[parameter.name] === undefined) {
              // [4]
              $warnings.push(new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                            Parameter `{".concat(parameter.name, "}` should be an output parameter, but it was not generated during pipeline execution\n\n                            ").concat(block(pipelineIdentification), "\n                        "); })));
              return "continue";
          }
          outputParameters[parameter.name] = parametersToPass[parameter.name] || '';
      };
      try {
          // Note: Filter ONLY output parameters
          // TODO: [👩🏾‍🤝‍👩🏻] Maybe use here `mapAvailableToExpectedParameters`
          for (var _b = __values(preparedPipeline.parameters.filter(function (_a) {
              var isOutput = _a.isOutput;
              return isOutput;
          })), _c = _b.next(); !_c.done; _c = _b.next()) {
              var parameter = _c.value;
              _loop_1(parameter);
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          }
          finally { if (e_1) throw e_1.error; }
      }
      return outputParameters;
  }

  /**
   * @@@
   *
   * Note: This is not a `PipelineExecutor` (which is binded with one exact pipeline), but a utility function of `createPipelineExecutor` which creates `PipelineExecutor`
   *
   * @private internal utility of `createPipelineExecutor`
   */
  function executePipeline(options) {
      return __awaiter(this, void 0, void 0, function () {
          var inputParameters, tools, onProgress, pipeline, setPreparedPipeline, pipelineIdentification, maxParallelCount, rootDirname, isVerbose, preparedPipeline, errors, warnings, executionReport, isReturned, _a, _b, parameter, e_1_1, _loop_1, _c, _d, parameterName, state_1, e_2_1, parametersToPass, resovedParameterNames_1, unresovedTasks_1, resolving_1, loopLimit, _loop_2, error_1, usage_1, outputParameters_1, usage, outputParameters;
          var e_1, _e, e_2, _f;
          return __generator(this, function (_g) {
              switch (_g.label) {
                  case 0:
                      inputParameters = options.inputParameters, tools = options.tools, onProgress = options.onProgress, pipeline = options.pipeline, setPreparedPipeline = options.setPreparedPipeline, pipelineIdentification = options.pipelineIdentification, maxParallelCount = options.maxParallelCount, rootDirname = options.rootDirname, isVerbose = options.isVerbose;
                      preparedPipeline = options.preparedPipeline;
                      if (!(preparedPipeline === undefined)) return [3 /*break*/, 2];
                      return [4 /*yield*/, preparePipeline(pipeline, tools, {
                              rootDirname: rootDirname,
                              isVerbose: isVerbose,
                              maxParallelCount: maxParallelCount,
                          })];
                  case 1:
                      preparedPipeline = _g.sent();
                      setPreparedPipeline(preparedPipeline);
                      _g.label = 2;
                  case 2:
                      errors = [];
                      warnings = [];
                      executionReport = {
                          pipelineUrl: preparedPipeline.pipelineUrl,
                          title: preparedPipeline.title,
                          promptbookUsedVersion: PROMPTBOOK_ENGINE_VERSION,
                          promptbookRequestedVersion: preparedPipeline.bookVersion,
                          description: preparedPipeline.description,
                          promptExecutions: [],
                      };
                      isReturned = false;
                      _g.label = 3;
                  case 3:
                      _g.trys.push([3, 9, 10, 11]);
                      _a = __values(preparedPipeline.parameters.filter(function (_a) {
                          var isInput = _a.isInput;
                          return isInput;
                      })), _b = _a.next();
                      _g.label = 4;
                  case 4:
                      if (!!_b.done) return [3 /*break*/, 8];
                      parameter = _b.value;
                      if (!(inputParameters[parameter.name] === undefined)) return [3 /*break*/, 7];
                      isReturned = true;
                      if (!(onProgress !== undefined)) return [3 /*break*/, 6];
                      // Note: Wait a short time to prevent race conditions
                      return [4 /*yield*/, waitasecond.forTime(IMMEDIATE_TIME)];
                  case 5:
                      // Note: Wait a short time to prevent race conditions
                      _g.sent();
                      _g.label = 6;
                  case 6: return [2 /*return*/, exportJson({
                          name: "executionReport",
                          message: "Unuccessful PipelineExecutorResult (with missing parameter {".concat(parameter.name, "}) PipelineExecutorResult"),
                          order: [],
                          value: {
                              isSuccessful: false,
                              errors: __spreadArray([
                                  new PipelineExecutionError("Parameter `{".concat(parameter.name, "}` is required as an input parameter"))
                              ], __read(errors), false).map(serializeError),
                              warnings: [],
                              executionReport: executionReport,
                              outputParameters: {},
                              usage: ZERO_USAGE,
                              preparedPipeline: preparedPipeline,
                          },
                      })];
                  case 7:
                      _b = _a.next();
                      return [3 /*break*/, 4];
                  case 8: return [3 /*break*/, 11];
                  case 9:
                      e_1_1 = _g.sent();
                      e_1 = { error: e_1_1 };
                      return [3 /*break*/, 11];
                  case 10:
                      try {
                          if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                      }
                      finally { if (e_1) throw e_1.error; }
                      return [7 /*endfinally*/];
                  case 11:
                      _loop_1 = function (parameterName) {
                          var parameter;
                          return __generator(this, function (_h) {
                              switch (_h.label) {
                                  case 0:
                                      parameter = preparedPipeline.parameters.find(function (_a) {
                                          var name = _a.name;
                                          return name === parameterName;
                                      });
                                      if (!(parameter === undefined)) return [3 /*break*/, 1];
                                      warnings.push(new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                            Extra parameter {".concat(parameterName, "} is being passed which is not part of the pipeline.\n\n                            ").concat(block(pipelineIdentification), "\n                        "); })));
                                      return [3 /*break*/, 4];
                                  case 1:
                                      if (!(parameter.isInput === false)) return [3 /*break*/, 4];
                                      isReturned = true;
                                      if (!(onProgress !== undefined)) return [3 /*break*/, 3];
                                      // Note: Wait a short time to prevent race conditions
                                      return [4 /*yield*/, waitasecond.forTime(IMMEDIATE_TIME)];
                                  case 2:
                                      // Note: Wait a short time to prevent race conditions
                                      _h.sent();
                                      _h.label = 3;
                                  case 3: return [2 /*return*/, { value: exportJson({
                                              name: 'pipelineExecutorResult',
                                              message: spaceTrim.spaceTrim(function (block) { return "\n                        Unuccessful PipelineExecutorResult (with extra parameter {".concat(parameter.name, "}) PipelineExecutorResult\n\n                        ").concat(block(pipelineIdentification), "\n                    "); }),
                                              order: [],
                                              value: {
                                                  isSuccessful: false,
                                                  errors: __spreadArray([
                                                      new PipelineExecutionError(spaceTrim.spaceTrim(function (block) { return "\n                                    Parameter `{".concat(parameter.name, "}` is passed as input parameter but it is not input\n\n                                    ").concat(block(pipelineIdentification), "\n                                "); }))
                                                  ], __read(errors), false).map(serializeError),
                                                  warnings: warnings.map(serializeError),
                                                  executionReport: executionReport,
                                                  outputParameters: {},
                                                  usage: ZERO_USAGE,
                                                  preparedPipeline: preparedPipeline,
                                              },
                                          }) }];
                                  case 4: return [2 /*return*/];
                              }
                          });
                      };
                      _g.label = 12;
                  case 12:
                      _g.trys.push([12, 17, 18, 19]);
                      _c = __values(Object.keys(inputParameters)), _d = _c.next();
                      _g.label = 13;
                  case 13:
                      if (!!_d.done) return [3 /*break*/, 16];
                      parameterName = _d.value;
                      return [5 /*yield**/, _loop_1(parameterName)];
                  case 14:
                      state_1 = _g.sent();
                      if (typeof state_1 === "object")
                          return [2 /*return*/, state_1.value];
                      _g.label = 15;
                  case 15:
                      _d = _c.next();
                      return [3 /*break*/, 13];
                  case 16: return [3 /*break*/, 19];
                  case 17:
                      e_2_1 = _g.sent();
                      e_2 = { error: e_2_1 };
                      return [3 /*break*/, 19];
                  case 18:
                      try {
                          if (_d && !_d.done && (_f = _c.return)) _f.call(_c);
                      }
                      finally { if (e_2) throw e_2.error; }
                      return [7 /*endfinally*/];
                  case 19:
                      parametersToPass = Object.fromEntries(Object.entries(inputParameters).map(function (_a) {
                          var _b = __read(_a, 2), key = _b[0], value = _b[1];
                          return [key, valueToString(value)];
                      }));
                      _g.label = 20;
                  case 20:
                      _g.trys.push([20, 25, , 28]);
                      resovedParameterNames_1 = preparedPipeline.parameters
                          .filter(function (_a) {
                          var isInput = _a.isInput;
                          return isInput;
                      })
                          .map(function (_a) {
                          var name = _a.name;
                          return name;
                      });
                      unresovedTasks_1 = __spreadArray([], __read(preparedPipeline.tasks), false);
                      resolving_1 = [];
                      loopLimit = LOOP_LIMIT;
                      _loop_2 = function () {
                          var currentTask, work_1;
                          return __generator(this, function (_j) {
                              switch (_j.label) {
                                  case 0:
                                      if (loopLimit-- < 0) {
                                          // Note: Really UnexpectedError not LimitReachedError - this should be catched during validatePipeline
                                          throw new UnexpectedError(spaceTrim.spaceTrim(function (block) { return "\n                            Loop limit reached during resolving parameters pipeline execution\n\n                            ".concat(block(pipelineIdentification), "\n                        "); }));
                                      }
                                      currentTask = unresovedTasks_1.find(function (task) {
                                          return task.dependentParameterNames.every(function (name) {
                                              return __spreadArray(__spreadArray([], __read(resovedParameterNames_1), false), __read(RESERVED_PARAMETER_NAMES), false).includes(name);
                                          });
                                      });
                                      if (!(!currentTask && resolving_1.length === 0)) return [3 /*break*/, 1];
                                      throw new UnexpectedError(
                                      // TODO: [🐎] DRY
                                      spaceTrim.spaceTrim(function (block) { return "\n                            Can not resolve some parameters:\n\n                            ".concat(block(pipelineIdentification), "\n\n                            **Can not resolve:**\n                            ").concat(block(unresovedTasks_1
                                          .map(function (_a) {
                                          var resultingParameterName = _a.resultingParameterName, dependentParameterNames = _a.dependentParameterNames;
                                          return "- Parameter `{".concat(resultingParameterName, "}` which depends on ").concat(dependentParameterNames
                                              .map(function (dependentParameterName) { return "`{".concat(dependentParameterName, "}`"); })
                                              .join(' and '));
                                      })
                                          .join('\n')), "\n\n                            **Resolved:**\n                            ").concat(block(resovedParameterNames_1
                                          .filter(function (name) {
                                          return !RESERVED_PARAMETER_NAMES.includes(name);
                                      })
                                          .map(function (name) { return "- Parameter `{".concat(name, "}`"); })
                                          .join('\n')), "\n\n                            **Reserved (which are available):**\n                            ").concat(block(resovedParameterNames_1
                                          .filter(function (name) {
                                          return RESERVED_PARAMETER_NAMES.includes(name);
                                      })
                                          .map(function (name) { return "- Parameter `{".concat(name, "}`"); })
                                          .join('\n')), "\n\n                            *Note: This should be catched in `validatePipeline`*\n                        "); }));
                                  case 1:
                                      if (!!currentTask) return [3 /*break*/, 3];
                                      /* [🤹‍♂️] */ return [4 /*yield*/, Promise.race(resolving_1)];
                                  case 2:
                                      /* [🤹‍♂️] */ _j.sent();
                                      return [3 /*break*/, 4];
                                  case 3:
                                      unresovedTasks_1 = unresovedTasks_1.filter(function (task) { return task !== currentTask; });
                                      work_1 = executeTask(__assign(__assign({}, options), { currentTask: currentTask, preparedPipeline: preparedPipeline, parametersToPass: parametersToPass, tools: tools, onProgress: function (progress) {
                                              if (isReturned) {
                                                  throw new UnexpectedError(spaceTrim.spaceTrim(function (block) { return "\n                                        Can not call `onProgress` after pipeline execution is finished\n\n                                        ".concat(block(pipelineIdentification), "\n\n                                        ").concat(block(JSON.stringify(progress, null, 4)
                                                      .split('\n')
                                                      .map(function (line) { return "> ".concat(line); })
                                                      .join('\n')), "\n                                    "); }));
                                              }
                                              if (onProgress) {
                                                  onProgress(progress);
                                              }
                                          }, $executionReport: executionReport, pipelineIdentification: spaceTrim.spaceTrim(function (block) { return "\n                            ".concat(block(pipelineIdentification), "\n                            Task name: ").concat(currentTask.name, "\n                            Task title: ").concat(currentTask.title, "\n                        "); }) }))
                                          .then(function (newParametersToPass) {
                                          parametersToPass = __assign(__assign({}, newParametersToPass), parametersToPass);
                                          resovedParameterNames_1 = __spreadArray(__spreadArray([], __read(resovedParameterNames_1), false), [currentTask.resultingParameterName], false);
                                      })
                                          .then(function () {
                                          resolving_1 = resolving_1.filter(function (w) { return w !== work_1; });
                                      });
                                      // <- Note: Errors are catched here [3]
                                      //    TODO: BUT if in multiple tasks are errors, only the first one is catched so maybe we should catch errors here and save them to errors array here
                                      resolving_1.push(work_1);
                                      _j.label = 4;
                                  case 4: return [2 /*return*/];
                              }
                          });
                      };
                      _g.label = 21;
                  case 21:
                      if (!(unresovedTasks_1.length > 0)) return [3 /*break*/, 23];
                      return [5 /*yield**/, _loop_2()];
                  case 22:
                      _g.sent();
                      return [3 /*break*/, 21];
                  case 23: return [4 /*yield*/, Promise.all(resolving_1)];
                  case 24:
                      _g.sent();
                      return [3 /*break*/, 28];
                  case 25:
                      error_1 = _g.sent();
                      if (!(error_1 instanceof Error)) {console.log('!(error instanceof Error)')
                          throw error_1;
                      }
                      usage_1 = addUsage.apply(void 0, __spreadArray([], __read(executionReport.promptExecutions.map(function (_a) {
                          var result = _a.result;
                          return (result === null || result === void 0 ? void 0 : result.usage) || ZERO_USAGE;
                      })), false));
                      outputParameters_1 = filterJustOutputParameters({
                          preparedPipeline: preparedPipeline,
                          parametersToPass: parametersToPass,
                          $warnings: warnings,
                          pipelineIdentification: pipelineIdentification,
                      });
                      isReturned = true;
                      if (!(onProgress !== undefined)) return [3 /*break*/, 27];
                      // Note: Wait a short time to prevent race conditions
                      return [4 /*yield*/, waitasecond.forTime(IMMEDIATE_TIME)];
                  case 26:
                      // Note: Wait a short time to prevent race conditions
                      _g.sent();
                      _g.label = 27;
                  case 27: return [2 /*return*/, exportJson({
                          name: 'pipelineExecutorResult',
                          message: "Unuccessful PipelineExecutorResult (with misc errors) PipelineExecutorResult",
                          order: [],
                          value: {
                              isSuccessful: false,
                              errors: __spreadArray([error_1], __read(errors), false).map(serializeError),
                              warnings: warnings.map(serializeError),
                              usage: usage_1,
                              executionReport: executionReport,
                              outputParameters: outputParameters_1,
                              preparedPipeline: preparedPipeline,
                          },
                      })];
                  case 28:
                      usage = addUsage.apply(void 0, __spreadArray([], __read(executionReport.promptExecutions.map(function (_a) {
                          var result = _a.result;
                          return (result === null || result === void 0 ? void 0 : result.usage) || ZERO_USAGE;
                      })), false));
                      outputParameters = filterJustOutputParameters({
                          preparedPipeline: preparedPipeline,
                          parametersToPass: parametersToPass,
                          $warnings: warnings,
                          pipelineIdentification: pipelineIdentification,
                      });
                      isReturned = true;
                      if (!(onProgress !== undefined)) return [3 /*break*/, 30];
                      // Note: Wait a short time to prevent race conditions
                      return [4 /*yield*/, waitasecond.forTime(IMMEDIATE_TIME)];
                  case 29:
                      // Note: Wait a short time to prevent race conditions
                      _g.sent();
                      _g.label = 30;
                  case 30: return [2 /*return*/, exportJson({
                          name: 'pipelineExecutorResult',
                          message: "Successful PipelineExecutorResult",
                          order: [],
                          value: {
                              isSuccessful: true,
                              errors: errors.map(serializeError),
                              warnings: warnings.map(serializeError),
                              usage: usage,
                              executionReport: executionReport,
                              outputParameters: outputParameters,
                              preparedPipeline: preparedPipeline,
                          },
                      })];
              }
          });
      });
  }
  /**
   * TODO: [🐚] Change onProgress to object that represents the running execution, can be subscribed via RxJS to and also awaited
   */

  /**
   * Creates executor function from pipeline and execution tools.
   *
   * @returns The executor function
   * @throws {PipelineLogicError} on logical error in the pipeline
   * @public exported from `@promptbook/core`
   */
  function createPipelineExecutor(options) {
      var _this = this;
      var pipeline = options.pipeline, tools = options.tools, _a = options.maxExecutionAttempts, maxExecutionAttempts = _a === void 0 ? DEFAULT_MAX_EXECUTION_ATTEMPTS : _a, _b = options.maxParallelCount, maxParallelCount = _b === void 0 ? DEFAULT_MAX_PARALLEL_COUNT : _b, _c = options.csvSettings, csvSettings = _c === void 0 ? DEFAULT_CSV_SETTINGS : _c, _d = options.isVerbose, isVerbose = _d === void 0 ? DEFAULT_IS_VERBOSE : _d, _e = options.isNotPreparedWarningSupressed, isNotPreparedWarningSupressed = _e === void 0 ? false : _e, _f = options.cacheDirname, cacheDirname = _f === void 0 ? DEFAULT_SCRAPE_CACHE_DIRNAME : _f, _g = options.intermediateFilesStrategy, intermediateFilesStrategy = _g === void 0 ? DEFAULT_INTERMEDIATE_FILES_STRATEGY : _g, _h = options.isAutoInstalled, isAutoInstalled = _h === void 0 ? DEFAULT_IS_AUTO_INSTALLED : _h, _j = options.rootDirname, rootDirname = _j === void 0 ? null : _j;
      validatePipeline(pipeline);
      var pipelineIdentification = (function () {
          // Note: This is a 😐 implementation of [🚞]
          var _ = [];
          if (pipeline.sourceFile !== undefined) {
              _.push("File: ".concat(pipeline.sourceFile));
          }
          if (pipeline.pipelineUrl !== undefined) {
              _.push("Url: ".concat(pipeline.pipelineUrl));
          }
          return _.join('\n');
      })();
      var preparedPipeline;
      if (isPipelinePrepared(pipeline)) {
          preparedPipeline = pipeline;
      }
      else if (isNotPreparedWarningSupressed !== true) {
          console.warn(spaceTrim.spaceTrim(function (block) { return "\n                    Pipeline is not prepared\n\n                    ".concat(block(pipelineIdentification), "\n\n                    It will be prepared ad-hoc before the first execution and **returned as `preparedPipeline` in `PipelineExecutorResult`**\n                    But it is recommended to prepare the pipeline during collection preparation\n\n                    @see more at https://ptbk.io/prepare-pipeline\n                "); }));
      }
      var runCount = 0;
      var pipelineExecutor = function (inputParameters, onProgress) { return __awaiter(_this, void 0, void 0, function () {
          return __generator(this, function (_a) {
              runCount++;
              return [2 /*return*/, /* not await */ executePipeline({
                      pipeline: pipeline,
                      preparedPipeline: preparedPipeline,
                      setPreparedPipeline: function (newPreparedPipeline) {
                          preparedPipeline = newPreparedPipeline;
                      },
                      inputParameters: inputParameters,
                      tools: tools,
                      onProgress: onProgress,
                      pipelineIdentification: spaceTrim.spaceTrim(function (block) { return "\n                    ".concat(block(pipelineIdentification), "\n                    ").concat(runCount === 1 ? '' : "Run #".concat(runCount), "\n                "); }),
                      maxExecutionAttempts: maxExecutionAttempts,
                      maxParallelCount: maxParallelCount,
                      csvSettings: csvSettings,
                      isVerbose: isVerbose,
                      isNotPreparedWarningSupressed: isNotPreparedWarningSupressed,
                      rootDirname: rootDirname,
                      cacheDirname: cacheDirname,
                      intermediateFilesStrategy: intermediateFilesStrategy,
                      isAutoInstalled: isAutoInstalled,
                  })];
          });
      }); };
      return pipelineExecutor;
  }
  /**
   * TODO: [🐚] Change onProgress to object that represents the running execution, can be subscribed via RxJS to and also awaited
   */

  /**
   * Async version of Array.forEach
   *
   * @param array - Array to iterate over
   * @param options - Options for the function
   * @param callbackfunction - Function to call for each item
   * @public exported from `@promptbook/utils`
   * @deprecated [🪂] Use queues instead
   */
  function forEachAsync(array, options, callbackfunction) {
      return __awaiter(this, void 0, void 0, function () {
          var _a, maxParallelCount, index, runningTasks, tasks, _loop_1, _b, _c, item, e_1_1;
          var e_1, _d;
          return __generator(this, function (_e) {
              switch (_e.label) {
                  case 0:
                      _a = options.maxParallelCount, maxParallelCount = _a === void 0 ? Infinity : _a;
                      index = 0;
                      runningTasks = [];
                      tasks = [];
                      _loop_1 = function (item) {
                          var currentIndex, task;
                          return __generator(this, function (_f) {
                              switch (_f.label) {
                                  case 0:
                                      currentIndex = index++;
                                      task = callbackfunction(item, currentIndex, array);
                                      tasks.push(task);
                                      runningTasks.push(task);
                                      /* not await */ Promise.resolve(task).then(function () {
                                          runningTasks = runningTasks.filter(function (t) { return t !== task; });
                                      });
                                      if (!(maxParallelCount < runningTasks.length)) return [3 /*break*/, 2];
                                      return [4 /*yield*/, Promise.race(runningTasks)];
                                  case 1:
                                      _f.sent();
                                      _f.label = 2;
                                  case 2: return [2 /*return*/];
                              }
                          });
                      };
                      _e.label = 1;
                  case 1:
                      _e.trys.push([1, 6, 7, 8]);
                      _b = __values(array), _c = _b.next();
                      _e.label = 2;
                  case 2:
                      if (!!_c.done) return [3 /*break*/, 5];
                      item = _c.value;
                      return [5 /*yield**/, _loop_1(item)];
                  case 3:
                      _e.sent();
                      _e.label = 4;
                  case 4:
                      _c = _b.next();
                      return [3 /*break*/, 2];
                  case 5: return [3 /*break*/, 8];
                  case 6:
                      e_1_1 = _e.sent();
                      e_1 = { error: e_1_1 };
                      return [3 /*break*/, 8];
                  case 7:
                      try {
                          if (_c && !_c.done && (_d = _b.return)) _d.call(_b);
                      }
                      finally { if (e_1) throw e_1.error; }
                      return [7 /*endfinally*/];
                  case 8: return [4 /*yield*/, Promise.all(tasks)];
                  case 9:
                      _e.sent();
                      return [2 /*return*/];
              }
          });
      });
  }

  /**
   * Intercepts LLM tools and counts total usage of the tools
   *
   * @param llmTools LLM tools to be intercepted with usage counting
   * @returns LLM tools with same functionality with added total cost counting
   * @public exported from `@promptbook/core`
   */
  function countTotalUsage(llmTools) {
      var _this = this;
      var totalUsage = ZERO_USAGE;
      var proxyTools = {
          get title() {
              // TODO: [🧠] Maybe put here some suffix
              return llmTools.title;
          },
          get description() {
              // TODO: [🧠] Maybe put here some suffix
              return llmTools.description;
          },
          checkConfiguration: function () {
              return __awaiter(this, void 0, void 0, function () {
                  return __generator(this, function (_a) {
                      return [2 /*return*/, /* not await */ llmTools.checkConfiguration()];
                  });
              });
          },
          listModels: function () {
              return /* not await */ llmTools.listModels();
          },
          getTotalUsage: function () {
              // <- Note: [🥫] Not using getter `get totalUsage` but `getTotalUsage` to allow this object to be proxied
              return totalUsage;
          },
      };
      if (llmTools.callChatModel !== undefined) {
          proxyTools.callChatModel = function (prompt) { return __awaiter(_this, void 0, void 0, function () {
              var promptResult;
              return __generator(this, function (_a) {
                  switch (_a.label) {
                      case 0: return [4 /*yield*/, llmTools.callChatModel(prompt)];
                      case 1:
                          promptResult = _a.sent();
                          totalUsage = addUsage(totalUsage, promptResult.usage);
                          return [2 /*return*/, promptResult];
                  }
              });
          }); };
      }
      if (llmTools.callCompletionModel !== undefined) {
          proxyTools.callCompletionModel = function (prompt) { return __awaiter(_this, void 0, void 0, function () {
              var promptResult;
              return __generator(this, function (_a) {
                  switch (_a.label) {
                      case 0: return [4 /*yield*/, llmTools.callCompletionModel(prompt)];
                      case 1:
                          promptResult = _a.sent();
                          totalUsage = addUsage(totalUsage, promptResult.usage);
                          return [2 /*return*/, promptResult];
                  }
              });
          }); };
      }
      if (llmTools.callEmbeddingModel !== undefined) {
          proxyTools.callEmbeddingModel = function (prompt) { return __awaiter(_this, void 0, void 0, function () {
              var promptResult;
              return __generator(this, function (_a) {
                  switch (_a.label) {
                      case 0: return [4 /*yield*/, llmTools.callEmbeddingModel(prompt)];
                      case 1:
                          promptResult = _a.sent();
                          totalUsage = addUsage(totalUsage, promptResult.usage);
                          return [2 /*return*/, promptResult];
                  }
              });
          }); };
      }
      // <- Note: [🤖]
      return proxyTools;
  }
  /**
   * TODO: [🧠][💸] Maybe make some common abstraction `interceptLlmTools` and use here (or use javascript Proxy?)
   * TODO: [🧠] Is there some meaningfull way how to test this util
   * TODO: [🧠][🌯] Maybe a way how to hide ability to `get totalUsage`
   *     > const [llmToolsWithUsage,getUsage] = countTotalUsage(llmTools);
   * TODO: [👷‍♂️] @@@ Manual about construction of llmTools
   */

  /**
   * Prepares the persona for the pipeline
   *
   * @see https://github.com/webgptorg/promptbook/discussions/22
   * @public exported from `@promptbook/core`
   */
  function preparePersona(personaDescription, tools, options) {
      return __awaiter(this, void 0, void 0, function () {
          var _a, isVerbose, collection, preparePersonaExecutor, _b, _llms, llmTools, availableModels, availableModelNames, result, outputParameters, modelRequirementsRaw, modelRequirements, modelName, systemMessage, temperature;
          var _c;
          return __generator(this, function (_d) {
              switch (_d.label) {
                  case 0:
                      _a = options.isVerbose, isVerbose = _a === void 0 ? DEFAULT_IS_VERBOSE : _a;
                      if (tools === undefined || tools.llm === undefined) {
                          throw new MissingToolsError('LLM tools are required for preparing persona');
                      }
                      collection = createCollectionFromJson.apply(void 0, __spreadArray([], __read(PipelineCollection), false));
                      _b = createPipelineExecutor;
                      _c = {};
                      return [4 /*yield*/, collection.getPipelineByUrl('https://promptbook.studio/promptbook/prepare-persona.book')];
                  case 1:
                      preparePersonaExecutor = _b.apply(void 0, [(_c.pipeline = _d.sent(),
                              _c.tools = tools,
                              _c)]);
                      _llms = arrayableToArray(tools.llm);
                      llmTools = _llms.length === 1 ? _llms[0] : joinLlmExecutionTools.apply(void 0, __spreadArray([], __read(_llms), false));
                      return [4 /*yield*/, llmTools.listModels()];
                  case 2:
                      availableModels = _d.sent();
                      availableModelNames = availableModels
                          .filter(function (_a) {
                          var modelVariant = _a.modelVariant;
                          return modelVariant === 'CHAT';
                      })
                          .map(function (_a) {
                          var modelName = _a.modelName;
                          return modelName;
                      })
                          .join(',');
                      return [4 /*yield*/, preparePersonaExecutor({ availableModelNames: availableModelNames, personaDescription: personaDescription })];
                  case 3:
                      result = _d.sent();
                      assertsExecutionSuccessful(result);
                      outputParameters = result.outputParameters;
                      modelRequirementsRaw = outputParameters.modelRequirements;
                      modelRequirements = JSON.parse(modelRequirementsRaw);
                      if (isVerbose) {
                          console.info("PERSONA ".concat(personaDescription), modelRequirements);
                      }
                      modelName = modelRequirements.modelName, systemMessage = modelRequirements.systemMessage, temperature = modelRequirements.temperature;
                      return [2 /*return*/, {
                              modelVariant: 'CHAT',
                              modelName: modelName,
                              systemMessage: systemMessage,
                              temperature: temperature,
                          }];
              }
          });
      });
  }
  /**
   * TODO: [🔃][main] If the persona was prepared with different version or different set of models, prepare it once again
   * TODO: [🏢] Check validity of `modelName` in pipeline
   * TODO: [🏢] Check validity of `systemMessage` in pipeline
   * TODO: [🏢] Check validity of `temperature` in pipeline
   */

  /**
   * @@@
   *
   * Note: `$` is used to indicate that this interacts with the global scope
   * @singleton Only one instance of each register is created per build, but thare can be more @@@
   * @public exported from `@promptbook/core`
   */
  var $scrapersMetadataRegister = new $Register('scrapers_metadata');
  /**
   * TODO: [®] DRY Register logic
   */

  /**
   * Creates a message with all registered scrapers
   *
   * Note: This function is used to create a (error) message when there is no scraper for particular mime type
   *
   * @private internal function of `createScrapersFromConfiguration` and `createScrapersFromEnv`
   */
  function $registeredScrapersMessage(availableScrapers) {
      var e_1, _a, e_2, _b, e_3, _c;
      /**
       * Mixes registered scrapers from $scrapersMetadataRegister and $scrapersRegister
       */
      var all = [];
      var _loop_1 = function (packageName, className, mimeTypes, documentationUrl, isAvilableInBrowser) {
          if (all.some(function (item) { return item.packageName === packageName && item.className === className; })) {
              return "continue";
          }
          all.push({ packageName: packageName, className: className, mimeTypes: mimeTypes, documentationUrl: documentationUrl, isAvilableInBrowser: isAvilableInBrowser });
      };
      try {
          for (var _d = __values($scrapersMetadataRegister.list()), _e = _d.next(); !_e.done; _e = _d.next()) {
              var _f = _e.value, packageName = _f.packageName, className = _f.className, mimeTypes = _f.mimeTypes, documentationUrl = _f.documentationUrl, isAvilableInBrowser = _f.isAvilableInBrowser;
              _loop_1(packageName, className, mimeTypes, documentationUrl, isAvilableInBrowser);
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
          }
          finally { if (e_1) throw e_1.error; }
      }
      var _loop_2 = function (packageName, className, mimeTypes, documentationUrl, isAvilableInBrowser) {
          if (all.some(function (item) { return item.packageName === packageName && item.className === className; })) {
              return "continue";
          }
          all.push({ packageName: packageName, className: className, mimeTypes: mimeTypes, documentationUrl: documentationUrl, isAvilableInBrowser: isAvilableInBrowser });
      };
      try {
          for (var _g = __values($scrapersRegister.list()), _h = _g.next(); !_h.done; _h = _g.next()) {
              var _j = _h.value, packageName = _j.packageName, className = _j.className, mimeTypes = _j.mimeTypes, documentationUrl = _j.documentationUrl, isAvilableInBrowser = _j.isAvilableInBrowser;
              _loop_2(packageName, className, mimeTypes, documentationUrl, isAvilableInBrowser);
          }
      }
      catch (e_2_1) { e_2 = { error: e_2_1 }; }
      finally {
          try {
              if (_h && !_h.done && (_b = _g.return)) _b.call(_g);
          }
          finally { if (e_2) throw e_2.error; }
      }
      try {
          for (var availableScrapers_1 = __values(availableScrapers), availableScrapers_1_1 = availableScrapers_1.next(); !availableScrapers_1_1.done; availableScrapers_1_1 = availableScrapers_1.next()) {
              var metadata_1 = availableScrapers_1_1.value.metadata;
              all.push(metadata_1);
          }
      }
      catch (e_3_1) { e_3 = { error: e_3_1 }; }
      finally {
          try {
              if (availableScrapers_1_1 && !availableScrapers_1_1.done && (_c = availableScrapers_1.return)) _c.call(availableScrapers_1);
          }
          finally { if (e_3) throw e_3.error; }
      }
      var metadata = all.map(function (metadata) {
          var isMetadataAviailable = $scrapersMetadataRegister
              .list()
              .find(function (_a) {
              var packageName = _a.packageName, className = _a.className;
              return metadata.packageName === packageName && metadata.className === className;
          });
          var isInstalled = $scrapersRegister
              .list()
              .find(function (_a) {
              var packageName = _a.packageName, className = _a.className;
              return metadata.packageName === packageName && metadata.className === className;
          });
          var isAvilableInTools = availableScrapers.some(function (_a) {
              var _b = _a.metadata, packageName = _b.packageName, className = _b.className;
              return metadata.packageName === packageName && metadata.className === className;
          });
          return __assign(__assign({}, metadata), { isMetadataAviailable: isMetadataAviailable, isInstalled: isInstalled, isAvilableInTools: isAvilableInTools });
      });
      if (metadata.length === 0) {
          return spaceTrim__default["default"]("\n            **No scrapers are available**\n\n            This is a unexpected behavior, you are probably using some broken version of Promptbook\n            At least there should be available the metadata of the scrapers\n        ");
      }
      return spaceTrim__default["default"](function (block) { return "\n            Available scrapers are:\n            ".concat(block(metadata
          .map(function (_a, i) {
          var packageName = _a.packageName, className = _a.className, isMetadataAviailable = _a.isMetadataAviailable, isInstalled = _a.isInstalled, mimeTypes = _a.mimeTypes, isAvilableInBrowser = _a.isAvilableInBrowser, isAvilableInTools = _a.isAvilableInTools;
          var more = [];
          // TODO: [🧠] Maybe use `documentationUrl`
          if (isMetadataAviailable) {
              more.push("\u2B1C Metadata registered");
          } // not else
          if (isInstalled) {
              more.push("\uD83D\uDFE9 Installed");
          } // not else
          if (isAvilableInTools) {
              more.push("\uD83D\uDFE6 Available in tools");
          } // not else
          if (!isMetadataAviailable && isInstalled) {
              more.push("When no metadata registered but scraper is installed, it is an unexpected behavior");
          } // not else
          if (!isInstalled && isAvilableInTools) {
              more.push("When the scraper is not installed but available in tools, it is an unexpected compatibility behavior");
          } // not else
          if (!isAvilableInBrowser) {
              more.push("Not usable in browser");
          }
          var moreText = more.length === 0 ? '' : " *(".concat(more.join('; '), ")*");
          return "".concat(i + 1, ") `").concat(className, "` from `").concat(packageName, "` compatible to scrape ").concat(mimeTypes
              .map(function (mimeType) { return "\"".concat(mimeType, "\""); })
              .join(', ')).concat(moreText);
      })
          .join('\n')), "\n\n            Legend:\n            - \u2B1C **Metadata registered** means that Promptbook knows about the scraper, it is similar to registration in some registry\n            - \uD83D\uDFE9 **Installed** means that you have imported package with particular scraper\n            - \uD83D\uDFE6 **Available in tools** means that you have passed scraper as dependency into prepare or execution process\n\n        "); });
  }
  /**
   * TODO: [®] DRY Register logic
   */

  /**
   * @@@
   *
   * @param text @@@
   * @returns @@@
   * @example 'hello-world'
   * @example 'i-love-promptbook'
   * @public exported from `@promptbook/utils`
   */
  function normalizeToKebabCase(text) {
      var e_1, _a;
      text = removeDiacritics(text);
      var charType;
      var lastCharType = 'OTHER';
      var normalizedName = '';
      try {
          for (var text_1 = __values(text), text_1_1 = text_1.next(); !text_1_1.done; text_1_1 = text_1.next()) {
              var char = text_1_1.value;
              var normalizedChar = void 0;
              if (/^[a-z]$/.test(char)) {
                  charType = 'LOWERCASE';
                  normalizedChar = char;
              }
              else if (/^[A-Z]$/.test(char)) {
                  charType = 'UPPERCASE';
                  normalizedChar = char.toLowerCase();
              }
              else if (/^[0-9]$/.test(char)) {
                  charType = 'NUMBER';
                  normalizedChar = char;
              }
              else {
                  charType = 'OTHER';
                  normalizedChar = '-';
              }
              if (charType !== lastCharType &&
                  !(lastCharType === 'UPPERCASE' && charType === 'LOWERCASE') &&
                  !(lastCharType === 'NUMBER') &&
                  !(charType === 'NUMBER')) {
                  normalizedName += '-';
              }
              normalizedName += normalizedChar;
              lastCharType = charType;
          }
      }
      catch (e_1_1) { e_1 = { error: e_1_1 }; }
      finally {
          try {
              if (text_1_1 && !text_1_1.done && (_a = text_1.return)) _a.call(text_1);
          }
          finally { if (e_1) throw e_1.error; }
      }
      normalizedName = normalizedName.split(/-+/g).join('-');
      normalizedName = normalizedName.split(/-?\/-?/g).join('/');
      normalizedName = normalizedName.replace(/^-/, '');
      normalizedName = normalizedName.replace(/-$/, '');
      return normalizedName;
  }
  /**
   * Note: [💞] Ignore a discrepancy between file name and entity name
   */

  /**
   * Creates unique name for the source
   *
   * @public exported from `@promptbook/editable`
   */
  function knowledgeSourceContentToName(knowledgeSourceContent) {
      var hash = cryptoJs.SHA256(hexEncoder__default["default"].parse(JSON.stringify(knowledgeSourceContent)))
          //    <- TODO: [🥬] Encapsulate sha256 to some private utility function
          .toString( /* hex */)
          .substring(0, 20);
      //    <- TODO: [🥬] Make some system for hashes and ids of promptbook
      var semanticName = normalizeToKebabCase(knowledgeSourceContent.substring(0, 20));
      var pieces = ['source', semanticName, hash].filter(function (piece) { return piece !== ''; });
      var name = pieces.join('-').split('--').join('-');
      // <- TODO: Use MAX_FILENAME_LENGTH
      return name;
  }
  /**
   * TODO: [🐱‍🐉][🧠] Make some smart crop NOT source-i-m-pavol-a-develop-... BUT source-i-m-pavol-a-developer-...
   */

  /**
   * Convert file extension to mime type
   *
   * @private within the repository
   */
  function extensionToMimeType(value) {
      return mimeTypes.lookup(value) || 'application/octet-stream';
  }

  /**
   * Get the file extension from a file name
   *
   * @private within the repository
   */
  function getFileExtension(value) {
      var match = value.match(/\.([0-9a-z]+)(?:[?#]|$)/i);
      return match ? match[1].toLowerCase() : null;
  }

  /**
   * Checks if the file exists
   *
   * @private within the repository
   */
  function isFileExisting(filename, fs) {
      return __awaiter(this, void 0, void 0, function () {
          var isReadAccessAllowed, isFile;
          return __generator(this, function (_a) {
              switch (_a.label) {
                  case 0: return [4 /*yield*/, fs
                          .access(filename, fs.constants.R_OK)
                          .then(function () { return true; })
                          .catch(function () { return false; })];
                  case 1:
                      isReadAccessAllowed = _a.sent();
                      if (!isReadAccessAllowed) {
                          return [2 /*return*/, false];
                      }
                      return [4 /*yield*/, fs
                              .stat(filename)
                              .then(function (fileStat) { return fileStat.isFile(); })
                              .catch(function () { return false; })];
                  case 2:
                      isFile = _a.sent();
                      return [2 /*return*/, isFile];
              }
          });
      });
  }
  /**
   * Note: Not [~🟢~] because it is not directly dependent on `fs
   * TODO: [🐠] This can be a validator - with variants that return true/false and variants that throw errors with meaningless messages
   * TODO: [🖇] What about symlinks?
   */

  /**
   * Tests if given string is valid URL.
   *
   * Note: This does not check if the file exists only if the path is valid
   * @public exported from `@promptbook/utils`
   */
  function isValidFilePath(filename) {
      if (typeof filename !== 'string') {
          return false;
      }
      if (filename.split('\n').length > 1) {
          return false;
      }
      if (filename.split(' ').length >
          5 /* <- TODO: [🧠][🈷] Make some better non-arbitrary way how to distinct filenames from informational texts */) {
          return false;
      }
      var filenameSlashes = filename.split('\\').join('/');
      // Absolute Unix path: /hello.txt
      if (/^(\/)/i.test(filenameSlashes)) {
          // console.log(filename, 'Absolute Unix path: /hello.txt');
          return true;
      }
      // Absolute Windows path: /hello.txt
      if (/^([A-Z]{1,2}:\/?)\//i.test(filenameSlashes)) {
          // console.log(filename, 'Absolute Windows path: /hello.txt');
          return true;
      }
      // Relative path: ./hello.txt
      if (/^(\.\.?\/)+/i.test(filenameSlashes)) {
          // console.log(filename, 'Relative path: ./hello.txt');
          return true;
      }
      // Allow paths like foo/hello
      if (/^[^/]+\/[^/]+/i.test(filenameSlashes)) {
          // console.log(filename, 'Allow paths like foo/hello');
          return true;
      }
      // Allow paths like hello.book
      if (/^[^/]+\.[^/]+$/i.test(filenameSlashes)) {
          // console.log(filename, 'Allow paths like hello.book');
          return true;
      }
      return false;
  }
  /**
   * TODO: [🍏] Implement for MacOs
   */

  /**
   * The built-in `fetch' function with a lightweight error handling wrapper as default fetch function used in Promptbook scrapers
   *
   * @private as default `fetch` function used in Promptbook scrapers
   */
  var scraperFetch = function (url, init) { return __awaiter(void 0, void 0, void 0, function () {
      var error_1;
      return __generator(this, function (_a) {
          switch (_a.label) {
              case 0:
                  _a.trys.push([0, 2, , 3]);
                  return [4 /*yield*/, fetch(url, init)];
              case 1: return [2 /*return*/, _a.sent()];
              case 2:
                  error_1 = _a.sent();
                  if (!(error_1 instanceof Error)) {console.log('!(error instanceof Error)')
                      throw error_1;
                  }
                  throw new KnowledgeScrapeError(spaceTrim__default["default"](function (block) { return "\n                    Can not fetch \"".concat(url, "\"\n\n                    Fetch error:\n                    ").concat(block(error_1.message), "\n\n                "); }));
              case 3: return [2 /*return*/];
          }
      });
  }); };
  /**
   * TODO: [🧠] Maybe rename because it is not used only for scrapers but also in `$getCompiledBook`
   */

  /**
   * @@@
   *
   * @public exported from `@promptbook/core`
   */
  function makeKnowledgeSourceHandler(knowledgeSource, tools, options) {
      var _a;
      return __awaiter(this, void 0, void 0, function () {
          var _b, fetch, knowledgeSourceContent, name, _c, _d, rootDirname, url, response_1, mimeType, filename_1, fileExtension, mimeType;
          return __generator(this, function (_f) {
              switch (_f.label) {
                  case 0:
                      _b = tools.fetch, fetch = _b === void 0 ? scraperFetch : _b;
                      knowledgeSourceContent = knowledgeSource.knowledgeSourceContent;
                      name = knowledgeSource.name;
                      _c = options || {}, _d = _c.rootDirname, rootDirname = _d === void 0 ? null : _d, _c.isVerbose;
                      if (!name) {
                          name = knowledgeSourceContentToName(knowledgeSourceContent);
                      }
                      if (!isValidUrl(knowledgeSourceContent)) return [3 /*break*/, 2];
                      url = knowledgeSourceContent;
                      return [4 /*yield*/, fetch(url)];
                  case 1:
                      response_1 = _f.sent();
                      mimeType = ((_a = response_1.headers.get('content-type')) === null || _a === void 0 ? void 0 : _a.split(';')[0]) || 'text/html';
                      return [2 /*return*/, {
                              source: name,
                              filename: null,
                              url: url,
                              mimeType: mimeType,
                              /*
                              TODO: [🥽]
                                  > async asBlob() {
                                  >     // TODO: [👨🏻‍🤝‍👨🏻] This can be called multiple times BUT when called second time, response in already consumed
                                  >     const content = await response.blob();
                                  >     return content;
                                  > },
                              */
                              asJson: function () {
                                  return __awaiter(this, void 0, void 0, function () {
                                      var content;
                                      return __generator(this, function (_a) {
                                          switch (_a.label) {
                                              case 0: return [4 /*yield*/, response_1.json()];
                                              case 1:
                                                  content = _a.sent();
                                                  return [2 /*return*/, content];
                                          }
                                      });
                                  });
                              },
                              asText: function () {
                                  return __awaiter(this, void 0, void 0, function () {
                                      var content;
                                      return __generator(this, function (_a) {
                                          switch (_a.label) {
                                              case 0: return [4 /*yield*/, response_1.text()];
                                              case 1:
                                                  content = _a.sent();
                                                  return [2 /*return*/, content];
                                          }
                                      });
                                  });
                              },
                          }];
                  case 2:
                      if (!isValidFilePath(knowledgeSourceContent)) return [3 /*break*/, 4];
                      if (tools.fs === undefined) {
                          throw new EnvironmentMismatchError('Can not import file knowledge without filesystem tools');
                          //          <- TODO: [🧠] What is the best error type here`
                      }
                      if (rootDirname === null) {
                          throw new EnvironmentMismatchError('Can not import file knowledge in non-file pipeline');
                          //          <- TODO: [🧠] What is the best error type here`
                      }
                      filename_1 = path.join(rootDirname, knowledgeSourceContent).split('\\').join('/');
                      fileExtension = getFileExtension(filename_1);
                      mimeType = extensionToMimeType(fileExtension || '');
                      return [4 /*yield*/, isFileExisting(filename_1, tools.fs)];
                  case 3:
                      if (!(_f.sent())) {
                          throw new NotFoundError(spaceTrim__default["default"](function (block) { return "\n                          Can not make source handler for file which does not exist:\n\n                          File:\n                          ".concat(block(knowledgeSourceContent), "\n\n                          Full file path:\n                          ").concat(block(filename_1), "\n                      "); }));
                      }
                      // TODO: [🧠][😿] Test security file - file is scoped to the project (BUT maybe do this in `filesystemTools`)
                      return [2 /*return*/, {
                              source: name,
                              filename: filename_1,
                              url: null,
                              mimeType: mimeType,
                              /*
                              TODO: [🥽]
                                  > async asBlob() {
                                  >     const content = await tools.fs!.readFile(filename);
                                  >     return new Blob(
                                  >         [
                                  >             content,
                                  >             // <- TODO: [🥽] This is NOT tested, test it
                                  >         ],
                                  >         { type: mimeType },
                                  >     );
                                  > },
                              */
                              asJson: function () {
                                  return __awaiter(this, void 0, void 0, function () {
                                      var _a, _b;
                                      return __generator(this, function (_c) {
                                          switch (_c.label) {
                                              case 0:
                                                  _b = (_a = JSON).parse;
                                                  return [4 /*yield*/, tools.fs.readFile(filename_1, 'utf-8')];
                                              case 1: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                                          }
                                      });
                                  });
                              },
                              asText: function () {
                                  return __awaiter(this, void 0, void 0, function () {
                                      return __generator(this, function (_a) {
                                          switch (_a.label) {
                                              case 0: return [4 /*yield*/, tools.fs.readFile(filename_1, 'utf-8')];
                                              case 1: return [2 /*return*/, _a.sent()];
                                          }
                                      });
                                  });
                              },
                          }];
                  case 4: return [2 /*return*/, {
                          source: name,
                          filename: null,
                          url: null,
                          mimeType: 'text/markdown',
                          asText: function () {
                              return knowledgeSource.knowledgeSourceContent;
                          },
                          asJson: function () {
                              throw new UnexpectedError('Did not expect that `markdownScraper` would need to get the content `asJson`');
                          },
                          /*
                          TODO: [🥽]
                              > asBlob() {
                              >     throw new UnexpectedError(
                              >         'Did not expect that `markdownScraper` would need to get the content `asBlob`',
                              >     );
                              > },
                          */
                      }];
              }
          });
      });
  }

  /**
   * Prepares the knowle
   *
   * @see https://github.com/webgptorg/promptbook/discussions/41
   * @public exported from `@promptbook/core`
   */
  function prepareKnowledgePieces(knowledgeSources, tools, options) {
      return __awaiter(this, void 0, void 0, function () {
          var _a, maxParallelCount, rootDirname, _b, isVerbose, knowledgePreparedUnflatten, knowledgePrepared;
          var _this = this;
          return __generator(this, function (_c) {
              switch (_c.label) {
                  case 0:
                      _a = options.maxParallelCount, maxParallelCount = _a === void 0 ? DEFAULT_MAX_PARALLEL_COUNT : _a, rootDirname = options.rootDirname, _b = options.isVerbose, isVerbose = _b === void 0 ? DEFAULT_IS_VERBOSE : _b;
                      knowledgePreparedUnflatten = new Array(knowledgeSources.length);
                      return [4 /*yield*/, forEachAsync(knowledgeSources, { maxParallelCount: maxParallelCount }, function (knowledgeSource, index) { return __awaiter(_this, void 0, void 0, function () {
                              var partialPieces, sourceHandler, scrapers, _loop_1, scrapers_1, scrapers_1_1, scraper, state_1, e_1_1, pieces;
                              var e_1, _a;
                              return __generator(this, function (_b) {
                                  switch (_b.label) {
                                      case 0:
                                          partialPieces = null;
                                          return [4 /*yield*/, makeKnowledgeSourceHandler(knowledgeSource, tools, { rootDirname: rootDirname, isVerbose: isVerbose })];
                                      case 1:
                                          sourceHandler = _b.sent();
                                          scrapers = arrayableToArray(tools.scrapers);
                                          _loop_1 = function (scraper) {
                                              var partialPiecesUnchecked;
                                              return __generator(this, function (_c) {
                                                  switch (_c.label) {
                                                      case 0:
                                                          if (!scraper.metadata.mimeTypes.includes(sourceHandler.mimeType)
                                                          // <- TODO: [🦔] Implement mime-type wildcards
                                                          ) {
                                                              return [2 /*return*/, "continue"];
                                                          }
                                                          return [4 /*yield*/, scraper.scrape(sourceHandler)];
                                                      case 1:
                                                          partialPiecesUnchecked = _c.sent();
                                                          if (partialPiecesUnchecked !== null) {
                                                              partialPieces = __spreadArray([], __read(partialPiecesUnchecked), false);
                                                              return [2 /*return*/, "break"];
                                                          }
                                                          console.warn(spaceTrim__default["default"](function (block) { return "\n                        Cannot scrape knowledge from source despite the scraper `".concat(scraper.metadata.className, "` supports the mime type \"").concat(sourceHandler.mimeType, "\".\n\n                        The source:\n                        ").concat(block(knowledgeSource.knowledgeSourceContent
                                                              .split('\n')
                                                              .map(function (line) { return "> ".concat(line); })
                                                              .join('\n')), "\n\n                        ").concat(block($registeredScrapersMessage(scrapers)), "\n\n\n                    "); }));
                                                          return [2 /*return*/];
                                                  }
                                              });
                                          };
                                          _b.label = 2;
                                      case 2:
                                          _b.trys.push([2, 7, 8, 9]);
                                          scrapers_1 = __values(scrapers), scrapers_1_1 = scrapers_1.next();
                                          _b.label = 3;
                                      case 3:
                                          if (!!scrapers_1_1.done) return [3 /*break*/, 6];
                                          scraper = scrapers_1_1.value;
                                          return [5 /*yield**/, _loop_1(scraper)];
                                      case 4:
                                          state_1 = _b.sent();
                                          if (state_1 === "break")
                                              return [3 /*break*/, 6];
                                          _b.label = 5;
                                      case 5:
                                          scrapers_1_1 = scrapers_1.next();
                                          return [3 /*break*/, 3];
                                      case 6: return [3 /*break*/, 9];
                                      case 7:
                                          e_1_1 = _b.sent();
                                          e_1 = { error: e_1_1 };
                                          return [3 /*break*/, 9];
                                      case 8:
                                          try {
                                              if (scrapers_1_1 && !scrapers_1_1.done && (_a = scrapers_1.return)) _a.call(scrapers_1);
                                          }
                                          finally { if (e_1) throw e_1.error; }
                                          return [7 /*endfinally*/];
                                      case 9:
                                          if (partialPieces === null) {
                                              throw new KnowledgeScrapeError(spaceTrim__default["default"](function (block) { return "\n                        Cannot scrape knowledge\n\n                        The source:\n                        > ".concat(block(knowledgeSource.knowledgeSourceContent
                                                  .split('\n')
                                                  .map(function (line) { return "> ".concat(line); })
                                                  .join('\n')), "\n\n                        No scraper found for the mime type \"").concat(sourceHandler.mimeType, "\"\n\n                        ").concat(block($registeredScrapersMessage(scrapers)), "\n\n\n                    "); }));
                                          }
                                          pieces = partialPieces.map(function (partialPiece) { return (__assign(__assign({}, partialPiece), { sources: [
                                                  {
                                                      name: knowledgeSource.name,
                                                      // line, column <- TODO: [☀]
                                                      // <- TODO: [❎]
                                                  },
                                              ] })); });
                                          knowledgePreparedUnflatten[index] = pieces;
                                          return [2 /*return*/];
                                  }
                              });
                          }); })];
                  case 1:
                      _c.sent();
                      knowledgePrepared = knowledgePreparedUnflatten.flat();
                      return [2 /*return*/, knowledgePrepared];
              }
          });
      });
  }
  /*
  TODO: [🧊] This is how it can look in future
  > type PrepareKnowledgeKnowledge = {
  >   /**
  >    * Unprepared knowledge
  >    * /
  >   readonly knowledgeSources: ReadonlyArray<KnowledgeSourceJson>;
  > };
  >
  > export async function prepareKnowledgePieces(
  >   knowledge: PrepareKnowledgeKnowledge,
  >   options: PrepareAndScrapeOptions,
  > ):
  */
  /**
   * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
   *       Put `knowledgePieces` into `PrepareKnowledgeOptions`
   * TODO: [🪂] More than max things can run in parallel by acident [1,[2a,2b,_],[3a,3b,_]]
   * TODO: [🧠][❎] Do here propper M:N mapping
   *       [x] One source can make multiple pieces
   *       [ ] One piece can have multiple sources
   */

  /**
   * @@@
   *
   * @public exported from `@promptbook/core`
   */
  function prepareTasks(pipeline, tools, options) {
      return __awaiter(this, void 0, void 0, function () {
          var _a, maxParallelCount, tasks, knowledgePiecesCount, tasksPrepared;
          var _this = this;
          return __generator(this, function (_b) {
              switch (_b.label) {
                  case 0:
                      _a = options.maxParallelCount, maxParallelCount = _a === void 0 ? DEFAULT_MAX_PARALLEL_COUNT : _a;
                      tasks = pipeline.tasks, pipeline.parameters, knowledgePiecesCount = pipeline.knowledgePiecesCount;
                      tasksPrepared = new Array(tasks.length);
                      return [4 /*yield*/, forEachAsync(tasks, { maxParallelCount: maxParallelCount /* <- TODO: [🪂] When there are subtasks, this maximul limit can be broken */ }, function (task, index) { return __awaiter(_this, void 0, void 0, function () {
                              var dependentParameterNames, preparedContent, preparedTask;
                              return __generator(this, function (_a) {
                                  dependentParameterNames = task.dependentParameterNames;
                                  preparedContent = undefined;
                                  if (knowledgePiecesCount > 0 && !dependentParameterNames.includes('knowledge')) {
                                      preparedContent = spaceTrim.spaceTrim("\n                    {content}\n\n                    ## Knowledge\n\n                    {knowledge}\n                ");
                                      // <- TODO: [🧠][🧻] Cutomize shape/language/formatting of the addition to the prompt
                                      dependentParameterNames = __spreadArray(__spreadArray([], __read(dependentParameterNames), false), [
                                          'knowledge',
                                      ], false);
                                  }
                                  preparedTask = __assign(__assign({}, task), { dependentParameterNames: dependentParameterNames, preparedContent: preparedContent });
                                  tasksPrepared[index] = preparedTask;
                                  return [2 /*return*/];
                              });
                          }); })];
                  case 1:
                      _b.sent();
                      return [2 /*return*/, { tasksPrepared: tasksPrepared }];
              }
          });
      });
  }
  /**
   * TODO: [😂] Adding knowledge should be convert to async high-level abstractions, simmilar thing with expectations to sync high-level abstractions
   * TODO: [🧠] Add context to each task (if missing)
   * TODO: [🧠] What is better name `prepareTask` or `prepareTaskAndParameters`
   * TODO: [♨][main] !!3 Prepare index the examples and maybe tasks
   * TODO: Write tests for `preparePipeline`
   * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
   * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
   * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
   */

  /**
   * Prepare pipeline locally
   *
   * @see https://github.com/webgptorg/promptbook/discussions/196
   *
   * Note: This function does not validate logic of the pipeline
   * Note: This function acts as part of compilation process
   * Note: When the pipeline is already prepared, it returns the same pipeline
   * @public exported from `@promptbook/core`
   */
  function preparePipeline(pipeline, tools, options) {
      return __awaiter(this, void 0, void 0, function () {

          // throw new Error('Bzz');


          var rootDirname, _a, maxParallelCount, _b, isVerbose, parameters, tasks,
          /*
          <- TODO: [🧠][🪑] `promptbookVersion` */
          knowledgeSources /*
          <- TODO: [🧊] `knowledgePieces` */, personas /*
          <- TODO: [🧊] `preparations` */, sources, _llms, llmTools, llmToolsWithUsage, currentPreparation, preparations, title, collection, prepareTitleExecutor, _c, result, outputParameters, titleRaw, preparedPersonas, knowledgeSourcesPrepared, partialknowledgePiecesPrepared, knowledgePiecesPrepared, tasksPrepared /* TODO: parameters: parametersPrepared*/;
          var _d;
          var _this = this;
          return __generator(this, function (_e) {

              console.log('preparePipeline __generator', _e.label);


              // throw new Error('Bzz');


              switch (_e.label) {
                  case 0:
                      if (isPipelinePrepared(pipeline)) {
                          return [2 /*return*/, pipeline];
                      }
                      rootDirname = options.rootDirname, _a = options.maxParallelCount, maxParallelCount = _a === void 0 ? DEFAULT_MAX_PARALLEL_COUNT : _a, _b = options.isVerbose, isVerbose = _b === void 0 ? DEFAULT_IS_VERBOSE : _b;
                      parameters = pipeline.parameters, tasks = pipeline.tasks, knowledgeSources = pipeline.knowledgeSources, personas = pipeline.personas, sources = pipeline.sources;
                      if (tools === undefined || tools.llm === undefined) {
                          throw new MissingToolsError('LLM tools are required for preparing the pipeline');
                      }
                      _llms = arrayableToArray(tools.llm);
                      llmTools = _llms.length === 1 ? _llms[0] : joinLlmExecutionTools.apply(void 0, __spreadArray([], __read(_llms), false));
                      llmToolsWithUsage = countTotalUsage(llmTools);
                      currentPreparation = {
                          id: 1,
                          // TODO: [🍥]> date: $getCurrentDate(),
                          promptbookVersion: PROMPTBOOK_ENGINE_VERSION,
                          usage: ZERO_USAGE,
                      };
                      preparations = [
                          // ...preparations
                          // <- TODO: [🧊]
                          currentPreparation,
                      ];
                      title = pipeline.title;
                      if (!(title === undefined || title === '' || title === DEFAULT_BOOK_TITLE)) return [3 /*break*/, 3];
                      collection = createCollectionFromJson.apply(void 0, __spreadArray([], __read(PipelineCollection), false));
                      _c = createPipelineExecutor;
                      _d = {};
                      return [4 /*yield*/, collection.getPipelineByUrl('https://promptbook.studio/promptbook/prepare-title.book')];
                  case 1:
                      prepareTitleExecutor = _c.apply(void 0, [(_d.pipeline = _e.sent(),
                              _d.tools = tools,
                              _d)]);
                      return [4 /*yield*/, prepareTitleExecutor({
                              book: sources.map(function (_a) {
                                  var content = _a.content;
                                  return content;
                              }).join('\n\n'),
                          })];
                  case 2:
                      result = _e.sent();
                      assertsExecutionSuccessful(result);
                      outputParameters = result.outputParameters;
                      titleRaw = outputParameters.title;
                      if (isVerbose) {
                          console.info("The title is \"".concat(titleRaw, "\""));
                      }
                      title = titleRaw || DEFAULT_BOOK_TITLE;
                      _e.label = 3;
                  case 3:
                      preparedPersonas = new Array(personas.length);
                      return [4 /*yield*/, forEachAsync(personas, { maxParallelCount: maxParallelCount /* <- TODO: [🪂] When there are subtasks, this maximul limit can be broken */ }, function (persona, index) { return __awaiter(_this, void 0, void 0, function () {
                              var modelRequirements, preparedPersona;
                              return __generator(this, function (_a) {
                                  switch (_a.label) {
                                      case 0: return [4 /*yield*/, preparePersona(persona.description, __assign(__assign({}, tools), { llm: llmToolsWithUsage }), {
                                              rootDirname: rootDirname,
                                              maxParallelCount: maxParallelCount /* <- TODO:  [🪂] */,
                                              isVerbose: isVerbose,
                                          })];
                                      case 1:
                                          modelRequirements = _a.sent();
                                          preparedPersona = __assign(__assign({}, persona), { modelRequirements: modelRequirements, preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id] });
                                          preparedPersonas[index] = preparedPersona;
                                          return [2 /*return*/];
                                  }
                              });
                          }); })];
                  case 4:
                      _e.sent();
                      knowledgeSourcesPrepared = knowledgeSources.map(function (source) { return (__assign(__assign({}, source), { preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id] })); });
                      return [4 /*yield*/, prepareKnowledgePieces(knowledgeSources /* <- TODO: [🧊] {knowledgeSources, knowledgePieces} */, __assign(__assign({}, tools), { llm: llmToolsWithUsage }), __assign(__assign({}, options), { rootDirname: rootDirname, maxParallelCount: maxParallelCount /* <- TODO:  [🪂] */, isVerbose: isVerbose }))];
                  case 5:
                      partialknowledgePiecesPrepared = _e.sent();
                      knowledgePiecesPrepared = partialknowledgePiecesPrepared.map(function (piece) { return (__assign(__assign({}, piece), { preparationIds: [/* TODO: [🧊] -> */ currentPreparation.id] })); });
                      return [4 /*yield*/, prepareTasks({
                              parameters: parameters,
                              tasks: tasks,
                              knowledgePiecesCount: knowledgePiecesPrepared.length,
                          }, __assign(__assign({}, tools), { llm: llmToolsWithUsage }), {
                              rootDirname: rootDirname,
                              maxParallelCount: maxParallelCount /* <- TODO:  [🪂] */,
                              isVerbose: isVerbose,
                          })];
                  case 6:
                      tasksPrepared = (_e.sent()).tasksPrepared;
                      // ----- /Tasks preparation -----
                      // TODO: [😂] Use here all `AsyncHighLevelAbstraction`
                      // Note: Count total usage
                      currentPreparation.usage = llmToolsWithUsage.getTotalUsage();
                      return [2 /*return*/, exportJson({
                              name: 'pipelineJson',
                              message: "Result of `preparePipeline`",
                              order: ORDER_OF_PIPELINE_JSON,
                              value: __assign(__assign({}, pipeline), {
                                  // <- TODO: Probbably deeply clone the pipeline because `$exportJson` freezes the subobjects
                                  title: title, knowledgeSources: knowledgeSourcesPrepared, knowledgePieces: knowledgePiecesPrepared, tasks: __spreadArray([], __read(tasksPrepared), false),
                                  // <- TODO: [🪓] Here should be no need for spreading new array, just ` tasks: tasksPrepared`
                                  personas: preparedPersonas, preparations: __spreadArray([], __read(preparations), false) }),
                          })];
              }
          });
      });
  }
  /**
   * TODO: Write tests for `preparePipeline` and `preparePipelineOnRemoteServer`
   * TODO: [🏏] Leverage the batch API and build queues @see https://platform.openai.com/docs/guides/batch
   * TODO: [🧊] In future one preparation can take data from previous preparation and save tokens and time
   * TODO: [🛠] Actions, instruments (and maybe knowledge) => Functions and tools
   * TODO: [🧠][♏] Maybe if expecting JSON (In Anthropic Claude and other models without non-json) and its not specified in prompt content, append the instructions
   *       @see https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/increase-consistency#specify-the-desired-output-format
   */

  /**
   * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
   *
   * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
   * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
   *
   * @see https://github.com/webgptorg/promptbook#remote-server
   * @public exported from `@promptbook/remote-server`
   */
  function startRemoteServer(options) {
      var _this = this;
      var _a = __assign({ isAnonymousModeAllowed: false, isApplicationModeAllowed: false, collection: null, createLlmExecutionTools: null }, options), port = _a.port, path = _a.path, collection = _a.collection, createLlmExecutionTools = _a.createLlmExecutionTools, isAnonymousModeAllowed = _a.isAnonymousModeAllowed, isApplicationModeAllowed = _a.isApplicationModeAllowed, _b = _a.isVerbose, isVerbose = _b === void 0 ? DEFAULT_IS_VERBOSE : _b;
      // <- TODO: [🦪] Some helper type to be able to use discriminant union types with destructuring
      var httpServer = http__default["default"].createServer({}, function (request, response) { return __awaiter(_this, void 0, void 0, function () {
          var _a, _b;
          var _this = this;
          var _c;
          return __generator(this, function (_d) {
              switch (_d.label) {
                  case 0:
                      if ((_c = request.url) === null || _c === void 0 ? void 0 : _c.includes('socket.io')) {
                          return [2 /*return*/];
                      }
                      _b = (_a = response).write;
                      return [4 /*yield*/, spaceTrim.spaceTrim(function (block) { return __awaiter(_this, void 0, void 0, function () {
                              var _a, _b, _c, _d, _e;
                              return __generator(this, function (_f) {
                                  switch (_f.label) {
                                      case 0:
                                          _b = (_a = "\n                    Server for processing promptbook remote requests is running.\n\n                    Version: ".concat(PROMPTBOOK_ENGINE_VERSION, "\n                    Socket.io path: ").concat(path, "/socket.io\n                    Anonymouse mode: ").concat(isAnonymousModeAllowed ? 'enabled' : 'disabled', "\n                    Application mode: ").concat(isApplicationModeAllowed ? 'enabled' : 'disabled', "\n                    ")).concat;
                                          _c = block;
                                          if (!!isApplicationModeAllowed) return [3 /*break*/, 1];
                                          _d = '';
                                          return [3 /*break*/, 3];
                                      case 1:
                                          _e = 'Pipelines in collection:\n';
                                          return [4 /*yield*/, collection.listPipelines()];
                                      case 2:
                                          _d = _e +
                                              (_f.sent())
                                                  .map(function (pipelineUrl) { return "- ".concat(pipelineUrl); })
                                                  .join('\n');
                                          _f.label = 3;
                                      case 3: return [2 /*return*/, _b.apply(_a, [_c.apply(void 0, [_d]), "\n\n                    For more information look at:\n                    https://github.com/webgptorg/promptbook\n            "])];
                                  }
                              });
                          }); })];
                  case 1:
                      _b.apply(_a, [_d.sent()]);
                      response.end();
                      return [2 /*return*/];
              }
          });
      }); });
      var server = new socket_io.Server(httpServer, {
          path: path,
          transports: [/*'websocket', <- TODO: [🌬] Make websocket transport work */ 'polling'],
          cors: {
              origin: '*',
              methods: ['GET', 'POST'],
          },
      });
      server.on('connection', function (socket) {
          if (isVerbose) {
              console.info(colors__default["default"].gray("Client connected"), socket.id);
          }
          var getExecutionToolsFromIdentification = function (identification) { return __awaiter(_this, void 0, void 0, function () {
              var isAnonymous, llm, llmToolsConfiguration, appId, userId, customOptions, fs, executables, tools;
              var _a;
              return __generator(this, function (_b) {
                  switch (_b.label) {
                      case 0:
                          isAnonymous = identification.isAnonymous;
                          if (isAnonymous === true && !isAnonymousModeAllowed) {
                              throw new PipelineExecutionError("Anonymous mode is not allowed"); // <- TODO: [main] !!3 Test
                          }
                          if (isAnonymous === false && !isApplicationModeAllowed) {
                              throw new PipelineExecutionError("Application mode is not allowed"); // <- TODO: [main] !!3 Test
                          }
                          if (!(isAnonymous === true)) return [3 /*break*/, 1];
                          llmToolsConfiguration = identification.llmToolsConfiguration;
                          llm = createLlmToolsFromConfiguration(llmToolsConfiguration, { isVerbose: isVerbose });
                          return [3 /*break*/, 4];
                      case 1:
                          if (!(isAnonymous === false && createLlmExecutionTools !== null)) return [3 /*break*/, 3];
                          appId = identification.appId, userId = identification.userId, customOptions = identification.customOptions;
                          return [4 /*yield*/, createLlmExecutionTools({
                                  appId: appId,
                                  userId: userId,
                                  customOptions: customOptions,
                              })];
                      case 2:
                          llm = _b.sent();
                          return [3 /*break*/, 4];
                      case 3: throw new PipelineExecutionError("You must provide either llmToolsConfiguration or non-anonymous mode must be propperly configured");
                      case 4:
                          fs = $provideFilesystemForNode();
                          return [4 /*yield*/, $provideExecutablesForNode()];
                      case 5:
                          executables = _b.sent();
                          _a = {
                              llm: llm,
                              fs: fs
                          };
                          return [4 /*yield*/, $provideScrapersForNode({ fs: fs, llm: llm, executables: executables })];
                      case 6:
                          tools = (_a.scrapers = _b.sent(),
                              _a);
                          return [2 /*return*/, tools];
                  }
              });
          }); };
          // -----------
          socket.on('prompt-request', function (request) { return __awaiter(_this, void 0, void 0, function () {
              var identification, prompt, executionTools, llm, _a, promptResult, _b, error_1;
              return __generator(this, function (_c) {
                  switch (_c.label) {
                      case 0:
                          identification = request.identification, prompt = request.prompt;
                          if (isVerbose) {
                              console.info(colors__default["default"].bgWhite("Prompt:"), colors__default["default"].gray(JSON.stringify(request, null, 4)));
                          }
                          _c.label = 1;
                      case 1:
                          _c.trys.push([1, 13, 14, 15]);
                          return [4 /*yield*/, getExecutionToolsFromIdentification(identification)];
                      case 2:
                          executionTools = _c.sent();
                          llm = executionTools.llm;
                          _a = identification.isAnonymous === false &&
                              collection !== null;
                          if (!_a) return [3 /*break*/, 4];
                          return [4 /*yield*/, collection.isResponsibleForPrompt(prompt)];
                      case 3:
                          _a = !(_c.sent());
                          _c.label = 4;
                      case 4:
                          if (_a) {
                              throw new PipelineExecutionError("Pipeline is not in the collection of this server");
                          }
                          promptResult = void 0;
                          _b = prompt.modelRequirements.modelVariant;
                          switch (_b) {
                              case 'CHAT': return [3 /*break*/, 5];
                              case 'COMPLETION': return [3 /*break*/, 7];
                              case 'EMBEDDING': return [3 /*break*/, 9];
                          }
                          return [3 /*break*/, 11];
                      case 5:
                          if (llm.callChatModel === undefined) {
                              // Note: [0] This check should not be a thing
                              throw new PipelineExecutionError("Chat model is not available");
                          }
                          return [4 /*yield*/, llm.callChatModel(prompt)];
                      case 6:
                          promptResult = _c.sent();
                          return [3 /*break*/, 12];
                      case 7:
                          if (llm.callCompletionModel === undefined) {
                              // Note: [0] This check should not be a thing
                              throw new PipelineExecutionError("Completion model is not available");
                          }
                          return [4 /*yield*/, llm.callCompletionModel(prompt)];
                      case 8:
                          promptResult = _c.sent();
                          return [3 /*break*/, 12];
                      case 9:
                          if (llm.callEmbeddingModel === undefined) {
                              // Note: [0] This check should not be a thing
                              throw new PipelineExecutionError("Embedding model is not available");
                          }
                          return [4 /*yield*/, llm.callEmbeddingModel(prompt)];
                      case 10:
                          promptResult = _c.sent();
                          return [3 /*break*/, 12];
                      case 11: throw new PipelineExecutionError("Unknown model variant \"".concat(prompt.modelRequirements.modelVariant, "\""));
                      case 12:
                          if (isVerbose) {
                              console.info(colors__default["default"].bgGreen("PromptResult:"), colors__default["default"].green(JSON.stringify(promptResult, null, 4)));
                          }
                          socket.emit('prompt-response', { promptResult: promptResult } /* <- Note: [🤛] */);
                          return [3 /*break*/, 15];
                      case 13:
                          error_1 = _c.sent();
                          if (!(error_1 instanceof Error)) {console.log('!(error instanceof Error)')
                              throw error_1;
                          }
                          socket.emit('error', serializeError(error_1) /* <- Note: [🤛] */);
                          return [3 /*break*/, 15];
                      case 14:
                          socket.disconnect();
                          return [7 /*endfinally*/];
                      case 15: return [2 /*return*/];
                  }
              });
          }); });
          // -----------
          // TODO: [👒] Listing models (and checking configuration) probbably should go through REST API not Socket.io
          socket.on('listModels-request', function (request) { return __awaiter(_this, void 0, void 0, function () {
              var identification, executionTools, llm, models, error_2;
              return __generator(this, function (_a) {
                  switch (_a.label) {
                      case 0:
                          identification = request.identification;
                          if (isVerbose) {
                              console.info(colors__default["default"].bgWhite("Listing models"));
                          }
                          _a.label = 1;
                      case 1:
                          _a.trys.push([1, 4, 5, 6]);
                          return [4 /*yield*/, getExecutionToolsFromIdentification(identification)];
                      case 2:
                          executionTools = _a.sent();
                          llm = executionTools.llm;
                          return [4 /*yield*/, llm.listModels()];
                      case 3:
                          models = _a.sent();
                          socket.emit('listModels-response', { models: models } /* <- Note: [🤛] */);
                          return [3 /*break*/, 6];
                      case 4:
                          error_2 = _a.sent();
                          if (!(error_2 instanceof Error)) {console.log('!(error instanceof Error)')
                              throw error_2;
                          }
                          socket.emit('error', serializeError(error_2));
                          return [3 /*break*/, 6];
                      case 5:
                          socket.disconnect();
                          return [7 /*endfinally*/];
                      case 6: return [2 /*return*/];
                  }
              });
          }); });
          // -----------
          // TODO: [👒] Listing models (and checking configuration) probbably should go through REST API not Socket.io
          socket.on('preparePipeline-request', function (request) { return __awaiter(_this, void 0, void 0, function () {

              console.log('preparePipeline-request begin');


              var identification, pipeline, executionTools, preparedPipeline, error_3;

              try{
              return __generator(this, function (_a) {

                  console.log('preparePipeline-request __generator', _a.label);


                  switch (_a.label) {
                      case 0:
                        console.log(0);
                          identification = request.identification, pipeline = request.pipeline;
                          if (isVerbose) {
                              console.info(colors__default["default"].bgWhite("Prepare pipeline"));
                          }
                          _a.label = 1;
                      case 1:
                          console.log(1);
                          _a.trys.push([1, 4, 5, 6]);
                          return [4 /*yield*/, getExecutionToolsFromIdentification(identification)];
                      case 2:
                          console.log(2);
                          executionTools = _a.sent();
                          // throw new Error('Bzz');

                          // throw new NotYetImplementedError('Bzz')
                          return [4 /*yield*/, preparePipeline(pipeline, executionTools, options)];
                      case 3:
                          console.log(3);
                          preparedPipeline = _a.sent();
                          socket.emit('preparePipeline-response', { preparedPipeline: preparedPipeline } /* <- Note: [🤛] */);
                          return [3 /*break*/, 6];
                      case 4:
                          console.log(4);
                          error_3 = _a.sent();
                          console.log( {error_3});
                          if (!(error_3 instanceof Error)) {console.log('!(error instanceof Error)')

                              throw error_3;
                          }
                          console.log(4,'b');
                          console.log('error_3 instanceof NotYetImplementedError',error_3 instanceof NotYetImplementedError);


                          // console.log('serializeError(error_3)',serializeError(error_3))
                          // socket.emit('error',{name: 'Brr', message: 'Brr', stack:''});
                          socket.emit('error', serializeError(error_3));

                          console.log(4,'c');
                          return [3 /*break*/, 6];
                      case 5:
                          console.log(5);
                          // socket.disconnect();
                          return [7 /*endfinally*/];
                      case 6: return [2 /*return*/];
                  }
              });

              }catch(error){
                  console.log('preparePipeline-request catch',error);
              }

              console.log('preparePipeline-request end');


          }); });
          // -----------
          socket.on('disconnect', function () {
              // TODO: Destroy here executionToolsForClient
              if (isVerbose) {
                  console.info(colors__default["default"].gray("Client disconnected"), socket.id);
              }
          });
      });
      httpServer.listen(port);
      // Note: We want to log this also in non-verbose mode
      console.info(colors__default["default"].bgGreen("PROMPTBOOK server listening on port ".concat(port)));
      if (isVerbose) {
          console.info(colors__default["default"].gray("Verbose mode is enabled"));
      }
      var isDestroyed = false;
      return {
          get isDestroyed() {
              return isDestroyed;
          },
          destroy: function () {
              if (isDestroyed) {
                  return;
              }
              isDestroyed = true;
              httpServer.close();
              server.close();
          },
      };
  }
  /**
   * TODO: Split this file into multiple functions - handler for each request
   * TODO: Maybe use `$exportJson`
   * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
   * TODO: [⚖] Expose the collection to be able to connect to same collection via createCollectionFromUrl
   * TODO: Handle progress - support streaming
   * TODO: [🗯] Do not hang up immediately but wait until client closes OR timeout
   * TODO: [🗯] Timeout on chat to free up resources
   * TODO: [🃏] Pass here some security token to prevent malitious usage and/or DDoS
   * TODO: [0] Set unavailable models as undefined in `RemoteLlmExecutionTools` NOT throw error here
   * TODO: Allow to constrain anonymous mode for specific models / providers
   */

  exports.BOOK_LANGUAGE_VERSION = BOOK_LANGUAGE_VERSION;
  exports.PROMPTBOOK_ENGINE_VERSION = PROMPTBOOK_ENGINE_VERSION;
  exports.startRemoteServer = startRemoteServer;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.umd.js.map
