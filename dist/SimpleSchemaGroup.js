'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mongoObject = require('mongo-object');

var _mongoObject2 = _interopRequireDefault(_mongoObject);

var _extend2 = require('extend');

var _extend3 = _interopRequireDefault(_extend2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SimpleSchemaGroup = function () {
  function SimpleSchemaGroup() {
    _classCallCheck(this, SimpleSchemaGroup);

    for (var _len = arguments.length, definitions = Array(_len), _key = 0; _key < _len; _key++) {
      definitions[_key] = arguments[_key];
    }

    this.definitions = definitions.map(function (definition) {
      if (_mongoObject2.default.isBasicObject(definition)) return definition;

      if (definition instanceof RegExp) {
        return {
          type: String,
          regEx: definition
        };
      }

      return {
        type: definition
      };
    });
  }

  _createClass(SimpleSchemaGroup, [{
    key: 'extend',
    value: function extend(otherGroup) {
      // We extend based on index being the same. No better way I can think of at the moment.
      this.definitions = this.definitions.map(function (def, index) {
        var otherDef = otherGroup.definitions[index];
        if (!otherDef) return def;
        return (0, _extend3.default)(true, {}, def, otherDef);
      });
    }
  }, {
    key: 'singleType',
    get: function get() {
      return this.definitions[0].type;
    }
  }]);

  return SimpleSchemaGroup;
}();

exports.default = SimpleSchemaGroup;