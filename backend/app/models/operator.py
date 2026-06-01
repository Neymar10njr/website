from datetime import datetime
from app import db


class OperatorProfile(db.Model):
    """Single-row table holding the TrekNest Bhutan brand shown on every group event.

    The platform runs as a single tour-operator company. Every trek_organiser staff
    account creates events under this shared brand. Admins maintain this profile.
    """
    __tablename__ = 'operator_profiles'

    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(160), nullable=False)
    tagline = db.Column(db.String(255))
    licence_number = db.Column(db.String(80))
    logo_url = db.Column(db.String(500))

    support_phone = db.Column(db.String(40))
    whatsapp_number = db.Column(db.String(40))
    support_email = db.Column(db.String(120))
    website = db.Column(db.String(255))

    office_address = db.Column(db.String(255))
    business_hours = db.Column(db.String(120))

    description = db.Column(db.Text)
    years_active = db.Column(db.Integer)

    is_verified = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'company_name': self.company_name,
            'tagline': self.tagline,
            'licence_number': self.licence_number,
            'logo_url': self.logo_url,
            'support_phone': self.support_phone,
            'whatsapp_number': self.whatsapp_number,
            'support_email': self.support_email,
            'website': self.website,
            'office_address': self.office_address,
            'business_hours': self.business_hours,
            'description': self.description,
            'years_active': self.years_active,
            'is_verified': self.is_verified
        }


class StaffProfile(db.Model):
    """Per-staff guide credentials and bio. Joined to a trek_organiser user."""
    __tablename__ = 'staff_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)

    display_name = db.Column(db.String(120))
    role_title = db.Column(db.String(80))
    bio = db.Column(db.Text)
    photo_url = db.Column(db.String(500))

    guide_licence_no = db.Column(db.String(80))
    certifications = db.Column(db.Text)
    years_experience = db.Column(db.Integer)
    languages = db.Column(db.String(255))

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('staff_profile', uselist=False, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'display_name': self.display_name,
            'role_title': self.role_title,
            'bio': self.bio,
            'photo_url': self.photo_url,
            'guide_licence_no': self.guide_licence_no,
            'certifications': self.certifications,
            'years_experience': self.years_experience,
            'languages': self.languages,
            'is_active': self.is_active
        }
