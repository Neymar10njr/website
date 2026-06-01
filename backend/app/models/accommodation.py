from app import db
from datetime import datetime

class Accommodation(db.Model):
    __tablename__ = 'accommodations'

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    trek_stop_id = db.Column(db.Integer, db.ForeignKey('trek_stops.id'), nullable=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    dzongkhag = db.Column(db.String(50))
    address = db.Column(db.String(255))
    phone = db.Column(db.String(20))
    rating = db.Column(db.Float, default=0.0)
    image_url = db.Column(db.String(500))
    image_gallery = db.Column(db.Text)  # JSON array of image URLs
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    rooms = db.relationship('Room', backref='accommodation', lazy=True, cascade='all, delete-orphan')
    bookings = db.relationship('Booking', backref='accommodation', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Accommodation {self.name}>'

class Room(db.Model):
    __tablename__ = 'rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    accommodation_id = db.Column(db.Integer, db.ForeignKey('accommodations.id'), nullable=False)
    room_number = db.Column(db.String(20), nullable=False)
    room_type = db.Column(db.String(50))
    capacity = db.Column(db.Integer, nullable=False)
    price_per_night = db.Column(db.Float, nullable=False)
    amenities = db.Column(db.Text)
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    bookings = db.relationship('Booking', backref='room', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Room {self.room_number}>'
