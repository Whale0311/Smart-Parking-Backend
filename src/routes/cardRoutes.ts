import { Router } from 'express';
import { getCardInfo, getCardHistory, rechargeCard } from '../controllers/cardController';

const router = Router();

router.get('/:card_id', getCardInfo);
router.get('/:card_id/history', getCardHistory);
router.post('/:card_id/recharge', rechargeCard);

export default router;