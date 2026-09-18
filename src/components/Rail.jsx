import React from 'react';
import { useTranslation } from 'react-i18next';
import { THEMES, CUSTOM_COLOR_KEYS, CUSTOM_FONTS } from '../lib/themes';
import { setLanguage } from '../i18n';

function TogglePair({ options, value, onChange }) {
  return (
    <div className="toggle-pair">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={value === opt.value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ThemeChip({ active, onSelect, swatch, name }) {
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };
  return (
    <div
      className={`theme-chip ${active ? 'active' : ''}`}
      onClick={onSelect}
      onKeyDown={handleKey}
      role="button"
      tabIndex={0}
      aria-pressed={active}
    >
      <div className="swatch">
        {swatch.map((c, i) => (
          <span key={i} style={{ background: c }} />
        ))}
      </div>
      <div className="name">{name}</div>
    </div>
  );
}

export default function Rail({
  theme, setTheme,
  dir, setDir,
  numerals, setNumerals,
  termMode, setTermMode,
  pageSize, setPageSize,
  customColors, setCustomColors,
  customFont, setCustomFont,
  mobileOpen, onClose,
}) {
  const { t, i18n } = useTranslation();

  return (
    <div className={`rail ${mobileOpen ? 'mobile-open' : ''}`}>
      <button className="rail-close-btn" onClick={onClose} aria-label={t('close')}>
        {t('close')} ✕
      </button>

      <div className="rail-section">
        <h3>{t('rail.language')}</h3>
        <TogglePair
          value={i18n.language}
          onChange={setLanguage}
          options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]}
        />
      </div>

      <div className="rail-section">
        <h3>{t('rail.formatting')}</h3>
        <div className="theme-grid">
          {Object.entries(THEMES).map(([key, th]) => (
            <ThemeChip
              key={key}
              active={theme === key}
              onSelect={() => setTheme(key)}
              swatch={th.swatch}
              name={t(`themes.${key}`)}
            />
          ))}
        </div>
        {theme === 'custom' && (
          <div className="custom-colors">
            <select
              className="custom-font-select"
              value={customFont}
              onChange={(e) => setCustomFont(e.target.value)}
            >
              {Object.keys(CUSTOM_FONTS).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {CUSTOM_COLOR_KEYS.map((key) => (
              <div className="color-row" key={key}>
                <span className="color-row-label">{t(`customColors.${key}`)}</span>
                <input
                  type="color"
                  value={customColors[key]}
                  onChange={(e) => setCustomColors({ ...customColors, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rail-section">
        <h3>{t('rail.direction')}</h3>
        <TogglePair
          value={dir}
          onChange={setDir}
          options={[{ value: 'rtl', label: 'RTL' }, { value: 'ltr', label: 'LTR' }]}
        />
      </div>

      <div className="rail-section">
        <h3>{t('rail.numerals')}</h3>
        <TogglePair
          value={numerals}
          onChange={setNumerals}
          options={[{ value: 'arabic', label: '١٢٣' }, { value: 'latin', label: '123' }]}
        />
      </div>

      <div className="rail-section">
        <h3>{t('rail.pageSize')}</h3>
        <select value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
          <option value="A5">{t('rail.pageSizeA5')}</option>
          <option value="A4">{t('rail.pageSizeA4')}</option>
          <option value="Letter">{t('rail.pageSizeLetter')}</option>
        </select>
      </div>

      <div className="rail-section">
        <h3>{t('rail.termHighlight')}</h3>
        <TogglePair
          value={termMode}
          onChange={setTermMode}
          options={[{ value: 'auto', label: t('rail.auto') }, { value: 'off', label: t('rail.off') }]}
        />
      </div>
    </div>
  );
}
