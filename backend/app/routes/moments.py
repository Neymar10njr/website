from flask import request, jsonify

from app.models import Moment
from app.routes import moments_bp


@moments_bp.route('/', methods=['GET'])
def list_moments():
    """Public — curated Trek Moments, newest first. Optional ?limit=N."""
    limit = request.args.get('limit', type=int)
    query = Moment.query.order_by(Moment.created_at.desc())
    if limit and limit > 0:
        query = query.limit(limit)
    return jsonify([m.to_dict() for m in query.all()]), 200
