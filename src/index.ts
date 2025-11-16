import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cardRoutes from './routes/cardRoutes';
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';
import { authenticateToken, authorizeAdmin } from './middleware/auth';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Public routes
app.get('/', (req, res) => {
  res.send('Card Parking API is running!');
});

// Auth routes (không cần xác thực)
app.use('/auth', authRoutes);

// User card routes (cần xác thực)
app.use('/', authenticateToken, cardRoutes); 

// Admin routes (cần xác thực và quyền admin)
app.use('/admin', authenticateToken, authorizeAdmin, adminRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
