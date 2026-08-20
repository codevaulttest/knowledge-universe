import type { ShopInfo, ShopVariant } from './types';

/** 是否多规格商品（variants 非空） */
export function isMultiVariantShop(shop: ShopInfo): boolean {
  return (shop.variants?.length ?? 0) > 0;
}

/** 多规格时返回 variants；单规格时合成一个虚拟 variant */
export function getShopVariants(shop: ShopInfo): ShopVariant[] {
  if (isMultiVariantShop(shop)) return shop.variants!;
  if (shop.price != null && shop.stock != null) {
    return [{ id: 'default', label: '', price: shop.price, stock: shop.stock }];
  }
  return [];
}

/** 按 id 解析 SKU；单规格无 id 时返回默认 */
export function getShopVariant(shop: ShopInfo, variantId?: string): ShopVariant | undefined {
  const variants = getShopVariants(shop);
  if (variants.length === 0) return undefined;
  if (isMultiVariantShop(shop)) {
    return variants.find(v => v.id === variantId) ?? variants.find(v => v.stock > 0) ?? variants[0];
  }
  return variants[0];
}

/** 列表/卡片展示价：取各 SKU 最低价 */
export function getShopMinPrice(shop: ShopInfo): number {
  const variants = getShopVariants(shop);
  if (variants.length === 0) return shop.price ?? 0;
  return Math.min(...variants.map(v => v.price));
}

/** 总库存（售罄判断） */
export function getShopTotalStock(shop: ShopInfo): number {
  const variants = getShopVariants(shop);
  if (variants.length === 0) return shop.stock ?? 0;
  return variants.reduce((sum, v) => sum + v.stock, 0);
}

/** 当前选中 SKU 的库存（单规格读 shop.stock） */
export function getShopVariantStock(shop: ShopInfo, variantId?: string): number {
  const v = getShopVariant(shop, variantId);
  return v?.stock ?? 0;
}

/** 当前选中 SKU 的单价 */
export function getShopUnitPrice(shop: ShopInfo, variantId?: string): number {
  const v = getShopVariant(shop, variantId);
  return v?.price ?? shop.price ?? 0;
}
