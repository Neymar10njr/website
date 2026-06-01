import json
import uuid
from flask import request, jsonify
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, limiter
from app.models import Accommodation, Room, User
from app.routes import accommodations_bp
from app.storage import save_image


ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}


def _current_user():
    user_id = int(get_jwt_identity())
    return User.query.get(user_id)


def _gallery_list(acc):
    """Parse the JSON image_gallery column into a list of URLs.
    Falls back to [image_url] for older rows that predate the gallery."""
    if acc.image_gallery:
        try:
            urls = json.loads(acc.image_gallery)
            if isinstance(urls, list) and urls:
                return [u for u in urls if u]
        except (ValueError, TypeError):
            pass
    return [acc.image_url] if acc.image_url else []


def _serialize_listing(acc):
    prices = [r.price_per_night for r in acc.rooms if r.price_per_night is not None]
    return {
        'id': acc.id,
        'name': acc.name,
        'description': acc.description,
        'dzongkhag': acc.dzongkhag,
        'address': acc.address,
        'phone': acc.phone,
        'rating': acc.rating,
        'image_url': acc.image_url,
        'image_gallery': _gallery_list(acc),
        'is_verified': bool(acc.is_verified),
        'rooms_count': len(acc.rooms),
        'price_min': min(prices) if prices else None,
        'price_max': max(prices) if prices else None
    }


@accommodations_bp.route('/', methods=['GET'])
def get_accommodations():
    dzongkhag = request.args.get('dzongkhag')
    owner_id = request.args.get('owner_id', type=int)

    query = Accommodation.query
    if dzongkhag:
        query = query.filter_by(dzongkhag=dzongkhag)
    if owner_id:
        query = query.filter_by(owner_id=owner_id)

    accommodations = query.all()
    return jsonify([_serialize_listing(a) for a in accommodations]), 200


@accommodations_bp.route('/<int:acc_id>', methods=['GET'])
def get_accommodation_detail(acc_id):
    accommodation = Accommodation.query.get_or_404(acc_id)

    rooms = [{
        'id': room.id,
        'room_number': room.room_number,
        'room_type': room.room_type,
        'capacity': room.capacity,
        'price_per_night': room.price_per_night,
        'amenities': room.amenities,
        'is_available': room.is_available
    } for room in accommodation.rooms]

    return jsonify({
        'id': accommodation.id,
        'name': accommodation.name,
        'description': accommodation.description,
        'dzongkhag': accommodation.dzongkhag,
        'address': accommodation.address,
        'phone': accommodation.phone,
        'rating': accommodation.rating,
        'image_url': accommodation.image_url,
        'image_gallery': _gallery_list(accommodation),
        'is_verified': bool(accommodation.is_verified),
        'rooms': rooms
    }), 200


@accommodations_bp.route('/', methods=['POST'])
@jwt_required()
def create_accommodation():
    owner = _current_user()
    if not owner:
        return jsonify({'error': 'Authenticated user not found'}), 404
    if owner.user_type != 'host':
        return jsonify({'error': 'Only Guest House Owners can create accommodations'}), 403

    data = request.get_json() or {}
    if not data.get('name') or not data.get('dzongkhag'):
        return jsonify({'error': 'name and dzongkhag are required'}), 400

    # Image gallery — a list of uploaded image URLs. The cover image (image_url)
    # is the first one, falling back to an explicitly provided image_url.
    gallery = data.get('image_gallery')
    if not isinstance(gallery, list):
        gallery = []
    gallery = [u for u in gallery if isinstance(u, str) and u.strip()]
    cover = (gallery[0] if gallery else None) or data.get('image_url')

    accommodation = Accommodation(
        owner_id=owner.id,
        name=data['name'],
        description=data.get('description'),
        dzongkhag=data['dzongkhag'],
        address=data.get('address'),
        phone=data.get('phone'),
        rating=data.get('rating', 0.0),
        image_url=cover,
        image_gallery=json.dumps(gallery) if gallery else None
    )
    db.session.add(accommodation)
    db.session.flush()

    starting_price = data.get('starting_price')
    if starting_price:
        db.session.add(Room(
            accommodation_id=accommodation.id,
            room_number='Standard',
            room_type=data.get('room_type', 'Standard'),
            capacity=data.get('room_capacity', 2),
            price_per_night=float(starting_price),
            amenities=data.get('amenities')
        ))

    db.session.commit()
    return jsonify({'message': 'Accommodation created', 'accommodation_id': accommodation.id}), 201


@accommodations_bp.route('/upload-image', methods=['POST'])
@jwt_required()
@limiter.limit('30 per hour')
def upload_image():
    owner = _current_user()
    if not owner:
        return jsonify({'error': 'Authenticated user not found'}), 404
    if owner.user_type != 'host':
        return jsonify({'error': 'Only Guest House Owners can upload images'}), 403

    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    file = request.files['image']
    if not file.filename:
        return jsonify({'error': 'Empty filename'}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({'error': 'Invalid file type. Allowed: jpg, jpeg, png, webp'}), 400

    base = secure_filename(file.filename.rsplit('.', 1)[0]) or 'photo'
    unique_name = f'{uuid.uuid4().hex[:8]}_{base}.{ext}'

    content_type = file.mimetype or f'image/{ext}'
    image_url = save_image(file, unique_name, content_type=content_type)

    return jsonify({'image_url': image_url, 'filename': unique_name}), 201
