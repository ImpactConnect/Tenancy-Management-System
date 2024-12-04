from flask import Flask, jsonify
from flask_cors import CORS
from .config import Config
from .models import db
from .routes import main

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Initialize extensions
    db.init_app(app)
    
    # Register blueprints
    app.register_blueprint(main)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    # Root endpoint
    @app.route('/')
    def index():
        return jsonify({
            'status': 'success',
            'message': 'API server is running',
            'api_base_url': '/api'
        })
    
    return app 