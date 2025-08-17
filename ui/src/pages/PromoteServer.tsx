const { useState } = React;
import Button from '../design/Button.tsx';
const { useTranslation } = ReactI18next;

export default function PromoteServer() {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);
  const [invite, setInvite] = useState('');

  function promote() {
    fetch('/bootstrap/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'server', discovery: { announcer: true } }),
    })
      .then((res) => (res.ok ? fetch('/auth/server-fingerprint') : Promise.reject()))
      .then((res) => res.json())
      .then((data) => {
        setInfo(data);
        const payload = JSON.stringify({
          url: window.location.origin,
          id: data.id || data.serverId || '',
          fingerprint: data.fingerprint,
        });
        setInvite(payload);
      })
      .catch(() => setInfo(null));
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">{t('connect.promoteTitle')}</h2>
      {!info && (
        <Button onClick={promote}>{t('connect.promoteAction')}</Button>
      )}
      {info && (
        <div className="space-y-2">
          <div>
            {t('connect.fingerprint')}: {info.fingerprint}
          </div>
          <div>
            {t('connect.invite')}:
            <div>
              <img
                alt="QR"
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invite)}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
