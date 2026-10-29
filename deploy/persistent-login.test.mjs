import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { createLoginServer } from './persistent-login.mjs';

let directory, passwordFile, secret, server, base;
const passwordHash = (password) => `{SHA}${createHash('sha1').update(password).digest('base64')}`;
const credentials = (user, password = 'test-password') => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
const cookieHeader = (response) => response.headers.get('set-cookie')?.split(';')[0];

async function start() {
    server = createLoginServer({ passwordFile, secret, users: ['musel', 'alessa'] });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
}

beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'cojudge-login-test-'));
    passwordFile = join(directory, 'htpasswd');
    secret = randomBytes(32).toString('hex');
    // SHA-1 is only a disposable test fixture. Production keeps its existing hashes.
    await writeFile(passwordFile, `musel:${passwordHash('test-password')}\nalessa:${passwordHash('other-password')}\n`, { mode: 0o600 });
    await start();
});

afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
});

test('a successful sign-in persists in a new session after the service restarts', async () => {
    const login = await fetch(`${base}/check`, { headers: { authorization: credentials('musel') } });
    assert.equal(login.status, 204);
    assert.equal(login.headers.get('x-cojudge-user'), 'musel');
    const cookie = login.headers.get('set-cookie');
    assert.match(cookie, /^__Host-cojudge_session=/);
    assert.match(cookie, /Max-Age=2592000/);
    assert.match(cookie, /; Path=\/; Secure; HttpOnly; SameSite=Lax$/);
    assert.ok(!cookie.includes('test-password'));
    await new Promise((resolve) => server.close(resolve));
    await start();
    const restored = await fetch(`${base}/check`, { headers: { cookie: cookieHeader(login) } });
    assert.equal(restored.status, 204);
    assert.equal(restored.headers.get('x-cojudge-user'), 'musel');
    assert.equal(restored.headers.get('set-cookie'), null);
});

test('missing, incorrect, unknown and malformed credentials cannot sign in', async () => {
    for (const authorization of [undefined, credentials('musel', 'wrong'), credentials('outsider'), 'Basic !!!', credentials('musel', 'test-password\nignored')]) {
        const response = await fetch(`${base}/check`, { headers: authorization ? { authorization } : {} });
        assert.equal(response.status, 401);
        assert.equal(response.headers.get('www-authenticate'), 'Basic realm="Private CoJudge"');
        assert.equal(response.headers.get('set-cookie'), null);
        assert.equal(response.headers.get('x-cojudge-user'), null);
    }
});

test('each cookie retains its own profile even with stale Basic credentials', async () => {
    const owner = await fetch(`${base}/check`, { headers: { authorization: credentials('musel') } });
    const other = await fetch(`${base}/check`, { headers: { authorization: credentials('alessa', 'other-password') } });
    for (const [login, user] of [[owner, 'musel'], [other, 'alessa']]) {
        const response = await fetch(`${base}/check`, { headers: { cookie: cookieHeader(login), authorization: credentials('outsider') } });
        assert.equal(response.status, 204);
        assert.equal(response.headers.get('x-cojudge-user'), user);
    }
});

test('forged, expired and malformed cookies cannot supply an identity', async () => {
    const login = await fetch(`${base}/check`, { headers: { authorization: credentials('musel') } });
    assert.equal(login.status, 204);
    const cookie = cookieHeader(login);
    const session = JSON.parse(Buffer.from(cookie.split('=')[1].split('.')[0], 'base64url').toString());
    const expiredPayload = Buffer.from(JSON.stringify({ ...session, expires: 1 })).toString('base64url');
    const signature = createHmac('sha256', secret).update(expiredPayload).digest('base64url');
    for (const cookie of ['__Host-cojudge_session=forged', `__Host-cojudge_session=${expiredPayload}.${signature}`, '__Host-cojudge_session=..', '__Host-cojudge_session=%ZZ']) {
        const response = await fetch(`${base}/check`, { headers: { cookie, 'x-cojudge-user': 'musel' } });
        assert.equal(response.status, 401);
    }
    const response = await fetch(`${base}/check`, { headers: { cookie: cookie.slice(0, -4) + 'AAAA' } });
    assert.equal(response.status, 401);
});

test('removing an allowed user or rotating the secret revokes existing cookies', async () => {
    const login = await fetch(`${base}/check`, { headers: { authorization: credentials('alessa', 'other-password') } });
    assert.equal(login.status, 204);
    await new Promise((resolve) => server.close(resolve));
    server = createLoginServer({ passwordFile, secret, users: ['musel'] });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/check`, { headers: { cookie: cookieHeader(login) } })).status, 401);
    assert.equal((await fetch(`${base}/check`, { headers: { authorization: credentials('alessa', 'other-password') } })).status, 401);
    await new Promise((resolve) => server.close(resolve));
    secret = randomBytes(32).toString('hex');
    await start();
    assert.equal((await fetch(`${base}/check`, { headers: { cookie: cookieHeader(login) } })).status, 401);
});

test('changing a password revokes only that account cookie', async () => {
    const owner = await fetch(`${base}/check`, { headers: { authorization: credentials('musel') } });
    const other = await fetch(`${base}/check`, { headers: { authorization: credentials('alessa', 'other-password') } });
    await writeFile(passwordFile, `musel:${passwordHash('changed-password')}\nalessa:${passwordHash('other-password')}\n`);
    assert.equal((await fetch(`${base}/check`, { headers: { cookie: cookieHeader(owner) } })).status, 401);
    const response = await fetch(`${base}/check`, { headers: { cookie: cookieHeader(other) } });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('x-cojudge-user'), 'alessa');
});

test('removed accounts and unavailable password storage fail closed', async () => {
    const login = await fetch(`${base}/check`, { headers: { authorization: credentials('musel') } });
    await writeFile(passwordFile, '');
    assert.equal((await fetch(`${base}/check`, { headers: { cookie: cookieHeader(login) } })).status, 401);
    await rm(passwordFile);
    const response = await fetch(`${base}/check`, { headers: { cookie: cookieHeader(login) } });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('x-cojudge-user'), null);
});

test('a burst of password attempts is bounded while saved sessions still work', async () => {
    const record = await new Promise((resolve, reject) => {
        const child = execFile('htpasswd', ['-niBC', '10', 'musel'], (error, stdout) => error ? reject(error) : resolve(stdout));
        child.stdin.end('test-password\n');
    });
    await writeFile(passwordFile, record);
    const login = await fetch(`${base}/check`, { headers: { authorization: credentials('musel') } });
    assert.equal(login.status, 204);
    const attempts = Array.from({ length: 20 }, () => fetch(`${base}/check`, { headers: { authorization: credentials('musel', 'wrong') } }));
    const restored = await fetch(`${base}/check`, { headers: { cookie: cookieHeader(login) } });
    assert.equal(restored.status, 204);
    const statuses = (await Promise.all(attempts)).map((response) => response.status);
    assert.ok(statuses.includes(503), 'Excess checks must be rejected');
    assert.ok(statuses.includes(401), 'Active checks must finish and reject wrong passwords');
    assert.ok(statuses.every((status) => status === 401 || status === 503));
});
