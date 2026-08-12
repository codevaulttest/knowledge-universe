import type { ShopOrderStatus } from './types';

/** 平台固定损耗/服务费比例：10%，卖家实收 90% */
export const SHOP_PLATFORM_FEE_RATE = 0.1;

/** 优点返还比例上限（因平台收 10%，卖家最多让出 90%）*/
export const SHOP_MAX_REBATE_PERCENT = 90;

/** SUP 下单手续费比例：万一分之一（如 2000 PB → 0.2 SUP）*/
export const SHOP_SUP_FEE_RATE = 0.0001;

/** 优点折算口径（演示）：约 16 PB = 1 优点（会议例：800 PB ≈ 50 优点）*/
export const MERIT_PB_PER_POINT = 16;

/** 满多少优点兑 1 个 adn 抽奖券 */
export const MERIT_PER_ADN = 100;

/** 买家确认收货后延后结算天数（演示占位：次月 15 日结算）*/
export const SHOP_AUTO_CONFIRM_DAYS = 7;

/** 单件 SUP 手续费 */
export function computeShopFee(price: number): number {
  // 保留 4 位小数，避免浮点误差；万一分之一比例下常见值为整洁小数
  return Math.round(price * SHOP_SUP_FEE_RATE * 10000) / 10000;
}

/** 单件返给买家的优点（按返还比例折算，占位）*/
export function computeUnitMerit(price: number, rebatePercent: number): number {
  const rebatePb = price * (rebatePercent / 100);
  return Math.round(rebatePb / MERIT_PB_PER_POINT);
}

/** SUP 手续费展示（保留必要小数）*/
export function formatShopFee(amount: number): string {
  return amount.toString();
}

/** 订单状态在两种语言下的短标签 */
export function shopOrderStatusLabel(status: ShopOrderStatus, zh: boolean): string {
  const map: Record<ShopOrderStatus, [string, string]> = {
    to_ship:   ['待发货', 'To ship'],
    shipped:   ['已发货', 'Shipped'],
    completed: ['已完成', 'Completed'],
    to_settle: ['待结算', 'Awaiting settlement'],
    settled:   ['已结算', 'Settled'],
  };
  return zh ? map[status][0] : map[status][1];
}
