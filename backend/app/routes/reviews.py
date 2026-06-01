from datetime import datetime

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db, limiter
from app.models import Review, User, Accommodation, Trek
from app.routes import reviews_bp


def _recompute_accommodation_rating(acc_id):
    """Keep Accommodation.rating in sync with the average of its reviews."""
    revs = Review.query.filter_by(target_type='accommodation', target_id=acc_id).all()
    acc = Accommodation.query.get(acc_id)
    if acc:
        acc.rating = round(sum(r.rating for r in revs) / len(revs), 1) if revs else 0.0


@reviews_bp.route('/', methods=['GET'])
def list_reviews():
    """Public — list reviews for an accommodation or a tour."""
    target_type = request.args.get('target_type')
    target_id = request.args.get('target_id', type=int)
    if target_type not in ('accommodation', 'tour') or not target_id:
        return jsonify({'error': 'target_type (accommodation|tour) and target_id are required'}), 400

    revs = (Review.query
            .filter_by(target_type=target_type, target_id=target_id)
            .order_by(Review.created_at.desc())
            .all())
    avg = round(sum(r.rating for r in revs) / len(revs), 1) if revs else 0
    return jsonify({
        'reviews': [r.to_dict() for r in revs],
        'count': len(revs),
        'average': avg
    }), 200


@reviews_bp.route('/', methods=['POST'])
@jwt_required()
@limiter.limit('20 per hour')
def create_review():
    """Logged-in user posts (or updates) a star rating + comment."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    target_type = data.get('target_type')
    target_id = data.get('target_id')
    comment = (data.get('comment') or '').strip()

    if target_type not in ('accommodation', 'tour'):
        return jsonify({'error': 'target_type must be accommodation or tour'}), 400
    if not target_id:
        return jsonify({'error': 'target_id is required'}), 400
    try:
        rating = int(data.get('rating'))
    except (TypeError, ValueError):
        return jsonify({'error': 'rating must be an integer 1-5'}), 400
    if rating < 1 or rating > 5:
        return jsonify({'error': 'rating must be between 1 and 5'}), 400

    if target_type == 'accommodation':
        if not Accommodation.query.get(target_id):
            return jsonify({'error': 'Accommodation not found'}), 404
    else:
        if not Trek.query.get(target_id):
            return jsonify({'error': 'Tour not found'}), 404

    existing = Review.query.filter_by(
        user_id=user_id, target_type=target_type, target_id=target_id).first()

    if existing:
        existing.rating = rating
        existing.comment = comment or None
        existing.created_at = datetime.utcnow()
        db.session.flush()
        if target_type == 'accommodation':
            _recompute_accommodation_rating(target_id)
        db.session.commit()
        return jsonify({'message': 'Your review was updated', 'review': existing.to_dict()}), 200

    review = Review(user_id=user_id, target_type=target_type, target_id=target_id,
                    rating=rating, comment=comment or None)
    db.session.add(review)
    db.session.flush()
    if target_type == 'accommodation':
        _recompute_accommodation_rating(target_id)
    db.session.commit()
    return jsonify({'message': 'Review posted — thank you!', 'review': review.to_dict()}), 201
