const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const connectDB = require('./config/db.config');

connectDB('mongodb+srv://tatianeschroeder:Eumeamo2310%40@cluster1.vzsoj.mongodb.net/traduction');

const allowedOrigins = [
    'http://localhost:4200', 
    'dodgerblue-mink-957865.hostingersite.com' 
];

const app = express();
app.use(cors({
    origin: function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }, 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));
app.use(express.json());
app.use('/api/auth', authRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Backend rodando em http://localhost:${port}`);
  });