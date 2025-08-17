import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  return <div className="text-sm">{t('common.notFound')}</div>;
}
