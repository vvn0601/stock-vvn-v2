export default async function handler(req, res) {
  // ---------------------------------------------------------
  // 1. 強制設定 CORS 表頭 (讓瀏覽器閉嘴)
  // ---------------------------------------------------------
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // ---------------------------------------------------------
  // 2. 攔截預檢請求 (OPTIONS) - 直接回傳 200，不經過 Google
  // ---------------------------------------------------------
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ---------------------------------------------------------
  // 3. 處理輸入資料 (防呆解析)
  // ---------------------------------------------------------
  let body = req.body;
  
  // 如果前端傳來的是字串 (有時候 fetch 沒設好 content-type 會這樣)，手動轉物件
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      // 解析失敗就維持原樣，後面再檢查
    }
  }

  // 取得關鍵參數
  // 支援 GET (從網址列) 或 POST (從 body)
  const scriptUrl = req.query.scriptUrl || body?.scriptUrl;
  const sheetName = req.query.sheetName || body?.sheetName || ''; 
  const record = body?.record || [];

  if (!scriptUrl) {
    return res.status(400).json({ error: 'Missing scriptUrl' });
  }

  try {
    // ---------------------------------------------------------
    // 4. 準備轉發給 Google Apps Script (GAS)
    // ---------------------------------------------------------
    let gasUrl = scriptUrl;
    
    // === GET: 讀取資料 ===
    if (req.method === 'GET') {
      // 把 sheetName 串在網址後面
      gasUrl = `${scriptUrl}?sheetName=${encodeURIComponent(sheetName)}`;
      
      const upstream = await fetch(gasUrl, { method: 'GET' });
      const text = await upstream.text();

      try {
        const parsed = JSON.parse(text);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({ rows: [] }); // 失敗就回傳空陣列，防止前端爆掉
      }
    }

    // === POST: 寫入資料 (使用 text/plain 避開複雜檢查) ===
    if (req.method === 'POST') {
      // 構建我們要傳給 GAS 的大包物件
      const payload = {
        sheetName: sheetName,
        record: record
      };

      // ★ 關鍵修改：這裡使用 text/plain，模仿你舊代碼的行為
      // 告訴 Google 這只是純文字，不要囉唆
      const upstream = await fetch(gasUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8' 
        },
        body: JSON.stringify(payload)
      });

      const text = await upstream.text();

      try {
        const parsed = JSON.parse(text);
        return res.status(200).json(parsed);
      } catch {
        // 如果 Google 回傳的不是 JSON，至少把它的文字傳回來給你看
        return res.status(200).json({ status: 'success', raw: text });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: String(error) });
  }
}