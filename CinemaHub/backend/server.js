import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import seedDatabase from './utils/seedData.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB().then(() => {
    // Seed data if DB is empty
    seedDatabase();
});

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

// Basic route
app.get('/', (req, res) => {
    res.send('CinemaHub API is running...');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
