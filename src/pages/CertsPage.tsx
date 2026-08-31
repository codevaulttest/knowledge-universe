import { useState } from 'react';
import { BadgeCheck, ChevronRight } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_POSTS, CURRENT_USER } from '../mockData';
import type { CertStatus } from '../types';
import { PageHeader } from '../components/shared';
import { DevPanel } from '../components/DevPanel';
import { formatScheduledAt } from '../dateUtils';

export function CertsPage() {
  const { t, goBack, canGoBack, navigate, knowledgeCerts, posts, simulateCertMint, simulateCertBurn } = useApp();
  const [tab, setTab] = useState<Exclude<CertStatus, 'pending'>>('minted');
  // 开发工具：模拟空态（不改动种子数据）
  const [demoEmpty, setDemoEmpty] = useState(false);

  const myCerts = demoEmpty ? [] : knowledgeCerts.filter(c => c.holder === CURRENT_USER);
  const mintedCount = myCerts.filter(c => c.status === 'minted').length;
  const burnedCount = myCerts.filter(c => c.status === 'burned').length;
  const filtered = myCerts.filter(c => c.status === tab);

  const tabConfig: { key: Exclude<CertStatus, 'pending'>; label: string; count: number }[] = [
    { key: 'minted', label: t('已铸造'), count: mintedCount },
    { key: 'burned', label: t('已销毁'), count: burnedCount },
  ];

  return (
    <div className="page">
      <PageHeader title={t('我的知识确权认证')} onBack={canGoBack ? goBack : undefined} />

      <div className="cert-rule-banner">
        {t('文章获得 100 个赞后，次日自动铸造一份知识确权认证，永久记录在链上。')}
      </div>

      <div className="certs-tabs create-scale-toggle" role="tablist">
        {tabConfig.map(tc => (
          <button
            key={tc.key}
            type="button"
            role="tab"
            aria-selected={tab === tc.key}
            className={`create-scale-tab${tab === tc.key ? ' create-scale-tab--active' : ''}`}
            onClick={() => setTab(tc.key)}
          >
            {tc.label}
            {tc.count > 0 && (
              <span className="orders-tab-badge" aria-label={t('{count} 份', { count: tc.count })}>{tc.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="scroll-area">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 60 }}>
            <BadgeCheck size={44} strokeWidth={1.5} className="orders-empty-icon" aria-hidden="true" />
            <p>{t('还没有知识确权认证')}</p>
            <p className="empty-sub">{t('文章满 100 赞即可获得')}</p>
          </div>
        ) : (
          <div className="orders-list">
            {filtered.map(cert => {
              const post = posts.find(p => p.id === cert.postId) ?? ALL_POSTS.find(p => p.id === cert.postId);
              return (
                <button
                  key={cert.id}
                  type="button"
                  className="cert-list-item"
                  onClick={() => navigate({ page: 'P_CERT', certId: cert.id })}
                >
                  <img
                    src={cert.status === 'burned' ? '/img/cert-seal-burned.svg' : '/img/cert-seal.svg'}
                    alt=""
                    className="cert-list-item-seal"
                  />
                  <span className="cert-list-item-body">
                    <span className="cert-list-item-title">{post?.title ?? cert.postId}</span>
                    <span className="cert-list-item-sub">
                      {cert.status === 'pending' ? cert.id.slice(0, 4) + '···' : cert.id}
                      {cert.issuedAt ? ` · ${formatScheduledAt(cert.issuedAt)}` : ''}
                    </span>
                  </span>
                  <span className={`cert-list-item-pill cert-list-item-pill--${cert.status}`}>
                    {cert.status === 'minted' ? t('已铸造') : cert.status === 'pending' ? t('待铸造') : t('已销毁')}
                  </span>
                  <ChevronRight size={15} strokeWidth={2.2} aria-hidden="true" style={{ color: 'var(--ku-color-text-meta)', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <DevPanel>
        <button
          type="button"
          className="planet-dev-menu-item"
          role="menuitemcheckbox"
          aria-checked={demoEmpty}
          onClick={() => setDemoEmpty(v => !v)}
        >
          <span>{t('确权认证空态')}</span>
          <span className={`planet-dev-menu-toggle${demoEmpty ? ' planet-dev-menu-toggle--on' : ''}`}>
            {demoEmpty ? t('开') : t('关')}
          </span>
        </button>
        {knowledgeCerts.filter(c => c.holder === CURRENT_USER && c.status === 'pending').map(c => (
          <button
            key={c.id}
            type="button"
            className="planet-dev-menu-item"
            onClick={() => simulateCertMint(c.id)}
          >
            <span>{t('触发铸造：{id}', { id: c.id })}</span>
          </button>
        ))}
        {knowledgeCerts.filter(c => c.holder === CURRENT_USER && c.status === 'minted').map(c => (
          <button
            key={c.id}
            type="button"
            className="planet-dev-menu-item"
            onClick={() => simulateCertBurn(c.id, t('经人工核查存在异常点赞，认证已回收'))}
          >
            <span>{t('模拟回收：{id}', { id: c.id })}</span>
          </button>
        ))}
      </DevPanel>
    </div>
  );
}
