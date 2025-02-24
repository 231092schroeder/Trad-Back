const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ConsumerSchema = new mongoose.Schema({
  
  name: { type: String, required: true },
  surname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dob: { type: Date, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'consumer' },
  requests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request', 
    },
  ],
});

ConsumerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

ConsumerSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Consumer', ConsumerSchema);
