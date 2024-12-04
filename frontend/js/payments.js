async function loadPayments() {
    const mainContent = document.getElementById('main-content');
    
    mainContent.innerHTML = `
        <div class="payments-page">
            <div class="page-header">
                <h1>Payment Management</h1>
                <button class="btn btn-primary" onclick="showAddPaymentModal()">
                    <i class="fas fa-plus"></i> Record New Payment
                </button>
            </div>

            <!-- Payment Statistics -->
            <div class="stats-grid mb-2">
                <div class="card">
                    <div class="card-body">
                        <h4>Total Collections</h4>
                        <div class="stat-value" id="totalCollections">Loading...</div>
                        <div class="stat-label">Current Year</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <h4>Outstanding Payments</h4>
                        <div class="stat-value text-danger" id="outstandingPayments">Loading...</div>
                        <div class="stat-label">Total Due</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <h4>Payment Status</h4>
                        <div class="stat-value" id="paymentStatus">
                            <span class="text-success" id="paidCount">0</span> /
                            <span class="text-danger" id="unpaidCount">0</span>
                        </div>
                        <div class="stat-label">Paid/Unpaid Tenants</div>
                    </div>
                </div>
            </div>

            <!-- Payment Records -->
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h3>Payment Records</h3>
                        <div class="d-flex gap-2">
                            <div class="search-box">
                                <input type="text" id="paymentSearch" class="form-control" 
                                    placeholder="Search payments..." onkeyup="searchPayments()">
                            </div>
                            <select id="paymentFilter" class="form-control" onchange="filterPayments()">
                                <option value="all">All Payments</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="overdue">Overdue</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Tenant</th>
                                    <th>Property</th>
                                    <th>Amount</th>
                                    <th>Payment Type</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="paymentsList">
                                <!-- Payments will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add/Edit Payment Modal -->
        <div id="paymentModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closePaymentModal()">&times;</span>
                <h2 id="modalTitle">Record New Payment</h2>
                <form id="paymentForm" onsubmit="handlePaymentSubmit(event)">
                    <div class="form-group">
                        <label for="tenantSelect">Select Tenant</label>
                        <select id="tenantSelect" class="form-control" required onchange="updateTenantDetails()">
                            <option value="">Select Tenant</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="propertyInfo">Property</label>
                        <input type="text" id="propertyInfo" class="form-control" readonly>
                    </div>
                    <div class="form-group">
                        <label for="rentDue">Rent Due</label>
                        <input type="text" id="rentDue" class="form-control" readonly>
                    </div>
                    <div class="form-group">
                        <label for="paymentAmount">Payment Amount</label>
                        <input type="number" id="paymentAmount" class="form-control" required 
                            step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label for="paymentDate">Payment Date</label>
                        <input type="date" id="paymentDate" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="paymentType">Payment Type</label>
                        <select id="paymentType" class="form-control" required>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="check">Check</option>
                            <option value="online">Online Payment</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="reference">Reference Number</label>
                        <input type="text" id="reference" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="notes">Notes</label>
                        <textarea id="notes" class="form-control" rows="3"></textarea>
                    </div>
                    <input type="hidden" id="paymentId">
                    <button type="submit" class="btn btn-primary">Save Payment</button>
                </form>
            </div>
        </div>

        <!-- Payment Receipt Modal -->
        <div id="receiptModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeReceiptModal()">&times;</span>
                <div id="receiptContent">
                    <!-- Receipt content will be loaded here -->
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="printReceipt()">
                        <i class="fas fa-print"></i> Print Receipt
                    </button>
                    <button class="btn btn-success" onclick="emailReceipt()">
                        <i class="fas fa-envelope"></i> Email Receipt
                    </button>
                </div>
            </div>
        </div>
    `;

    // Load initial data
    await loadPaymentsList();
    await loadPaymentStatistics();
}

// Load payments list
async function loadPaymentsList() {
    try {
        const response = await axios.get('/payments');
        const payments = response.data;
        
        const tbody = document.getElementById('paymentsList');
        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>${formatDate(payment.payment_date)}</td>
                <td>${payment.tenant_name}</td>
                <td>${payment.property_name}</td>
                <td>${formatCurrency(payment.amount)}</td>
                <td>${formatPaymentType(payment.payment_type)}</td>
                <td>
                    <span class="badge ${getPaymentStatusClass(payment.status)}">
                        ${payment.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info" 
                            onclick="viewReceipt(${payment.id})"
                            aria-label="View receipt">
                            <i class="fas fa-receipt"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" 
                            onclick="editPayment(${payment.id})"
                            aria-label="Edit payment">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" 
                            onclick="deletePayment(${payment.id})"
                            aria-label="Delete payment">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showError('Error loading payments: ' + error.message);
    }
}

// Load payment statistics
async function loadPaymentStatistics() {
    try {
        const response = await axios.get('/payments/statistics');
        const stats = response.data;
        
        document.getElementById('totalCollections').textContent = 
            formatCurrency(stats.total_collections);
        document.getElementById('outstandingPayments').textContent = 
            formatCurrency(stats.outstanding_payments);
        document.getElementById('paidCount').textContent = stats.paid_tenants;
        document.getElementById('unpaidCount').textContent = stats.unpaid_tenants;
    } catch (error) {
        console.error('Error loading payment statistics:', error);
    }
}

// Load tenants for select dropdown
async function loadTenantsForSelect() {
    try {
        const response = await axios.get('/api/tenants');
        const tenants = response.data;
        
        const select = document.getElementById('tenantSelect');
        if (!select) {
            console.error('Tenant select element not found');
            return;
        }

        select.innerHTML = `
            <option value="">Select Tenant</option>
            ${tenants.map(tenant => `
                <option value="${tenant.id}">
                    ${tenant.first_name} ${tenant.last_name}
                    ${tenant.property ? ` - ${tenant.property.name}` : ''}
                </option>
            `).join('')}
        `;
    } catch (error) {
        console.error('Error loading tenants:', error);
        showError('Error loading tenants: ' + error.message);
    }
}

// Update payment details when tenant is selected
async function updatePaymentDetails() {
    const tenantId = document.getElementById('tenantId').value;
    if (!tenantId) return;
    
    try {
        const response = await axios.get(`/tenants/${tenantId}/payment-details`);
        const details = response.data;
        
        document.getElementById('propertyInfo').value = details.property_name;
        document.getElementById('rentDue').value = formatCurrency(details.rent_due);
        document.getElementById('paymentAmount').value = details.rent_due;
    } catch (error) {
        console.error('Error loading tenant payment details:', error);
    }
}

// Modal handling
function showAddPaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        // Reset form
        const form = document.getElementById('paymentForm');
        if (form) form.reset();

        // Clear display fields
        const propertyDisplay = document.getElementById('propertyDisplay');
        if (propertyDisplay) propertyDisplay.value = '';
        
        const rentDueDisplay = document.getElementById('rentDueDisplay');
        if (rentDueDisplay) rentDueDisplay.value = '';

        // Load tenants before showing modal
        loadTenantsForSelect();
        
        // Show modal
        modal.style.display = 'block';
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function closeReceiptModal() {
    document.getElementById('receiptModal').style.display = 'none';
}

// Form handling
async function handlePaymentSubmit(event) {
    event.preventDefault();
    
    const leaseId = document.getElementById('leaseId')?.value;
    if (!leaseId) {
        showError('No active lease found for this tenant');
        return;
    }

    // Get form values with null checks
    const amount = document.getElementById('paymentAmount')?.value;
    const paymentType = document.getElementById('paymentType')?.value;
    const reference = document.getElementById('reference')?.value;

    // Validate required fields
    if (!amount) {
        showError('Payment amount is required');
        return;
    }

    if (!paymentType) {
        showError('Payment type is required');
        return;
    }

    const paymentData = {
        lease_agreement_id: leaseId,
        amount: parseFloat(amount),
        payment_type: paymentType,
        reference: reference || ''
    };

    try {
        const response = await axios.post('/api/payments/record', paymentData);
        if (response.data.message) {
            showSuccess('Payment recorded successfully');
            closePaymentModal();
            await loadPaymentsList();
            await loadPaymentStatistics(); // Refresh statistics after payment
        }
    } catch (error) {
        console.error('Error saving payment:', error);
        showError('Error saving payment: ' + (error.response?.data?.error || error.message));
    }
}

// Payment actions
async function editPayment(paymentId) {
    try {
        const response = await axios.get(`/payments/${paymentId}`);
        const payment = response.data;
        
        document.getElementById('modalTitle').textContent = 'Edit Payment';
        document.getElementById('tenantId').value = payment.tenant_id;
        await updatePaymentDetails();
        document.getElementById('paymentAmount').value = payment.amount;
        document.getElementById('paymentDate').value = payment.payment_date.split('T')[0];
        document.getElementById('paymentType').value = payment.payment_type;
        document.getElementById('reference').value = payment.reference;
        document.getElementById('notes').value = payment.notes;
        document.getElementById('paymentId').value = payment.id;
        
        document.getElementById('paymentModal').style.display = 'block';
    } catch (error) {
        showError('Error loading payment details: ' + error.message);
    }
}

async function deletePayment(paymentId) {
    if (confirm('Are you sure you want to delete this payment?')) {
        try {
            await axios.delete(`/payments/${paymentId}`);
            await loadPaymentsList();
            await loadPaymentStatistics();
        } catch (error) {
            showError('Error deleting payment: ' + error.message);
        }
    }
}

async function viewReceipt(paymentId) {
    try {
        const response = await axios.get(`/payments/${paymentId}/receipt`);
        const receipt = response.data;
        
        document.getElementById('receiptContent').innerHTML = `
            <div class="receipt">
                <h2>Payment Receipt</h2>
                <div class="receipt-details">
                    <p><strong>Receipt No:</strong> ${receipt.receipt_number}</p>
                    <p><strong>Date:</strong> ${formatDate(receipt.payment_date)}</p>
                    <p><strong>Tenant:</strong> ${receipt.tenant_name}</p>
                    <p><strong>Property:</strong> ${receipt.property_name}</p>
                    <p><strong>Amount:</strong> ${formatCurrency(receipt.amount)}</p>
                    <p><strong>Payment Type:</strong> ${formatPaymentType(receipt.payment_type)}</p>
                    <p><strong>Reference:</strong> ${receipt.reference || 'N/A'}</p>
                </div>
            </div>
        `;
        
        document.getElementById('receiptModal').style.display = 'block';
    } catch (error) {
        showError('Error loading receipt: ' + error.message);
    }
}

// Receipt actions
function printReceipt() {
    const receiptWindow = window.open('', '_blank');
    receiptWindow.document.write(`
        <html>
            <head>
                <title>Payment Receipt</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .receipt { max-width: 800px; margin: 0 auto; }
                </style>
            </head>
            <body>
                ${document.getElementById('receiptContent').innerHTML}
            </body>
        </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
}

async function emailReceipt() {
    const paymentId = document.querySelector('#receiptContent [data-payment-id]').dataset.paymentId;
    try {
        await axios.post(`/payments/${paymentId}/email-receipt`);
        showSuccess('Receipt sent successfully');
    } catch (error) {
        showError('Error sending receipt: ' + error.message);
    }
}

// Utility functions
function formatPaymentType(type) {
    return type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function getPaymentStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'completed':
            return 'badge-success';
        case 'pending':
            return 'badge-warning';
        case 'overdue':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
}

function searchPayments() {
    const searchTerm = document.getElementById('paymentSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#paymentsList tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

async function filterPayments() {
    const filter = document.getElementById('paymentFilter').value;
    try {
        const response = await axios.get(`/payments?status=${filter}`);
        const payments = response.data;
        await loadPaymentsList(payments);
    } catch (error) {
        showError('Error filtering payments: ' + error.message);
    }
}

// Add this function to update tenant details when selected
async function updateTenantDetails() {
    const tenantId = document.getElementById('tenantSelect').value;
    if (!tenantId) return;

    try {
        const response = await axios.get(`/api/tenants/${tenantId}/payment-info`);
        const data = response.data;
        
        // Get elements using the correct IDs from the form
        const propertyInfo = document.getElementById('propertyInfo');
        const rentDue = document.getElementById('rentDue');
        const paymentAmount = document.getElementById('paymentAmount');
        const leaseIdInput = document.getElementById('leaseId');
        
        // Update the display fields with null checks
        if (propertyInfo) propertyInfo.value = data.property;
        if (rentDue) rentDue.value = formatCurrency(data.monthly_rent);
        if (paymentAmount) paymentAmount.value = data.monthly_rent;
        
        // Handle lease information
        if (data.has_active_lease) {
            if (leaseIdInput) leaseIdInput.value = data.lease_id;
            // Enable the submit button
            const submitButton = document.querySelector('#paymentForm button[type="submit"]');
            if (submitButton) submitButton.disabled = false;
        } else {
            showError('Unable to create lease agreement. Please ensure tenant has rent amount and start date set.');
            // Disable the submit button
            const submitButton = document.querySelector('#paymentForm button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
        }
    } catch (error) {
        console.error('Error fetching tenant details:', error);
        showError('Error loading tenant details: ' + error.message);
    }
}

// Add the loadTenantsForSelect function if not already present
async function loadTenantsForSelect() {
    try {
        const response = await axios.get('/api/tenants');
        const tenants = response.data;
        
        const select = document.getElementById('tenantSelect');
        if (select) {
            select.innerHTML = `
                <option value="">Select a tenant</option>
                ${tenants.map(tenant => `
                    <option value="${tenant.id}">
                        ${tenant.first_name} ${tenant.last_name}
                        ${tenant.property ? ` - ${tenant.property.name}` : ''}
                    </option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading tenants:', error);
        showError('Error loading tenants: ' + error.message);
    }
} 