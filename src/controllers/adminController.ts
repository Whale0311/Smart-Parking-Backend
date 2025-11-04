import { Request, Response } from 'express';
import Card from '../models/Card';
import Transaction from '../models/Transaction';
import User from '../models/User'; 
import mongoose from 'mongoose';

// ADMIN: POST /users
export const createUser = async (req: Request, res: Response) => {
    try {
        const { user_id, name, email, password } = req.body;

        const newUser = new User({
            user_id,
            name,
            email,
            password, 
        });

        await newUser.save();

        res.status(201).json({
            status: 'success',
            message: 'Tạo người dùng thành công.',
            data: {
                user_id: newUser.user_id,
                name: newUser.name,
                email: newUser.email,
                created_at: newUser.createdAt,
            },
        });
    } catch (error) {
        if ((error as any).code === 11000) {
            return res.status(409).json({ status: 'error', message: 'User ID hoặc Email đã tồn tại.' });
        }
        res.status(400).json({ status: 'error', message: (error as Error).message });
    }
};

// ADMIN: POST /cards/create
export const registerCard = async (req: Request, res: Response) => {
    try {
        const { card_id, user_id, license_plate, owner_name, initial_balance = 0 } = req.body;

        const user = await User.findOne({ user_id: user_id });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        const newCard = new Card({
            card_id,
            user: user._id, 
            license_plate,
            owner_name,
            balance: initial_balance,
        });
        await newCard.save();

        res.status(201).json({
            status: 'success',
            message: 'Tạo thẻ thành công.',
            data: {
                card_id: newCard.card_id,
                user_id: user.user_id, 
                owner_name: newCard.owner_name,
                balance: newCard.balance,
                is_active: newCard.is_active,
                created_at: newCard.createdAt,
            },
        });
    } catch (error) {
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({ status: 'error', message: `Invalid format for field ${error.path}` });
        }
        res.status(400).json({ status: 'error', message: (error as Error).message });
    }
};

// ADMIN: DELETE /cards/{card_id}
export const deleteCard = async (req: Request, res: Response) => {
    try {
        const card = await Card.findOneAndUpdate(
            { card_id: req.params.card_id },
            { is_active: false },
            { new: true }
        );

        if (!card) {
            return res.status(404).json({ status: 'error', message: 'Card not found' });
        }

        res.status(200).json({
            status: 'success',
            message: `Đã vô hiệu hóa thẻ ${card.card_id} thành công.`,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
    }
};

// ADMIN: POST /cards/{card_id}/recharge
export const adminRechargeCard = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { amount, description } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid amount' });
        }

        const card = await Card.findOne({ card_id: req.params.card_id }).session(session);
        if (!card) {
            throw new Error('Card not found');
        }

        card.balance += amount;
        await card.save({ session });

        const transaction = new Transaction({
            card: card._id,
            type: 'RECHARGE',
            amount: amount,
            description: description || 'Nạp tiền tại quầy',
        });
        await transaction.save({ session });

        await session.commitTransaction();
        res.status(200).json({
            status: 'success',
            message: 'Nạp tiền thành công.',
            card_id: card.card_id,
            new_balance: card.balance,
            transaction_id: transaction._id,
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ status: 'error', message: (error as Error).message });
    } finally {
        session.endSession();
    }
};

// ADMIN: POST /cards/{card_id}/parking
export const recordParkingTransaction = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { amount, license_plate, location, timestamp_in, timestamp_out } = req.body;
        const parkingFee = Math.abs(amount) * -1; // Ensure amount is negative

        const card = await Card.findOne({ card_id: req.params.card_id, is_active: true }).session(session);
        if (!card) {
            throw new Error('Card not found or is inactive');
        }
        if (card.balance < Math.abs(parkingFee)) {
            throw new Error('Insufficient balance');
        }

        card.balance += parkingFee;
        await card.save({ session });

        const transaction = new Transaction({
            card: card._id,
            type: 'PARKING',
            amount: parkingFee,
            description: `Gửi xe tại ${location}`,
            timestamp_in,
            timestamp_out,
        });
        await transaction.save({ session });

        await session.commitTransaction();
        res.status(200).json({
            status: 'success',
            message: 'Trừ tiền gửi xe thành công.',
            card_id: card.card_id,
            new_balance: card.balance,
            transaction_id: transaction._id,
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ status: 'error', message: (error as Error).message });
    } finally {
        session.endSession();
    }
};

// ADMIN: GET /cards/{card_id}/history
export const getCardHistoryForAdmin = async (req: Request, res: Response) => {
    try {
        const { type } = req.query;
        const card = await Card.findOne({ card_id: req.params.card_id });
        if (!card) {
            return res.status(404).json({ status: 'error', message: 'Card not found' });
        }

        const query: any = { card: card._id };
        if (type && (type === 'PARKING' || type === 'RECHARGE')) {
            query.type = type;
        }

        const transactions = await Transaction.find(query).sort({ timestamp: -1 });
        res.status(200).json({
            status: 'success',
            card_id: card.card_id,
            data: transactions,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
    }
};