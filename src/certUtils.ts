import { CURRENT_USER } from './mockData';
import type { KnowledgeCert, Post, RevokeReason } from './types';

/** 申请确权的点赞门槛 */
export const CERT_LIKES_THRESHOLD = 100;

export const currentVersion = (post: Pick<Post, 'version'>) => post.version ?? 1;

/** 当前版本获得的赞数：新版本从 0 重新累计 */
export const currentVersionLikes = (post: Pick<Post, 'likes' | 'versionStartLikes'>) =>
  Math.max(0, post.likes - (post.versionStartLikes ?? 0));

export const certForVersion = (certs: KnowledgeCert[], postId: string, version: number) =>
  certs.find(c => c.postId === postId && c.version === version);

/** 当前版本已确权（minted） */
export const isCurrentVersionCertified = (certs: KnowledgeCert[], post: Post) =>
  certForVersion(certs, post.id, currentVersion(post))?.status === 'minted';

/** 帖子有任意版本申请过确权（确权中 / 已确权 / 已撤销）：编辑时需要存版本，保证认证对应的内容不被覆盖 */
export const hasAnyCert = (certs: KnowledgeCert[], postId: string) =>
  certs.some(c => c.postId === postId);

/** 作者本人、当前版本满门槛、当前版本还没有任何证书时可申请 */
export const canApplyCert = (certs: KnowledgeCert[], post: Post) =>
  post.author === CURRENT_USER
  && currentVersionLikes(post) >= CERT_LIKES_THRESHOLD
  && !certForVersion(certs, post.id, currentVersion(post));

export const REVOKE_REASON_KEYS: Record<RevokeReason, string> = {
  fake_likes: '存在异常点赞',
  content_violation: '内容违规',
  plagiarism: '内容抄袭',
  other: '其他违规',
};
