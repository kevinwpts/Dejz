// api/_http.ts – läser JSON-kroppen och gör fel till text.
import { describe, expect, it } from 'vitest';
import { errorMessage, readJsonBody } from '../../api/_http';

describe('readJsonBody', () => {
  it('ger tom kropp när det inte finns någon', () => {
    expect(readJsonBody({})).toEqual({});
    expect(readJsonBody({ body: '' })).toEqual({});
    expect(readJsonBody({ body: null })).toEqual({});
  });

  it('tar en redan tolkad kropp som den är', () => {
    const body = { userId: 'u1' };
    expect(readJsonBody<{ userId: string }>({ body })).toBe(body);
  });

  it('tolkar JSON som kommer som text', () => {
    expect(readJsonBody({ body: '{"a":1,"b":[2]}' })).toEqual({ a: 1, b: [2] });
  });

  it('ger tom kropp vid trasig JSON i stället för att krascha', () => {
    expect(readJsonBody({ body: '{not json' })).toEqual({});
  });

  it.each(['"text"', '42', 'null', 'true'])('ger tom kropp när JSON-texten inte är ett objekt (%s)', (raw) => {
    expect(readJsonBody({ body: raw })).toEqual({});
  });

  it('ger tom kropp för tal och sanningsvärden', () => {
    expect(readJsonBody({ body: 42 })).toEqual({});
    expect(readJsonBody({ body: true })).toEqual({});
  });

  it('släpper igenom listor (de är objekt) – anroparen måste själv kontrollera fälten', () => {
    expect(readJsonBody({ body: '[1,2]' })).toEqual([1, 2]);
  });
});

describe('errorMessage', () => {
  it('tar meddelandet från ett Error', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('gör om allt annat till text', () => {
    expect(errorMessage('plain')).toBe('plain');
    expect(errorMessage(404)).toBe('404');
    expect(errorMessage(undefined)).toBe('undefined');
    expect(errorMessage({ message: 'not an Error' })).toBe('[object Object]');
  });
});
