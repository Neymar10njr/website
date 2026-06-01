from datetime import datetime
from app import db


class TrekEvent(db.Model):
    """A scheduled instance of a trek organised by a trek_organiser."""
    __tablename__ = 'trek_events'

    id = db.Column(db.Integer, primary_key=True)
    organiser_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    trek_id = db.Column(db.Integer, db.ForeignKey('treks.id'), nullable=False)

    title = db.Column(db.String(160), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)

    capacity = db.Column(db.Integer, nullable=False, default=10)
    per_person_fee = db.Column(db.Float, nullable=False)

    meeting_point = db.Column(db.String(255))
    reporting_time = db.Column(db.Time)
    contact_phone = db.Column(db.String(20))
    description = db.Column(db.Text)
    includes = db.Column(db.Text)
    excludes = db.Column(db.Text)

    # Optional celebrity / special guest joining this departure
    featured_guest = db.Column(db.Text)
    featured_guest_role = db.Column(db.Text)

    status = db.Column(db.String(20), default='open', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    organiser = db.relationship('User', backref=db.backref('organised_events', lazy=True, cascade='all, delete-orphan'))
    trek = db.relationship('Trek', backref=db.backref('events', lazy=True))
    participants = db.relationship('TrekEventParticipant', backref='event', lazy=True, cascade='all, delete-orphan')

    @property
    def confirmed_count(self):
        return sum(1 for p in self.participants if p.status in ('pending', 'paid'))

    @property
    def spots_left(self):
        return max(0, self.capacity - self.confirmed_count)


class TrekEventParticipant(db.Model):
    """A user who has joined a trek event."""
    __tablename__ = 'trek_event_participants'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('trek_events.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)
    payment_method = db.Column(db.String(40))
    note = db.Column(db.Text)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    paid_at = db.Column(db.DateTime)

    user = db.relationship('User', backref=db.backref('joined_events', lazy=True, cascade='all, delete-orphan'))

    __table_args__ = (db.UniqueConstraint('event_id', 'user_id', name='uq_event_user'),)
