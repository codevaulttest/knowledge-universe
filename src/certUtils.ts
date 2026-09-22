import { CURRENT_USER } from './mockData';
import type { KnowledgeCert, Post, RevokeReason } from './types';

/** 申请确权的点赞门槛 */
export const CERT_LIKES_THRESHOLD = 100;
/** 确权兑换费（PB，演示占位） */
export const CERT_EXCHANGE_FEE_PB = 50;
/** Gas 费（SUP，演示占位） */
export const CERT_GAS_FEE_SUP = 0.05;

export const currentVersion = (post: Pick<Post, 'version'>) => post.version ?? 1;

export const certForVersion = (certs: KnowledgeCert[], postId: string, version: number) =>
  certs.find(c => c.postId === postId && c.version === version);

/** 当前版本已确权（minted） */
export const isCurrentVersionCertified = (certs: KnowledgeCert[], post: Post) =>
  certForVersion(certs, post.id, currentVersion(post))?.status === 'minted';

/** 帖子有任意版本已确权：编辑时需要存版本 */
export const hasAnyMintedCert = (certs: KnowledgeCert[], postId: string) =>
  certs.some(c => c.postId === postId && c.status === 'minted');

/** 作者本人、满门槛、当前版本还没有任何证书时可申请 */
export const canApplyCert = (certs: KnowledgeCert[], post: Post) =>
  post.author === CURRENT_USER
  && post.likes >= CERT_LIKES_THRESHOLD
  && !certForVersion(certs, post.id, currentVersion(post));

export const REVOKE_REASON_KEYS: Record<RevokeReason, string> = {
  fake_likes: '存在异常点赞',
  content_violation: '内容违规',
  plagiarism: '内容抄袭',
  other: '其他违规',
};
