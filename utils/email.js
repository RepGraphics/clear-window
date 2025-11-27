const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_PORT == 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Send email verification
exports.sendVerificationEmail = async (user, token) => {
    if (process.env.EMAIL_VERIFICATION_ENABLED === 'false') {
        // Do not send email if verification is disabled
        return;
    }
    const transporter = createTransporter();
    const verificationUrl = `${process.env.APP_URL}/verify-email/${token}`;
    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: user.email,
        subject: 'Verify Your Email - Clear Window',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f0f9ff; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to Clear Window!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${user.username},</h2>
                        <p>Thank you for signing up! Please verify your email address to complete your registration and start submitting verified reviews.</p>
                        <p>Click the button below to verify your email:</p>
                        <p style="text-align: center;">
                            <a href="${verificationUrl}" class="button">Verify Email Address</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #0284c7;">${verificationUrl}</p>
                        <p><strong>This link will expire in 24 hours.</strong></p>
                        <p>If you didn't create an account with Clear Window, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 Clear Window. All rights reserved.</p>
                        <p>Transparent reviews. Verified truth.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('[Email] Verification email sent:', info);
        return { success: true };
    } catch (error) {
        console.error('[Email] Failed to send verification email:', error);
        return { success: false, error: error.message };
    }
};

// Send welcome email after verification
exports.sendWelcomeEmail = async (user) => {
    const transporter = createTransporter();
    
    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: user.email,
        subject: 'Welcome to Clear Window!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f0f9ff; padding: 30px; border-radius: 0 0 10px 10px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Email Verified!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${user.username},</h2>
                        <p>Your email has been successfully verified! You now have full access to Clear Window.</p>
                        <h3>What's Next?</h3>
                        <ul>
                            <li>Submit your first verified review</li>
                            <li>Browse reviews from other verified users</li>
                            <li>Help create a transparent review ecosystem</li>
                        </ul>
                        <p>Thank you for joining our community!</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 Clear Window. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Welcome email error:', error);
    }
};

// Send review verification notification
exports.sendReviewVerificationNotification = async (user, review) => {
    const transporter = createTransporter();
    
    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: user.email,
        subject: 'Review Submitted for Verification - Clear Window',
        html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Review Submitted Successfully</h2>
                    <p>Hi ${user.username},</p>
                    <p>Your review for <strong>${review.propertyName}</strong> has been submitted and is now pending verification.</p>
                    <p>Our team will review your submission within 24-48 hours. You'll receive another email once your review is verified and published.</p>
                    <p><strong>Review Details:</strong></p>
                    <ul>
                        <li>Property: ${review.propertyName}</li>
                        <li>Rating: ${review.rating}/5</li>
                        <li>Submitted: ${new Date().toLocaleDateString()}</li>
                    </ul>
                    <p>Thank you for contributing to our community!</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">&copy; 2025 Clear Window. All rights reserved.</p>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Review notification email error:', error);
    }
};
