import { useTranslation } from 'react-i18next';

export default function EngRooms() {
  const { t } = useTranslation();
  return <div className="text-sm">{t('eng.rooms')}</div>;
}
