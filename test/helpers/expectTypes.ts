import type { Matchers } from 'expect'
export type { Matchers } from 'expect'

export interface Inverse<Matchers> {
  /**
   * Inverse next matcher. If you know how to test something, `.not` lets you test its opposite.
   */
  not: Matchers
}

export interface PromiseMatchers {
  /**
   * Unwraps the reason of a rejected promise so any other matcher can be chained.
   * If the promise is fulfilled the assertion fails.
   */
  rejects: Matchers<Promise<void>> & Inverse<Matchers<Promise<void>>>
  /**
   * Unwraps the value of a fulfilled promise so any other matcher can be chained.
   * If the promise is rejected the assertion fails.
   */
  resolves: Matchers<Promise<void>> & Inverse<Matchers<Promise<void>>>
}

export type ExpectReturnTypes = Matchers<void> & Inverse<Matchers<void>> & PromiseMatchers
