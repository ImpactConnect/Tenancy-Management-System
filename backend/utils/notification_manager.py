from flask_mail import Message
from datetime import datetime, timedelta
from ..models import db, Notification, LeaseAgreement, Payment

class NotificationManager:
    def __init__(self, mail, app):
        self.mail = mail
        self.app = app

    def create_notification(self, type, message, tenant_id=None):
        notification = Notification(
            type=type,
            message=message,
            tenant_id=tenant_id,
            sent_date=datetime.now(),
            is_read=False
        )
        db.session.add(notification)
        db.session.commit()
        return notification

    def send_email(self, recipient, subject, body):
        with self.app.app_context():
            msg = Message(
                subject=subject,
                recipients=[recipient],
                body=body
            )
            self.mail.send(msg)

    def check_lease_expirations(self):
        """Check for leases expiring in the next 3 months"""
        three_months_from_now = datetime.now() + timedelta(days=90)
        expiring_leases = LeaseAgreement.query.filter(
            LeaseAgreement.end_date <= three_months_from_now,
            LeaseAgreement.status == 'active'
        ).all()

        for lease in expiring_leases:
            message = f"Lease for {lease.tenant.first_name} {lease.tenant.last_name} "
            message += f"at {lease.tenant.property.name} expires on {lease.end_date.strftime('%d %B, %Y')}"
            
            self.create_notification('lease_expiry', message, lease.tenant_id)
            self.send_email(
                lease.tenant.email,
                "Lease Expiration Notice",
                f"Dear {lease.tenant.first_name},\n\n{message}"
            )

    def check_overdue_payments(self):
        """Check for overdue payments"""
        active_leases = LeaseAgreement.query.filter_by(status='active').all()
        
        for lease in active_leases:
            total_paid = sum(payment.amount for payment in lease.payments)
            if total_paid < lease.rent_amount:
                message = f"Overdue payment for {lease.tenant.first_name} {lease.tenant.last_name}. "
                message += f"Amount due: {lease.rent_amount - total_paid}"
                
                self.create_notification('payment_overdue', message, lease.tenant_id)
                self.send_email(
                    lease.tenant.email,
                    "Payment Overdue Notice",
                    f"Dear {lease.tenant.first_name},\n\n{message}"
                ) 