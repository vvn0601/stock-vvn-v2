
import React from 'react';
import { Holding } from '../types';
import { EmptyState } from './ui/EmptyState';
import { useNotification } from '../context/NotificationContext';
import { formatNumber } from '../utils/formatters';

interface InventorySectionProps {
  stocks: Holding[];
  onRefresh: () => Promise<void>;
  onSelectStock: (symbol: string) => void;
  selectedSymbol: string | null;
}

export const InventorySection: React.FC<InventorySectionProps> = ({ 
  stocks, 
  onRefresh, 
  onSelectStock, 
  selectedSymbol 
}) => {
  const { notify } = useNotification();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      await onRefresh();
      notify('success', '現價更新完成');
    } catch (error) {
      notify('error', '即時價格刷新失敗，請稍後再試');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden mb-6 transition-all">
      {/* 永久保留的卡片標題列 */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
          <i className="fas fa-cubes mr-2 text-blue-500"></i>
          庫存明細
        </h3>
        <button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <i className={`fas fa-sync-alt text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}></i>
        </button>
      </div>
      
      {/* 電腦版表格 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs text-gray-400 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
              <th className="p-4 font-black uppercase tracking-wider">標的代碼/名稱</th>
              <th className="p-4 font-black text-right uppercase tracking-wider">均價</th>
              <th className="p-4 font-black text-right uppercase tracking-wider">總成本</th>
              <th className="p-4 font-black text-right uppercase tracking-wider">股數</th>
              <th className="p-4 font-black text-right uppercase tracking-wider">目前市價</th>
              <th className="p-4 font-black text-right uppercase tracking-wider">報酬損益</th>
              <th className="p-4 font-black text-right uppercase tracking-wider">損益 %</th>
            </tr>
          </thead>
          <tbody>
            {stocks.length === 0 ? (
               <tr>
                 <td colSpan={7} className="p-12 text-center">
                    <EmptyState message="目前無倉位資料" subMessage="請於左側新增" icon="box-open" />
                 </td>
               </tr>
            ) : (
              stocks.map(stock => {
                const isProfit = stock.unrealizedPL >= 0;
                const colorClass = isProfit ? 'text-red-500' : 'text-green-500';

                return (
                  <tr 
                    key={stock.code} 
                    onClick={() => onSelectStock(stock.code)}
                    className={`border-b dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-all group
                      ${selectedSymbol === stock.code ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 pl-3' : 'border-l-4 border-l-transparent'}`}
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 dark:text-white">{stock.code}</span>
                        <span className="text-[10px] font-bold text-gray-400 mt-0.5 group-hover:text-blue-500 transition-colors uppercase">{stock.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">${formatNumber(stock.avgCost, 2)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">${formatNumber(stock.totalCost)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">{formatNumber(stock.qty)}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-black text-slate-800 dark:text-white">${formatNumber(stock.currPrice, 2)}</span>
                    </td>
                    <td className={`p-4 text-right font-black text-sm ${colorClass}`}>
                      {isProfit ? '+' : ''}{formatNumber(stock.unrealizedPL)}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isProfit ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {isProfit ? '+' : ''}{stock.profitRate.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 手機版卡片 */}
      <div className="block md:hidden">
        {stocks.length === 0 ? (
           <div className="p-8 flex justify-center">
              <EmptyState message="目前無倉位資料" subMessage="請於左側新增" icon="box-open" />
           </div>
        ) : (
          stocks.map((stock) => {
            const isProfit = stock.unrealizedPL >= 0;
            return (
              <div 
                key={stock.code} 
                onClick={() => onSelectStock(stock.code)}
                className={`p-4 border-b dark:border-slate-800 active:bg-gray-100 dark:active:bg-slate-800 transition-colors
                   ${selectedSymbol === stock.code ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
              >
                 <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="text-base font-black dark:text-white">{stock.code}</span>
                      <span className="text-xs font-bold text-gray-400">{stock.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-base font-black block ${isProfit ? 'text-red-500' : 'text-green-500'}`}>
                        {isProfit ? '+' : ''}{formatNumber(stock.unrealizedPL)}
                      </span>
                      <span className={`text-xs font-bold ${isProfit ? 'text-red-500' : 'text-green-500'}`}>
                        {stock.profitRate.toFixed(2)}%
                      </span>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 text-[10px] bg-gray-50 dark:bg-slate-800/50 p-2 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-bold uppercase">均價 / 成本</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        ${formatNumber(stock.avgCost, 1)} / ${formatNumber(stock.totalCost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-bold uppercase">股數 / 現價</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {formatNumber(stock.qty)} / ${formatNumber(stock.currPrice, 1)}
                      </span>
                    </div>
                 </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
