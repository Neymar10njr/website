from datetime import datetime
from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, limiter
from app.models import Booking, Room, User, Accommodation, OperatorProfile
from app.routes import bookings_bp
from app.email_service import send_email


def _send_booking_confirmation(booking, user, total_price, nights):
    """Best-effort confirmation email. Logs to stdout when SMTP not configured."""
    if not user or not user.email:
        return
    try:
        op = OperatorProfile.query.first()
        op_name = op.company_name if op else 'TrekNest Bhutan'
        op_phone = op.support_phone if op else ''
        op_email = op.support_email if op else ''
        send_email(
            user.email,
            f'Booking confirmed — {booking.accommodation.name}',
            (
                f"Hi {user.first_name or user.username},\n\n"
                f"Your stay is booked. Here are the details:\n\n"
                f"  Booking ID:        TNB-STAY-{booking.id:04d}\n"
                f"  Accommodation:     {booking.accommodation.name}\n"
                f"  Address:           {booking.accommodation.address or '—'}\n"
                f"  Room:              {booking.room.room_type or 'Standard'}\n"
                f"  Check-in:          {booking.check_in_date.strftime('%A, %d %B %Y')}\n"
                f"  Check-out:         {booking.check_out_date.strftime('%A, %d %B %Y')}\n"
                f"  Nights:            {nights}\n"
                f"  Guests:            {booking.number_of_guests}\n"
                f"  Total:             Nu. {total_price:,.0f}\n\n"
                f"Need to change something? Contact us with your booking ID:\n"
                f"  Phone:  {op_phone}\n"
                f"  Email:  {op_email}\n\n"
                f"Thank you for booking with {op_name}.\n\n— The {op_name} team"
            )
        )
    except Exception as e:
        current_app.logger.exception('Booking confirmation email failed: %s', e)


VALID_STATUSES = {'pending', 'confirmed', 'cancelled', 'completed'}


def _current_user_id():
    return int(get_jwt_identity())


def _serialize_booking(b):
    return {
        'id': b.id,
        'user_id': b.user_id,
        'room_id': b.room_id,
        'accommodation_id': b.accommodation_id,
        'accommodation_name': b.accommodation.name if b.accommodation else None,
        'room_type': b.room.room_type if b.room else None,
        'room_number': b.room.room_number if b.room else None,
        'price_per_night': b.room.price_per_night if b.room else None,
        'check_in_date': b.check_in_date.isoformat(),
        'check_out_date': b.check_out_date.isoformat(),
        'number_of_guests': b.number_of_guests,
        'total_price': b.total_price,
        'status': b.status,
        'special_requests': b.special_requests,
        'guest_name': (f"{b.user.first_name or ''} {b.user.last_name or ''}".strip() or b.user.username) if b.user else None,
        'guest_phone': b.user.phone if b.user else None,
        'created_at': b.created_at.isoformat() if b.created_at else None
    }


@bookings_bp.route('/check-availability', methods=['GET'])
def check_availability():
    room_id = request.args.get('room_id', type=int)
    check_in_str = request.args.get('check_in_date')
    check_out_str = request.args.get('check_out_date')

    if not room_id or not check_in_str or not check_out_str:
        return jsonify({'error': 'room_id, check_in_date, check_out_date required'}), 400

    try:
        check_in = datetime.fromisoformat(check_in_str)
        check_out = datetime.fromisoformat(check_out_str)
    except ValueError:
        return jsonify({'error': 'Invalid dates'}), 400

    if check_out <= check_in:
        return jsonify({'available': False, 'reason': 'Check-out must be after check-in'}), 200

    conflict = (Booking.query
                .filter(Booking.room_id == room_id)
                .filter(Booking.status.in_(['pending', 'confirmed']))
                .filter(Booking.check_in_date < check_out)
                .filter(Booking.check_out_date > check_in)
                .first())

    if conflict:
        return jsonify({
            'available': False,
            'reason': 'Room booked for those dates',
            'next_available_after': conflict.check_out_date.isoformat()
        }), 200

    return jsonify({'available': True}), 200


@bookings_bp.route('/', methods=['GET'])
@jwt_required()
def list_bookings():
    actor_id = _current_user_id()
    actor = User.query.get(actor_id)
    if not actor:
        return jsonify({'error': 'User not found'}), 404

    scope = request.args.get('scope', 'mine')

    if scope == 'host':
        if actor.user_type != 'host':
            return jsonify({'error': 'Only hosts can view incoming bookings'}), 403
        bookings = (Booking.query
                    .join(Accommodation, Booking.accommodation_id == Accommodation.id)
                    .filter(Accommodation.owner_id == actor_id)
                    .order_by(Booking.created_at.desc())
                    .all())
    else:
        bookings = Booking.query.filter_by(user_id=actor_id).order_by(Booking.created_at.desc()).all()

    return jsonify([_serialize_booking(b) for b in bookings]), 200


@bookings_bp.route('/', methods=['POST'])
@jwt_required()
@limiter.limit('30 per hour')
def create_booking():
    user_id = _current_user_id()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Authenticated user not found'}), 404

    data = request.get_json() or {}

    room_id = data.get('room_id')
    if not room_id:
        return jsonify({'error': 'room_id is required'}), 400

    room = Room.query.get(room_id)
    if not room:
        return jsonify({'error': 'Room not found'}), 404

    try:
        check_in = datetime.fromisoformat(data['check_in_date'])
        check_out = datetime.fromisoformat(data['check_out_date'])
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid check-in / check-out dates'}), 400

    if check_out <= check_in:
        return jsonify({'error': 'Check-out date must be after check-in date'}), 400

    conflict = (Booking.query
                .filter(Booking.room_id == room.id)
                .filter(Booking.status.in_(['pending', 'confirmed']))
                .filter(Booking.check_in_date < check_out)
                .filter(Booking.check_out_date > check_in)
                .first())
    if conflict:
        return jsonify({
            'error': 'This room is already booked for those dates',
            'conflict_check_in': conflict.check_in_date.isoformat(),
            'conflict_check_out': conflict.check_out_date.isoformat()
        }), 409

    nights = (check_out - check_in).days
    total_price = nights * room.price_per_night

    booking = Booking(
        user_id=user_id,
        room_id=room.id,
        accommodation_id=room.accommodation_id,
        check_in_date=check_in,
        check_out_date=check_out,
        number_of_guests=int(data.get('number_of_guests', 1)),
        total_price=total_price,
        special_requests=data.get('special_requests'),
        status='confirmed'
    )

    db.session.add(booking)
    db.session.commit()

    _send_booking_confirmation(booking, user, total_price, nights)

    return jsonify({
        'message': 'Booking confirmed',
        'booking_id': booking.id,
        'total_price': total_price,
        'nights': nights,
        'price_per_night': room.price_per_night
    }), 201


@bookings_bp.route('/<int:booking_id>', methods=['GET'])
@jwt_required()
def get_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)
    actor_id = _current_user_id()

    is_guest = booking.user_id == actor_id
    is_host = booking.accommodation and booking.accommodation.owner_id == actor_id
    if not (is_guest or is_host):
        return jsonify({'error': 'You are not authorized to view this booking'}), 403

    payload = _serialize_booking(booking)
    payload['accommodation_address'] = booking.accommodation.address if booking.accommodation else None
    payload['accommodation_phone'] = booking.accommodation.phone if booking.accommodation else None
    payload['guest_email'] = booking.user.email if booking.user else None
    return jsonify(payload), 200


@bookings_bp.route('/<int:booking_id>/status', methods=['PATCH'])
@jwt_required()
def update_booking_status(booking_id):
    data = request.get_json() or {}
    new_status = data.get('status')
    actor_id = _current_user_id()

    if new_status not in VALID_STATUSES:
        return jsonify({'error': f'Invalid status. Allowed: {sorted(VALID_STATUSES)}'}), 400

    booking = Booking.query.get_or_404(booking_id)

    is_guest = booking.user_id == actor_id
    is_host = booking.accommodation and booking.accommodation.owner_id == actor_id

    if not (is_guest or is_host):
        return jsonify({'error': 'You are not authorized to change this booking'}), 403

    if is_guest and new_status not in {'cancelled'}:
        return jsonify({'error': 'Guests can only cancel their bookings'}), 403

    booking.status = new_status
    db.session.commit()
    return jsonify({'message': 'Booking status updated', 'status': booking.status}), 200
