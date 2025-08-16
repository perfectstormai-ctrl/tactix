export type Role = 'READ' | 'ASSIGN' | 'WRITE' | 'APPROVE';

export interface AssignmentRow {
  user_upn: string;
  active: boolean;
}

export interface RoleGrantRow {
  user_upn: string;
  role: Role;
}

declare const process: any;

const READ_SUFFIXES = (process.env.RBAC_READ_SUFFIXES || 'READ,VIEW,ALL')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const IMO_SUFFIX = process.env.RBAC_IMO_SUFFIX || 'IMO';

export function effective(
  user: { upn: string; ad_groups: string[] },
  operationCode: string,
  assignments: AssignmentRow[],
  roleGrants: RoleGrantRow[]
): { roles: Set<Role> } {
  const roles: Set<Role> = new Set();
  const groups = user.ad_groups || [];
  const op = operationCode;

  for (const suffix of READ_SUFFIXES) {
    if (groups.includes(`${op}_${suffix}`)) {
      roles.add('READ');
      break;
    }
  }

  if (groups.includes(`${op}_${IMO_SUFFIX}`)) {
    roles.add('READ');
    roles.add('ASSIGN');
  }

  if (assignments.some((a) => a.user_upn === user.upn && a.active)) {
    roles.add('READ');
  }

  for (const g of roleGrants) {
    if (g.user_upn === user.upn) {
      roles.add(g.role);
    }
  }

  return { roles };
}

