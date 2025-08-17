const { Link, useNavigate } = ReactRouterDOM;
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../i18n/format.ts';

export default function IncidentDashboard({ token }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    let url = '/incidents';
    if (filter === 'active') url += '?status=active';
    if (filter === 'resolved') url += '?status=resolved';
    if (filter === 'mine') url += '?assigned=me';
    fetch(url, { headers })
      .then((res) => res.json())
      .then(setIncidents)
      .catch(() => setIncidents([]));
  }, [filter, token]);

  const createIncident = () => {
    fetch('/incidents', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'New Incident' }),
    })
      .then((res) => res.json())
      .then((inc) => navigate(`/incidents/${inc.incident_id}`));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t('incidents.title')}</h2>
        <button
          onClick={createIncident}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          {t('incidents.create')}
        </button>
      </div>
      <div className="flex gap-2">
        {['all', 'active', 'resolved', 'mine'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 rounded border ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white'
            }`}
          >
            {t(`incidents.filters.${f}`)}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {incidents.map((inc) => (
          <Link
            key={inc.incident_id}
            to={`/incidents/${inc.incident_id}`}
            className="border rounded p-2 space-y-1 hover:bg-gray-50"
          >
            <div className="font-semibold">{inc.title}</div>
            <div className="text-sm">{inc.owner_upn}</div>
            <div className="text-xs text-gray-600">
              {inc.created_at ? formatTime(inc.created_at) : ''}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
