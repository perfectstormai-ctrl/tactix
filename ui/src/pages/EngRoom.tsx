import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function EngRoom() {
  const { t } = useTranslation();
  const { roomId } = useParams();
  return (
    <div className="text-sm">
      {t('eng.title')} {roomId}
    </div>
  );
}
