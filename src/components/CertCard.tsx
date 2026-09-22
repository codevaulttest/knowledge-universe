import { useState } from 'react';
import { BadgeCheck, Check, ChevronRight, Info, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { ALL_POSTS } from '../mockData';
import { formatScheduledAt } from '../dateUtils';
import type { KnowledgeCert } from '../types';
import { CertRulesSheet } from './CertRulesSheet';
import { CertExplorerSheet } from './CertExplorerSheet';
import { PostVersionsSheet } from './PostVersionsSheet';
import { REVOKE_REASON_KEYS } from '../certUtils';

/** 知识确权认证证书卡：黑金物料，三态（已确权 / 确权中 / 已撤销）*/
export function CertCard({ cert }: { cert: KnowledgeCert }) {
  const { t, posts } = useApp();
  const sourcePost = posts.find(p => p.id === cert.postId) ?? ALL_POSTS.find(p => p.id === cert.postId);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const hasVersions = !!sourcePost?.versions?.length;
  const versionField = (
    <div className="cert-field">
      <span className="cert-f-label">{t('认证版本')}</span>
      {hasVersions ? (
        <button type="button" className="cert-f-val cert-version-link" onClick={() => setVersionsOpen(true)}>v{cert.version}</button>
      ) : (
        <span className="cert-f-val">v{cert.version}</span>
      )}
    </div>
  );

  return (
    <>
      <div className="cert-rule-banner">
        {t('确权认证绑定帖子的一个版本，永久记录在链上。')}
      </div>

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
          {cert.status === 'minted' ? (
            <span className="cert-seal-icon" aria-hidden="true">
              <BadgeCheck className="cert-seal-icon-shape" />
              <Check className="cert-seal-icon-check" strokeWidth={3} />
            </span>
          ) : cert.status === 'revoked' ? (
            <span className="cert-burned-glyph" aria-hidden="true">
              <BadgeCheck className="cert-burned-glyph-shape" />
              <X className="cert-burned-glyph-x" strokeWidth={3} />
            </span>
          ) : null}
          <div className="cert-status-pill">
            <span className="cert-pill-dot" />
            <span>
              {cert.status === 'minted' ? t('已确权') : cert.status === 'minting' ? t('确权中') : t('已撤销')}
            </span>
          </div>
        </div>

        {cert.status !== 'revoked' && (
          <>
            <div className="cert-main">
              <div className="cert-eyebrow">{t('证书编号')}</div>
              <div className="cert-number">{cert.status === 'minting' ? t('铸造完成后生成') : cert.id}</div>
              <div className="cert-rule" />

              {versionField}

              <div className="cert-field">
                <span className="cert-f-label">{t('认证作者')}</span>
                <span className="cert-f-val">{cert.holder}</span>
              </div>

              <div className="cert-field">
                <span className="cert-f-label">{t('铸造日期')}</span>
                {cert.issuedAt ? (
                  <span className="cert-f-val">{formatScheduledAt(cert.issuedAt)}</span>
                ) : (
                  <span className="cert-f-val cert-muted">{t('铸造中')}</span>
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
                  <span className="cert-f-val cert-muted">{t('铸造完成后生成')}</span>
                )}
              </div>

            </div>
          </>
        )}

        {cert.status === 'revoked' && (
          <div className="cert-burned-body">
            <div className="cert-burned-title">{t('该认证已撤销')}</div>

            <div className="cert-burned-desc">{t('链上记录永久保留，可查询撤销信息。')}</div>

            <div className="cert-burned-meta">
              <div className="cert-field">
                <span className="cert-f-label">{t('撤销原因')}</span>
                <span className="cert-f-val">{cert.revokeReason ? t(REVOKE_REASON_KEYS[cert.revokeReason]) : '—'}</span>
              </div>
              <div className="cert-field">
                <span className="cert-f-label">{t('撤销时间')}</span>
                <span className="cert-f-val">{cert.revokedAt ? formatScheduledAt(cert.revokedAt) : '—'}</span>
              </div>
              {versionField}
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

      {sourcePost && cert.txHash && (
        <button
          type="button"
          className="cert-f-val cert-link"
          onClick={() => setExplorerOpen(true)}
          style={{ display: 'block', margin: '14px auto 0', textAlign: 'center' }}
        >
          {t('前往区块链浏览器')}
        </button>
      )}

      {rulesOpen && <CertRulesSheet onClose={() => setRulesOpen(false)} />}
      {explorerOpen && cert.txHash && (
        <CertExplorerSheet label={t('铸造交易哈希')} value={cert.txHash} onClose={() => setExplorerOpen(false)} />
      )}
      {versionsOpen && sourcePost && (
        <PostVersionsSheet post={sourcePost} initialVersion={cert.version} onClose={() => setVersionsOpen(false)} />
      )}

    </>
  );
}
