import { useTranslation } from 'react-i18next';

export default function ErrorPage() {
  const { t } = useTranslation();
  return <div className="text-sm">{t('common.error')}</div>;
}
