import { getMaangBacktest } from '../lib/marketService.js';

export default async function handler(req, res) {
  try {
    const symbol = req.query?.symbol || 'AAPL';
    const strategy = req.query?.strategy || 'sma_crossover';
    const data = await getMaangBacktest(symbol, strategy);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
}
