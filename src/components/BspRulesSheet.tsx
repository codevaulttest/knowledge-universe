import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '../AppContext';

/** BSP 巨星投流 —— 用户说明 */
export function BspRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('BSP 说明')}</span>
          <button className="back-btn bsp-rules-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="pb-info-sheet-body">
          <p className="pb-info-sheet-para pb-info-sheet-heading">
            {t('BSP 巨星投流计划：频道推流功能介绍')}
          </p>

          <p className="pb-info-sheet-para">
            {t('频道推流功能是“BSP 巨星投流计划”中核心的高效引流与曝光工具。该功能旨在通过智能算法与跨平台分发机制，将创作者的频道内容精准投送到目标用户群体的核心信息流中，实现跨越式增长。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('全网智能引流：')}</strong>
            {t('激活后，系统自动提取频道优质内容，通过 BSP 独有的流量矩阵进行跨平台、多渠道的精准推流，瞬间放大公域曝光。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('精准人群画像匹配：')}</strong>
            {t('依托 AI 算法对用户行为深度建模，将您的频道推送到最具付费潜力和高粘性的目标受众面前，确保流量转化为实打实的粉丝与订阅。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('高效漏斗转化：')}</strong>
            {t('缩短用户发现到关注的路径。推流动作直接指向频道主页或特定宣发入口，优先拉低用户的转化门槛，实现低成本、高效率的粉丝留存。')}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('实时数据反哺：')}</strong>
            {t('动态追踪推流期间的曝光量、点击率及转化率，为您后续的内容迭代与运营策略提供精准的数据支撑。')}
          </p>

          <div className="sup-deposit-warning">
            <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
            <span>
              {t('作为“巨星投流计划”的流量发动机，频道推流功能将彻底打破自然增长的瓶颈，助力创作者快速构建专属的私域价值阵地。')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
