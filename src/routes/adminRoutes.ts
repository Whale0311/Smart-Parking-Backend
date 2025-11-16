import { Router } from 'express';
import {
  createUser, // Import hàm mới
  registerCard,
  deleteCard,
  adminRechargeCard,
  recordParkingTransaction,
  getCardHistoryForAdmin,
  getCardDetails
} from '../controllers/adminController';

const router = Router();

// User management
router.post('/create_user', createUser);

// Card management
router.get('/cards/:card_id', getCardDetails);
router.post('/cards/create', registerCard);
router.delete('/cards/:card_id', deleteCard);
router.post('/cards/:card_id/recharge', adminRechargeCard);
router.post('/cards/:card_id/parking', recordParkingTransaction);
router.get('/cards/:card_id/history', getCardHistoryForAdmin);

export default router;