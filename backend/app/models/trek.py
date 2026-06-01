from app import db
from datetime import datetime

class Trek(db.Model):
    __tablename__ = 'treks'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    difficulty = db.Column(db.String(20))
    duration_days = db.Column(db.Integer)
    distance_km = db.Column(db.Float)
    dzongkhag = db.Column(db.String(80), nullable=False)
    altitude_start = db.Column(db.Integer)
    altitude_end = db.Column(db.Integer)
    best_season = db.Column(db.String(50))
    image_url = db.Column(db.String(500))

    tour_type = db.Column(db.String(20), nullable=False, default='trek')
    country = db.Column(db.String(60), nullable=False, default='Bhutan')
    religious_tradition = db.Column(db.String(60))
    sacred_sites = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    stops = db.relationship('TrekStop', backref='trek', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Tour {self.tour_type}:{self.name}>'

class TrekStop(db.Model):
    __tablename__ = 'trek_stops'
    
    id = db.Column(db.Integer, primary_key=True)
    trek_id = db.Column(db.Integer, db.ForeignKey('treks.id'), nullable=False)
    stop_name = db.Column(db.String(120), nullable=False)
    stop_order = db.Column(db.Integer)
    altitude = db.Column(db.Integer)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    accommodations = db.relationship('Accommodation', backref='stop', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<TrekStop {self.stop_name}>'
