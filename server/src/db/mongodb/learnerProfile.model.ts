import mongoose, { Schema, Document } from 'mongoose';

export interface IMistake {
  pattern: string;
  correction: string;
  count: number;
}

export interface ILearnerProfile extends Document {
  userId: number;
  level: string;
  strengths: string[];
  weakAreas: string[];
  commonMistakes: IMistake[];
  totalXp: number;
  totalSessions: number;
  lastActive?: Date;
}

const MistakeSchema = new Schema<IMistake>(
  {
    pattern: { type: String, required: true },
    correction: { type: String, required: true },
    count: { type: Number, default: 1 },
  },
  { _id: false }
);

const LearnerProfileSchema = new Schema<ILearnerProfile>({
  userId: { type: Number, required: true, unique: true, index: true },
  level: { type: String, default: 'beginner' },
  strengths: { type: [String], default: [] },
  weakAreas: { type: [String], default: [] },
  commonMistakes: { type: [MistakeSchema], default: [] },
  totalXp: { type: Number, default: 0 },
  totalSessions: { type: Number, default: 0 },
  lastActive: { type: Date },
});

export const LearnerProfile = mongoose.model<ILearnerProfile>(
  'LearnerProfile',
  LearnerProfileSchema
);
