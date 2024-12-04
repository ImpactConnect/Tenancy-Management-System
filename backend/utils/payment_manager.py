from datetime import datetime
from ..models import db, Payment, LeaseAgreement, Notification
from .notification_manager import NotificationManager

class PaymentManager:
    def __init__(self, notification_manager):
        self.notification_manager = notification_manager

    def record_payment(self, lease_agreement_id, amount, payment_type, reference=None):
        """Record a new payment"""
        try:
            payment = Payment(
                lease_agreement_id=lease_agreement_id,
                amount=amount,
                payment_date=datetime.now(),
                payment_type=payment_type,
                reference=reference
            )
            db.session.add(payment)
            
            # Update lease agreement status if fully paid
            lease = LeaseAgreement.query.get(lease_agreement_id)
            total_paid = sum(p.amount for p in lease.payments) + amount
            
            if total_paid >= lease.rent_amount:
                lease.status = 'paid'
                
                # Create notification for full payment
                self.notification_manager.create_notification(
                    'payment_completed',
                    f"Full payment received for {lease.tenant.first_name} {lease.tenant.last_name}",
                    lease.tenant_id
                )
            
            db.session.commit()
            return payment
            
        except Exception as e:
            db.session.rollback()
            raise e

    def generate_receipt(self, payment_id):
        """Generate payment receipt"""
        payment = Payment.query.get(payment_id)
        if not payment:
            raise ValueError("Payment not found")
            
        receipt_data = {
            'receipt_number': f"RCP-{payment.id:06d}",
            'payment_date': payment.payment_date,
            'tenant_name': f"{payment.lease_agreement.tenant.first_name} {payment.lease_agreement.tenant.last_name}",
            'property_name': payment.lease_agreement.tenant.property.name,
            'amount': payment.amount,
            'payment_type': payment.payment_type,
            'reference': payment.reference
        }
        return receipt_data

    def get_payment_statistics(self, start_date=None, end_date=None):
        """Get payment statistics for a date range"""
        query = Payment.query
        
        if start_date:
            query = query.filter(Payment.payment_date >= start_date)
        if end_date:
            query = query.filter(Payment.payment_date <= end_date)
            
        total_amount = query.with_entities(db.func.sum(Payment.amount)).scalar() or 0
        payment_count = query.count()
        
        return {
            'total_amount': float(total_amount),
            'payment_count': payment_count,
            'average_payment': float(total_amount / payment_count) if payment_count > 0 else 0
        }

    def get_outstanding_payments(self):
        """Get list of outstanding payments"""
        active_leases = LeaseAgreement.query.filter_by(status='active').all()
        outstanding_payments = []
        
        for lease in active_leases:
            total_paid = sum(payment.amount for payment in lease.payments)
            if total_paid < lease.rent_amount:
                outstanding_payments.append({
                    'tenant_name': f"{lease.tenant.first_name} {lease.tenant.last_name}",
                    'property_name': lease.tenant.property.name,
                    'amount_due': lease.rent_amount - total_paid,
                    'due_date': lease.end_date
                })
                
        return outstanding_payments 