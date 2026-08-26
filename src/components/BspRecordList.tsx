import { ChevronRight, Crown, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../AppContext';
import { BSP_UNIT_PB, bspInvestmentStatus, bspRemainingDays, type BspInvestment, type BspInvestmentStatus } from '../bspConfig';

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
        aria-label={hasRecords ? t('查看全部投流记录') : t('开始 BSP 巨星投流')}
      >
        <span className="bsp-record-summary-icon" aria-hidden>
          <Crown size={20} strokeWidth={2} />
        </span>
        <span className="bsp-record-summary-content">
          <span className="bsp-record-summary-title">{t('我的投流记录')}</span>
          <span className="bsp-record-summary-meta">
            {hasRecords
              ? t('{activeInvestmentCount} 笔进行中', { activeInvestmentCount })
              : t('暂无记录，点击开始投放')}
          </span>
        </span>
        <span className="bsp-record-summary-action">
          {hasRecords ? t('查看全部') : t('去投放')}
          <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
        </span>
      </button>
    </div>
  );
}

type BspRecordDirection = 'given' | 'received';

export function BspRecordList({
  investments,
  myAddress,
  onOpenInvest,
  onClose,
}: {
  investments: BspInvestment[];
  myAddress: string;
  onOpenInvest: () => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  const given = investments.filter(inv => inv.investorAddress === myAddress);
  const received = investments.filter(inv => inv.investorAddress !== myAddress && inv.beneficiaryAddress === myAddress);
  const [direction, setDirection] = useState<BspRecordDirection>('given');
  const activeList = direction === 'given' ? given : received;

  return (
    <div className="planet-section">
      <div className="planet-section-header">
        <span className="planet-section-title">{t('我的投流记录')}</span>
        <button type="button" className="back-btn bsp-record-list-close" onClick={onClose} aria-label={t('关闭')}>
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="create-scale-toggle bsp-record-tabs" role="tablist" aria-label={t('投流记录')}>
        <button
          type="button"
          role="tab"
          aria-selected={direction === 'given'}
          className={`create-scale-tab${direction === 'given' ? ' create-scale-tab--active' : ''}`}
          onClick={() => setDirection('given')}
        >
          {t('我的投放')}
          <span className="bsp-record-tab-badge">{given.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={direction === 'received'}
          className={`create-scale-tab${direction === 'received' ? ' create-scale-tab--active' : ''}`}
          onClick={() => setDirection('received')}
        >
          {t('收到的投放')}
          <span className="bsp-record-tab-badge">{received.length}</span>
        </button>
      </div>

      {activeList.length === 0 ? (
        <div className="planet-nodes-empty" data-layer="bsp-empty">
          <Crown width={40} height={40} strokeWidth={1.5} className="planet-nodes-empty-icon" />
          <span className="planet-nodes-empty-title">
            {direction === 'given' ? t('还没有投流记录') : t('还没有收到别人的投流')}
          </span>
          {direction === 'given' && (
            <>
              <p className="planet-nodes-empty-text">
                {t('点击「BSP 巨星投流」开始你的第一笔投放')}
              </p>
              <button type="button" className="planet-nodes-empty-link" onClick={onOpenInvest}>
                {t('去投放')}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="planet-node-list">
          {activeList.map(inv => (
            <BspRecordCard key={inv.id} investment={inv} direction={direction} />
          ))}
        </div>
      )}
    </div>
  );
}

function BspStatusBadge({ status }: { status: BspInvestmentStatus }) {
  const { t } = useApp();
  const label = status === 'active' ? t('生效中') : status === 'pending' ? t('待生效') : t('已结束');
  return (
    <span className={`bsp-record-status-badge bsp-record-status-badge--${status}`}>{label}</span>
  );
}

function BspRecordCard({ investment: inv, direction }: { investment: BspInvestment; direction: BspRecordDirection }) {
  const { t } = useApp();
  const paidPb = inv.paidPb.toLocaleString();
  const paidSup = inv.paidSup.toLocaleString();
  const status = bspInvestmentStatus(inv);

  return (
    <div className="planet-node-card planet-node-card--tagged bsp-record-card">
      {direction === 'given' ? (
        inv.beneficiaryKind === 'self' ? (
          <span className="planet-node-origin-tag planet-node-origin-tag--bsp-self">
            <Crown size={12} strokeWidth={2.5} aria-hidden />
            {t('投给自己')}
          </span>
        ) : (
          <span className="planet-node-origin-tag planet-node-origin-tag--bsp-proxy">
            <Crown size={12} strokeWidth={2.5} aria-hidden />
            {t('投给他人')}
          </span>
        )
      ) : (
        <span className="planet-node-origin-tag planet-node-origin-tag--bsp-proxy">
          <Crown size={12} strokeWidth={2.5} aria-hidden />
          {t('别人代投')}
        </span>
      )}

      <BspStatusBadge status={status} />

      <div className="bsp-record-primary-row">
        <span className="bsp-record-label">{t('本次投流')}</span>
        <span className="bsp-record-headline">{paidPb} PB</span>
      </div>

      <div className="bsp-record-detail-row bsp-record-detail-row--address">
        <span className="bsp-record-label">{direction === 'given' ? t('投放对象') : t('投放方')}</span>
        <span className="bsp-record-value bsp-record-value--address">
          {direction === 'given' ? inv.beneficiaryAddress : inv.investorAddress}
        </span>
      </div>

      <div className="bsp-record-detail-row">
        <span className="bsp-record-label">{t('Gas 费')}</span>
        <span className="bsp-record-value">{paidSup} SUP</span>
      </div>

      <div className="bsp-record-detail-row">
        <span className="bsp-record-label">{t('投放时间')}</span>
        <span className="bsp-record-value">{inv.createdAt}</span>
      </div>

      <div className="bsp-record-detail-row">
        <span className="bsp-record-label">{t('生效期')}</span>
        <span className="bsp-record-value bsp-record-period-dates">{inv.startDate} → {inv.endDate}</span>
      </div>

    </div>
  );
}
