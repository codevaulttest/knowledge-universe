import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownToLine, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { PageHeader } from '../components/shared';

const ADN_PERIOD = 204;
const ADN_PROGRESS = 70;
const ADN_PROGRESS_INCREMENT = 0.00001;
const ADN_BALANCE = 116;
type AdnHoldingStatus = 'unfinished' | 'completed' | 'frozen';

const ADN_HOLDINGS = [
  { period: 204, holdingPeriod: 100, progress: 70, amount: 79, createdAt: '2026-09-01', distributed: 0, nextDistribution: 1580, status: 'unfinished' },
  { period: 201, holdingPeriod: 97, progress: 35, amount: 45, createdAt: '2026-06-15', distributed: 0, nextDistribution: 860, status: 'unfinished' },
  { period: 198, holdingPeriod: 94, progress: 12, amount: 20, createdAt: '2026-05-02', distributed: 0, nextDistribution: 410, status: 'unfinished' },
  { period: 203, holdingPeriod: 99, progress: 100, amount: 37, createdAt: '2026-08-01', distributed: 740, nextDistribution: null, status: 'completed' },
  { period: 200, holdingPeriod: 96, progress: 100, amount: 58, createdAt: '2026-06-01', distributed: 1160, nextDistribution: null, status: 'completed' },
  { period: 197, holdingPeriod: 93, progress: 100, amount: 24, createdAt: '2026-04-01', distributed: 480, nextDistribution: null, status: 'completed' },
  { period: 202, holdingPeriod: 98, progress: 100, amount: 12, createdAt: '2026-07-01', distributed: 0, nextDistribution: null, status: 'frozen' },
  { period: 199, holdingPeriod: 95, progress: 100, amount: 6, createdAt: '2026-05-15', distributed: 0, nextDistribution: null, status: 'frozen' },
] as const;

function formatAmount(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

type AdnInfo = { title: string; description: string };

function AdnInfoLabel({ id, label, description, labelClassName = 'adn-section-label', onOpen }: { id?: string; label: string; description: string; labelClassName?: string; onOpen: (info: AdnInfo) => void }) {
  return (
    <button type="button" id={id} className={`${labelClassName} adn-info-trigger`} onClick={() => onOpen({ title: label, description })}>
      {label}
    </button>
  );
}

/** ADN 演示首页：优点仅作为入口，不参与 ADN 与 FEC 的余额换算。 */
export function AdnPage() {
  const { adnWithdrawableFec, withdrawAdnFec, requireWallet, goBack, canGoBack, showToast, t } = useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [infoSheet, setInfoSheet] = useState<AdnInfo | null>(null);
  const [adnProgress, setAdnProgress] = useState(ADN_PROGRESS);
  const [holdingTab, setHoldingTab] = useState<AdnHoldingStatus>('unfinished');
  const visibleHoldings = ADN_HOLDINGS.filter(holding => holding.status === holdingTab);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAdnProgress(currentProgress => Math.min(currentProgress + ADN_PROGRESS_INCREMENT, 100));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const requestWithdraw = () => {
    requireWallet(() => {
      if (adnWithdrawableFec <= 0) {
        showToast(t('暂无可提取 FEC'));
        return;
      }
      setConfirmOpen(true);
    });
  };

  const confirmWithdraw = () => {
    if (!withdrawAdnFec()) return;
    setConfirmOpen(false);
    showToast(t('FEC 已提取到账'));
  };

  return (
    <div className="page adn-page">
      <PageHeader className="adn-page-header" title={t('我的 ADN')} onBack={canGoBack ? goBack : undefined} />

      <main className="adn-scroll-area">
        <section className="adn-period-card" aria-label={t('当前期数')}>
          <AdnInfoLabel label={t('当前期数')} description={t('about_period_description')} labelClassName="adn-period-label" onOpen={setInfoSheet} />
          <div className="adn-period-number">#{ADN_PERIOD}</div>
          <div className="adn-progress-row">
            <AdnInfoLabel label={t('本期进度')} description={t('about_progress_description')} labelClassName="adn-progress-caption" onOpen={setInfoSheet} />
            <span className="adn-progress-value">{adnProgress.toFixed(8)}%</span>
          </div>
          <div className="adn-progress-track" aria-hidden="true">
            <span className="adn-progress-fill" style={{ width: `${adnProgress}%` }} />
          </div>
        </section>

        <section className={`adn-fec-card${adnWithdrawableFec <= 0 ? ' adn-fec-card--empty' : ''}`} aria-labelledby="adn-fec-title">
          <div className="adn-fec-card-top">
            <div>
              <AdnInfoLabel id="adn-fec-title" label={t('可提取 FEC')} description={t('about_fec_withdrawable_description')} onOpen={setInfoSheet} />
              <strong className="adn-fec-amount">{formatAmount(adnWithdrawableFec)}</strong>
            </div>
          </div>
          {adnWithdrawableFec <= 0 && <p className="adn-fec-note">{t('本期 FEC 已提取')}</p>}
          <button type="button" className="adn-withdraw-btn" onClick={requestWithdraw} disabled={adnWithdrawableFec <= 0}>
            <ArrowDownToLine size={18} strokeWidth={2.2} aria-hidden="true" />
            {adnWithdrawableFec > 0 ? t('提取') : t('已提取')}
          </button>
        </section>

        <section className="adn-holdings" aria-labelledby="adn-holdings-title">
          <div className="adn-holdings-head">
            <AdnInfoLabel id="adn-holdings-title" label={t('ADN 持仓')} description={t('about_adn_holding_description')} onOpen={setInfoSheet} />
            <span className="adn-holdings-total"><strong>{ADN_BALANCE}</strong> ADN</span>
          </div>
          <nav className="adn-holdings-tabs" role="tablist" aria-label={t('ADN 持仓筛选')}>
            {(['unfinished', 'completed', 'frozen'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={holdingTab === tab}
                className={`adn-holdings-tab${holdingTab === tab ? ' adn-holdings-tab--active' : ''}`}
                onClick={() => setHoldingTab(tab)}
              >
                {t(tab === 'unfinished' ? '未完成' : tab === 'completed' ? '已完成' : '已冻结')}
              </button>
            ))}
          </nav>
          <div className="adn-holding-list">
            {visibleHoldings.map(holding => (
              <article className="adn-holding-card" key={holding.period} aria-label={t('第 {period} 期 ADN 持仓', { period: holding.period })}>
                <div className="adn-holding-progress" style={{ '--adn-holding-progress': `${holding.progress}%` } as CSSProperties} aria-hidden="true">
                  <div className="adn-holding-progress-inner">
                    <span>{t('期数')}</span>
                    <strong>#{holding.holdingPeriod}</strong>
                  </div>
                </div>
                <div className="adn-holding-detail">
                  <div className="adn-holding-topline">
                    <div className="adn-holding-amount"><strong>{holding.amount}</strong><span>ADN</span></div>
                    <span className={`adn-holding-status adn-holding-status--${holding.status}`}>{t(holding.status === 'unfinished' ? '进行中' : holding.status === 'completed' ? '已完成' : '已冻结')}</span>
                  </div>
                  <span className="adn-holding-created">{t('创建时间')} {holding.createdAt}</span>
                  <div className="adn-holding-metrics">
                    <div className="adn-holding-metric-box adn-holding-metric-box--filled">
                      <span>{t('已发放')}</span>
                      <strong>{formatAmount(holding.distributed)} <em>FEC</em></strong>
                    </div>
                    <div className="adn-holding-metric-box adn-holding-metric-box--outline">
                      <span>{t('预计下期')}</span>
                      <strong className={holding.nextDistribution === null ? 'adn-holding-metric-muted' : ''}>{holding.nextDistribution === null ? '—' : `+${formatAmount(holding.nextDistribution)}`} {holding.nextDistribution !== null && <em>FEC</em>}</strong>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {confirmOpen && createPortal(
        <div className="sheet-backdrop adn-sheet-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="adn-confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="adn-confirm-title" onClick={event => event.stopPropagation()}>
            <div className="adn-confirm-head">
              <span id="adn-confirm-title" className="adn-confirm-title">{t('确认提取 FEC')}</span>
              <button type="button" className="adn-confirm-close" onClick={() => setConfirmOpen(false)} aria-label={t('关闭')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="adn-confirm-amount"><CheckCircle2 size={22} strokeWidth={2.1} aria-hidden="true" /> {formatAmount(adnWithdrawableFec)} FEC</div>
            <p className="adn-confirm-copy">{t('确认后将把当前可提取 FEC 全部记入你的账户')}</p>
            <div className="adn-confirm-actions">
              <button type="button" className="adn-confirm-cancel" onClick={() => setConfirmOpen(false)}>{t('取消')}</button>
              <button type="button" className="adn-confirm-submit" onClick={confirmWithdraw}>{t('确认提取')}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {infoSheet && createPortal(
        <div className="sheet-backdrop adn-sheet-backdrop" onClick={() => setInfoSheet(null)}>
          <div className="adn-confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="adn-info-sheet-title" onClick={event => event.stopPropagation()}>
            <div className="adn-confirm-head">
              <span id="adn-info-sheet-title" className="adn-confirm-title">{infoSheet.title}</span>
              <button type="button" className="adn-confirm-close" onClick={() => setInfoSheet(null)} aria-label={t('关闭')}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <p className="adn-info-sheet-copy">{infoSheet.description}</p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
