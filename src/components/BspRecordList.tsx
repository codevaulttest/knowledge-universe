import { CircleCheckBig, CircleSlash, Info, Megaphone } from 'lucide-react';
import { useApp } from '../AppContext';
import { bspRemainingDays, type BspInvestment } from '../bspConfig';
import { shortenAddress } from '../formatAddress';
import { formatTokenAmount } from '../stakeConfig';

export function BspRecordList({
  investments,
  onOpenRules,
  onOpenInvest,
}: {
  investments: BspInvestment[];
  onOpenRules: () => void;
  onOpenInvest: () => void;
}) {
  const { t } = useApp();

  return (
    <div className="planet-section">
      <div className="planet-section-header">
        <span className="planet-section-title">{t('我的投流记录', 'My Investments')}</span>
        <span className="planet-section-badge">{investments.length}</span>
        <button type="button" className="planet-node-transfer-entry" onClick={onOpenRules}>
          <Info size={13} strokeWidth={2.2} aria-hidden />
          {t('保底说明', 'Floor rules')}
        </button>
      </div>

      {investments.length === 0 ? (
        <div className="planet-nodes-empty" data-layer="bsp-empty">
          <Megaphone width={40} height={40} strokeWidth={1.5} className="planet-nodes-empty-icon" />
          <span className="planet-nodes-empty-title">{t('还没有投流记录', 'No investments yet')}</span>
          <p className="planet-nodes-empty-text">
            {t('点击「BSP 巨星投流」开始你的第一笔投放', 'Tap "BSP Big Star Plan" to make your first one')}
          </p>
          <button type="button" className="planet-nodes-empty-link" onClick={onOpenInvest}>
            {t('去投放', 'Invest now')}
          </button>
        </div>
      ) : (
        <div className="planet-node-list">
          {investments.map(inv => (
            <BspRecordCard key={inv.id} investment={inv} />
          ))}
        </div>
      )}
    </div>
  );
}

function BspRecordCard({ investment: inv }: { investment: BspInvestment }) {
  const { t } = useApp();
  const remaining = bspRemainingDays(inv.endDate);
  const guarantee = inv.units * 3;
  const settlement = inv.lastSettlement;

  return (
    <div className="planet-node-card planet-node-card--tagged bsp-record-card">
      {inv.beneficiaryKind === 'self' ? (
        <span className="planet-node-origin-tag planet-node-origin-tag--bsp-self">
          <Megaphone size={12} strokeWidth={2.5} aria-hidden />
          {t('自投', 'Self')}
        </span>
      ) : (
        <span className="planet-node-origin-tag planet-node-origin-tag--bsp-proxy">
          <Megaphone size={12} strokeWidth={2.5} aria-hidden />
          {t('代投', 'For others')}
        </span>
      )}

      <span className="bsp-record-headline">
        {t(`${inv.units.toLocaleString()} 个单位 · ${formatTokenAmount(inv.paidPb)} PB`, `${inv.units.toLocaleString()} units · ${formatTokenAmount(inv.paidPb)} PB`)}
      </span>

      <span className="bsp-record-target">
        {inv.beneficiaryKind === 'self'
          ? t('投给自己', 'For myself')
          : t(`投给 ${shortenAddress(inv.beneficiaryAddress)}`, `For ${shortenAddress(inv.beneficiaryAddress)}`)}
      </span>

      <div className="bsp-record-period">
        <span>{t(`生效期 ${inv.startDate} → ${inv.endDate}`, `Active ${inv.startDate} → ${inv.endDate}`)}</span>
        <span className="planet-section-badge">{t(`剩余 ${remaining} 天`, `${remaining}d left`)}</span>
      </div>

      <div className="bsp-record-guarantee">
        {t('每日打赏保底 ', 'Daily floor ')}
        <b>{formatTokenAmount(guarantee)} PB</b>
      </div>

      {settlement && (
        <div className="bsp-record-settle">
          <div className="bsp-record-settle-title">
            {t(`昨日结算（${settlement.date}）`, `Yesterday's settlement (${settlement.date})`)}
          </div>
          <div className="planet-upgrade-row">
            <span className="planet-upgrade-row-label">{t('发帖状态', 'Post status')}</span>
            {settlement.posted ? (
              <span className="bsp-record-posted">
                <CircleCheckBig size={14} strokeWidth={2.2} aria-hidden />
                {t('已发帖', 'Posted')}
              </span>
            ) : (
              <span className="bsp-record-posted bsp-record-posted--missed">
                <CircleSlash size={14} strokeWidth={2.2} aria-hidden />
                {t('未发帖 · 当日无保底', 'No post — no floor that day')}
              </span>
            )}
          </div>
          <div className="planet-upgrade-row">
            <span className="planet-upgrade-row-label">{t('实得打赏', 'Tips received')}</span>
            <span className="planet-upgrade-row-value">{formatTokenAmount(settlement.tipsNet)} PB</span>
          </div>
          <div className="planet-upgrade-row">
            <span className="planet-upgrade-row-label">{t('系统补贴', 'System top-up')}</span>
            {settlement.topUp > 0 ? (
              <span className="bsp-record-topup">+{formatTokenAmount(settlement.topUp)} PB</span>
            ) : settlement.posted ? (
              <span className="planet-upgrade-row-value">{t('已超保底，无需补贴', 'Above the floor')}</span>
            ) : (
              <span className="planet-upgrade-row-value">{t('无保底', 'No floor')}</span>
            )}
          </div>
          <div className="planet-upgrade-row">
            <span className="planet-upgrade-row-label">{t('当日合计', 'Day total')}</span>
            <span className="planet-upgrade-row-value">{formatTokenAmount(settlement.tipsNet + settlement.topUp)} PB</span>
          </div>
        </div>
      )}
    </div>
  );
}
