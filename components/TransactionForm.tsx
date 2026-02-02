import React from 'react';
import { MarketType, TransactionType, SipFrequency } from '../types';
import { STOCK_MAP } from '../constants';
import { DatePickerField } from './DatePickerField';
import { formatNumber } from '../utils/formatters';

interface TransactionFormProps {
  inputMode: 'single' | 'sip';
  txnType: TransactionType;
  formData: any;
  setFormData: (data: any) => void;
  sipData: any;
  setSipData: (data: any) => void;
  recentSymbols: string[];
  isFetchingPrice: boolean;
  handleFetchCurrentPrice: () => void;
  calculatedFee: number;
  calculatedTax: number;
  grandTotalPreview: number;
  handleAddTransaction: () => void;
  handleAddSipPlan: () => void;
  toggleSipDay: (day: string) => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  inputMode,
  txnType,
  formData,
  setFormData,
  sipData,
  setSipData,
  recentSymbols,
  isFetchingPrice,
  handleFetchCurrentPrice,
  calculatedFee,
  calculatedTax,
  grandTotalPreview,
  handleAddTransaction,
  handleAddSipPlan,
  toggleSipDay
}) => {
  if (inputMode === 'single') {
    return (
      <div className="space-y-4 animate-fadeIn">
        {/* 1. 日期與代碼並排區塊 */}
        <div className="grid grid-cols-2 gap-3">
          <DatePickerField 
            label="交易日期"
            value={formData.date}
            onChange={val => setFormData({...formData, date: val})}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">股票代碼</label>
            <input 
              type="text" 
              value={formData.code} 
              onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
              placeholder="0050 or NVDA" 
              className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-sm font-bold outline-none shadow-inner focus:border-blue-500/50 transition-colors" 
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5 -mt-2">
          {recentSymbols.map(c => (
            <button 
              key={c} 
              onClick={() => setFormData({...formData, code: c, name: STOCK_MAP[c] || ""})}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-black text-slate-400 transition-colors border border-slate-700/50"
            >
              {c}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">股票名稱</label>
          <input 
            type="text" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            placeholder="輸入股票名稱" 
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-sm font-bold outline-none shadow-inner focus:border-blue-500/50 transition-colors" 
          />
        </div>

                <div className="grid grid-cols-2 gap-3">
          {/* 價格欄位 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center h-5"> {/* 設定 h-5 固定高度 */}
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">價格</label>
              <button 
                onClick={handleFetchCurrentPrice} 
                disabled={isFetchingPrice} 
                className="text-[10px] text-blue-400 font-black hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                {isFetchingPrice ? '...' : '帶入現價'}
              </button>
            </div>
            <input 
              type="number" 
              value={formData.price} 
              onChange={e => setFormData({...formData, price: e.target.value})} 
              placeholder="輸入價格"
              className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-sm font-bold outline-none shadow-inner focus:border-blue-500/50 transition-colors" 
            />
          </div>

          {/* 數量欄位 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center h-5"> {/* 這裡也加上 h-5 固定高度，確保與左邊對齊 */}
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">數量</label>
            </div>
            <input 
              type="number" 
              value={formData.qty} 
              onChange={e => setFormData({...formData, qty: e.target.value})} 
              placeholder="輸入數量"
              className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-sm font-bold outline-none shadow-inner focus:border-blue-500/50 transition-colors" 
            />
          </div>
        </div>


        {/* 費用與稅務區塊：垂直排列 */}
        <div className="space-y-3">
          {/* 手續費欄位 (0.1425%) */}
          <div className="p-4 border border-slate-800 rounded-xl bg-slate-900/50">
            <div className="flex justify-between items-center mb-2">
               <label className="text-xs font-black text-slate-500 uppercase tracking-widest">手續費 (0.1425%)</label>
               <div className="flex items-center gap-2">
                 <input 
                   type="checkbox" 
                   checked={formData.feeAuto} 
                   onChange={(e) => setFormData({...formData, feeAuto: e.target.checked})}
                   className="rounded border-slate-700 bg-slate-800 text-blue-500" 
                 />
                 <span className="text-xs text-slate-400 font-bold uppercase">自動</span>
               </div>
            </div>
            <input 
              type="number" 
              value={formData.feeAuto ? (formData.price && formData.qty ? Math.round(parseFloat(formData.price) * parseInt(formData.qty) * 0.001425) : "") : formData.feeCustom} 
              onChange={e => setFormData({...formData, feeCustom: e.target.value})}
              disabled={formData.feeAuto}
              placeholder={formData.feeAuto ? "自動計算 (0.1425%)" : "輸入手續費"}
              className={`w-full bg-transparent border-none p-0 text-sm font-bold outline-none transition-all ${formData.feeAuto ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-200'}`}
            />
          </div>

          {/* 交易稅欄位 (0.3% - 僅在賣出時顯示) */}
          {txnType === TransactionType.SELL && (
            <div className="p-4 border border-slate-800 rounded-xl bg-slate-900/50">
              <div className="flex justify-between items-center mb-2">
                 <label className="text-xs font-black text-slate-500 uppercase tracking-widest">交易稅 (0.3%)</label>
                 <div className="flex items-center gap-2">
                   <input 
                     type="checkbox" 
                     checked={formData.taxAuto} 
                     onChange={(e) => setFormData({...formData, taxAuto: e.target.checked})}
                     className="rounded border-slate-700 bg-slate-800 text-blue-500" 
                   />
                   <span className="text-xs text-slate-400 font-bold uppercase">自動</span>
                 </div>
              </div>
              <input 
                type="number" 
                value={formData.taxAuto ? (formData.price && formData.qty ? Math.round(parseFloat(formData.price) * parseInt(formData.qty) * 0.003) : "") : formData.taxCustom} 
                onChange={e => setFormData({...formData, taxCustom: e.target.value})}
                disabled={formData.taxAuto}
                placeholder={formData.taxAuto ? "自動計算 (0.3%)" : "輸入交易稅"}
                className={`w-full bg-transparent border-none p-0 text-sm font-bold outline-none transition-all ${formData.taxAuto ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-200'}`}
              />
            </div>
          )}
        </div>

        <button 
          onClick={handleAddTransaction} 
          className={`w-full py-4 rounded-2xl font-black text-sm shadow-2xl transition-all active:scale-95 ${txnType === TransactionType.BUY ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/20'}`}
        >
          {formData.id ? '更新交易內容' : `確認執行${txnType === TransactionType.BUY ? '買入' : '賣出'}`}
        </button>
      </div>
    );
  } else {
    return (
      <div className="space-y-5 animate-fadeIn">
        <DatePickerField 
          label="開始日期"
          value={sipData.startDate}
          onChange={val => setSipData({...sipData, startDate: val})}
        />
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">股票代碼</label>
          <input 
            type="text" 
            value={sipData.code} 
            onChange={e => setSipData({...sipData, code: e.target.value.toUpperCase()})} 
            placeholder="0050 or NVDA" 
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500/50 shadow-inner" 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">每期金額</label>
          <input 
            type="number" 
            value={sipData.amount || ''} 
            onChange={e => setSipData({...sipData, amount: Number(e.target.value)})} 
            placeholder="輸入金額"
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500/50 shadow-inner" 
          />
        </div>
        
        <div className="space-y-3">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">扣款週期</label>
          <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            {Object.values(SipFrequency).map(f => (
              <button 
                key={f}
                onClick={() => setSipData({...sipData, frequency: f, details: []})}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${sipData.frequency === f ? 'bg-slate-800 text-blue-400' : 'text-slate-600'}`}
              >
                {f === SipFrequency.DAILY ? '每日' : f === SipFrequency.WEEKLY ? '每週' : '每月'}
              </button>
            ))}
          </div>
        </div>

        {sipData.frequency === SipFrequency.WEEKLY && (
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">選擇星期</label>
            <div className="grid grid-cols-4 gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <button 
                  key={day} 
                  onClick={() => toggleSipDay(day)}
                  className={`py-2 text-xs font-black rounded-lg border transition-all ${sipData.details.includes(day) ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'bg-slate-950/40 text-slate-600 border-slate-800'}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        {sipData.frequency === SipFrequency.MONTHLY && (
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">選擇日期</label>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(day => (
                <button 
                  key={day} 
                  onClick={() => toggleSipDay(day)}
                  className={`py-1.5 text-xs font-black rounded border transition-all ${sipData.details.includes(day) ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'bg-slate-950/40 text-slate-600 border-slate-800'}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={handleAddSipPlan} 
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-black text-sm shadow-2xl transition-all active:scale-95"
        >
          新增定期計畫
        </button>
      </div>
    );
  }
};
