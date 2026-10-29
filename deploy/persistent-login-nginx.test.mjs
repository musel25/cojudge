import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLoginServer } from './persistent-login.mjs';

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const close = (server) => new Promise((resolve) => server.close(resolve));
const auth = (user, password) => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

test('nginx remembers both profiles and overwrites forged identity headers', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cojudge-nginx-test-'));
    const passwordFile = join(directory, 'htpasswd');
    const hash = (value) => `{SHA}${createHash('sha1').update(value).digest('base64')}`;
    await writeFile(passwordFile, `musel:${hash('owner-test')}\nalessa:${hash('learner-test')}\n`, { mode: 0o600 });
    const login = createLoginServer({ passwordFile, secret: randomBytes(32).toString('hex'), users: ['musel', 'alessa'] });
    const backend = createServer((request, response) => {
        let body = '';
        request.on('data', (data) => { body += data; });
        request.on('end', () => {
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ user: request.headers['x-cojudge-user'], authorization: request.headers.authorization ?? null, body }));
        });
    });
    const reservation = createServer();
    let nginx;
    try {
        await listen(login);
        await listen(backend);
        await listen(reservation);
        const port = reservation.address().port;
        await close(reservation);
        const template = await readFile(new URL('./nginx-cojudge.conf', import.meta.url), 'utf8');
        const server = template.slice(template.indexOf('\nserver {'))
            .replace('listen 443 ssl http2;', `listen 127.0.0.1:${port};`)
            .replace(/^.*listen \[::\]:443.*\n/gm, '')
            .replace(/^.*ssl_certificate.*\n/gm, '')
            .replace('127.0.0.1:5380', `127.0.0.1:${login.address().port}`)
            .replace('127.0.0.1:5379', `127.0.0.1:${backend.address().port}`);
        const config = join(directory, 'nginx.conf');
        await writeFile(config, `pid ${directory}/nginx.pid;\nerror_log stderr;\nevents {}\nhttp { access_log off; client_body_temp_path ${directory}/body; proxy_temp_path ${directory}/proxy; ${server}\n}`);
        let errors = '';
        nginx = spawn('/usr/sbin/nginx', ['-p', directory, '-c', config, '-e', 'stderr', '-g', 'daemon off;'], { stdio: ['ignore', 'ignore', 'pipe'] });
        nginx.stderr.on('data', (data) => { errors += data; });
        const base = `http://127.0.0.1:${port}`;
        let ready = false;
        for (let attempt = 0; attempt < 40; attempt++) {
            try { await fetch(base); ready = true; break; } catch { await new Promise((resolve) => setTimeout(resolve, 50)); }
        }
        assert.ok(ready, errors);
        assert.equal((await fetch(base)).status, 401);
        assert.equal((await fetch(`${base}/_cojudge_login_check`)).status, 404);
        for (const [user, password, forged] of [['musel', 'owner-test', 'alessa'], ['alessa', 'learner-test', 'musel']]) {
            const first = await fetch(base, { headers: { authorization: auth(user, password), 'x-cojudge-user': forged } });
            assert.equal(first.status, 200);
            assert.equal((await first.json()).user, user);
            const cookie = first.headers.get('set-cookie');
            assert.match(cookie, /Max-Age=2592000/);
            assert.equal(first.headers.get('strict-transport-security'), 'max-age=31536000');
            const restored = await fetch(base, {
                method: 'POST', body: '{"check":"body intact"}',
                headers: { cookie: cookie.split(';')[0], 'x-cojudge-user': forged }
            });
            assert.equal(restored.status, 200);
            assert.deepEqual(await restored.json(), { user, authorization: null, body: '{"check":"body intact"}' });
        }
        const forged = await fetch(base, { headers: { cookie: '__Host-cojudge_session=forged', 'x-cojudge-user': 'musel' } });
        assert.equal(forged.status, 401);
        assert.equal(forged.headers.get('www-authenticate'), 'Basic realm="Private CoJudge"');
        assert.equal((await fetch(base, { headers: { authorization: auth('musel', 'wrong') } })).status, 401);
    } finally {
        if (nginx && nginx.exitCode === null) {
            nginx.kill('SIGQUIT');
            await once(nginx, 'exit');
        }
        if (login.listening) await close(login);
        if (backend.listening) await close(backend);
        if (reservation.listening) await close(reservation);
        await rm(directory, { recursive: true, force: true });
    }
});
