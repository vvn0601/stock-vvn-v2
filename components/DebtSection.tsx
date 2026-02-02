
import React, { useState, useRef } from 'react';
import { Debt, Transaction } from '../types';

interface DebtSectionProps {
  debts: Debt[];
  setDebts: React.Dispatch<React.SetStateAction<Debt[]>>;
  transactions: Transaction[];
  onRepay: (id: string, amount: number, date: string, type: 'total' | 'principal' | 'interest') => void;
}


const DebtSection: React.FC<DebtSectionProps> = ({ debts, setDebts, onRepay }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debtType, setDebtType] = useState<'pledge' | 'loan'>('pledge');
  
  // 用於觸發隱藏的 date picker
  const datePickerRef = useRef<HTMLInputElement>(null);

  // --- 👇 新增：還款 Modal 相關狀態 ---
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [repayForm, setRepayForm] = useState({
    type: 'total' as 'total' | 'principal' | 'interest',
    date: new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
    amount: ''
  });
  const repayDatePickerRef = useRef<HTMLInputElement>(null); // 還款日期選擇器

  const [form, setForm] = useState({
    symbol: '',
    shares: '',
    amount: '',
    rate: '',
    date: '', // 改為紀錄「借款日期」以計算利息
    fee: '',
    note: ''
  });

  // --- 1. 新版利息計算公式 (按日計息) ---
  const calculateInterest = (amount: number, rate: number, dateStr: string) => {
    if (!amount || !rate || !dateStr) return 0;
    const start = new Date(dateStr);
    const now = new Date();
    // 計算天數差 (毫秒 -> 天)
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // 公式: 本金 * (年利率/100/365) * 天數
    const dailyRate = (rate / 100) / 365;
    return Math.floor(amount * dailyRate * diffDays);
  };

  // 計算總負債與總累積利息
  const totalDebt = debts.reduce((acc, d) => acc + d.amount, 0);
  const totalAccumulatedInterest = debts.reduce((acc, d) => {
    // 若舊資料沒有 date 欄位，暫時回傳 0 以免報錯
    return acc + calculateInterest(d.amount, d.rate, d.date || ''); 
  }, 0);

  // --- 2. 日期處理邏輯 (自動分隔 + 選擇器) ---
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, ''); // 只留數字
    if (v.length > 8) v = v.slice(0, 8);
    // 自動補上斜線 YYYY/MM/DD
    if (v.length > 4) v = `${v.slice(0, 4)}/${v.slice(4)}`;
    if (v.length > 7) v = `${v.slice(0, 7)}/${v.slice(7)}`;
    setForm({ ...form, date: v });
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 將原生 date picker 的 YYYY-MM-DD 轉為 YYYY/MM/DD
    const val = e.target.value.replace(/-/g, '/');
    setForm({ ...form, date: val });
  };

  const handleAdd = () => {
    // 簡單驗證
    if (!form.amount || !form.rate || !form.date) return;

    const newDebt: Debt = {
      id: Math.random().toString(36).substr(2, 9),
      type: debtType,
      symbol: debtType === 'pledge' ? form.symbol : undefined,
      shares: debtType === 'pledge' ? parseInt(form.shares || '0') : undefined,
      amount: parseFloat(form.amount),
      rate: parseFloat(form.rate),
      date: form.date, // 儲存借款日期
      dueDate: '',     // 保留欄位但不使用
      fee: parseFloat(form.fee || '0'),
      note: form.note
    };
    setDebts([...debts, newDebt]);
    // 重置表單
    setForm({ symbol: '', shares: '', amount: '', rate: '', date: '', fee: '', note: '' });
  };

  const removeDebt = (id: string) => setDebts(debts.filter(d => d.id !== id));

  // --- 👇 新增：還款日期變更 ---
  const handleRepayDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 4) v = `${v.slice(0, 4)}/${v.slice(4)}`;
    if (v.length > 7) v = `${v.slice(0, 7)}/${v.slice(7)}`;
    setRepayForm({ ...repayForm, date: v });
  };

  const handleRepayDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/-/g, '/');
    setRepayForm({ ...repayForm, date: val });
  };

  // --- 👇 新增：開啟還款視窗 ---
  const openRepayModal = (debt: Debt) => {
    setSelectedDebt(debt);
    setRepayForm({
      type: 'total',
      date: new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
      amount: ''
    });
    setIsRepayModalOpen(true);
  };

  // --- 👇 新增：執行還款 ---
  const executeRepayment = () => {
    if (!selectedDebt || !repayForm.amount) return;
    const amountNum = parseFloat(repayForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) return alert('請輸入有效金額');

    onRepay(selectedDebt.id, amountNum, repayForm.date, repayForm.type);
    setIsRepayModalOpen(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-6">
      {/* 標題區：點擊收合/展開 */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group"
      >
        <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-500 flex items-center justify-center mr-3 group-hover:bg-red-200 transition-colors">
                 <i className="fas fa-hand-holding-dollar text-lg"></i>
            </div>
            <div className="text-left">
                <h3 className="font-bold text-gray-900 dark:text-white">負債與融資管理</h3>
                <p className="text-xs text-gray-400">股票質押與信貸追蹤</p>
            </div>
        </div>

        {/* 標題右側：即時累積數據 */}
        <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">累計負債 / 利息</span>
                <div className="flex items-center justify-end gap-2">
                    <span className="text-lg font-black text-gray-900 dark:text-white">${totalDebt.toLocaleString()}</span>
                    <span className="text-xs font-bold text-red-500">(-${totalAccumulatedInterest.toLocaleString()})</span>
                </div>
            </div>
            <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400 transition-transform duration-300`}></i>
        </div>
      </button>

      {/* 展開內容區 */}
      {isOpen && (
        <div className="p-6 border-t border-gray-50 dark:border-slate-700 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 左側：輸入表單 */}
            <div className="space-y-4">
              {/* 類型切換按鈕 */}
              <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg">
                <button onClick={() => setDebtType('pledge')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${debtType === 'pledge' ? 'bg-white shadow text-blue-600 dark:bg-slate-700 dark:text-white' : 'text-gray-500'}`}>股票質押</button>
                <button onClick={() => setDebtType('loan')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${debtType === 'loan' ? 'bg-white shadow text-blue-600 dark:bg-slate-700 dark:text-white' : 'text-gray-500'}`}>信用貸款</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {debtType === 'pledge' && (
                  <>
                    <input type="text" placeholder="質押代碼 (如 2330)" value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})} className="p-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input type="number" placeholder="張數" value={form.shares} onChange={e => setForm({...form, shares: e.target.value})} className="p-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </>
                )}
                <input type="number" placeholder="借貸金額" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="p-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="number" placeholder="年利率 %" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} className="p-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                
                {/* --- 升級版日期輸入框 --- */}
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="借款日 YYYY/MM/DD" 
                        value={form.date} 
                        onChange={handleDateChange} 
                        maxLength={10}
                        className="w-full p-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                    <input 
                        type="date" 
                        ref={datePickerRef}
                        className="absolute opacity-0 bottom-0 right-0 w-8 h-full cursor-pointer z-10"
                        onChange={handleDatePickerChange}
                        tabIndex={-1}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <i className="fas fa-calendar-alt"></i>
                    </div>
                </div>

                <input type="number" placeholder="手續費 (選填)" value={form.fee} onChange={e => setForm({...form, fee: e.target.value})} className="p-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <textarea placeholder="備註說明..." value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full p-2.5 text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none" rows={2} />
              <button onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-sm transition-all shadow-lg active:scale-95">新增債務紀錄</button>
            </div>

            {/* 右側：數據概覽 */}
            <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-6 border border-red-100 dark:border-red-900/30 flex flex-col justify-center">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-6 border-b border-red-200 dark:border-red-800 pb-2">負債概算 (即時計算)</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400">總借款金額</span>
                  <span className="text-xl font-black text-gray-900 dark:text-white">${totalDebt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-gray-500 dark:text-gray-400">累積利息</span>
                     <span className="text-[10px] text-gray-400">依借款日按日計息</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">-${totalAccumulatedInterest.toLocaleString()}</span>
                </div>
                <div className="pt-4 border-t border-red-200 dark:border-red-900/30 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">淨資產調整</span>
                  <span className="text-xs font-black text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">自動從總獲利扣除</span>
                </div>
              </div>
            </div>
          </div>

          {/* 下方：負債清單 */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">負債明細</h4>
            {debts.map(d => {
              const itemInterest = calculateInterest(d.amount, d.rate, d.date || '');
              return (
                <div key={d.id} className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl flex justify-between items-center group border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                    <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${d.type === 'pledge' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        <i className={`fas fa-${d.type === 'pledge' ? 'link' : 'university'}`}></i>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold dark:text-white">{d.type === 'pledge' ? `質押: ${d.symbol}` : '信用貸款'}</p>
                            {d.type === 'pledge' && d.shares && <span className="text-[10px] bg-gray-200 dark:bg-slate-700 px-1.5 rounded text-gray-600 dark:text-gray-300">{d.shares}張</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">${d.amount.toLocaleString()} @ <span className="text-red-500 font-bold">{d.rate}%</span></p>
                    </div>
                    </div>
                    <div className="flex items-center space-x-6">
                    <div className="text-right">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">借款日: {d.date}</p>
                        <p className="text-[10px] text-red-500 font-bold mt-0.5">累積利息: -${itemInterest.toLocaleString()}</p>
                    </div>
                    {/* 👇 新增：還款按鈕 */}
                    <button 
                      onClick={() => openRepayModal(d)}
                      className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors mr-2"
                    >
                      還款
                    </button>
                    <button onClick={() => removeDebt(d.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <i className="fas fa-trash-alt"></i>
                    </button>
                    </div>
                </div>
              );
            })}
            {debts.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl">
                    <p className="text-gray-400 text-xs italic">尚無負債記錄，請新增以追蹤槓桿成本</p>
                </div>
            )}
          </div>
        </div>
      )}
      {/* --- 👇 新增：還款彈跳視窗 (Modal) --- */}
      {isRepayModalOpen && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-slate-800 p-6 animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">辦理還款</h3>
              <button onClick={() => setIsRepayModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. 類型切換 */}
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block">還款類型</label>
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
                  {['total', 'principal', 'interest'].map((t) => (
                    <button 
                      key={t}
                      onClick={() => setRepayForm(prev => ({ ...prev, type: t as any }))}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        repayForm.type === t 
                          ? 'bg-white shadow text-blue-600 dark:bg-slate-700 dark:text-white' 
                          : 'text-gray-500'
                      }`}
                    >
                      {t === 'total' ? '總額' : t === 'principal' ? '本金' : '利息'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 日期 */}
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block">還款日期</label>
                <div className="relative">
                  <input 
                      type="text" 
                      value={repayForm.date} 
                      onChange={handleRepayDateChange} 
                      maxLength={10}
                      className="w-full p-2.5 text-sm rounded-lg border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                  <input 
                      type="date" 
                      ref={repayDatePickerRef}
                      className="absolute opacity-0 bottom-0 right-0 w-8 h-full cursor-pointer"
                      onChange={handleRepayDatePickerChange}
                      tabIndex={-1}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <i className="fas fa-calendar-alt"></i>
                  </div>
                </div>
              </div>

              {/* 3. 金額 */}
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block">還款金額</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="輸入金額" 
                    value={repayForm.amount} 
                    onChange={e => setRepayForm({...repayForm, amount: e.target.value})} 
                    className="flex-1 p-2.5 text-sm rounded-lg border bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button 
                    onClick={() => setRepayForm(prev => ({ ...prev, amount: selectedDebt.amount.toString() }))}
                    className="px-3 bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    全額
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 pl-1">目前欠款: ${selectedDebt.amount.toLocaleString()}</p>
              </div>
            </div>

            {/* 4. 按鈕 */}
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setIsRepayModalOpen(false)}
                className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                取消
              </button>
              <button 
                onClick={executeRepayment}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg active:scale-95 transition-all"
              >
                確認還款
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default DebtSection;
