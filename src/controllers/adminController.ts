import { Request, Response } from 'express';
import Card from '../models/Card';
import Transaction from '../models/Transaction';
import User from '../models/User';
import ParkingSession from '../models/ParkingSession';
import mongoose from 'mongoose';

const PARKING_RATES = {
    motorbike_fixed: 4000,  // 4.000 VNĐ / lượt (xe máy)
    car_hourly: 5000        // 5.000 VNĐ / giờ (ô tô)
};

// --- HELPER FUNCTION: Tính phí đỗ xe ---
const calculateFee = (vehicleType: string, durationHours: number): number => {
    if (vehicleType === 'motorbike') {
        return PARKING_RATES.motorbike_fixed;
    } else {
        // Ô tô: Tối thiểu tính 1 giờ
        const billableHours = durationHours > 0 ? durationHours : 1;
        return billableHours * PARKING_RATES.car_hourly;
    }
};

// ADMIN: POST /users
export const createUser = async (req: Request, res: Response) => {
    try {
        const { user_id, name, email, password, role } = req.body;

        if (!user_id || !name || !email || !password) {
            return res.status(400).json({ status: 'error', message: 'Tất cả các trường đều bắt buộc' });
        }
        
        if (role && !['user', 'admin'].includes(role)) {
            return res.status(400).json({ status: 'error', message: 'Role phải là "user" hoặc "admin"' });
        }

        const newUser = new User({ user_id, name, email, password, role });
        await newUser.save();

        res.status(201).json({
            status: 'success',
            message: 'Tạo người dùng thành công.',
            data: {
                user_id: newUser.user_id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
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

// GET /users
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.status(200).json({
            status: 'success',
            count: users.length,
            data: users,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
    }
}

// GET /users/{user_id}
export const getUserById = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;

        const user = await User.findOne({ user_id }).select('-password');
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        res.status(200).json({
            status: 'success',
            data: user,
        });

    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
    }
}
// GET /cards/{card_id}
export const getCardDetails = async (req: Request, res: Response) => {
    try {
        const card = await Card.findOne({ card_id: req.params.card_id }).populate('user', 'user_id name email');
        if (!card) {
            return res.status(404).json({ status: 'error', message: 'Card not found' });
        }
        res.status(200).json({
            status: 'success',
            data: {
                card_id: card.card_id,
                user: card.user,
                license_plate: card.license_plate,
                owner_name: card.owner_name,
                vehicle_type: card.vehicle_type, // Bổ sung vehicle_type
                balance: card.balance,
                is_active: card.is_active,
                created_at: card.createdAt,
            },
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
    }
};

// ADMIN: POST /cards/create (Logic V1: Tự động tạo/tìm User)
export const registerCard = async (req: Request, res: Response) => {
    try {
        const { card_id, owner_name, email, license_plate, vehicle_type, initial_balance } = req.body;

        // 1. Kiểm tra thẻ tồn tại
        const existingCard = await Card.findOne({ card_id });
        if (existingCard) {
            return res.status(400).json({ status: 'error', message: 'Mã thẻ đã tồn tại!' });
        }

        let user: any = null;

        // 2. LOGIC XỬ LÝ USER (Ưu điểm của V1)
        if (email) {
            user = await User.findOne({ email: email });
            if (!user) {
                return res.status(404).json({ 
                    status: 'error', 
                    message: `Không tìm thấy User với email: ${email}.` 
                });
            }
        } else {
            // Tìm theo tên hoặc tạo mới
            user = await User.findOne({ name: owner_name });
            if (!user) {
                console.log(`User ${owner_name} chưa tồn tại. Đang tạo mới...`);
                const autoEmail = `user_${card_id.toLowerCase().replace(/\s/g, '')}@parking.system`;
                
                user = await User.create({
                    name: owner_name,
                    email: autoEmail,
                    password: '123456default',
                    role: 'user',
                    user_id: `U_${Date.now()}`
                });
            }
        }

        if (!user) {
            return res.status(500).json({ status: 'error', message: 'Lỗi hệ thống: Không xác định được User.' });
        }

        // 3. Tạo thẻ
        const newCard = new Card({
            card_id,
            user: user._id,
            owner_name,     
            license_plate,
            vehicle_type: vehicle_type || 'car', // Mặc định là car nếu không gửi lên
            balance: initial_balance || 0,
            is_active: true
        });

        await newCard.save();

        // 4. Nạp tiền khởi tạo (nếu có)
        if (initial_balance && initial_balance > 0) {
            await Transaction.create({
                card: newCard._id,
                type: 'RECHARGE',
                amount: initial_balance,
                payment_method: 'CASH',
                description: 'Nạp tiền khởi tạo'
            });
        }

        res.status(201).json({
            status: 'success',
            message: 'Đăng ký thẻ thành công.',
            data: {
                card_id: newCard.card_id,
                linked_user: user.name,
                email_linked: user.email,
                vehicle_type: newCard.vehicle_type
            },
        });

    } catch (error: any) {
        console.error("Register Error:", error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// ADMIN: DELETE /cards/delete/{card_id}
// (Cải tiến: Sử dụng Soft Delete thay vì xóa cứng để bảo toàn lịch sử)
export const deleteCard = async (req: Request, res: Response) => {
    try {
        const { card_id } = req.params;
        const card = await Card.findOne({ card_id });
        
        if (!card) {
            return res.status(404).json({ status: 'error', message: 'Card not found' });
        }

        // Thay vì xóa cứng (findOneAndDelete), ta vô hiệu hóa
        card.is_active = false;
        await card.save();

        res.status(200).json({
            status: 'success',
            message: `Đã vô hiệu hóa thẻ ${card.card_id} thành công.`,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
    }
};

// POST /cards/{card_id}/reactivate
export const reactivateCard = async (req: Request, res: Response) => {
    try {
        const { card_id } = req.params;
        const card = await Card.findOne({ card_id });
        if (!card) {
            return res.status(404).json({ status: 'error', message: 'Card not found' });
        }

        if (card.is_active) {
            return res.status(400).json({ status: 'error', message: 'Card is already active' });
        }

        card.is_active = true;
        await card.save();

        res.status(200).json({
            status: 'success',
            message: `Đã kích hoạt lại thẻ ${card.card_id} thành công.`,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
    }
}

// ADMIN: POST /cards/{card_id}/recharge
export const adminRechargeCard = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { amount, payment_method } = req.body;
        if (!amount || amount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ status: 'error', message: 'Invalid amount' });
        }

        const card = await Card.findOne({ card_id: req.params.card_id, is_active: true }).session(session);
        if (!card) {
            await session.abortTransaction();
            return res.status(400).json({ status: 'error', message: 'Card not found or inactive' });
        }

        card.balance += amount;
        await card.save({ session });

        const transaction = new Transaction({
            card: card._id,
            type: 'RECHARGE',
            amount: amount,
            payment_method: payment_method || 'ONLINE',
            description: `Nạp tiền qua ${payment_method || 'ONLINE'}`,
        });
        await transaction.save({ session });

        await session.commitTransaction();
        res.status(200).json({
            status: 'success',
            message: 'Nạp tiền thành công.',
            card_id: card.card_id,
            new_balance: card.balance,
            transaction_id: transaction.transaction_id
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ status: 'error', message: (error as Error).message });
    } finally {
        session.endSession();
    }
};

// ADMIN: POST /cards/{card_id}/parking/checkin
export const parkingCheckIn = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { location } = req.body;
        const { card_id } = req.params;

        if (!location) {
            await session.abortTransaction();
            return res.status(400).json({ status: 'error', message: 'Location là bắt buộc' });
        }

        const card = await Card.findOne({ card_id, is_active: true }).session(session);
        if (!card) {
            await session.abortTransaction();
            return res.status(404).json({ status: 'error', message: 'Card not found or is inactive' });
        }

        const activeSession = await ParkingSession.findOne({ 
            card: card._id, 
            status: 'ACTIVE' 
        }).session(session);

        if (activeSession) {
            await session.abortTransaction();
            return res.status(400).json({ 
                status: 'error', 
                message: 'Thẻ này đang có phiên đỗ xe chưa kết thúc',
                data: { location: activeSession.location, timestamp_in: activeSession.timestamp_in }
            });
        }

        const parkingSession = new ParkingSession({
            card: card._id,
            location,
            timestamp_in: new Date(),
            status: 'ACTIVE'
        });
        await parkingSession.save({ session });

        await session.commitTransaction();
        res.status(200).json({
            status: 'success',
            message: 'Check-in thành công',
            data: {
                session_id: parkingSession._id,
                card_id: card.card_id,
                vehicle_type: card.vehicle_type,
                location: parkingSession.location,
                timestamp_in: parkingSession.timestamp_in,
                current_balance: card.balance
            }
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ status: 'error', message: (error as Error).message });
    } finally {
        session.endSession();
    }
};

// ADMIN: POST /cards/{card_id}/parking/checkout
// --- KẾT HỢP: Logic kiểm tra biển số (V2) + Logic tính giá theo loại xe (V1) ---
export const parkingCheckOut = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { card_id } = req.params;
        const { license_plate } = req.body; // Lấy biển số từ request (V2)

        const card = await Card.findOne({ card_id, is_active: true }).session(session);
        if (!card) {
            await session.abortTransaction();
            return res.status(404).json({ status: 'error', message: 'Card not found or is inactive' });
        }

        // 1. Kiểm tra biển số (Tính năng của V2 - Tăng bảo mật)
        // Nếu API gửi lên biển số, ta kiểm tra khớp với thẻ không
        if (license_plate && card.license_plate !== license_plate) {
            await session.abortTransaction();
            return res.status(400).json({
                status: 'error',
                message: `Biển số xe không khớp. Biển số xe đã đăng ký là ${card.license_plate}.`
            });
        }

        // 2. Tìm session
        const activeSession = await ParkingSession.findOne({ 
            card: card._id, 
            status: 'ACTIVE' 
        }).session(session);

        if (!activeSession) {
            await session.abortTransaction();
            return res.status(400).json({ status: 'error', message: 'Không tìm thấy phiên đỗ xe đang hoạt động' });
        }

        // 3. Tính toán thời gian
        const timeOut = new Date();
        const timeIn = activeSession.timestamp_in;
        const durationMs = timeOut.getTime() - timeIn.getTime();
        const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)); 

        // 4. Tính phí (Logic của V1 - Phân loại xe)
        const feeAmount = calculateFee(card.vehicle_type, durationHours);
        const parkingFee = -feeAmount; // Số tiền trừ đi (âm)

        // 5. Kiểm tra số dư
        if (card.balance < feeAmount) {
            await session.abortTransaction();
            return res.status(400).json({ 
                status: 'error', 
                message: `Số dư không đủ. Cần ${feeAmount} VNĐ, còn ${card.balance} VNĐ`,
                data: {
                    required_amount: feeAmount,
                    current_balance: card.balance,
                    shortage: feeAmount - card.balance
                }
            });
        }

        // 6. Cập nhật và lưu
        activeSession.timestamp_out = timeOut;
        activeSession.status = 'COMPLETED';
        await activeSession.save({ session });

        card.balance += parkingFee;
        await card.save({ session });

        const transaction = new Transaction({
            card: card._id,
            type: 'PARKING',
            amount: parkingFee,
            description: `Gửi xe ${card.vehicle_type} tại ${activeSession.location} - ${durationHours} giờ`,
            location: activeSession.location,
            timestamp_in: timeIn,
            timestamp_out: timeOut,
        });
        await transaction.save({ session });

        await session.commitTransaction();
        res.status(200).json({
            status: 'success',
            message: 'Check-out thành công.',
            data: {
                session_id: activeSession._id,
                card_id: card.card_id,
                vehicle_type: card.vehicle_type,
                license_plate: card.license_plate,
                timestamp_in: timeIn,
                timestamp_out: timeOut,
                duration_hours: durationHours,
                parking_fee: feeAmount,
                new_balance: card.balance
            }
        });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ status: 'error', message: (error as Error).message });
    } finally {
        session.endSession();
    }
};

// ADMIN: GET /cards/{card_id}/parking/status
// (Cải tiến: Tính tiền dự kiến dựa trên loại xe chính xác)
export const getParkingStatus = async (req: Request, res: Response) => {
    try {
        const { card_id } = req.params;
        const card = await Card.findOne({ card_id });
        if (!card) {
            return res.status(404).json({ status: 'error', message: 'Card not found' });
        }

        const activeSession = await ParkingSession.findOne({ 
            card: card._id, 
            status: 'ACTIVE' 
        });

        if (!activeSession) {
            return res.status(200).json({
                status: 'success',
                message: 'Không có phiên đỗ xe nào đang hoạt động',
                data: {
                    card_id: card.card_id,
                    has_active_session: false,
                    current_balance: card.balance
                }
            });
        }

        const now = new Date();
        const durationMs = now.getTime() - activeSession.timestamp_in.getTime();
        const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
        
        // Sử dụng hàm tính phí chung để hiển thị đúng giá tiền
        const estimatedFee = calculateFee(card.vehicle_type, durationHours);

        res.status(200).json({
            status: 'success',
            data: {
                card_id: card.card_id,
                vehicle_type: card.vehicle_type,
                has_active_session: true,
                session_id: activeSession._id,
                location: activeSession.location,
                timestamp_in: activeSession.timestamp_in,
                current_duration_hours: durationHours,
                estimated_fee: estimatedFee,
                current_balance: card.balance,
                sufficient_balance: card.balance >= estimatedFee
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: (error as Error).message });
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
