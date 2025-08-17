import Button from '../design/Button.tsx';
import { useTranslation } from 'react-i18next';
const { useState } = React;

interface Props {
  onComplete: (mode: string) => void;
}

export default function FirstRun({ onComplete }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [probe, setProbe] = useState('');
  const [mode, setMode] = useState('');
  const [ldap, setLdap] = useState({ url: '', bindDn: '', bindPassword: '', baseDn: '' });
  const [ldapOk, setLdapOk] = useState(false);
  const [admin, setAdmin] = useState({ upn: '', password: '' });

  const runProbe = () => {
    fetch('/bootstrap/probe')
      .then((res) => (res.ok ? res.text() : Promise.reject()))
      .then((txt) => setProbe(txt))
      .catch(() => setProbe('fail'));
  };

  const testLdap = () => {
    fetch('/auth/ldap/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(ldap),
    })
      .then((res) => {
        if (res.ok) {
          setLdapOk(true);
        } else {
          setLdapOk(false);
        }
      })
      .catch(() => setLdapOk(false));
  };

  const createAdmin = () => {
    fetch('/auth/local/init-admin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(admin),
    })
      .then((res) => {
        if (res.ok) {
          setStep(5);
        }
      })
      .catch(() => {});
  };

  const applyConfig = () => {
    const body: any = { mode };
    if (ldapOk) body.ldap = ldap;
    fetch('/bootstrap/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (res.ok) {
          onComplete(mode);
          window.location.reload();
        }
      })
      .catch(() => {});
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {step === 0 && (
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">{t('firstRun.welcome.title')}</h2>
          <Button onClick={() => setStep(1)}>{t('firstRun.welcome.next')}</Button>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t('firstRun.systemCheck.title')}</h2>
          <Button onClick={runProbe}>{t('firstRun.systemCheck.run')}</Button>
          {probe && (
            <div className="text-sm mt-2">
              {probe === 'fail' ? t('common.error') : t('firstRun.systemCheck.success')}
            </div>
          )}
          <Button disabled={!probe || probe === 'fail'} onClick={() => setStep(2)}>
            {t('firstRun.systemCheck.next')}
          </Button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t('firstRun.chooseRole.title')}</h2>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setMode('single')}>{t('firstRun.chooseRole.local')}</Button>
            <Button onClick={() => setMode('server')}>{t('firstRun.chooseRole.server')}</Button>
            <Button onClick={() => setMode('client')}>{t('firstRun.chooseRole.client')}</Button>
          </div>
          {mode && (
            <Button onClick={() => setStep(3)}>{t('firstRun.chooseRole.next')}</Button>
          )}
        </div>
      )}
      {step === 3 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t('firstRun.ldap.title')}</h2>
          <input
            className="border rounded p-1 w-full"
            placeholder={t('firstRun.ldap.url')}
            value={ldap.url}
            onChange={(e) => setLdap({ ...ldap, url: e.target.value })}
          />
          <input
            className="border rounded p-1 w-full"
            placeholder={t('firstRun.ldap.bindDn')}
            value={ldap.bindDn}
            onChange={(e) => setLdap({ ...ldap, bindDn: e.target.value })}
          />
          <input
            className="border rounded p-1 w-full"
            type="password"
            placeholder={t('firstRun.ldap.bindPassword')}
            value={ldap.bindPassword}
            onChange={(e) => setLdap({ ...ldap, bindPassword: e.target.value })}
          />
          <input
            className="border rounded p-1 w-full"
            placeholder={t('firstRun.ldap.baseDn')}
            value={ldap.baseDn}
            onChange={(e) => setLdap({ ...ldap, baseDn: e.target.value })}
          />
          <div className="flex gap-2">
            <Button onClick={testLdap}>{t('firstRun.ldap.test')}</Button>
            <Button onClick={() => setStep(ldapOk ? 5 : 4)}>{t('firstRun.ldap.next')}</Button>
            <Button onClick={() => setStep(4)}>{t('firstRun.ldap.skip')}</Button>
          </div>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t('firstRun.localAdmin.title')}</h2>
          <input
            className="border rounded p-1 w-full"
            placeholder={t('firstRun.localAdmin.upn')}
            value={admin.upn}
            onChange={(e) => setAdmin({ ...admin, upn: e.target.value })}
          />
          <input
            className="border rounded p-1 w-full"
            type="password"
            placeholder={t('firstRun.localAdmin.password')}
            value={admin.password}
            onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
          />
          <Button onClick={createAdmin}>{t('firstRun.localAdmin.create')}</Button>
        </div>
      )}
      {step === 5 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t('firstRun.review.title')}</h2>
          <div className="text-sm">{t(`mode.${mode}`)}</div>
          <Button onClick={applyConfig}>{t('firstRun.review.apply')}</Button>
        </div>
      )}
    </div>
  );
}
