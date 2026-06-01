import secrets
import uuid
from datetime import datetime, timedelta

from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_login import login_user, logout_user
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from app import db, login_manager, limiter
from app.models import User
from app.routes import auth_bp
from app.email_service import send_email
from app.storage import save_image


AVATAR_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}


ALLOWED_USER_TYPES = {'tourist', 'local_tourist', 'host', 'trek_organiser'}
PUBLIC_USER_TYPES = {'tourist', 'local_tourist', 'host'}
EMAIL_VERIFICATION_EXPIRY_HOURS = 24
PASSWORD_RESET_EXPIRY_HOURS = 1


def _user_payload(user):
    return {
        'user_id': user.id,
        'username': user.username,
        'email': user.email,
        'user_type': user.user_type,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'phone': user.phone,
        'avatar_url': user.avatar_url,
        'email_verified': user.email_verified,
        'must_change_password': bool(user.must_change_password)
    }


def _build_link(path):
    base = current_app.config.get('PUBLIC_BACKEND_URL', 'http://localhost:5000')
    return f'{base.rstrip("/")}{path}'


def _send_verification_email(user):
    user.email_verification_token = secrets.token_urlsafe(32)
    user.email_verification_sent_at = datetime.utcnow()
    db.session.commit()

    verify_link = _build_link(f'/api/auth/verify-email?token={user.email_verification_token}')
    send_email(
        user.email,
        'Verify your TrekNest Bhutan account',
        f'Hi {user.first_name or user.username},\n\n'
        f'Please confirm your email by visiting:\n{verify_link}\n\n'
        f'This link expires in {EMAIL_VERIFICATION_EXPIRY_HOURS} hours.\n\n'
        f'If you did not create an account, you can ignore this email.\n\n— TrekNest Bhutan'
    )


@auth_bp.route('/register', methods=['POST'])
@limiter.limit('10 per hour')
def register():
    data = request.get_json() or {}

    if not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400

    user_type = data.get('user_type', 'tourist')
    if user_type not in PUBLIC_USER_TYPES:
        return jsonify({'error': 'Invalid user_type. Must be tourist, local_tourist, or host. Trek organiser accounts are issued by TrekNest Bhutan staff.'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400

    user = User(
        username=data['username'],
        email=data['email'],
        password=generate_password_hash(data['password']),
        first_name=data.get('first_name'),
        last_name=data.get('last_name'),
        user_type=user_type,
        email_verified=False
    )
    db.session.add(user)
    db.session.commit()

    _send_verification_email(user)

    token = create_access_token(identity=str(user.id), additional_claims={'user_type': user.user_type})
    payload = _user_payload(user)
    payload.update({
        'message': 'Account created. Please check your email to verify your address.',
        'access_token': token
    })
    return jsonify(payload), 201


@auth_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.get_json() or {}

    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400

    user = User.query.filter_by(username=data['username']).first()
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401

    login_user(user)
    token = create_access_token(identity=str(user.id), additional_claims={'user_type': user.user_type})
    payload = _user_payload(user)
    payload.update({'message': 'Login successful', 'access_token': token})
    return jsonify(payload), 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({'message': 'Logout successful'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    payload = _user_payload(user)
    sp = getattr(user, 'staff_profile', None)
    if sp:
        payload['staff_profile'] = sp.to_dict()
    return jsonify(payload), 200


@auth_bp.route('/me', methods=['PATCH'])
@jwt_required()
def update_me():
    """Self-serve profile update. Updates basic user fields and, if the user
    is staff, their owned staff_profile fields (bio, photo_url, languages).
    Admin-controlled fields (role_title, licence_no, certifications, years_experience)
    are NOT editable here."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    user_fields = ['first_name', 'last_name', 'phone']
    for f in user_fields:
        if f in data:
            setattr(user, f, (data[f] or None) if isinstance(data[f], str) else data[f])

    sp_data = data.get('staff_profile')
    if sp_data and user.user_type == 'trek_organiser':
        from app.models import StaffProfile
        sp = StaffProfile.query.filter_by(user_id=user.id).first()
        if not sp:
            sp = StaffProfile(user_id=user.id, is_active=True)
            db.session.add(sp)
        editable = ['bio', 'photo_url', 'languages']
        for f in editable:
            if f in sp_data:
                setattr(sp, f, sp_data[f])

    db.session.commit()
    payload = _user_payload(user)
    sp = getattr(user, 'staff_profile', None)
    if sp:
        payload['staff_profile'] = sp.to_dict()
    return jsonify({'message': 'Profile updated', **payload}), 200


@auth_bp.route('/upload-avatar', methods=['POST'])
@jwt_required()
@limiter.limit('20 per hour')
def upload_avatar():
    """Any logged-in user uploads a profile picture. Saves the file and sets avatar_url."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    file = request.files['image']
    if not file.filename:
        return jsonify({'error': 'Empty filename'}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in AVATAR_EXTENSIONS:
        return jsonify({'error': f'Invalid file type. Allowed: {", ".join(sorted(AVATAR_EXTENSIONS))}'}), 400

    base = secure_filename(file.filename.rsplit('.', 1)[0]) or 'avatar'
    unique_name = f'avatar_{uuid.uuid4().hex[:8]}_{base}.{ext}'
    content_type = file.mimetype or f'image/{ext}'
    avatar_url = save_image(file, unique_name, content_type=content_type)

    user.avatar_url = avatar_url
    db.session.commit()
    return jsonify({'message': 'Profile picture updated', 'avatar_url': avatar_url}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
@limiter.limit('10 per hour')
def change_password():
    """Logged-in user changes their own password. Verifies old password.
    Clears must_change_password flag on success."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not old_password or not new_password:
        return jsonify({'error': 'old_password and new_password are required'}), 400

    if not check_password_hash(user.password, old_password):
        return jsonify({'error': 'Current password is incorrect'}), 401

    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    if old_password == new_password:
        return jsonify({'error': 'New password must be different from current password'}), 400

    user.password = generate_password_hash(new_password)
    user.must_change_password = False
    db.session.commit()
    return jsonify({'message': 'Password updated successfully'}), 200


@auth_bp.route('/verify-email', methods=['GET'])
def verify_email():
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'Missing token'}), 400

    user = User.query.filter_by(email_verification_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid or expired token'}), 400

    if user.email_verification_sent_at and \
       datetime.utcnow() - user.email_verification_sent_at > timedelta(hours=EMAIL_VERIFICATION_EXPIRY_HOURS):
        return jsonify({'error': 'Token expired. Request a new one.'}), 400

    user.email_verified = True
    user.email_verification_token = None
    db.session.commit()

    return jsonify({'message': 'Email verified successfully. You may now use all features.'}), 200


@auth_bp.route('/resend-verification', methods=['POST'])
@limiter.limit('3 per hour')
@jwt_required()
def resend_verification():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.email_verified:
        return jsonify({'message': 'Email already verified'}), 200

    _send_verification_email(user)
    return jsonify({'message': 'Verification email re-sent'}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit('5 per hour')
def forgot_password():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter(db.func.lower(User.email) == email).first()

    if user:
        user.password_reset_token = secrets.token_urlsafe(32)
        user.password_reset_sent_at = datetime.utcnow()
        db.session.commit()

        reset_link = _build_link(f'/reset-password?token={user.password_reset_token}')
        send_email(
            user.email,
            'Reset your TrekNest Bhutan password',
            f'Hi {user.first_name or user.username},\n\n'
            f'Reset your password by visiting:\n{reset_link}\n\n'
            f'This link expires in {PASSWORD_RESET_EXPIRY_HOURS} hour.\n\n'
            f'If you did not request a password reset, ignore this email.\n\n— TrekNest Bhutan'
        )

    # Always return success — don't reveal whether the email exists
    return jsonify({'message': 'If an account with that email exists, a reset link has been sent.'}), 200


@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit('10 per hour')
def reset_password():
    data = request.get_json() or {}
    token = data.get('token')
    new_password = data.get('password')

    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user = User.query.filter_by(password_reset_token=token).first()
    if not user:
        return jsonify({'error': 'Invalid or expired token'}), 400

    if user.password_reset_sent_at and \
       datetime.utcnow() - user.password_reset_sent_at > timedelta(hours=PASSWORD_RESET_EXPIRY_HOURS):
        return jsonify({'error': 'Token expired. Request a new password reset.'}), 400

    user.password = generate_password_hash(new_password)
    user.password_reset_token = None
    user.password_reset_sent_at = None
    db.session.commit()

    return jsonify({'message': 'Password updated successfully. Please log in with your new password.'}), 200


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
