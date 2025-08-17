import { useState } from 'react';
import Button from '../design/Button.tsx';
import { useTranslation } from 'react-i18next';

export default function SetupLdap() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    host: '',
    port: '389',
    starttls: false,
    baseDn: '',
    bindDn: '',
    bindPw: '',
  });
  const [status, setStatus] = useState('');

  const update = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const test = () => {
    setStatus('');
    fetch('/auth/ldap/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.ok ? 'success' : data.error || 'error');
      })
      .catch(() => setStatus('error'));
  };

  const save = () => {
    fetch('/auth/ldap/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
      .then((res) => res.json())
      .then(() => setStatus('saved'))
      .catch(() => setStatus('error'));
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-2">
      <h2 className="text-lg font-semibold">{t('setup.ldap.title')}</h2>
      <input
        className="border rounded p-1 w-full"
        placeholder={t('setup.ldap.host')}
        name="host"
        value={form.host}
        onChange={update}
      />
      <input
        className="border rounded p-1 w-full"
        placeholder={t('setup.ldap.port')}
        name="port"
        value={form.port}
        onChange={update}
      />
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          name="starttls"
          checked={form.starttls}
          onChange={update}
        />
        <span>{t('setup.ldap.starttls')}</span>
      </label>
      <input
        className="border rounded p-1 w-full"
        placeholder={t('setup.ldap.baseDn')}
        name="baseDn"
        value={form.baseDn}
        onChange={update}
      />
      <input
        className="border rounded p-1 w-full"
        placeholder={t('setup.ldap.bindDn')}
        name="bindDn"
        value={form.bindDn}
        onChange={update}
      />
      <input
        className="border rounded p-1 w-full"
        placeholder={t('setup.ldap.bindPw')}
        type="password"
        name="bindPw"
        value={form.bindPw}
        onChange={update}
      />
      <div className="space-x-2">
        <Button onClick={test}>{t('setup.ldap.test')}</Button>
        <Button onClick={save}>{t('setup.ldap.save')}</Button>
      </div>
      {status && (
        <div className="text-sm">
          {status === 'success'
            ? t('setup.ldap.success')
            : status === 'saved'
            ? t('setup.ldap.saved')
            : status}
        </div>
      )}
    </div>
  );
}
