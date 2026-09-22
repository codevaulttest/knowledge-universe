import { useState } from 'react';
import { ArrowLeft, BadgeCheck, ChevronRight, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { certForVersion, currentVersion, currentVersionLikes } from '../certUtils';
import { formatScheduledAt } from '../dateUtils';
import { localizeTime } from '../i18n';
import type { Post } from '../types';

/** 确权帖子的版本列表：每个版本标明是否确权，可查看该版本原文 */
export function PostVersionsSheet({ post, initialVersion, onClose }: { post: Post; initialVersion?: number; onClose: () => void }) {
  const { t, navigate, knowledgeCerts, language } = useApp();
  const latest = currentVersion(post);
  const [viewing, setViewing] = useState<number | null>(initialVersion ?? null);

  // 当前版本放在最前，历史版本按版本号倒序
  const entries = [
    { version: latest, title: post.title, articlePreview: post.articlePreview, editedAt: undefined as number | undefined },
    ...[...(post.versions ?? [])].sort((a, b) => b.version - a.version),
  ];
  // 当前版本的时间 = 最近一次编辑时间
  const lastEditedAt = Math.max(0, ...(post.versions ?? []).map(v => v.editedAt)) || undefined;
  const shown = viewing != null ? entries.find(e => e.version === viewing) : undefined;
  const shownCert = shown ? certForVersion(knowledgeCerts, post.id, shown.version) : undefined;

  const versionName = (v: number) => (v === latest ? t('v{version} · 当前版本', { version: v }) : `v${v}`);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" aria-label={t('版本记录')} onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          {shown && (
            <button type="button" className="sheet-header-back" onClick={() => setViewing(null)} aria-label={t('返回版本列表')}>
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
          )}
          <span className="sheet-title">{shown ? versionName(shown.version) : t('版本记录')}</span>
          <button className="back-btn bsp-rules-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {shown ? (
          <div className="post-version-content">
            <div className="post-version-content-head">
              {shownCert?.status === 'minted' && (
                <span className="post-cert-badge">
                  <BadgeCheck size={12} strokeWidth={2.5} aria-hidden="true" />
                  {t('已确权')}
                </span>
              )}
              {shown.editedAt && <span>{t('{time} 更新为 v{next}', { time: formatScheduledAt(shown.editedAt), next: shown.version + 1 })}</span>}
            </div>
            <p className="post-version-content-title">{shown.title}</p>
            {shown.articlePreview && <p className="post-version-content-body">{shown.articlePreview}</p>}
            {shownCert && (
              <button type="button" className="planet-confirm-btn" onClick={() => { onClose(); navigate({ page: 'P_CERT', certId: shownCert.id }); }}>
                {t('查看认证证书')}
              </button>
            )}
          </div>
        ) : (
          <ul className="post-versions-list">
            {entries.map(entry => {
              const cert = certForVersion(knowledgeCerts, post.id, entry.version);
              return (
                <li key={entry.version}>
                  <button type="button" className="post-version-item" onClick={() => setViewing(entry.version)}>
                    <span className="post-version-item-main">
                      <span className="post-version-item-title">{versionName(entry.version)}</span>
                      <span className="post-version-item-meta">
                        {entry.editedAt
                          ? t('{time} 更新为 v{next}', { time: formatScheduledAt(entry.editedAt), next: entry.version + 1 })
                          : lastEditedAt
                            ? t('{time} · 本版本 {likes} 赞', { time: formatScheduledAt(lastEditedAt), likes: currentVersionLikes(post) })
                            : localizeTime(post.time, language)}
                      </span>
                    </span>
                    {cert?.status === 'minted' && (
                      <span className="post-cert-badge">
                        <BadgeCheck size={12} strokeWidth={2.5} aria-hidden="true" />
                        {t('已确权')}
                      </span>
                    )}
                    {cert?.status === 'minting' && (
                      <span className="post-cert-badge post-cert-badge--neutral">{t('确权中')}</span>
                    )}
                    {cert?.status === 'revoked' && (
                      <span className="post-cert-badge post-cert-badge--revoked">{t('已撤销')}</span>
                    )}
                    <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
