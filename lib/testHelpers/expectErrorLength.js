import validate from './validate';
import expect from 'expect';

export default function expectErrorLength(...args) {
  return expect(validate(...args).validationErrors().length);
}
