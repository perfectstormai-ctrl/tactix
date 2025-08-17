import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function OrderDetail() {
  const { t } = useTranslation();
  const { orderId } = useParams();
  return (
    <div className="text-sm">
      {t('orders.list.title')} {orderId}
    </div>
  );
}
