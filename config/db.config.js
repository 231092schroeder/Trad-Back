const mongoose = require('mongoose');

// URL de conexão com o MongoDB (substitua pelo seu URI do MongoDB)
const uri = 'mongodb://localhost:27017/mydb';  // Exemplo para MongoDB local, se você estiver usando MongoDB Atlas, será algo como: 'mongodb+srv://<user>:<password>@cluster0.mongodb.net/mydb'

const connectDB = async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);  // Para finalizar a aplicação se a conexão falhar
  }
};

module.exports = connectDB;
