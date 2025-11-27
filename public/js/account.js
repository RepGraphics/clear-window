// Account Management Page Logic
document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = '/login';
        return;
    }

    // Load user data
    loadUserProfile();
    loadUserReviews();

    // Section navigation
    const navItems = document.querySelectorAll('.account-nav-item');
    const sections = document.querySelectorAll('.account-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.dataset.section;
            
            // Update active states
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            item.classList.add('active');
            document.getElementById(`${sectionId}-section`).classList.add('active');
        });
    });

    // Profile form
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });

    // Password form
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updatePassword();
    });

    // Notifications form
    document.getElementById('notificationsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showAlert('Notification preferences saved!', 'success');
    });

    // Delete account
    const deleteBtn = document.getElementById('deleteAccountBtn');
    const modal = document.getElementById('deleteModal');
    const cancelBtn = document.getElementById('cancelDelete');
    const confirmBtn = document.getElementById('confirmDelete');
    const confirmInput = document.getElementById('deleteConfirmInput');

    deleteBtn.addEventListener('click', () => {
        modal.classList.add('show');
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        confirmInput.value = '';
        confirmBtn.disabled = true;
    });

    confirmInput.addEventListener('input', () => {
        confirmBtn.disabled = confirmInput.value !== 'DELETE';
    });

    confirmBtn.addEventListener('click', async () => {
        await deleteAccount();
    });
});

async function loadUserProfile() {
    try {
        // Always fetch fresh user info from backend
        const response = await api.getCurrentUserInfo();
        const user = response.user;
        localStorage.setItem('user', JSON.stringify(user));
        document.getElementById('username').value = user.username;
        document.getElementById('email').value = user.email;
        const status = document.getElementById('emailVerificationStatus');
        const resendContainer = document.getElementById('resendVerificationContainer');
        if (user.isEmailVerified) {
            status.innerHTML = '<span style="color: var(--success-color);">✓ Email verified</span>';
            resendContainer.innerHTML = '';
        } else {
            status.innerHTML = '<span style="color: var(--warning-color);">⚠ Email not verified</span>';
            resendContainer.innerHTML = `<button id="resendVerificationBtn" class="btn btn-secondary btn-sm" type="button">Resend verification email</button>`;
            document.getElementById('resendVerificationBtn').addEventListener('click', async () => {
                const btn = document.getElementById('resendVerificationBtn');
                btn.disabled = true;
                btn.textContent = 'Sending...';
                try {
                    const response = await api.request('/auth/resend-verification', {
                        method: 'POST',
                        body: JSON.stringify({ email: user.email }),
                        skipAuth: true
                    });
                    showAlert(response.message || 'Verification email sent!', 'success');
                    btn.textContent = 'Sent!';
                } catch (err) {
                    showAlert(err.message || 'Failed to resend verification email', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Resend verification email';
                }
            });
        }
    } catch (error) {
        showAlert('Error loading profile', 'error');
    }
}

async function updateProfile() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;

    try {
        const response = await api.updateProfile({ username, email });
        
        // Update stored user data
        const user = JSON.parse(localStorage.getItem('user'));
        user.username = username;
        user.email = email;
        localStorage.setItem('user', JSON.stringify(user));
        
        showAlert('Profile updated successfully!', 'success');
        
        // Reload page to update header
        setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
        showAlert(error.message || 'Failed to update profile', 'error');
    }
}

async function updatePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showAlert('New passwords do not match', 'error');
        return;
    }

    try {
        await api.updatePassword({ currentPassword, newPassword });
        showAlert('Password updated successfully!', 'success');
        document.getElementById('passwordForm').reset();
    } catch (error) {
        showAlert(error.message || 'Failed to update password', 'error');
    }
}

async function loadUserReviews() {
    const container = document.getElementById('userReviewsList');
    
    try {
        const response = await api.getMyReviews();
        
        if (response.data.length === 0) {
            container.innerHTML = '<p class="empty-state">You haven\'t submitted any reviews yet.</p>';
            return;
        }

        container.innerHTML = response.data.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <h3>${review.title}</h3>
                    <span class="review-status status-${review.status}">${review.status}</span>
                </div>
                <div class="review-property">
                    <strong>${review.propertyName}</strong> - ${review.propertyAddress}
                </div>
                <div class="review-rating">
                    ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                </div>
                <p class="review-excerpt">${review.content.substring(0, 150)}...</p>
                <div class="review-meta">
                    <span>Submitted: ${new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="error">Failed to load reviews</p>';
    }
}

async function deleteAccount() {
    try {
        await api.deleteAccount();
        localStorage.clear();
        window.location.href = '/';
    } catch (error) {
        showAlert(error.message || 'Failed to delete account', 'error');
    }
}

function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    container.innerHTML = '';
    container.appendChild(alert);
    
    setTimeout(() => alert.remove(), 5000);
}
