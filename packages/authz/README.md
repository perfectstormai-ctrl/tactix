# @tactix/authz

Shared authorization helpers for TACTIX services.

## Role Mapping

Roles are derived from the `ROLE_MAPPING_JSON` environment variable. Example:

```
{
  ".*_DO$": ["DO"],
  ".*_IMO$": ["IMO"],
  "G3_OPS": ["G3 OPS"],
  "Admins": ["ADMIN"]
}
```

Each key is treated as a regular expression matched against a user's AD groups.
