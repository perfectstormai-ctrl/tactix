import { useTranslation } from 'react-i18next';
const { Link } = ReactRouterDOM;

export default function SettingsAdmin() {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 text-sm">
      <div>{t('settings.admin')}</div>
      <div>
        <Link className="text-blue-600" to="/settings/join">
          {t('settings.join')}
        </Link>
      </div>
      <div>
        <Link className="text-blue-600" to="/settings/promote">
          {t('settings.promote')}
        </Link>
      </div>
    </div>
  );
}
