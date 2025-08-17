import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher.tsx';

export default function TopNav({ onLogout }) {
  const { t } = useTranslation();
  return (
    <header className="flex items-center justify-between bg-gray-800 text-white px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="font-bold">TACTIX</div>
        <select className="text-black text-sm rounded px-1 py-0.5" aria-label={t('nav.operations')}>
          <option>OP1</option>
        </select>
      </div>
      <input
        type="search"
        placeholder={t('header.search.placeholder')}
        className="flex-1 mx-4 max-w-md text-black rounded px-2 py-1 text-sm"
      />
      <div className="flex items-center gap-4">
        <button aria-label={t('header.notifications')}>🔔</button>
        <LanguageSwitcher />
        <button onClick={onLogout} className="text-sm hover:underline">
          {t('header.logout')}
        </button>
      </div>
    </header>
  );
}
