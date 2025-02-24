const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ProviderSchema = new mongoose.Schema({
  
  name: { type: String, required: true },
  surname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  dob: { type: Date, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'provider' },
  languages: { type: [String], required: true },  // Adiciona o campo de idiomas
  // Outros campos específicos para fornecedores

});

ProviderSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

ProviderSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('Provider', ProviderSchema);
