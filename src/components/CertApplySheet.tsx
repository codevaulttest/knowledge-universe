import { useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, FileSignature, IdCard, Repeat } from 'lucide-react';
import { useApp } from '../AppContext';
import { formatSupAmount } from '../stakeConfig';
import { CERT_EXCHANGE_FEE_PB, CERT_GAS_FEE_SUP, currentVersion } from '../certUtils';
import type { Post } from '../types';

type Step = 'intro' | 'realname' | 'exchange' | 'sign';

/** 申请确权：说明 → 实名认证（每账号一次）→ 兑换 → 签名授权，提交后进入「确权中」 */
export function CertApplySheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const { t, realNameVerified, verifyRealName, applyCert } = useApp();
  // 打开时确定步骤：已实名的账号跳过实名；流程中完成实名后进度条保持不变
  const [steps] = useState<Step[]>(() => (realNameVerified ? ['intro', 'exchange', 'sign'] : ['intro', 'realname', 'exchange', 'sign']));
  const [step, setStep] = useState<Step>('intro');
  const [busy, setBusy] = useState(false);
  const version = currentVersion(post);
  const stepIndex = steps.indexOf(step);

  const next = () => setStep(steps[stepIndex + 1] ?? step);
  const back = () => (stepIndex === 0 ? onClose() : setStep(steps[stepIndex - 1]!));

  // 演示：各步骤用短暂 loading 模拟外部流程
  const runStep = (done: () => void) => {
    setBusy(true);
    setTimeout(() => { setBusy(false); done(); }, 900);
  };

  const stepLabels: Record<Step, string> = {
    intro: t('确权说明'),
    realname: t('实名认证'),
    exchange: t('兑换'),
    sign: t('签名授权'),
  };

  return (
    <div className="sheet-backdrop full-page-flow" onClick={busy ? undefined : onClose}>
      <div className="payment-sheet cert-apply-sheet" role="dialog" aria-modal="true" aria-label={t('申请确权')} onClick={e => e.stopPropagation()}>
        <div className="sheet-header sheet-header--centered">
          <button type="button" className="sheet-header-back" onClick={back} disabled={busy} aria-label={t('返回')}>
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <span className="sheet-title sheet-title--centered">{t('申请确权')}</span>
          <div className="sheet-header-spacer" aria-hidden />
        </div>

        <ol className="cert-apply-steps" aria-label={t('申请步骤')}>
          {steps.map((s, i) => (
            <li
              key={s}
              className={`cert-apply-step${i === stepIndex ? ' cert-apply-step--active' : ''}${i < stepIndex ? ' cert-apply-step--done' : ''}`}
              aria-current={i === stepIndex ? 'step' : undefined}
            >
              <span className="cert-apply-step-dot" aria-hidden="true">
                {i < stepIndex ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              <span>{stepLabels[s]}</span>
            </li>
          ))}
        </ol>

        {step === 'intro' && (
          <div className="cert-apply-body">
            <BadgeCheck className="cert-apply-hero-icon" size={32} strokeWidth={2} aria-hidden="true" />
            <p className="cert-apply-lead">{t('为这篇帖子的 v{version} 生成知识确权认证，内容指纹和作者信息永久记录在链上。', { version })}</p>
            <ul className="cert-apply-points">
              <li>{t('认证绑定当前版本 v{version}。', { version })}</li>
              <li>{t('之后修改帖子会生成新版本，v{version} 的认证保留在 v{version}；新版本可以再单独申请。', { version })}</li>
              <li>{t('申请需要完成实名认证和确权兑换。')}</li>
            </ul>
            <button type="button" className="planet-confirm-btn" onClick={next}>{t('开始申请')}</button>
          </div>
        )}

        {step === 'realname' && (
          <div className="cert-apply-body">
            <IdCard className="cert-apply-hero-icon" size={32} strokeWidth={2} aria-hidden="true" />
            <p className="cert-apply-lead">{t('确权认证记录作者的真实身份。每个账号完成一次实名认证，之后申请直接进入兑换。')}</p>
            {busy ? (
              <div className="pay-status"><span className="spinner" /><span>{t('认证中…')}</span></div>
            ) : (
              <button type="button" className="planet-confirm-btn" onClick={() => runStep(() => { verifyRealName(); next(); })}>
                {t('开始实名认证')}
              </button>
            )}
          </div>
        )}

        {step === 'exchange' && (
          <div className="cert-apply-body">
            <Repeat className="cert-apply-hero-icon" size={32} strokeWidth={2} aria-hidden="true" />
            <div className="compose-stake-gas">
              <span className="compose-stake-gas-label">{t('确权兑换')}</span>
              <span className="compose-stake-gas-value">{CERT_EXCHANGE_FEE_PB} PB</span>
            </div>
            <div className="compose-stake-gas" style={{ marginBottom: 16 }}>
              <span className="compose-stake-gas-label">{t('Gas 费')}</span>
              <span className="compose-stake-gas-value">{formatSupAmount(CERT_GAS_FEE_SUP)} SUP</span>
            </div>
            {busy ? (
              <div className="pay-status"><span className="spinner" /><span>{t('兑换中…')}</span></div>
            ) : (
              <button type="button" className="planet-confirm-btn" onClick={() => runStep(next)}>
                {t('兑换 · {pb} PB + {sup} SUP', { pb: CERT_EXCHANGE_FEE_PB, sup: formatSupAmount(CERT_GAS_FEE_SUP) })}
              </button>
            )}
          </div>
        )}

        {step === 'sign' && (
          <div className="cert-apply-body">
            <FileSignature className="cert-apply-hero-icon" size={32} strokeWidth={2} aria-hidden="true" />
            <p className="cert-apply-lead">{t('在钱包中签名，授权以你的名义为这篇帖子的 v{version} 生成确权凭证。', { version })}</p>
            {busy ? (
              <div className="pay-status"><span className="spinner" /><span>{t('等待钱包签名…')}</span></div>
            ) : (
              <button type="button" className="planet-confirm-btn" onClick={() => runStep(() => { applyCert(post.id); onClose(); })}>
                {t('签名并提交')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
