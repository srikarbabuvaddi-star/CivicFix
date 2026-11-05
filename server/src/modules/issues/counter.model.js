import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  seq: {
    type: Number,
    default: 1000
  }
});

export const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically increments and returns the next sequence number for a given counter key.
 * Uses MongoDB findOneAndUpdate with $inc for concurrency safety.
 */
export async function getNextSequenceValue(counterId = 'issueNumber', initialSeq = 1000) {
  const result = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();

  // If newly created and seq is 1, initialize to initialSeq + 1
  if (result.seq === 1 && initialSeq > 1) {
    const updated = await Counter.findByIdAndUpdate(
      counterId,
      { $set: { seq: initialSeq + 1 } },
      { new: true }
    ).exec();
    return updated.seq;
  }

  return result.seq;
}

