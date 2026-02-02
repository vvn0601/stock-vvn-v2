import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';
import { Transaction, Holding } from '../types';
import { Loading } from './ui/Loading';
import { EmptyState } from './ui/EmptyState';
import { useNotification } from '../context/NotificationContext';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface ChartSectionProps {
  transactions: Transaction[];
  stocks: Holding[];
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  selectedSymbol: string | null;
  onClearSelection: () => void;
}

export const ChartSection: React.FC<ChartSectionProps> = ({ 
  transactions, stocks, startDate, endDate, onDateChange, selectedSymbol, onClearSelection
}) => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'trend' | 'growth' | 'allocation'>('trend');
  const [historicalData, setHistoricalData] = useState<any[] | Record<string, any[]>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  
  // ✅ 新增：歷史數據快取
  const historyCache = useRef<Record<string, any[]>>({});

  // ✅ 新增：暫存日期 (控制輸入框，不直接觸發更新)
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  // 當外部日期改變時(例如按了重置)，同步更新輸入框
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  // 1. 計算默認全區間（最早成交日 ~ 今天）
  const { defaultStart, defaultEnd } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    if (transactions.length === 0) return { defaultStart: startDate, defaultEnd: today };
    const dates = transactions.map(t =>  new Date(t.date.replace(/\//g, '-')).getTime());
    const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0].replace(/-/g, '/');
    return { defaultStart: minDate, defaultEnd: today };
  }, [transactions]);

  // ✅ 自動初始化：如果有交易紀錄，且當前區間跟默認不一樣，就自動切換到全區間 (只執行一次)
  useEffect(() => {
    if (transactions.length > 0) {
        // 如果目前的開始日期比最早交易日還晚，代表區間被截斷了，自動擴展
        if (startDate > defaultStart) {
            onDateChange(defaultStart, defaultEnd);
        }
    }
  }, [defaultStart, transactions.length]); // 依賴 transactions 變動

  // 2. 串接歷史 API (含快取與總覽支援)
  useEffect(() => {
    const fetchHistory = async () => {
      // 無選股且無交易，不需執行
      if (!selectedSymbol && transactions.length === 0) {
        setHistoricalData([]); setDebugInfo(''); return;
      }

      setIsLoading(true);
      
      const cleanBaseUrl = 'https://stock-api-xbfl.vercel.app';
      const start = startDate.replace(/\//g, '-');
      const end = endDate.replace(/\//g, '-');
      const cacheKeyRange = `${start}_${end}`;

      // A. 決定要抓哪些股票
      let symbolsToFetch = [];
      if (selectedSymbol) {
        symbolsToFetch = [selectedSymbol];
      } else {
        const holdingCodes = new Set(transactions.map(t => t.code));
        symbolsToFetch = Array.from(holdingCodes);
      }

      // B. 檢查快取
      const neededSymbols = symbolsToFetch.filter(code => {
        const key = `${code}_${cacheKeyRange}`;
        return !historyCache.current[key];
      });

      try {
        if (neededSymbols.length > 0) {
           await Promise.all(neededSymbols.map(async (code) => {
             const sym = code.toUpperCase().replace('.TW', '').trim();
             const url = `${cleanBaseUrl}/api/history?symbol=${sym}&start=${start}&end=${end}`;
             try {
               const res = await fetch(url);
               const data = await res.json();
               let points: any[] = [];
               
               if (Array.isArray(data)) points = data;
               else if (data.points) points = data.points;
               else if (data.chart?.result?.[0]) {
                 const r = data.chart.result[0];
                 points = r.timestamp.map((t: number, i: number) => ({
                    date: new Date(t * 1000).toISOString().slice(0, 10),
                    close: r.indicators.quote[0].close[i] || 0
                 })).filter((p: any) => p.close > 0);
               }
               
               if (points.length > 0) {
                 const formatted = points.map((p: any) => ({
                   date: (p.date || '').replace(/-/g, '/').split('T')[0],
                   close: parseFloat(p.close || p.price || 0)
                 }));
                 historyCache.current[`${code}_${cacheKeyRange}`] = formatted;
               }
             } catch (e) { console.error(e); }
           }));
        }

        // C. 更新 State
        if (selectedSymbol) {
           const key = `${selectedSymbol}_${cacheKeyRange}`;
           setHistoricalData(historyCache.current[key] || []);
        } else {
           const combined: Record<string, any[]> = {};
           symbolsToFetch.forEach(code => {
             const key = `${code}_${cacheKeyRange}`;
             if (historyCache.current[key]) combined[code] = historyCache.current[key];
           });
           setHistoricalData(combined);
        }
        setDebugInfo(''); 

      } catch (err: any) {
        setDebugInfo(`錯誤: ${err.message}`);
        setHistoricalData(selectedSymbol ? [] : {});
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [selectedSymbol, startDate, endDate, transactions]);

  // 3. 圖表數據彙整
  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];

    // --- A. 單一股票模式 ---
    if (selectedSymbol) {
       if (!Array.isArray(historicalData) || historicalData.length === 0) return [];
       const symbolTx = transactions
         .filter(t => t.code === selectedSymbol)
         .sort((a,b) => new Date(a.date.replace(/\//g, '-')).getTime() - new Date(b.date.replace(/\//g, '-')).getTime());
       
       return historicalData.map(h => {
         const hDate = new Date(h.date.replace(/\//g, '-')); 
         let shares = 0; let cost = 0;
         symbolTx.forEach(t => {
           const tDate = new Date(t.date.replace(/\//g, '-'));
           if (tDate <= hDate) {
             if (t.type === 'buy') { cost += t.price * t.qty + (t.fee || 0); shares += t.qty; }
             else if (t.type === 'sell') { const avg = shares > 0 ? cost / shares : 0; cost -= avg * t.qty; shares -= t.qty; }
           }
         });
         return { date: h.date, marketValue: shares * h.close, cost: cost, price: h.close };
       });
    }

    // --- B. 總覽模式 (含市值計算與休市回補) ---
    if (Array.isArray(historicalData)) return [];
    
    // 1. 收集日期
    const allDates = new Set<string>();
    Object.values(historicalData).forEach((points: any[]) => points.forEach(p => allDates.add(p.date)));
    const sortedDates = Array.from(allDates).sort();
    if (sortedDates.length === 0) return [];

    // 2. 建立查詢表
    const lastPrices: Record<string, number> = {}; 
    const priceMap: Record<string, number> = {}; 

    Object.keys(historicalData).forEach(code => {
        lastPrices[code] = 0; 
        (historicalData as any)[code].forEach((p: any) => {
            priceMap[`${code}-${p.date}`] = p.close;
        });
    });

    // 3. 每日計算
    return sortedDates.map(dateStr => {
        const currentDate = new Date(dateStr.replace(/\//g, '-'));
        let totalMarketValue = 0;
        let totalCost = 0;
        
        Object.keys(historicalData).forEach(code => {
            let currentPrice = priceMap[`${code}-${dateStr}`];
            if (currentPrice !== undefined && currentPrice > 0) {
                lastPrices[code] = currentPrice;
            } else {
                currentPrice = lastPrices[code] || 0;
            }
            
            const txs = transactions.filter(t => t.code === code);
            let shares = 0; let cost = 0;
            txs.forEach(t => {
                const tDate = new Date(t.date.replace(/\//g, '-'));
                if (tDate <= currentDate) {
                    if (t.type === 'buy') { shares += t.qty; cost += t.price * t.qty + (t.fee || 0); }
                    else if (t.type === 'sell') { const avg = shares > 0 ? cost / shares : 0; cost -= avg * t.qty; shares -= t.qty; }
                }
            });
            
            if (currentPrice > 0) totalMarketValue += shares * currentPrice;
            else if (shares > 0) totalMarketValue += cost; 
            
            totalCost += cost;
        });
        
        return { date: dateStr, marketValue: totalMarketValue, cost: totalCost };
    });
  }, [transactions, selectedSymbol, historicalData]);

  // 4. 月平均數據
  const monthlyData = useMemo(() => {
    if (chartData.length === 0) return [];
    const groups: Record<string, any> = {};
    
    chartData.forEach((d: any) => {
      const month = d.date.substring(0, 7);
      if (!groups[month]) groups[month] = { count: 0, cost: 0, marketValue: 0, start: d.date, end: d.date };
      groups[month].cost += d.cost;
      groups[month].marketValue += d.marketValue;
      groups[month].count += 1;
      groups[month].end = d.date;
    });

    return Object.keys(groups).sort().map(m => ({
      date: m,
      cost: groups[m].cost / groups[m].count,
      marketValue: groups[m].marketValue / groups[m].count,
      range: `${groups[m].start} - ${groups[m].end}`
    }));
  }, [chartData]);

  // 5. 圓餅圖數據
  const pieData = useMemo(() => {
    if (stocks.length === 0) return [];
    
    if (!selectedSymbol) {
      const totalPortfolioCost = stocks.reduce((acc, s) => acc + s.totalCost, 0);
      return stocks
        .filter(s => s.totalCost > 0)
        .map(s => ({
          name: s.code,
          value: s.totalCost,
          percent: s.totalCost / totalPortfolioCost
        }))
        .sort((a, b) => b.value - a.value);
    }

    const target = stocks.find(s => s.code === selectedSymbol);
    const totalMV = stocks.reduce((acc, s) => acc + s.marketValue, 0);
    const targetMV = target ? target.marketValue : 0;
    return [
      { name: selectedSymbol, value: targetMV },
      { name: '其餘持倉', value: Math.max(0, totalMV - targetMV) }
    ];
  }, [stocks, selectedSymbol]);

  // Render 邏輯
  const renderChart = () => {
    if (isLoading) return <Loading />;
    if (transactions.length === 0) return <EmptyState message="尚無交易數據" icon="chart-line" />;
    
    // 空狀態處理
    if (selectedSymbol && Array.isArray(historicalData) && historicalData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[350px] text-slate-500 font-bold border-2 border-dashed border-slate-800 rounded-2xl p-4 text-center">
          <i className="fas fa-exclamation-triangle mb-2 text-2xl opacity-20"></i>
          <p>無歷史資料或請點擊持倉</p>
          <pre className="text-[10px] mt-4 opacity-40 font-mono whitespace-pre-wrap max-w-full overflow-hidden">{debugInfo}</pre>
        </div>
      );
    }

    const growthChartData = monthlyData; 

    return (
      // ✅ 1. 移除 inline style，改用 className 設定具體高度
      // ✅ 2. 加上 w-full 確保寬度撐滿
      <div className="w-full h-auto aspect-[16/9] min-h-[300px]"> 
        {debugInfo && (
          <div className="p-3 bg-red-900/20 border border-red-500 rounded-lg mb-3 text-xs font-mono max-h-32 overflow-auto text-red-200">
            Debug: {debugInfo}
          </div>
        )}

        <ResponsiveContainer width="99%" height="100%" minWidth={50}>
           {activeTab === 'allocation' ? (
            <PieChart>
              <Pie data={pieData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
                formatter={(v: any) => [`$${Math.round(v).toLocaleString()}`, selectedSymbol ? '市值' : '投入成本']} 
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          ) : activeTab === 'growth' ? (
            <BarChart data={growthChartData} margin={{ left: 0, right: 10, top: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} />
              <YAxis stroke="#94a3b8" tick={{fontSize: 10}} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip 
                cursor={{fill: '#334155', opacity: 0.2}}
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} 
                formatter={(v: number) => [`$${Math.round(v).toLocaleString()}`, '']}
                labelFormatter={(label, payload) => {
                    if (payload && payload[0]?.payload?.range) return `${label} (${payload[0].payload.range})`;
                    return label;
                }}
              />
              <Legend />
              <Bar dataKey="cost" name="平均成本" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="marketValue" name="平均市值" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} />
              <YAxis stroke="#94a3b8" width={50} tick={{fontSize: 10}} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(v: any) => `$${Math.round(v).toLocaleString()}`} />
              <Legend />
              <Area type="monotone" dataKey="marketValue" name={selectedSymbol ? "市值趨勢" : "總市值"} stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
              <Area type="monotone" dataKey="cost" name={selectedSymbol ? "持有成本" : "總投入成本"} stroke="#F2D21B" fill="none" strokeDasharray="5 5" strokeWidth={2} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 w-full flex flex-col overflow-hidden mb-10 min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {selectedSymbol && (
            <button onClick={onClearSelection} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-500 hover:text-blue-500 transition-colors shadow-sm">
              <i className="fas fa-arrow-left"></i>
            </button>
          )}
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['trend', 'growth', 'allocation'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                {tab === 'trend' ? '趨勢分析' : tab === 'growth' ? '累積成長' : '持倉佔比'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* ✅ 篩選區塊：使用暫存 State + 篩選按鈕 */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-1 border border-transparent focus-within:border-blue-500/50 transition-all">
            <input 
              type="date" 
              value={tempStart.replace(/\//g, '-')} 
              onChange={e => setTempStart(e.target.value.replace(/-/g, '/'))} 
              className="bg-transparent border-none text-[11px] font-black p-1 outline-none dark:text-slate-200 focus:ring-0" 
            />
            <span className="text-gray-400 font-black px-1">-</span>
            <input 
              type="date" 
              value={tempEnd.replace(/\//g, '-')} 
              onChange={e => setTempEnd(e.target.value.replace(/-/g, '/'))} 
              className="bg-transparent border-none text-[11px] font-black p-1 outline-none dark:text-slate-200 focus:ring-0" 
            />
          </div>
          
          <button 
            onClick={() => onDateChange(tempStart, tempEnd)} 
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black transition-all shadow-sm active:scale-95"
          >
            篩選
          </button>
          
          <button 
            onClick={() => onDateChange(defaultStart, defaultEnd)} 
            className={`px-3 py-2 text-[11px] font-black rounded-lg transition-all ${startDate !== defaultStart || endDate !== defaultEnd ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 dark:bg-slate-800 text-slate-400 cursor-default'}`}
          >
            重置
          </button>
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col justify-center min-h-[350px]">
          {renderChart()}
      </div>
    </div>
  );
};
