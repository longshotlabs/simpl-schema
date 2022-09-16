/* eslint-disable func-names, prefer-arrow-callback */

import expectErrorLength from './helpers/expectErrorLength.js'
import friendsSchema from './helpers/friendsSchema.js'

describe('SimpleSchema - minCount', function () {
  it('ensures array count is at least the minimum', function () {
    expectErrorLength(friendsSchema, {
      friends: [],
      enemies: []
    }).toEqual(1)

    expectErrorLength(friendsSchema, {
      $set: {
        friends: []
      }
    }, { modifier: true }).toEqual(1)

    expectErrorLength(friendsSchema, {
      $setOnInsert: {
        friends: [],
        enemies: []
      }
    }, { modifier: true, upsert: true }).toEqual(1)
  })
})
