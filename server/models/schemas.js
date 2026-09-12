import mongoose from 'mongoose';

/** Stored file reference (Cloudinary or local disk). */
export const fileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    provider: { type: String, enum: ['cloudinary', 'local'], default: 'local' },
    resourceType: { type: String },
    originalName: { type: String, trim: true, maxlength: 255 },
    mimeType: { type: String },
    size: { type: Number, min: 0 },
  },
  { _id: true, timestamps: false }
);

/** Removes internals from JSON output. */
export const toJSONOptions = {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret.id;
    return ret;
  },
};
