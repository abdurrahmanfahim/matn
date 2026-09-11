import React from 'react';
import { THEMES } from '../lib/themes';

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

export default function Rail({
  theme, setTheme,
  dir, setDir,
  numerals, setNumerals,
  termMode, setTermMode,
  pageSize, setPageSize,
}) {
  return (
    <div className="rail">
      <div className="rail-section">
        <h3>التنسيق</h3>
        <div className="theme-grid">
          {Object.entries(THEMES).map(([key, t]) => (
            <div
              key={key}
              className={`theme-chip ${theme === key ? 'active' : ''}`}
              onClick={() => setTheme(key)}
            >
              <div className="swatch">
                {t.swatch.map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </div>
              <div className="name">{t.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rail-section">
        <h3>الاتجاه</h3>
        <TogglePair
          value={dir}
          onChange={setDir}
          options={[{ value: 'rtl', label: 'RTL' }, { value: 'ltr', label: 'LTR' }]}
        />
      </div>

      <div className="rail-section">
        <h3>الأرقام</h3>
        <TogglePair
          value={numerals}
          onChange={setNumerals}
          options={[{ value: 'arabic', label: '١٢٣' }, { value: 'latin', label: '123' }]}
        />
      </div>

      <div className="rail-section">
        <h3>حجم الصفحة</h3>
        <select value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
          <option value="A5">A5 (كتاب صغير)</option>
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
        </select>
      </div>

      <div className="rail-section">
        <h3>تمييز المصطلحات</h3>
        <TogglePair
          value={termMode}
          onChange={setTermMode}
          options={[{ value: 'auto', label: 'تلقائي' }, { value: 'off', label: 'إيقاف' }]}
        />
      </div>
    </div>
  );
}
