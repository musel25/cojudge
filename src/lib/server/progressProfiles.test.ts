import { describe, expect, it } from 'vitest';
import { resolveProgressProfile, authorizeProfileRequest } from './progressProfiles';

const config = { directory: '/data/progress', owner: 'musel', users: 'musel,alessa' };
function headers(user: string, expected = user) {
  return new Headers({ 'X-CoJudge-User': user, 'X-CoJudge-Profile': expected });
}

describe('authenticated learner profiles', () => {
  it('preserves owner storage and gives Alessa a separate directory', () => {
    expect(resolveProgressProfile(headers('musel'), config)).toEqual({ id: 'musel', name: 'Müsel', directory: '/data/progress' });
    expect(resolveProgressProfile(headers('alessa'), config)).toEqual({ id: 'alessa', name: 'Alessa', directory: '/data/progress/profiles/alessa' });
  });
  it('rejects missing, unknown and path-like identities', () => {
    for (const user of ['', 'someone', '../musel', 'alessa/../../musel', 'alessa,musel']) {
      expect(() => resolveProgressProfile(headers(user), config)).toThrow();
    }
  });
  it('rejects a stale browser profile even when the new login is valid', () => {
    expect(() => authorizeProfileRequest(headers('alessa', 'musel'), config)).toThrow('Profile changed');
    expect(() => authorizeProfileRequest(new Headers({ 'X-CoJudge-User': 'musel' }), config)).toThrow('Profile changed');
    expect(authorizeProfileRequest(headers('alessa'), config).id).toBe('alessa');
  });
});
