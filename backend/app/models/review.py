from datetime import datetime
from app import db


class Review(db.Model):
    """A star rating + written review left by a user for an accommodation or a tour."""
    __tablename__ = 'reviews'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_type = db.Column(db.String(20), nullable=False)   # 'accommodation' | 'tour'
    target_id = db.Column(db.Integer, nullable=False)
    rating = db.Column(db.Integer, nullable=False)           # 1-5
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('reviews', lazy=True, cascade='all, delete-orphan'))

    # One review per user per target
    __table_args__ = (
        db.UniqueConstraint('user_id', 'target_type', 'target_id', name='uq_user_review'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'reviewer_name': (
                f"{self.user.first_name or ''} {self.user.last_name or ''}".strip() or self.user.username
            ) if self.user else 'Guest',
            'reviewer_avatar': self.user.avatar_url if self.user else None,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
