from datetime import datetime, date

from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db, limiter
from app.models import TrekEvent, TrekEventParticipant, Trek, User, OperatorProfile, StaffProfile
from app.routes import events_bp
from app.email_service import send_email


VALID_EVENT_STATUSES = {'open', 'full', 'in_progress', 'completed', 'cancelled'}
VALID_PARTICIPANT_STATUSES = {'pending', 'paid', 'cancelled'}


def _current_user():
    return User.query.get(int(get_jwt_identity()))


def booking_ref(event_id, participant_id):
    return f'TNB-EVT-{event_id:04d}-P{participant_id:04d}'


def _operator_payload():
    profile = OperatorProfile.query.first()
    return profile.to_dict() if profile else None


def _lead_guide_payload(organiser):
    if not organiser:
        return None
    sp = getattr(organiser, 'staff_profile', None)
    if sp:
        return {
            'display_name': sp.display_name or organiser.first_name or organiser.username,
            'role_title': sp.role_title,
            'photo_url': sp.photo_url,
            'years_experience': sp.years_experience,
            'languages': sp.languages
        }
    name = f"{organiser.first_name or ''} {organiser.last_name or ''}".strip() or organiser.username
    return {'display_name': name, 'role_title': 'Trek Guide'}


def _serialize_event(event, include_participants=False):
    payload = {
        'id': event.id,
        'title': event.title,
        'trek_id': event.trek_id,
        'trek_name': event.trek.name if event.trek else None,
        'trek_image_url': event.trek.image_url if event.trek else None,
        'trek_dzongkhag': event.trek.dzongkhag if event.trek else None,
        'trek_difficulty': event.trek.difficulty if event.trek else None,
        'tour_type': event.trek.tour_type if event.trek else 'trek',
        'country': event.trek.country if event.trek else 'Bhutan',
        'religious_tradition': event.trek.religious_tradition if event.trek else None,
        'sacred_sites': event.trek.sacred_sites if event.trek else None,
        'is_international': bool(event.trek and event.trek.country and event.trek.country != 'Bhutan'),
        'operator': _operator_payload(),
        'organiser_id': event.organiser_id,
        'lead_guide': _lead_guide_payload(event.organiser),
        'start_date': event.start_date.isoformat(),
        'end_date': event.end_date.isoformat(),
        'capacity': event.capacity,
        'spots_left': event.spots_left,
        'confirmed_count': event.confirmed_count,
        'per_person_fee': event.per_person_fee,
        'meeting_point': event.meeting_point,
        'reporting_time': event.reporting_time.strftime('%H:%M') if event.reporting_time else None,
        'contact_phone': event.contact_phone,
        'description': event.description,
        'includes': event.includes,
        'excludes': event.excludes,
        'featured_guest': event.featured_guest,
        'featured_guest_role': event.featured_guest_role,
        'status': event.status,
        'created_at': event.created_at.isoformat() if event.created_at else None
    }
    if include_participants:
        payload['participants'] = [_serialize_participant(p) for p in event.participants]
    return payload


def _serialize_participant(p):
    return {
        'id': p.id,
        'event_id': p.event_id,
        'user_id': p.user_id,
        'username': p.user.username if p.user else None,
        'guest_name': (
            f"{p.user.first_name or ''} {p.user.last_name or ''}".strip()
            or p.user.username
        ) if p.user else None,
        'guest_phone': p.user.phone if p.user else None,
        'guest_email': p.user.email if p.user else None,
        'booking_ref': booking_ref(p.event_id, p.id),
        'status': p.status,
        'payment_method': p.payment_method,
        'note': p.note,
        'joined_at': p.joined_at.isoformat() if p.joined_at else None,
        'paid_at': p.paid_at.isoformat() if p.paid_at else None
    }


def _parse_date(s):
    return datetime.fromisoformat(s).date() if 'T' in s else date.fromisoformat(s)


def _parse_time(s):
    """Accept 'HH:MM' or 'HH:MM:SS'; return a time or None for empty input."""
    if s is None or s == '':
        return None
    parts = s.split(':')
    if len(parts) == 2:
        s = s + ':00'
    return datetime.strptime(s, '%H:%M:%S').time()


@events_bp.route('/', methods=['GET'])
def list_events():
    """Public listing of upcoming, open events. Optional filter by dzongkhag, difficulty, organiser."""
    today = date.today()
    query = TrekEvent.query.join(Trek, TrekEvent.trek_id == Trek.id)

    upcoming_only = request.args.get('upcoming', 'true').lower() != 'false'
    if upcoming_only:
        query = query.filter(TrekEvent.end_date >= today)

    status_filter = request.args.get('status')
    if status_filter:
        query = query.filter(TrekEvent.status == status_filter)

    dzongkhag = request.args.get('dzongkhag')
    if dzongkhag:
        query = query.filter(Trek.dzongkhag == dzongkhag)

    difficulty = request.args.get('difficulty')
    if difficulty:
        query = query.filter(Trek.difficulty == difficulty)

    organiser_id = request.args.get('organiser_id', type=int)
    if organiser_id:
        query = query.filter(TrekEvent.organiser_id == organiser_id)

    events = query.order_by(TrekEvent.start_date.asc()).all()
    return jsonify([_serialize_event(e) for e in events]), 200


@events_bp.route('/<int:event_id>', methods=['GET'])
def get_event(event_id):
    event = TrekEvent.query.get_or_404(event_id)
    auth = request.headers.get('Authorization', '')
    actor_id = None
    if auth.startswith('Bearer '):
        try:
            from flask_jwt_extended import decode_token
            payload = decode_token(auth.split(' ', 1)[1])
            actor_id = int(payload.get('sub'))
        except Exception:
            actor_id = None
    include_participants = actor_id == event.organiser_id
    return jsonify(_serialize_event(event, include_participants=include_participants)), 200


@events_bp.route('/', methods=['POST'])
@jwt_required()
@limiter.limit('20 per hour')
def create_event():
    user = _current_user()
    if not user:
        return jsonify({'error': 'Authenticated user not found'}), 404
    if user.user_type != 'trek_organiser':
        return jsonify({'error': 'Only trek organisers can create events'}), 403

    data = request.get_json() or {}
    required = ['trek_id', 'title', 'start_date', 'end_date', 'capacity', 'per_person_fee']
    for field in required:
        if field not in data or data[field] in (None, ''):
            return jsonify({'error': f'{field} is required'}), 400

    trek = Trek.query.get(data['trek_id'])
    if not trek:
        return jsonify({'error': 'Selected trek not found'}), 404

    try:
        start = _parse_date(data['start_date'])
        end = _parse_date(data['end_date'])
    except ValueError:
        return jsonify({'error': 'Invalid date format (expected YYYY-MM-DD)'}), 400

    if end < start:
        return jsonify({'error': 'end_date must be on or after start_date'}), 400

    capacity = int(data['capacity'])
    if capacity < 1 or capacity > 100:
        return jsonify({'error': 'capacity must be between 1 and 100'}), 400

    fee = float(data['per_person_fee'])
    if fee < 0:
        return jsonify({'error': 'per_person_fee must be non-negative'}), 400

    try:
        reporting_time = _parse_time(data.get('reporting_time'))
    except ValueError:
        return jsonify({'error': 'Invalid reporting_time format (expected HH:MM)'}), 400

    event = TrekEvent(
        organiser_id=user.id,
        trek_id=trek.id,
        title=data['title'],
        start_date=start,
        end_date=end,
        capacity=capacity,
        per_person_fee=fee,
        meeting_point=data.get('meeting_point'),
        reporting_time=reporting_time,
        contact_phone=data.get('contact_phone') or user.phone,
        description=data.get('description'),
        includes=data.get('includes'),
        excludes=data.get('excludes'),
        featured_guest=data.get('featured_guest'),
        featured_guest_role=data.get('featured_guest_role'),
        status='open'
    )
    db.session.add(event)
    db.session.commit()
    return jsonify({'message': 'Event created', 'event_id': event.id}), 201


@events_bp.route('/<int:event_id>', methods=['PATCH'])
@jwt_required()
def update_event(event_id):
    user = _current_user()
    event = TrekEvent.query.get_or_404(event_id)
    if event.organiser_id != user.id:
        return jsonify({'error': 'Only the organiser can update this event'}), 403

    data = request.get_json() or {}
    editable = ['title', 'meeting_point', 'contact_phone', 'description', 'includes', 'excludes',
                'featured_guest', 'featured_guest_role']
    for f in editable:
        if f in data:
            setattr(event, f, data[f])

    if 'reporting_time' in data:
        try:
            event.reporting_time = _parse_time(data['reporting_time'])
        except ValueError:
            return jsonify({'error': 'Invalid reporting_time format (expected HH:MM)'}), 400

    if 'capacity' in data:
        new_cap = int(data['capacity'])
        if new_cap < event.confirmed_count:
            return jsonify({'error': f'Cannot reduce capacity below current participants ({event.confirmed_count})'}), 400
        event.capacity = new_cap

    if 'per_person_fee' in data:
        fee = float(data['per_person_fee'])
        if fee < 0:
            return jsonify({'error': 'per_person_fee must be non-negative'}), 400
        event.per_person_fee = fee

    if 'status' in data:
        if data['status'] not in VALID_EVENT_STATUSES:
            return jsonify({'error': f'Invalid status. Allowed: {sorted(VALID_EVENT_STATUSES)}'}), 400
        event.status = data['status']

    if 'start_date' in data:
        event.start_date = _parse_date(data['start_date'])
    if 'end_date' in data:
        event.end_date = _parse_date(data['end_date'])

    db.session.commit()
    return jsonify({'message': 'Event updated', 'event_id': event.id}), 200


@events_bp.route('/<int:event_id>', methods=['DELETE'])
@jwt_required()
def delete_event(event_id):
    """Soft-cancel: sets status to 'cancelled'. Allowed for the lead guide
    (event.organiser_id) or any admin user. Preserves the row so participants
    still see the cancellation in their history."""
    user = _current_user()
    event = TrekEvent.query.get_or_404(event_id)
    if event.organiser_id != user.id and user.user_type != 'admin':
        return jsonify({'error': 'Only the lead guide or an admin can cancel this event'}), 403

    event.status = 'cancelled'
    db.session.commit()
    return jsonify({'message': 'Event cancelled', 'event_id': event.id}), 200


@events_bp.route('/mine', methods=['GET'])
@jwt_required()
def list_my_events():
    """Returns events relevant to the authenticated user.
       - For organisers: events they created, with participants embedded.
       - For tourists/locals: events they joined, with their participation status.
    """
    user = _current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.user_type == 'trek_organiser':
        events = (TrekEvent.query
                  .filter_by(organiser_id=user.id)
                  .order_by(TrekEvent.start_date.desc())
                  .all())
        return jsonify([_serialize_event(e, include_participants=True) for e in events]), 200

    parts = (TrekEventParticipant.query
             .filter_by(user_id=user.id)
             .order_by(TrekEventParticipant.joined_at.desc())
             .all())
    payload = []
    for p in parts:
        ev = _serialize_event(p.event)
        ev['my_participation'] = {
            'participant_id': p.id,
            'status': p.status,
            'joined_at': p.joined_at.isoformat() if p.joined_at else None,
            'paid_at': p.paid_at.isoformat() if p.paid_at else None
        }
        payload.append(ev)
    return jsonify(payload), 200


@events_bp.route('/<int:event_id>/join', methods=['POST'])
@jwt_required()
@limiter.limit('30 per hour')
def join_event(event_id):
    user = _current_user()
    if not user:
        return jsonify({'error': 'Authenticated user not found'}), 404
    if user.user_type == 'trek_organiser':
        return jsonify({'error': 'Organisers cannot join events as participants'}), 403

    event = TrekEvent.query.get_or_404(event_id)
    if event.status not in ('open',):
        return jsonify({'error': f'Event is {event.status}; cannot join'}), 409
    if event.spots_left <= 0:
        return jsonify({'error': 'Event is fully booked'}), 409

    existing = TrekEventParticipant.query.filter_by(event_id=event.id, user_id=user.id).first()
    if existing:
        if existing.status == 'cancelled':
            existing.status = 'pending'
            existing.joined_at = datetime.utcnow()
            db.session.commit()
            return jsonify({'message': 'Re-joined event', 'participant_id': existing.id, 'status': existing.status}), 200
        return jsonify({'error': f'You have already joined this event (status: {existing.status})'}), 409

    data = request.get_json() or {}
    participant = TrekEventParticipant(
        event_id=event.id,
        user_id=user.id,
        status='pending',
        note=data.get('note')
    )
    db.session.add(participant)

    # Auto-flip event to "full" if this fills it
    if event.spots_left - 1 <= 0:
        event.status = 'full'

    db.session.commit()
    operator = OperatorProfile.query.first()
    ref = booking_ref(event.id, participant.id)

    # Fire-and-forget confirmation email (logs to stdout when SMTP unconfigured)
    try:
        if user.email:
            op_name = operator.company_name if operator else 'TrekNest Bhutan'
            op_phone = operator.support_phone if operator else ''
            op_email = operator.support_email if operator else ''
            send_email(
                user.email,
                f'Reserved: {event.title}',
                (
                    f"Hi {user.first_name or user.username},\n\n"
                    f"You're on the list — here are your reservation details.\n\n"
                    f"  Booking ref:       {ref}\n"
                    f"  Tour:              {event.trek.name if event.trek else event.title}\n"
                    f"  Event:             {event.title}\n"
                    f"  Dates:             {event.start_date.strftime('%d %b %Y')}  ->  {event.end_date.strftime('%d %b %Y')}\n"
                    f"  Per-person fee:    Nu. {event.per_person_fee:,.0f}\n"
                    f"  Meeting point:     {event.meeting_point or 'TBA — we will confirm closer to the date'}\n"
                    f"  Reporting time:    {event.reporting_time.strftime('%H:%M') if event.reporting_time else 'TBA — we will confirm closer to the date'}\n\n"
                    f"Next step:\n"
                    f"{op_name} will contact you within one business day with payment instructions.\n"
                    f"Quote the booking ref ({ref}) in any message so we can find your reservation quickly.\n\n"
                    f"Contact:\n"
                    f"  Phone:  {op_phone}\n"
                    f"  Email:  {op_email}\n\n"
                    f"— The {op_name} team"
                )
            )
    except Exception as e:
        current_app.logger.exception('Event join confirmation email failed: %s', e)

    return jsonify({
        'message': 'Joined successfully. TrekNest Bhutan will reach out shortly with payment details.',
        'participant_id': participant.id,
        'booking_ref': ref,
        'status': participant.status,
        'operator': operator.to_dict() if operator else None
    }), 201


@events_bp.route('/<int:event_id>/participants/<int:participant_id>', methods=['PATCH'])
@jwt_required()
def update_participant(event_id, participant_id):
    """Organiser marks a participant as paid/cancelled. Participant can self-cancel."""
    user = _current_user()
    event = TrekEvent.query.get_or_404(event_id)
    participant = TrekEventParticipant.query.filter_by(id=participant_id, event_id=event_id).first_or_404()

    is_organiser = event.organiser_id == user.id
    is_self = participant.user_id == user.id

    if not (is_organiser or is_self):
        return jsonify({'error': 'Not authorised to modify this participant'}), 403

    data = request.get_json() or {}
    new_status = data.get('status')
    if new_status not in VALID_PARTICIPANT_STATUSES:
        return jsonify({'error': f'Invalid status. Allowed: {sorted(VALID_PARTICIPANT_STATUSES)}'}), 400

    if is_self and not is_organiser and new_status != 'cancelled':
        return jsonify({'error': 'Participants can only cancel their own joined event'}), 403

    previous_status = participant.status
    participant.status = new_status
    if new_status == 'paid':
        participant.paid_at = datetime.utcnow()
        if 'payment_method' in data:
            participant.payment_method = data['payment_method']
    if 'note' in data and is_organiser:
        participant.note = data['note']

    # Auto-toggle event open/full
    if previous_status in ('pending', 'paid') and new_status == 'cancelled' and event.status == 'full':
        event.status = 'open'
    elif new_status in ('pending', 'paid') and event.spots_left - 1 <= 0:
        event.status = 'full'

    db.session.commit()
    return jsonify({'message': 'Participant updated', 'participant_id': participant.id, 'status': participant.status}), 200
