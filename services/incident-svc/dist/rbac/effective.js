"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.effective = effective;
exports.can = can;
const READ_SUFFIXES = (process.env.RBAC_READ_SUFFIXES || 'READ,VIEW,ALL')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
function escalate(roles, role) {
    if (role === 'ADMIN') {
        roles.add('ADMIN');
        roles.add('IMO');
        roles.add('EDITOR');
        roles.add('VIEWER');
    }
    else if (role === 'IMO') {
        roles.add('IMO');
        roles.add('EDITOR');
        roles.add('VIEWER');
    }
    else if (role === 'EDITOR') {
        roles.add('EDITOR');
        roles.add('VIEWER');
    }
    else if (role === 'VIEWER') {
        roles.add('VIEWER');
    }
}
function effective(user, operationCode, roleGrants) {
    const roles = new Set();
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
function can(roles, action) {
    switch (action) {
        case 'READ':
            return (roles.has('VIEWER') ||
                roles.has('EDITOR') ||
                roles.has('IMO') ||
                roles.has('ADMIN'));
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
