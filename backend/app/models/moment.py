from datetime import datetime
from app import db


class Moment(db.Model):
    """A curated 'Trek Moment' — a photo highlight from a tour, posted by TrekNest staff/admin."""
    __tablename__ = 'moments'

    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(500), nullable=False)
    caption = db.Column(db.Text)
    trek_id = db.Column(db.Integer, db.ForeignKey('treks.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    trek = db.relationship('Trek')

    def to_dict(self):
        return {
            'id': self.id,
            'image_url': self.image_url,
            'caption': self.caption,
            'trek_id': self.trek_id,
            'trek_name': self.trek.name if self.trek else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
