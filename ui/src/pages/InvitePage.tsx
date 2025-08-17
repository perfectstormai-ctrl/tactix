import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateInvite, decodeInvite } from '@tactix/invite';
import { QRCodeCanvas } from 'qrcode.react';

export default function InvitePage() {
  const { t } = useTranslation();
  const [serverId, setServerId] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinResult, setJoinResult] = useState('');

  function gen() {
    try {
      setCode(generateInvite(serverId, secret));
    } catch {
      setCode('');
    }
  }

  async function join() {
    const payload = decodeInvite(joinCode);
    if (!payload) {
      setJoinResult(t('invite.invalid'));
      return;
    }
    const res = await fetch(`/registry/lookup?serverId=${encodeURIComponent(payload.serverId)}`);
    if (res.ok) {
      const data = await res.json();
      setJoinResult(JSON.stringify(data));
    } else {
      setJoinResult(t('invite.invalid'));
    }
  }

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t('invite.generate')}</h2>
        <input className="border p-1" placeholder={t('invite.serverId')} value={serverId} onChange={e=>setServerId(e.target.value)} />
        <input className="border p-1" placeholder={t('invite.secret')} value={secret} onChange={e=>setSecret(e.target.value)} />
        <button className="border px-2" onClick={gen}>{t('invite.generate')}</button>
        {code && (
          <div className="space-y-2">
            <textarea className="border w-full" value={code} readOnly />
            <QRCodeCanvas value={code} />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{t('invite.join')}</h2>
        <input className="border p-1" placeholder={t('invite.paste')} value={joinCode} onChange={e=>setJoinCode(e.target.value)} />
        <button className="border px-2" onClick={join}>{t('invite.submit')}</button>
        {joinResult && <div className="text-sm break-all">{joinResult}</div>}
      </div>
    </div>
  );
}
