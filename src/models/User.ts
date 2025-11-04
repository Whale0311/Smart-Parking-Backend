import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
    user_id: string;
    name: string;
    email: string;
    password: string;
    createdAt: Date;
}

const UserSchema = new Schema({
    user_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default model<IUser>('User', UserSchema);