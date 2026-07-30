# Nextcloud CORS for SiloCityLabs Recorder

Cross-origin WebDAV from this PWA is blocked by browsers unless **your** Nextcloud
(or the reverse proxy in front of it) sends CORS headers that allow the PWA
origin.

This project does **not** ship a Cloudflare Worker/Function as a public Nextcloud
proxy (open-relay and billing risk). Enable CORS on the server you control.

| Client | Origin to allow |
|---|---|
| Production PWA | `https://recording.silocitylabs.com` |
| Local preview (`python3 -m http.server 8080`) | `http://localhost:8080`, `http://127.0.0.1:8080` |

Recorder uses WebDAV only:

- `MKCOL` — ensure folder
- `PUT` — upload recording (+ optional JSON sidecar)
- `DELETE` — remove remote file
- `Authorization: Basic …` (Nextcloud app password)
- `Content-Type` on uploads

Path used: `/remote.php/dav/files/<user>/<folder>/…`

## Table of contents

1. [What you need](#what-you-need)
2. [Nginx Proxy Manager (tested pattern for TrueNAS)](#nginx-proxy-manager-tested-pattern-for-truenas)
3. [Base nginx (TLS terminate → Nextcloud HTTP)](#base-nginx-tls-terminate--nextcloud-http)
4. [Verify](#verify)
5. [Security notes](#security-notes)
6. [Untested examples](#untested-examples)
   - [Apache (`mod_headers` / reverse proxy)](#apache-mod_headers--reverse-proxy)
   - [Caddy](#caddy)
   - [Traefik (labels)](#traefik-labels)
   - [HAProxy](#haproxy)
7. [Out of scope](#out-of-scope)

---

## What you need

- Nextcloud reachable over **HTTPS** from the browser (TLS on nginx / NPM / etc.).
- Nextcloud itself may stay **HTTP-only** on a Docker / LAN upstream.
- CORS headers on **responses for** `/remote.php/dav/` (including **401/403** — use
  `always` / equivalent so auth failures are not masked as CORS errors).
- An **OPTIONS** preflight response before `PUT` / `MKCOL` / `DELETE`.
- An allowlisted `Access-Control-Allow-Origin` (never `*` with `Authorization`).

---

## Nginx Proxy Manager (tested pattern for TrueNAS)

Typical layout: NPM terminates TLS → Nextcloud Docker on HTTP (e.g. `10.x.x.x:port`).

NPM’s UI cannot define an `http`-level `map {}`. Put origin allowlisting in the
**Custom Locations** snippet with `set` / `if`.

### Custom Locations tab

| Field | Value |
|---|---|
| Define location | `/remote.php/dav/` |
| Scheme | `http` |
| Forward Hostname / IP | your Nextcloud host / container IP |
| Forward Port | your Nextcloud port |

**Custom Nginx Configuration** (paste into the textarea):

```nginx
# Allowlist PWA origins (no map{} — NPM UI can't define those)
set $recorder_cors_origin "";
if ($http_origin = "https://recording.silocitylabs.com") {
    set $recorder_cors_origin $http_origin;
}
if ($http_origin = "http://localhost:8080") {
    set $recorder_cors_origin $http_origin;
}
if ($http_origin = "http://127.0.0.1:8080") {
    set $recorder_cors_origin $http_origin;
}

if ($request_method = OPTIONS) {
    add_header Access-Control-Allow-Origin  $recorder_cors_origin always;
    add_header Access-Control-Allow-Methods "PUT, DELETE, MKCOL, PROPFIND, HEAD, GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, Depth, Destination, Overwrite" always;
    add_header Access-Control-Max-Age       86400 always;
    add_header Vary                         Origin always;
    add_header Content-Length               0 always;
    return 204;
}

add_header Access-Control-Allow-Origin   $recorder_cors_origin always;
add_header Access-Control-Expose-Headers "ETag, Oc-Fileid" always;
add_header Vary                          Origin always;
```

Do **not** add `proxy_pass` here — NPM already forwards from Scheme / Host / Port.

### Optional: production-only (simpler)

```nginx
if ($request_method = OPTIONS) {
    add_header Access-Control-Allow-Origin  "https://recording.silocitylabs.com" always;
    add_header Access-Control-Allow-Methods "PUT, DELETE, MKCOL, PROPFIND, HEAD, GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, Depth, Destination, Overwrite" always;
    add_header Access-Control-Max-Age       86400 always;
    add_header Vary                         Origin always;
    add_header Content-Length               0 always;
    return 204;
}

add_header Access-Control-Allow-Origin   "https://recording.silocitylabs.com" always;
add_header Access-Control-Expose-Headers "ETag, Oc-Fileid" always;
add_header Vary                          Origin always;
```

### Advanced tab

Leave empty for CORS unless you already use it for upload size / buffering.
Do **not** put a `map { }` block in Advanced — wrong nginx context.

Keep large-upload settings on the main proxy host if you need them, for example:

```nginx
client_max_body_size 10G;
proxy_request_buffering off;
proxy_buffering off;
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

Save the proxy host and [verify](#verify).

---

## Base nginx (TLS terminate → Nextcloud HTTP)

Use this when you edit nginx config files directly (TrueNAS custom nginx, VM,
bare metal). Prefer a `map` for origins.

### 1. Map allowed origins (`http` context)

```nginx
map $http_origin $recorder_cors_origin {
    default                                 "";
    "https://recording.silocitylabs.com"    $http_origin;
    "http://localhost:8080"                 $http_origin;
    "http://127.0.0.1:8080"                 $http_origin;
}
```

### 2. WebDAV location (inside your Nextcloud `server { }`)

Merge with your existing proxy / body-size settings:

```nginx
# --- Large uploads/downloads (adjust as needed) ---
proxy_request_buffering off;
proxy_buffering off;
proxy_max_temp_file_size 0;

proxy_connect_timeout 60s;
proxy_send_timeout 3600s;
proxy_read_timeout 3600s;
send_timeout 3600s;

proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

client_max_body_size 10G;

location ^~ /remote.php/dav/ {
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin  $recorder_cors_origin always;
        add_header Access-Control-Allow-Methods "PUT, DELETE, MKCOL, PROPFIND, HEAD, GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Depth, Destination, Overwrite" always;
        add_header Access-Control-Max-Age       86400 always;
        add_header Vary                         Origin always;
        add_header Content-Length               0 always;
        return 204;
    }

    # Replace with your Nextcloud upstream (Docker DNS, host port, etc.)
    proxy_pass http://127.0.0.1:8080;

    add_header Access-Control-Allow-Origin   $recorder_cors_origin always;
    add_header Access-Control-Expose-Headers "ETag, Oc-Fileid" always;
    add_header Vary                          Origin always;
}
```

Reload:

```bash
nginx -t && nginx -s reload
```

---

## Verify

Replace host / user:

```bash
curl -si -X OPTIONS "https://cloud.example.com/remote.php/dav/files/USER/Recorder" \
  -H "Origin: https://recording.silocitylabs.com" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: authorization, content-type"
```

Expect:

- `204` (or `200`)
- `Access-Control-Allow-Origin: https://recording.silocitylabs.com`
- Allow-Methods includes `PUT`, `MKCOL`, `DELETE`
- Allow-Headers includes `Authorization` and `Content-Type`

```bash
# Auth probe: 401 without creds is fine — ACAO must still be present
curl -si -X MKCOL "https://cloud.example.com/remote.php/dav/files/USER/Recorder" \
  -H "Origin: https://recording.silocitylabs.com"
```

In the PWA: Settings → Nextcloud → fill URL / user / app password → **Test**.
DevTools → Network should show `OPTIONS` then `MKCOL`/`PUT` with CORS allow headers.

---

## Security notes

- Allowlist **exact** PWA origins — never `Access-Control-Allow-Origin: *` with Basic auth.
- CORS does not replace authentication; use a Nextcloud **app password**.
- Allowing `https://recording.silocitylabs.com` means that site’s JS may call your
  DAV API **with credentials the user entered in the PWA**. Do not broaden the
  origin list to arbitrary sites.
- Prefer firewall / fail2ban / Nextcloud brute-force protections as for any public cloud.

---

## Untested examples

These are starting points only — not verified against this PWA. Prefer the npm /
base nginx sections above when possible.

### Apache (`mod_headers` / reverse proxy)

Enable `headers` (and `proxy` / `proxy_http` if reverse-proxying). Inside the
vhost that serves Nextcloud (or proxies to it):

```apache
<Location "/remote.php/dav/">
  SetEnvIf Origin "^https://recording\.silocitylabs\.com$" CORS_ORIGIN=$0
  SetEnvIf Origin "^http://localhost:8080$" CORS_ORIGIN=$0
  SetEnvIf Origin "^http://127\.0\.0\.1:8080$" CORS_ORIGIN=$0

  Header always set Access-Control-Allow-Origin "%{CORS_ORIGIN}e" env=CORS_ORIGIN
  Header always set Access-Control-Allow-Methods "PUT, DELETE, MKCOL, PROPFIND, HEAD, GET, OPTIONS"
  Header always set Access-Control-Allow-Headers "Authorization, Content-Type, Depth, Destination, Overwrite"
  Header always set Access-Control-Max-Age "86400"
  Header always set Vary "Origin"

  RewriteEngine On
  RewriteCond %{REQUEST_METHOD} OPTIONS
  RewriteCond %{ENV:CORS_ORIGIN} !^$
  RewriteRule ^ - [R=204,L]
</Location>
```

If Apache sits in front of Docker Nextcloud, keep your existing `ProxyPass` /
`ProxyPassReverse` for `/` and ensure this `Location` still applies (order and
`ProxyPass` exclusions can vary by distro).

### Caddy

Untested sketch (`Caddyfile`):

```caddy
cloud.example.com {
  @dav path /remote.php/dav/*
  @recorder origin https://recording.silocitylabs.com http://localhost:8080 http://127.0.0.1:8080

  handle @dav {
    header @recorder {
      Access-Control-Allow-Origin "{http.request.header.Origin}"
      Access-Control-Allow-Methods "PUT, DELETE, MKCOL, PROPFIND, HEAD, GET, OPTIONS"
      Access-Control-Allow-Headers "Authorization, Content-Type, Depth, Destination, Overwrite"
      Access-Control-Max-Age "86400"
      Vary Origin
      defer
    }
    @options method OPTIONS
    handle @options {
      respond 204
    }
    reverse_proxy nextcloud:80
  }

  handle {
    reverse_proxy nextcloud:80
  }
}
```

Caddy’s `header` / `origin` matchers differ by version — check docs if `defer`
or multi-value `origin` matchers fail.

### Traefik (labels)

Untested Docker label approach (Traefik v2/v3 middleware). Scope carefully so
you do not open CORS on the entire Nextcloud UI if you do not want that:

```yaml
labels:
  - traefik.http.middlewares.recorder-cors.headers.accesscontrolallowmethods=PUT,DELETE,MKCOL,PROPFIND,HEAD,GET,OPTIONS
  - traefik.http.middlewares.recorder-cors.headers.accesscontrolallowheaders=Authorization,Content-Type,Depth,Destination,Overwrite
  - traefik.http.middlewares.recorder-cors.headers.accesscontrolalloworiginlist=https://recording.silocitylabs.com,http://localhost:8080,http://127.0.0.1:8080
  - traefik.http.middlewares.recorder-cors.headers.accesscontrolmaxage=86400
  - traefik.http.middlewares.recorder-cors.headers.addvaryheader=true
  # Attach middleware only to a router whose rule matches PathPrefix(`/remote.php/dav`)
```

Ensure OPTIONS is answered (Traefik CORS middleware usually handles preflight).
Confirm error responses still include ACAO.

### HAProxy

Untested sketch — prefer answering OPTIONS in HAProxy and adding ACAO on DAV
paths. Exact `http-response` syntax varies by HAProxy version:

```
acl is_dav path_beg /remote.php/dav/
acl is_options method OPTIONS
acl recorder_origin hdr(Origin) -i https://recording.silocitylabs.com http://localhost:8080 http://127.0.0.1:8080

http-request return status 204 hdr Access-Control-Allow-Origin %[req.hdr(Origin)] hdr Access-Control-Allow-Methods "PUT, DELETE, MKCOL, PROPFIND, HEAD, GET, OPTIONS" hdr Access-Control-Allow-Headers "Authorization, Content-Type, Depth, Destination, Overwrite" if is_dav is_options recorder_origin

http-response set-header Access-Control-Allow-Origin %[req.hdr(Origin)] if is_dav recorder_origin
http-response set-header Vary Origin if is_dav recorder_origin
```

Wire `req.hdr(Origin)` capture carefully so empty Origin does not emit a bad ACAO.

---

## Out of scope

- Cloudflare Workers/Functions as a public CORS proxy for arbitrary Nextcloud hosts.
- Proxying optional Vosk / transcription model downloads (use CORS-enabled CDNs).
- Changing Nextcloud PHP apps solely for CORS when a reverse proxy can do it.
