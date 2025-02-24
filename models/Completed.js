const mongoose = require('mongoose');

const CompletedSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  sourceLanguage: { type: String, required: true },
  targetLanguage: { type: String, required: true },
  pricePerPage: { type: Number, required: true },
  pageCount: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now },
  documentUrl: { type: String }, 
  translatedText: { type: String }, 
  correctedText: { type: String },
  originalLanguage: { type: String }, 
  status: { type: String, required: true, default: 'Completed' }
});

module.exports = mongoose.model('Completed', CompletedSchema);
