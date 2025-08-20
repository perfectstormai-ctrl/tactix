import { useTranslation } from 'react-i18next';

export default function OperationsList() {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 text-sm">
      <h1 className="text-xl font-semibold">{t('home.welcome')}</h1>
      <div>{t('nav.operations')}</div>
    </div>
  );
}
