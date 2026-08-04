import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Megaphone, Pin, X } from 'lucide-react';
import { useApp } from '../AppContext';
import { isChinese } from '../i18n';
import { MOCK_PLANET_ANNOUNCEMENT } from '../mockData';

const SUBSIDY_RELEASE_DAYS = '100';

/** 把 `{days}` 替换为高亮天数（对齐 genesis_node infoSubsidy） */
function renderWithDays(text: string): ReactNode {
  const parts = text.split('{days}');
  if (parts.length === 1) return text;
  return parts.flatMap((part, index) => (
    index === 0
      ? [part]
      : [
          <b key={`days-${index}`} className="planet-announce-days">{SUBSIDY_RELEASE_DAYS}</b>,
          part,
        ]
  ));
}

/** 页顶单条公告：跑马灯入口；详情对齐 genesis_node 加权补贴规则弹窗 */
export function PlanetAnnouncementBanner() {
  const { t, language } = useApp();
  const pickLang = (zh: string, en: string) => isChinese(language) ? zh : en;
  const [detailOpen, setDetailOpen] = useState(false);
  const a = MOCK_PLANET_ANNOUNCEMENT;

  const title = pickLang(a.titleZh, a.titleEn);

  return (
    <>
      <div className="planet-announcement" data-layer="planet-announcement">
        <button
          type="button"
          className="planet-announcement-main"
          onClick={() => setDetailOpen(true)}
          aria-label={t('查看公告：{title}', { title })}
        >
          <span className="planet-announcement-icon" aria-hidden="true">
            <Megaphone size={16} strokeWidth={2} />
          </span>
          <span className="planet-announcement-marquee">
            <span className="planet-announcement-marquee-track">
              <span className="planet-announcement-marquee-item">{title}</span>
              <span className="planet-announcement-marquee-item" aria-hidden="true">{title}</span>
            </span>
          </span>
          <ChevronRight size={16} strokeWidth={2} className="planet-announcement-chevron" aria-hidden="true" />
        </button>
      </div>

      {detailOpen && createPortal(
        <div className="sheet-backdrop" onClick={() => setDetailOpen(false)}>
          <div
            className="payment-sheet planet-announce-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="planet-announcement-detail-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="sheet-header">
              <span id="planet-announcement-detail-title" className="sheet-title">
                {pickLang(a.sheetTitleZh, a.sheetTitleEn)}
              </span>
              <button
                className="back-btn"
                style={{ marginLeft: 'auto' }}
                onClick={() => setDetailOpen(false)}
                aria-label={t('关闭')}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="planet-announce">
              <div className="planet-announce-hero">
                <span className="planet-announce-badge">{pickLang(a.badgeZh, a.badgeEn)}</span>
                <div className="planet-announce-doc-title">{pickLang(a.docTitleZh, a.docTitleEn)}</div>
                <div className="planet-announce-meta">
                  <span>{pickLang(a.orgZh, a.orgEn)}</span>
                  <span>{pickLang(a.publishedAtZh, a.publishedAtEn)}</span>
                </div>
              </div>

              <section className="planet-announce-section">
                <h3 className="planet-announce-section-title">{pickLang(a.coreTitleZh, a.coreTitleEn)}</h3>
                <ul className="planet-announce-mech-list">
                  {a.coreItems.map(item => (
                    <li key={item.labelZh} className="planet-announce-mech-item">
                      <span className="planet-announce-para">
                        <b className="planet-announce-mech-label">{pickLang(item.labelZh, item.labelEn)}</b>
                        {item.withDays
                          ? renderWithDays(pickLang(item.bodyZh, item.bodyEn))
                          : pickLang(item.bodyZh, item.bodyEn)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="planet-announce-section">
                <h3 className="planet-announce-section-title">{pickLang(a.benefitTitleZh, a.benefitTitleEn)}</h3>
                <div className="planet-announce-benefit-list">
                  {a.benefitRows.map(row => (
                    <div key={row.starZh} className="planet-announce-benefit-card">
                      <div className="planet-announce-star">{pickLang(row.starZh, row.starEn)}</div>
                      <div className="planet-announce-benefit-title">{pickLang(row.benefitZh, row.benefitEn)}</div>
                      <div className="planet-announce-benefit-desc">{pickLang(row.descZh, row.descEn)}</div>
                    </div>
                  ))}
                </div>

                <div className="planet-announce-note">
                  <Pin size={16} strokeWidth={2} className="planet-announce-note-pin" aria-hidden="true" />
                  <span className="planet-announce-para planet-announce-note-text">
                    <b>{pickLang(a.noteLabelZh, a.noteLabelEn)}</b>
                    {pickLang(a.noteBodyZh, a.noteBodyEn)}
                  </span>
                </div>
              </section>

              <div className="planet-announce-sign">
                <div>{pickLang(a.signTeamZh, a.signTeamEn)}</div>
                <div className="planet-announce-sign-date">{pickLang(a.signDateZh, a.signDateEn)}</div>
              </div>

              <div className="planet-announce-footer">
                <span>{pickLang(a.footerZh, a.footerEn)}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
