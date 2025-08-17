const { Link } = ReactRouterDOM;
import { useTranslation } from 'react-i18next';

export default function Sidebar() {
  const { t } = useTranslation();
  const engEnabled = (window as any).ENV?.ENG_CHAT_ENABLED !== false;
  return (
    <aside className="w-48 bg-gray-100 p-4 space-y-2 text-sm">
      <Link to="/operations" className="block hover:underline">
        {t('nav.operations')}
      </Link>
      <Link to="/incidents" className="block hover:underline">
        {t('nav.incidents')}
      </Link>
      <Link to="/operations/1/schedule" className="block hover:underline">
        {t('nav.schedule')}
      </Link>
      <Link to="/playbooks" className="block hover:underline">
        {t('nav.playbooks')}
      </Link>
      <Link to="/orders" className="block hover:underline">
        {t('nav.orders')}
      </Link>
      {engEnabled && (
        <Link to="/eng" className="block hover:underline">
          {t('nav.eng')}
        </Link>
      )}
      <Link to="/settings/profile" className="block hover:underline">
        {t('nav.settings')}
      </Link>
    </aside>
  );
}
