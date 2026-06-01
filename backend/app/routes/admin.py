import os
import secrets
import uuid
from datetime import datetime, date

from flask import request, jsonify
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.storage import save_image

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}

from app import db, limiter
from app.models import (
    MasterImage, OperatorProfile, StaffProfile, User,
    Accommodation, Room, Booking, TrekEvent, TrekEventParticipant, Trek, Moment
)
from app.routes import admin_bp
from config import Config


def _require_admin():
    user_id = get_jwt_identity()
    if not user_id:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    user = User.query.get(int(user_id))
    if not user:
        return None, (jsonify({'error': 'User not found'}), 404)
    if user.user_type != 'admin':
        return None, (jsonify({'error': 'Admin access required'}), 403)
    return user, None


# ---------- Master images ----------

@admin_bp.route('/images', methods=['GET'])
def get_images():
    section = request.args.get('section')
    if section:
        images = MasterImage.query.filter_by(section=section, is_active=True).order_by(MasterImage.display_order).all()
    else:
        images = MasterImage.query.filter_by(is_active=True).all()
    return jsonify([{
        'id': img.id,
        'image_name': img.image_name,
        'image_path': img.image_path,
        'section': img.section,
        'description': img.description
    } for img in images]), 200


@admin_bp.route('/images/upload', methods=['POST'])
@jwt_required()
def upload_image():
    _, err = _require_admin()
    if err:
        return err

    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    section = request.form.get('section')
    if not file or not section:
        return jsonify({'error': 'Invalid request'}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({'error': f'Invalid file type. Allowed: {", ".join(sorted(ALLOWED_IMAGE_EXTENSIONS))}'}), 400

    base = secure_filename(file.filename.rsplit('.', 1)[0]) or 'image'
    unique_name = f'{uuid.uuid4().hex[:8]}_{base}.{ext}'
    content_type = file.mimetype or f'image/{ext}'
    image_url = save_image(file, unique_name, content_type=content_type)

    image = MasterImage(
        image_name=unique_name,
        image_path=image_url,
        section=section,
        description=request.form.get('description')
    )
    db.session.add(image)
    db.session.commit()
    return jsonify({'message': 'Image uploaded', 'image_id': image.id, 'image_path': image_url}), 201


@admin_bp.route('/images/<int:image_id>', methods=['DELETE'])
@jwt_required()
def delete_image(image_id):
    _, err = _require_admin()
    if err:
        return err
    image = MasterImage.query.get_or_404(image_id)
    db.session.delete(image)
    db.session.commit()
    return jsonify({'message': 'Image deleted'}), 200


# ---------- Operator profile (single-row, TrekNest brand) ----------

@admin_bp.route('/operator', methods=['GET'])
def get_operator_profile():
    profile = OperatorProfile.query.first()
    if not profile:
        return jsonify({'error': 'Operator profile not configured'}), 404
    return jsonify(profile.to_dict()), 200


@admin_bp.route('/operator', methods=['PATCH'])
@jwt_required()
def update_operator_profile():
    _, err = _require_admin()
    if err:
        return err

    profile = OperatorProfile.query.first()
    if not profile:
        return jsonify({'error': 'Operator profile not configured'}), 404

    data = request.get_json() or {}
    editable = [
        'company_name', 'tagline', 'licence_number', 'logo_url',
        'support_phone', 'whatsapp_number', 'support_email', 'website',
        'office_address', 'business_hours', 'description', 'years_active'
    ]
    for f in editable:
        if f in data:
            setattr(profile, f, data[f])
    db.session.commit()
    return jsonify({'message': 'Operator profile updated', 'profile': profile.to_dict()}), 200


# ---------- Staff invitation (creates trek_organiser users) ----------

@admin_bp.route('/staff/invite', methods=['POST'])
@jwt_required()
@limiter.limit('20 per hour')
def invite_staff():
    """Admin creates a trek_organiser staff account. Returns the temporary password
    that the admin should share with the staff member out-of-band; staff is expected
    to change it on first login (frontend handles that flow)."""
    _, err = _require_admin()
    if err:
        return err

    data = request.get_json() or {}
    required = ['username', 'email', 'first_name', 'last_name']
    for f in required:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400

    temp_password = data.get('password') or secrets.token_urlsafe(12)

    user = User(
        username=data['username'],
        email=data['email'],
        password=generate_password_hash(temp_password),
        first_name=data['first_name'],
        last_name=data['last_name'],
        phone=data.get('phone'),
        user_type='trek_organiser',
        email_verified=True,
        must_change_password=True
    )
    db.session.add(user)
    db.session.flush()

    staff = StaffProfile(
        user_id=user.id,
        display_name=f"{data['first_name']} {data['last_name']}".strip(),
        role_title=data.get('role_title') or 'Trek Guide',
        bio=data.get('bio'),
        photo_url=data.get('photo_url'),
        guide_licence_no=data.get('guide_licence_no'),
        certifications=data.get('certifications'),
        years_experience=data.get('years_experience'),
        languages=data.get('languages'),
        is_active=True
    )
    db.session.add(staff)
    db.session.commit()

    return jsonify({
        'message': 'Staff account created',
        'user_id': user.id,
        'username': user.username,
        'temporary_password': temp_password,
        'staff_profile': staff.to_dict()
    }), 201


@admin_bp.route('/staff', methods=['GET'])
@jwt_required()
def list_staff():
    _, err = _require_admin()
    if err:
        return err
    profiles = (StaffProfile.query
                .join(User, StaffProfile.user_id == User.id)
                .order_by(StaffProfile.id.asc())
                .all())
    payload = []
    for sp in profiles:
        d = sp.to_dict()
        d['username'] = sp.user.username if sp.user else None
        d['email'] = sp.user.email if sp.user else None
        d['phone'] = sp.user.phone if sp.user else None
        payload.append(d)
    return jsonify(payload), 200


@admin_bp.route('/staff/<int:staff_id>', methods=['PATCH'])
@jwt_required()
def update_staff(staff_id):
    _, err = _require_admin()
    if err:
        return err
    staff = StaffProfile.query.get_or_404(staff_id)
    data = request.get_json() or {}
    editable = ['display_name', 'role_title', 'bio', 'photo_url',
                'guide_licence_no', 'certifications', 'years_experience',
                'languages', 'is_active']
    for f in editable:
        if f in data:
            setattr(staff, f, data[f])
    db.session.commit()
    return jsonify({'message': 'Staff updated', 'staff': staff.to_dict()}), 200


# ---------- Generic admin image upload (tours, master images, etc.) ----------

@admin_bp.route('/upload-image', methods=['POST'])
@jwt_required()
@limiter.limit('60 per hour')
def admin_upload_image():
    """Upload an image and return its public URL. Admin can paste the URL into
    any image field (tour image_url, operator logo, etc.) without manually
    SCP'ing files to the server."""
    _, err = _require_admin()
    if err:
        return err
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    file = request.files['image']
    if not file.filename:
        return jsonify({'error': 'Empty filename'}), 400
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({'error': f'Invalid file type. Allowed: {", ".join(sorted(ALLOWED_IMAGE_EXTENSIONS))}'}), 400
    base = secure_filename(file.filename.rsplit('.', 1)[0]) or 'image'
    unique_name = f'{uuid.uuid4().hex[:8]}_{base}.{ext}'
    content_type = file.mimetype or f'image/{ext}'
    image_url = save_image(file, unique_name, content_type=content_type)
    return jsonify({'image_url': image_url, 'filename': unique_name}), 201


# ---------- Tour catalogue CRUD (treks / hikes / pilgrimages) ----------

VALID_TOUR_TYPES = {'trek', 'hike', 'pilgrimage'}


def _serialize_tour_full(t):
    return {
        'id': t.id,
        'name': t.name,
        'description': t.description,
        'tour_type': t.tour_type,
        'country': t.country,
        'religious_tradition': t.religious_tradition,
        'sacred_sites': t.sacred_sites,
        'difficulty': t.difficulty,
        'duration_days': t.duration_days,
        'distance_km': t.distance_km,
        'dzongkhag': t.dzongkhag,
        'altitude_start': t.altitude_start,
        'altitude_end': t.altitude_end,
        'best_season': t.best_season,
        'image_url': t.image_url,
        'events_count': len(t.events) if hasattr(t, 'events') else 0,
        'stops': [{
            'id': s.id,
            'stop_name': s.stop_name,
            'stop_order': s.stop_order,
            'altitude': s.altitude,
            'description': s.description
        } for s in sorted(t.stops, key=lambda x: x.stop_order or 0)]
    }


def _apply_tour_payload(tour, data):
    """Apply (create/update) payload to a Trek instance. Caller commits."""
    str_fields = ['name', 'description', 'religious_tradition', 'sacred_sites',
                  'difficulty', 'dzongkhag', 'best_season', 'image_url', 'country']
    for f in str_fields:
        if f in data:
            v = data[f]
            setattr(tour, f, v.strip() if isinstance(v, str) and v.strip() else (v if v else None))

    if 'tour_type' in data:
        if data['tour_type'] not in VALID_TOUR_TYPES:
            return f'tour_type must be one of {sorted(VALID_TOUR_TYPES)}'
        tour.tour_type = data['tour_type']

    for f in ['duration_days', 'altitude_start', 'altitude_end']:
        if f in data:
            v = data[f]
            try:
                tour.__setattr__(f, int(v) if v not in (None, '') else None)
            except (TypeError, ValueError):
                return f'{f} must be an integer'

    if 'distance_km' in data:
        v = data['distance_km']
        try:
            tour.distance_km = float(v) if v not in (None, '') else None
        except (TypeError, ValueError):
            return 'distance_km must be a number'

    # Defaults for required NOT NULL columns when creating
    if not tour.country:
        tour.country = 'Bhutan'
    if not tour.tour_type:
        tour.tour_type = 'trek'

    return None


def _replace_tour_stops(tour, stops):
    """Wipe and recreate stops. Detaches accommodations first to avoid FK violation."""
    old_stop_ids = [s.id for s in tour.stops]
    if old_stop_ids:
        linked = Accommodation.query.filter(Accommodation.trek_stop_id.in_(old_stop_ids)).all()
        for acc in linked:
            acc.trek_stop_id = None
    for s in list(tour.stops):
        db.session.delete(s)
    db.session.flush()
    for i, stop in enumerate(stops or [], start=1):
        name = (stop.get('stop_name') or '').strip()
        if not name:
            continue
        alt = stop.get('altitude')
        try:
            alt = int(alt) if alt not in (None, '') else None
        except (TypeError, ValueError):
            alt = None
        from app.models import TrekStop
        db.session.add(TrekStop(
            trek_id=tour.id,
            stop_name=name,
            stop_order=i,
            altitude=alt,
            description=(stop.get('description') or '').strip() or None
        ))


@admin_bp.route('/tours', methods=['GET'])
@jwt_required()
def admin_list_tours():
    _, err = _require_admin()
    if err:
        return err
    tour_type = request.args.get('tour_type')
    country_filter = request.args.get('country')
    query = Trek.query
    if tour_type:
        query = query.filter_by(tour_type=tour_type)
    if country_filter:
        query = query.filter_by(country=country_filter)
    tours = query.order_by(Trek.tour_type.asc(), Trek.name.asc()).all()
    return jsonify([_serialize_tour_full(t) for t in tours]), 200


@admin_bp.route('/tours/<int:tour_id>', methods=['GET'])
@jwt_required()
def admin_get_tour(tour_id):
    _, err = _require_admin()
    if err:
        return err
    tour = Trek.query.get_or_404(tour_id)
    return jsonify(_serialize_tour_full(tour)), 200


@admin_bp.route('/tours', methods=['POST'])
@jwt_required()
@limiter.limit('60 per hour')
def admin_create_tour():
    _, err = _require_admin()
    if err:
        return err
    data = request.get_json() or {}
    for f in ['name', 'tour_type', 'dzongkhag']:
        if not data.get(f):
            return jsonify({'error': f'{f} is required'}), 400

    tour = Trek()
    apply_err = _apply_tour_payload(tour, data)
    if apply_err:
        return jsonify({'error': apply_err}), 400

    db.session.add(tour)
    db.session.flush()
    _replace_tour_stops(tour, data.get('stops'))
    db.session.commit()
    return jsonify({'message': 'Tour created', 'tour_id': tour.id, 'tour': _serialize_tour_full(tour)}), 201


@admin_bp.route('/tours/<int:tour_id>', methods=['PATCH'])
@jwt_required()
def admin_update_tour(tour_id):
    _, err = _require_admin()
    if err:
        return err
    tour = Trek.query.get_or_404(tour_id)
    data = request.get_json() or {}
    apply_err = _apply_tour_payload(tour, data)
    if apply_err:
        return jsonify({'error': apply_err}), 400

    if 'stops' in data:
        _replace_tour_stops(tour, data['stops'])

    db.session.commit()
    return jsonify({'message': 'Tour updated', 'tour_id': tour.id, 'tour': _serialize_tour_full(tour)}), 200


@admin_bp.route('/tours/<int:tour_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_tour(tour_id):
    _, err = _require_admin()
    if err:
        return err
    tour = Trek.query.get_or_404(tour_id)

    stop_ids = [s.id for s in tour.stops]
    if stop_ids:
        linked = Accommodation.query.filter(Accommodation.trek_stop_id.in_(stop_ids)).all()
        for acc in linked:
            acc.trek_stop_id = None

    events = TrekEvent.query.filter_by(trek_id=tour.id).all()
    event_count = len(events)
    for ev in events:
        db.session.delete(ev)
    db.session.flush()

    db.session.delete(tour)
    db.session.commit()
    return jsonify({
        'message': 'Tour deleted',
        'tour_id': tour_id,
        'events_deleted': event_count
    }), 200


# ---------- Public team listing (for "Our Team" homepage section) ----------

@admin_bp.route('/team', methods=['GET'])
def public_team():
    """Public-facing list of active staff for the 'Our Team' section."""
    profiles = (StaffProfile.query
                .filter_by(is_active=True)
                .order_by(StaffProfile.id.asc())
                .all())
    return jsonify([{
        'display_name': sp.display_name,
        'role_title': sp.role_title,
        'bio': sp.bio,
        'photo_url': sp.photo_url,
        'years_experience': sp.years_experience,
        'languages': sp.languages
    } for sp in profiles]), 200


# ---------- Admin overview / stats ----------

@admin_bp.route('/overview', methods=['GET'])
@jwt_required()
def overview():
    _, err = _require_admin()
    if err:
        return err
    return jsonify({
        'users_total': User.query.count(),
        'users_by_type': {
            t: User.query.filter_by(user_type=t).count()
            for t in ['tourist', 'local_tourist', 'host', 'trek_organiser', 'admin']
        },
        'accommodations_total': Accommodation.query.count(),
        'accommodations_verified': Accommodation.query.filter_by(is_verified=True).count(),
        'accommodations_pending': Accommodation.query.filter_by(is_verified=False).count(),
        'tours_total': Trek.query.count(),
        'tours_by_type': {
            t: Trek.query.filter_by(tour_type=t).count()
            for t in ['trek', 'hike', 'pilgrimage']
        },
        'events_total': TrekEvent.query.count(),
        'events_open': TrekEvent.query.filter_by(status='open').count(),
        'bookings_total': Booking.query.count(),
        'bookings_by_status': {
            s: Booking.query.filter_by(status=s).count()
            for s in ['pending', 'confirmed', 'cancelled', 'completed']
        },
        'event_participants_total': TrekEventParticipant.query.count(),
        'staff_active': StaffProfile.query.filter_by(is_active=True).count()
    }), 200


# ---------- Accommodations moderation ----------

@admin_bp.route('/accommodations', methods=['GET'])
@jwt_required()
def list_all_accommodations():
    _, err = _require_admin()
    if err:
        return err
    verified_filter = request.args.get('verified')
    query = Accommodation.query
    if verified_filter == 'true':
        query = query.filter_by(is_verified=True)
    elif verified_filter == 'false':
        query = query.filter_by(is_verified=False)
    accs = query.order_by(Accommodation.created_at.desc()).all()
    return jsonify([{
        'id': a.id,
        'name': a.name,
        'dzongkhag': a.dzongkhag,
        'address': a.address,
        'phone': a.phone,
        'rating': a.rating,
        'image_url': a.image_url,
        'is_verified': a.is_verified,
        'rooms_count': len(a.rooms),
        'owner_id': a.owner_id,
        'owner_name': (f"{a.owner.first_name or ''} {a.owner.last_name or ''}".strip() or a.owner.username) if a.owner else None,
        'owner_email': a.owner.email if a.owner else None,
        'owner_phone': a.owner.phone if a.owner else None,
        'created_at': a.created_at.isoformat() if a.created_at else None
    } for a in accs]), 200


@admin_bp.route('/accommodations/<int:acc_id>/verify', methods=['PATCH'])
@jwt_required()
def verify_accommodation(acc_id):
    _, err = _require_admin()
    if err:
        return err
    acc = Accommodation.query.get_or_404(acc_id)
    data = request.get_json() or {}
    acc.is_verified = bool(data.get('is_verified', True))
    db.session.commit()
    return jsonify({'message': 'Verification updated', 'is_verified': acc.is_verified}), 200


@admin_bp.route('/accommodations/<int:acc_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_accommodation(acc_id):
    """Permanently remove an accommodation — and its rooms + bookings (cascade)."""
    _, err = _require_admin()
    if err:
        return err
    acc = Accommodation.query.get_or_404(acc_id)
    rooms = len(acc.rooms)
    bookings = len(acc.bookings)
    db.session.delete(acc)
    db.session.commit()
    return jsonify({
        'message': 'Accommodation deleted',
        'accommodation_id': acc_id,
        'rooms_deleted': rooms,
        'bookings_deleted': bookings
    }), 200


# ---------- Trek Moments (curated photo highlights) ----------

@admin_bp.route('/moments', methods=['POST'])
@jwt_required()
@limiter.limit('60 per hour')
def admin_create_moment():
    actor, err = _require_admin()
    if err:
        return err
    data = request.get_json() or {}
    if not data.get('image_url'):
        return jsonify({'error': 'image_url is required'}), 400
    moment = Moment(
        image_url=data['image_url'],
        caption=(data.get('caption') or '').strip() or None,
        trek_id=data.get('trek_id') or None,
        created_by=actor.id
    )
    db.session.add(moment)
    db.session.commit()
    return jsonify({'message': 'Moment posted', 'moment': moment.to_dict()}), 201


@admin_bp.route('/moments/<int:moment_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_moment(moment_id):
    _, err = _require_admin()
    if err:
        return err
    moment = Moment.query.get_or_404(moment_id)
    db.session.delete(moment)
    db.session.commit()
    return jsonify({'message': 'Moment deleted', 'moment_id': moment_id}), 200


# ---------- All bookings (admin) ----------

@admin_bp.route('/bookings', methods=['GET'])
@jwt_required()
def list_all_bookings():
    _, err = _require_admin()
    if err:
        return err
    status_filter = request.args.get('status')
    query = Booking.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    bookings = query.order_by(Booking.created_at.desc()).limit(500).all()
    return jsonify([{
        'id': b.id,
        'guest_name': (f"{b.user.first_name or ''} {b.user.last_name or ''}".strip() or b.user.username) if b.user else None,
        'guest_email': b.user.email if b.user else None,
        'guest_phone': b.user.phone if b.user else None,
        'accommodation_id': b.accommodation_id,
        'accommodation_name': b.accommodation.name if b.accommodation else None,
        'room_type': b.room.room_type if b.room else None,
        'check_in_date': b.check_in_date.isoformat(),
        'check_out_date': b.check_out_date.isoformat(),
        'number_of_guests': b.number_of_guests,
        'total_price': b.total_price,
        'status': b.status,
        'created_at': b.created_at.isoformat() if b.created_at else None
    } for b in bookings]), 200


# ---------- All events (admin) ----------

def _parse_date(s):
    return datetime.fromisoformat(s).date() if 'T' in s else date.fromisoformat(s)


def _parse_time(s):
    if s is None or s == '':
        return None
    parts = s.split(':')
    if len(parts) == 2:
        s = s + ':00'
    return datetime.strptime(s, '%H:%M:%S').time()


@admin_bp.route('/events', methods=['POST'])
@jwt_required()
@limiter.limit('60 per hour')
def admin_create_event():
    """Admin creates a tour event on behalf of a chosen staff guide.
    The chosen guide becomes the event's organiser_id and will see the event in their
    dashboard. Operator branding (TrekNest Bhutan) is shown publicly regardless."""
    actor, err = _require_admin()
    if err:
        return err

    data = request.get_json() or {}
    required = ['trek_id', 'lead_guide_user_id', 'title', 'start_date', 'end_date', 'capacity', 'per_person_fee']
    for field in required:
        if data.get(field) in (None, ''):
            return jsonify({'error': f'{field} is required'}), 400

    lead = User.query.get(int(data['lead_guide_user_id']))
    if not lead or lead.user_type != 'trek_organiser':
        return jsonify({'error': 'lead_guide_user_id must be an active trek_organiser staff user'}), 400
    if not lead.is_active:
        return jsonify({'error': 'Selected staff member is deactivated'}), 400

    trek = Trek.query.get(int(data['trek_id']))
    if not trek:
        return jsonify({'error': 'Selected tour not found'}), 404

    try:
        start = _parse_date(data['start_date'])
        end = _parse_date(data['end_date'])
    except ValueError:
        return jsonify({'error': 'Invalid date format (expected YYYY-MM-DD)'}), 400

    if end < start:
        return jsonify({'error': 'end_date must be on or after start_date'}), 400

    try:
        capacity = int(data['capacity'])
    except (TypeError, ValueError):
        return jsonify({'error': 'capacity must be an integer'}), 400
    if capacity < 1 or capacity > 100:
        return jsonify({'error': 'capacity must be between 1 and 100'}), 400

    try:
        fee = float(data['per_person_fee'])
    except (TypeError, ValueError):
        return jsonify({'error': 'per_person_fee must be a number'}), 400
    if fee < 0:
        return jsonify({'error': 'per_person_fee must be non-negative'}), 400

    contact_phone = data.get('contact_phone') or None
    if not contact_phone:
        op = OperatorProfile.query.first()
        contact_phone = op.support_phone if op else None

    try:
        reporting_time = _parse_time(data.get('reporting_time'))
    except ValueError:
        return jsonify({'error': 'Invalid reporting_time format (expected HH:MM)'}), 400

    event = TrekEvent(
        organiser_id=lead.id,
        trek_id=trek.id,
        title=data['title'],
        start_date=start,
        end_date=end,
        capacity=capacity,
        per_person_fee=fee,
        meeting_point=data.get('meeting_point'),
        reporting_time=reporting_time,
        contact_phone=contact_phone,
        description=data.get('description'),
        includes=data.get('includes'),
        excludes=data.get('excludes'),
        featured_guest=data.get('featured_guest'),
        featured_guest_role=data.get('featured_guest_role'),
        status='open'
    )
    db.session.add(event)
    db.session.commit()
    lead_name = (f"{lead.first_name or ''} {lead.last_name or ''}".strip() or lead.username)
    return jsonify({
        'message': 'Event created',
        'event_id': event.id,
        'lead_guide': lead_name,
        'tour_name': trek.name,
        'tour_type': trek.tour_type
    }), 201


@admin_bp.route('/events/<int:event_id>', methods=['PATCH'])
@jwt_required()
def admin_update_event(event_id):
    """Admin edits any event — including ones created by staff guides.
    Supports updating content, dates, capacity, fee, lead guide, and featured guest."""
    _, err = _require_admin()
    if err:
        return err
    event = TrekEvent.query.get_or_404(event_id)
    data = request.get_json() or {}

    # Reassign the lead guide
    if data.get('lead_guide_user_id'):
        lead = User.query.get(int(data['lead_guide_user_id']))
        if not lead or lead.user_type != 'trek_organiser':
            return jsonify({'error': 'lead_guide_user_id must be an active trek_organiser staff user'}), 400
        if not lead.is_active:
            return jsonify({'error': 'Selected staff member is deactivated'}), 400
        event.organiser_id = lead.id

    # Plain string fields
    for f in ['title', 'meeting_point', 'contact_phone', 'description',
              'includes', 'excludes', 'featured_guest', 'featured_guest_role']:
        if f in data:
            v = data[f]
            setattr(event, f, v.strip() if isinstance(v, str) and v.strip() else (v if v else None))

    if 'reporting_time' in data:
        try:
            event.reporting_time = _parse_time(data['reporting_time'])
        except ValueError:
            return jsonify({'error': 'Invalid reporting_time format (expected HH:MM)'}), 400

    # Dates
    if data.get('start_date'):
        try:
            event.start_date = _parse_date(data['start_date'])
        except ValueError:
            return jsonify({'error': 'Invalid start_date format (expected YYYY-MM-DD)'}), 400
    if data.get('end_date'):
        try:
            event.end_date = _parse_date(data['end_date'])
        except ValueError:
            return jsonify({'error': 'Invalid end_date format (expected YYYY-MM-DD)'}), 400
    if event.end_date < event.start_date:
        return jsonify({'error': 'end_date must be on or after start_date'}), 400

    # Capacity — cannot drop below current participant count
    if data.get('capacity') not in (None, ''):
        try:
            cap = int(data['capacity'])
        except (TypeError, ValueError):
            return jsonify({'error': 'capacity must be an integer'}), 400
        if cap < event.confirmed_count:
            return jsonify({'error': f'Capacity cannot be below current participant count ({event.confirmed_count})'}), 400
        if cap < 1 or cap > 100:
            return jsonify({'error': 'capacity must be between 1 and 100'}), 400
        event.capacity = cap

    # Fee
    if data.get('per_person_fee') not in (None, ''):
        try:
            fee = float(data['per_person_fee'])
        except (TypeError, ValueError):
            return jsonify({'error': 'per_person_fee must be a number'}), 400
        if fee < 0:
            return jsonify({'error': 'per_person_fee must be non-negative'}), 400
        event.per_person_fee = fee

    db.session.commit()
    return jsonify({'message': 'Event updated', 'event_id': event.id}), 200


@admin_bp.route('/events/<int:event_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_event(event_id):
    """Hard-delete: permanently removes the event AND its participant records.
    Use Cancel for soft-delete that preserves history."""
    _, err = _require_admin()
    if err:
        return err
    event = TrekEvent.query.get_or_404(event_id)
    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Event permanently deleted', 'event_id': event_id}), 200


@admin_bp.route('/events', methods=['GET'])
@jwt_required()
def list_all_events():
    _, err = _require_admin()
    if err:
        return err
    events = TrekEvent.query.order_by(TrekEvent.start_date.desc()).all()
    return jsonify([{
        'id': e.id,
        'title': e.title,
        'trek_id': e.trek_id,
        'trek_name': e.trek.name if e.trek else None,
        'tour_type': e.trek.tour_type if e.trek else 'trek',
        'country': e.trek.country if e.trek else 'Bhutan',
        'organiser_id': e.organiser_id,
        'organiser_name': (f"{e.organiser.first_name or ''} {e.organiser.last_name or ''}".strip() or e.organiser.username) if e.organiser else None,
        'start_date': e.start_date.isoformat(),
        'end_date': e.end_date.isoformat(),
        'capacity': e.capacity,
        'spots_left': e.spots_left,
        'confirmed_count': e.confirmed_count,
        'per_person_fee': e.per_person_fee,
        'status': e.status,
        'created_at': e.created_at.isoformat() if e.created_at else None
    } for e in events]), 200


# ---------- All users (admin) ----------

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def list_all_users():
    _, err = _require_admin()
    if err:
        return err
    user_type = request.args.get('user_type')
    query = User.query
    if user_type:
        query = query.filter_by(user_type=user_type)
    users = query.order_by(User.created_at.desc()).limit(500).all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'first_name': u.first_name,
        'last_name': u.last_name,
        'phone': u.phone,
        'user_type': u.user_type,
        'email_verified': u.email_verified,
        'is_active': u.is_active,
        'created_at': u.created_at.isoformat() if u.created_at else None
    } for u in users]), 200


@admin_bp.route('/users/<int:user_id>/active', methods=['PATCH'])
@jwt_required()
def set_user_active(user_id):
    actor, err = _require_admin()
    if err:
        return err
    if user_id == actor.id:
        return jsonify({'error': 'You cannot deactivate your own admin account'}), 400
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    user.is_active = bool(data.get('is_active', True))
    db.session.commit()
    return jsonify({'message': 'User updated', 'is_active': user.is_active}), 200
