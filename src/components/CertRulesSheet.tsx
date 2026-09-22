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
            <strong className="pb-info-sheet-label">{t('申请条件：')}</strong>
            {t('帖子获得 100 个赞后，作者可以申请确权；完成实名认证和确权兑换、签名授权后开始铸造。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('上链记录：')}</strong>
            {t('认证包含证书编号、内容指纹、交易哈希等信息，永久记录在链上，不可篡改。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('按版本确权：')}</strong>
            {t('认证绑定申请时的帖子版本。修改已确权的帖子会生成新版本，原版本和认证一起保留，读者可以点版本号查看；新版本可以单独申请确权。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('查看位置：')}</strong>
            {t('打开个人主页，在“帖子”中选择“已确权”，即可查看已确权的帖子。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('撤销机制：')}</strong>
            {t('经人工核查存在异常点赞、内容违规或抄袭的帖子，认证会被撤销，链上保留撤销时间和原因。认证以申请时的状态为准，之后赞数回落时认证继续有效。')}
          </p>

          <div className="sup-deposit-warning">
            <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
            <span>{t('认证一经撤销无法恢复，请确保帖子内容原创、点赞来自真实互动。')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
