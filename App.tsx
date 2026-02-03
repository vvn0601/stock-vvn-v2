import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MarketType, TransactionType, Transaction, Holding, Debt, KpiData, SipFrequency, SipPlan, Repayment,InterestRecord,RealizedRecord  // 👈 (1) 加入這個
} from './types';
import { STOCK_MAP, Icons } from './constants';
import { fetchStockPrice, fetchExchangeRate } from './services/stockService';
import { formatNumber, formatDate } from './utils/formatters';
import { useNotification } from './context/NotificationContext';

// Component Imports
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InventorySection } from './components/InventorySection';
import { ChartSection } from './components/ChartSection';
import { NewsSection } from './components/NewsSection';
import DebtSection from './components/DebtSection';
import { InterestSection } from './components/InterestSection'; // 👈 (2) 加入這個
import { DatePickerField } from './components/DatePickerField';
import * as XLSX from 'xlsx'; // 確保 XLSX 已引入
import { DebugOverlay } from './components/DebugOverlay';

// --- 設定 ---
const MARKET_THEMES = {
  "AI 與半導體": ["2330.TW", "2454.TW", "NVDA", "AMD", "TSM"],
  "成長型 ETF": ["QQQM", "SOXX", "^IXIC", "0050.TW", "00662.TW"],
  "美股科技七雄": ["AAPL", "MSFT", "GOOG", "AMZN", "META", "TSLA"]
};

const apiUrl = (path: string) => (path.startsWith("/") ? path : `/${path}`);
// 用法
fetch(apiUrl("/api/transactions"))

// LocalStorage Keys
const STORAGE_KEYS = {
  TRANSACTIONS: "finance_app_transactions",
  SIP_PLANS: "finance_app_sip_plans",
  DEBTS: "finance_app_debts",
  STRATEGY: "finance_app_strategy",
  SCRIPT_URL: "finance_app_script_url",  // ✅補這行
  INTERESTS: "finance_app_interests", // 👈 (3) 加入這個
};
// --- ✨ 新增：智慧工具函式區 (請放在 App component 外面) ---

// 1. 產生唯一 ID
const generateUniqueID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

// 2. 智慧日期整形 (修正版：支援 Excel 數字序號轉日期)
const smartParseDate = (inputDate: any) => {
  if (!inputDate) return new Date().toISOString().slice(0, 10).replace(/-/g, '/'); 

  let cleanStr = String(inputDate).trim();
if (cleanStr.includes('T') && cleanStr.includes('Z')) {
    const dateObj = new Date(cleanStr);
    if (!isNaN(dateObj.getTime())) {
       const y = dateObj.getFullYear();
       const m = String(dateObj.getMonth() + 1).padStart(2, '0');
       const d = String(dateObj.getDate()).padStart(2, '0');
       return `${y}/${m}/${d}`; 
    }
  }
  // 🔥 關鍵修正：偵測 Excel 日期序號 (5位數數字，例如 45468)
  if (cleanStr.includes('T') && cleanStr.includes('Z')) {
    const dateObj = new Date(cleanStr);
    if (!isNaN(dateObj.getTime())) {
       const y = dateObj.getFullYear();
       const m = String(dateObj.getMonth() + 1).padStart(2, '0');
       const d = String(dateObj.getDate()).padStart(2, '0');
       return `${y}/${m}/${d}`; 
    }
  }
  // Excel 把日期存成「距離 1900/1/1 的天數」，必須用數學公式轉換
  if (/^\d{5}$/.test(cleanStr)) {
    const serial = parseInt(cleanStr, 10);
    // (序號 - 25569) * 一天的毫秒數 = 正確日期時間
    const dateObj = new Date((serial - 25569) * 86400 * 1000);
    
    // 如果轉換成功，回傳 YYYY/MM/DD
    if (!isNaN(dateObj.getTime())) {
       const y = dateObj.getFullYear();
       const m = String(dateObj.getMonth() + 1).padStart(2, '0');
       const d = String(dateObj.getDate()).padStart(2, '0');
       return `${y}/${m}/${d}`; 
    }
  }

  // 情況 A: 處理純數字 8 碼 (ex: 20250101)
  if (/^\d{8}$/.test(cleanStr)) {
    cleanStr = `${cleanStr.slice(0, 4)}/${cleanStr.slice(4, 6)}/${cleanStr.slice(6, 8)}`;
  }

  // 情況 B: 統一將 - 或 空白 轉為 / 
  const standardFormat = cleanStr.replace(/[-]/g, '/').replace(/\s/g, '/');

  const dateObj = new Date(standardFormat);
  
  // 防呆：如果真的解析失敗，回傳今日
  if (isNaN(dateObj.getTime())) {
    console.warn(`[Import] 無法解析日期: ${inputDate}，使用今日`);
    return new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  }

  // 回傳 YYYY/MM/DD
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
};
// 3. 資料清洗主程式 (修正版：完全不補 0)
const processImportedData = (csvData: any[]) => {
  return csvData.map((row) => {
    const price = parseFloat(row.price || 0);
    const qty = parseInt(row.qty || 0);
    
    // 處理手續費
    const inputCost = parseFloat(row.cost || row['成本'] || 0);
    let fee = 0;
    if (inputCost !== 0) {
      fee = inputCost - (price * qty);
    } else if (row.fee) {
      fee = parseFloat(row.fee);
    }

    // ★ 修正重點：完全不補 0，用戶輸入什麼就轉成字串存什麼
    // 這樣 00662 依然是 00662 (只要 Excel 格式對)，NVDA 依然是 NVDA
    const rawCode = row.code ? String(row.code).toUpperCase().trim() : '';

    return {
      ...row,
      id: row.id ? String(row.id) : generateUniqueID(),
      date: smartParseDate(row.date),
      price: price,
      qty: qty,
      fee: fee,
      
      // 自動判斷市場 (簡單用正則判斷是否為數字代碼)
      market: row.market || (rawCode && /^\d+$/.test(rawCode) ? 'TW' : 'US'),
      type: row.type || 'buy',
      
      // 直接使用原始代碼
      code: rawCode,
      name: row.name || rawCode,
      tax: row.tax ? parseFloat(row.tax) : 0
    };
  });
};
// --- ✨ 結束 ---

// ✅ 終極版 2.0：完美支援 ISO 時間字串與普通日期
function normalizeTxn(raw: any): Transaction | null {
  if (!raw) return null;

  const id = String(raw.id || "").trim();
  if (!id) return null;

  const market =
    raw.market === MarketType.US || raw.market === "US" ? MarketType.US : MarketType.TW;

  const type =
    raw.type === TransactionType.SELL || raw.type === "SELL" || raw.type === "sell"
      ? TransactionType.SELL
      : TransactionType.BUY;

  // 1. 取得原始日期字串
  let rawDate = String(raw.date || "").trim();
  let dateObj: Date;

  // 2. 判斷是否為 ISO 格式 (含有 'T' 和 'Z' 或 ':')
  if (rawDate.includes('T') || rawDate.includes(':')) {
      // 直接用 new Date 解析 ISO 字串 (瀏覽器原生支援度很好)
      dateObj = new Date(rawDate);
  } else {
      // 傳統 YYYY-MM-DD 或 YYYY/MM/DD，手動轉 '/' 比較保險
      const parseableDate = rawDate.replace(/-/g, '/');
      dateObj = new Date(parseableDate);
  }

  let finalDate = "";

  if (isNaN(dateObj.getTime())) {
    // 真的解析失敗才報警
    console.warn(`[Data Error] 無效日期: ${rawDate}, ID: ${id}. 使用今日日期.`);
    finalDate = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  } else {
    // 解析成功 -> 轉成本地 YYYY/MM/DD
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    finalDate = `${y}/${m}/${d}`; 
  }

  return {
    id,
    date: finalDate, 
    market,
    type,
    code: String(raw.code || "").toUpperCase().trim(),
    name: String(raw.name || "").trim() || String(raw.code || "").toUpperCase().trim(),
    price: Number(raw.price || 0),
    qty: Number(raw.qty || 0),
    fee: Number(raw.fee || 0),
    tax: Number(raw.tax || 0),
  } as Transaction;
}


// ✅ 新增：合併去重（以 id 為準）
function mergeById(cloud: Transaction[], local: Transaction[]) {
  const m = new Map<string, Transaction>();
  for (const t of cloud) m.set(t.id, t);
  for (const t of local) if (!m.has(t.id)) m.set(t.id, t);
  return Array.from(m.values()).sort((a, b) => b.date.localeCompare(a.date));
}


const App: React.FC = () => {
  const [debugLines, setDebugLines] = useState<string[]>([]);
const pushDebug = (msg: string) => {
  setDebugLines(prev => [...prev.slice(-50), `${new Date().toISOString()}  ${msg}`]);
};

useEffect(() => {
  const onError = (e: ErrorEvent) => pushDebug(`window.error: ${e.message}`);
  const onRej = (e: PromiseRejectionEvent) => pushDebug(`unhandledrejection: ${String(e.reason)}`);

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRej);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRej);
  };
}, []);

  const { notify } = useNotification();
  const cloudReadyRef = useRef(false);
  const skipCloudSyncRef = useRef(false); // ✅ 新增：避免「剛從雲端 setTransactions」就立刻 POST 回雲端

  // --- States (初始化時從 LocalStorage 讀取) ---
  
  const [strategy, setStrategy] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.STRATEGY) || "穩定持股，專注獲利";
    } catch { return "穩定持股，專注獲利"; }
  });

  // 新增這一段：定義 scriptUrl 狀態與自動存檔邏輯
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SCRIPT_URL) || "";
    } catch { return ""; }
  });

  // ✅ (2) 新增：計算已實現損益的輔助函式
const calculateRealizedProfit = (
  // 這裡我們暫時傳入 "分別算好的 TWD 與 USD 總額"，簡化計算
  twdGain: number,
  usdGain: number,
  currentTab: string, 
  exchangeRate: number
) => {
  // 情況 A: 只看美股 -> 回傳 USD (不換算)
  if (currentTab === 'US') {
    return usdGain;
  }
  
  // 情況 B: 只看台股 -> 回傳 TWD
  if (currentTab === 'TW') {
    return twdGain;
  }

  // 情況 C: 全部 -> TWD + (USD * 匯率)
  return twdGain + Math.floor(usdGain * exchangeRate);
};
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, scriptUrl);
  }, [scriptUrl]);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      const parsed = saved ? JSON.parse(saved) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      return arr.map(normalizeTxn).filter(Boolean) as Transaction[];
    } catch {
      return [];
    }
  });


  const [sipPlans, setSipPlans] = useState<SipPlan[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SIP_PLANS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [debts, setDebts] = useState<Debt[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEBTS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // 👇 (4) 插入利息 State (貼在這裡)
  const [interests, setInterests] = useState<InterestRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.INTERESTS) || "[]"); } 
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INTERESTS, JSON.stringify(interests));
  }, [interests]);

  // 👇 (5) 插入利息同步用的 Ref (貼在這裡)
  const interestCloudReadyRef = useRef(false);
  const skipInterestCloudSyncRef = useRef(false);
  // 👇 新增這兩行：負債同步鎖
  const debtCloudReadyRef = useRef(false);
  const skipDebtCloudSyncRef = useRef(false);

  const [market, setMarket] = useState<MarketType>(MarketType.TW);
  const [txnType, setTxnType] = useState<TransactionType>(TransactionType.BUY);
  const [inputMode, setInputMode] = useState<'single' | 'sip'>('single');
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [exchangeRate, setExchangeRate] = useState<number>(32.5);
  const [kpiView, setKpiView] = useState<'ALL' | 'TW' | 'US'>('ALL');
  
  // 圖表連動相關狀態
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  
  // 日期區間預設邏輯
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10).replace(/-/g, '/'),
    end: new Date().toISOString().slice(0, 10).replace(/-/g, '/')
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  
  // Trending States
  const [activeTheme, setActiveTheme] = useState<keyof typeof MARKET_THEMES>("AI 與半導體");
  const [stockDataCache, setStockDataCache] = useState<Record<string, { price: number; status: string }>>({});
  const [isUpdatingTrending, setIsUpdatingTrending] = useState(false);
  const [trendingError, setTrendingError] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  const [formData, setFormData] = useState({
    id: "",
    date: new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
    code: "",
    name: "", 
    price: "",
    qty: "",
    feeAuto: true,
    feeCustom: "",
    taxAuto: true,
    taxCustom: ""
  });

  const [sipData, setSipData] = useState<SipPlan>({
    id: "",
    startDate: new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
    market: MarketType.TW,
    code: "",
    amount: 0,
    frequency: SipFrequency.MONTHLY,
    details: ["1"]
  });

  // --- 自動存檔與同步邏輯 ---
  
  // 1. Transactions: 存 LocalStorage + 同步 Google Sheet
  // ✅ 新增：開啟時先從 Sheet 拉資料，合併去重後塞回 transactions
useEffect(() => {
  (async () => {
    try {
      if (!scriptUrl) {
        cloudReadyRef.current = true;
        return;
      }

      const url = `${apiUrl("/api/transactions")}?scriptUrl=${encodeURIComponent(scriptUrl)}`;
      pushDebug(`fetching: ${url}`);

      const resp = await fetch(url, { cache: "no-store" });
      const text = await resp.text(); // ✅ 只讀一次

      pushDebug(`status=${resp.status} ct=${resp.headers.get("content-type")}`);
      pushDebug(`body head=${JSON.stringify(text.slice(0, 200))}`);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${text.slice(0, 200)}`);
      }

      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`不是 JSON：${text.slice(0, 200)}`);
      }

      const raw: any[] =
        Array.isArray(json?.data?.rows) ? json.data.rows :
        Array.isArray(json?.rows) ? json.rows :
        [];

      const cleaned = raw.map((r: any) => ({
        ...r,
        date: r.date ?? r[" date"] ?? "",
      }));

      const cloud = cleaned.map(normalizeTxn).filter(Boolean) as Transaction[];

      cloudReadyRef.current = true;
      skipCloudSyncRef.current = true;
      // 修正：只要雲端有資料，就直接「覆蓋」本地，不要合併
      // 這樣你在 Sheet 刪掉資料後，App 才會跟著刪除
      if (cloud.length > 0) {
        setTransactions(cloud);
      }
      notify("success", "雲端資料載入完成");
    } catch (e) {
      cloudReadyRef.current = true;
      console.error("雲端載入失敗:", e);
    }
  })();
}, [scriptUrl]);


useEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.warn("寫入 localStorage 失敗:", e);
  }
}, [transactions]);

useEffect(() => {
  if (!cloudReadyRef.current) return;

  // 跳過「剛從雲端載入塞進 state」觸發的那一次
  if (skipCloudSyncRef.current) {
    skipCloudSyncRef.current = false;
    return;
  }

  const t = window.setTimeout(() => {
    if (!scriptUrl) return; // 沒設定 URL 就不發送

    fetch(apiUrl("/api/transactions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scriptUrl: scriptUrl, // 讓後台知道轉發到哪
        record: transactions  // 配合後台 API 期待的名稱: record
      }),
    }).catch(err => console.error("雲端同步失敗:", err));

  }, 1000); // 稍微增加延遲，確保輸入完成再同步

  return () => window.clearTimeout(t);
}, [transactions]);


  // 👇 (6) 插入：讀取雲端利息
  useEffect(() => {
    (async () => {
      try {
        if (!scriptUrl) { interestCloudReadyRef.current = true; return; }
        const url = `${apiUrl("/api/interests")}?scriptUrl=${encodeURIComponent(scriptUrl)}&sheetName=Interests`;
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) throw new Error(await resp.text());

        const json = await resp.json();
        const rawRows = json.rows || [];
        const cloudInterests: InterestRecord[] = rawRows.map((r: any) => ({
          id: String(r.id),
          distributeDate: smartParseDate(r.date),
          stockSymbol: r.code,
          stockName: r.name,
          cashDividend: Number(r.cash),
          perShareDividend: r.perShare,
          quarter: '' 
        }));

        interestCloudReadyRef.current = true;
        skipInterestCloudSyncRef.current = true;
        if (cloudInterests.length > 0) {
          setInterests(cloudInterests); 
          notify("success", "利息資料已同步");
        }
      } catch (e) {
        interestCloudReadyRef.current = true;
        console.error("利息載入失敗:", e);
      }
    })();
  }, [scriptUrl]);

  // 👇 (7) 插入：寫入雲端利息
  useEffect(() => {
    if (!interestCloudReadyRef.current) return;
    if (skipInterestCloudSyncRef.current) { skipInterestCloudSyncRef.current = false; return; }
    
    const t = window.setTimeout(() => {
      if (!scriptUrl) return;
      fetch(apiUrl("/api/interests"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptUrl: scriptUrl,
          sheetName: "Interests", 
          record: interests 
        }),
      }).catch(err => console.error("利息存檔失敗:", err));
    }, 2000); 
    return () => window.clearTimeout(t);
  }, [interests, scriptUrl]);

  // --- 新增：負債同步邏輯 (讀取) ---
  useEffect(() => {
    (async () => {
      try {
        if (!scriptUrl) { debtCloudReadyRef.current = true; return; }
        
        // 呼叫 debts.js
        const url = `${apiUrl("/api/debts")}?scriptUrl=${encodeURIComponent(scriptUrl)}&sheetName=Debts`;
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) throw new Error(await resp.text());

        const json = await resp.json();
        const rawRows = json.rows || [];
        
        // 轉換格式：特別注意 repayments 要 JSON.parse
        const cloudDebts: Debt[] = rawRows.map((r: any) => {
          let parsedRepayments = [];
          try {
            // Google Sheet 傳回來如果是字串，要轉回陣列
            if (typeof r.repayments === 'string') {
              parsedRepayments = JSON.parse(r.repayments);
            } else {
              parsedRepayments = r.repayments || [];
            }
          } catch (e) { parsedRepayments = []; }

          return {
            id: String(r.id),
            type: r.type,
            symbol: r.symbol,
            shares: Number(r.shares) || undefined,
            amount: Number(r.amount),
            rate: Number(r.rate),
            date: r.date, // YYYY/MM/DD
            fee: Number(r.fee),
            note: r.note,
            repayments: parsedRepayments
          };
        });

        debtCloudReadyRef.current = true;
        skipDebtCloudSyncRef.current = true; // 剛讀取完，不要馬上回存
        
        if (cloudDebts.length > 0) {
          setDebts(cloudDebts);
          notify("success", "負債資料已同步");
        }
      } catch (e) {
        debtCloudReadyRef.current = true;
        console.error("負債載入失敗:", e);
      }
    })();
  }, [scriptUrl]);

  // --- 新增：負債同步邏輯 (寫入) ---
  useEffect(() => {
    if (!debtCloudReadyRef.current) return;
    if (skipDebtCloudSyncRef.current) { skipDebtCloudSyncRef.current = false; return; }
    
    const t = window.setTimeout(() => {
      if (!scriptUrl) return;
      fetch(apiUrl("/api/debts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptUrl: scriptUrl,
          sheetName: "Debts", 
          record: debts 
        }),
      }).catch(err => console.error("負債存檔失敗:", err));
    }, 2000); 
    return () => window.clearTimeout(t);
  }, [debts, scriptUrl]); // 當 debts 變動時觸發
  
  // 2. SipPlans: 只存 LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIP_PLANS, JSON.stringify(sipPlans));
  }, [sipPlans]);

  // 3. Debts: 只存 LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  }, [debts]);

  // 4. Strategy: 只存 LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STRATEGY, strategy);
  }, [strategy]);


  // --- Memos (保持不變) ---
  const recentSymbols = useMemo(() => {
    const allCodes = transactions.map(t => t.code);
    const unique = Array.from(new Set(allCodes)).slice(0, 3);
    return unique.length > 0 ? unique : ['2330', '0050', 'AAPL'];
  }, [transactions]);

   // ✅ (3) 修改：已實現損益計算 (區分 TWD 與 USD)
  const realizedPriceGain = useMemo(() => {
    let gainTWD = 0;
    let gainUSD = 0;
    const costBasisMap: Record<string, { qty: number; totalCost: number }> = {};
    
    // 必須按日期排序確保計算正確
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  
    sorted.forEach(t => {
      const code = t.code;
      if (!costBasisMap[code]) costBasisMap[code] = { qty: 0, totalCost: 0 };
  
      if (t.type === TransactionType.BUY) {
        costBasisMap[code].qty += t.qty;
        costBasisMap[code].totalCost += (t.price * t.qty) + t.fee;
      } else {
        const avgCost = costBasisMap[code].qty > 0 ? costBasisMap[code].totalCost / costBasisMap[code].qty : 0;
        const sellProceeds = (t.price * t.qty) - t.fee - (t.tax || 0);
        const costOfSoldShares = avgCost * t.qty;
        
        // 算出這一筆的獲利
        const profit = sellProceeds - costOfSoldShares;
  
        // 🔥 根據市場分流
        if (t.market === MarketType.US) {
          gainUSD += profit;
        } else {
          gainTWD += profit;
        }
  
        costBasisMap[code].qty -= t.qty;
        costBasisMap[code].totalCost -= costOfSoldShares;
        if (costBasisMap[code].qty < 0.000001) {
          costBasisMap[code].qty = 0;
          costBasisMap[code].totalCost = 0;
        }
      }
    });
    
    return { twd: Math.round(gainTWD), usd: Number(gainUSD.toFixed(2)) };
  }, [transactions]);

  // 修正後的 Holdings 計算 (終極版：支援 ETF 0.1% 稅率 + 扣除賣出手續費)
  const holdings = useMemo(() => {
    const map: Record<string, any> = {};
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    // 1. 累加計算 (這部分保持不變，負責算出總成本與總股數)
    sorted.forEach(t => {
      const code = String(t.code || "").trim();
      if (!code) return;
      if (!map[code]) map[code] = { code: code, name: t.name, market: t.market, qty: 0, totalCost: 0 };
      
      const price = Number(t.price) || 0;
      const qty = Number(t.qty) || 0;
      const fee = Number(t.fee) || 0;

      if (t.type === TransactionType.BUY) {
        map[code].qty += qty;
        map[code].totalCost += (price * qty) + fee;
      } else {
        const avgCost = map[code].qty > 0 ? map[code].totalCost / map[code].qty : 0;
        map[code].totalCost -= avgCost * qty;
        map[code].qty -= qty;
        if (map[code].qty < 0.000001) { map[code].qty = 0; map[code].totalCost = 0; }
      }
    });

    // 2. 列表計算 (這裡包含核心損益邏輯)
    return Object.values(map)
      .filter(h => h.qty > 0)
      .map(h => {
        // A. 取得現價
        const currPrice = currentPrices[h.code] || (h.qty > 0 ? h.totalCost / h.qty : 0);
        
        // B. 計算市值
        const marketValue = h.qty * currPrice;

        // C. 智慧稅率判斷 (關鍵！)
        // 台股代碼若以 "00" 開頭 (如 00919, 0050) 視為 ETF (稅 0.1%)
        // 否則視為普通個股 (稅 0.3%)
        const isETF = h.market === MarketType.TW && h.code.startsWith('00');
        const taxRate = isETF ? 0.001 : 0.003;

        // D. 預估賣出費用 (稅 + 手續費) -> 這樣算出來最準
        const estimatedTax = h.market === MarketType.TW ? Math.round(marketValue * taxRate) : 0;
        const estimatedFee = h.market === MarketType.TW ? Math.round(marketValue * 0.001425) : 0;
        
        // E. 損益公式：市值 - 總成本 - 賣出稅 - 賣出費
        const unrealizedPL = marketValue - h.totalCost - estimatedTax - estimatedFee;
        
        // F. 報酬率
        const profitRate = h.totalCost > 0 ? (unrealizedPL / h.totalCost) * 100 : 0;

        return {
          ...h,
          avgCost: h.qty > 0 ? h.totalCost / h.qty : 0,
          marketValue,
          currPrice,
          unrealizedPL,
          profitRate,
          dividend: h.totalCost * 0.045
        } as Holding;
      });
  }, [transactions, currentPrices]);

  const debtStats = useMemo(() => {
    const totalDebt = debts.reduce((acc, d) => acc + d.amount, 0);
    const totalInterest = debts.reduce((acc, d) => {
      if (!d.amount || !d.rate || !d.date) return acc;
      const start = new Date(d.date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      const dailyRate = (d.rate / 100) / 365;
      return acc + Math.floor(d.amount * dailyRate * diffDays);
    }, 0);
    return { totalDebt, totalInterest };
  }, [debts]);

  const kpiData: KpiData = useMemo(() => {
    const filtered = holdings.filter(h => kpiView === 'ALL' || h.market === kpiView);
    const totalVal = filtered.reduce((acc, h) => {
      let val = h.marketValue;
      if (kpiView === 'ALL' && h.market === MarketType.US) val *= exchangeRate;
      return acc + val;
    }, 0);
    const totalCost = filtered.reduce((acc, h) => {
      let val = h.totalCost;
      if (kpiView === 'ALL' && h.market === MarketType.US) val *= exchangeRate;
      return acc + val;
    }, 0);
    const totalDiv = filtered.reduce((acc, h) => {
      let val = h.dividend;
      if (kpiView === 'ALL' && h.market === MarketType.US) val *= exchangeRate;
      return acc + val;
    }, 0);
      // ✅ 關鍵修正：直接加總每一檔持倉的 unrealizedPL
    const pl = filtered.reduce((acc, h) => {
      let val = h.unrealizedPL;
      if (kpiView === 'ALL' && h.market === MarketType.US) val *= exchangeRate;
      return acc + val;
    }, 0);
    const plRate = totalCost > 0 ? (pl / totalCost) * 100 : 0;
    const netProfit = pl - debtStats.totalInterest;
    return { totalVal, totalCost, pl, plRate, totalDiv, netProfit };
  }, [holdings, kpiView, exchangeRate, debtStats]);

  const calculatedFee = useMemo(() => {
    if (formData.feeAuto) {
      const p = parseFloat(formData.price || "0");
      const q = parseInt(formData.qty || "0");
      return Math.round(p * q * 0.001425);
    }
    return parseFloat(formData.feeCustom || "0");
  }, [formData.price, formData.qty, formData.feeAuto, formData.feeCustom]);

  const calculatedTax = useMemo(() => {
    if (txnType === TransactionType.SELL && formData.taxAuto) {
      const p = parseFloat(formData.price || "0");
      const q = parseInt(formData.qty || "0");
      return Math.round(p * q * 0.003);
    }
    return parseFloat(formData.taxCustom || "0");
  }, [formData.price, formData.qty, txnType, formData.taxAuto, formData.taxCustom]);

  const grandTotalPreview = useMemo(() => {
    const p = parseFloat(formData.price || "0");
    const q = parseInt(formData.qty || "0");
    if (!p || !q) return 0;
    const principal = p * q;
    const fee = calculatedFee;
    const tax = txnType === TransactionType.SELL ? calculatedTax : 0;
    if (txnType === TransactionType.BUY) return principal + fee;
    return principal - fee - tax;
  }, [formData.price, formData.qty, txnType, calculatedFee, calculatedTax]);

  // 👇 (8) 插入：計算實際總利息 (傳給 Dashboard 用)
  const totalActualInterest = useMemo(() => {
    return interests.reduce((sum, item) => sum + Number(item.cashDividend || 0), 0);
  }, [interests]);

  // 👇 (9) 插入：操作函式
  const handleAddInterest = (record: InterestRecord) => {
    setInterests(prev => [record, ...prev]);
    notify('success', '利息已新增');
  };
  const handleEditInterest = (updatedRecord: InterestRecord) => {
    setInterests(prev => prev.map(i => i.id === updatedRecord.id ? updatedRecord : i));
    notify('success', '利息已更新');
  };
  const handleRemoveInterest = (id: string) => {
    setInterests(prev => prev.filter(i => i.id !== id));
    notify('success', '利息已刪除');
  };

  // --- Effects ---
  useEffect(() => {
    const initData = async () => {
      try {
        const rate = await fetchExchangeRate();
        setExchangeRate(rate);
      } catch (e) {
        notify('error', '匯率更新失敗，請稍後再試');
      }
      loadActiveThemeStocks();
    };
    initData();
  }, []);

  // ✅ 請貼上這段新的 (包含定義 + 正確的觸發順序)

    const loadActiveThemeStocks = async (force: boolean = false) => {
    const symbols = MARKET_THEMES[activeTheme as keyof typeof MARKET_THEMES];
    const symbolsToFetch = force ? symbols : symbols.filter(sym => !stockDataCache[sym]);

    if (symbolsToFetch.length === 0) return;

    setIsUpdatingTrending(true);
    setTrendingError(false);
    try {
      const results = await Promise.all(
        symbolsToFetch.map(async (sym) => {
          try {
            const res = await fetchStockPrice(sym);
            const price = res?.price || res?.previousClose || 0;
            return { symbol: sym, data: { ...res, price, status: res?.status || 'success' } };
          } catch { 
            return { symbol: sym, data: { price: 0, status: 'error' } }; 
          }
        })
      );
      
      const newData = results.reduce((acc, curr) => ({ ...acc, [curr.symbol]: curr.data }), {});
      setStockDataCache(prev => ({ ...prev, ...newData }));
      
    } catch (e) { 
      setTrendingError(true); 
    } finally { 
      setIsUpdatingTrending(false); 
    }
  };

  // 2. 觸發 (這行一定要放在函式定義的「下面」！)
  useEffect(() => {
    loadActiveThemeStocks();
  }, [activeTheme]);

  useEffect(() => {
    if (transactions.length > 0) {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
          // ✅ 局部邏輯：判斷要根據「全部」還是「單一股票」來過濾日期
      const targetTxns = selectedSymbol 
        ? transactions.filter(t => t.code === selectedSymbol)
        : transactions;

      if (targetTxns.length > 0) {
        const dates = targetTxns.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0].replace(/-/g, '/');
        setDateRange({ start: minDate, end: today });
      }
    }
  }, [transactions, selectedSymbol]); // ✅ 記得加入 selectedSymbol 監聽

    // ✅ 補回被誤刪的匯率更新函式
  const handleUpdateRate = async () => {
    setIsUpdatingRate(true);
    try {
      const rate = await fetchExchangeRate();
      setExchangeRate(rate);
      notify('success', '匯率已更新');
    } catch (e) {
      notify('error', '匯率更新失敗，請稍後再試');
    }
    setIsUpdatingRate(false);
  };
  
  // --- 👇 新增：處理還款邏輯 (貼在這裡) ---
  const handleRepayDebt = (debtId: string, repayAmount: number, repayDate: string, repayType: 'total' | 'principal' | 'interest') => {
    setDebts(prev => prev.map(d => {
      if (d.id === debtId) {
        // 簡單邏輯：直接扣除本金 (amount)
        const newAmount = d.amount - repayAmount;
        
        // 建立還款紀錄物件
        const newRepayment = {
          id: Date.now().toString(),
          date: repayDate,
          amount: repayAmount,
          type: repayType
        };

        return {
          ...d,
          amount: newAmount > 0 ? newAmount : 0, // 防止變負數
          repayments: [...(d.repayments || []), newRepayment]
        };
      }
      return d;
    }));
    notify('success', `已成功還款 $${repayAmount.toLocaleString()}`);
  };
// ✅ 新增：結算獲利並上傳到雲端 (不影響主程式運作)
    // ✅ (4) 修改：結算獲利並上傳 (支援 TWD/USD 分流)
  const handleRecordRealizedGain = async (sellTxn: Transaction, buyCost: number) => {
    if (!scriptUrl) return; 

    // 原始淨利數字
    const rawProfit = (sellTxn.price * sellTxn.qty) - sellTxn.fee - (sellTxn.tax || 0) - buyCost;
    const isUS = sellTxn.market === MarketType.US;

    const realizedRecord: RealizedRecord = { // 指定型別確保安全
      id: Date.now().toString(),
      date: sellTxn.date,
      market: sellTxn.market, // 必填
      code: sellTxn.code,
      name: sellTxn.name,
      qty: sellTxn.qty,
      sellPrice: sellTxn.price,
      totalCost: Number(buyCost.toFixed(2)), 
      
      // 🔥 核心修改：分流寫入
      // 美股：TWD=0, USD=保留小數
      // 台股：TWD=四捨五入, USD=0
      netProfitTWD: isUS ? 0 : Math.round(rawProfit),
      netProfitUSD: isUS ? Number(rawProfit.toFixed(2)) : 0,
      
      note: "App 自動結算"
    };

    try {
      await fetch(apiUrl("/api/realized"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptUrl: scriptUrl,
          sheetName: "Realized", // 確保指名寫入 Realized 分頁
          record: realizedRecord
        })
      });
      
      // 顯示通知時，也可以聰明一點
      const displayProfit = isUS ? `$${realizedRecord.netProfitUSD}` : `NT$${realizedRecord.netProfitTWD}`;
      notify('success', `已記錄獲利：${displayProfit}`);
      
    } catch (e) {
      console.error(e);
      notify('error', '上傳獲利紀錄失敗');
    }
  };
  
  const handleAddTransaction = async () => {
    if (!formData.code || !formData.price || !formData.qty) return alert("請填寫完整交易資料");
    const code = formData.code.toUpperCase().trim();
    const priceNum = parseFloat(formData.price);
    const qtyNum = parseInt(formData.qty);
    const newTxn: Transaction = {
      id: formData.id || Date.now().toString(),
      date: formData.date,
      market: market,
      type: txnType,
      code: code,
      name: formData.name || code,
      price: priceNum,
      qty: qtyNum,
      fee: calculatedFee,
      tax: txnType === TransactionType.SELL ? calculatedTax : 0
    };
    // ★ 新增：獲利結算觸發點
    if (txnType === TransactionType.SELL && !formData.id) {
       // 1. 從目前的持股清單 (holdings) 抓出這檔股票的「平均成本」
       const targetStock = holdings.filter(h => h.code === code)[0]; // 確保只抓第一筆
       const currentAvgCost = targetStock ? targetStock.avgCost : 0;

       // 2. 算出這次賣出的股份，當初是用多少錢買的
       const costOfSoldShares = currentAvgCost * qtyNum;

       // 3. 呼叫剛剛寫好的工具傳送給 Google Sheet (背景執行)
       handleRecordRealizedGain(newTxn, costOfSoldShares);
    }
    if (formData.id) setTransactions(prev => prev.map(t => t.id === formData.id ? newTxn : t));
    else setTransactions(prev => [newTxn, ...prev]);
    setFormData({ id: "", date: new Date().toISOString().slice(0, 10).replace(/-/g, '/'), code: "", name: "", price: "", qty: "", feeAuto: true, feeCustom: "", taxAuto: true, taxCustom: "" });
    if (!currentPrices[code]) {
      const res = await fetchStockPrice(code);
      if (res && (res.price || res.previousClose)) setCurrentPrices(prev => ({ ...prev, [code]: res.price || res.previousClose }));
    }
    notify('success', '交易紀錄已儲存');
  };

  const handleAddSipPlan = () => {
    if (!sipData.code || !sipData.amount) return alert("請填寫完整代碼與金額");
    const newPlan: SipPlan = {
      ...sipData,
      id: sipData.id || Date.now().toString(),
      code: sipData.code.toUpperCase().trim(),
      market: market
    };
    if (sipData.id) setSipPlans(prev => prev.map(p => p.id === sipData.id ? newPlan : p));
    else setSipPlans(prev => [newPlan, ...prev]);
    setSipData({ id: "", startDate: new Date().toISOString().slice(0, 10).replace(/-/g, '/'), market: MarketType.TW, code: "", amount: 0, frequency: SipFrequency.MONTHLY, details: ["1"] });
    notify('success', '定期計畫已儲存');
  };

  const handleUpdatePrices = async () => {
    setIsUpdating(true);
    let successCount = 0;
    const newPrices = { ...currentPrices };
    const uniqueCodes = [...new Set(holdings.map(h => h.code))];
    for (const code of uniqueCodes as string[]) {
      try {
        const res = await fetchStockPrice(code);
        if (res && (res.price || res.previousClose)) {
          newPrices[code] = res.price || res.previousClose;
          successCount++;
        }
      } catch (e) {}
    }
    if (successCount < uniqueCodes.length && uniqueCodes.length > 0) {
      notify('error', '即時價格刷新失敗，請稍後再試');
    } else if (uniqueCodes.length > 0) {
      notify('success', '價格已更新');
    }
    setCurrentPrices(newPrices);
    setIsUpdating(false);
  };
 

  const downloadFormat = () => {
    // --- 分頁 1: 資料範例 (保持乾淨，讓程式好讀取) ---
    const data = [
      ['date', 'market', 'type', 'code', 'name', 'price', 'qty', 'cost', 'fee', 'tax'],
      ['2025/01/01', 'TW', 'buy', '2330', '台積電', 600, 1000, 600142, 0, 0]
    ];

    // --- 分頁 2: 填寫說明 (這裡放入你想給用戶看的提示) ---
    const instructions = [
      ['Excel 匯入格式填寫說明'], // A1 標題
      [''],
      ['1. 成本與手續費 (智慧換算)'],
      ['   - 您只需填寫「cost (總成本)」或「fee (手續費)」其中一個即可。'],
      ['   - 若填寫 cost，系統會自動反推：手續費 = cost - (price * qty)。'],
      ['   - 若只填 fee，則直接採用該數值。'],
      [''],
      ['2. 日期格式'],
      ['   - 支援多種格式 (如 20250101、2025/01/01)，系統將自動轉正。'],
      [''],
      ['3. 其他欄位'],
      ['   - id 欄位：可留空，匯入時系統會自動產生唯一碼。'],
      ['   - market 欄位：可留空，系統會依代碼格式 (如 2330 或 AAPL) 自動判斷。']
    ];
    
    const wb = XLSX.utils.book_new();

    // 步驟 A: 加入資料頁 (務必放在第一個，因為匯入程式預設讀取第一頁)
    const wsData = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, wsData, "匯入資料");

    // 步驟 B: 加入說明頁
    const wsInst = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, wsInst, "使用說明");

    // 下載檔案
    XLSX.writeFile(wb, "portfolio_template.xlsx");
  };

  const importExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (evt: any) => {
      try {
        const result = evt.target?.result;
        if (typeof result !== 'string') return;
        
        // 1. 讀取 Excel
        const wb: any = XLSX.read(result, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const rawData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        
        // 2. 呼叫剛剛寫好的清洗函式 (處理 ID, 日期, 成本反推手續費)
        const cleanData = processImportedData(rawData as any[]);

        // 3. 存入 State (使用 Append 模式：保留舊資料，新增匯入資料)
        setTransactions(prev => [...prev, ...cleanData]); 
        
        notify('success', `成功匯入 ${cleanData.length} 筆資料`);
      } catch (e) {
        console.error(e);
        notify('error', '匯入失敗，請檢查檔案格式');
      }
    };
    
    // 清空 input，確保下次選同一個檔案也能觸發
    e.target.value = ''; 
    reader.readAsBinaryString(file);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(holdings);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portfolio");
    XLSX.writeFile(wb, "退休基金.xlsx");
    notify('success', '檔案匯出成功');
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar 
        scriptUrl={scriptUrl}
        setScriptUrl={setScriptUrl}
        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
        strategy={strategy} setStrategy={setStrategy}
        market={market} setMarket={setMarket}
        inputMode={inputMode} setInputMode={setInputMode}
        txnType={txnType} setTxnType={setTxnType}
        transactions={transactions} sipPlans={sipPlans}
        handleEditTransaction={(t) => {
          setFormData({ id: t.id, date: formatDate(t.date), code: t.code, name: t.name, price: t.price.toString(), qty: t.qty.toString(), feeAuto: false, feeCustom: t.fee.toString(), taxAuto: false, taxCustom: (t.tax || 0).toString() });
          setMarket(t.market); setTxnType(t.type);
        }}
        handleDeleteTransaction={(id) => {
          setTransactions(prev => prev.filter(t => t.id !== id));
          notify('success', '紀錄已刪除');
        }}
        importExcel={importExcel} exportExcel={exportExcel} downloadFormat={downloadFormat}
        formData={formData} setFormData={setFormData}
        sipData={sipData} setSipData={setSipData}
        recentSymbols={recentSymbols}
        isFetchingPrice={isFetchingPrice} handleFetchCurrentPrice={async () => {
          if (!formData.code) return;
          setIsFetchingPrice(true);
          try {
            const res = await fetchStockPrice(formData.code);
            if (res && (res.price || res.previousClose)) {
              setFormData(prev => ({ ...prev, price: (res.price || res.previousClose).toString() }));
            } else {
              notify('error', '無法取得現價，請稍後再試');
            }
          } catch (e) {
            notify('error', '無法取得現價，請稍後再試');
          }
          setIsFetchingPrice(false);
        }}
        calculatedFee={calculatedFee} calculatedTax={calculatedTax} grandTotalPreview={grandTotalPreview}
        handleAddTransaction={handleAddTransaction} handleAddSipPlan={handleAddSipPlan}
        toggleSipDay={(day) => setSipData(prev => ({ ...prev, details: prev.details.includes(day) ? prev.details.filter(d => d !== day) : [...prev.details, day] }))}
      />

      <main className="flex-1 p-6 md:p-10 overflow-y-auto min-h-screen transition-all duration-300 md:ml-[350px]">
        <Dashboard 
          kpiView={kpiView} setKpiView={setKpiView}
          isUpdatingRate={isUpdatingRate} handleUpdateRate={handleUpdateRate}
          kpiData={kpiData} liabilityStats={{ totalDebt: debtStats.totalDebt, totalInterest: debtStats.totalInterest }}
          isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
          scriptUrl={scriptUrl}
          setScriptUrl={setScriptUrl}
          notify={notify}
          totalInterest={totalActualInterest}
          // ✅ (5) 修改這裡：呼叫 helper 算出當下要顯示的數字
          realizedGain={calculateRealizedProfit(
            realizedPriceGain.twd, 
            realizedPriceGain.usd, 
            kpiView, 
            exchangeRate
          )} 
        />

        <InventorySection 
          stocks={holdings}
          onRefresh={handleUpdatePrices}
          onSelectStock={setSelectedSymbol}
          selectedSymbol={selectedSymbol}
        />

        <ChartSection 
          transactions={transactions}
          stocks={holdings}
          startDate={dateRange.start}
          endDate={dateRange.end}
          onDateChange={(start, end) => setDateRange({ start, end })}
          selectedSymbol={selectedSymbol}
          onClearSelection={() => setSelectedSymbol(null)}
        />

        <NewsSection 
          strategy={strategy} holdings={holdings} kpiData={kpiData}
          activeTheme={activeTheme} setActiveTheme={setActiveTheme}
          marketThemes={MARKET_THEMES} stockDataCache={stockDataCache}
          isUpdatingTrending={isUpdatingTrending} trendingError={trendingError}
          handleRefreshTrending={() => loadActiveThemeStocks(true)}
          stockMap={STOCK_MAP}
        />

        <DebtSection 
          debts={debts} 
          setDebts={setDebts} 
          transactions={transactions} 
          onRepay={handleRepayDebt}  // 👈 加入這一行！
        />
        <InterestSection 
          records={interests}
          onAdd={handleAddInterest}
          onEdit={handleEditInterest}
          onRemove={handleRemoveInterest}
        />
      </main>
      {/* ✅ 貼在這裡：跟 Sidebar、main 同一層 */}
      {/* <DebugOverlay lines={debugLines} /> */}
    </div>
  );
};

export default App;
