import { useState } from 'react';
import { useApp } from '../AppContext';
import { ALL_POSTS } from '../mockData';
import { formatScheduledAt } from '../dateUtils';
import type { KnowledgeCert } from '../types';
import { CertExplorerSheet } from './CertExplorerSheet';

/** 知识确权认证证书卡：黑金物料，三态（已铸造 / 待铸造 / 已销毁）*/
export function CertCard({ cert }: { cert: KnowledgeCert }) {
  const { t, posts, openArticleReader } = useApp();
  const [explorer, setExplorer] = useState<{ label: string; value: string } | null>(null);
  const sourcePost = posts.find(p => p.id === cert.postId) ?? ALL_POSTS.find(p => p.id === cert.postId);

  return (
    <>
      <div className="cert-card" data-cert-state={cert.status}>
        <div className="cert-corners"><i /><i /><i /><i /></div>

        <div className="cert-status-head">
          {cert.status === 'minted' && (
            <img src="/img/cert-seal.svg" alt="" className="cert-seal-icon" />
          )}
          <div className="cert-status-pill">
            <span className="cert-pill-dot" />
            <span>
              {cert.status === 'minted' ? t('已铸造') : cert.status === 'pending' ? t('待铸造') : t('已销毁')}
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
                <span className="cert-f-label">{t('铸造时赞数')}</span>
                <span className="cert-f-val">{cert.likesAtMint ?? '—'}</span>
              </div>
            </div>

            <div className="cert-onchain-block">
              <div className="cert-onchain-header">
                <span className="cert-onchain-label">{t('链上信息')}</span>
                <span className="cert-onchain-line-dec" />
              </div>

              <div className="cert-chain-row">
                <span className="cert-ch-key">{t('发行方')}</span>
                <span className="cert-ch-val" style={{ cursor: 'default' }}>{cert.issuerAddress}</span>
              </div>

              {cert.status === 'minted' ? (
                <>
                  <div className="cert-chain-row">
                    <span className="cert-ch-key">Token ID</span>
                    <button type="button" className="cert-ch-val" onClick={() => setExplorer({ label: 'Token ID', value: cert.tokenId! })}>
                      {cert.tokenId}
                    </button>
                  </div>
                  <div className="cert-chain-row">
                    <span className="cert-ch-key">{t('铸造交易')}</span>
                    <button type="button" className="cert-ch-val" onClick={() => setExplorer({ label: t('铸造交易'), value: cert.txHash! })}>
                      {cert.txHash}
                    </button>
                  </div>
                </>
              ) : (
                <div className="cert-pending-note">{t('等待次日铸造')}</div>
              )}
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

            <div className="cert-onchain-block" style={{ marginTop: 14, width: '100%' }}>
              <div className="cert-onchain-header">
                <span className="cert-onchain-label">{t('链上信息')}</span>
                <span className="cert-onchain-line-dec" />
              </div>
              <div className="cert-chain-row">
                <span className="cert-ch-key">Token ID</span>
                <button type="button" className="cert-ch-val" onClick={() => setExplorer({ label: 'Token ID', value: cert.tokenId! })}>
                  {cert.tokenId}
                </button>
              </div>
              <div className="cert-chain-row">
                <span className="cert-ch-key">{t('铸造交易')}</span>
                <button type="button" className="cert-ch-val" onClick={() => setExplorer({ label: t('铸造交易'), value: cert.txHash! })}>
                  {cert.txHash}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="cert-foot">
          <div className="cert-foot-row">
            <span className="cert-foot-item">{t('由 知识宇宙 颁发')}</span>
            <span className="cert-foot-sep" />
            <span className="cert-foot-item">{t('由 SuperAIChain 提供安全保障')}</span>
          </div>
        </div>
      </div>

      {sourcePost && (
        <button
          type="button"
          className="cert-f-val cert-link"
          style={{ display: 'block', margin: '14px auto 0', textAlign: 'center' }}
          onClick={() => openArticleReader(sourcePost)}
        >
          {t('查看所属文章')}
        </button>
      )}

      {explorer && (
        <CertExplorerSheet label={explorer.label} value={explorer.value} onClose={() => setExplorer(null)} />
      )}
    </>
  );
}
