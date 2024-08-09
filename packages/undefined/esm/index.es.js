import spaceTrim$1, { spaceTrim } from 'spacetrim';

/**
 * The version of the Promptbook library
 *
 * @public exported from all packages
 */
var PROMPTBOOK_VERSION = '0.62.0';
// TODO: !!!! List here all the versions and annotate + put into script

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
 * This error type indicates that the error should not happen and its last check before crashing with some other error
 *
 * @public exported from `@promptbook/core`
 */
var UnexpectedError = /** @class */ (function (_super) {
    __extends(UnexpectedError, _super);
    function UnexpectedError(message) {
        var _this = _super.call(this, spaceTrim(function (block) { return "\n                    ".concat(block(message), "\n\n                    Note: This error should not happen.\n                    It's probbably a bug in the pipeline collection\n\n                    Please report issue:\n                    https://github.com/webgptorg/promptbook/issues\n\n                    Or contact us on me@pavolhejny.com\n\n                "); })) || this;
        _this.name = 'UnexpectedError';
        Object.setPrototypeOf(_this, UnexpectedError.prototype);
        return _this;
    }
    return UnexpectedError;
}(Error));

/**
 * @@@
 *
 * @param text @@@
 * @param _isFirstLetterCapital @@@
 * @returns @@@
 * @example 'helloWorld'
 * @example 'iLovePromptbook'
 * @public exported from `@promptbook/utils`
 */
function normalizeTo_camelCase(text, _isFirstLetterCapital) {
    var e_1, _a;
    if (_isFirstLetterCapital === void 0) { _isFirstLetterCapital = false; }
    var charType;
    var lastCharType = null;
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
                normalizedChar = '';
            }
            if (!lastCharType) {
                if (_isFirstLetterCapital) {
                    normalizedChar = normalizedChar.toUpperCase(); //TODO: DRY
                }
            }
            else if (charType !== lastCharType &&
                !(charType === 'LOWERCASE' && lastCharType === 'UPPERCASE') &&
                !(lastCharType === 'NUMBER') &&
                !(charType === 'NUMBER')) {
                normalizedChar = normalizedChar.toUpperCase(); //TODO: [🌺] DRY
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
    return normalizedName;
}
/**
 * TODO: [🌺] Use some intermediate util splitWords
 */

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
            else if (/^\/$/.test(char)) {
                charType = 'SLASH';
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
 * Removes emojis from a string and fix whitespaces
 *
 * @param text with emojis
 * @returns text without emojis
 * @public exported from `@promptbook/utils`
 */
function removeEmojis(text) {
    // Replace emojis (and also ZWJ sequence) with hyphens
    text = text.replace(/(\p{Extended_Pictographic})\p{Modifier_Symbol}/gu, '$1');
    text = text.replace(/(\p{Extended_Pictographic})[\u{FE00}-\u{FE0F}]/gu, '$1');
    text = text.replace(/(\p{Extended_Pictographic})(\u{200D}\p{Extended_Pictographic})*/gu, '$1');
    text = text.replace(/\p{Extended_Pictographic}/gu, '');
    return text;
}

/**
 * @@@
 *
 * @param value @@@
 * @returns @@@
 * @example @@@
 * @public exported from `@promptbook/utils`
 */
function titleToName(value) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
        // TODO: Maybe check against some list unallowed characters
        return value;
    }
    if (value.startsWith('./') || value.startsWith('../')) {
        // TODO: Maybe check against some list unallowed characters
        return value;
    }
    value = removeEmojis(value);
    value = normalizeToKebabCase(value);
    // TODO: [🧠] Maybe warn or add some padding to short name which are not good identifiers
    return value;
}

/**
 * Creates a Mermaid graph based on the promptbook
 *
 * Note: The result is not wrapped in a Markdown code block
 *
 * @public exported from `@promptbook/utils`
 */
function renderPromptbookMermaid(pipelineJson, options) {
    var _a = (options || {}).linkPromptTemplate, linkPromptTemplate = _a === void 0 ? function () { return null; } : _a;
    var parameterNameToTemplateName = function (parameterName) {
        var parameter = pipelineJson.parameters.find(function (parameter) { return parameter.name === parameterName; });
        if (!parameter) {
            throw new UnexpectedError("Could not find {".concat(parameterName, "}"));
        }
        if (parameter.isInput) {
            return 'input';
        }
        var template = pipelineJson.promptTemplates.find(function (template) { return template.resultingParameterName === parameterName; });
        if (!template) {
            throw new Error("Could not find template for {".concat(parameterName, "}"));
        }
        return normalizeTo_camelCase('template-' + titleToName(template.title));
    };
    var promptbookMermaid = spaceTrim(function (block) { return "\n\n            %% \uD83D\uDD2E Tip: Open this on GitHub or in the VSCode website to see the Mermaid graph visually\n\n            flowchart LR\n              subgraph \"".concat(pipelineJson.title, "\"\n\n                  direction TB\n\n                  input((Input)):::input\n                  ").concat(block(pipelineJson.promptTemplates
        .flatMap(function (_a) {
        var title = _a.title, dependentParameterNames = _a.dependentParameterNames, resultingParameterName = _a.resultingParameterName;
        return __spreadArray([
            "".concat(parameterNameToTemplateName(resultingParameterName), "(\"").concat(title, "\")")
        ], __read(dependentParameterNames.map(function (dependentParameterName) {
            return "".concat(parameterNameToTemplateName(dependentParameterName), "--\"{").concat(dependentParameterName, "}\"-->").concat(parameterNameToTemplateName(resultingParameterName));
        })), false);
    })
        .join('\n')), "\n\n                  ").concat(block(pipelineJson.parameters
        .filter(function (_a) {
        var isOutput = _a.isOutput;
        return isOutput;
    })
        .map(function (_a) {
        var name = _a.name;
        return "".concat(parameterNameToTemplateName(name), "--\"{").concat(name, "}\"-->output");
    })
        .join('\n')), "\n                  output((Output)):::output\n\n                  ").concat(block(pipelineJson.promptTemplates
        .map(function (promptTemplate) {
        var link = linkPromptTemplate(promptTemplate);
        if (link === null) {
            return '';
        }
        var href = link.href, title = link.title;
        var templateName = parameterNameToTemplateName(promptTemplate.resultingParameterName);
        return "click ".concat(templateName, " href \"").concat(href, "\" \"").concat(title, "\";");
    })
        .filter(function (line) { return line !== ''; })
        .join('\n')), "\n\n                  classDef input color: grey;\n                  classDef output color: grey;\n\n              end;\n\n        "); });
    return promptbookMermaid;
}
/**
 * TODO: Maybe use some Mermaid package instead of string templating
 * TODO: [🕌] When more than 2 functionalities, split into separate functions
 */

/**
 * Parses the template and returns the list of all parameter names
 *
 * @param template the template with parameters in {curly} braces
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
 * This error indicates that the promptbook in a markdown format cannot be parsed into a valid promptbook object
 *
 * @public exported from `@promptbook/core`
 */
var ParsingError = /** @class */ (function (_super) {
    __extends(ParsingError, _super);
    function ParsingError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'ParsingError';
        Object.setPrototypeOf(_this, ParsingError.prototype);
        return _this;
    }
    return ParsingError;
}(Error));

/**
 * Parses the given script and returns the list of all used variables that are not defined in the script
 *
 * @param script from which to extract the variables
 * @returns the list of variable names
 * @throws {ParsingError} if the script is invalid
 * @public exported from `@promptbook/utils`
 */
function extractVariables(script) {
    var variables = new Set();
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
                var undefinedName = error.message.split(' ')[0];
                /*
                Note: Parsing the error
                      [ReferenceError: thing is not defined]
                */
                if (!undefinedName) {
                    throw error;
                }
                if (script.includes(undefinedName + '(')) {
                    script = "const ".concat(undefinedName, " = ()=>'';") + script;
                }
                else {
                    variables.add(undefinedName);
                    script = "const ".concat(undefinedName, " = '';") + script;
                }
            }
    }
    catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }
        throw new ParsingError(spaceTrim(function (block) { return "\n                    Can not extract variables from the script\n\n                    ".concat(block(error.name), ": ").concat(block(error.message), "\n                "); }));
    }
    return variables;
}
/**
 * TODO: [🔣] Support for multiple languages - python, java,...
 */

/**
 * Parses the prompt template and returns the set of all used parameters
 *
 * @param promptTemplate the template with used parameters
 * @returns the set of parameter names
 * @throws {ParsingError} if the script is invalid
 * @public exported from `@promptbook/utils`
 */
function extractParameterNamesFromPromptTemplate(promptTemplate) {
    var e_1, _a, e_2, _b, e_3, _c;
    var title = promptTemplate.title, description = promptTemplate.description, blockType = promptTemplate.blockType, content = promptTemplate.content, preparedContent = promptTemplate.preparedContent, jokerParameterNames = promptTemplate.jokerParameterNames;
    var parameterNames = new Set();
    try {
        for (var _d = __values(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], __read(extractParameterNames(title)), false), __read(extractParameterNames(description || '')), false), __read(extractParameterNames(content)), false), __read(extractParameterNames(preparedContent || '')), false)), _e = _d.next(); !_e.done; _e = _d.next()) {
            var parameterName = _e.value;
            parameterNames.add(parameterName);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (blockType === 'SCRIPT') {
        try {
            for (var _f = __values(extractVariables(content)), _g = _f.next(); !_g.done; _g = _f.next()) {
                var parameterName = _g.value;
                parameterNames.add(parameterName);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    try {
        for (var _h = __values(jokerParameterNames || []), _j = _h.next(); !_j.done; _j = _h.next()) {
            var jokerName = _j.value;
            parameterNames.add(jokerName);
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
        }
        finally { if (e_3) throw e_3.error; }
    }
    parameterNames.delete('content');
    //                      <- Note {websiteContent} is used in `preparedContent`
    return parameterNames;
}
/**
 * TODO: [🔣] If script require contentLanguage
 */

/**
 * This error indicates that the promptbook object has valid syntax but contains logical errors (like circular dependencies)
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
 * Function renameParameter will find all usable parameters for given prompt template
 * In other words, it will find all parameters that are not used in the prompt template itseld and all its dependencies
 *
 * @throws {PipelineLogicError} If the new parameter name is already used in the pipeline
 * @public exported from `@promptbook/utils`
 */
function renameParameter(options) {
    var e_1, _a, e_2, _b;
    var pipeline = options.pipeline, oldParameterName = options.oldParameterName, newParameterName = options.newParameterName;
    if (pipeline.parameters.some(function (parameter) { return parameter.name === newParameterName; })) {
        throw new PipelineLogicError("Can not replace {".concat(oldParameterName, "} to {").concat(newParameterName, "} because {").concat(newParameterName, "} is already used in the pipeline"));
    }
    var renamedPipeline = __assign(__assign({}, pipeline), { parameters: __spreadArray([], __read(pipeline.parameters), false), promptTemplates: __spreadArray([], __read(pipeline.promptTemplates), false) });
    try {
        for (var _c = __values(renamedPipeline.parameters), _d = _c.next(); !_d.done; _d = _c.next()) {
            var parameter = _d.value;
            if (parameter.name !== oldParameterName) {
                continue;
            }
            parameter.name = newParameterName;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_1) throw e_1.error; }
    }
    try {
        for (var _e = __values(renamedPipeline.promptTemplates), _f = _e.next(); !_f.done; _f = _e.next()) {
            var promptTemplate = _f.value;
            if (promptTemplate.resultingParameterName === oldParameterName) {
                promptTemplate.resultingParameterName = newParameterName;
            }
            promptTemplate.dependentParameterNames = promptTemplate.dependentParameterNames.map(function (dependentParameterName) {
                return dependentParameterName === oldParameterName ? newParameterName : dependentParameterName;
            });
            promptTemplate.content = promptTemplate.content.replace(new RegExp("{".concat(oldParameterName, "}"), 'g'), "{".concat(newParameterName, "}"));
            promptTemplate.title = promptTemplate.title.replace(new RegExp("{".concat(oldParameterName, "}"), 'g'), "{".concat(newParameterName, "}"));
            promptTemplate.description =
                promptTemplate.description === undefined
                    ? undefined
                    : promptTemplate.description.replace(new RegExp("{".concat(oldParameterName, "}"), 'g'), "{".concat(newParameterName, "}"));
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return renamedPipeline;
}

/**
 * Async version of Array.forEach
 *
 * @param array - Array to iterate over
 * @param options - Options for the function
 * @param callbackfunction - Function to call for each item
 * @public exported from `@promptbook/utils`
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
        if (!(error instanceof Error)) {
            throw error;
        }
        if (error.message.includes('Unexpected token')) {
            return false;
        }
        return false;
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
 * Extracts all code blocks from markdown.
 *
 * Note: There are 3 simmilar function:
 * - `extractBlock` just extracts the content of the code block which is also used as build-in function for postprocessing
 * - `extractOneBlockFromMarkdown` extracts exactly one code block with language of the code block
 * - `extractAllBlocksFromMarkdown` extracts all code blocks with language of the code block
 *
 * @param markdown any valid markdown
 * @returns code blocks with language and content
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
                        throw new ParsingError("".concat(capitalize(currentCodeBlock.language || 'the'), " code block was not closed and already opening new ").concat(language, " code block"));
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
        throw new ParsingError("".concat(capitalize(currentCodeBlock.language || 'the'), " code block was not closed at the end of the markdown"));
    }
    return codeBlocks;
}
/**
 * TODO: Maybe name for `blockNotation` instead of  '```' and '>'
 */

/**
 * Extracts exactly ONE code block from markdown.
 *
 * Note: If there are multiple or no code blocks the function throws an error
 *
 * Note: There are 3 simmilar function:
 * - `extractBlock` just extracts the content of the code block which is also used as build-in function for postprocessing
 * - `extractOneBlockFromMarkdown` extracts exactly one code block with language of the code block
 * - `extractAllBlocksFromMarkdown` extracts all code blocks with language of the code block
 *
 * @param markdown any valid markdown
 * @returns code block with language and content
 * @public exported from `@promptbook/markdown-utils`
 */
function extractOneBlockFromMarkdown(markdown) {
    var codeBlocks = extractAllBlocksFromMarkdown(markdown);
    if (codeBlocks.length !== 1) {
        throw new ParsingError(spaceTrim$1(function (block) { return "\n                    There should be exactly 1 code block, found ".concat(codeBlocks.length, " code blocks\n\n                    ").concat(block(codeBlocks.map(function (block, i) { return "Block ".concat(i + 1, ":\n").concat(block.content); }).join('\n\n\n')), "\n                "); }));
    }
    return codeBlocks[0];
}
/***
 * TODO: [🍓][🌻] Decide of this is internal util, external util OR validator/postprocessor
 */

/**
 * Extracts code block from markdown.
 *
 * Note: If there are multiple or no code blocks the function throws an error
 *
 * Note: There are 3 simmilar function:
 * - `extractBlock` just extracts the content of the code block which is also used as build-in function for postprocessing
 * - `extractOneBlockFromMarkdown` extracts exactly one code block with language of the code block
 * - `extractAllBlocksFromMarkdown` extracts all code blocks with language of the code block
 *
 * @public exported from `@promptbook/utils`
 */
function extractBlock(markdown) {
    var content = extractOneBlockFromMarkdown(markdown).content;
    return content;
}
/**
 * TODO: [🧠][🌻] Maybe export through `@promptbook/markdown-utils` not `@promptbook/utils`
 */

/**
 * Simple wrapper `new Date().toISOString()`
 *
 * @returns string_date branded type
 * @public exported from `@promptbook/utils`
 */
function $currentDate() {
    return new Date().toISOString();
}

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
 * @@@
 *
 * @returns The same object as the input, but deeply frozen
 *
 * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
 */
function deepFreeze(objectValue) {
    var e_1, _a;
    var propertyNames = Object.getOwnPropertyNames(objectValue);
    try {
        for (var propertyNames_1 = __values(propertyNames), propertyNames_1_1 = propertyNames_1.next(); !propertyNames_1_1.done; propertyNames_1_1 = propertyNames_1.next()) {
            var propertyName = propertyNames_1_1.value;
            var value = objectValue[propertyName];
            if (value && typeof value === 'object') {
                deepFreeze(value);
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
    return Object.freeze(objectValue);
}
/**
 * @@@
 * @@@
 *
 * @returns The same object as the input, but deeply frozen
 * @public exported from `@promptbook/utils`
 *
 * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
 */
function deepFreezeWithSameType(objectValue) {
    return deepFreeze(objectValue);
}
/**
 * TODO: [🧠] Is there a way how to meaningfully test this utility
 */

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
 * Counts number of lines in the text
 *
 * @public exported from `@promptbook/utils`
 */
function countLines(text) {
    if (text === '') {
        return 0;
    }
    return text.split('\n').length;
}

/**
 * Counts number of pages in the text
 *
 * @public exported from `@promptbook/utils`
 */
function countPages(text) {
    var sentencesPerPage = 5; // Assuming each page has 5 sentences
    var sentences = text.split(/[.!?]+/).filter(function (sentence) { return sentence.trim() !== ''; });
    var pageCount = Math.ceil(sentences.length / sentencesPerPage);
    return pageCount;
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
 * Detects if the code is running in a browser environment in main thread (Not in a web worker)
 *
 * @public exported from `@promptbook/utils`
 */
var isRunningInBrowser = new Function("\n    try {\n        return this === window;\n    } catch (e) {\n        return false;\n    }\n");
/**
 * Detects if the code is running in a Node.js environment
 *
 * @public exported from `@promptbook/utils`
 */
var isRunningInNode = new Function("\n    try {\n        return this === global;\n    } catch (e) {\n        return false;\n    }\n");
/**
 * Detects if the code is running in a web worker
 *
 * @public exported from `@promptbook/utils`
 */
var isRunningInWebWorker = new Function("\n    try {\n        if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {\n            return true;\n        } else {\n            return false;\n        }\n    } catch (e) {\n        return false;\n    }\n");

/**
 * Makes first letter of a string uppercase
 *
 * @public exported from `@promptbook/utils`
 */
function decapitalize(word) {
    return word.substring(0, 1).toLowerCase() + word.substring(1);
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
            else if (/^\/$/.test(char)) {
                charType = 'SLASH';
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
 * Parses keywords from a string
 *
 * @param {string} input
 * @returns {Set} of keywords without diacritics in lowercase
 * @public exported from `@promptbook/utils`
 */
function parseKeywordsFromString(input) {
    var keywords = normalizeTo_SCREAMING_CASE(removeDiacritics(input))
        .toLowerCase()
        .split(/[^a-z0-9]+/gs)
        .filter(function (value) { return value; });
    return new Set(keywords);
}

/**
 * Tests if keyword is valid
 *
 * @param keyword to test
 * @returns if keyword is valid or not
 *
 * @public exported from `@promptbook/utils`
 */
function isValidKeyword(keyword) {
    var keywordParsed = parseKeywordsFromString(keyword);
    if (keywordParsed.size !== 1) {
        return false;
    }
    var keywordParsedArray = Array.from(keywordParsed);
    var keywordParsedFirst = keywordParsedArray[0];
    return keywordParsedFirst === keyword;
}

/**
 * @@@
 *
 * @param name @@@
 * @returns @@@
 * @example @@@
 * @public exported from `@promptbook/utils`
 */
function nameToUriPart(name) {
    var uriPart = name;
    uriPart = uriPart.toLowerCase();
    uriPart = removeDiacritics(uriPart);
    uriPart = uriPart.replace(/[^a-zA-Z0-9]+/g, '-');
    uriPart = uriPart.replace(/^-+/, '');
    uriPart = uriPart.replace(/-+$/, '');
    return uriPart;
}

/**
 * @@@
 *
 * @param name @@@
 * @returns @@@
 * @example @@@
 * @public exported from `@promptbook/utils`
 */
function nameToUriParts(name) {
    return nameToUriPart(name)
        .split('-')
        .filter(function (value) { return value !== ''; });
}

/**
 *
 * @param text @public exported from `@promptbook/utils`
 * @returns
 * @example 'HelloWorld'
 * @example 'ILovePromptbook'
 * @public exported from `@promptbook/utils`
 */
function normalizeTo_PascalCase(text) {
    return normalizeTo_camelCase(text, true);
}

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
 * Parses keywords from any object and recursively walks through
 *
 * Tip: If you want to parse multiple inputs, just wrap them in an array
 *
 * @param input of any kind
 * @returns {Set} of keywords without diacritics in lowercase
 * @public exported from `@promptbook/utils`
 */
function parseKeywords(input) {
    if (typeof input === 'string') {
        return parseKeywordsFromString(input);
    }
    else if (typeof input === 'object') {
        if (Array.isArray(input)) {
            return input.map(parseKeywords).reduce(function (a, b) { return new Set(__spreadArray(__spreadArray([], __read(a), false), __read(b), false)); }, new Set());
        }
        else if (input === null) {
            return new Set();
        }
        else {
            return parseKeywords(Object.values(input));
        }
    }
    else {
        return new Set();
    }
}
/**
 * Note: Not using spread in input param because of keeping second parameter for options
 * TODO: [🌺] Use some intermediate util splitWords
 */

/**
 * @@@
 *
 * @param haystack
 * @param needle
 * @returns
 * @public exported from `@promptbook/utils`
 */
function searchKeywords(haystack, needle) {
    var e_1, _a;
    var _loop_1 = function (needleWord) {
        if (!__spreadArray([], __read(haystack), false).some(function (haystackWord) { return haystackWord.substring(0, needleWord.length) === needleWord; })) {
            return { value: false };
        }
    };
    try {
        for (var needle_1 = __values(needle), needle_1_1 = needle_1.next(); !needle_1_1.done; needle_1_1 = needle_1.next()) {
            var needleWord = needle_1_1.value;
            var state_1 = _loop_1(needleWord);
            if (typeof state_1 === "object")
                return state_1.value;
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (needle_1_1 && !needle_1_1.done && (_a = needle_1.return)) _a.call(needle_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return true;
}

/**
 * Function parseNumber will parse number from string
 *
 * Unlike Number.parseInt, Number.parseFloat it will never ever result in NaN
 * Note: it also works only with decimal numbers
 *
 * @returns parsed number
 * @throws {ParsingError} if the value is not a number
 *
 * @public exported from `@promptbook/utils`
 */
function parseNumber(value) {
    var originalValue = value;
    if (typeof value === 'number') {
        value = value.toString(); // <- TODO: Maybe more efficient way to do this
    }
    if (typeof value !== 'string') {
        return 0;
    }
    value = value.trim();
    if (value.startsWith('+')) {
        return parseNumber(value.substring(1));
    }
    if (value.startsWith('-')) {
        var number = parseNumber(value.substring(1));
        if (number === 0) {
            return 0; // <- Note: To prevent -0
        }
        return -number;
    }
    value = value.replace(/,/g, '.');
    value = value.toUpperCase();
    if (value === '') {
        return 0;
    }
    if (value === '♾' || value.startsWith('INF')) {
        return Infinity;
    }
    if (value.includes('/')) {
        var _a = __read(value.split('/'), 2), numerator_ = _a[0], denominator_ = _a[1];
        var numerator = parseNumber(numerator_);
        var denominator = parseNumber(denominator_);
        if (denominator === 0) {
            throw new ParsingError("Unable to parse number from \"".concat(originalValue, "\" because denominator is zero"));
        }
        return numerator / denominator;
    }
    if (/^(NAN|NULL|NONE|UNDEFINED|ZERO|NO.*)$/.test(value)) {
        return 0;
    }
    if (value.includes('E')) {
        var _b = __read(value.split('E'), 2), significand = _b[0], exponent = _b[1];
        return parseNumber(significand) * Math.pow(10, parseNumber(exponent));
    }
    if (!/^[0-9.]+$/.test(value) || value.split('.').length > 2) {
        throw new ParsingError("Unable to parse number from \"".concat(originalValue, "\""));
    }
    var num = parseFloat(value);
    if (isNaN(num)) {
        throw new ParsingError("Unexpected NaN when parsing number from \"".concat(originalValue, "\""));
    }
    return num;
}
/**
 * TODO: Maybe use sth. like safe-eval in fraction/calculation case @see https://www.npmjs.com/package/safe-eval
 * TODO: [🧠][🌻] Maybe export through `@promptbook/markdown-utils` not `@promptbook/utils`
 */

/**
 * Generates random seed
 *
 * Warning: This function is not cryptographically secure (it uses Math.random internally)
 * @public exported from `@promptbook/utils`
 */
function $randomSeed() {
    return Math.random();
}

/**
 * Removes quotes from a string
 *
 * Tip: This is very usefull for post-processing of the result of the LLM model
 * Note: This function removes only the same quotes from the beginning and the end of the string
 * Note: There are two simmilar functions:
 * - `removeQuotes` which removes only bounding quotes
 * - `unwrapResult` which removes whole introduce sentence
 *
 * @param text optionally quoted text
 * @returns text without quotes
 * @public exported from `@promptbook/utils`
 */
function removeQuotes(text) {
    if (text.startsWith('"') && text.endsWith('"')) {
        return text.slice(1, -1);
    }
    if (text.startsWith('\'') && text.endsWith('\'')) {
        return text.slice(1, -1);
    }
    return text;
}

/**
 * The maximum number of iterations for a loops
 *
 * @private within the repository - too low-level in comparison to other `MAX_...`
 */
var LOOP_LIMIT = 1000;
/**
 * Nonce which is used for replacing things in strings
 */
var REPLACING_NONCE = 'u$k42k%!V2zo34w7Fu#@QUHYPW';
/**
 * The names of the parameters that are reserved for special purposes
 *
 * @public exported from `@promptbook/core`
 */
deepFreeze([
    'content',
    'context',
    'knowledge',
    'samples',
    'modelName',
    'currentDate',
    // <- TODO: Add more like 'date', 'modelName',...
    // <- TODO: Add [emoji] + instructions ACRY when adding new reserved parameter
]);
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
/*
TODO: !!! Just testing false-negative detection of [🟡][🟢][🔵][⚪] leak
*/
// [🟡][🟢][🔵][⚪]
/**
 * TODO: !!!!!! Check that all @private contains some normalized explanation
 */

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
 * Replaces parameters in template with values from parameters object
 *
 * @param template the template with parameters in {curly} braces
 * @param parameters the object with parameters
 * @returns the template with replaced parameters
 * @throws {PipelineExecutionError} if parameter is not defined, not closed, or not opened
 * @public exported from `@promptbook/utils`
 */
function replaceParameters(template, parameters) {
    var e_1, _a;
    try {
        for (var _b = __values(Object.entries(parameters)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), parameterName = _d[0], parameterValue = _d[1];
            if (parameterValue === RESERVED_PARAMETER_MISSING_VALUE) {
                throw new UnexpectedError("Parameter {".concat(parameterName, "} has missing value"));
            }
            else if (parameterValue === RESERVED_PARAMETER_RESTRICTED) {
                // TODO: [🍵]
                throw new UnexpectedError("Parameter {".concat(parameterName, "} is restricted to use"));
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
    var replacedTemplate = template;
    var match;
    var loopLimit = LOOP_LIMIT;
    var _loop_1 = function () {
        if (loopLimit-- < 0) {
            throw new LimitReachedError('Loop limit reached during parameters replacement in `replaceParameters`');
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
            throw new PipelineExecutionError("Parameter {".concat(parameterName, "} is not defined"));
        }
        var parameterValue = parameters[parameterName];
        if (parameterValue === undefined) {
            throw new PipelineExecutionError("Parameter {".concat(parameterName, "} is not defined"));
        }
        parameterValue = parameterValue.toString();
        if (parameterValue.includes('\n') && /^\s*\W{0,3}\s*$/.test(precol)) {
            parameterValue = parameterValue
                .split('\n')
                .map(function (line, index) { return (index === 0 ? line : "".concat(precol).concat(line)); })
                .join('\n');
        }
        replacedTemplate =
            replacedTemplate.substring(0, match.index + precol.length) +
                parameterValue +
                replacedTemplate.substring(match.index + precol.length + parameterName.length + 2);
    };
    while ((match = /^(?<precol>.*){(?<parameterName>\w+)}(.*)/m /* <- Not global */
        .exec(replacedTemplate))) {
        _loop_1();
    }
    // [💫] Check if there are parameters that are not closed properly
    if (/{\w+$/.test(replacedTemplate)) {
        throw new PipelineExecutionError('Parameter is not closed');
    }
    // [💫] Check if there are parameters that are not opened properly
    if (/^\w+}/.test(replacedTemplate)) {
        throw new PipelineExecutionError('Parameter is not opened');
    }
    return replacedTemplate;
}

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
 * Creates a new set with all elements that are present in all sets
 *
 * @deprecated use new javascript set methods instead @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
 * @public exported from `@promptbook/utils`
 */
function intersection() {
    var e_1, _a;
    var sets = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        sets[_i] = arguments[_i];
    }
    var intersection = new Set();
    if (sets[0]) {
        try {
            for (var _b = __values(Array.from(sets[0])), _c = _b.next(); !_c.done; _c = _b.next()) {
                var item = _c.value;
                var isPresentInAllSets = true;
                for (var i = 1; i < sets.length; i++) {
                    if (sets[i] !== undefined && !sets[i].has(item)) {
                        isPresentInAllSets = false;
                        break;
                    }
                }
                if (isPresentInAllSets) {
                    intersection.add(item);
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
    return intersection;
}

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
 * Function trimCodeBlock will trim starting and ending code block from the string if it is present.
 *
 * Note: This is usefull for post-processing of the result of the chat LLM model
 *       when the model wraps the result in the (markdown) code block.
 *
 * @public exported from `@promptbook/utils`
 */
function trimCodeBlock(value) {
    value = spaceTrim(value);
    if (!/^```[a-z]*(.*)```$/is.test(value)) {
        return value;
    }
    value = value.replace(/^```[a-z]*/i, '');
    value = value.replace(/```$/i, '');
    value = spaceTrim(value);
    return value;
}

/**
 * Function trimEndOfCodeBlock will remove ending code block from the string if it is present.
 *
 * Note: This is usefull for post-processing of the result of the completion LLM model
 *       if you want to start code block in the prompt but you don't want to end it in the result.
 *
 * @public exported from `@promptbook/utils`
 */
function trimEndOfCodeBlock(value) {
    value = spaceTrim(value);
    value = value.replace(/```$/g, '');
    value = spaceTrim(value);
    return value;
}

/**
 * Removes quotes and optional introduce text from a string
 *
 * Tip: This is very usefull for post-processing of the result of the LLM model
 * Note: This function trims the text and removes whole introduce sentence if it is present
 * Note: There are two simmilar functions:
 * - `removeQuotes` which removes only bounding quotes
 * - `unwrapResult` which removes whole introduce sentence
 *
 * @param text optionally quoted text
 * @returns text without quotes
 * @public exported from `@promptbook/utils`
 */
function unwrapResult(text, options) {
    var _a = options || {}, _b = _a.isTrimmed, isTrimmed = _b === void 0 ? true : _b, _c = _a.isIntroduceSentenceRemoved, isIntroduceSentenceRemoved = _c === void 0 ? true : _c;
    var trimmedText = text;
    // Remove leading and trailing spaces and newlines
    if (isTrimmed) {
        trimmedText = spaceTrim(trimmedText);
    }
    var processedText = trimmedText;
    if (isIntroduceSentenceRemoved) {
        var introduceSentenceRegex = /^[a-zěščřžýáíéúů:\s]*:\s*/i;
        if (introduceSentenceRegex.test(text)) {
            // Remove the introduce sentence and quotes by replacing it with an empty string
            processedText = processedText.replace(introduceSentenceRegex, '');
        }
        processedText = spaceTrim(processedText);
    }
    if (processedText.length < 3) {
        return trimmedText;
    }
    if (processedText.includes('\n')) {
        return trimmedText;
    }
    // Remove the quotes by extracting the substring without the first and last characters
    var unquotedText = processedText.slice(1, -1);
    // Check if the text starts and ends with quotes
    if ([
        ['"', '"'],
        ["'", "'"],
        ['`', '`'],
        ['*', '*'],
        ['_', '_'],
        ['„', '“'],
        ['«', '»'] /* <- QUOTES to config */,
    ].some(function (_a) {
        var _b = __read(_a, 2), startQuote = _b[0], endQuote = _b[1];
        if (!processedText.startsWith(startQuote)) {
            return false;
        }
        if (!processedText.endsWith(endQuote)) {
            return false;
        }
        if (unquotedText.includes(startQuote) && !unquotedText.includes(endQuote)) {
            return false;
        }
        if (!unquotedText.includes(startQuote) && unquotedText.includes(endQuote)) {
            return false;
        }
        return true;
    })) {
        return unwrapResult(unquotedText, { isTrimmed: false, isIntroduceSentenceRemoved: false });
    }
    else {
        return processedText;
    }
}
/**
 * TODO: [🧠] Should this also unwrap the (parenthesis)
 */

/**
 * Tests if given string is valid URL.
 *
 * Note: This does not check if the file exists only if the path is valid
 * @public exported from `@promptbook/utils`
 */
function isValidFilePath(filePath) {
    if (typeof filePath !== 'string') {
        return false;
    }
    var filePathSlashes = filePath.split('\\').join('/');
    // Absolute Unix path: /hello.txt
    if (/^(\/)/i.test(filePathSlashes)) {
        return true;
    }
    // Absolute Windows path: /hello.txt
    if (/^([A-Z]{1,2}:\/?)\//i.test(filePathSlashes)) {
        return true;
    }
    // Relative path: ./hello.txt
    if (/^(\.\.?\/)+/i.test(filePathSlashes)) {
        return true;
    }
    return false;
}

/**
 * @@@
 *
 * @param javascriptName @@@
 * @returns @@@
 * @public exported from `@promptbook/utils`
 */
function isValidJavascriptName(javascriptName) {
    if (typeof javascriptName !== 'string') {
        return false;
    }
    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/i.test(javascriptName);
}

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
    // <- TODO: !!! Check isValidPromptbookVersion against PROMPTBOOK_VERSIONS
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
    if (!url.endsWith('.ptbk.md')) {
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
 * Checks if value is valid uuid
 *
 * @public exported from `@promptbook/utils`
 */
function isValidUuid(value) {
    if (typeof value !== 'string') {
        return false;
    }
    return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i.test(value);
}

export { $currentDate, $randomSeed, CountUtils, DIACRITIC_VARIANTS_LETTERS, PROMPTBOOK_VERSION, capitalize, countCharacters, countLines, countPages, countParagraphs, countSentences, countWords, decapitalize, deepClone, deepFreezeWithSameType, difference, extractBlock, extractParameterNames, extractParameterNamesFromPromptTemplate, extractVariables, forEachAsync, intersection, isHostnameOnPrivateNetwork, isRunningInBrowser, isRunningInNode, isRunningInWebWorker, isUrlOnPrivateNetwork, isValidFilePath, isValidJavascriptName, isValidJsonString, isValidKeyword, isValidPipelineUrl, isValidPromptbookVersion, isValidSemanticVersion, isValidUrl, isValidUuid, nameToUriPart, nameToUriParts, normalizeToKebabCase, normalizeTo_PascalCase, normalizeTo_SCREAMING_CASE, normalizeTo_camelCase, normalizeTo_snake_case, parseKeywords, parseKeywordsFromString, parseNumber, removeDiacritics, removeEmojis, removeQuotes, renameParameter, renderPromptbookMermaid, replaceParameters, searchKeywords, splitIntoSentences, titleToName, trimCodeBlock, trimEndOfCodeBlock, union, unwrapResult };
//# sourceMappingURL=index.es.js.map
