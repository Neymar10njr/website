from app import db
from flask_login import UserMixin
from datetime import datetime


class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    first_name = db.Column(db.String(80))
    last_name = db.Column(db.String(80))
    user_type = db.Column(db.String(20), default='tourist')
    is_active = db.Column(db.Boolean, default=True)
    avatar_url = db.Column(db.String(500))

    email_verified = db.Column(db.Boolean, default=False)
    email_verification_token = db.Column(db.String(64), index=True)
    email_verification_sent_at = db.Column(db.DateTime)

    password_reset_token = db.Column(db.String(64), index=True)
    password_reset_sent_at = db.Column(db.DateTime)

    must_change_password = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    bookings = db.relationship('Booking', backref='user', lazy=True, cascade='all, delete-orphan')
    accommodations = db.relationship('Accommodation', backref='owner', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<User {self.username}>'
