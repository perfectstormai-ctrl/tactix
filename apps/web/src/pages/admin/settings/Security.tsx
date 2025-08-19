import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Security() {
  const { t } = useTranslation();
  const [state, setState] = useState({ enabled: false, locked: false, source: 'DEFAULT', updatedAt: '', updatedBy: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/admin/settings/zero-trust');
        const data = await res.json();
        setState(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function toggle() {
    if (state.locked) return;
    const next = !state.enabled;
    await fetch('/admin/settings/zero-trust', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next })
    });
    const res = await fetch('/admin/settings/zero-trust');
    setState(await res.json());
  }

  if (loading) return null;

  return (
    <div className="p-4">
      {state.enabled && <div className="bg-yellow-200 p-2 mb-4">{t('security.banner')}</div>}
      <div className="border p-4 rounded">
        <div className="flex items-center justify-between">
          <span>{t('security.zeroTrust')}</span>
          <input type="checkbox" checked={state.enabled} disabled={state.locked} onChange={toggle} />
        </div>
        {state.locked && <div className="text-xs text-gray-500">{t('security.locked')}</div>}
        <div className="text-xs text-gray-500 mt-2">{`Source: ${state.source}`}</div>
        {state.updatedBy && <div className="text-xs text-gray-500">{`Last changed by ${state.updatedBy} at ${state.updatedAt}`}</div>}
      </div>
    </div>
  );
}
