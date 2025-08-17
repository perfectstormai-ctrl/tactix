import { useTranslation } from 'react-i18next';

export default function SchedulePage() {
  const { t } = useTranslation();
  return <div className="text-sm">{t('schedule.title')}</div>;
}
