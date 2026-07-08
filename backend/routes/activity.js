import express from 'express';
import { getRecentActivity } from '../activity.js';

const router = express.Router();

// GET /api/activity?limit=N — שינויים אחרונים (audit log)
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 200);
  res.json(getRecentActivity(limit));
});

export default router;
