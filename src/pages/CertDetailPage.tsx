import { ArrowLeft } from 'lucide-react';
import { useApp } from '../AppContext';
import { CertCard } from '../components/CertCard';
import { DevPanel } from '../components/DevPanel';
import { REVOKE_REASON_KEYS } from '../certUtils';
import type { RevokeReason } from '../types';

export function CertDetailPage({ certId, onClose }: { certId: string; onClose: () => void }) {
  const { t, knowledgeCerts, simulateCertMint, simulateCertRevoke } = useApp();
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
      {cert && (cert.status === 'minting' || cert.status === 'minted') && (
        <DevPanel>
          {cert.status === 'minting' && (
            <button type="button" className="planet-dev-menu-item" onClick={() => simulateCertMint(cert.id)}>
              <span>{t('模拟铸造完成')}</span>
            </button>
          )}
          {cert.status === 'minted' && (Object.keys(REVOKE_REASON_KEYS) as RevokeReason[]).map(reason => (
            <button key={reason} type="button" className="planet-dev-menu-item" onClick={() => simulateCertRevoke(cert.id, reason)}>
              <span>{t('模拟撤销：{reason}', { reason: t(REVOKE_REASON_KEYS[reason]) })}</span>
            </button>
          ))}
        </DevPanel>
      )}
    </div>
  );
}
