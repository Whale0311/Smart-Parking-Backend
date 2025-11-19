import { Router } from 'express';
import {
  createUser, // Import hàm mới
  registerCard,
  deleteCard,
  adminRechargeCard,
  getCardHistoryForAdmin,
  getCardDetails,
  reactivateCard,
  parkingCheckIn,
  parkingCheckOut,
  getParkingStatus
} from '../controllers/adminController';

const router = Router();

// User management
router.post('/create_user', createUser);

// Card management
router.post('/cards', registerCard);
router.get('/cards/:card_id', getCardDetails);
router.delete('/cards/:card_id', deleteCard);
router.post('/cards/:card_id/reactivate', reactivateCard);
router.post('/cards/:card_id/recharge', adminRechargeCard);
router.get('/cards/:card_id/history', getCardHistoryForAdmin);

// Parking management
router.post('/cards/:card_id/parking/checkin', parkingCheckIn);
router.post('/cards/:card_id/parking/checkout', parkingCheckOut);
router.get('/cards/:card_id/parking/status', getParkingStatus);

export default router;