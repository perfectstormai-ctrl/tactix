import { test, expect } from 'vitest';
import { computeEffective, can, assignRole, getAssignedRole, clearAssignments } from './index';

test('AD-derived VIEWER via suffix match', () => {
  const eff = computeEffective({
    upn: 'u@example.com',
    adGroups: ['OPX_READ'],
    operationCode: 'OPX',
    dbGrantRole: null
  });
  expect(eff.roles.includes('VIEWER')).toBe(true);
});

test('DB grant overrides to EDITOR', () => {
  const eff = computeEffective({
    upn: 'u@example.com',
    adGroups: [],
    operationCode: 'OPX',
    dbGrantRole: 'EDITOR'
  });
  expect(eff.roles.includes('EDITOR')).toBe(true);
  expect(can(eff.roles, 'WRITE')).toBe(true);
  expect(can(eff.roles, 'ASSIGN')).toBe(false);
});

test('assignRole stores role for user and operation', async () => {
  clearAssignments();
  await assignRole('user@example.com', 'EDITOR', 'OPX123', 'admin@example.com');
  const role = await getAssignedRole('user@example.com', 'OPX123');
  expect(role).toBe('EDITOR');
});
