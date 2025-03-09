const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const connectDB = require('./config/db.config');

connectDB('mongodb+srv://tatianeschroeder:Eumeamo2310%40@cluster1.vzsoj.mongodb.net/traduction');

const app = express();
app.use(cors({
    origin: 'http://localhost:4200', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));
app.use(express.json());
app.use('/api/auth', authRoutes);

app.listen(3000, () => console.log('Backend rodando em http://localhost:3000'));
