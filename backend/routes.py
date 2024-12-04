from flask import Blueprint, jsonify, request, current_app, url_for
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import os
from .models import db, Tenant, Property, Landlord, LeaseAgreement, Payment, Notification
from .utils.document_generator import DocumentGenerator
from .utils.notification_manager import NotificationManager
from .utils.payment_manager import PaymentManager
from flask_mail import Mail
from sqlalchemy import func

main = Blueprint('main', __name__, url_prefix='/api')

# Initialize utilities
mail = Mail()
document_generator = DocumentGenerator(os.path.join(os.path.dirname(__file__), 'templates'))
notification_manager = NotificationManager(mail, current_app)
payment_manager = PaymentManager(notification_manager)

# Helper function for file uploads
def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Add this route at the top after the Blueprint definition
@main.route('/routes', methods=['GET'])
def list_routes():
    routes = []
    for rule in current_app.url_map.iter_rules():
        if rule.endpoint.startswith('main.'):
            routes.append({
                'endpoint': rule.endpoint,
                'methods': list(rule.methods),
                'path': str(rule)
            })
    return jsonify(routes)

# Dashboard routes
@main.route('/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    try:
        # Get tenant statistics
        total_tenants = Tenant.query.count()
        
        # Get active leases count
        active_leases_count = LeaseAgreement.query.filter_by(status='active').count()
        
        # Get expiring leases count
        expiring_leases_count = LeaseAgreement.query.filter(
            LeaseAgreement.status == 'active',
            LeaseAgreement.end_date <= (datetime.now() + timedelta(days=90))
        ).count()

        # Get payment statistics
        total_collected = db.session.query(func.sum(Payment.amount)).scalar() or 0
        
        # Calculate outstanding payments
        total_outstanding = 0
        tenants_outstanding = 0
        
        # Query active leases and calculate outstanding amounts
        active_lease_records = db.session.query(
            LeaseAgreement.id,
            LeaseAgreement.rent_amount,
            func.coalesce(func.sum(Payment.amount), 0).label('total_paid')
        ).outerjoin(
            Payment
        ).filter(
            LeaseAgreement.status == 'active'
        ).group_by(
            LeaseAgreement.id
        ).all()

        for lease_record in active_lease_records:
            if lease_record.total_paid < lease_record.rent_amount:
                total_outstanding += (lease_record.rent_amount - lease_record.total_paid)
                tenants_outstanding += 1

        # Get property statistics
        total_properties = Property.query.count()
        occupied_properties = Property.query.filter(Property.tenants.any()).count()
        vacant_properties = total_properties - occupied_properties

        return jsonify({
            'tenant_stats': {
                'total_tenants': total_tenants,
                'active_leases': active_leases_count,
                'expiring_soon': expiring_leases_count
            },
            'payment_stats': {
                'total_collected': float(total_collected),
                'total_outstanding': float(total_outstanding),
                'tenants_outstanding': tenants_outstanding
            },
            'property_stats': {
                'total_properties': total_properties,
                'occupied_units': occupied_properties,
                'vacant_units': vacant_properties
            }
        })
    except Exception as e:
        print(f"Error getting dashboard stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main.route('/activities/recent', methods=['GET'])
def get_recent_activities():
    try:
        # Get recent payments
        recent_payments = Payment.query.order_by(Payment.payment_date.desc()).limit(5).all()
        
        # Get recent lease agreements
        recent_leases = LeaseAgreement.query.order_by(LeaseAgreement.created_at.desc()).limit(5).all()
        
        activities = []
        
        # Add payment activities
        for payment in recent_payments:
            tenant = payment.lease_agreement.tenant
            activities.append({
                'date': payment.payment_date.strftime('%Y-%m-%d'),
                'tenant_name': f"{tenant.first_name} {tenant.last_name}",
                'description': f"Payment of {formatCurrency(payment.amount)} received",
                'status': 'completed',
                'type': 'payment'
            })
            
        # Add lease activities
        for lease in recent_leases:
            activities.append({
                'date': lease.created_at.strftime('%Y-%m-%d'),
                'tenant_name': f"{lease.tenant.first_name} {lease.tenant.last_name}",
                'description': f"New lease agreement created",
                'status': lease.status,
                'type': 'lease'
            })
            
        # Sort activities by date
        activities.sort(key=lambda x: x['date'], reverse=True)
        
        return jsonify(activities[:10])  # Return most recent 10 activities
    except Exception as e:
        print(f"Error getting recent activities: {str(e)}")
        return jsonify({'error': str(e)}), 500

def formatCurrency(amount):
    return f"₦{amount:,.2f}"

# Tenant routes
@main.route('/tenants', methods=['GET'])
def get_tenants():
    try:
        tenants = Tenant.query.all()
        tenant_list = []
        
        for t in tenants:
            # Find or create active lease
            active_lease = LeaseAgreement.query.filter_by(
                tenant_id=t.id,
                status='active'
            ).first()

            # Automatically create lease if tenant has required info
            if not active_lease and t.monthly_rent and t.start_date:
                duration = t.duration_months or 12
                end_date = t.start_date + timedelta(days=30 * duration)
                
                active_lease = LeaseAgreement(
                    tenant_id=t.id,
                    rent_amount=t.monthly_rent,
                    payment_frequency='monthly',
                    start_date=t.start_date,
                    end_date=end_date,
                    status='active'
                )
                
                try:
                    db.session.add(active_lease)
                except Exception as e:
                    print(f"Error creating lease for tenant {t.id}: {str(e)}")

            # Determine lease status
            lease_status = 'No Lease'
            if active_lease:
                if active_lease.end_date < datetime.now():
                    lease_status = 'Expired'
                elif active_lease.start_date <= datetime.now() <= active_lease.end_date:
                    lease_status = 'Active'
                else:
                    lease_status = 'Pending'

            tenant_data = {
                'id': t.id,
                'first_name': t.first_name,
                'last_name': t.last_name,
                'email': t.email,
                'phone': t.phone,
                'property': {
                    'name': t.property.name,
                    'address': t.property.address
                } if t.property else None,
                'lease_status': lease_status,
                'monthly_rent': float(t.monthly_rent) if t.monthly_rent else 0,
                'start_date': t.start_date.strftime('%Y-%m-%d') if t.start_date else None,
                'duration_months': t.duration_months,
                'property_id': t.property_id
            }
            tenant_list.append(tenant_data)

        # Commit changes to save any newly created leases
        db.session.commit()
        
        return jsonify(tenant_list)
    except Exception as e:
        db.session.rollback()
        print(f"Error getting tenants: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main.route('/tenants', methods=['POST'])
def create_tenant():
    try:
        print("Received tenant data:", request.form)  # Debug log
        data = request.form.to_dict()

        # Check for existing email
        existing_tenant = Tenant.query.filter_by(email=data.get('email')).first()
        if existing_tenant:
            return jsonify({
                'error': 'A tenant with this email already exists'
            }), 409

        # Handle property_id
        if data.get('property_id'):
            try:
                data['property_id'] = int(data['property_id'])
            except ValueError:
                return jsonify({'error': 'Invalid property ID'}), 400

        # Handle monthly_rent
        if data.get('monthly_rent'):
            try:
                data['monthly_rent'] = float(data['monthly_rent'])
            except ValueError:
                return jsonify({'error': 'Invalid monthly rent amount'}), 400

        # Handle start_date
        if data.get('start_date'):
            try:
                data['start_date'] = datetime.strptime(data['start_date'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'error': 'Invalid start date format'}), 400

        # Handle duration_months
        if data.get('duration_months'):
            try:
                data['duration_months'] = int(data['duration_months'])
            except ValueError:
                return jsonify({'error': 'Invalid duration months'}), 400

        # Handle file upload
        id_document = request.files.get('id_document')
        if id_document and allowed_file(id_document.filename):
            filename = secure_filename(id_document.filename)
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            if not os.path.exists(upload_folder):
                os.makedirs(upload_folder)
            id_document.save(os.path.join(upload_folder, filename))
            data['id_document'] = filename

        # Create new tenant
        try:
            print("Creating tenant with data:", data)  # Debug log
            new_tenant = Tenant(**data)
            db.session.add(new_tenant)
            db.session.commit()

            return jsonify({
                'message': 'Tenant created successfully',
                'tenant': {
                    'id': new_tenant.id,
                    'first_name': new_tenant.first_name,
                    'last_name': new_tenant.last_name,
                    'email': new_tenant.email,
                    'phone': new_tenant.phone,
                    'property_id': new_tenant.property_id,
                    'monthly_rent': float(new_tenant.monthly_rent) if new_tenant.monthly_rent else 0,
                    'start_date': new_tenant.start_date.strftime('%Y-%m-%d') if new_tenant.start_date else None,
                    'duration_months': new_tenant.duration_months
                }
            })
        except Exception as e:
            db.session.rollback()
            print(f"Database error: {str(e)}")  # Debug log
            return jsonify({'error': f'Database error: {str(e)}'}), 500

    except Exception as e:
        print(f"General error: {str(e)}")  # Debug log
        return jsonify({'error': str(e)}), 500

# Property routes
@main.route('/properties', methods=['GET'])
def get_properties():
    try:
        properties = Property.query.all()
        return jsonify([{
            'id': p.id,
            'name': p.name,
            'address': p.address,
            'type': p.type,
            'landlord': {
                'first_name': p.landlord.first_name,
                'last_name': p.landlord.last_name
            } if p.landlord else None,
            'status': 'occupied' if p.tenants else 'vacant'
        } for p in properties])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/properties', methods=['POST'])
def create_property():
    try:
        data = request.json
        new_property = Property(**data)
        db.session.add(new_property)
        db.session.commit()
        return jsonify({'message': 'Property created successfully', 'id': new_property.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Landlord routes
@main.route('/landlords', methods=['GET'])
def get_landlords():
    try:
        landlords = Landlord.query.all()
        return jsonify([{
            'id': l.id,
            'first_name': l.first_name,
            'last_name': l.last_name,
            'email': l.email,
            'phone': l.phone,
            'properties': len(l.properties),
            'total_revenue': sum(
                payment.amount 
                for prop in l.properties 
                for tenant in prop.tenants 
                for lease in tenant.lease_agreements 
                for payment in lease.payments
            )
        } for l in landlords])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/landlords', methods=['POST'])
def create_landlord():
    try:
        data = request.json
        new_landlord = Landlord(
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=data['email'],
            phone=data.get('phone'),  # Optional field
            address=data.get('address')  # Optional field
        )
        
        db.session.add(new_landlord)
        db.session.commit()
        
        return jsonify({
            'message': 'Landlord created successfully',
            'id': new_landlord.id,
            'landlord': {
                'id': new_landlord.id,
                'first_name': new_landlord.first_name,
                'last_name': new_landlord.last_name,
                'email': new_landlord.email,
                'phone': new_landlord.phone,
                'address': new_landlord.address
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@main.route('/landlords/<int:landlord_id>', methods=['PUT'])
def update_landlord(landlord_id):
    try:
        landlord = Landlord.query.get_or_404(landlord_id)
        data = request.json
        
        # Update fields
        landlord.first_name = data.get('first_name', landlord.first_name)
        landlord.last_name = data.get('last_name', landlord.last_name)
        landlord.email = data.get('email', landlord.email)
        landlord.phone = data.get('phone', landlord.phone)
        landlord.address = data.get('address', landlord.address)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Landlord updated successfully',
            'landlord': {
                'id': landlord.id,
                'first_name': landlord.first_name,
                'last_name': landlord.last_name,
                'email': landlord.email,
                'phone': landlord.phone,
                'address': landlord.address
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@main.route('/landlords/<int:landlord_id>', methods=['DELETE'])
def delete_landlord(landlord_id):
    try:
        landlord = Landlord.query.get_or_404(landlord_id)
        db.session.delete(landlord)
        db.session.commit()
        
        return jsonify({
            'message': 'Landlord deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@main.route('/landlords/<int:landlord_id>', methods=['GET'])
def get_landlord(landlord_id):
    try:
        landlord = Landlord.query.get_or_404(landlord_id)
        return jsonify({
            'id': landlord.id,
            'first_name': landlord.first_name,
            'last_name': landlord.last_name,
            'email': landlord.email,
            'phone': landlord.phone,
            'address': landlord.address,
            'properties': [{
                'id': prop.id,
                'name': prop.name,
                'address': prop.address,
                'type': prop.type
            } for prop in landlord.properties]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Payment routes
@main.route('/payments', methods=['GET'])
def get_payments():
    try:
        payments = Payment.query.all()
        return jsonify([{
            'id': p.id,
            'amount': float(p.amount),
            'payment_date': p.payment_date.isoformat(),
            'payment_type': p.payment_type,
            'reference': p.reference,
            'tenant_name': f"{p.lease_agreement.tenant.first_name} {p.lease_agreement.tenant.last_name}",
            'property_name': p.lease_agreement.tenant.property.name if p.lease_agreement.tenant.property else None,
            'status': 'completed'
        } for p in payments])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/payments/statistics', methods=['GET'])
def get_payment_statistics():
    try:
        total_collected = db.session.query(db.func.sum(Payment.amount)).scalar() or 0
        current_year = datetime.now().year
        yearly_total = db.session.query(db.func.sum(Payment.amount))\
            .filter(db.extract('year', Payment.payment_date) == current_year).scalar() or 0
        
        # Calculate outstanding payments
        outstanding = 0
        paid_tenants = 0
        unpaid_tenants = 0
        
        leases = LeaseAgreement.query.filter_by(status='active').all()
        for lease in leases:
            total_paid = sum(p.amount for p in lease.payments)
            if total_paid >= lease.rent_amount:
                paid_tenants += 1
            else:
                unpaid_tenants += 1
                outstanding += (lease.rent_amount - total_paid)

        return jsonify({
            'total_collections': float(total_collected),
            'yearly_total': float(yearly_total),
            'outstanding_payments': float(outstanding),
            'paid_tenants': paid_tenants,
            'unpaid_tenants': unpaid_tenants
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Document routes
@main.route('/documents', methods=['GET'])
def get_documents():
    try:
        # This would typically query a Documents model
        # For now, returning sample data
        return jsonify([{
            'id': 1,
            'type': 'tenancy_agreement',
            'created_at': datetime.now().isoformat(),
            'related_to': 'John Doe',
            'status': 'generated'
        }])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Notification routes
@main.route('/notifications', methods=['GET'])
def get_notifications():
    try:
        notifications = Notification.query.order_by(Notification.sent_date.desc()).all()
        return jsonify([{
            'id': n.id,
            'message': n.message,
            'type': n.type,
            'sent_date': n.sent_date.isoformat(),
            'is_read': n.is_read
        } for n in notifications])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Error handlers
@main.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

@main.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

@main.errorhandler(Exception)
def handle_error(error):
    print(f"Error: {str(error)}")  # Add server-side logging
    response = {
        "error": str(error),
        "type": error.__class__.__name__
    }
    return jsonify(response), 500

# Add these new routes
@main.route('/documents/generate/<doc_type>', methods=['POST'])
def generate_document(doc_type):
    try:
        data = request.json
        
        if doc_type == 'tenancy_agreement':
            tenant = Tenant.query.get(data['tenant_id'])
            property = Property.query.get(data['property_id'])
            lease = LeaseAgreement.query.get(data['lease_id'])
            
            file_path = document_generator.generate_tenancy_agreement(tenant, property, lease)
            return jsonify({'message': 'Document generated successfully', 'file_path': file_path})
            
        elif doc_type == 'payment_notice':
            tenant = Tenant.query.get(data['tenant_id'])
            file_path = document_generator.generate_payment_notice(
                tenant, 
                data['amount_due'], 
                data['due_date']
            )
            return jsonify({'message': 'Payment notice generated successfully', 'file_path': file_path})
            
        elif doc_type == 'quit_notice':
            tenant = Tenant.query.get(data['tenant_id'])
            property = Property.query.get(data['property_id'])
            file_path = document_generator.generate_quit_notice(
                tenant,
                property,
                data['reason']
            )
            return jsonify({'message': 'Quit notice generated successfully', 'file_path': file_path})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/payments/record', methods=['POST'])
def record_payment():
    try:
        data = request.json
        payment = payment_manager.record_payment(
            data['lease_agreement_id'],
            data['amount'],
            data['payment_type'],
            data.get('reference')
        )
        return jsonify({
            'message': 'Payment recorded successfully',
            'payment_id': payment.id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main.route('/payments/<int:payment_id>/receipt', methods=['GET'])
def get_payment_receipt(payment_id):
    try:
        receipt_data = payment_manager.generate_receipt(payment_id)
        return jsonify(receipt_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500 

@main.route('/test', methods=['GET'])
def test_api():
    print("Test endpoint accessed")
    return jsonify({
        'status': 'success',
        'message': 'API is working'
    }) 

@main.route('/ping', methods=['GET'])
def ping():
    return jsonify({
        'status': 'success',
        'message': 'pong',
        'timestamp': datetime.now().isoformat()
    }) 

# Add a route to list all available endpoints
@main.route('/', methods=['GET'])
def list_endpoints():
    """List all available endpoints"""
    endpoints = {
        'dashboard_stats': url_for('main.get_dashboard_stats'),
        'tenants': url_for('main.get_tenants'),
        'properties': url_for('main.get_properties'),
        'landlords': url_for('main.get_landlords'),
        'payments': url_for('main.get_payments'),
        'documents': url_for('main.get_documents'),
        'notifications': url_for('main.get_notifications')
    }
    return jsonify(endpoints) 

@main.route('/tenants/<int:tenant_id>/payment-info', methods=['GET'])
def get_tenant_payment_info(tenant_id):
    try:
        tenant = Tenant.query.get_or_404(tenant_id)
        
        # Get or create active lease
        active_lease = LeaseAgreement.query.filter_by(
            tenant_id=tenant.id,
            status='active'
        ).first()

        # Automatically create lease if tenant has required info
        if not active_lease and tenant.monthly_rent and tenant.start_date:
            # Calculate end date based on duration_months or default to 12 months
            duration = tenant.duration_months or 12
            end_date = tenant.start_date + timedelta(days=30 * duration)
            
            # Create new lease agreement
            active_lease = LeaseAgreement(
                tenant_id=tenant.id,
                rent_amount=tenant.monthly_rent,
                payment_frequency='monthly',
                start_date=tenant.start_date,
                end_date=end_date,
                status='active'
            )
            
            try:
                db.session.add(active_lease)
                db.session.commit()
                print(f"Created new lease for tenant {tenant.id}")
            except Exception as e:
                db.session.rollback()
                print(f"Error creating lease: {str(e)}")
                raise

        return jsonify({
            'property': tenant.property.name if tenant.property else 'Not Assigned',
            'monthly_rent': float(tenant.monthly_rent) if tenant.monthly_rent else 0,
            'lease_id': active_lease.id if active_lease else None,
            'has_active_lease': bool(active_lease),
            'lease_details': {
                'start_date': active_lease.start_date.strftime('%Y-%m-%d') if active_lease else None,
                'end_date': active_lease.end_date.strftime('%Y-%m-%d') if active_lease else None,
                'rent_amount': float(active_lease.rent_amount) if active_lease else None
            } if active_lease else None
        })
    except Exception as e:
        print(f"Error in get_tenant_payment_info: {str(e)}")
        return jsonify({'error': str(e)}), 500 

@main.route('/lease-agreements', methods=['POST'])
def create_lease_agreement():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['tenant_id', 'rent_amount', 'start_date', 'end_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Validate tenant
        tenant = Tenant.query.get(data['tenant_id'])
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404

        # Check for existing active lease
        existing_lease = LeaseAgreement.query.filter_by(
            tenant_id=tenant.id, 
            status='active'
        ).first()

        if existing_lease:
            return jsonify({'error': 'An active lease already exists for this tenant'}), 400

        # Parse dates
        try:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d')
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        # Create new lease agreement
        new_lease = LeaseAgreement(
            tenant_id=tenant.id,
            rent_amount=float(data['rent_amount']),
            start_date=start_date,
            end_date=end_date,
            payment_frequency=data.get('payment_frequency', 'monthly'),
            status='active'
        )

        # Optional additional fields
        if 'additional_terms' in data:
            new_lease.additional_terms = data['additional_terms']
        
        if 'security_deposit' in data:
            new_lease.security_deposit = float(data['security_deposit'])

        try:
            db.session.add(new_lease)
            db.session.commit()

            return jsonify({
                'message': 'Lease agreement created successfully',
                'lease': {
                    'id': new_lease.id,
                    'tenant_name': f"{tenant.first_name} {tenant.last_name}",
                    'rent_amount': float(new_lease.rent_amount),
                    'start_date': new_lease.start_date.strftime('%Y-%m-%d'),
                    'end_date': new_lease.end_date.strftime('%Y-%m-%d'),
                    'status': new_lease.status
                }
            }), 201

        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Error creating lease: {str(e)}'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500 