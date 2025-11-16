import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// USER: POST /auth/login
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Email và mật khẩu là bắt buộc' 
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Email hoặc mật khẩu không đúng' 
            });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Email hoặc mật khẩu không đúng' 
            });
        }

        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            status: 'success',
            message: 'Đăng nhập thành công',
            data: {
                token,
                user: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: (error as Error).message 
        });
    }
};


// ADMIN: POST /auth/admin/login
export const adminLogin = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Email và mật khẩu là bắt buộc' 
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Email hoặc mật khẩu không đúng' 
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ 
                status: 'error', 
                message: 'Bạn không có quyền truy cập admin' 
            });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                status: 'error', 
                message: 'Email hoặc mật khẩu không đúng' 
            });
        }

        // Tạo token với role admin từ database
        const token = jwt.sign(
            { 
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            status: 'success',
            message: 'Đăng nhập admin thành công',
            data: {
                token,
                user: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: (error as Error).message 
        });
    }
};