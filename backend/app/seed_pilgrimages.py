"""Seed Buddhist/Hindu pilgrimage tours — domestic Bhutan and international."""
from app import db
from app.models import Trek, TrekStop


PILGRIMAGES = [
    # ---------- Bhutan domestic pilgrimages ----------
    {
        'name': "Taktsang (Tiger's Nest) Pilgrimage",
        'description': "A sacred day pilgrimage to Bhutan's most iconic monastery, perched on a cliff at 3,120m. Guru Padmasambhava is said to have meditated here in the 8th century.",
        'difficulty': 'Moderate',
        'duration_days': 1,
        'distance_km': 6.0,
        'dzongkhag': 'Paro',
        'altitude_start': 2600,
        'altitude_end': 3120,
        'best_season': 'March-May, September-November',
        'image_url': '/assets/treks/TigersNest.jpg',
        'tour_type': 'pilgrimage',
        'country': 'Bhutan',
        'religious_tradition': 'Buddhist',
        'sacred_sites': "Taktsang Palphug Monastery; Guru Padmasambhava's meditation cave",
        'stops': [
            {'stop_name': 'Ramthangkha Trailhead', 'altitude': 2600, 'description': 'Starting point of the pilgrimage at the base of the cliff.'},
            {'stop_name': 'Taktsang Cafeteria Viewpoint', 'altitude': 2940, 'description': 'Halfway point with panoramic monastery views — traditional offerings of butter lamps.'},
            {'stop_name': "Tiger's Nest Monastery", 'altitude': 3120, 'description': 'Main shrine complex with eight cave temples; visitors offer prayers in each.'},
        ]
    },
    {
        'name': 'Bumthang Sacred Sites Circuit',
        'description': 'A 4-day pilgrimage through the spiritual heartland of Bhutan, visiting the most revered Nyingma monasteries and the cave where Guru Rinpoche subdued local deities.',
        'difficulty': 'Easy',
        'duration_days': 4,
        'distance_km': 20.0,
        'dzongkhag': 'Bumthang',
        'altitude_start': 2600,
        'altitude_end': 3400,
        'best_season': 'March-May, September-November',
        'image_url': '/assets/treks/bumthang.jpg',
        'tour_type': 'pilgrimage',
        'country': 'Bhutan',
        'religious_tradition': 'Buddhist',
        'sacred_sites': 'Jambay Lhakhang; Kurjey Lhakhang; Tamzhing Lhakhang; Membar Tsho (burning lake)',
        'stops': [
            {'stop_name': 'Jambay Lhakhang', 'altitude': 2700, 'description': 'One of the oldest temples in Bhutan, built in 659 AD by Tibetan King Songtsen Gampo.'},
            {'stop_name': 'Kurjey Lhakhang', 'altitude': 2750, 'description': 'Three temples built around the cave bearing the body imprint of Guru Padmasambhava.'},
            {'stop_name': 'Tamzhing Lhakhang', 'altitude': 2780, 'description': 'Founded by treasure-revealer Pema Lingpa in 1501; preserves original 16th-century murals.'},
            {'stop_name': 'Membar Tsho (Burning Lake)', 'altitude': 2700, 'description': 'Sacred gorge where Pema Lingpa retrieved hidden treasures with a butter lamp still burning.'},
        ]
    },
    {
        'name': 'Punakha Sacred Valley Pilgrimage',
        'description': "A four-day pilgrimage through all the major sacred sites of Punakha dzongkhag — the temple of the Divine Madman, the majestic Punakha Dzong (Bhutan's winter capital), the iconic Khamsum Yulley Namgyal Chorten, the great nunnery, and the high-ridge monasteries that crown the Punakha valley.",
        'difficulty': 'Easy',
        'duration_days': 4,
        'distance_km': 18.0,
        'dzongkhag': 'Punakha',
        'altitude_start': 1200,
        'altitude_end': 2100,
        'best_season': 'October-March',
        'image_url': '/assets/treks/punakha.jpg',
        'tour_type': 'pilgrimage',
        'country': 'Bhutan',
        'religious_tradition': 'Buddhist',
        'sacred_sites': 'Chimi Lhakhang; Punakha Dzong (Pungtang Dechen Photrang Dzong); Khamsum Yulley Namgyal Chorten; Sangchen Dorji Lhuendrup Lhakhang Nunnery; Talo Monastery; Nalanda Buddhist Institute (Daga Tashi)',
        'stops': [
            {'stop_name': 'Chimi Lhakhang', 'altitude': 1200, 'description': 'The fertility temple of Lama Drukpa Kunley, the Divine Madman. A short walk through paddy fields from the road; pilgrims receive blessings for children.'},
            {'stop_name': 'Punakha Dzong (Pungtang Dechen Photrang Dzong)', 'altitude': 1240, 'description': "At the confluence of the Pho Chhu and Mo Chhu rivers; the winter capital of the central monastic body. Houses the sacred relics of Zhabdrung Ngawang Namgyal and is the venue of the Punakha Tshechu and Domchoe."},
            {'stop_name': 'Khamsum Yulley Namgyal Chorten', 'altitude': 1450, 'description': 'A four-storey chorten built by Queen Mother Ashi Tshering Yangdon for the wellbeing of the kingdom. Reached by a short uphill hike through paddy fields; the top floor offers sweeping views of the Mo Chhu valley.'},
            {'stop_name': 'Sangchen Dorji Lhuendrup Lhakhang Nunnery', 'altitude': 1850, 'description': 'Major Drukpa Kagyu nunnery on a ridge overlooking the Punakha–Wangdue valleys. Home to several hundred nuns and a 14-foot bronze statue of Avalokiteshvara.'},
            {'stop_name': 'Talo Monastery', 'altitude': 2100, 'description': 'Founded in the 17th century on a high ridge above Punakha. Seat of the Talo Tulku and one of the most scenic monasteries in western Bhutan.'},
            {'stop_name': 'Nalanda Buddhist Institute (Daga Tashi)', 'altitude': 1900, 'description': 'A renowned monastic college (shedra) founded in 1757; thousands of monks have completed their philosophical studies here. The 18th-century courtyard architecture remains beautifully preserved.'},
        ]
    },
    {
        'name': 'Gangtey Goemba & Phobjikha Sacred Valley',
        'description': '3-day pilgrimage to one of the oldest Nyingma monasteries in Bhutan, in the glacial valley sacred to the black-necked crane.',
        'difficulty': 'Easy',
        'duration_days': 3,
        'distance_km': 10.0,
        'dzongkhag': 'Wangdue Phodrang',
        'altitude_start': 2900,
        'altitude_end': 3000,
        'best_season': 'October-March',
        'image_url': '/assets/treks/phobjikha.jpg',
        'tour_type': 'pilgrimage',
        'country': 'Bhutan',
        'religious_tradition': 'Buddhist',
        'sacred_sites': 'Gangtey Goemba (founded 1613); Khewang Lhakhang',
    },

]


def seed_pilgrimages_if_empty():
    added = 0
    for tour_data in PILGRIMAGES:
        data = dict(tour_data)
        stops_data = data.pop('stops', None)
        if Trek.query.filter_by(name=data['name']).first():
            continue
        tour = Trek(**data)
        db.session.add(tour)
        db.session.flush()
        if stops_data:
            for order, stop in enumerate(stops_data, start=1):
                db.session.add(TrekStop(
                    trek_id=tour.id,
                    stop_name=stop['stop_name'],
                    stop_order=order,
                    altitude=stop.get('altitude'),
                    description=stop.get('description')
                ))
        added += 1
    db.session.commit()
    return added
