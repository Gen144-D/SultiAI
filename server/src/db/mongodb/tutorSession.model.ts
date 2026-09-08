import mongoose, { Schema, Document } from 'mongoose';

export interface ITutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ITutorSession extends Document {
  userId: number;
  messages: ITutorMessage[];
  summary?: string;
  startedAt: Date;
  endedAt?: Date;
}

const TutorMessageSchema = new Schema<ITutorMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const TutorSessionSchema = new Schema<ITutorSession>({
  userId: { type: Number, required: true, index: true },
  messages: { type: [TutorMessageSchema], default: [] },
  summary: { type: String },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
});

export const TutorSession = mongoose.model<ITutorSession>('TutorSession', TutorSessionSchema);
