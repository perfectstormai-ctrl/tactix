export function canEditPlaybooks(roles: string[]): boolean {
  return roles.some((r) => ['IMO', 'DO', 'SDO', 'G3 OPS', 'ADMIN'].includes(r));
}

export function canRunPlaybooks(roles: string[]): boolean {
  return roles.includes('DO');
}
