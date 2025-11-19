import { Schema, model, Document } from 'mongoose';

export interface ITransaction extends Document {
    transaction_id: string;
    card: Schema.Types.ObjectId;
    type: 'PARKING' | 'RECHARGE';
    amount: number;
    payment_method?: string;
    description?: string;
    location?: string;
    timestamp_in?: Date;
    timestamp_out?: Date;
    createdAt: Date;
}

const TransactionSchema = new Schema({
    transaction_id: { type: String, unique: true },
    card: { type: Schema.Types.ObjectId, ref: 'Card', required: true },
    type: { type: String, enum: ['PARKING', 'RECHARGE'], required: true },
    amount: { type: Number, required: true },
    payment_method: { type: String },
    description: { type: String },
    location: { type: String },
    timestamp_in: { type: Date },
    timestamp_out: { type: Date },
}, { timestamps: true });

// Pre-save hook để tự động tạo transaction_id
TransactionSchema.pre('save', function (next) {
    if (!this.transaction_id) {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const typePrefix = this.type === 'PARKING' ? 'PARK' : 'RCHG';
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.transaction_id = `TXN_${date}_${typePrefix}_${random}`;
    }
    next();
});

export default model<ITransaction>('Transaction', TransactionSchema);