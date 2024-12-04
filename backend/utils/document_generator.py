from jinja2 import Template
from datetime import datetime
import pdfkit
import os

class DocumentGenerator:
    def __init__(self, template_dir):
        self.template_dir = template_dir

    def generate_document(self, template_name, data, output_filename):
        # Load template
        template_path = os.path.join(self.template_dir, f"{template_name}.html")
        with open(template_path, 'r') as file:
            template_content = file.read()
        
        # Render template with data
        template = Template(template_content)
        rendered_html = template.render(**data)
        
        # Convert to PDF
        output_path = os.path.join('uploads', 'documents', output_filename)
        pdfkit.from_string(rendered_html, output_path)
        
        return output_path

    def generate_tenancy_agreement(self, tenant, property, lease):
        data = {
            'tenant': tenant,
            'property': property,
            'lease': lease,
            'date': datetime.now().strftime('%d %B, %Y')
        }
        return self.generate_document('tenancy_agreement', data, f'agreement_{tenant.id}_{lease.id}.pdf')

    def generate_payment_notice(self, tenant, amount_due, due_date):
        data = {
            'tenant': tenant,
            'amount_due': amount_due,
            'due_date': due_date,
            'date': datetime.now().strftime('%d %B, %Y')
        }
        return self.generate_document('payment_notice', data, f'payment_notice_{tenant.id}.pdf')

    def generate_quit_notice(self, tenant, property, reason):
        data = {
            'tenant': tenant,
            'property': property,
            'reason': reason,
            'date': datetime.now().strftime('%d %B, %Y')
        }
        return self.generate_document('quit_notice', data, f'quit_notice_{tenant.id}.pdf') 