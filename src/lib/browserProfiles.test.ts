import { describe, expect, it } from 'vitest';
import { ACTIVE_PROFILE_KEY, switchBrowserProfile, assertCurrentProfile } from './browserProfiles';
import { BASELINE_KEY } from './serverProgressClient';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}

describe('separate browser profiles', () => {
  it('claims existing browser work for the owner without changing it', () => {
    const s = storage();
    s.setItem('solutions', '{"a":"owner code"}');
    expect(switchBrowserProfile(s, 'musel', 'musel')).toBe(false);
    expect(s.getItem('solutions')).toBe('{"a":"owner code"}');
    expect(s.getItem(ACTIVE_PROFILE_KEY)).toBe('musel');
  });
  it('does not import legacy owner work into Alessa and preserves both offline copies across switches', () => {
    const s = storage();
    s.setItem('solutions', '{"a":"owner code"}');
    s.setItem('user-checkboxes', '{"a":true}');
    expect(switchBrowserProfile(s, 'alessa', 'musel')).toBe(true);
    expect(s.getItem('solutions')).toBe('{}');
    expect(s.getItem('user-checkboxes')).toBe('{}');
    expect(s.getItem(BASELINE_KEY)).toBeNull();
    s.setItem('solutions', '{"b":"Alessa code"}');
    switchBrowserProfile(s, 'musel', 'musel');
    expect(s.getItem('solutions')).toBe('{"a":"owner code"}');
    expect(s.getItem('user-checkboxes')).toBe('{"a":true}');
    switchBrowserProfile(s, 'alessa', 'musel');
    expect(s.getItem('solutions')).toBe('{"b":"Alessa code"}');
    expect(s.getItem('user-checkboxes')).toBe('{}');
  });
  it('preserves the outgoing profile if its cache cannot be saved', () => {
    const s = storage();
    s.setItem('solutions', '{"a":"unsaved owner work"}');
    const set = s.setItem;
    s.setItem = (key, value) => { if (key.startsWith('cojudge-vps-profile-cache-')) throw new Error('quota'); set(key, value); };
    expect(() => switchBrowserProfile(s, 'alessa', 'musel')).toThrow('quota');
    expect(s.getItem('solutions')).toBe('{"a":"unsaved owner work"}');
    expect(s.getItem(ACTIVE_PROFILE_KEY)).toBeNull();
  });
  it('rejects delayed responses and requests for a profile that is no longer active', () => {
    const s = storage();
    s.setItem(ACTIVE_PROFILE_KEY, 'musel');
    expect(() => assertCurrentProfile(s, 'musel', new Headers({ 'X-CoJudge-Profile': 'alessa' }))).toThrow();
    s.setItem(ACTIVE_PROFILE_KEY, 'alessa');
    expect(() => assertCurrentProfile(s, 'musel', new Headers({ 'X-CoJudge-Profile': 'musel' }))).toThrow();
    expect(() => assertCurrentProfile(s, 'alessa', new Headers({ 'X-CoJudge-Profile': 'alessa' }))).not.toThrow();
  });
});
