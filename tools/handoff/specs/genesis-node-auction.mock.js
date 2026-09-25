// 截图用的竞拍接口模拟：按 localStorage.handoff_phase 返回不同期次阶段的数据，只拦截 4 个竞拍接口。
(() => {
  const phase = localStorage.getItem('handoff_phase') || 'live';
  const H = 3600e3;
  const D = 24 * H;
  const now = Date.now();
  const iso = ms => new Date(ms).toISOString();
  const EMPTY = '0001-01-01T00:00:00';

  const lot = (infoId, configId, seat, code, rank, airdrop, times, price, status, addr) => ({
    infoId, configId, fromInfo: '创世节点#' + seat, thirdCode: code,
    note: `上月第${rank}名,上月空投${airdrop}PB`, addr: addr || '',
    beginPrice: 200000 + airdrop, addPrice: 10000, localPrice: price, times, status, statusInfo: '',
  });

  const upcoming = phase === 'first-upcoming' || phase === 'next-upcoming';
  const s = (mine, other) => (upcoming ? -1 : mine ?? other);
  // 本期（configId 2）
  const current = [
    lot(21, 2, 12, 'A12408', 41, 52300, upcoming ? 0 : 4, upcoming ? 252300 : 332300, s(2), '0x3f1....9a2c'),
    lot(22, 2, 7, 'A07731', 36, 61800, upcoming ? 0 : 6, upcoming ? 261800 : 361800, s(3), '0x81d....44e0'),
    lot(23, 2, 18, 'A18505', 43, 48600, upcoming ? 0 : 3, upcoming ? 248600 : 278600, -1, '0xa20....1bd3'),
    lot(24, 2, 25, 'A25910', 45, 43100, 0, 243100, -1, ''),
    lot(25, 2, 31, 'A31077', 47, 39800, upcoming ? 0 : 2, upcoming ? 239800 : 249800, -1, '0x5c4....e7f1'),
    lot(26, 2, 40, 'A40263', 49, 35200, 0, 235200, -1, ''),
    lot(27, 2, 44, 'A44241', 50, 33900, upcoming ? 0 : 5, upcoming ? 233900 : 283900, -1, '0x9e2....03ab'),
  ];
  // 上期（configId 1），已结算
  const previous = [
    lot(11, 1, 9, 'A09364', 38, 58400, 5, 318400, 4, '我'),
    lot(12, 1, 3, 'A03185', 33, 66200, 7, 356200, 5, '0x7b0....c19d'),
    lot(13, 1, 21, 'A21640', 44, 45500, 3, 265500, -1, '0x2d8....a5e4'),
    lot(14, 1, 27, 'A27352', 46, 41700, 0, 241700, -1, ''),
    lot(15, 1, 36, 'A36018', 48, 37300, 2, 247300, -1, '0xc63....7f02'),
  ];
  // handoff_mine=0：模拟我还没参与任何场次（两期都没有我的出价）
  if (localStorage.getItem('handoff_mine') === '0') {
    [...current, ...previous].forEach(l => { if (l.status >= 2) { l.status = -1; if (l.addr === '我') l.addr = '0x4aa....d61e'; } });
  }
  const mine = list => list.filter(l => l.status === 2 || l.status === 3);

  function summary() {
    const count = list => ({ totalNum: list.length, localNum: list.filter(l => !l.times).length });
    const next = { configId: 2, ...count(current), fromTime: iso(now + 4 * D + 2 * H), endTime: iso(now + 7 * D + 2 * H) };
    const base = { configId: 0, oldConfigId: 0, totalNum: 0, localNum: 0, fromTime: EMPTY, endTime: EMPTY, leadingCount: 0, outbidCount: 0, frozenAmount: 0, nextConfig: null };
    const live = {
      ...base, configId: 2, oldConfigId: 1, ...count(current),
      leadingCount: current.filter(l => l.status === 2).length,
      outbidCount: current.filter(l => l.status === 3).length,
      frozenAmount: current.filter(l => l.status === 2).reduce((sum, l) => sum + l.localPrice, 0),
    };
    switch (phase) {
      case 'none': return null;
      case 'first-upcoming': return { ...base, nextConfig: next };
      case 'next-upcoming': return { ...base, oldConfigId: 1, wonCount: 1, nextConfig: next };
      case 'between': return { ...base, oldConfigId: 1, wonCount: 1 };
      // 第一期竞拍中：没有上期
      case 'first-live': return { ...live, oldConfigId: 0, fromTime: iso(now - 2 * D), endTime: iso(now + D + 5 * H + 23 * 60e3) };
      case 'settling': return { ...live, fromTime: iso(now - 3 * D), endTime: iso(now - 2 * 60e3) };
      default: return { ...live, fromTime: iso(now - 2 * D), endTime: iso(now + D + 5 * H + 23 * 60e3) };
    }
  }

  function history(infoId) {
    const l = [...current, ...previous].find(x => x.infoId === infoId);
    if (!l || !l.times) return [];
    const others = ['0x81d....44e0', '0x3f1....9a2c', '0xa20....1bd3', '0x5c4....e7f1'];
    return Array.from({ length: Math.min(l.times, 6) }, (_, i) => {
      const top = i === 0;
      const isMine = l.status === 2 || l.status === 4 ? top : (l.status === 3 || l.status === 5) && i === 1;
      return {
        hisId: infoId * 100 + i,
        createTime: iso(now - (i + 1) * 3.3 * H),
        localPrice: l.localPrice - i * 10000,
        status: top ? 1 : 0,
        addr: isMine ? '0xme' : others[i % others.length],
        isMine,
      };
    });
  }

  function page(items) {
    return { pageIndex: 1, pageSize: 20, totalCount: items.length, totalPages: 1, items };
  }

  function handle(name, req) {
    if (name === 'GetZsAuctionSummary') return summary();
    if (name === 'GetZsAuctionList') return page(Number(req.configId) === 1 && phase !== 'first-live' ? previous : Number(req.configId) === 2 ? current : []);
    if (name === 'GetZsAuctionBidHistory') return page(history(Number(req.infoId)));
    // BidZsAuction：出价成功后这一场转为我领先
    const l = current.find(x => x.infoId === Number(req.infoId));
    if (l) Object.assign(l, { localPrice: Number(req.amount), times: l.times + 1, status: 2 });
    return { configId: 2, infoId: Number(req.infoId), localPrice: Number(req.amount), times: l ? l.times : 1, freezeHisId: 1, refundedOwnPreviousBid: false, refundedAmount: 0 };
  }
  void mine;

  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__handoffUrl = String(url);
    return open.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const match = /(GetZsAuctionSummary|GetZsAuctionList|GetZsAuctionBidHistory|BidZsAuction)/.exec(this.__handoffUrl || '');
    if (!match) return send.apply(this, arguments);
    let req = {};
    try { req = JSON.parse(body); } catch (e) { /* 非 JSON 请求体按空处理 */ }
    const text = JSON.stringify({ data: handle(match[1], req), result: 1, message: '成功' });
    const xhr = this;
    const def = (key, value) => Object.defineProperty(xhr, key, { configurable: true, get: () => value });
    setTimeout(() => {
      def('readyState', 4);
      def('status', 200);
      def('statusText', 'OK');
      def('responseText', text);
      def('response', xhr.responseType === 'json' ? JSON.parse(text) : text);
      def('responseURL', xhr.__handoffUrl);
      xhr.getAllResponseHeaders = () => 'content-type: application/json\r\n';
      xhr.getResponseHeader = key => (/content-type/i.test(key) ? 'application/json' : null);
      ['readystatechange', 'load', 'loadend'].forEach(type => xhr.dispatchEvent(new Event(type)));
    }, 80);
  };
})();
