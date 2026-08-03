import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, ChevronRight, Copy, Gift, Info, QrCode, Wallet, Wallet2, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { getAirdropDeadline, MOCK_PB_AIRDROP_AMOUNT, MOCK_SUP_DEPOSIT_ADDRESS } from '../mockData';
import { formatSupAmount, formatTokenAmount } from '../stakeConfig';
import type { SupTransactionReason } from '../types';

const SUP_REASON_LABELS: Record<SupTransactionReason, [string, string]> = {
  recharge: ['充值', 'Recharge'],
  channel_open: ['开通频道', 'Open channel'],
  post: ['发布知识宇宙节点', 'Publish Knowledge Universe Node'],
  chain_unlock: ['解锁全文', 'Unlock full content'],
  repost: ['转发并创建子节点', 'Repost and create child node'],
  comment: ['评论并创建子节点', 'Comment and create child node'],
  share: ['转发并创建子节点', 'Repost and create child node'],
  like: ['点赞并创建子节点', 'Like and create child node'],
  dislike: ['踩并创建子节点', 'Dislike and create child node'],
  save: ['收藏并创建子节点', 'Save and create child node'],
  unlock: ['解锁并创建子节点', 'Unlock and create child node'],
  bsp_invest: ['BSP 巨星投流', 'BSP Big Star Plan'],
};

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** 剩余时间低于此阈值时切换为警告样式 */
const AIRDROP_WARNING_MS = 60 * 60 * 1000;
/** 剩余时间低于此阈值时切换为紧迫样式 */
const AIRDROP_URGENT_MS = 60 * 1000;

type AirdropCountdownTone = 'normal' | 'warning' | 'urgent';

function getAirdropCountdownTone(remainingMs: number, claimable: boolean): AirdropCountdownTone {
  if (!claimable) return 'normal';
  if (remainingMs <= AIRDROP_URGENT_MS) return 'urgent';
  if (remainingMs <= AIRDROP_WARNING_MS) return 'warning';
  return 'normal';
}

export function AssetOverviewCard() {
  const { t, walletConnected, pbBalance, supBalance, supHistory, airdropClaimed, claimAirdrop } = useApp();
  const [depositOpen, setDepositOpen] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pbInfoOpen, setPbInfoOpen] = useState(false);
  const [airdropRuleOpen, setAirdropRuleOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [deadlineStacked, setDeadlineStacked] = useState(false);
  const labelRef = useRef<HTMLSpanElement>(null);
  const deadlineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = getAirdropDeadline(now) - now;
  const airdropMissed = !airdropClaimed && remainingMs <= 0;
  const airdropClaimable = !airdropClaimed && !airdropMissed;
  const countdownTone = getAirdropCountdownTone(remainingMs, airdropClaimable);

  useEffect(() => {
    if (!airdropClaimable) {
      setDeadlineStacked(false);
      return;
    }

    const checkWrap = () => {
      const label = labelRef.current;
      const deadline = deadlineRef.current;
      if (!label || !deadline) return;
      setDeadlineStacked(deadline.offsetTop > label.offsetTop);
    };

    checkWrap();
    const observer = new ResizeObserver(checkWrap);
    const row = labelRef.current?.parentElement;
    if (row) observer.observe(row);
    if (labelRef.current) observer.observe(labelRef.current);
    if (deadlineRef.current) observer.observe(deadlineRef.current);

    return () => observer.disconnect();
  }, [airdropClaimable, remainingMs]);

  if (!walletConnected) return null;

  const copyDepositAddress = () => {
    navigator.clipboard.writeText(MOCK_SUP_DEPOSIT_ADDRESS).then(() => {
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 1800);
    });
  };

  return (
    <>
      <div className="asset-overview-card">
        <div className="asset-overview-airdrop-top">
          <div className="asset-overview-airdrop-left">
            <span className="asset-overview-airdrop-icon">
              <Gift size={20} strokeWidth={1.8} />
            </span>
            <div className="asset-overview-airdrop-info">
              <div className="asset-overview-airdrop-label-row">
                <span ref={labelRef} className="asset-overview-airdrop-label">
                  {t('待领取空投', 'Pending Airdrop')}
                </span>
                {airdropClaimable && (
                  <span
                    ref={deadlineRef}
                    className={`asset-overview-airdrop-deadline${deadlineStacked ? ' asset-overview-airdrop-deadline--stacked' : ''}${countdownTone === 'warning' ? ' asset-overview-airdrop-deadline--warning' : ''}${countdownTone === 'urgent' ? ' asset-overview-airdrop-deadline--urgent' : ''}`}
                  >
                    {!deadlineStacked && t('（剩 ', '(left ')}
                    {deadlineStacked && t('剩 ', 'left ')}
                    <span className={`asset-overview-action-countdown-time${countdownTone === 'warning' ? ' asset-overview-action-countdown-time--warning' : ''}${countdownTone === 'urgent' ? ' asset-overview-action-countdown-time--urgent' : ''}`}>{formatCountdown(remainingMs)}</span>
                    <button
                      type="button"
                      className="asset-overview-info-btn"
                      onClick={() => setAirdropRuleOpen(true)}
                      aria-label={t('查看空投规则', 'View airdrop rules')}
                    >
                      <Info size={13} strokeWidth={2} />
                    </button>
                    {!deadlineStacked && t('）', ')')}
                  </span>
                )}
              </div>
              {airdropClaimed ? (
                <span className="asset-overview-airdrop-badge">{t('今日已领取', 'Claimed today')}</span>
              ) : airdropMissed ? (
                <span className="asset-overview-airdrop-badge asset-overview-airdrop-badge--missed">
                  {t('今日已错过', 'Missed today')}
                  <button
                    type="button"
                    className="asset-overview-info-btn"
                    onClick={() => setAirdropRuleOpen(true)}
                    aria-label={t('查看空投规则', 'View airdrop rules')}
                  >
                    <Info size={13} strokeWidth={2} />
                  </button>
                </span>
              ) : (
                <div className="asset-overview-airdrop-amount">
                  {formatTokenAmount(MOCK_PB_AIRDROP_AMOUNT)}
                  <span className="asset-overview-airdrop-unit"> PB</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            className={`asset-overview-claim-btn${airdropClaimed || airdropMissed ? ' asset-overview-claim-btn--done' : ''}`}
            onClick={claimAirdrop}
            disabled={airdropClaimed || airdropMissed}
          >
            {airdropClaimed ? t('已领取', 'Claimed') : airdropMissed ? t('已错过', 'Missed') : t('领取空投', 'Claim Airdrop')}
          </button>
        </div>

        <button
          type="button"
          className="asset-overview-toggle-row"
          onClick={() => setPbInfoOpen(true)}
          aria-label={t('查看 PB 说明', 'View PB info')}
        >
          <span className="asset-overview-toggle-left">
            <span className="asset-overview-toggle-icon">
              <Wallet size={14} strokeWidth={2} />
            </span>
            <span>{t('PB 余额', 'PB Balance')}</span>
            <Info size={13} strokeWidth={2} className="asset-overview-toggle-chevron" />
          </span>
          <span className="asset-overview-toggle-right">
            <span className="asset-overview-toggle-balance">{formatTokenAmount(pbBalance)} PB</span>
          </span>
        </button>

        <div className="asset-overview-toggle-row asset-overview-toggle-row--split">
          <button
            type="button"
            className="asset-overview-toggle-row-inner"
            onClick={() => setHistoryOpen(true)}
            aria-label={t('查看 SUP 流水', 'View SUP transaction history')}
          >
            <span className="asset-overview-toggle-icon">
              <Wallet size={14} strokeWidth={2} />
            </span>
            <span className="asset-overview-toggle-content">
              <span className="asset-overview-toggle-label-row">
                <span className="asset-overview-toggle-label">{t('SUP 余额', 'SUP Balance')}</span>
                <span className="asset-overview-toggle-right">
                  <span className="asset-overview-toggle-balance">{formatSupAmount(supBalance)} SUP</span>
                  <ChevronRight size={13} strokeWidth={2} className="asset-overview-toggle-chevron" />
                </span>
              </span>
            </span>
          </button>
          <button
            type="button"
            className="asset-overview-recharge-btn"
            onClick={() => setDepositOpen(true)}
          >
            <Wallet2 size={12} strokeWidth={2.2} />
            {t('充值', 'Deposit')}
          </button>
        </div>
      </div>

      {depositOpen && (
        <div className="sheet-backdrop" onClick={() => setDepositOpen(false)}>
          <div
            className="payment-sheet sup-deposit-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('充值 SUP', 'Deposit SUP')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setDepositOpen(false)}
                aria-label={t('关闭', 'Close')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="sup-deposit-body">
              <div className="sup-deposit-warning">
                <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  {t(
                    '请确认转账网络为 Super AI Chain，充错网络资产将无法找回',
                    'Confirm the transfer network is Super AI Chain — assets sent on the wrong network cannot be recovered'
                  )}
                </span>
              </div>

              <p className="sup-deposit-hint">
                {t(
                  '使用任意钱包向以下地址转入 SUP，链上到账后自动计入站内余额',
                  'Transfer SUP to the address below from any wallet — it will be credited to your in-app balance once confirmed on-chain'
                )}
              </p>

              <div className="sup-deposit-qr" aria-hidden="true">
                <QrCode size={96} strokeWidth={1.2} />
              </div>

              <div className="sup-deposit-row">
                <span className="sup-deposit-label">{t('网络', 'Network')}</span>
                <span className="sup-deposit-value">Super AI Chain</span>
              </div>
              <div className="sup-deposit-row sup-deposit-row--address">
                <span className="sup-deposit-label">{t('充值地址', 'Deposit Address')}</span>
                <span className="sup-deposit-value sup-deposit-address">
                  {MOCK_SUP_DEPOSIT_ADDRESS}
                  <button
                    type="button"
                    className={`planet-node-copy-btn${addressCopied ? ' planet-node-copy-btn--done' : ''}`}
                    onClick={copyDepositAddress}
                    aria-label={t('复制地址', 'Copy address')}
                  >
                    {addressCopied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="sheet-backdrop" onClick={() => setHistoryOpen(false)}>
          <div
            className="payment-sheet sup-history-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('SUP 明细', 'SUP History')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setHistoryOpen(false)}
                aria-label={t('关闭', 'Close')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="sup-history-list">
              {supHistory.length === 0 ? (
                <div className="planet-history-empty">{t('暂无 SUP 流水', 'No SUP transactions yet')}</div>
              ) : supHistory.map(tx => {
                const isIn = tx.direction === 'in';
                const label = t(...SUP_REASON_LABELS[tx.reason]);
                return (
                  <div className="sup-history-row" key={tx.id}>
                    <span className={`sup-history-icon${isIn ? ' sup-history-icon--deposit' : ''}`}>
                      {isIn ? (
                        <ArrowDown size={14} strokeWidth={2} />
                      ) : (
                        <ArrowUp size={14} strokeWidth={2} />
                      )}
                    </span>
                    <span className="sup-history-desc">
                      {tx.time} · {label}
                    </span>
                    <span className={`sup-history-amount${isIn ? ' sup-history-amount--positive' : ''}`}>
                      {isIn ? '+' : '-'}
                      {formatSupAmount(tx.amount)} SUP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {pbInfoOpen && (
        <div className="sheet-backdrop" onClick={() => setPbInfoOpen(false)}>
          <div
            className="payment-sheet pb-info-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('PB 说明', 'About PB')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setPbInfoOpen(false)}
                aria-label={t('关闭', 'Close')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="pb-info-sheet-body">
              <p className="pb-info-sheet-para pb-info-sheet-heading">
                {t(
                  '关于知识宇宙"PB"的定义与核心机制说明',
                  'About the Definition and Core Mechanism of "PB" in Wisverse'
                )}
              </p>
              <p className="pb-info-sheet-para">
                {t(
                  '在知识宇宙生态中，PB（全称 Public Belief，即"公信力积分"）是贯穿整个数贸与节点网络的核心资产。其核心定义与运行规则如下：',
                  'In the Wisverse ecosystem, PB (Public Belief) is the core asset running through the entire data-trade and node network. Its core definition and rules are as follows:'
                )}
              </p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('本质定位：', 'Core positioning: ')}</strong>
                {t(
                  'PB 是对用户参与生态建设的贡献值计量单位，而非传统意义上的数字货币。',
                  'PB measures a user’s contribution to building the ecosystem — it is not a conventional digital currency.'
                )}
              </p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('获取机制（基于 AI 算法）：', 'Earning mechanism (AI-based): ')}</strong>
                {t(
                  '用户通过每日登录签到、发布优质作品、点赞转发互动以及链接推广等行为建设生态。系统通过 AI 算法对上述行为进行多维权重计算，最终以生态空投的形式将 PB 赠送给用户。',
                  'Users build the ecosystem through daily check-ins, publishing quality content, likes and reposts, and referral promotion. The system uses an AI algorithm to compute multi-dimensional weights for these behaviors and grants PB to users as an ecosystem airdrop.'
                )}
              </p>
              <p className="pb-info-sheet-para pb-info-sheet-subheading">{t('核心用途：', 'Core uses:')}</p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('解锁与待遇：', 'Unlocking and benefits: ')}</strong>
                {t(
                  '用于解锁频道高级功能、消耗订阅以链接子节点，并换取相应的生态权益与星级待遇。',
                  'Used to unlock advanced channel features, consumed for subscriptions that link sub-nodes, and exchanged for ecosystem benefits and star-tier treatment.'
                )}
              </p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('自由转让：', 'Free transfer: ')}</strong>
                {t(
                  '支持在生态网络内部进行用户间的自由转让与流通。',
                  'Supports free transfer and circulation between users within the ecosystem network.'
                )}
              </p>
              <p className="pb-info-sheet-para">
                <strong className="pb-info-sheet-label">{t('合规红线：', 'Compliance line: ')}</strong>
                {t(
                  '平台不做任何法币兑换的承诺。PB 的价值完全取决于生态内公信力的凝聚与应用场景的拓展，属于纯粹的生态功能性凭证。',
                  'The platform makes no promise of fiat conversion. The value of PB depends entirely on the cohesion of ecosystem trust and the expansion of use cases — it is a purely functional ecosystem credential.'
                )}
              </p>
              <div className="sup-deposit-warning">
                <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                <span>
                  {t(
                    '支持在生态网络内部进行用户间的自由转让与协作使用。平台严禁任何用户利用PB进行私下法币买卖或变相代币承兑，一经发现将对违规节点进行降星或封禁处理。',
                    'PB may be freely transferred and used collaboratively between users within the ecosystem network. The platform strictly prohibits any private fiat trading or disguised token redemption using PB — violating nodes will be de-starred or banned once discovered.'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {airdropRuleOpen && (
        <div className="sheet-backdrop" onClick={() => setAirdropRuleOpen(false)}>
          <div
            className="payment-sheet pb-info-sheet"
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span className="sheet-title">{t('空投规则', 'Airdrop Rules')}</span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setAirdropRuleOpen(false)}
                aria-label={t('关闭', 'Close')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="pb-info-sheet-body">
              <p className="pb-info-sheet-para">
                {t(
                  '需在北京时间当天 22:00 前点击"领取空投"，逾期未领取则本轮空投作废。',
                  'Tap "Claim Airdrop" before 22:00 Beijing time each day — if you miss the window, that day\'s airdrop is forfeited.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
