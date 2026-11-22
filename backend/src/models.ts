import mongoose, { Schema, Types } from 'mongoose';

const jsonOptions = { virtuals: true, transform: (_doc: unknown, ret: Record<string, unknown>) => { ret.id = String(ret._id); delete ret._id; delete ret.__v; delete ret.passwordHash; delete ret.passwordResetTokenHash; delete ret.passwordResetExpiresAt; return ret; } };
const id = () => ({ type: Schema.Types.ObjectId, default: () => new Types.ObjectId() });

export const Role = { USER: 'USER', DONOR: 'DONOR', REQUESTER: 'REQUESTER', ADMIN: 'ADMIN' } as const;
export const BloodGroup = { A_POSITIVE: 'A_POSITIVE', A_NEGATIVE: 'A_NEGATIVE', B_POSITIVE: 'B_POSITIVE', B_NEGATIVE: 'B_NEGATIVE', AB_POSITIVE: 'AB_POSITIVE', AB_NEGATIVE: 'AB_NEGATIVE', O_POSITIVE: 'O_POSITIVE', O_NEGATIVE: 'O_NEGATIVE' } as const;
export type BloodGroupValue = typeof BloodGroup[keyof typeof BloodGroup];
export const RequestStatus = { SUBMITTED: 'SUBMITTED', CONTACTING: 'CONTACTING', FULFILLED: 'FULFILLED', CANCELLED: 'CANCELLED' } as const;
export const VerificationStatus = { PENDING: 'PENDING', VERIFIED: 'VERIFIED', REJECTED: 'REJECTED' } as const;

const userSchema = new Schema({
  _id: id(), name: { type: String, required: true, minlength: 2, maxlength: 80 }, email: { type: String, required: true, unique: true, lowercase: true, trim: true }, passwordHash: { type: String, required: true },
  passwordResetTokenHash: String, passwordResetExpiresAt: Date, phone: String, city: String, role: { type: String, enum: Object.values(Role), default: Role.USER }, active: { type: Boolean, default: true },
}, { collection: 'User', timestamps: true, toJSON: jsonOptions, toObject: jsonOptions });

const donorSchema = new Schema({
  _id: id(), userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true }, bloodGroup: { type: String, enum: Object.values(BloodGroup), required: true }, city: { type: String, required: true },
  latitude: Number, longitude: Number, available: { type: Boolean, default: true }, consentVisible: { type: Boolean, default: false }, verificationStatus: { type: String, enum: Object.values(VerificationStatus), default: VerificationStatus.PENDING }, isDemo: { type: Boolean, default: false }, lastVerifiedAt: { type: Date, default: Date.now },
}, { collection: 'DonorProfile', timestamps: true, toJSON: jsonOptions, toObject: jsonOptions });

const bankSchema = new Schema({
  _id: id(), name: { type: String, required: true }, city: { type: String, required: true }, address: { type: String, required: true }, phone: { type: String, required: true }, latitude: Number, longitude: Number,
  bloodInventory: { type: Schema.Types.Mixed, required: true }, operatingHours: String, verified: { type: Boolean, default: false }, verificationStatus: { type: String, enum: Object.values(VerificationStatus), default: VerificationStatus.PENDING }, isDemo: { type: Boolean, default: false }, lastVerifiedAt: { type: Date, default: Date.now },
}, { collection: 'BloodBank', timestamps: true, toJSON: jsonOptions, toObject: jsonOptions });

const requestSchema = new Schema({
  _id: id(), userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, donorId: { type: Schema.Types.ObjectId, ref: 'DonorProfile', default: null }, bloodGroup: { type: String, enum: Object.values(BloodGroup), required: true }, unitsNeeded: { type: Number, min: 1, max: 20, required: true }, urgency: String, city: String, hospitalName: String, contactMethod: String, details: String, consentToShare: { type: Boolean, default: false }, isDemo: { type: Boolean, default: false }, status: { type: String, enum: Object.values(RequestStatus), default: RequestStatus.SUBMITTED },
}, { collection: 'BloodRequest', timestamps: true, toJSON: jsonOptions, toObject: jsonOptions });

const reportSchema = new Schema({
  _id: id(), authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, bankId: { type: Schema.Types.ObjectId, ref: 'BloodBank', default: null }, title: String, description: String,
}, { collection: 'Report', timestamps: { createdAt: true, updatedAt: false }, toJSON: jsonOptions, toObject: jsonOptions });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const DonorProfile = mongoose.models.DonorProfile || mongoose.model('DonorProfile', donorSchema);
export const BloodBank = mongoose.models.BloodBank || mongoose.model('BloodBank', bankSchema);
export const BloodRequest = mongoose.models.BloodRequest || mongoose.model('BloodRequest', requestSchema);
export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
