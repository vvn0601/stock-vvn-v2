import React from 'react';
import { KpiData, Holding } from '../types';
import { Icons } from '../constants';
import { formatNumber } from '../utils/formatters';
import { Loading } from './ui/Loading';

interface NewsSectionProps {
  strategy: string;
  holdings: Holding[];
  kpiData: KpiData;
  activeTheme: string;
  setActiveTheme: (theme: any) => void;
  marketThemes: Record<string, string[]>;
  stockDataCache: Record<string, { price: number; status: string }>;
  isUpdatingTrending: boolean;
  trendingError: boolean;
  handleRefreshTrending: () => void;
  stockMap: Record<string, string>;
}

export const NewsSection: React.FC<NewsSectionProps> = ({
  strategy,
  holdings,
  kpiData,
  activeTheme,
  setActiveTheme,
  marketThemes,
  stockDataCache,
  isUpdatingTrending,
  trendingError,
  handleRefreshTrending,
  stockMap
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
      {/* AI Strategy Advisor */}
      <div className="glass p-9 rounded-3xl border-slate-800 shadow-2xl relative overflow-hidden group border border-white/5">
        <div className="flex items-center gap-5 mb-8"><div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center font-black shadow-xl border border-indigo-500/10 uppercase">AI</div><h3 className="text-xl font-black tracking-tighter text-white uppercase">投資策略顧問</h3></div>
        <div className="text-slate-400 text-sm leading-relaxed mb-8 font-medium">
          {holdings.length > 0 ? (<><div className="mb-5 font-black text-slate-100 flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>當前目標: <span className="text-indigo-400">"{strategy}"</span></div>基於您的組合與當前市場趨勢分析，目前主要權重集中於 {holdings.slice(0, 3).map(h => h.code).join(', ')}。<span className="block mt-4 text-slate-300 font-bold">{kpiData.plRate > 15 ? '目前利潤豐厚，建議可考慮分批減持高估值標的，保留部分現金以應對市場波動。' : '維持目前持倉配置，專注於具備長期競爭優勢的龍頭企業，複利是您最強大的武器。'}</span></>) : "請先於左側新增交易，以獲得量身定制的投資建議。"}
        </div>
        <div className="flex flex-wrap gap-2.5">{['長期複利', '配置多元', '抗通膨'].map(tag => (<span key={tag} className="px-4 py-1.5 bg-slate-950 text-[10px] font-black text-slate-500 rounded-xl border border-slate-800 uppercase tracking-widest">{tag}</span>))}</div>
      </div>
      
      {/* Market Trending Dashboard (MarketTrends) */}
      <div className="glass p-8 rounded-3xl border-slate-800 shadow-2xl flex flex-col border border-white/5 bg-slate-900/40 min-h-[400px]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black tracking-tighter text-white uppercase flex items-center gap-4">
            <Icons.BarChart2 className="text-blue-500" size={22} />趨勢看板
          </h3>
          <button onClick={handleRefreshTrending} disabled={isUpdatingTrending} className={`p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-all ${isUpdatingTrending ? 'opacity-50' : ''}`}>
            <Icons.RefreshCw size={14} className={isUpdatingTrending ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800 mb-6 overflow-x-auto no-scrollbar">
          {Object.keys(marketThemes).map(theme => (
            <button key={theme} onClick={() => setActiveTheme(theme)} className={`whitespace-nowrap px-5 py-2 text-[10px] font-black rounded-xl transition-all ${activeTheme === theme ? 'bg-slate-800 text-blue-400 shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>{theme}</button>
          ))}
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar pr-2 relative">
          {isUpdatingTrending && <Loading />}
          
          {!isUpdatingTrending && trendingError ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <p className="text-xs font-black text-rose-400 uppercase tracking-widest">暫時無法獲取資料</p>
              <button onClick={handleRefreshTrending} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black transition-all">點擊重試</button>
            </div>
          ) : !isUpdatingTrending && (
            <div className="space-y-2">
              {marketThemes[activeTheme]?.map((sym) => {
                const cached = stockDataCache[sym];
                return (
                  <div key={sym} className="flex justify-between items-center p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/50 hover:bg-slate-900/50 transition-all">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-100">{sym}</span>
                      <span className="text-[9px] text-slate-600 font-bold truncate max-w-[150px]">{stockMap[sym.replace('.TW', '').replace('.TWO', '')] || sym}
                      </span>
                    </div>
                    <div className="text-right">
                      {cached ? (
                        <>
                          <div className="text-sm font-mono font-bold text-slate-200">
                            {cached.status === 'success' ? formatNumber(cached.price, 2) : '-'}
                          </div>
                          <div className={`text-[10px] font-black ${cached.status === 'error' ? 'text-rose-500' : 'text-slate-500'}`}>
                            {cached.status === 'error' ? '連線失敗' : '參考價格'}
                          </div>
                        </>
                      ) : (
                        <div className="h-5 w-16 bg-slate-800/50 rounded-lg animate-pulse"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
