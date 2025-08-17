# First-Run Wizard

The UI exposes a `/first-run` route that guides initial configuration when `tactix.config.json` is missing or does not define a mode.

## Steps
1. **Welcome** – intro screen.
2. **System Check** – calls `GET /bootstrap/probe`.
3. **Choose Role** – Single, Server, or Client.
4. **LDAP Configuration** (optional) – test with `POST /auth/ldap/test`.
5. **Local Admin** (shown if LDAP skipped) – create account via `POST /auth/local/init-admin`.
6. **Review & Apply** – submit to `POST /bootstrap/config` and reload.

The chosen mode is displayed in the header badge after completion.


