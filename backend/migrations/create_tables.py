from backend.app import create_app
from backend.models import db

def init_db():
    app = create_app()
    with app.app_context():
        db.drop_all()  # Be careful with this in production!
        db.create_all()
        print("Database tables created successfully!")

if __name__ == '__main__':
    init_db() 