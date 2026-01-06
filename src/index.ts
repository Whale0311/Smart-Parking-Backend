import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors'; 

import cardRoutes from './routes/cardRoutes';
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { authenticateToken, authorizeAdmin } from './middleware/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 1. Cấu hình Middleware
app.use(cors()); // <--- Cho phép Frontend gọi API
app.use(express.json());

// 2. Kết nối MongoDB
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("FATAL ERROR: MONGO_URI is not defined");
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// 3. Định nghĩa Routes

// Test route
app.get('/', (req, res) => {
  res.send('Smart Parking API is running!');
});

// Auth routes (Đăng nhập/Đăng ký - Public)
app.use('/auth', authRoutes);


// User card routes (Tra cứu thẻ)
app.use('/', cardRoutes); 

// Admin routes (Quản lý thẻ, người dùng - Cần quyền Admin)
app.use('/admin', authenticateToken, authorizeAdmin, adminRoutes);

// API user
app.use('/api/user', userRoutes);

// 4. Khởi chạy Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});