import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('tactix.lang', lang);
  };

  return (
    <select
      aria-label={t('nav.language')}
      value={i18n.language}
      onChange={change}
      className="border rounded p-1 text-sm"
    >
      <option value="en">{t('nav.english')}</option>
      <option value="fr">{t('nav.french')}</option>
    </select>
  );
}
