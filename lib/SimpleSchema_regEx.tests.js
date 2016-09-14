/* eslint-disable func-names, prefer-arrow-callback */

import { SimpleSchema } from './SimpleSchema';
import expect from 'expect';

describe('SimpleSchema', function () {
  it('regEx - issue 409', function () {
    // Make sure no regEx errors for optional
    const schema = new SimpleSchema({
      foo: {
        type: String,
        optional: true,
        regEx: /bar/,
      },
    });

    expect(schema.newContext().validate({})).toEqual(true);
    expect(schema.newContext().validate({ foo: null })).toEqual(true);
    expect(schema.newContext().validate({ foo: '' })).toEqual(false);
  });

  it('Built-In RegEx and Messages', function () {
    const schema = new SimpleSchema({
      email: {
        type: String,
        regEx: SimpleSchema.RegEx.Email,
        optional: true,
      },
      emailWithTLD: {
        type: String,
        regEx: SimpleSchema.RegEx.EmailWithTLD,
        optional: true,
      },
      domain: {
        type: String,
        regEx: SimpleSchema.RegEx.Domain,
        optional: true,
      },
      weakDomain: {
        type: String,
        regEx: SimpleSchema.RegEx.WeakDomain,
        optional: true,
      },
      ip: {
        type: String,
        regEx: SimpleSchema.RegEx.IP,
        optional: true,
      },
      ip4: {
        type: String,
        regEx: SimpleSchema.RegEx.IPv4,
        optional: true,
      },
      ip6: {
        type: String,
        regEx: SimpleSchema.RegEx.IPv6,
        optional: true,
      },
      url: {
        type: String,
        regEx: SimpleSchema.RegEx.Url,
        optional: true,
      },
      id: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true,
      },
    });

    const c1 = schema.newContext();
    c1.validate({
      email: 'foo',
    });
    expect(c1.validationErrors().length).toEqual(1);
    expect(c1.keyErrorMessage('email')).toEqual('Email must be a valid email address');

    c1.validate({
      emailWithTLD: 'foo',
    });
    expect(c1.validationErrors().length).toEqual(1);
    expect(c1.keyErrorMessage('emailWithTLD')).toEqual('Email with tld must be a valid email address');

    c1.validate({
      domain: 'foo',
    });
    expect(c1.validationErrors().length).toEqual(1);
    expect(c1.keyErrorMessage('domain')).toEqual('Domain must be a valid domain');

    c1.validate({
      weakDomain: '///jioh779&%',
    });
    expect(c1.validationErrors().length).toEqual(1);
    expect(c1.keyErrorMessage('weakDomain')).toEqual('Weak domain must be a valid domain');

    c1.validate({
      ip: 'foo',
    });
    expect(c1.validationErrors().length).toEqual(1);
    expect(c1.keyErrorMessage('ip')).toEqual('Ip must be a valid IPv4 or IPv6 address');

    c1.validate({
      ip4: 'foo',
    });
    expect(c1.validationErrors().length).toEqual(1);
    expect(c1.keyErrorMessage('ip4')).toEqual('Ip4 must be a valid IPv4 address');

    c1.validate({
      ip6: 'foo',
    });
    expect(c1.validationErrors().length).toEqual(1);
    expect(c1.keyErrorMessage('ip6')).toEqual('Ip6 must be a valid IPv6 address');

    c1.validate({
      url: 'foo',
    });
    expect(c1.validationErrors().length).toEqual(1);
    expect(c1.keyErrorMessage('url')).toEqual('Url must be a valid URL');

    c1.validate({
      id: '%#$%',
    });
    expect(c1.validationErrors().length).toEqual(1);
    expect(c1.keyErrorMessage('id')).toEqual('ID must be a valid alphanumeric ID');
  });

  it('Optional regEx in subobject', function () {
    const schema = new SimpleSchema({
      foo: {
        type: Object,
        optional: true,
      },
      'foo.url': {
        type: String,
        regEx: SimpleSchema.RegEx.Url,
        optional: true,
      },
    });

    const context = schema.namedContext();

    expect(context.validate({})).toEqual(true);

    expect(context.validate({
      foo: {},
    })).toEqual(true);

    expect(context.validate({
      foo: {
        url: null,
      },
    })).toEqual(true);

    expect(context.validate({
      $set: {
        foo: {},
      },
    }, { modifier: true })).toEqual(true);

    expect(context.validate({
      $set: {
        'foo.url': null,
      },
    }, { modifier: true })).toEqual(true);

    expect(context.validate({
      $unset: {
        'foo.url': '',
      },
    }, { modifier: true })).toEqual(true);
  });

  it('SimpleSchema.RegEx.Email', function () {
    const expr = SimpleSchema.RegEx.Email;

    function isTrue(s) {
      expect(expr.test(s)).toBe(true);
    }

    function isFalse(s) {
      expect(expr.test(s)).toBe(false);
    }

    isTrue('name@web.de');
    isTrue('name+addition@web.de');
    isTrue('st#r~ange.e+mail@web.de');
    isTrue('name@localhost');
    isTrue('name@192.168.200.5');
    isFalse('name@BCDF:45AB:1245:75B9:0987:1562:4567:1234');
    isFalse('name@BCDF:45AB:1245:75B9::0987:1234:1324');
    isFalse('name@BCDF:45AB:1245:75B9:0987:1234:1324');
    isFalse('name@::1');
  });

  it('SimpleSchema.RegEx.EmailWithTLD', function () {
    const expr = SimpleSchema.RegEx.EmailWithTLD;

    function isTrue(s) {
      expect(expr.test(s)).toBe(true);
    }

    function isFalse(s) {
      expect(expr.test(s)).toBe(false);
    }

    isTrue('name@web.de');
    isTrue('name+addition@web.de');
    isTrue('st#r~ange.e+mail@web.de');
    isFalse('name@localhost');
    isFalse('name@192.168.200.5');
    isFalse('name@BCDF:45AB:1245:75B9:0987:1562:4567:1234');
    isFalse('name@BCDF:45AB:1245:75B9::0987:1234:1324');
    isFalse('name@BCDF:45AB:1245:75B9:0987:1234:1324');
    isFalse('name@::1');
  });

  it('SimpleSchema.RegEx.Domain', function () {
    const expr = SimpleSchema.RegEx.Domain;

    function isTrue(s) {
      expect(expr.test(s)).toBe(true);
    }

    function isFalse(s) {
      expect(expr.test(s)).toBe(false);
    }

    isTrue('domain.com');
    isFalse('localhost');
    isFalse('192.168.200.5');
    isFalse('BCDF:45AB:1245:75B9:0987:1562:4567:1234:AB36');
  });

  it('SimpleSchema.RegEx.WeakDomain', function () {
    const expr = SimpleSchema.RegEx.WeakDomain;

    function isTrue(s) {
      expect(expr.test(s)).toBe(true);
    }

    isTrue('domain.com');
    isTrue('localhost');
    isTrue('192.168.200.5');
    isTrue('BCDF:45AB:1245:75B9:0987:1562:4567:1234');
  });

  it('SimpleSchema.RegEx.IP', function () {
    const expr = SimpleSchema.RegEx.IP;

    function isTrue(s) {
      expect(expr.test(s)).toBe(true);
    }

    function isFalse(s) {
      expect(expr.test(s)).toBe(false);
    }

    isFalse('localhost');
    isTrue('192.168.200.5');
    isFalse('320.168.200.5');
    isFalse('192.168.5');
    isTrue('BCDF:45AB:1245:75B9:0987:1562:4567:1234');
    isFalse('BCDF:45AB:1245:75B9:0987:1562:4567:1234:AB36');
    isTrue('BCDF:45AB:1245:75B9::0987:1234:1324');
    isFalse('BCDF:45AB:1245:75B9:0987:1234:1324');
    isTrue('::1');
  });

  it('SimpleSchema.RegEx.IPv4', function () {
    const expr = SimpleSchema.RegEx.IPv4;

    function isTrue(s) {
      expect(expr.test(s)).toBe(true);
    }

    function isFalse(s) {
      expect(expr.test(s)).toBe(false);
    }

    isFalse('localhost');
    isTrue('192.168.200.5');
    isFalse('320.168.200.5');
    isFalse('192.168.5');
    isFalse('BCDF:45AB:1245:75B9:0987:1562:4567:1234');
    isFalse('BCDF:45AB:1245:75B9:0987:1562:4567:1234:AB36');
    isFalse('BCDF:45AB:1245:75B9::0987:1234:1324');
    isFalse('BCDF:45AB:1245:75B9:0987:1234:1324');
    isFalse('::1');
  });

  it('SimpleSchema.RegEx.IPv6', function () {
    const expr = SimpleSchema.RegEx.IPv6;

    function isTrue(s) {
      expect(expr.test(s)).toBe(true);
    }

    function isFalse(s) {
      expect(expr.test(s)).toBe(false);
    }

    isFalse('localhost');
    isFalse('192.168.200.5');
    isFalse('320.168.200.5');
    isFalse('192.168.5');
    isTrue('BCDF:45AB:1245:75B9:0987:1562:4567:1234');
    isFalse('BCDF:45AB:1245:75B9:0987:1562:4567:1234:AB36');
    isTrue('BCDF:45AB:1245:75B9::0987:1234:1324');
    isFalse('BCDF:45AB:1245:75B9:0987:1234:1324');
    isTrue('::1');
  });
});
