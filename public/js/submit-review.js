// Submit Review Page Logic

// Check if user is logged in
const currentUser = api.getCurrentUser();
if (!currentUser) {
    window.location.href = '/login';
}

// Show user menu
const userMenu = document.getElementById('userMenu');
if (userMenu && currentUser) {
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
}

// Show alert message
function showAlert(message, type = 'error') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Rating input handler
const ratingInput = document.getElementById('ratingInput');
const ratingValue = document.getElementById('rating');
const stars = ratingInput.querySelectorAll('.star');

stars.forEach(star => {
    star.addEventListener('click', () => {
        const rating = star.dataset.rating;
        ratingValue.value = rating;
        
        stars.forEach(s => {
            if (s.dataset.rating <= rating) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
    });
});

// File upload handler
const documentsInput = document.getElementById('documents');
const fileList = document.getElementById('fileList');

documentsInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file count
    if (files.length > 5) {
        showAlert('You can only upload up to 5 files');
        documentsInput.value = '';
        return;
    }
    
    // Validate file sizes
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
        showAlert('Some files exceed the 10MB size limit');
        documentsInput.value = '';
        return;
    }
    
    // Display file list
    fileList.innerHTML = files.map((file, index) => `
        <div class="file-item">
            <span class="file-name">${file.name}</span>
            <span class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
        </div>
    `).join('');
});

// Review form handler
const reviewForm = document.getElementById('reviewForm');
reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    
    // Validate rating
    if (!ratingValue.value) {
        showAlert('Please select a rating');
        return;
    }
    
    // Create FormData
    const formData = new FormData();
    formData.append('propertyName', document.getElementById('propertyName').value);
    formData.append('propertyAddress', document.getElementById('propertyAddress').value);
    formData.append('landlordName', document.getElementById('landlordName').value);
    formData.append('rating', ratingValue.value);
    formData.append('reviewTitle', document.getElementById('reviewTitle').value);
    formData.append('reviewContent', document.getElementById('reviewContent').value);
    
    // Add files
    const files = documentsInput.files;
    for (let i = 0; i < files.length; i++) {
        formData.append('documents', files[i]);
    }
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        await api.submitReview(formData);
        showAlert('Review submitted successfully! Our team will verify it shortly.', 'success');
        setTimeout(() => {
            window.location.href = '/my-reviews';
        }, 2000);
    } catch (error) {
        // Try to extract backend error message from multiple possible fields
        let msg = error?.message || error?.response?.message || error?.response?.error || 'Failed to submit review. Please try again.';
        // Custom error handling for known backend messages
        if (msg.includes('verify your email')) {
            msg = 'You need to verify your email before submitting a review.';
        } else if (msg.includes('at least 50 characters')) {
            msg = 'Your review description must be at least 50 characters.';
        } else if (msg.includes('cannot exceed 5000 characters')) {
            msg = 'Your review description cannot exceed 5000 characters.';
        } else if (msg.includes('Property name is required')) {
            msg = 'Property name is required.';
        } else if (msg.includes('Property address is required')) {
            msg = 'Property address is required.';
        } else if (msg.includes('Rating is required')) {
            msg = 'Please select a rating.';
        } else if (msg.includes('Review title is required')) {
            msg = 'Review title is required.';
        } else if (msg.includes('Review content is required')) {
            msg = 'Review description is required.';
        } else if (msg.includes('Title cannot exceed 100 characters')) {
            msg = 'Review title cannot exceed 100 characters.';
        } else if (msg.includes('Only .png, .jpg, .jpeg, and .pdf files are allowed')) {
            msg = 'Only .png, .jpg, .jpeg, and .pdf files are allowed for upload.';
        } else if (msg.includes('file size')) {
            msg = 'One or more files exceed the maximum allowed size (10MB).';
        } else if (msg.includes('Please provide all required fields')) {
            msg = 'Please fill in all required fields.';
        } else if (msg.includes('Account is not active')) {
            msg = 'Your account is not active. Please contact support.';
        } else if (msg.includes('Review must be at least 50 characters')) {
            msg = 'Your review description must be at least 50 characters.';
        }
        showAlert(msg);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
    }
});
