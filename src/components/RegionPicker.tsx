import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { REGION_TREE } from '../regionData';

/**
 * 省 / 市 / 区三列级联选择器（点选式，非滚轮）：
 * 点省 → 右侧联动出市 → 点市联动出区 → 选完区即回填。
 * 纯前端演示，数据来自本地 REGION_TREE。
 */
export function RegionPicker({ onSelect, onClose }: {
  onSelect: (region: string) => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  const [provinceIdx, setProvinceIdx] = useState<number | null>(null);
  const [cityIdx, setCityIdx] = useState<number | null>(null);

  const province = provinceIdx != null ? REGION_TREE[provinceIdx] : null;
  const city = province && cityIdx != null ? province.cities[cityIdx] : null;

  const pickDistrict = (district: string) => {
    if (!province || !city) return;
    onSelect(`${province.name} ${city.name} ${district}`);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="payment-sheet region-picker-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <span className="sheet-title">{t('选择地区')}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label={t('关闭')}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="region-cols">
          {/* 省 */}
          <ul className="region-col" aria-label={t('省')}>
            {REGION_TREE.map((p, i) => (
              <li key={p.name}>
                <button
                  type="button"
                  className={`region-cell${provinceIdx === i ? ' region-cell--active' : ''}`}
                  onClick={() => { setProvinceIdx(i); setCityIdx(null); }}
                >
                  <span className="region-cell-text">{p.name}</span>
                  {provinceIdx === i && <Check size={14} strokeWidth={2.6} className="region-cell-check" />}
                </button>
              </li>
            ))}
          </ul>

          {/* 市 */}
          <ul className="region-col" aria-label={t('市')}>
            {province?.cities.map((c, i) => (
              <li key={c.name}>
                <button
                  type="button"
                  className={`region-cell${cityIdx === i ? ' region-cell--active' : ''}`}
                  onClick={() => setCityIdx(i)}
                >
                  <span className="region-cell-text">{c.name}</span>
                  {cityIdx === i && <Check size={14} strokeWidth={2.6} className="region-cell-check" />}
                </button>
              </li>
            ))}
          </ul>

          {/* 区 */}
          <ul className="region-col" aria-label={t('区')}>
            {city?.districts.map(d => (
              <li key={d}>
                <button
                  type="button"
                  className="region-cell"
                  onClick={() => pickDistrict(d)}
                >
                  <span className="region-cell-text">{d}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
