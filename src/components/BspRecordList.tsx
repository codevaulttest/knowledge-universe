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

type BspRecordBeneficiary = 'others' | 'mine';

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
  const investedInOthers = investments.filter(
    inv => inv.investorAddress === myAddress && inv.beneficiaryAddress !== myAddress,
  );
  const investedForMe = investments.filter(inv => inv.beneficiaryAddress === myAddress);
  const [beneficiary, setBeneficiary] = useState<BspRecordBeneficiary>('mine');
  const activeList = beneficiary === 'others' ? investedInOthers : investedForMe;

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
          aria-selected={beneficiary === 'mine'}
          className={`create-scale-tab${beneficiary === 'mine' ? ' create-scale-tab--active' : ''}`}
          onClick={() => setBeneficiary('mine')}
        >
          {t('投流给我')}
          <span className="bsp-record-tab-badge">{investedForMe.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={beneficiary === 'others'}
          className={`create-scale-tab${beneficiary === 'others' ? ' create-scale-tab--active' : ''}`}
          onClick={() => setBeneficiary('others')}
        >
          {t('投流他人')}
          <span className="bsp-record-tab-badge">{investedInOthers.length}</span>
        </button>
      </div>

      {activeList.length === 0 ? (
        <div className="planet-nodes-empty" data-layer="bsp-empty">
          <Crown width={40} height={40} strokeWidth={1.5} className="planet-nodes-empty-icon" />
          <span className="planet-nodes-empty-title">
            {beneficiary === 'others' ? t('还没有投流他人的记录') : t('还没有投流给你的记录')}
          </span>
          {beneficiary === 'others' && (
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
            <BspRecordCard key={inv.id} investment={inv} beneficiary={beneficiary} />
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

function BspRecordCard({ investment: inv, beneficiary }: { investment: BspInvestment; beneficiary: BspRecordBeneficiary }) {
  const { t } = useApp();
  const paidPb = inv.paidPb.toLocaleString();
  const status = bspInvestmentStatus(inv);

  return (
    <div className="planet-node-card planet-node-card--tagged bsp-record-card">
      {beneficiary === 'mine' && (inv.investorAddress === inv.beneficiaryAddress ? (
        <span className="planet-node-origin-tag planet-node-origin-tag--bsp-self">
          <Crown size={12} strokeWidth={2.5} aria-hidden />
          {t('自投')}
        </span>
      ) : (
        <span className="planet-node-origin-tag planet-node-origin-tag--bsp-proxy">
          <Crown size={12} strokeWidth={2.5} aria-hidden />
          {t('别人投给我')}
        </span>
      ))}

      <BspStatusBadge status={status} />

      <div className="bsp-record-primary-row">
        <span className="bsp-record-label">{t('本次投流')}</span>
        <span className="bsp-record-headline">{paidPb} PB</span>
      </div>

      <div className="bsp-record-detail-row bsp-record-detail-row--address">
        <span className="bsp-record-label">{beneficiary === 'others' ? t('投放对象') : t('投放方')}</span>
        <span className="bsp-record-value bsp-record-value--address">
          {beneficiary === 'others' ? inv.beneficiaryAddress : inv.investorAddress}
        </span>
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
