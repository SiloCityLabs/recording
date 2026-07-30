# Security Policy

## Supported versions

Only the latest deployment at https://recording.silocitylabs.com is supported.

## Reporting a vulnerability

Please open a private security advisory on this repository, or email the SiloCityLabs maintainers. Do not open a public issue for security reports.

## Notes

- Microphone and speech recognition stay on-device / in the browser.
- Nextcloud credentials (app passwords) are stored only in the user’s browser `localStorage`.
- Nextcloud sync requires the user to enable CORS on their own server ([CORS.md](CORS.md)); this project does not proxy arbitrary Nextcloud hosts.
- Do not commit secrets, app passwords, or private recordings into this repository.
