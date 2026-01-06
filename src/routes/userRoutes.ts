import { Router } from 'express';
import { getMyCardInfo, getMyCardHistory } from '../controllers/userCardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Các route này dành cho USER thường, không cần quyền admin
// Backend tự biết user là ai nhờ token
router.get('/my-card', authenticateToken, getMyCardInfo);
router.get('/my-history', authenticateToken, getMyCardHistory);

export default router;