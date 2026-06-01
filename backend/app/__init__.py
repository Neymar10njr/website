import logging
import os
from logging.handlers import RotatingFileHandler

from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config import get_config

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address, default_limits=['200 per minute'])


def _configure_logging(app):
    log_dir = '/app/logs'
    try:
        os.makedirs(log_dir, exist_ok=True)
        handler = RotatingFileHandler(
            os.path.join(log_dir, 'treknest.log'),
            maxBytes=10 * 1024 * 1024,
            backupCount=5
        )
        handler.setFormatter(logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        handler.setLevel(logging.INFO)
        app.logger.addHandler(handler)
        app.logger.setLevel(logging.INFO if not app.debug else logging.DEBUG)
        app.logger.info('TrekNest startup — logging initialized')
    except OSError:
        app.logger.warning('Could not create /app/logs directory; using stderr only')


def _configure_sentry(app):
    dsn = app.config.get('SENTRY_DSN')
    if not dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        sentry_sdk.init(
            dsn=dsn,
            integrations=[FlaskIntegration()],
            traces_sample_rate=0.1,
            environment=os.getenv('FLASK_ENV', 'development')
        )
        app.logger.info('Sentry error monitoring enabled')
    except ImportError:
        app.logger.warning('SENTRY_DSN set but sentry_sdk not installed')


def create_app(config_class=None):
    app = Flask(__name__)
    app.config.from_object(config_class or get_config())
    app.url_map.strict_slashes = False

    _configure_logging(app)
    _configure_sentry(app)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    CORS(app, origins=app.config['ALLOWED_ORIGINS'], supports_credentials=True)
    login_manager.login_view = 'auth.login'

    from app.routes import (auth_bp, treks_bp, accommodations_bp, bookings_bp,
                            events_bp, admin_bp, reviews_bp, moments_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(treks_bp)
    app.register_blueprint(accommodations_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(moments_bp)

    @app.route('/')
    def index():
        return jsonify({
            'name': 'TrekNest Bhutan API',
            'status': 'running',
            'frontend': 'http://localhost:8080',
            'endpoints': {
                'treks': '/api/treks/',
                'accommodations': '/api/accommodations/',
                'bookings': '/api/bookings/',
                'auth': '/api/auth/login | /api/auth/register | /api/auth/logout',
                'admin': '/api/admin/images'
            }
        })

    return app
