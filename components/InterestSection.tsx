import React, { useState, useMemo } from 'react';
import { InterestRecord } from '../../types';
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2, Save, X } from 'lucide-react'; // 確保有安裝 lucide-react

interface InterestSectionProps {
  records: InterestRecord[];
  onAdd: (record: InterestRecord) => void;
  onEdit: (record: InterestRecord) => void;
  onRemove: (id: string) => void;
}

export const InterestSection: React.FC<InterestSectionProps> = ({ 
  records, 
  onAdd, 
  onEdit, 
  onRemove 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);

  // 表單狀態
  const [formData, setFormData] = useState<Partial<InterestRecord>>({
    stockSymbol: '',
    stockName: '',
    distributeDate: new Date().toISOString().split('T')[0],
    perShareDividend: '',
    cashDividend: 0,
  });

  // 計算本季累積利息 (Q1:1-3, Q2:4-6, Q3:7-9, Q4:10-12)
  const currentQuarterStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentQ = Math.ceil(currentMonth / 3);

    const quarterRecords = records.filter(r => {
      const d = new Date(r.distributeDate);
      const q = Math.ceil((d.getMonth() + 1) / 3);
      return d.getFullYear() === currentYear && q === currentQ;
    });

    const sum = quarterRecords.reduce((acc, r) => acc + Number(r.cashDividend), 0);
    return { q: currentQ, sum };
  }, [records]);

  // 只顯示最近 5 筆 (根據日期排序)
  const recentRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(b.distributeDate).getTime() - new Date(a.distributeDate).getTime())
      .slice(0, 5);
  }, [records]);

  const handleSubmit = () => {
    if (!formData.stockName || !formData.cashDividend) {
      alert('請輸入股票名稱與現金股利金額');
      return;
    }

    const record: InterestRecord = {
      id: isEditingId || crypto.randomUUID(),
      stockSymbol: formData.stockSymbol || '',
      stockName: formData.stockName || '',
      distributeDate: formData.distributeDate || new Date().toISOString().split('T')[0],
      perShareDividend: formData.perShareDividend,
      cashDividend: Number(formData.cashDividend),
      quarter: '', // 這裡可以留空，顯示時即時計算即可
    };

    if (isEditingId) {
      onEdit(record);
      setIsEditingId(null);
    } else {
      onAdd(record);
    }

    // 重置表單
    setFormData({
      stockSymbol: '',
      stockName: '',
      distributeDate: new Date().toISOString().split('T')[0],
      perShareDividend: '',
      cashDividend: 0,
    });
  };

  const handleEditClick = (record: InterestRecord) => {
    setFormData(record);
    setIsEditingId(record.id);
    setIsOpen(true); // 編輯時自動展開
    // 捲動到表單處 (非必要，但體驗較好)
    const formElement = document.getElementById('interest-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditingId(null);
    setFormData({
      stockSymbol: '',
      stockName: '',
      distributeDate: new Date().toISOString().split('T')[0],
      perShareDividend: '',
      cashDividend: 0,
    });
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-4 mt-6 border border-slate-800 backdrop-blur-sm">
      {/* 1. 標題與手風琴開關 */}
      <div 
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            💰 利息管理
          </h2>
          {/* 收合時顯示的小摘要 */}
          {!isOpen && (
            <span className="text-sm text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
              Q{currentQuarterStats.q} 累積: NT$ {currentQuarterStats.sum.toLocaleString()}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
      </div>

      {/* 2. 展開區域 */}
      {isOpen && (
        <div className="mt-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
          
          {/* 輸入表單區 */}
          <div id="interest-form" className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <input 
                type="text" 
                placeholder="股票名稱/代碼" 
                className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                value={formData.stockName}
                onChange={e => setFormData({...formData, stockName: e.target.value})}
              />
              <input 
                type="date"
                className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                value={formData.distributeDate}
                onChange={e => setFormData({...formData, distributeDate: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="單股股利 (選填)" 
                className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                value={formData.perShareDividend || ''}
                onChange={e => setFormData({...formData, perShareDividend: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="現金股利總額 (必填)" 
                className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                value={formData.cashDividend || ''}
                onChange={e => setFormData({...formData, cashDividend: Number(e.target.value)})}
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              {isEditingId && (
                <button 
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  <X size={16} /> 取消
                </button>
              )}
              <button 
                onClick={handleSubmit}
                className={`flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  isEditingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isEditingId ? <Save size={16} /> : <Plus size={16} />} 
                {isEditingId ? '儲存修改' : '新增紀錄'}
              </button>
            </div>
          </div>

          {/* 列表顯示區 (最近5筆) */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 mb-2 px-1">近期新增記錄 (Top 5)</h3>
            <div className="space-y-2">
              {recentRecords.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm">尚無利息紀錄</div>
              ) : (
                recentRecords.map(record => (
                  <div key={record.id} className="flex justify-between items-center bg-slate-800/30 p-3 rounded-lg border border-slate-700/30 hover:border-slate-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-bold text-slate-200">{record.stockName}</div>
                        <div className="text-xs text-slate-500">{record.distributeDate}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-emerald-400 font-mono font-medium">
                          + NT$ {record.cashDividend.toLocaleString()}
                        </div>
                        {record.perShareDividend && (
                          <div className="text-xs text-slate-500">@{record.perShareDividend}/股</div>
                        )}
                      </div>
                      
                      <div className="flex gap-1 pl-2 border-l border-slate-700">
                        <button 
                          onClick={() => handleEditClick(record)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                          title="編輯"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => onRemove(record.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                          title="刪除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};