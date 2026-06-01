import os
import secrets as _secrets
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def _get_or_generate(name, default_dev):
    val = os.getenv(name)
    if val:
        return val
    if os.getenv('FLASK_ENV') == 'production':
        raise RuntimeError(
            f'{name} must be set explicitly in production. '
            f'Generate with: python -c "import secrets; print(secrets.token_hex(32))"'
        )
    return default_dev


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URI', 'sqlite:///treknesT_bhutan.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    SECRET_KEY = _get_or_generate('SECRET_KEY', 'dev_secret_' + _secrets.token_hex(8))
    JWT_SECRET_KEY = _get_or_generate('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'app/static/uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    PUBLIC_BACKEND_URL = os.getenv('PUBLIC_BACKEND_URL', 'http://localhost:5000')
    ALLOWED_ORIGINS = [
        o.strip() for o in os.getenv(
            'ALLOWED_ORIGINS',
            'http://localhost:8080,http://127.0.0.1:8080'
        ).split(',') if o.strip()
    ]

    SMTP_HOST = os.getenv('SMTP_HOST', '')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    SMTP_FROM = os.getenv('SMTP_FROM', 'no-reply@treknest.local')
    SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'

    SENTRY_DSN = os.getenv('SENTRY_DSN', '')

    AWS_S3_BUCKET = os.getenv('AWS_S3_BUCKET', '')
    AWS_S3_REGION = os.getenv('AWS_S3_REGION', '')
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID', '')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', '')
    AWS_S3_ENDPOINT_URL = os.getenv('AWS_S3_ENDPOINT_URL', '')

    RATELIMIT_STORAGE_URI = os.getenv('RATELIMIT_STORAGE_URI', 'memory://')


class DevelopmentConfig(Config):
    DEBUG = True
    PROPAGATE_EXCEPTIONS = True


class ProductionConfig(Config):
    DEBUG = False
    PROPAGATE_EXCEPTIONS = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PREFERRED_URL_SCHEME = 'https'


def get_config():
    if os.getenv('FLASK_ENV') == 'production':
        return ProductionConfig
    return DevelopmentConfig
