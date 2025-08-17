const { useEffect, useState } = React;
import Button from '../design/Button.tsx';
import { savePinnedServer } from '../lib/client-config.ts';
const { useTranslation } = ReactI18next;

export default function JoinServer() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('discover');
  const [servers, setServers] = useState([]);
  const [url, setUrl] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [serverId, setServerId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tab === 'discover') {
      fetch('/discovery/servers')
        .then((res) => (res.ok ? res.json() : []))
        .then((list) => setServers(list || []))
        .catch(() => setServers([]));
    }
  }, [tab]);

  function select(srvUrl) {
    setUrl(srvUrl);
    fetch(`${srvUrl}/auth/server-fingerprint`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setFingerprint(d.fingerprint || '');
        setServerId(d.id || d.serverId || '');
      })
      .catch(() => {
        setFingerprint('');
        setServerId('');
      });
  }

  function handleManual() {
    select(url);
  }

  function handleQR(e) {
    try {
      const data = JSON.parse(e.target.value);
      setUrl(data.url || '');
      setServerId(data.id || '');
      setFingerprint(data.fingerprint || '');
    } catch {
      setUrl('');
      setServerId('');
      setFingerprint('');
    }
  }

  function confirm() {
    savePinnedServer({ id: serverId, url, fingerprint }).then(() =>
      setSaved(true)
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">{t('connect.joinTitle')}</h2>
      <div className="flex space-x-2">
        <button
          className={`px-2 py-1 border ${
            tab === 'discover' ? 'bg-gray-200' : ''
          }`}
          onClick={() => setTab('discover')}
        >
          {t('connect.discover')}
        </button>
        <button
          className={`px-2 py-1 border ${tab === 'manual' ? 'bg-gray-200' : ''}`}
          onClick={() => setTab('manual')}
        >
          {t('connect.manual')}
        </button>
        <button
          className={`px-2 py-1 border ${tab === 'scan' ? 'bg-gray-200' : ''}`}
          onClick={() => setTab('scan')}
        >
          {t('connect.scan')}
        </button>
      </div>

      {tab === 'discover' && (
        <div className="space-y-2">
          {servers.map((s) => (
            <div key={s.id}>
              <Button onClick={() => select(s.url)}>{s.url}</Button>
            </div>
          ))}
        </div>
      )}

      {tab === 'manual' && (
        <div className="space-y-2">
          <input
            className="border p-1 w-full"
            placeholder="https://example"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button onClick={handleManual}>{t('connect.manual')}</Button>
        </div>
      )}

      {tab === 'scan' && (
        <textarea
          className="border p-1 w-full"
          rows={3}
          onChange={handleQR}
          placeholder="{\"url\":\"https://...\",\"id\":\"...\",\"fingerprint\":\"...\"}"
        />
      )}

      {fingerprint && (
        <div className="space-y-2">
          <div>
            {t('connect.fingerprint')}: {fingerprint}
          </div>
          <Button onClick={confirm}>{t('connect.trust')}</Button>
          {saved && <div>{t('connect.saved')}</div>}
        </div>
      )}
    </div>
  );
}
