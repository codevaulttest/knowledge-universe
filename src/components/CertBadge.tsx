import { BadgeCheck, Check, Loader, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { certForVersion, currentVersion } from '../certUtils';
import type { Post } from '../types';

/**
 * 帖子作者行的确权徽章，按当前版本判断：
 * 当前版本已确权 → 已确权；当前版本确权中（仅作者可见）→ 确权中；当前版本已撤销 → 已撤销；
 * 当前版本没有认证但旧版本已确权 → vN 已确权。
 */
export function CertBadge({ post, isOwn }: { post: Post; isOwn: boolean }) {
  const { t, navigate, knowledgeCerts } = useApp();
  const version = currentVersion(post);
  const current = certForVersion(knowledgeCerts, post.id, version);
  const pastMinted = knowledgeCerts
    .filter(c => c.postId === post.id && c.version < version && c.status === 'minted')
    .sort((a, b) => b.version - a.version)[0];
  const open = (certId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate({ page: 'P_CERT', certId });
  };

  if (current?.status === 'minted') {
    return (
      <button type="button" className="post-cert-badge" aria-label={t('已确权 · 查看认证证书')} onClick={open(current.id)}>
        <span className="post-cert-badge-mark" aria-hidden="true">
          <BadgeCheck className="post-cert-badge-icon" aria-hidden="true" />
          <Check className="post-cert-badge-check" strokeWidth={4.5} aria-hidden="true" />
        </span>
        <span className="post-cert-badge-text">{t('已确权')}</span>
      </button>
    );
  }
  if (current?.status === 'minting' && isOwn) {
    return (
      <button type="button" className="post-cert-badge post-cert-badge--neutral" aria-label={t('确权中 · 查看认证进度')} onClick={open(current.id)}>
        <Loader size={12} strokeWidth={2.5} aria-hidden="true" />
        <span className="post-cert-badge-text">{t('确权中')}</span>
      </button>
    );
  }
  if (current?.status === 'revoked') {
    return (
      <button type="button" className="post-cert-badge post-cert-badge--revoked" aria-label={t('认证已撤销 · 查看详情')} onClick={open(current.id)}>
        <span className="post-cert-badge-mark" aria-hidden="true">
          <BadgeCheck className="post-cert-badge-icon" aria-hidden="true" />
          <X className="post-cert-badge-check" strokeWidth={4.5} aria-hidden="true" />
        </span>
        <span className="post-cert-badge-text">{t('已撤销')}</span>
      </button>
    );
  }
  if (pastMinted) {
    const label = t('v{version} 已确权', { version: pastMinted.version });
    return (
      <button type="button" className="post-cert-badge post-cert-badge--neutral" aria-label={`${label} · ${t('查看认证证书')}`} onClick={open(pastMinted.id)}>
        <BadgeCheck size={12} strokeWidth={2.5} aria-hidden="true" />
        <span className="post-cert-badge-text">{label}</span>
      </button>
    );
  }
  return null;
}
