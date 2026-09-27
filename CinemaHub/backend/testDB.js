import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({});
        console.log('Users in DB:', users.length);
        console.log(users);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

test();
