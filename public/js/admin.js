// Global admin action refresh function
function adminActionRefresh() {
    window.location.reload();
}
// Manually verify user email from admin dashboard (global scope)
async function manuallyVerifyEmail(userId, btn) {
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    try {
        const response = await api.request(`/admin/users/${userId}/verify-email`, {
            method: 'PATCH'
        });
        showAlert(response.message || 'User email verified!', 'success');
        btn.textContent = 'Verified!';
        setTimeout(loadUsers, 1000);
    } catch (err) {
        showAlert(err.message || 'Failed to verify email', 'error');
        btn.disabled = false;
        btn.textContent = 'Manually Verify Email';
    }
}
// Global cache for all reviews
let allReviewsCache = [];

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}


document.addEventListener('DOMContentLoaded', () => {
        // Force All Reviews tab to be active on page load
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const allReviewsBtn = document.querySelector('.tab-btn[data-tab="all-reviews"]');
        const allReviewsTab = document.getElementById('all-reviews-tab');
        if (allReviewsBtn) allReviewsBtn.classList.add('active');
        if (allReviewsTab) allReviewsTab.classList.add('active');
    // Attach all event listeners synchronously
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const tabName = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            if (tabName === 'reviews') {
                await loadPendingReviews();
                await loadStats();
            } else if (tabName === 'users') {
                await loadUsers();
                await loadStats();
            } else if (tabName === 'all-reviews') {
                const statusFilter = document.getElementById('statusFilter');
                if (statusFilter) statusFilter.value = '';
                await loadAllReviews();
                await loadStats();
            }
        });
    });

    document.getElementById('reviewSearch').addEventListener('input', debounce(searchPendingReviews, 300));
    document.getElementById('userSearch').addEventListener('input', debounce(searchUsers, 300));
    document.getElementById('allReviewsSearch').addEventListener('input', debounce(searchAllReviews, 300));
    document.getElementById('statusFilter').addEventListener('change', searchAllReviews);

    document.getElementById('closeReviewModal').addEventListener('click', () => {
        document.getElementById('reviewModal').classList.remove('show');
    });
    document.getElementById('closeUserModal').addEventListener('click', () => {
        document.getElementById('userModal').classList.remove('show');
    });

    // Now run async logic
    (async function() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'admin') {
            window.location.href = '/';
            return;
        }
        await loadStats();
        await loadPendingReviews();
        // Load users if users tab is active
        const savedTab = localStorage.getItem('adminTab') || 'reviews';
        if (savedTab === 'users') {
            await loadUsers();
        }
        // Always load all reviews for all-reviews tab
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) statusFilter.value = '';
        await loadAllReviews();
    })();
});

async function loadStats() {
    try {
        const response = await api.getAdminStats();
        const stats = response.stats;
        document.getElementById('totalUsers').textContent = stats.users.total || 0;
        document.getElementById('totalReviews').textContent = stats.reviews.total || 0;
        document.getElementById('pendingReviews').textContent = stats.reviews.pending || 0;
        document.getElementById('verifiedReviews').textContent = stats.reviews.published || 0;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

async function loadPendingReviews() {
    const container = document.getElementById('pendingReviewsList');
    
    try {
        const response = await api.getPendingReviews();
        const reviews = response.reviews || response.data || [];
        if (!reviews.length) {
            container.innerHTML = '<p class="empty-state">Nothing to show</p>';
            return;
        }
        container.innerHTML = reviews.map(review => `
            <div class="admin-card" data-id="${review._id}">
                <div class="admin-card-header">
                    <div>
                        <h3>${review.reviewTitle || review.title || ''}</h3>
                        <p class="property-info">${review.propertyName} - ${review.propertyAddress}</p>
                    </div>
                    <div class="rating">
                        ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                    </div>
                </div>
                <p class="review-excerpt">${(review.reviewContent || review.content || '').substring(0, 200)}...</p>
                <div class="admin-card-footer">
                    <span class="meta">Submitted: ${new Date(review.createdAt).toLocaleDateString()}</span>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="viewReview('${review._id}')">View Details</button>
                        <button class="btn btn-sm btn-success" onclick="approveReview('${review._id}')">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="rejectReview('${review._id}')">Reject</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="empty-state">Nothing to show</p>';
    }
}

async function loadUsers() {
    const container = document.getElementById('usersList');
    container.innerHTML = '<div class="loading">Loading users...</div>';
    
    try {
        const response = await api.getAllUsers();
        const users = response.users || response.data || [];
        if (!users.length) {
            container.innerHTML = '<p class="empty-state">Nothing to show</p>';
            return;
        }
        container.innerHTML = users.map(user => `
            <div class="admin-card" data-id="${user._id}">
                <div class="admin-card-header">
                    <div>
                        <h3>${user.username}</h3>
                        <p class="user-email">${user.email}</p>
                    </div>
                    <span class="badge badge-${user.role}">${user.role}</span>
                </div>
                <div class="user-meta">
                    <span>Status: <strong>${user.accountStatus}</strong></span>
                    <span>Email Verified: ${user.isEmailVerified ? '✓' : '✗'}</span>
                    <span>Joined: ${new Date(user.createdAt).toLocaleDateString()}</span>
                    ${user.lastLogin ? `<span>Last Login: ${new Date(user.lastLogin).toLocaleDateString()}</span>` : ''}
                </div>
                <div class="admin-card-footer">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="viewUser('${user._id}')">View Details</button>
                        ${user.accountStatus === 'active' 
                            ? `<button class="btn btn-sm btn-warning" onclick="suspendUser('${user._id}')">Suspend</button>`
                            : `<button class="btn btn-sm btn-success" onclick="activateUser('${user._id}')">Activate</button>`
                        }
                        ${user.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser('${user._id}')">Delete</button>` : ''}
                        ${!user.isEmailVerified ? `<button class="btn btn-sm btn-info" onclick="manuallyVerifyEmail('${user._id}', this)">Manually Verify Email</button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="empty-state">Nothing to show</p>';
    }
}

async function loadAllReviews() {
    const container = document.getElementById('allReviewsList');
    container.innerHTML = '<div class="loading">Loading reviews...</div>';
    try {
        const response = await api.getAllReviews();
        console.log('All Reviews API response:', response);
        allReviewsCache = response.reviews || response.data || [];
        console.log('allReviewsCache:', allReviewsCache);
        filterAndRenderAllReviews();
    } catch (error) {
        container.innerHTML = '<p class="empty-state">Nothing to show</p>';
    }
}

async function viewReview(reviewId) {
    const modal = document.getElementById('reviewModal');
    const content = document.getElementById('reviewModalContent');
    
    try {
        const response = await api.getReviewById(reviewId);
        const review = response.review;

        content.innerHTML = `
            <div class="review-detail">
                <div class="detail-header">
                    <h2>${review.reviewTitle || review.title || '(No Title)'}</h2>
                    <span class="badge badge-${review.status}">${review.status || ''}</span>
                </div>
                <div class="detail-section">
                    <h4>Property Information</h4>
                    <p><strong>Name:</strong> ${review.propertyName || '(No Name)'}</p>
                    <p><strong>Address:</strong> ${review.propertyAddress || '(No Address)'}</p>
                    ${review.landlordName ? `<p><strong>Landlord:</strong> ${review.landlordName}</p>` : ''}
                </div>
                <div class="detail-section">
                    <h4>Rating</h4>
                    <div class="rating-large">${review.rating ? '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating) : '(No Rating)'}</div>
                </div>
                <div class="detail-section">
                    <h4>Review Content</h4>
                    <p>${review.reviewContent || review.content || '(No Content)'}</p>
                </div>
                ${review.verificationDocuments && review.verificationDocuments.length > 0 ? `
                <div class="detail-section">
                    <h4>Verification Documents</h4>
                    <div class="document-list">
                        ${review.verificationDocuments.map(doc => `
                            <a href="/uploads/${doc.filename}" target="_blank" class="document-link">View Document</a>
                            <img src="/uploads/${doc.filename}" alt="Verification Document" style="max-width: 200px; display: block; margin-top: 8px;" />
                        `).join('')}
                    </div>
                </div>` : ''}
                <div class="detail-section">
                    <h4>Metadata</h4>
                    <p><strong>Submitted:</strong> ${review.createdAt ? new Date(review.createdAt).toLocaleString() : '(No Date)'}</p>
                    <p><strong>Review ID:</strong> ${review._id || '(No ID)'}</p>
                </div>
                ${review.status === 'pending_verification' ? `
                <div class="modal-actions">
                    <button class="btn btn-success" onclick="approveReview('${review._id}')">Approve Review</button>
                    <button class="btn btn-danger" onclick="rejectReview('${review._id}')">Reject Review</button>
                </div>` : ''}
            </div>
        `;
        
        modal.classList.add('show');
    } catch (error) {
        showAlert('Failed to load review details', 'error');
    }
}

async function viewUser(userId) {
    const modal = document.getElementById('userModal');
    const content = document.getElementById('userModalContent');
    console.log('[ViewUser] Clicked for userId:', userId);
    try {
        const response = await api.getUserById(userId);
        const user = response.user || response;
        console.log('[ViewUser] User loaded:', user);
        content.innerHTML = `
            <div class="user-detail">
                <h3>${user.username || '(No Username)'}</h3>
                <p><strong>Email:</strong> ${user.email || '(No Email)'}</p>
                <p><strong>Role:</strong> ${user.role || '(No Role)'}</p>
                <p><strong>Status:</strong> ${user.accountStatus || '(No Status)'}</p>
                <p><strong>Email Verified:</strong> ${user.isEmailVerified ? 'Yes' : 'No'}</p>
                <p><strong>Joined:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleString() : '(No Date)'}</p>
                ${user.lastLogin ? `<p><strong>Last Login:</strong> ${new Date(user.lastLogin).toLocaleString()}</p>` : ''}
            </div>
        `;
        modal.classList.add('show');
    } catch (error) {
        console.error('[ViewUser] Error loading user:', error);
        content.innerHTML = `<div style="padding:32px; text-align:center; color:#ef4444; font-weight:700;">Failed to load user details.</div>`;
        modal.classList.add('show');
        showAlert('Failed to load user details', 'error');
    }
}

async function approveReview(reviewId) {
    if (!confirm('Approve this review?')) return;
    
    try {
        await api.approveReview(reviewId);
        showAlert('Review approved successfully', 'success');
        adminActionRefresh();
    } catch (error) {
        showAlert(error.message || 'Failed to approve review', 'error');
    }
}

async function rejectReview(reviewId) {
    if (!confirm('Reject this review?')) return;
    
    try {
        await api.rejectReview(reviewId);
        showAlert('Review rejected', 'success');
        adminActionRefresh();
    } catch (error) {
        showAlert(error.message || 'Failed to reject review', 'error');
    }
}

async function suspendUser(userId) {
    if (!confirm('Suspend this user?')) return;
    
    try {
        await api.suspendUser(userId);
        showAlert('User suspended', 'success');
        adminActionRefresh();
    } catch (error) {
        showAlert(error.message || 'Failed to suspend user', 'error');
    }
}

async function activateUser(userId) {
    try {
        await api.activateUser(userId);
        showAlert('User activated', 'success');
        adminActionRefresh();
    } catch (error) {
        showAlert(error.message || 'Failed to activate user', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return;
    
    try {
        await api.deleteUserAsAdmin(userId);
        showAlert('User deleted', 'success');
        adminActionRefresh();
    } catch (error) {
        showAlert(error.message || 'Failed to delete user', 'error');
    }
}

function searchPendingReviews() {
    const query = document.getElementById('reviewSearch').value.toLowerCase();
    const cards = document.querySelectorAll('#pendingReviewsList .admin-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? 'block' : 'none';
    });
}

function searchUsers() {
    const query = document.getElementById('userSearch').value.toLowerCase();
    const cards = document.querySelectorAll('#usersList .admin-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? 'block' : 'none';
    });
}

function searchAllReviews() {
    filterAndRenderAllReviews();
function filterAndRenderAllReviews() {
    const container = document.getElementById('allReviewsList');
    const status = document.getElementById('statusFilter').value;
    // Map UI filter values to backend status values
    const statusMap = {
        approved: 'published',
        pending: 'pending_verification',
        rejected: 'rejected'
    };
    const backendStatus = statusMap[status] || status;
    const query = document.getElementById('allReviewsSearch').value.toLowerCase();
    let filtered = allReviewsCache;
    // Only filter by status if a specific status is selected
    if (status && backendStatus) {
        filtered = filtered.filter(r => r.status === backendStatus);
    }
    if (query) {
        filtered = filtered.filter(r => {
            const text = `${r.reviewTitle || r.title || ''} ${r.propertyName || ''} ${r.propertyAddress || ''} ${r.landlordName || ''} ${(r.reviewContent || r.content || '')}`.toLowerCase();
            return text.includes(query);
        });
    }
    if (!filtered.length) {
        container.innerHTML = '<p class="empty-state">Nothing to show</p>';
        return;
    }
    container.innerHTML = filtered.map(review => `
        <div class="admin-card" data-id="${review._id}">
            <div class="admin-card-header">
                <div>
                    <h3>${review.reviewTitle || review.title || '(No Title)'}</h3>
                    <p class="property-info">${review.propertyName || ''}${review.propertyAddress ? ' - ' + review.propertyAddress : ''}${review.landlordName ? ' | Landlord: ' + review.landlordName : ''}</p>
                </div>
                <span class="badge badge-${review.status}">${review.status}</span>
            </div>
            <p class="review-excerpt">${(review.reviewContent || review.content || '').substring(0, 150)}...</p>
            <div class="admin-card-footer">
                <span class="meta">${new Date(review.createdAt).toLocaleDateString()}</span>
                ${review.reviewedBy && review.reviewedBy.username ? `<span class="meta">Reviewed by: ${review.reviewedBy.username}</span>` : ''}
                <button class="btn btn-sm btn-secondary" onclick="viewReview('${review._id}')">View</button>
                <button class="btn btn-sm btn-danger" onclick="deleteReview('${review._id}')">Delete</button>
            </div>
        </div>
    `).join('');
}
}
// End of filterAndRenderAllReviews
// Delete review from All Reviews tab
async function deleteReview(reviewId) {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    try {
        await api.deleteReview(reviewId);
        showAlert('Review deleted', 'success');
        adminActionRefresh();
    } catch (error) {
        showAlert(error.message || 'Failed to delete review', 'error');
    }
}