import { useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, Clock, Upload } from 'lucide-react';
import { useApp } from '../AppContext';
import { CERT_APPLY_PB, currentVersion } from '../certUtils';
import { PbWalletPicker } from './PbWalletPicker';
import { formatSuperAmount, formatSupAmount } from '../stakeConfig';
import { pbOnchainFee, walletConsumesSup } from '../walletConfig';
import type { PbWalletId, Post } from '../types';

type IdKind = 'id_card' | 'passport';

/**
 * 申请确权：先实名认证（证件资料为演示占位，不收集真实信息），再兑换确权费用，
 * 提交后认证由平台发出，帖子进入「确权中」。兑换金额待产品确认。
 */
export function CertApplySheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const { t, applyCert, showToast, realNameStatus, realNameVerified, submitRealName: submitRealNameReview, payCertFee } = useApp();
  const version = currentVersion(post);
  const [step, setStep] = useState<'realname' | 'pay'>(realNameVerified ? 'pay' : 'realname');
  const [idKind, setIdKind] = useState<IdKind>('id_card');
  const [uploaded, setUploaded] = useState(false);
  const [payWallet, setPayWallet] = useState<PbWalletId | null>(null);
  const [busy, setBusy] = useState(false);
  const [failReason, setFailReason] = useState('');
  const supCost = pbOnchainFee(CERT_APPLY_PB);

  const steps = ['realname', 'pay'] as const;
  const stepIndex = steps.indexOf(step);
  const stepLabels: Record<typeof steps[number], string> = {
    realname: t('实名认证'),
    pay: t('确权兑换'),
  };
  // 实名已通过时第一步只作为已完成的步骤展示，返回直接关闭
  const back = () => (step === 'pay' && !realNameVerified ? setStep('realname') : onClose());

  const submitRealName = () => {
    setBusy(true);
    setTimeout(() => { setBusy(false); submitRealNameReview(); showToast(t('资料已提交，审核通过后会通知你')); }, 1200);
  };

  const submitApply = () => {
    if (!payWallet) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (!payCertFee(payWallet)) {
        setFailReason(t('所选钱包余额不足或不适用于此操作'));
        return;
      }
      applyCert(post.id);
      onClose();
    }, 1200);
  };

  return (
    <div className="sheet-backdrop full-page-flow">
      <div className="payment-sheet cert-apply-sheet" role="dialog" aria-modal="true" aria-label={t('申请确权')}>
        <div className="sheet-header sheet-header--centered">
          <button type="button" className="sheet-header-back" onClick={back} disabled={busy} aria-label={t('返回')}>
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <span className="sheet-title sheet-title--centered">{t('为 v{version} 申请确权', { version })}</span>
          <div className="sheet-header-spacer" aria-hidden />
        </div>

        <ol className="cert-apply-steps" aria-label={t('申请步骤')}>
          {steps.map((s, i) => (
            <li
              key={s}
              className={`cert-apply-step${s === step ? ' cert-apply-step--active' : ''}${i < stepIndex ? ' cert-apply-step--done' : ''}`}
              aria-current={s === step ? 'step' : undefined}
            >
              <span className="cert-apply-step-dot" aria-hidden="true">
                {i < stepIndex ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              <span>{stepLabels[s]}</span>
            </li>
          ))}
        </ol>

        <p className="cert-apply-lead">
          {t('内容指纹和作者信息将永久记录在链上，认证绑定 v{version}。之后修改帖子会生成新版本，新版本重新累计满 100 赞后可以单独申请。', { version })}
        </p>

        {step === 'realname' && realNameStatus === 'reviewing' ? (
          <div className="cert-review-state">
            <Clock className="cert-review-icon" size={28} strokeWidth={2} aria-hidden="true" />
            <p className="cert-apply-section-title">{t('实名资料审核中')}</p>
            <p className="cert-apply-hint">{t('资料已提交，人工审核完成后会通知你，通过后可以继续申请确权。')}</p>
            <button type="button" className="planet-confirm-btn" onClick={onClose}>{t('知道了')}</button>
          </div>
        ) : step === 'realname' ? (
          <>
            <p className="cert-apply-hint">{t('确权认证写入作者身份，需要先完成实名认证。')}</p>
            <div className="cert-id-kinds" role="radiogroup" aria-label={t('证件类型')}>
              {([['id_card', t('身份证')], ['passport', t('护照')]] as const).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={idKind === kind}
                  className={`cert-id-kind${idKind === kind ? ' cert-id-kind--active' : ''}`}
                  onClick={() => setIdKind(kind)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className={`cert-id-upload${uploaded ? ' cert-id-upload--done' : ''}`} onClick={() => setUploaded(true)}>
              {uploaded ? <BadgeCheck size={18} strokeWidth={2.2} aria-hidden="true" /> : <Upload size={18} strokeWidth={2.2} aria-hidden="true" />}
              <span>{uploaded
                ? t('证件照片已上传')
                : idKind === 'id_card' ? t('上传身份证人像面和国徽面') : t('上传护照资料页')}</span>
            </button>
            <button type="button" className="planet-confirm-btn" disabled={!uploaded || busy} onClick={submitRealName}>
              {busy ? <span className="spinner" /> : t('提交实名认证')}
            </button>
          </>
        ) : (
          <>
            <div className="pay-combo-breakdown">
              <div className="pay-combo-row">
                <span className="pay-combo-label">{t('所需 PB')}</span>
                <span className="pay-combo-value">{formatSuperAmount(CERT_APPLY_PB)} PB</span>
              </div>
              {(!payWallet || walletConsumesSup(payWallet)) && (
                <div className="pay-combo-row">
                  <span className="pay-combo-label">{t('Gas 费')}</span>
                  <span className="pay-combo-value">{formatSupAmount(supCost)} SUP</span>
                </div>
              )}
              {failReason && <p className="pay-fail-reason">{failReason}</p>}
            </div>
            <p className="cert-apply-hint">{t('兑换金额待产品确认，当前为占位数值。')}</p>
            <PbWalletPicker use="cert" amount={CERT_APPLY_PB} value={payWallet} onChange={setPayWallet} />
            <button type="button" className="planet-confirm-btn" disabled={!payWallet || busy} onClick={submitApply}>
              {busy ? <span className="spinner" /> : failReason ? t('重试') : t('兑换并申请')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
