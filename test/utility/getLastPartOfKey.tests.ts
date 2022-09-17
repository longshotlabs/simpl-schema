/* eslint-disable func-names, prefer-arrow-callback */

import { expect } from 'expect'

import { getLastPartOfKey } from '../../src/utility/index.js'

describe('getLastPartOfKey', function () {
  it('returns the correct string for a non-array key', function () {
    expect(getLastPartOfKey('a.b.c', 'a')).toBe('b.c')
  })

  it('returns the correct string for an array key', function () {
    expect(getLastPartOfKey('a.b.$.c', 'a.b')).toBe('c')
  })
})
