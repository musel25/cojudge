import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const COOKIE = '__Host-cojudge_session';
const LIFETIME = 30 * 24 * 60 * 60;
const USERNAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

function verifyPassword(passwordFile, user, password) {
    return new Promise((resolve, reject) => {
        // Use stdin so the password is never visible in process arguments.
        const child = execFile('htpasswd', ['-vi', passwordFile, user], {
            timeout: 5000, maxBuffer: 4096
        }, (error) => {
            if (!error) resolve(true);
            else if (error.code === 3) resolve(false);
            else reject(new Error('Password verification unavailable'));
        });
        child.stdin.on('error', () => {}); // execFile reports process failures.
        child.stdin.end(`${password}\n`);
    });
}

export function createLoginServer({ passwordFile, secret, users }) {
    if (!passwordFile || typeof secret !== 'string' || !/^[a-f0-9]{64,}$/i.test(secret)
        || !Array.isArray(users) || !users.length || users.some((user) => !USERNAME.test(user))) {
        throw new Error('A password file, random secret and explicit user allowlist are required');
    }
    const allowedUsers = new Set(users);
    let activePasswordChecks = 0;
    const sign = (value) => createHmac('sha256', secret).update(value).digest('base64url');
    const credentialVersion = (user, hash) => sign(`credential:${user}:${hash}`);

    async function checkPassword(user, password) {
        if (activePasswordChecks >= 4) throw new Error('Password checks busy');
        activePasswordChecks++;
        try {
            return await verifyPassword(passwordFile, user, password);
        } finally {
            activePasswordChecks--;
        }
    }

    function readSession(header, passwords) {
        const cookies = (header || '').split(';').map((value) => value.trim())
            .filter((value) => value.startsWith(`${COOKIE}=`));
        if (cookies.length !== 1) return;
        const token = cookies[0].slice(COOKIE.length + 1);
        if (token.length > 2048) return;
        const [payload, signature, extra] = token.split('.');
        if (!payload || !signature || extra !== undefined) return;
        const expected = Buffer.from(sign(payload));
        const supplied = Buffer.from(signature);
        if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return;
        try {
            const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
            const now = Math.floor(Date.now() / 1000);
            const hash = passwords.get(session.user);
            if (allowedUsers.has(session.user) && hash
                && Number.isSafeInteger(session.expires) && session.expires > now
                && session.expires <= now + LIFETIME
                && session.credential === credentialVersion(session.user, hash)) return session.user;
        } catch { /* Malformed cookies do not authenticate. */ }
    }

    return createServer(async (request, response) => {
        response.setHeader('Cache-Control', 'no-store');
        if (request.url === '/health') {
            response.writeHead(200);
            response.end('ok');
            return;
        }
        if (request.url !== '/check') {
            response.writeHead(404);
            response.end();
            return;
        }
        try {
            // Read on every check so password changes and account removal revoke cookies.
            const passwords = new Map((await readFile(passwordFile, 'utf8')).split('\n')
                .filter((line) => line && !line.startsWith('#'))
                .map((line) => {
                    const colon = line.indexOf(':');
                    return [line.slice(0, colon), line.slice(colon + 1).trim()];
                }));
            let user = readSession(request.headers.cookie, passwords);
            if (!user) {
                const authorization = request.headers.authorization || '';
                const encoded = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization)?.[1];
                const decoded = encoded && Buffer.from(encoded, 'base64').toString('utf8');
                const colon = decoded?.indexOf(':') ?? -1;
                const name = colon > 0 ? decoded.slice(0, colon) : '';
                const password = colon > 0 ? decoded.slice(colon + 1) : '';
                if (allowedUsers.has(name) && passwords.has(name) && password.length > 0
                    && password.length <= 1024 && !/[\r\n\0]/.test(password)
                    && await checkPassword(name, password)) {
                    user = name;
                    const payload = Buffer.from(JSON.stringify({
                        user, expires: Math.floor(Date.now() / 1000) + LIFETIME,
                        credential: credentialVersion(user, passwords.get(user))
                    })).toString('base64url');
                    response.setHeader('Set-Cookie', `${COOKIE}=${payload}.${sign(payload)}; Max-Age=${LIFETIME}; Path=/; Secure; HttpOnly; SameSite=Lax`);
                }
            }
            if (user) {
                response.writeHead(204, { 'X-CoJudge-User': user });
            } else {
                response.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Private CoJudge"' });
            }
        } catch {
            // Never include credentials, tokens or password-file contents in logs.
            console.error('Cojudge login check failed');
            response.writeHead(503);
        }
        response.end();
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const server = createLoginServer({
        passwordFile: process.env.COJUDGE_LOGIN_PASSWORD_FILE,
        secret: process.env.COJUDGE_LOGIN_SECRET,
        users: process.env.COJUDGE_LOGIN_USERS?.split(',')
    });
    const port = Number(process.env.COJUDGE_LOGIN_PORT || 5380);
    server.listen(port, '127.0.0.1', () => console.log(`Cojudge login listening on loopback port ${port}`));
    process.on('SIGTERM', () => server.close());
}
