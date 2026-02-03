
export enum MarketType {
  TW = 'TW',
  US = 'US'
}

export enum TransactionType {
  BUY = 'buy',
  SELL = 'sell'
}

export enum SipFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

// 利息區域

export interface InterestRecord {
  id: string;
  stockSymbol: string;       // 股票代碼
  stockName: string;         // 股票名稱
  distributeDate: string;    // 發放日期 (格式 YYYY-MM-DD)
  perShareDividend?: number; // 單股股利 (選填，僅供記錄參考)
  cashDividend: number;      // 現金股利 (實際入帳金額，這是計算重點)
}
// 對應新的 GAS Realized 分頁格式
export interface RealizedRecord {
  id: string;
  date: string;
  market: MarketType; // 必填，用來區分 TW/US
  code: string;
  name: string;
  qty: number;
  sellPrice: number;
  totalCost: number;
  
  // 🔥 新增這兩個關鍵欄位
  netProfitTWD: number; 
  netProfitUSD: number; 
  
  note?: string;
}

export interface Transaction {
  id: string;
  date: string;
  market: MarketType;
  type: TransactionType;
  code: string;
  name: string;
  price: number;
  qty: number;
  fee: number;
  tax?: number;
}

export interface SipPlan {
  id: string;
  startDate: string;
  market: MarketType;
  code: string;
  amount: number;
  frequency: SipFrequency;
  details: string[]; // ['Mon', 'Wed'] or ['1', '15']
}

export interface Holding {
  code: string;
  name: string;
  market: MarketType;
  qty: number;
  totalCost: number;
  marketValue: number;
  avgCost: number;
  currPrice: number;
  unrealizedPL: number;
  profitRate: number;
  dividend: number;
}

export interface Repayment {
  id: string;
  date: string;
  amount: number;
  type: 'total' | 'principal' | 'interest';
}

export interface Debt {
  id: string;
  type: 'pledge' | 'loan';
  symbol?: string;
  shares?: number;
  amount: number;
  rate: number;
  date: string;
  dueDate: string;
  fee: number;
  note: string;
  repayments?: Repayment[];
}

export interface Liability {
  id: string;
  type: 'pledge' | 'loan';
  date: string;
  amount: number;
  balance: number; 
  rate: number;
  // Pledge specific
  stockCode?: string;
  stockQty?: number; // In "張" (lots) or units
  // Loan specific
  bank?: string;
  repayments: Repayment[];
}

export interface KpiData {
  totalVal: number;
  totalCost: number;
  pl: number;
  plRate: number;
  totalDiv: number;
  netProfit: number;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  type: string;
}
