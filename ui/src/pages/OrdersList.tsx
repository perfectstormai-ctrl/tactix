import { useTranslation } from 'react-i18next';

export default function OrdersList() {
  const { t } = useTranslation();
  return <div className="text-sm">{t('orders.list.title')}</div>;
}
