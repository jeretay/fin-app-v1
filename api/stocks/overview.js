import { getMaangOverview } from '../../lib/marketService.js';

export default async function handler(req, res) {
  try {
    const data = await getMaangOverview();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
}
