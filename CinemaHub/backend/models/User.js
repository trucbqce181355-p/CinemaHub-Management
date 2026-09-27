import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false // Do not return password by default
    },
    phoneNumber: {
        type: String,
        trim: true,
        default: ''
    },
    dateOfBirth: {
        type: Date,
    },
    role: {
        type: String,
        enum: ['Customer', 'Staff', 'Admin'],
        default: 'Customer'
    },
    permissions: [{
        type: String
    }],
    status: {
        type: String,
        enum: ['Active', 'Locked'],
        default: 'Active'
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    isVerified: {
        type: Boolean,
        default: false
    },
    otp: String,
    otpExpires: Date
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
