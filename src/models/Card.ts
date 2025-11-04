import { Schema, model, Document } from 'mongoose';

export interface ICard extends Document {
  card_id: string;
  user: Schema.Types.ObjectId;
  license_plate: string;
  owner_name: string;
  balance: number;
  is_active: boolean;
  createdAt: Date;
}

const CardSchema = new Schema({
  card_id: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  license_plate: { type: String, required: true },
  owner_name: { type: String, required: true },
  balance: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

export default model<ICard>('Card', CardSchema);