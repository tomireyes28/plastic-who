import { escapeContactHtml, parseContact } from './contact';

const valid = { name: 'Sofía', email: 'sofia@example.com', reason: 'Sugerir una tienda', message: 'Hola\nUna sugerencia.' };
describe('Contact validation and HTML safety (H13)', () => {
  it('accepts bounded text, trims fields and preserves message line breaks', () => {
    expect(parseContact({ ...valid, name: ' Sofía ' })).toEqual(valid);
  });
  it.each([null, [], {}, { ...valid, name: {} }, { ...valid, email: ['x'] },
    { ...valid, message: false }, { ...valid, name: ' ' }, { ...valid, email: 'x' },
    { ...valid, email: 'x@example.com\r\nBcc: otro@example.com' },
    { ...valid, name: 'Sofía\r\nCc: x' }, { ...valid, reason: '<script>' },
    { ...valid, name: 'a'.repeat(101) }, { ...valid, message: 'a'.repeat(4001) },
  ])('rejects malformed input without coercion: %p', body => expect(parseContact(body)).toBeNull());
  it('escapes markup and attribute delimiters as text', () => {
    expect(escapeContactHtml('<img src="x" onerror=\'alert(1)\'>&')).toBe('&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;');
  });
});
