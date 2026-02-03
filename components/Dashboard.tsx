import React from 'react';
import { KpiData } from '../types';
import { Icons } from '../constants';
import { formatNumber } from '../utils/formatters';

interface DashboardProps {
  kpiView: 'ALL' | 'TW' | 'US';
  setKpiView: (view: 'ALL' | 'TW' | 'US') => void;
  isUpdatingRate: boolean;
  handleUpdateRate: () => void;
  kpiData: KpiData;
  liabilityStats: { totalDebt: number; totalInterest: number };
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  totalInterest: number;
  realizedGain: number; // 👈 加入這一行

  // ✅ 新增這五行
  scriptUrl: string;
  setScriptUrl: (url: string) => void;
  notify: (type: string, message: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  kpiView,
  setKpiView,
  isUpdatingRate,
  handleUpdateRate,
  kpiData,
  liabilityStats,
  setIsSidebarOpen,
  scriptUrl,
  setScriptUrl,
  notify,
  totalInterest, // <--- 這裡加入新變數
  realizedGain, // 👈 這裡也要接住傳過來的數值
}) => {
  const [showDatabaseModal, setShowDatabaseModal] = React.useState(false);
  return (
    <div className="mb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl">
            <Icons.Menu size={24} />
          </button>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase">退休基金</h1>
        </div>
        <div className="flex items-center gap-5 w-full lg:w-auto">
          <div className="flex p-1.5 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex-1 lg:flex-none">
            {['ALL', 'TW', 'US'].map(v => (
              <button key={v} onClick={() => setKpiView(v as any)} className={`flex-1 lg:px-6 py-2 text-xs font-black rounded-xl transition-all ${kpiView === v ? 'bg-slate-800 text-blue-400 shadow-2xl' : 'text-slate-600 hover:text-slate-400'}`}>{v === 'ALL' ? '全部' : v === 'TW' ? '台股' : '美股'}</button>
            ))}
          </div>
          <button onClick={handleUpdateRate} disabled={isUpdatingRate} className={`flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xs font-black transition-all shadow-2xl active:scale-95 ${isUpdatingRate ? 'opacity-50' : ''}`}><Icons.RefreshCw size={14} className={isUpdatingRate ? 'animate-spin' : ''} /><span className="hidden sm:inline">更新匯率</span></button>
         {/* ✅ 輸入框與綁定按鈕 */}
        <div className="flex gap-2 items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <input
            type="text"
            value={scriptUrl}
            onChange={(e) => setScriptUrl(e.target.value)}
            placeholder="貼上 GAS 網址"
            className="bg-transparent text-xs text-white px-3 py-2 w-40 focus:outline-none"
          />
          <button 
            onClick={() => {
              if(scriptUrl.trim()) {
               notify('success', '資料庫已綁定！重整頁面生效');
                setTimeout(() => window.location.reload(), 1000);
              } else {
                alert('請輸入網址');
              }
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-lg transition-all active:scale-95"
          >
            綁定
          </button>
          </div>
      </div>    
    </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: '資產總計', value: `${kpiView === 'US' ? '$' : 'NT$'} ${formatNumber(kpiData.totalVal)}`, icon: <Icons.Wallet size={20} />, sub: `成本 ${formatNumber(kpiData.totalCost)}`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: '未實現損益', value: `${kpiData.pl > 0 ? '+' : ''}${formatNumber(kpiData.pl)}`, icon: <Icons.TrendingUp size={20} />, sub: `${kpiData.plRate.toFixed(2)}% 報酬率`, color: kpiData.pl > 0 ? 'text-emerald-400' : kpiData.pl < 0 ? 'text-rose-400' : 'text-slate-100', bg: kpiData.pl >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10' },
         { 
label: '已實現損益', 
  value: `${kpiView === 'US' ? '$' : 'NT$'} ${formatNumber(
    kpiView === 'US' ? realizedGain : realizedGain + totalInterest
  )}`, 
  icon: <Icons.PieChart size={20} />, 
  sub: kpiView === 'US' ? '純美股交易獲利' : `累積股息 NT$ ${formatNumber(totalInterest)}`, 
  color: (realizedGain + (kpiView === 'US' ? 0 : totalInterest)) >= 0 ? 'text-indigo-400' : 'text-rose-400', 
  bg: 'bg-indigo-500/10' 
},


          // 👇 請補回這一段（這是原本的第 4 個）：
          { 
            label: '淨資產效益', 
            value: formatNumber(kpiData.netProfit), 
            icon: <Icons.Activity size={20} />, 
            sub: `累計利息 ${formatNumber(liabilityStats.totalInterest)}`, 
            color: 'text-amber-400', 
            bg: 'bg-amber-500/10' 
          },
        ].map((item, i) => (
          <div key={i} className="glass p-7 rounded-3xl border-slate-800 shadow-2xl relative group overflow-hidden border border-white/5">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-3 rounded-2xl ${item.bg} ${item.color} shadow-lg`}>{item.icon}</div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
            </div>
            <div className={`text-2xl md:text-3xl font-black mb-1 ${item.color}`}>{item.value}</div>
            <div className="text-xs text-slate-600 font-bold">{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
