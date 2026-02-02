import React from 'react';
import { MarketType, TransactionType, Transaction, SipPlan } from '../types';
import { Icons } from '../constants';
import { TransactionForm } from './TransactionForm';
import { formatDate, formatNumber } from '../utils/formatters';


interface SidebarProps {
isSidebarOpen: boolean;
setIsSidebarOpen: (open: boolean) => void;
strategy: string;
setStrategy: (s: string) => void;
market: MarketType;
setMarket: (m: MarketType) => void;
inputMode: 'single' | 'sip';
setInputMode: (mode: 'single' | 'sip') => void;
txnType: TransactionType;
setTxnType: (type: TransactionType) => void;
transactions: Transaction[];
sipPlans: SipPlan[];
handleEditTransaction: (t: Transaction) => void;
handleDeleteTransaction: (id: string) => void;
importExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
exportExcel: () => void;
downloadFormat: () => void;
// Props for TransactionForm
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
scriptUrl: string;
setScriptUrl: (val: string) => void;
}


export const Sidebar: React.FC<SidebarProps> = ({
isSidebarOpen,
setIsSidebarOpen,
strategy,
setStrategy,
market,
setMarket,
inputMode,
setInputMode,
txnType,
setTxnType,
transactions,
sipPlans,
handleEditTransaction,
handleDeleteTransaction,
importExcel,
exportExcel,
downloadFormat,
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
const sidebarMarketBg = market === MarketType.US ? 'bg-indigo-950/20' : 'bg-slate-900/60 backdrop-blur-2xl';


return (
<aside className={`w-[350px] fixed left-0 top-0 h-full border-r border-slate-800 z-40 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${sidebarMarketBg}`}>
{/* Investment Strategy Header */}
<div className="p-4 bg-blue-50/10 border-b border-blue-500/20">
<div className="flex justify-between items-center mb-1">
<label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">投資策略</label>
<button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500 hover:text-white transition-colors">
<Icons.X size={14} />
</button>
</div>
<textarea
className="w-full p-2 bg-transparent border-none focus:ring-0 text-sm font-semibold resize-none text-white placeholder-slate-500 outline-none leading-tight"
rows={2}
value={strategy}
onChange={(e) => setStrategy(e.target.value)}
placeholder="在此輸入您的長期投資策略..."
/>
</div>


<div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
{/* Market Toggle */}
<div className="flex bg-slate-900 rounded-xl p-1 shadow-inner">
<button
onClick={() => setMarket(MarketType.TW)}
className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${market === MarketType.TW ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-400'}`}
>
台股
</button>
<button
onClick={() => setMarket(MarketType.US)}
className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${market === MarketType.US ? 'bg-slate-700 shadow-md text-yellow-400' : 'text-slate-500 hover:text-slate-400'}`}
>
美股
</button>
</div>


<div className="space-y-4">
{/* Mode & Action Toggle */}
<div className="flex justify-between items-center">
<div className="flex bg-slate-900 rounded-lg p-0.5">
<button
onClick={() => setInputMode('single')}
className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${inputMode === 'single' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
>
單筆交易
</button>
<button
onClick={() => setInputMode('sip')}
className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${inputMode === 'sip' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
>
定期定額
</button>
</div>


{inputMode === 'single' && (
<div className="flex bg-slate-900 rounded-lg p-0.5">
<button
onClick={() => setTxnType(TransactionType.BUY)}
className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${txnType === TransactionType.BUY ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
>
買入
</button>
<button
onClick={() => setTxnType(TransactionType.SELL)}
className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${txnType === TransactionType.SELL ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-400'}`}
>
賣出
</button>
</div>
)}
</div>


<TransactionForm
inputMode={inputMode}
txnType={txnType}
formData={formData}
setFormData={setFormData}
sipData={sipData}
setSipData={setSipData}
recentSymbols={recentSymbols}
isFetchingPrice={isFetchingPrice}
handleFetchCurrentPrice={handleFetchCurrentPrice}
calculatedFee={calculatedFee}
calculatedTax={calculatedTax}
grandTotalPreview={grandTotalPreview}
handleAddTransaction={handleAddTransaction}
handleAddSipPlan={handleAddSipPlan}
toggleSipDay={toggleSipDay}
/>
</div>


<div className="pt-6 border-t border-slate-800/50">
<h4 className="text-[10px] font-black text-slate-600 uppercase mb-4 tracking-widest flex justify-between">
<span>{inputMode === 'single' ? '近期交易明細' : '已設定定期定額'}</span>
<span className="text-blue-500">{inputMode === 'single' ? transactions.length : sipPlans.length}</span>
</h4>
<div className="space-y-3">
{inputMode === 'single' ? (
transactions.slice(0, 5).map((item) => (
<div key={item.id} className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/50 flex justify-between items-center group hover:bg-slate-900/50 transition-all shadow-sm">
<div className="flex-1 min-w-0 pr-3">
<div className="flex items-center gap-2">
<span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${item.type === TransactionType.BUY ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
{item.type === TransactionType.BUY ? '買入' : '賣出'}
</span>
<div className="text-[11px] font-black text-slate-200">{item.code}</div>
</div>
<div className="text-[9px] text-slate-500 mt-1 font-bold">{formatDate(item.date)} | {formatNumber(item.price)} x {formatNumber(item.qty)}</div>
</div>
<div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button onClick={() => handleEditTransaction(item)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 transition-all"><Icons.Edit size={12} /></button>
<button onClick={() => handleDeleteTransaction(item.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all"><Icons.Trash2 size={12} /></button>
</div>
</div>
))
) : (
sipPlans.map(p => (
<div key={p.id} className="p-3 bg-slate-950/40 dark:bg-slate-800/50 border border-transparent hover:border-blue-500/30 rounded-xl transition-all">
<div className="flex justify-between items-center">
<div>
<p className="text-xs font-black text-slate-200">{p.code}</p>
<p className="text-[9px] text-slate-500 font-bold uppercase">{p.frequency}</p>
</div>
<p className="text-xs font-black text-blue-400">${formatNumber(p.amount)}</p>
</div>
</div>
))
)}
{(inputMode === 'single' ? transactions.length : sipPlans.length) === 0 && (
<div className="py-10 text-center opacity-20">
<p className="text-[10px] font-bold uppercase tracking-widest">尚無紀錄</p>
</div>
)}
</div>
</div>

<div className="mt-6 pt-6 border-t border-slate-800 flex flex-col gap-3">
<div className="flex gap-2">
<label className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-900 flex items-center justify-center gap-2 cursor-pointer transition-all"><Icons.Upload size={14} className="text-slate-600" /><span className="text-[10px] font-black text-slate-600">匯入</span><input type="file" className="hidden" onChange={importExcel} /></label>
<button onClick={exportExcel} className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-900 flex items-center justify-center gap-2 transition-all"><Icons.Download size={14} className="text-slate-600" /><span className="text-[10px] font-black text-slate-600">導出</span></button>
</div>
<button onClick={downloadFormat} className="w-full text-center text-[10px] font-black text-blue-500/60 hover:text-blue-400 transition-colors uppercase tracking-widest py-1">下載匯入格式</button>
</div>
</div>
</aside>
);
};

