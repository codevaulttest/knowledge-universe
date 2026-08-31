import { X } from 'lucide-react';
import { useApp } from '../AppContext';
import { CertCard } from '../components/CertCard';

export function CertDetailPage({ certId, onClose }: { certId: string; onClose: () => void }) {
  const { t, knowledgeCerts } = useApp();
  const cert = knowledgeCerts.find(c => c.id === certId);

  return (
    <div className="cert-detail-page">
      <div className="sheet-header">
        <span className="sheet-title">{t('认证详情')}</span>
        <button type="button" className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭')}>
          <X size={18} strokeWidth={2} />
        </button>
      </div>
      {cert ? (
        <CertCard cert={cert} />
      ) : (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>{t('该认证不存在')}</p>
        </div>
      )}
    </div>
  );
}
