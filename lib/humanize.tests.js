import humanize from './humanize';
import expect from 'expect';

describe('humanize', function () {
  it('works', function () {
    expect(humanize('super_snake_case')).toEqual('Super snake case');
    expect(humanize('capitalizedCamelCase')).toEqual('Capitalized camel case');
    expect(humanize('hyphen-case')).toEqual('Hyphen case');
    expect(humanize('no-extensions-here.md')).toEqual('No extensions here');
    expect(humanize('lower cased phrase')).toEqual('Lower cased phrase');
    expect(humanize('  so many  spaces  ')).toEqual('So many spaces');
    expect(humanize(123)).toEqual('123');
    expect(humanize('')).toEqual('');
    expect(humanize(null)).toEqual('');
    expect(humanize(undefined)).toEqual('');
    expect(humanize('externalSource')).toEqual('External source');
    expect(humanize('externalSourceId')).toEqual('External source ID');
    expect(humanize('externalSource_id')).toEqual('External source ID');
    expect(humanize('_id')).toEqual('ID');
    // Make sure it does not mess with "id" in the middle of a word
    expect(humanize('overridden')).toEqual('Overridden');
  });
});
