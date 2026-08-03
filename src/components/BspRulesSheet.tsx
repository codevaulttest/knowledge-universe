import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '../AppContext';

/** BSP 巨星投流 —— 保底规则说明（长文，供转发给领导审阅） */
export function BspRulesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useApp();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet pb-info-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('巨星投流保底规则', 'Big Star Plan — Floor Rules')}</span>
          <button className="back-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label={t('关闭', 'Close')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="pb-info-sheet-body">
          <p className="pb-info-sheet-para pb-info-sheet-heading">
            {t(
              '关于知识宇宙「BSP 巨星投流」的投放与保底规则说明',
              'About Investment and Tip-Floor Rules for "BSP Big Star Plan" in Wisverse'
            )}
          </p>
          <p className="pb-info-sheet-para">
            {t(
              '巨星投流是知识宇宙为创作者提供的长期流量扶持计划。用户以 PB 投放，为自己或指定的创作者换取推广期内的曝光与每日打赏保底。',
              "The Big Star Plan is Wisverse's long-term traffic support programme for creators. A user invests PB to buy exposure and a daily tip floor — for themselves or for a creator they nominate."
            )}
          </p>

          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('投放单位：', 'Investment unit: ')}</strong>
            {t(
              '1 个投放单位 = 1000 PB + 0.1 SUP。投放 100 个单位即 100,000 PB + 10 SUP；投放 10,000 个单位即 10,000,000 PB + 1,000 SUP。单次最多投放 99,999 个单位。',
              '1 unit = 1,000 PB + 0.1 SUP. 100 units = 100,000 PB + 10 SUP; 10,000 units = 10,000,000 PB + 1,000 SUP. Up to 99,999 units per order.'
            )}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('投放对象：', 'Beneficiary: ')}</strong>
            {t(
              '默认投给自己，也可以填写他人的钱包地址（例如经纪公司为旗下创作者投放）。填写他人地址时必须先通过校验——该地址须已在知识宇宙注册，校验不通过则无法支付，以免投错人。',
              "Defaults to yourself; you may instead enter someone else's wallet address (for example, an agency backing its creator). A non-self address must pass verification — it must already be registered on Wisverse — otherwise payment is blocked, so funds can't go to the wrong person."
            )}
          </p>
          <p className="pb-info-sheet-para">
            <strong className="pb-info-sheet-label">{t('生效与周期：', 'Effective period: ')}</strong>
            {t(
              '支付成功后，投放自次日 00:00（北京时间）起生效，推广周期为 365 天。',
              'Once paid, the investment takes effect at 00:00 (Beijing time) the following day and runs for 365 days.'
            )}
          </p>

          <p className="pb-info-sheet-para pb-info-sheet-subheading">{t('保底规则：', 'Tip floor:')}</p>
          <p className="pb-info-sheet-para">
            {t(
              '在推广周期内，受益人每天至少发布 1 篇内容，即触发当日的打赏保底；当日未发布内容，则当日不享受保底，仅保留其真实获得的打赏。',
              'During the promotion period, the beneficiary triggers that day\'s tip floor by publishing at least one post. On a day with no post there is no floor — they simply keep whatever tips they actually earned.'
            )}
          </p>
          <p className="pb-info-sheet-para">
            {t(
              '每投放 1000 PB，对应每日至少 3 PB 的打赏保底。例如投放 10,000,000 PB（10,000 个单位），每日保底为 30,000 PB。',
              'Every 1,000 PB invested carries a floor of at least 3 PB in tips per day. For example, 10,000,000 PB (10,000 units) gives a daily floor of 30,000 PB.'
            )}
          </p>

          <p className="pb-info-sheet-para pb-info-sheet-subheading">{t('打赏如何折算：', 'How tips are converted:')}</p>
          <p className="pb-info-sheet-para">
            {t(
              '保底比较的是受益人「真实到账」的打赏，而非打赏方支付的金额。按平台现行规则：以签到获得的前 1000 PB 支付的打赏，受益人到账为 0；其余来源（第三方 PB、签到超出 1000 PB 的部分、解质押 PB、25 层链接获得的 PB）支付的打赏，受益人到账 80%。',
              "The floor is compared against what the beneficiary actually receives, not what the tipper paid. Under the platform's existing rule: tips paid from the recipient's first 1,000 check-in PB yield 0 to the recipient; tips from other sources (third-party PB, check-in PB beyond the first 1,000, unstaked PB, and 25-layer PB) yield 80%."
            )}
          </p>

          <p className="pb-info-sheet-para pb-info-sheet-subheading">{t('结算方式：', 'Settlement:')}</p>
          <p className="pb-info-sheet-para">
            {t(
              '每日结算时，若受益人当天已发帖且真实到账打赏低于保底额，系统自动补足差额；若已达到或超过保底额，则按真实金额发放，系统不再补贴。',
              'At daily settlement, if the beneficiary posted that day and their actual tips fall below the floor, the system tops up the difference. If they meet or exceed the floor, they keep the full actual amount and no top-up is made.'
            )}
          </p>

          <p className="pb-info-sheet-para pb-info-sheet-subheading">{t('示例：', 'Example:')}</p>
          <p className="pb-info-sheet-para">
            {t(
              '投放 10,000,000 PB，每日保底 30,000 PB。若昨日打赏总额为 10,000 PB，受益人真实到账 8,000 PB，系统补贴 22,000 PB，当日合计 30,000 PB。若昨日打赏总额为 100,000 PB，受益人真实到账 80,000 PB，已超过保底，当日合计 80,000 PB，系统不再补贴。',
              "On a 10,000,000 PB investment the daily floor is 30,000 PB. If yesterday's tips totalled 10,000 PB, the beneficiary actually received 8,000 PB, the system tops up 22,000 PB, and the day totals 30,000 PB. If yesterday's tips totalled 100,000 PB, the beneficiary actually received 80,000 PB — above the floor — so the day totals 80,000 PB with no top-up."
            )}
          </p>

          <div className="sup-deposit-warning">
            <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
            <span>
              {t(
                '保底仅在受益人当日发布内容时生效。未发布内容的日期不计入保底，也不会累计到之后的日期。',
                'The floor applies only on days the beneficiary publishes. Days without a post get no floor and do not carry over.'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
