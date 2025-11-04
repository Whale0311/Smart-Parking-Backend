import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cardRoutes from './routes/cardRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use('/', cardRoutes); 

// Admin routes se co dinh voi /admin
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Card Parking API is running!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
