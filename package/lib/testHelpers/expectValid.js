import validate from './validate';
import expect from 'expect';

export default function expectValid(...args) {
  expect(validate(...args).isValid()).toBe(true);
}
