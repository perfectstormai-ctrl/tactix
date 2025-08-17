const { Link } = ReactRouterDOM;
import { useTranslation } from 'react-i18next';

export default function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="w-48 bg-gray-100 p-4 space-y-2 text-sm">
      <Link to="/incidents" className="block hover:underline">
        {t('nav.incidents')}
      </Link>
      <Link to="/playbooks" className="block hover:underline">
        {t('nav.playbooks')}
      </Link>
      <Link to="/orders" className="block hover:underline">
        {t('nav.orders')}
      </Link>
      <Link to="/schedule" className="block hover:underline">
        {t('nav.schedule')}
      </Link>
      <Link to="/chat" className="block hover:underline">
        {t('nav.chat')}
      </Link>
      <Link to="/notifications" className="block hover:underline">
        {t('nav.notifications')}
      </Link>
    </aside>
  );
}
