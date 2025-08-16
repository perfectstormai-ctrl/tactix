# RBAC in TACTIX (App-Managed)
**Auth:** LDAP/AD for identity only.  
**Authorization:** Managed inside TACTIX per operation (RBAC).  
**Default READ:** Users in the operation’s AD group(s) get read by default.  
**IMO managers:** Users in `${operation.code}_IMO` can assign roles/positions in-app.  
**Future:** Fine-grained action permissions (ABAC/classification later).

## Roles (current)
- VIEWER — read-only for an operation.
- EDITOR — create/update incidents & warlog for an operation.
- IMO — can ASSIGN roles/positions (operation-level manager).
- ADMIN — operation admin (superset; can ASSIGN + future admin actions).

## Sources of authority
1) **LDAP groups → default READ**  
   If user is in any AD group matching `<operationCode>_(READ|VIEW|ALL)`, they are a VIEWER by default.
2) **App database → grants/assignments**  
   - `operation_role_grants` (role per user per operation)  
   - `assignments` (optional, for position + alt name)

## Effective permission evaluation (v1)
- Start with AD-derived roles (VIEWER if matched).
- Overlay DB grants (highest wins): ADMIN > IMO > EDITOR > VIEWER.
- Map to actions:
  - READ: VIEWER|EDITOR|IMO|ADMIN
  - WRITE: EDITOR|IMO|ADMIN
  - ASSIGN: IMO|ADMIN
  - ADMIN: ADMIN

## Endpoints (planned)
- `GET /operations/:opId/permissions` — view grants (restricted view for non-ASSIGN).  
- `POST /operations/:opId/permissions` — upsert a user’s role (ASSIGN).  
- `DELETE /operations/:opId/permissions/:grantId` — revoke (ASSIGN).  
- `GET /me/effective-permissions?operationCode=...` — caller’s effective roles.

## Data model (planned tables)
- `operation_role_grants(operation_id, user_upn, role, alt_name, ...)`  
- `assignments(operation_id, user_upn, position_id, alt_display_name, active, ...)`

## UI (Permissions Card — planned)
- Visible to VIEWER+; management controls only for IMO/ADMIN.
- Table of grants + “Add assignment” form.
- i18n keys under `perm.*` and `roles.*` (EN/FR).

## Examples (YAML sketch; not enforced yet)
permissions:
  incident.create: [EDITOR, IMO, ADMIN]
  incident.status.approve: [IMO, ADMIN]
  rbac.assign: [IMO, ADMIN]

## Security notes
- LDAP is for login only; do not mutate LDAP from TACTIX.
- Keep ENGNET separate from ops RBAC.
- Log authorization decisions for audit.
