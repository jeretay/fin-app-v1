import { getCompanyProfile } from '../../lib/marketService.js';

export default async function handler(req, res) {
  try {
    const symbol = req.query?.symbol || 'AAPL';
    const data = await getCompanyProfile(symbol);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
}
