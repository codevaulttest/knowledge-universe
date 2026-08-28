import { useApp } from '../AppContext';
import { PageHeader } from '../components/shared';
import { CertCard } from '../components/CertCard';

export function CertDetailPage({ certId }: { certId: string }) {
  const { t, goBack, canGoBack, knowledgeCerts } = useApp();
  const cert = knowledgeCerts.find(c => c.id === certId);

  return (
    <div className="page cert-detail-page">
      <PageHeader title={t('认证详情')} onBack={canGoBack ? goBack : undefined} className="page-header--cert" />
      <div className="scroll-area">
        {cert ? (
          <CertCard cert={cert} />
        ) : (
          <div className="empty-state" style={{ paddingTop: 60, color: 'var(--ku-cert-text)' }}>
            <p>{t('该认证不存在')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
