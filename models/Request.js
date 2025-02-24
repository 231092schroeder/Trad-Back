// models/Request.js
const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consumer', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
  type: { type: String, required: true },
  sourceLanguage: { type: String, required: true },
  targetLanguage: { type: String, required: true },
  pricePerPage: { type: Number, required: true },
  pageCount: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  documentUrl: { type: String }, 
  originalText: { type: String }, 
  translatedText: { type: String }, 
  correctedText: { type: String },
  originalLanguage:{ type: String },
  status: { type: String, required: true, default: 'Pending payment' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Request', RequestSchema);
