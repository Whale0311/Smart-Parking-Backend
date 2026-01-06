import { Request, Response } from 'express';
import Card from '../models/Card';
import Transaction from '../models/Transaction';
import User from '../models/User'; // <--- FIX 1: Thêm dòng này

// API: Lấy thông tin thẻ của chính User đang đăng nhập
export const getMyCardInfo = async (req: any, res: Response) => {
    try {
        // 1. Lấy thông tin từ Token
        // Token có thể lưu id dưới dạng user_id hoặc userId tùy lúc tạo
        const tokenUserId = req.user.user_id || req.user.userId; 
        const tokenEmail = req.user.email;

        if (!tokenUserId && !tokenEmail) {
             return res.status(401).json({ status: 'error', message: 'Token không hợp lệ hoặc thiếu thông tin' });
        }

        // 2. Tìm User trong DB để lấy _id thật (ObjectId)
        // Dùng $or để tìm theo user_id HOẶC email cho chắc chắn
        const user = await User.findOne({ 
            $or: [{ user_id: tokenUserId }, { email: tokenEmail }] 
        });

        if (!user) {
            return res.status(404).json({ status: 'error', message: "User không tồn tại trong hệ thống" });
        }

        // 3. Tìm Card theo _id của User (ObjectId)
        const card = await Card.findOne({ user: user._id }).populate('user', 'name email');

        if (!card) {
            return res.status(404).json({ status: 'error', message: "Bạn chưa được liên kết với thẻ xe nào" });
        }

        res.status(200).json({
            status: 'success',
            data: card
        });
    } catch (error: any) { // <--- FIX 2: Thêm ': any' để sửa lỗi unknown
        console.error("Get My Card Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// API: Lấy lịch sử giao dịch của chính User
export const getMyCardHistory = async (req: any, res: Response) => {
    try {
        const tokenUserId = req.user.user_id || req.user.userId; 
        const tokenEmail = req.user.email;
        
        // 1. Tìm user trước
        const user = await User.findOne({ 
            $or: [{ user_id: tokenUserId }, { email: tokenEmail }] 
        });

        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        // 2. Tìm thẻ của user
        const card = await Card.findOne({ user: user._id });
        if (!card) {
            return res.status(404).json({ status: 'error', message: 'Chưa có thẻ xe nào được liên kết' });
        }

        // 3. Tìm giao dịch
        const transactions = await Transaction.find({ card: card._id }).sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            data: transactions
        });
    } catch (error: any) { // <--- FIX 2: Thêm ': any'
        console.error("Get History Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};