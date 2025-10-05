// Campus Print System - Main JavaScript File

// Wait for page to load before doing anything
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    initializeFormValidation();
    
    if (document.getElementById('uploadArea')) {
        initializeFileUpload();
    }
    
    // Auto-dismiss alerts after 5 seconds
    setTimeout(function() {
        const alerts = document.querySelectorAll('.alert:not(.demo-credentials)');
        alerts.forEach(alert => {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
        });
    }, 5000);

}

// Form validation setup
function initializeFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    
    Array.prototype.slice.call(forms).forEach(function (form) {
        form.addEventListener('submit', function (event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
}

// File upload with drag and drop
function initializeFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadArea || !fileInput) return;
    
    uploadArea.addEventListener('dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('border-2');
    });
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!uploadArea.contains(e.relatedTarget)) {
            uploadArea.classList.remove('border-2');
        }
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('border-2');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });
}

// Validate and process selected file
function handleFileSelection(file) {
    const allowedTypes = ['application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 16 * 1024 * 1024; // 16MB
    
    if (!allowedTypes.includes(file.type)) {
        showAlert('Invalid file type. Please select PDF, DOC, or DOCX files only.', 'danger');
        return;
    }
    
    if (file.size > maxSize) {
        showAlert('File size too large. Maximum size is 16MB.', 'danger');
        return;
    }
    
    const fileName = document.getElementById('fileName');
    const fileInfo = document.getElementById('fileInfo');
    const uploadArea = document.getElementById('uploadArea');
    
    if (fileName && fileInfo && uploadArea) {
        fileName.textContent = file.name;
        uploadArea.classList.add('d-none');
        fileInfo.classList.remove('d-none');
        
        estimatePages(file);
    }
}

function estimatePages(file) {
    const pagesInput = document.getElementById('pages');
    if (!pagesInput) return;
    
    // Rough estimation: 1 page is about 50KB
    const estimatedPages = Math.max(1, Math.ceil(file.size / (50 * 1024)));
    pagesInput.value = Math.min(estimatedPages, 100);
    
    if (typeof updatePrice === 'function') {
        updatePrice();
    }
}

function clearFile() {
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const uploadArea = document.getElementById('uploadArea');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.classList.add('d-none');
    if (uploadArea) uploadArea.classList.remove('d-none');
}

// Calculate printing cost based on options
function calculatePrintCost(printType, pages, copies, doubleSided) {
    const pageRate = printType === 'bw' ? 5 : 20;
    let totalPages = pages * copies;
    
    if (doubleSided) {
        totalPages = Math.ceil(totalPages / 2);
    }
    
    return {
        totalPages,
        pageRate,
        totalCost: totalPages * pageRate
    };
}

// Display alert messages
function showAlert(message, type = 'info') {
    const alertContainer = document.querySelector('.container');
    if (!alertContainer) return;
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const navbar = document.querySelector('.navbar');
    if (navbar && navbar.nextSibling) {
        navbar.parentNode.insertBefore(alertDiv, navbar.nextSibling);
    } else {
        alertContainer.insertBefore(alertDiv, alertContainer.firstChild);
    }
    
    setTimeout(() => {
        const alert = new bootstrap.Alert(alertDiv);
        alert.close();
    }, 5000);
}

// Notification for admin actions
function showNotification(message, type = 'info') {
    const existingAlert = document.querySelector('.status-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} status-alert position-fixed top-0 start-50 translate-middle-x mt-3`;
    alert.style.zIndex = '9999';
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close ms-3" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

// Utility functions
function formatCurrency(amount) {
    return `₹${amount.toFixed(2)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function setLoadingState(element, loading = true) {
    if (loading) {
        element.classList.add('loading');
        element.disabled = true;
    } else {
        element.classList.remove('loading');
        element.disabled = false;
    }
}

function submitFormWithLoading(formId, submitBtnId) {
    const form = document.getElementById(formId);
    const submitBtn = document.getElementById(submitBtnId);
    
    if (!form || !submitBtn) return;
    
    form.addEventListener('submit', function(e) {
        setLoadingState(submitBtn, true);
        
        setTimeout(() => {
            setLoadingState(submitBtn, false);
        }, 3000);
    });
}

const statusColors = {
    pending: 'warning',
    printing: 'info',
    completed: 'success',
    cancelled: 'danger'
};

function getStatusBadge(status) {
    const color = statusColors[status] || 'secondary';
    return `<span class="badge bg-${color}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

function isMobile() {
    return window.innerWidth <= 768;
}

// Debounce for search inputs to avoid too many requests
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Admin Functions

function filterRequests(status) {
    const rows = document.querySelectorAll('#requestsTable tbody tr');
    
    rows.forEach(row => {
        if (status === 'all' || row.dataset.status === status) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Update request status using AJAX
function updateStatus(requestId, newStatus) {
    const statusMessages = {
        'pending': 'move back to pending',
        'printing': 'start printing',
        'completed': 'mark as completed', 
        'cancelled': 'cancel this request'
    };
    
    const statusIcons = {
        'pending': '⏳',
        'printing': '🖨️',
        'completed': '✅',
        'cancelled': '❌'
    };
    
    if (!confirm(`${statusIcons[newStatus]} Are you sure you want to ${statusMessages[newStatus]}?`)) {
        return;
    }
    
    showNotification('Updating status...', 'info');
    
    // Try JSON API first
    fetch('/api/update_request_status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            request_id: requestId,
            status: newStatus
        })
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (response.ok || response.status === 200) {
            showNotification(`${statusIcons[newStatus]} Status updated to ${newStatus} successfully!`, 'success');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            return response.text().then(text => {
                console.error('Server response:', text);
                submitFormDirectly(requestId, newStatus);
            });
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        submitFormDirectly(requestId, newStatus);
    });
}

// Fallback if AJAX fails
function submitFormDirectly(requestId, newStatus) {
    console.log('Using fallback form submission');
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/update_request_status';
    form.style.display = 'none';
    
    const requestIdInput = document.createElement('input');
    requestIdInput.type = 'hidden';
    requestIdInput.name = 'request_id';
    requestIdInput.value = requestId;
    
    const statusInput = document.createElement('input');
    statusInput.type = 'hidden';
    statusInput.name = 'status';
    statusInput.value = newStatus;
    
    const csrfToken = document.querySelector('input[name="csrf_token"]');
    if (csrfToken) {
        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrf_token';
        csrfInput.value = csrfToken.value;
        form.appendChild(csrfInput);
    }
    
    form.appendChild(requestIdInput);
    form.appendChild(statusInput);
    
    document.body.appendChild(form);
    form.submit();
}

// Show request details in modal
function viewDetails(requestId) {
    const rows = document.querySelectorAll('#requestsTable tbody tr');
    let targetRow = null;
    
    for (let row of rows) {
        const idCell = row.cells[0];
        if (idCell && idCell.textContent.trim() === '#' + requestId) {
            targetRow = row;
            break;
        }
    }
    
    if (targetRow) {
        const cells = targetRow.cells;
        const id = cells[0].textContent.trim();
        const user = cells[1].textContent.trim();
        
        const fileDiv = cells[2].querySelector('div.text-truncate');
        const file = fileDiv ? fileDiv.getAttribute('title') || fileDiv.textContent.trim() : 'N/A';
        
        const typeSpan = cells[3].querySelector('span.badge');
        const type = typeSpan ? typeSpan.textContent.trim() : 'N/A';
        
        const pages = cells[4].querySelector('span.fw-bold').textContent.trim();
        const copies = cells[5].querySelector('span.fw-bold').textContent.trim();
        const cost = cells[6].textContent.trim();
        
        const statusSpan = cells[7].querySelector('span.badge');
        const status = statusSpan ? statusSpan.textContent.trim().toLowerCase() : 'unknown';
        
        const dateDiv = cells[8].querySelector('div:first-child');
        const timeDiv = cells[8].querySelector('div.text-muted');
        const date = dateDiv ? dateDiv.textContent.trim() : 'N/A';
        const time = timeDiv ? timeDiv.textContent.trim() : '';
        
        const details = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-warning mb-3">Request Information</h6>
                    <p class="mb-2"><strong class="text-white">ID:</strong> <span class="text-muted">${id}</span></p>
                    <p class="mb-2"><strong class="text-white">User:</strong> <span class="text-muted">${user}</span></p>
                    <p class="mb-2"><strong class="text-white">File:</strong> <span class="text-muted">${file}</span></p>
                    <p class="mb-2"><strong class="text-white">Status:</strong> <span class="badge bg-${status === 'pending' ? 'warning' : status === 'printing' ? 'info' : status === 'completed' ? 'success' : 'danger'}">${status}</span></p>
                    <p class="mb-2"><strong class="text-white">Date:</strong> <span class="text-muted">${date} ${time}</span></p>
                </div>
                <div class="col-md-6">
                    <h6 class="text-warning mb-3">Print Details</h6>
                    <p class="mb-2"><strong class="text-white">Type:</strong> <span class="text-muted">${type}</span></p>
                    <p class="mb-2"><strong class="text-white">Pages:</strong> <span class="text-muted">${pages}</span></p>
                    <p class="mb-2"><strong class="text-white">Copies:</strong> <span class="text-muted">${copies}</span></p>
                    <p class="mb-2"><strong class="text-white">Total Cost:</strong> <span class="text-warning fw-bold">${cost}</span></p>
                </div>
            </div>
            <div class="row mt-4">
                <div class="col-12">
                    <div class="alert alert-info">
                        <i class="fas fa-shield-alt me-2"></i>
                        <strong>Admin Controls:</strong> You can change the status in any direction. If marked completed by mistake, you can revert back to printing or pending status.
                    </div>
                </div>
            </div>
        `;
        
        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
            modalBody.innerHTML = details;
            const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
            modal.show();
        }
    } else {
        showNotification('Request details not found. Request ID: ' + requestId, 'warning');
    }
}

// Make functions available globally
window.CampusPrint = {
    showAlert,
    showNotification,
    calculatePrintCost,
    formatCurrency,
    formatDate,
    setLoadingState,
    getStatusBadge,
    scrollToElement,
    isMobile,
    debounce,
    filterRequests,
    updateStatus,
    viewDetails
};