import { Schema, model, Document } from 'mongoose';

export interface IParkingSession extends Document {
    card: Schema.Types.ObjectId;
    location: string;
    timestamp_in: Date;
    timestamp_out?: Date;
    status: 'ACTIVE' | 'COMPLETED';
    createdAt: Date;
}

const ParkingSessionSchema = new Schema({
    card: { type: Schema.Types.ObjectId, ref: 'Card', required: true },
    location: { type: String, required: true },
    timestamp_in: { type: Date, required: true, default: Date.now },
    timestamp_out: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
}, { timestamps: true });

ParkingSessionSchema.index({ card: 1, status: 1 });

export default model<IParkingSession>('ParkingSession', ParkingSessionSchema);