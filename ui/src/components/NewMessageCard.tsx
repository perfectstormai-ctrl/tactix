import React, { useEffect, useState } from 'react';

interface Props {
  token: string;
  operationId?: string;
}

interface OrgUnit {
  org_unit_id: string;
  scope: string;
  unit_name: string;
}

interface Message {
  message_id: string;
  content: string;
}

export default function NewMessageCard({ token, operationId }: Props) {
  const opId = operationId || '00000000-0000-0000-0000-000000000000';
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [recipient, setRecipient] = useState('');
  const [content, setContent] = useState('');
  const [drafts, setDrafts] = useState<Message[]>([]);

  useEffect(() => {
    fetch(`/operations/${opId}/org-units`)
      .then((res) => res.json())
      .then(setUnits)
      .catch(() => setUnits([]));
  }, [opId]);

  const headers: any = token ? { Authorization: `Bearer ${token}` } : {};

  const saveDraft = () => {
    const [scope, unit] = recipient.split(':');
    fetch(`/operations/${opId}/messages`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ recipientScope: scope, recipientUnit: unit, content }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((msg) => {
        setDrafts((d) => [...d, msg]);
        setContent('');
      })
      .catch(() => {});
  };

  const submit = (id: string) => {
    fetch(`/operations/${opId}/messages/${id}/submit`, {
      method: 'PUT',
      headers,
    })
      .then(() => setDrafts((d) => d.filter((m) => m.message_id !== id)))
      .catch(() => {});
  };

  return (
    <div className="border p-2 rounded space-y-2">
      <h2 className="font-semibold">New Message</h2>
      <select
        className="border p-1 w-full"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      >
        <option value="">Select recipient</option>
        {units.map((u) => (
          <option
            key={u.org_unit_id}
            value={`${u.scope}:${u.unit_name}`}
          >
            {u.unit_name}
          </option>
        ))}
      </select>
      <textarea
        className="border p-1 w-full"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          className="bg-gray-200 px-2 rounded"
          onClick={saveDraft}
          disabled={!recipient || !content}
        >
          Save Draft
        </button>
      </div>
      {drafts.length > 0 && (
        <div className="pt-2 border-t">
          <h3 className="font-medium text-sm">My Drafts</h3>
          {drafts.map((d) => (
            <div key={d.message_id} className="flex justify-between py-1">
              <span className="text-sm">{d.content}</span>
              <button
                className="text-blue-600 text-sm"
                onClick={() => submit(d.message_id)}
              >
                Submit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
