import { useTranslation } from 'react-i18next';

export default function SettingsAdmin() {
  const { t } = useTranslation();
  return <div className="text-sm">{t('settings.admin')}</div>;
}
