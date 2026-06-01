"""Seed the single TrekNest Bhutan operator profile, the bootstrap admin user,
and a small set of staff guide accounts. Idempotent — safe to run on every boot."""
import os
import secrets

from werkzeug.security import generate_password_hash

from app import db
from app.models import OperatorProfile, StaffProfile, User


TREKNEST_OPERATOR = {
    'company_name': 'TrekNest Bhutan',
    'tagline': 'Authentic treks, hikes, and pilgrimages — organised end to end',
    'licence_number': 'TCB-LIC-PENDING',
    'logo_url': '/assets/logo-treknest.png',
    'support_phone': '+975-2-322333',
    'whatsapp_number': '+975-17-000000',
    'support_email': 'bookings@treknest.bt',
    'website': 'https://treknest.bt',
    'office_address': 'Norzin Lam, Thimphu, Bhutan',
    'business_hours': '9:00 AM – 6:00 PM BST (Bhutan Time)',
    'description': (
        'TrekNest Bhutan is a Thimphu-based tour operator specialising in guided '
        'treks, day hikes, and Buddhist pilgrimages across Bhutan and the wider '
        'Himalayan region. Every tour is led by our small team of certified Bhutanese '
        'guides — we plan logistics, permits, accommodation, transport, and meals so '
        'you only need to bring your boots and a sense of wonder.'
    ),
    'years_active': 1
}


SAMPLE_STAFF = [
    {
        'username': 'guide_karma',
        'email': 'karma.dorji@treknest.bt',
        'first_name': 'Karma',
        'last_name': 'Dorji',
        'phone': '+975-17-111222',
        'role_title': 'Lead Trek Guide',
        'bio': 'Karma has guided high-altitude treks in Bhutan for 8 years, including 12 Snowman expeditions.',
        'guide_licence_no': 'TCB-G-001',
        'certifications': 'TCB Certified Cultural Guide, Wilderness First Responder',
        'years_experience': 8,
        'languages': 'Dzongkha, English, Hindi'
    },
    {
        'username': 'guide_pema',
        'email': 'pema.wangmo@treknest.bt',
        'first_name': 'Pema',
        'last_name': 'Wangmo',
        'phone': '+975-17-333444',
        'role_title': 'Pilgrimage Lead',
        'bio': 'Pema specialises in Buddhist pilgrimage circuits through Bhutan, Nepal, and India.',
        'guide_licence_no': 'TCB-G-002',
        'certifications': 'TCB Certified Cultural Guide, Buddhist Studies (Tango Monastery)',
        'years_experience': 6,
        'languages': 'Dzongkha, English, Tibetan, Hindi'
    },
    {
        'username': 'guide_tashi',
        'email': 'tashi.norbu@treknest.bt',
        'first_name': 'Tashi',
        'last_name': 'Norbu',
        'phone': '+975-17-555666',
        'role_title': 'Day-Hike Lead',
        'bio': 'Tashi leads short hikes around Paro and Thimphu valleys with deep local knowledge.',
        'guide_licence_no': 'TCB-G-003',
        'certifications': 'TCB Certified Cultural Guide',
        'years_experience': 4,
        'languages': 'Dzongkha, English'
    }
]


def seed_operator_if_empty():
    if OperatorProfile.query.first():
        return False
    profile = OperatorProfile(**TREKNEST_OPERATOR)
    db.session.add(profile)
    db.session.commit()
    return True


def seed_admin_if_empty():
    """Bootstrap a single admin user. Username/password come from env, with safe dev defaults."""
    if User.query.filter_by(user_type='admin').first():
        return None
    username = os.getenv('ADMIN_USERNAME', 'admin')
    email = os.getenv('ADMIN_EMAIL', 'admin@treknest.bt')
    password = os.getenv('ADMIN_PASSWORD', 'TrekNestAdmin!2026')
    if User.query.filter((User.username == username) | (User.email == email)).first():
        return None
    admin = User(
        username=username,
        email=email,
        password=generate_password_hash(password),
        first_name='TrekNest',
        last_name='Admin',
        user_type='admin',
        email_verified=True
    )
    db.session.add(admin)
    db.session.commit()
    return {'username': username, 'password': password}


def seed_staff_if_empty():
    added = 0
    for s in SAMPLE_STAFF:
        if User.query.filter_by(username=s['username']).first():
            continue
        if User.query.filter_by(email=s['email']).first():
            continue
        temp_password = os.getenv('STAFF_DEFAULT_PASSWORD', 'TrekNestGuide!2026')
        user = User(
            username=s['username'],
            email=s['email'],
            password=generate_password_hash(temp_password),
            first_name=s['first_name'],
            last_name=s['last_name'],
            phone=s.get('phone'),
            user_type='trek_organiser',
            email_verified=True
        )
        db.session.add(user)
        db.session.flush()
        staff = StaffProfile(
            user_id=user.id,
            display_name=f"{s['first_name']} {s['last_name']}",
            role_title=s.get('role_title'),
            bio=s.get('bio'),
            guide_licence_no=s.get('guide_licence_no'),
            certifications=s.get('certifications'),
            years_experience=s.get('years_experience'),
            languages=s.get('languages'),
            is_active=True
        )
        db.session.add(staff)
        added += 1
    db.session.commit()
    return added
