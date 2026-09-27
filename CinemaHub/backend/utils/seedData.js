import User from '../models/User.js';

const seedDatabase = async () => {
    try {
        const count = await User.countDocuments();
        if (count === 0) {
            console.log('Database is empty. Seeding data...');

            const users = [
                {
                    username: 'Admin',
                    email: 'admin@cinemahub.com',
                    password: 'password123',
                    role: 'Admin',
                    isVerified: true,
                    permissions: ['manage_movies', 'manage_showtimes', 'manage_bookings', 'manage_users', 'view_reports']
                },
                {
                    username: 'Staff',
                    email: 'staff@cinemahub.com',
                    password: 'password123',
                    role: 'Staff',
                    isVerified: true,
                    permissions: ['manage_movies', 'manage_showtimes']
                },
                {
                    username: 'Customer',
                    email: 'customer@cinemahub.com',
                    password: 'password123',
                    role: 'Customer',
                    isVerified: true,
                    permissions: []
                }
            ];

            // Wait for all saves to complete (triggers the pre-save hook for hashing)
            for (let userData of users) {
                const user = new User(userData);
                await user.save();
            }

            console.log('Seeding completed! You can now login with: admin@cinemahub.com / password123');
        }
    } catch (error) {
        console.error('Error seeding data:', error);
    }
};

export default seedDatabase;
