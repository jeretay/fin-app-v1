import { getPortfolioAllocation } from '../lib/marketService.js';

export default async function handler(req, res) {
  try {
    const symbol1 = req.query?.symbol1 || req.body?.symbol1;
    const symbol2 = req.query?.symbol2 || req.body?.symbol2;
    const symbol3 = req.query?.symbol3 || req.body?.symbol3;
    const symbol4 = req.query?.symbol4 || req.body?.symbol4;
    const symbol5 = req.query?.symbol5 || req.body?.symbol5;

    const data = await getPortfolioAllocation({ symbol1, symbol2, symbol3, symbol4, symbol5 });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
}
