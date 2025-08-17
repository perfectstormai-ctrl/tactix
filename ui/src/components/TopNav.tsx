const { Link } = ReactRouterDOM;
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher.tsx';

export default function TopNav({ onLogout }) {
  const { t } = useTranslation();
  return (
    <header className="flex items-center justify-between bg-gray-800 text-white px-4 py-2">
      <div className="font-bold">TACTIX</div>
      <nav className="flex gap-4 text-sm">
        <Link to="/incidents" className="hover:underline">
          {t('nav.incidents')}
        </Link>
        <Link to="/playbooks" className="hover:underline">
          {t('nav.playbooks')}
        </Link>
        <Link to="/orders" className="hover:underline">
          {t('nav.orders')}
        </Link>
        <Link to="/schedule" className="hover:underline">
          {t('nav.schedule')}
        </Link>
        <Link to="/chat" className="hover:underline">
          {t('nav.chat')}
        </Link>
        <Link to="/notifications" className="hover:underline">
          {t('nav.notifications')}
        </Link>
      </nav>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <button
          onClick={onLogout}
          className="text-sm hover:underline"
        >
          {t('nav.logout')}
        </button>
      </div>
    </header>
  );
}
