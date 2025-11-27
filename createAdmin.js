require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✓ MongoDB connected');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@clearwindow.com' });
        
        if (existingAdmin) {
            console.log('❌ Admin user already exists');
            console.log('Email:', existingAdmin.email);
            console.log('Username:', existingAdmin.username);
            console.log('Role:', existingAdmin.role);
            process.exit(0);
        }

        // Create admin user
        const admin = await User.create({
            username: 'admin',
            email: 'admin@clearwindow.com',
            password: 'Admin123!',
            role: 'admin',
            isEmailVerified: true,
            accountStatus: 'active'
        });

        console.log('✓ Admin user created successfully!');
        console.log('');
        console.log('=================================');
        console.log('Admin Credentials:');
        console.log('=================================');
        console.log('Email: admin@clearwindow.com');
        console.log('Password: Admin123!');
        console.log('=================================');
        console.log('');
        console.log('⚠️  IMPORTANT: Change the password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('✗ Error creating admin user:', error.message);
        process.exit(1);
    }
};

createAdminUser();
