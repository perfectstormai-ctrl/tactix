export type Role = 'VIEWER' | 'EDITOR' | 'IMO' | 'ADMIN';
export type Action = 'READ' | 'WRITE' | 'ASSIGN' | 'ADMIN';

export interface RoleGrantRow {
  user_upn: string;
  role: Role;
}

declare const process: any;

const READ_SUFFIXES = (process.env.RBAC_READ_SUFFIXES || 'READ,VIEW,ALL')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function escalate(roles: Set<Role>, role: Role) {
  if (role === 'ADMIN') {
    roles.add('ADMIN');
    roles.add('IMO');
    roles.add('EDITOR');
    roles.add('VIEWER');
  } else if (role === 'IMO') {
    roles.add('IMO');
    roles.add('EDITOR');
    roles.add('VIEWER');
  } else if (role === 'EDITOR') {
    roles.add('EDITOR');
    roles.add('VIEWER');
  } else if (role === 'VIEWER') {
    roles.add('VIEWER');
  }
}

export function effective(
  user: { upn: string; ad_groups: string[] },
  operationCode: string,
  roleGrants: RoleGrantRow[]
): { roles: Set<Role> } {
  const roles: Set<Role> = new Set();
  const groups = user.ad_groups || [];
  const op = operationCode;

  for (const suffix of READ_SUFFIXES) {
    if (groups.includes(`${op}_${suffix}`)) {
      escalate(roles, 'VIEWER');
      break;
    }
  }

  for (const g of roleGrants) {
    if (g.user_upn === user.upn) {
      escalate(roles, g.role);
    }
  }

  return { roles };
}

export function can(roles: Set<Role>, action: Action): boolean {
  switch (action) {
    case 'READ':
      return (
        roles.has('VIEWER') ||
        roles.has('EDITOR') ||
        roles.has('IMO') ||
        roles.has('ADMIN')
      );
    case 'WRITE':
      return roles.has('EDITOR') || roles.has('IMO') || roles.has('ADMIN');
    case 'ASSIGN':
      return roles.has('IMO') || roles.has('ADMIN');
    case 'ADMIN':
      return roles.has('ADMIN');
    default:
      return false;
  }
}
