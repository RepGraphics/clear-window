// Reviews Page Logic

let currentPage = 1;
const limit = 10;

// Show user menu if logged in
const currentUser = api.getCurrentUser();
const userMenu = document.getElementById('userMenu');
if (userMenu) {
    if (currentUser) {
        userMenu.innerHTML = `
            <div class="user-dropdown">
                <button class="user-btn">${currentUser.username}</button>
                <div class="user-dropdown-content">
                    <a href="/my-reviews">My Reviews</a>
                    ${currentUser.role === 'admin' ? '<a href="/admin-dashboard">Admin Dashboard</a>' : ''}
                    <a href="#" id="logoutBtn">Logout</a>
                </div>
            </div>
        `;
        
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            api.logout();
        });
    } else {
        userMenu.innerHTML = `
            <a href="/login" class="btn-secondary">Sign In</a>
            <a href="/signup" class="btn-primary">Get Started</a>
        `;
    }
}

// Load reviews
async function loadReviews(page = 1) {
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = '<div class="loading">Loading reviews...</div>';
    
    try {
        const data = await api.getPublishedReviews(page, limit);
        
        if (data.reviews.length === 0) {
            container.innerHTML = '<div class="no-results">No reviews found</div>';
            return;
        }
        
        container.innerHTML = data.reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <div class="review-property">
                        <h3>${review.propertyName}</h3>
                        <!-- Address hidden for privacy -->
                        ${review.landlordName ? `<p class="review-landlord">${review.landlordName}</p>` : ''}
                    </div>
                    <div class="review-rating">
                        <div class="stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                        <span class="verified-badge">✓ Verified</span>
                    </div>
                </div>
                <div class="review-content">
                    <h4>${review.reviewTitle}</h4>
                    <p>${review.reviewContent}</p>
                </div>
                <div class="review-footer">
                    <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
                    <span class="review-weight">Weight: ${review.weightingScore || 1.0}</span>
                </div>
            </div>
        `).join('');
        
        // Update pagination
        updatePagination(data.currentPage, data.totalPages);
        
    } catch (error) {
        container.innerHTML = '<div class="error">Failed to load reviews</div>';
        console.error('Error loading reviews:', error);
    }
}

// Update pagination
function updatePagination(current, total) {
    const pagination = document.getElementById('pagination');
    
    if (total <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    if (current > 1) {
        html += `<button class="page-btn" onclick="changePage(${current - 1})">Previous</button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= total; i++) {
        if (i === current) {
            html += `<button class="page-btn active">${i}</button>`;
        } else if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
            html += `<button class="page-btn" onclick="changePage(${i})">${i}</button>`;
        } else if (i === current - 3 || i === current + 3) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    // Next button
    if (current < total) {
        html += `<button class="page-btn" onclick="changePage(${current + 1})">Next</button>`;
    }
    
    pagination.innerHTML = html;
}

// Change page
function changePage(page) {
    currentPage = page;
    loadReviews(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Search functionality
const searchInput = document.getElementById('searchInput');
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        // In a real implementation, you'd filter reviews by search term
        // For now, just reload
        loadReviews(1);
    }, 500);
});

// Initial load
loadReviews(1);
