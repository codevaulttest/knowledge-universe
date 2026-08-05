import { useEffect, useMemo, useState } from 'react';
import type { Channel } from '../types';

// 千级频道列表统一分页规格：默认只渲染一页，靠搜索定位 + 「加载更多」分批追加，
// 避免一次性挂载全部 DOM（与知识宇宙页转让选节点弹窗的分页规格保持一致）
export const CHANNEL_LIST_PAGE_SIZE = 50;

/** 频道目录 / 选择器共用的搜索 + 分页逻辑：匹配频道名称与简介 */
export function useChannelListSearch(channels: Channel[]) {
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(CHANNEL_LIST_PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter(c =>
      c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [channels, search]);

  useEffect(() => {
    setVisibleCount(CHANNEL_LIST_PAGE_SIZE);
  }, [search, channels]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;
  const loadMore = () => setVisibleCount(v => v + CHANNEL_LIST_PAGE_SIZE);

  return { search, setSearch, visible, hasMore, loadMore, filteredCount: filtered.length };
}
