from flask import request, jsonify
from app import db
from app.models import Trek, TrekStop
from app.routes import treks_bp

@treks_bp.route('/', methods=['GET'])
def get_treks():
    query = Trek.query

    dzongkhag = request.args.get('dzongkhag')
    if dzongkhag:
        query = query.filter(Trek.dzongkhag == dzongkhag)

    tour_type = request.args.get('tour_type')
    if tour_type:
        query = query.filter(Trek.tour_type == tour_type)

    country = request.args.get('country')
    if country:
        query = query.filter(Trek.country == country)

    international = request.args.get('international')
    if international == 'true':
        query = query.filter(Trek.country != 'Bhutan')
    elif international == 'false':
        query = query.filter(Trek.country == 'Bhutan')

    treks = query.all()

    trek_list = [{
        'id': trek.id,
        'name': trek.name,
        'description': trek.description,
        'difficulty': trek.difficulty,
        'duration_days': trek.duration_days,
        'distance_km': trek.distance_km,
        'dzongkhag': trek.dzongkhag,
        'tour_type': trek.tour_type,
        'country': trek.country,
        'religious_tradition': trek.religious_tradition,
        'sacred_sites': trek.sacred_sites,
        'best_season': trek.best_season,
        'image_url': trek.image_url,
        'stops': [{
            'stop_name': s.stop_name,
            'stop_order': s.stop_order,
            'altitude': s.altitude,
            'description': s.description
        } for s in sorted(trek.stops, key=lambda x: x.stop_order or 0)]
    } for trek in treks]

    return jsonify(trek_list), 200

@treks_bp.route('/<int:trek_id>', methods=['GET'])
def get_trek_detail(trek_id):
    trek = Trek.query.get_or_404(trek_id)

    stops = [{
        'id': stop.id,
        'stop_name': stop.stop_name,
        'altitude': stop.altitude,
        'description': stop.description
    } for stop in trek.stops]

    return jsonify({
        'id': trek.id,
        'name': trek.name,
        'description': trek.description,
        'difficulty': trek.difficulty,
        'duration_days': trek.duration_days,
        'distance_km': trek.distance_km,
        'dzongkhag': trek.dzongkhag,
        'tour_type': trek.tour_type,
        'country': trek.country,
        'religious_tradition': trek.religious_tradition,
        'sacred_sites': trek.sacred_sites,
        'altitude_start': trek.altitude_start,
        'altitude_end': trek.altitude_end,
        'best_season': trek.best_season,
        'image_url': trek.image_url,
        'stops': stops
    }), 200

@treks_bp.route('/', methods=['POST'])
def create_trek():
    data = request.get_json()
    
    trek = Trek(
        name=data['name'],
        description=data.get('description'),
        difficulty=data.get('difficulty'),
        duration_days=data.get('duration_days'),
        distance_km=data.get('distance_km'),
        dzongkhag=data['dzongkhag'],
        altitude_start=data.get('altitude_start'),
        altitude_end=data.get('altitude_end'),
        best_season=data.get('best_season')
    )
    
    db.session.add(trek)
    db.session.commit()
    
    return jsonify({'message': 'Trek created', 'trek_id': trek.id}), 201
