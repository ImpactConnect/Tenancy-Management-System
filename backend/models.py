from datetime import datetime
from backend import db

class Tenant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.String(200))
    work_place = db.Column(db.String(200))
    work_address = db.Column(db.String(200))
    next_of_kin_name = db.Column(db.String(200))
    next_of_kin_phone = db.Column(db.String(20))
    id_document = db.Column(db.String(200))  # Path to uploaded document
    monthly_rent = db.Column(db.Float, default=0.0)  # Add monthly rent amount
    start_date = db.Column(db.DateTime)  # Add occupancy start date
    duration_months = db.Column(db.Integer)  # Add duration in months
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    property_id = db.Column(db.Integer, db.ForeignKey('property.id'))
    lease_agreements = db.relationship('LeaseAgreement', backref='tenant', lazy=True)

class Property(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(50))  # apartment, house, etc.
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    landlord_id = db.Column(db.Integer, db.ForeignKey('landlord.id'))
    tenants = db.relationship('Tenant', backref='property', lazy=True)

class Landlord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    properties = db.relationship('Property', backref='landlord', lazy=True)

class LeaseAgreement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    rent_amount = db.Column(db.Float, nullable=False)
    payment_frequency = db.Column(db.String(20))  # annual or bi-annual
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20))  # active, expired, terminated
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'))
    payments = db.relationship('Payment', backref='lease_agreement', lazy=True)

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.DateTime, nullable=False)
    payment_type = db.Column(db.String(20))  # cash, bank transfer, etc.
    reference = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    lease_agreement_id = db.Column(db.Integer, db.ForeignKey('lease_agreement.id'))

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50))  # rent_expiry, payment_reminder, etc.
    message = db.Column(db.Text, nullable=False)
    sent_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)
    
    # Relationships
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id')) 