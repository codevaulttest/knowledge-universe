import { ChevronRight, Crown, Info, Megaphone, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { bspRemainingDays, type BspInvestment } from '../bspConfig';
import { shortenAddress } from '../formatAddress';

export function BspRecordSummary({
  investments,
  onOpen,
  onOpenInvest,
}: {
  investments: BspInvestment[];
  onOpen: () => void;
  onOpenInvest: () => void;
}) {
  const { t } = useApp();
  const activeInvestmentCount = investments.filter(
    investment => investment.status === 'paid' && bspRemainingDays(investment.endDate) > 0,
  ).length;
  const hasRecords = investments.length > 0;

  return (
    <div className="planet-section bsp-record-summary-section">
      <button
        type="button"
        className="planet-node-card bsp-record-summary"
        onClick={hasRecords ? onOpen : onOpenInvest}
        aria-label={hasRecords ? t('查看全部投流记录', 'View all investments') : t('开始 BSP 巨星投流', 'Start BSP investment')}
      >
        <span className="bsp-record-summary-icon" aria-hidden>
          <Crown size={20} strokeWidth={2} />
        </span>
        <span className="bsp-record-summary-content">
          <span className="bsp-record-summary-title">{t('我的投流记录', 'My Investments')}</span>
          <span className="bsp-record-summary-meta">
            {hasRecords
              ? t(
                  `${activeInvestmentCount} 笔进行中 · 点击查看投流历史`,
                  `${activeInvestmentCount} active · View investment history`,
                )
              : t('暂无记录，点击开始投放', 'No records yet — tap to invest')}
          </span>
        </span>
        <span className="bsp-record-summary-action">
          {t(hasRecords ? '查看全部' : '去投放', hasRecords ? 'View all' : 'Invest')}
          <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
        </span>
      </button>
    </div>
  );
}

export function BspRecordList({
  investments,
  onOpenRules,
  onOpenInvest,
  onClose,
}: {
  investments: BspInvestment[];
  onOpenRules: () => void;
  onOpenInvest: () => void;
  onClose: () => void;
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
        <button type="button" className="back-btn" onClick={onClose} aria-label={t('关闭', 'Close')}>
          <X size={18} strokeWidth={2} />
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
  const paymentStatus = inv.status === 'paid'
    ? t('支付成功', 'Paid')
    : t('待支付', 'Pending');
  const paidPb = inv.paidPb.toLocaleString();
  const paidSup = inv.paidSup.toLocaleString();

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
        {t(`${inv.units.toLocaleString()} 个单位 · ${paidPb} PB`, `${inv.units.toLocaleString()} units · ${paidPb} PB`)}
      </span>

      <span className="bsp-record-target">
        {inv.beneficiaryKind === 'self'
          ? t('投给自己', 'For myself')
          : t(`投给 ${shortenAddress(inv.beneficiaryAddress)}`, `For ${shortenAddress(inv.beneficiaryAddress)}`)}
      </span>

      <div className="bsp-record-payment">
        <span>{t(`支付 ${paidPb} PB + ${paidSup} SUP`, `Paid ${paidPb} PB + ${paidSup} SUP`)}</span>
        <span className={`bsp-record-payment-status${inv.status === 'paid' ? ' bsp-record-payment-status--paid' : ''}`}>
          {paymentStatus}
        </span>
      </div>

      <span className="bsp-record-created-at">
        {t(`支付时间 ${inv.createdAt}`, `Paid at ${inv.createdAt}`)}
      </span>

      <div className="bsp-record-period">
        <span>{t(`生效期 ${inv.startDate} → ${inv.endDate}`, `Active ${inv.startDate} → ${inv.endDate}`)}</span>
        <span className="planet-section-badge">{t(`剩余 ${remaining} 天`, `${remaining}d left`)}</span>
      </div>

    </div>
  );
}
