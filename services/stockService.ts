export const fetchStockPrice = async (code: string) => {
  if (!code) return null;
  const symbol = code.toUpperCase().trim();
  
  const isTW = /^\d+$/.test(symbol); 
  const querySymbol = isTW ? `${symbol}.TW` : symbol;

  try {
    const response = await fetch(`https://stock-api-vvn.vercel.app/api/price/${querySymbol}`);
    if (!response.ok) throw new Error("API Network Error");
    const data = await response.json();
    
    if (data) {
      // 支援 fallback 邏輯所需欄位
      return { 
        status: "success", 
        price: data.price,
        previousClose: data.regularMarketPreviousClose,
        name: data.longName || data.shortName || symbol
      };
    } else {
      return { status: "not_found", price: null };
    }
  } catch (error) {
    console.error("Stock API Fetch Error:", error);
    return { status: "error", price: null };
  }
};

export const fetchExchangeRate = async () => {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!response.ok) throw new Error("Exchange rate API error");
    const data = await response.json();
    if (data && data.rates && data.rates.TWD) {
      return data.rates.TWD;
    }
    throw new Error("Invalid exchange rate data");
  } catch (error) {
    console.error("Exchange Rate Fetch Error:", error);
    throw error;
  }
};

export const fetchStockHistory = async (code: string, start: string, end: string) => {
  if (!code) return [];

  // 1. 整理代碼
  let symbol = code.toUpperCase().trim();
  if (/^\d+$/.test(symbol)) {
    symbol += '.TW';
  }

  const HISTORY_API_BASE = "https://stock-api-xbfl.vercel.app";

  try {
    const url = `${HISTORY_API_BASE}/api/history?symbol=${symbol}&start=${start}&end=${end}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      const result = [];
      let lastValidPrice: number | null = null;

      // --- 關鍵修正邏輯開始 ---
      for (const item of data) {
        // 優先讀取 close，如果沒有則嘗試 adjClose
        let price = item.close || item.adjClose;

        // 檢查價格是否有效 (必須是數字 且 不等於0)
        const isValidPrice = typeof price === 'number' && price > 0;

        if (isValidPrice) {
          // 如果今天是有效價格，記錄下來，並放入結果
          lastValidPrice = price;
          result.push({ date: item.date, price: price });
        } else if (lastValidPrice !== null) {
          // 【這就是你要的】：如果今天沒有價格 (Null/0)，但「前一次」有價格
          // 就拿前一次的價格來填補今天 (沿用前一個交易日收盤價)
          result.push({ date: item.date, price: lastValidPrice });
        } 
        // 如果今天沒價格，且前面也都沒價格 (例如第一筆資料就壞掉)，則直接跳過 (Drop)，絕對不補 0
      }
      // --- 關鍵修正邏輯結束 ---

      return result;
    }
    return [];

  } catch (error) {
    console.error("Stock History API Fetch Error:", error);
    return [];
  }
};

export const fetchQuotes = async (symbols: string[]) => {
  console.warn("Direct Yahoo Quote API is disabled.");
  return [];
};