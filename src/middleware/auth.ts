import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mở rộng Interface để TypeScript không báo lỗi khi gọi req.user
export interface AuthRequest extends Request {
    user?: any; 
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Lấy phần sau 'Bearer'

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Access token required' });
    }

    try {
        // Giải mã Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        
    
        (req as any).user = decoded; 
        // --------------------------

        next();
    } catch (error) {
        return res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
    }
};

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
    // Lấy user từ biến đã gán ở trên
    const user = (req as any).user;

    if (!user || user.role !== 'admin') {
        return res.status(403).json({ status: 'error', message: 'Admin access required' });
    }
    next();
};