from flask import Blueprint

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
treks_bp = Blueprint('treks', __name__, url_prefix='/api/treks')
accommodations_bp = Blueprint('accommodations', __name__, url_prefix='/api/accommodations')
bookings_bp = Blueprint('bookings', __name__, url_prefix='/api/bookings')
events_bp = Blueprint('events', __name__, url_prefix='/api/events')
admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
reviews_bp = Blueprint('reviews', __name__, url_prefix='/api/reviews')
moments_bp = Blueprint('moments', __name__, url_prefix='/api/moments')

from app.routes import auth, treks, accommodations, bookings, events, admin, reviews, moments
