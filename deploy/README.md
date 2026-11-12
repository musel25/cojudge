# Persistent login for the private VPS

The login helper adds a 30-day cookie to the existing HTTP Basic login. The first
sign-in still uses the browser prompt. Later visits use the cookie, including
visits after the browser or helper restarts. This affects only Cojudge.

The helper needs Node.js and `htpasswd` from `apache2-utils`. The nginx build must
include `http_auth_request_module`. No application rebuild is required.

## Configuration

Install `persistent-login.mjs` as `/opt/cojudge-login/persistent-login.mjs`, owned
by root. Install `cojudge-login.service` in `/etc/systemd/system/`.

Create `/etc/cojudge-login.env` with mode 0600 and owner root:

```text
COJUDGE_LOGIN_PASSWORD_FILE=/etc/nginx/.htpasswd-cojudge
COJUDGE_LOGIN_USERS=musel,alessa
COJUDGE_LOGIN_SECRET=<generate a private random value with openssl rand -hex 32>
COJUDGE_LOGIN_PORT=5380
```

Keep the same secret across restarts. Do not commit this file. The service runs
as `www-data`, which must have read access to the Cojudge password file. The
existing password hashes and passwords do not need to change.

Back up the current nginx site configuration. Enable the helper with
`sudo systemctl enable --now cojudge-login`. Confirm that
`curl --fail http://127.0.0.1:5380/health` returns `ok`. Install
`nginx-cojudge.conf` as the Cojudge site configuration. Run `sudo nginx -t`
before `sudo systemctl reload nginx`. Restore the prior configuration if the
check fails. Keep the application and helper ports bound to loopback.

## Login behavior

The helper accepts a valid signed cookie or checks the supplied Basic password
with `htpasswd`. Passwords enter that process through stdin. At most four
password checks can run at once. Excess checks fail closed. Cookie checks do
not consume these slots.

The cookie has `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/` attributes. Its
`__Host-` prefix prevents sibling domains from supplying a parent-domain cookie.
It contains a username, expiry time and keyed credential version. It contains
no password or password hash. Its signature uses HMAC-SHA256. It expires 30 days
after sign-in. Normal requests do not extend the expiry.

Each check reads the password file. Changing an account's password hash,
removing the account, or removing it from the allowlist cancels its saved login.
Changing the helper secret and restarting the service cancels all saved logins.
Clear this site's cookie to end a saved login in one browser. The browser may
also keep Basic credentials until it closes. Use separate browser profiles or
private windows for different accounts.

nginx overwrites `X-CoJudge-User` with the verified identity. The existing
application still enforces separate learner storage and expected-profile
checks. No learner data is moved or written by this change.

## Verification

Run these commands on a machine with Node.js, `htpasswd`, and nginx installed:

```sh
node --test deploy/persistent-login.test.mjs deploy/persistent-login-nginx.test.mjs
npm test -- --run
```

The helper tests use temporary password files. The nginx test starts an isolated
proxy, helper, and dummy backend on temporary loopback ports. It checks initial
sign-in, cookie propagation, account isolation, forged headers, and request-body
forwarding. It does not access the live application or learner storage.

## Rollback

Restore the prior nginx configuration, run `sudo nginx -t`, then reload nginx.
The original Basic login works again. Stop and disable `cojudge-login` after
the proxy no longer uses it. Keep all application containers and data volumes
in place.

References: [nginx auth subrequests](https://nginx.org/en/docs/http/ngx_http_auth_request_module.html),
[Apache password verification](https://httpd.apache.org/docs/2.4/programs/htpasswd.html),
and [MDN cookie attributes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies).
