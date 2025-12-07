require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const resetAdminPassword = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✓ MongoDB connected');

        // Find admin user
        const admin = await User.findOne({ email: 'admin@clearwindow.com' });
        
        if (!admin) {
            console.log('❌ Admin user not found with email: admin@clearwindow.com');
            console.log('Creating new admin user...');
            
            const newAdmin = await User.create({
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
        } else {
            console.log('✓ Admin user found');
            console.log('Resetting password...');
            
            // Update password - this will trigger the pre-save hook to hash it
            admin.password = 'Admin123!';
            admin.accountStatus = 'active';
            admin.isEmailVerified = true;
            await admin.save();
            
            console.log('✓ Password reset successfully!');
            console.log('');
            console.log('=================================');
            console.log('Admin Credentials:');
            console.log('=================================');
            console.log('Email: admin@clearwindow.com');
            console.log('Password: Admin123!');
            console.log('=================================');
        }

        process.exit(0);
    } catch (error) {
        console.error('✗ Error:', error.message);
        process.exit(1);
    }
};

resetAdminPassword();
