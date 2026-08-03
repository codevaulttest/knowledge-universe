import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '../AppContext';

/** BSP 巨星投流 —— 用户说明 */
export function BspRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('BSP 说明', 'BSP Guide')}</span>
          <button className="back-btn bsp-rules-close" onClick={onClose} aria-label={t('关闭', 'Close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="pb-info-sheet-body">
          <p className="pb-info-sheet-para pb-info-sheet-heading">
            {t(
              'BSP 大明星推广计划：频道推流功能介绍',
              'BSP Big Star Promotion Plan: Channel Distribution'
            )}
          </p>

          <p className="pb-info-sheet-para">
            {t(
              '频道推流功能是“BSP 大明星推广计划”中核心的高效引流与曝光工具。该功能旨在通过智能算法与跨平台分发机制，将创作者的频道内容精准投送到目标用户群体的核心信息流中，实现跨越式增长。',
              'Channel Distribution is the Big Star Promotion Plan’s core tool for efficient reach and visibility. Intelligent algorithms and cross-platform distribution deliver a creator’s channel content to the target audience’s main feed for faster growth.'
            )}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('全网智能引流：', 'Smart reach: ')}</strong>
            {t(
              '激活后，系统自动提取频道优质内容，通过 BSP 独有的流量矩阵进行跨平台、多渠道的精准推流，瞬间放大公域曝光。',
              'Once activated, the system selects quality channel content and uses BSP’s traffic matrix for precise cross-platform, multi-channel distribution that expands public reach.'
            )}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('精准人群画像匹配：', 'Precise audience matching: ')}</strong>
            {t(
              '依托 AI 算法对用户行为深度建模，将您的频道推送到最具付费潜力和高粘性的目标受众面前，确保流量转化为实打实的粉丝与订阅。',
              'AI models user behaviour to place your channel before audiences with strong potential and engagement, helping turn reach into followers and subscriptions.'
            )}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('高效漏斗转化：', 'Efficient conversion: ')}</strong>
            {t(
              '缩短用户发现到关注的路径。推流动作直接指向频道主页或特定宣发入口，优先拉低用户的转化门槛，实现低成本、高效率的粉丝留存。',
              'It shortens the path from discovery to following. Distribution leads directly to the channel homepage or a campaign entry, reducing friction for cost-effective follower retention.'
            )}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('实时数据反哺：', 'Real-time data feedback: ')}</strong>
            {t(
              '动态追踪推流期间的曝光量、点击率及转化率，为您后续的内容迭代与运营策略提供精准的数据支撑。',
              'It dynamically tracks views, click-through rate, and conversion rate to support future content iteration and operating decisions.'
            )}
          </p>

          <div className="sup-deposit-warning">
            <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
            <span>
              {t(
                '作为“大明星推广计划”的流量发动机，频道推流功能将彻底打破自然增长的瓶颈，助力创作者快速构建专属的私域价值阵地。',
                'As the Big Star Promotion Plan’s traffic engine, Channel Distribution helps creators break through natural-growth limits and build their own high-value audience base.'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
