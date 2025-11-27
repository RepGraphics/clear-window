// Auth page logic (login and signup)

// Show alert message
function showAlert(message, type = 'error') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Disable button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        
        try {
            const response = await api.login(email, password);
            
            showAlert('Login successful! Redirecting...', 'success');
            // Store token and user in localStorage
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            // Force reload so header nav updates
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            showAlert(error.message || 'Login failed. Please check your credentials.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });
}

// Signup Form Handler
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate passwords match
        if (password !== confirmPassword) {
            showAlert('Passwords do not match');
            return;
        }

        // Validate password strength
        if (password.length < 8) {
            showAlert('Password must be at least 8 characters long');
            return;
        }

        // Disable button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        try {
            const response = await api.signup(username, email, password);

            if (response.user && response.user.isEmailVerified) {
                showAlert('Account created and you are now signed in! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/account';
                }, 1200);
            } else {
                showAlert('Account created successfully! Please check your email to verify your account.', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            }

        } catch (error) {
            showAlert(error.message || 'Signup failed. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    });
}

// Check if user is already logged in
const currentUser = api.getCurrentUser();
if (currentUser && (window.location.pathname.includes('login') || window.location.pathname.includes('signup'))) {
    window.location.href = '/submit-review';
}
