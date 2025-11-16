import { Router } from 'express';
import { login, adminLogin } from '../controllers/authController';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/admin/login', adminLogin);

export default router;