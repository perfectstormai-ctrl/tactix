/**
 * RBAC stub for TACTIX — no external calls here.
 * Wire this into services on Ubuntu when implementing real checks.
 */
export type Role = 'VIEWER'|'EDITOR'|'IMO'|'ADMIN';
export type Action = 'READ'|'WRITE'|'ASSIGN'|'ADMIN';

export interface EffectiveInput {
  upn: string;
  adGroups: string[];
  operationCode: string;
  readSuffixes?: string[]; // defaults: ['READ','VIEW','ALL']
  dbGrantRole?: Role | null; // pass a DB-derived role if known
}

export interface EffectiveResult {
  roles: Role[];          // deduped; may include multiple
  highest: Role;          // ADMIN > IMO > EDITOR > VIEWER
}

const ORDER: Role[] = ['VIEWER','EDITOR','IMO','ADMIN'];
const ACTION_MAP: Record<Action, Role[]> = {
  READ:   ['VIEWER','EDITOR','IMO','ADMIN'],
  WRITE:  ['EDITOR','IMO','ADMIN'],
  ASSIGN: ['IMO','ADMIN'],
  ADMIN:  ['ADMIN']
};

export function computeEffective(input: EffectiveInput): EffectiveResult {
  const readSuffixes = (input.readSuffixes && input.readSuffixes.length)
    ? input.readSuffixes : ['READ','VIEW','ALL'];

  const roles = new Set<Role>();

  // AD-derived VIEWER
  const prefix = `${input.operationCode}_`;
  const hasReadGroup = input.adGroups.some(g => {
    if (!g.startsWith(prefix)) return false;
    const suffix = g.slice(prefix.length);
    return readSuffixes.includes(suffix);
  });
  if (hasReadGroup) roles.add('VIEWER');

  // DB grant overlay (if provided)
  if (input.dbGrantRole) roles.add(input.dbGrantRole);

  // Highest role calculation
  let highest: Role = 'VIEWER';
  for (const r of roles) {
    if (ORDER.indexOf(r) > ORDER.indexOf(highest)) highest = r;
  }
  if (roles.size === 0) highest = 'VIEWER'; // default to VIEWER only if AD grants; otherwise no role—up to caller

  return { roles: [...roles], highest };
}

export function can(roles: Role[] | Set<Role>, action: Action): boolean {
  const have = new Set<Role>(roles as Role[]);
  return ACTION_MAP[action].some(r => have.has(r));
}

// In-memory assignment store; replace with persistent DB logic in services.
const assignments = new Map<string, Role>();

export async function assignRole(
  userUpn: string,
  role: Role,
  operationId: string,
  _byUpn: string,
): Promise<void> {
  const key = `${userUpn.toLowerCase()}::${operationId}`;
  assignments.set(key, role);
}

export async function getAssignedRole(userUpn: string, operationId: string): Promise<Role | null> {
  const key = `${userUpn.toLowerCase()}::${operationId}`;
  return assignments.get(key) ?? null;
}

export function clearAssignments(): void {
  assignments.clear();
}

export async function checkPermission(eff: EffectiveResult, action: Action): Promise<boolean> {
  return can(eff.roles, action);
}
