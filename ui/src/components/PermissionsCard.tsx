import React, { useEffect, useState } from 'react';

interface Assignment {
  assignment_id: string;
  user_upn: string;
  position_id: string | null;
  alt_display_name: string | null;
  active: boolean;
}

interface RoleGrant {
  grant_id: string;
  user_upn: string;
  role: string;
}

export function PermissionsCard({ operationId }: { operationId: string }) {
  const [data, setData] = useState<any>(null);
  const [userUpn, setUserUpn] = useState('');
  const [roleGrant, setRoleGrant] = useState({ userUpn: '', role: 'READ' });

  useEffect(() => {
    fetch(`/api/operations/${operationId}/permissions`)
      .then((r) => r.json())
      .then(setData);
  }, [operationId]);

  if (!data) return <div className="p-4">Loading...</div>;
  const { assignments, roleGrants, canAssign } = data;

  async function addAssignment(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/operations/${operationId}/assignments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userUpn }),
    });
    setUserUpn('');
    const refreshed = await fetch(`/api/operations/${operationId}/permissions`).then((r) =>
      r.json()
    );
    setData(refreshed);
  }

  async function addRole(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/operations/${operationId}/roles`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(roleGrant),
    });
    setRoleGrant({ userUpn: '', role: 'READ' });
    const refreshed = await fetch(`/api/operations/${operationId}/permissions`).then((r) =>
      r.json()
    );
    setData(refreshed);
  }

  return (
    <div className="border p-4 rounded">
      <h2 className="font-bold mb-2">Permissions</h2>
      <table className="w-full mb-4 text-sm">
        <thead>
          <tr>
            <th className="text-left">User</th>
            <th className="text-left">Alt name</th>
            <th className="text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a: Assignment) => (
            <tr key={a.assignment_id}>
              <td>{a.user_upn}</td>
              <td>{a.alt_display_name || ''}</td>
              <td>{a.active ? 'active' : 'inactive'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {canAssign ? (
        <div className="space-y-4">
          <form onSubmit={addAssignment} className="flex space-x-2">
            <input
              className="border px-2 py-1 flex-1"
              value={userUpn}
              onChange={(e) => setUserUpn(e.target.value)}
              placeholder="User UPN"
            />
            <button className="bg-blue-500 text-white px-2 py-1" type="submit">
              Add
            </button>
          </form>

          <div>
            <h3 className="font-semibold">Role grants</h3>
            <ul className="mb-2">
              {(roleGrants || []).map((g: RoleGrant) => (
                <li key={g.grant_id}>{`${g.user_upn} -> ${g.role}`}</li>
              ))}
            </ul>
            <form onSubmit={addRole} className="flex space-x-2">
              <input
                className="border px-2 py-1"
                value={roleGrant.userUpn}
                onChange={(e) =>
                  setRoleGrant({ ...roleGrant, userUpn: e.target.value })
                }
                placeholder="User UPN"
              />
              <select
                className="border px-2 py-1"
                value={roleGrant.role}
                onChange={(e) =>
                  setRoleGrant({ ...roleGrant, role: e.target.value })
                }
              >
                <option value="READ">READ</option>
                <option value="ASSIGN">ASSIGN</option>
                <option value="WRITE">WRITE</option>
                <option value="APPROVE">APPROVE</option>
              </select>
              <button className="bg-blue-500 text-white px-2 py-1" type="submit">
                Grant
              </button>
            </form>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          Contact IMO to request access.
        </p>
      )}
    </div>
  );
}

