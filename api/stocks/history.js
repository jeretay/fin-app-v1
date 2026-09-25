import { getStockHistory } from '../../lib/marketService.js';

export default async function handler(req, res) {
  try {
    const symbol = req.query?.symbol || 'AAPL';
    const timeframe = req.query?.timeframe || '1M';
    const data = await getStockHistory(symbol, timeframe);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
}
