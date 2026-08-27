/** 缩短钱包地址展示：0x7a3f…c3e8 */
export function shortenAddress(address: string, head = 6, tail = 4): string {
  if (address.length <= head + tail) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/** 校验是否为合法的 0x 开头 40 位十六进制钱包地址 */
export function isValidWalletAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}
