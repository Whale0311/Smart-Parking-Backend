import { Request, Response } from 'express';
import Card from '../models/Card';
import Transaction from '../models/Transaction';
import mongoose from 'mongoose';

// USER: GET /{card_id}
export const getCardInfo = async (req: Request, res: Response) => {
  try {
    const card = await Card.findOne({ card_id: req.params.card_id, is_active: true }).populate('user', 'name');
    if (!card) {
      return res.status(404).json({ status: 'error', message: 'Card not found' });
    }
    res.status(200).json({
      status: 'success',
      data: {
        card_id: card.card_id,
        license_plate: card.license_plate,
        owner_name: card.owner_name,
        balance: card.balance,
        is_active: card.is_active,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: (error as Error).message });
  }
};

// USER: GET /{card_id}/history
export const getCardHistory = async (req: Request, res: Response) => {
    try {
        const card = await Card.findOne({ card_id: req.params.card_id });
        if (!card) {
            return res.status(404).json({ status: 'error', message: 'Card not found' });
        }
        const transactions = await Transaction.find({ card: card._id }).sort({ timestamp: -1 });
        res.status(200).json({ status: 'success', data: transactions });
    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
    }
};

// USER: POST /{card_id}/recharge
export const rechargeCard = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { amount, payment_method } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid amount' });
        }

        const card = await Card.findOne({ card_id: req.params.card_id, is_active: true }).session(session);
        if (!card) {
            throw new Error('Card not found or is inactive');
        }

        card.balance += amount;
        await card.save({ session });

        const transaction = new Transaction({
            card: card._id,
            type: 'RECHARGE',
            amount: amount,
            payment_method: payment_method,
            description: `Nạp tiền qua ${payment_method || 'Unknown'}`,
        });
        await transaction.save({ session });

        await session.commitTransaction();
        res.status(200).json({
            status: 'success',
            message: 'Nạp tiền thành công!',
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