const mongoose = require('mongoose');

// URL de conexão com o MongoDB (substitua pelo seu URI do MongoDB)
const uri = 'mongodb+srv://tatianeschroeder:Eumeamo2310%40@cluster1.vzsoj.mongodb.net/traduction';  // Exemplo para MongoDB local, se você estiver usando MongoDB Atlas, será algo como: 'mongodb+srv://<user>:<password>@cluster0.mongodb.net/mydb'

const connectDB = async () => {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);  // Para finalizar a aplicação se a conexão falhar
  }
};

module.exports = connectDB;
