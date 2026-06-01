from flask import Flask

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object('config.Config')
    
    # Register blueprints
    from .routes import auth, treks, accommodations, bookings, admin
    app.register_blueprint(auth.bp)
    app.register_blueprint(treks.bp)
    app.register_blueprint(accommodations.bp)
    app.register_blueprint(bookings.bp)
    app.register_blueprint(admin.bp)
    
    return app