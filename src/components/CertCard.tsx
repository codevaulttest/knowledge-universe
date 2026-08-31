import { useState } from 'react';
import { BadgeCheck, Check, ChevronRight, Info } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_POSTS } from '../mockData';
import { formatScheduledAt } from '../dateUtils';
import type { KnowledgeCert } from '../types';
import { CertRulesSheet } from './CertRulesSheet';

/** 知识确权认证证书卡：黑金物料，三态（已铸造 / 待铸造 / 已销毁）*/
export function CertCard({ cert }: { cert: KnowledgeCert }) {
  const { t, posts } = useApp();
  const sourcePost = posts.find(p => p.id === cert.postId) ?? ALL_POSTS.find(p => p.id === cert.postId);
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="bsp-rules-entry task-panel-rules-entry--neutral"
        onClick={() => setRulesOpen(true)}
        aria-label={t('了解知识确权规则')}
      >
        <Info size={14} strokeWidth={2} className="bsp-rules-entry-icon" aria-hidden />
        <span className="bsp-rules-entry-text">{t('了解知识确权规则')}</span>
        <ChevronRight size={14} strokeWidth={2} className="bsp-rules-entry-chevron" aria-hidden />
      </button>

      <div className="cert-card" data-cert-state={cert.status}>
        <div className="cert-status-head">
          {cert.status === 'minted' && (
            <span className="cert-seal-icon" aria-hidden="true">
              <BadgeCheck className="cert-seal-icon-shape" />
              <Check className="cert-seal-icon-check" strokeWidth={3} />
            </span>
          )}
          <div className="cert-status-pill">
            <span className="cert-pill-dot" />
            <span>
              {cert.status === 'minted' ? t('已确权') : cert.status === 'pending' ? t('待铸造') : t('已销毁')}
            </span>
          </div>
        </div>

        {cert.status !== 'burned' && (
          <>
            <div className="cert-main">
              <div className="cert-eyebrow">{t('证书编号')}</div>
              <div className="cert-number">{cert.status === 'pending' ? t('铸造完成后生成') : cert.id}</div>
              <div className="cert-rule" />

              <div className="cert-field">
                <span className="cert-f-label">{t('当前持有人')}</span>
                <span className="cert-f-val">{cert.holder}</span>
              </div>

              <div className="cert-field">
                <span className="cert-f-label">{t('铸造日期')}</span>
                {cert.issuedAt ? (
                  <span className="cert-f-val">{formatScheduledAt(cert.issuedAt)}</span>
                ) : (
                  <span className="cert-f-val cert-muted">{t('等待次日铸造')}</span>
                )}
              </div>

              <div className="cert-field">
                <span className="cert-f-label">{t('内容指纹')}</span>
                <span className="cert-f-val cert-mono">{cert.contentHash}</span>
              </div>

              <div className="cert-field">
                <span className="cert-f-label">{t('交易哈希')}</span>
                {cert.status === 'minted' ? (
                  <span className="cert-f-val cert-mono cert-ch-link">
                    {cert.txHash}
                  </span>
                ) : (
                  <span className="cert-f-val cert-muted">{t('等待次日铸造')}</span>
                )}
              </div>

            </div>
          </>
        )}

        {cert.status === 'burned' && (
          <div className="cert-burned-body">
            <img src="/img/cert-seal-burned.svg" alt="" className="cert-burned-glyph" />
            <div className="cert-burned-title">{t('该认证已回收')}</div>
            <div className="cert-burned-desc">{cert.burnReason ?? t('经人工核查存在异常点赞，认证已回收')}</div>

            <div className="cert-burned-meta">
              <div className="cert-field">
                <span className="cert-f-label">{t('回收时间')}</span>
                <span className="cert-f-val">{cert.burnedAt ? formatScheduledAt(cert.burnedAt) : '—'}</span>
              </div>
              <div className="cert-field">
                <span className="cert-f-label">{t('内容指纹')}</span>
                <span className="cert-f-val cert-mono">{cert.contentHash}</span>
              </div>
            </div>

            <div className="cert-field">
              <span className="cert-f-label">{t('交易哈希')}</span>
              <span className="cert-f-val cert-mono cert-ch-link">
                {cert.txHash}
              </span>
            </div>
          </div>
        )}

      </div>

      {sourcePost && (
        <button
          type="button"
          className="cert-f-val cert-link"
          style={{ display: 'block', margin: '14px auto 0', textAlign: 'center' }}
        >
          {t('前往区块链浏览器')}
        </button>
      )}

      {rulesOpen && <CertRulesSheet onClose={() => setRulesOpen(false)} />}

    </>
  );
}
