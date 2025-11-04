import { Schema, model, Document } from 'mongoose';

export interface ITransaction extends Document {
    transaction_id: number;
    card: Schema.Types.ObjectId;
    type: 'PARKING' | 'RECHARGE';
    amount: number;
    payment_method?: string;
    location: string;
    timestamp_in?: Date;
    timestamp_out?: Date;
    createdAt: Date;
}

const TransactionSchema = new Schema({
    transaction_id: { type: Number, required: true, unique: true },
    card: { type: Schema.Types.ObjectId, ref: 'Card', required: true },
    type: { type: String, enum: ['PARKING', 'RECHARGE'], required: true },
    amount: { type: Number, required: true },
    payment_method: { type: String },
    location: { type: String, required: true },
    timestamp_in: { type: Date },
    timestamp_out: { type: Date },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default model<ITransaction>('Transaction', TransactionSchema);