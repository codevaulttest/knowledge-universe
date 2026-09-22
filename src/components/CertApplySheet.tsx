import { BadgeCheck } from 'lucide-react';
import { useApp } from '../AppContext';
import { currentVersion } from '../certUtils';
import type { Post } from '../types';

/** 申请确权：居中确认弹窗（沿用连接钱包弹窗的样式），确认即提交，认证由平台发出，进入「确权中」。实名认证和费用后续版本再加 */
export function CertApplySheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const { t, applyCert } = useApp();
  const version = currentVersion(post);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="connect-wallet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cert-apply-title"
        aria-describedby="cert-apply-message"
        onClick={e => e.stopPropagation()}
      >
        <div className="connect-wallet-modal-hero">
          <div className="connect-wallet-modal-icon" aria-hidden="true">
            <BadgeCheck size={26} strokeWidth={2.2} />
          </div>
          <h2 className="connect-wallet-modal-title" id="cert-apply-title">
            {t('为 v{version} 申请确权', { version })}
          </h2>
          <p className="connect-wallet-modal-message" id="cert-apply-message">
            {t('内容指纹和作者信息将永久记录在链上，认证绑定 v{version}。之后修改帖子会生成新版本，新版本重新累计满 100 赞后可以单独申请。', { version })}
          </p>
        </div>
        <div className="connect-wallet-modal-actions">
          <button type="button" className="planet-confirm-btn" onClick={() => { applyCert(post.id); onClose(); }}>
            {t('确认申请')}
          </button>
          <button type="button" className="gemini-stake-btn gemini-stake-btn--ghost" onClick={onClose}>
            {t('取消')}
          </button>
        </div>
      </div>
    </div>
  );
}
