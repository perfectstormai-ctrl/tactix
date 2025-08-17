import { useTranslation } from 'react-i18next';

export default function PlaybookPage() {
  const { t } = useTranslation();
  return <div className="text-sm">{t('pb.title')}</div>;
}
