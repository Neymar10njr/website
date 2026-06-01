from app import db
from app.models import Trek, TrekStop


SAMPLE_TREKS = [
    {
        'name': 'Druk Path Trek',
        'description': 'A scenic high-altitude trek connecting Paro and Thimphu through pristine alpine lakes, ancient temples, and rhododendron forests.',
        'difficulty': 'Moderate',
        'duration_days': 4,
        'distance_km': 47.0,
        'dzongkhag': 'Paro',
        'altitude_start': 2400,
        'altitude_end': 4200,
        'best_season': 'March-May, September-November',
        'image_url': '/assets/treks/druk-path.jpg'
    },
    {
        'name': 'Jomolhari Trek',
        'description': "Bhutan's most iconic trek featuring stunning views of the sacred Mount Jomolhari (7,326m), alpine meadows, and yak herder settlements.",
        'difficulty': 'Difficult',
        'duration_days': 7,
        'distance_km': 110.0,
        'dzongkhag': 'Paro',
        'altitude_start': 2500,
        'altitude_end': 4890,
        'best_season': 'April-June, September-October',
        'image_url': '/assets/treks/jomolhari.jpg'
    },
    {
        'name': 'Bumdrak Trek',
        'description': 'A short but challenging trek to the sacred Bumdrak Monastery perched on a cliff above Tiger\'s Nest, offering breathtaking Himalayan views.',
        'difficulty': 'Difficult',
        'duration_days': 2,
        'distance_km': 18.0,
        'dzongkhag': 'Paro',
        'altitude_start': 2600,
        'altitude_end': 3800,
        'best_season': 'March-May, October-December',
        'image_url': '/assets/treks/bumdrak.jpg'
    },
    {
        'name': 'Phobjikha Valley Trek',
        'description': 'A gentle nature trail through the glacial Phobjikha Valley — winter home of the rare black-necked cranes — with traditional villages and forests.',
        'difficulty': 'Easy',
        'duration_days': 2,
        'distance_km': 14.0,
        'dzongkhag': 'Wangdue Phodrang',
        'altitude_start': 2900,
        'altitude_end': 3200,
        'best_season': 'October-March',
        'image_url': '/assets/treks/phobjikha.jpg'
    },
    {
        'name': 'Dagala Thousand Lakes Trek',
        'description': 'A high-altitude lake trek with dozens of pristine alpine lakes, panoramic Himalayan vistas, and excellent trout fishing opportunities.',
        'difficulty': 'Difficult',
        'duration_days': 6,
        'distance_km': 76.0,
        'dzongkhag': 'Thimphu',
        'altitude_start': 2600,
        'altitude_end': 4500,
        'best_season': 'April-June, September-October',
        'image_url': '/assets/treks/dagala.jpg'
    },
    {
        'name': 'Snowman Trek',
        'description': 'Considered one of the toughest treks in the world — crossing 11 passes above 4,500m through remote Lunana region with views of unclimbed peaks.',
        'difficulty': 'Difficult',
        'duration_days': 25,
        'distance_km': 356.0,
        'dzongkhag': 'Punakha',
        'altitude_start': 2500,
        'altitude_end': 5320,
        'best_season': 'June-September',
        'image_url': '/assets/treks/snowman.jpg'
    },
    {
        'name': 'Punakha Winter Trek',
        'description': 'A pleasant low-altitude winter trek through the warm Punakha valley, featuring rice paddies, suspension bridges, and the magnificent Punakha Dzong.',
        'difficulty': 'Easy',
        'duration_days': 3,
        'distance_km': 22.0,
        'dzongkhag': 'Punakha',
        'altitude_start': 1200,
        'altitude_end': 1900,
        'best_season': 'November-March',
        'image_url': '/assets/treks/punakha-winter.jpg'
    },
    {
        'name': 'Bumthang Cultural Trek',
        'description': 'A heritage trek through the spiritual heartland of Bhutan, visiting ancient temples, sacred sites, and traditional Bumthang villages.',
        'difficulty': 'Moderate',
        'duration_days': 4,
        'distance_km': 38.0,
        'dzongkhag': 'Bumthang',
        'altitude_start': 2600,
        'altitude_end': 3400,
        'best_season': 'March-May, September-November',
        'image_url': '/assets/treks/bumthang.jpg'
    },
    {
        'name': 'Laya Gasa Trek',
        'description': 'A classic long-distance trek through remote villages of the semi-nomadic Layap people, hot springs at Gasa, and views of Tsenda Gang.',
        'difficulty': 'Difficult',
        'duration_days': 14,
        'distance_km': 216.0,
        'dzongkhag': 'Gasa',
        'altitude_start': 2300,
        'altitude_end': 5005,
        'best_season': 'April-June, September-November',
        'image_url': '/assets/treks/laya-gasa.jpg'
    },
    {
        'name': 'Dragay Pangtsho Hike',
        'description': "A sacred high-altitude treasure lake at 4,239–4,390m on the lap of Mount Jowo Drake. Said to have been blessed by Guru Rinpoche in the 8th century who hid spiritual treasures here, the lake offers tranquil pristine scenery and is considered one of Paro's most rewarding spiritual hikes.",
        'difficulty': 'Moderate',
        'duration_days': 3,
        'distance_km': 22.0,
        'dzongkhag': 'Paro',
        'altitude_start': 2500,
        'altitude_end': 4390,
        'best_season': 'August–November, February–April',
        'image_url': '/assets/treks/dragay-pangtsho.jpg',
        'stops': [
            {'stop_name': 'Drukgyel Dzong → Jhana Goenpa (drive)', 'altitude': 2800, 'description': 'Day 1 — Drive ~1.5 hours through the vast village of Tshento Gewog until Jhana Goenpa, the end of the motorable road.'},
            {'stop_name': 'Jhana Goenpa → Dragay Pangtsho → Chudona', 'altitude': 4239, 'description': 'Day 2 — Hike up to the sacred lake at 4,239–4,390m. Optionally return to Jhana Lhakhang the same evening, or stay overnight at Chudona for an immersive experience.'},
            {'stop_name': 'Chudona → Drukgyel Dzong (drive back)', 'altitude': 2500, 'description': 'Day 3 — Trek down and drive back to Drukgyel Dzong / Paro.'}
        ]
    },
    {
        'name': 'Yaksa Trek',
        'description': 'A scenic 6-day loop through the Lingshi region of Paro, passing through alpine meadows and yak herder settlements with magnificent Himalayan views. Includes an acclimatization day at Jhongothang.',
        'difficulty': 'Moderate',
        'duration_days': 6,
        'distance_km': 80.0,
        'dzongkhag': 'Paro',
        'altitude_start': 2900,
        'altitude_end': 4180,
        'best_season': 'April-June, September-October',
        'image_url': '/assets/treks/yaksa.jpg',
        'stops': [
            {'stop_name': 'Shana (Start)', 'altitude': 2900, 'description': 'Day 1 — Trek begins at Shana, heading towards Thangtangkha base camp.'},
            {'stop_name': 'Thangtangkha Base Camp', 'altitude': 3580, 'description': 'Day 1 camp — arrive after trekking from Shana through pine forest.'},
            {'stop_name': 'Jhongothang', 'altitude': 4080, 'description': 'Day 2 camp + Day 3 acclimatization (halt) day at Jhongothang.'},
            {'stop_name': 'Yaksa', 'altitude': 4080, 'description': 'Day 4 — Trek from Jhongothang to Yaksa across alpine pasture.'},
            {'stop_name': 'Thongbu', 'altitude': 4180, 'description': 'Day 5 — Yaksa to Thongbu camp.'},
            {'stop_name': 'Shana (End)', 'altitude': 2900, 'description': 'Day 6 — Descent back to Shana, completing the loop.'}
        ]
    }
]


def seed_treks_if_empty():
    added = 0
    for trek_data in SAMPLE_TREKS:
        data = dict(trek_data)
        stops_data = data.pop('stops', None)

        existing = Trek.query.filter_by(name=data['name']).first()
        if existing:
            if stops_data and not existing.stops:
                _add_stops(existing, stops_data)
            continue

        trek = Trek(**data)
        db.session.add(trek)
        db.session.flush()
        if stops_data:
            _add_stops(trek, stops_data)
        added += 1

    db.session.commit()
    return added


def _add_stops(trek, stops):
    for order, stop in enumerate(stops, start=1):
        db.session.add(TrekStop(
            trek_id=trek.id,
            stop_name=stop['stop_name'],
            stop_order=order,
            altitude=stop.get('altitude'),
            description=stop.get('description')
        ))
