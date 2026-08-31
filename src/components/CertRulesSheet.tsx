import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '../AppContext';

/** 知识确权认证 —— 规则说明 */
export function CertRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('确权规则')}</span>
          <button className="back-btn bsp-rules-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="pb-info-sheet-body">
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('确权条件：')}</strong>
            {t('帖子获得 100 个赞后，自动铸造一份知识确权认证。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('上链记录：')}</strong>
            {t('认证包含证书编号、内容指纹、交易哈希等信息，永久记录在链上，不可篡改。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('回收机制：')}</strong>
            {t('经人工核查存在异常点赞的文章，其认证会被回收，状态变为已销毁。')}
          </p>

          <div className="sup-deposit-warning">
            <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t('认证一经回收无法恢复，请确保文章的点赞均来自真实互动。')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
