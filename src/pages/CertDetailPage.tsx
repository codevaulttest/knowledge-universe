import { ArrowLeft } from 'lucide-react';
import { useApp } from '../AppContext';
import { CertCard } from '../components/CertCard';

export function CertDetailPage({ certId, onClose }: { certId: string; onClose: () => void }) {
  const { t, knowledgeCerts } = useApp();
  const cert = knowledgeCerts.find(c => c.id === certId);

  return (
    <div className="cert-detail-page">
      <div className="sheet-header sheet-header--centered">
        <button type="button" className="sheet-header-back" onClick={onClose} aria-label={t('返回')}>
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <span className="sheet-title sheet-title--centered">{t('认证详情')}</span>
        <div className="sheet-header-spacer" aria-hidden />
      </div>
      {cert ? (
        <CertCard cert={cert} />
      ) : (
        <div className="empty-state" style={{ paddingTop: 60 }}>
          <p>{t('该认证不存在')}</p>
        </div>
      )}
      <footer className="cert-detail-page-footer">
        <button type="button" className="planet-confirm-btn" onClick={onClose}>
          {t('返回')}
        </button>
      </footer>
    </div>
  );
}
