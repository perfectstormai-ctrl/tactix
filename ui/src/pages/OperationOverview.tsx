import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function OperationOverview() {
  const { t } = useTranslation();
  const { opId } = useParams();
  return (
    <div className="text-sm">
      {t('nav.operations')} {opId}
    </div>
  );
}
