'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _regExp = require('./regExp');

var _regExp2 = _interopRequireDefault(_regExp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var regExpMessages = [{ exp: _regExp2.default.Email, msg: 'must be a valid email address' }, { exp: _regExp2.default.EmailWithTLD, msg: 'must be a valid email address' }, { exp: _regExp2.default.Domain, msg: 'must be a valid domain' }, { exp: _regExp2.default.WeakDomain, msg: 'must be a valid domain' }, { exp: _regExp2.default.IP, msg: 'must be a valid IPv4 or IPv6 address' }, { exp: _regExp2.default.IPv4, msg: 'must be a valid IPv4 address' }, { exp: _regExp2.default.IPv6, msg: 'must be a valid IPv6 address' }, { exp: _regExp2.default.Url, msg: 'must be a valid URL' }, { exp: _regExp2.default.Id, msg: 'must be a valid alphanumeric ID' }, { exp: _regExp2.default.ZipCode, msg: 'must be a valid ZIP code' }, { exp: _regExp2.default.Phone, msg: 'must be a valid phone number' }];

var defaultMessages = {
  initialLanguage: 'en',
  messages: {
    en: {
      required: '{{{label}}} is required',
      minString: '{{{label}}} must be at least {{min}} characters',
      maxString: '{{{label}}} cannot exceed {{max}} characters',
      minNumber: '{{{label}}} must be at least {{min}}',
      maxNumber: '{{{label}}} cannot exceed {{max}}',
      minNumberExclusive: '{{{label}}} must be greater than {{min}}',
      maxNumberExclusive: '{{{label}}} must be less than {{max}}',
      minDate: '{{{label}}} must be on or after {{min}}',
      maxDate: '{{{label}}} cannot be after {{max}}',
      badDate: '{{{label}}} is not a valid date',
      minCount: 'You must specify at least {{minCount}} values',
      maxCount: 'You cannot specify more than {{maxCount}} values',
      noDecimal: '{{{label}}} must be an integer',
      notAllowed: '{{{value}}} is not an allowed value',
      expectedType: '{{{label}}} must be of type {{dataType}}',
      regEx: function regEx(_ref) {
        var label = _ref.label,
            regExp = _ref.regExp;

        // See if there's one where exp matches this expression
        var msgObj = void 0;
        if (regExp) {
          msgObj = _underscore2.default.find(regExpMessages, function (o) {
            return o.exp && o.exp.toString() === regExp;
          });
        }

        var regExpMessage = msgObj ? msgObj.msg : 'failed regular expression validation';

        return label + ' ' + regExpMessage;
      },

      keyNotInSchema: '{{name}} is not allowed by the schema'
    }
  }
};

exports.default = defaultMessages;