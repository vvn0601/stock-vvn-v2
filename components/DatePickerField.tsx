import React, { useMemo, useRef } from 'react';
import { Icons } from '../constants';

interface DatePickerFieldProps {
  value: string; // "YYYY/MM/DD"
  onChange: (val: string) => void;
  label?: string;
  className?: string;
  id?: string;
  placeholder?: string;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function ymdSlashToDash(v: string) {
  const m = v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function ymdDashToSlash(v: string) {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[1]}/${m[2]}/${m[3]}`;
}

function parseSlashDate(v: string): Date | null {
  const m = v.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

function formatSlashDate(dt: Date) {
  return `${dt.getFullYear()}/${pad2(dt.getMonth() + 1)}/${pad2(dt.getDate())}`;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  value,
  onChange,
  label,
  className = '',
  id,
  placeholder = 'YYYY/MM/DD'
}) => {
  const textInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const hiddenDateValue = useMemo(() => ymdSlashToDash(value), [value]);

  const onTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);

    const formatted = val
      .replace(/^(\d{4})(\d)/, '$1/$2')
      .replace(/^(\d{4})\/(\d{2})(\d)/, '$1/$2/$3');

    onChange(formatted);
  };

  const onTextFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    requestAnimationFrame(() => e.currentTarget.select());
  };

  const onTextKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

    const dt = parseSlashDate(value);
    if (!dt) return;

    e.preventDefault();
    dt.setDate(dt.getDate() + (e.key === 'ArrowUp' ? 1 : -1));
    onChange(formatSlashDate(dt));
  };

  const onTextBlur = () => {
    const dt = parseSlashDate(value);
    if (dt) onChange(formatSlashDate(dt));
  };

  const onPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value; // "YYYY-MM-DD"
    if (!v) return;
    const next = ymdDashToSlash(v);
    if (next) onChange(next);

    // 選完回到文字框，讓使用者能繼續用鍵盤
    textInputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className={`space-y-1.5 relative ${className}`}>
      {label && (
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
          {label}
        </label>
      )}

      <div className="relative">
        {/* 文字輸入：可反白、可鍵盤輸入、可上下鍵調整 */}
        <input
          ref={textInputRef}
          id={id}
          type="text"
          value={value}
          onChange={onTextChange}
          onFocus={onTextFocus}
          onKeyDown={onTextKeyDown}
          onBlur={onTextBlur}
          placeholder={placeholder}
          maxLength={10}
          autoComplete="off"
          inputMode="numeric"
          className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 pr-12 text-sm font-bold outline-none shadow-inner focus:border-blue-500/50 transition-colors"
        />

        {/* 右側 icon 區：視覺上是 icon，實際點擊到的是透明的 date input（保證能開） */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 z-20">
          {/* icon：不吃事件，事件交給下面透明 input */}
          <div className="w-full h-full rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-slate-800/50 transition-colors pointer-events-none">
            <Icons.Calendar size={18} />
          </div>

          {/* 透明 date input：覆蓋整個 icon 區，使用者點擊=點到 input 本體 */}
          <input
            ref={dateInputRef}
            type="date"
            value={hiddenDateValue}
            onChange={onPickerChange}
            aria-label="開啟日期選擇器"
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
