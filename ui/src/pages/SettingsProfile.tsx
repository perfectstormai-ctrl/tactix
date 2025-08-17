import { useTranslation } from 'react-i18next';

export default function SettingsProfile() {
  const { t } = useTranslation();
  return <div className="text-sm">{t('settings.profile')}</div>;
}
