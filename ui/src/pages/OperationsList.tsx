import { useTranslation } from 'react-i18next';

export default function OperationsList() {
  const { t } = useTranslation();
  return <div className="text-sm">{t('nav.operations')}</div>;
}
