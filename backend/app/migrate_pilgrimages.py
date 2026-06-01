"""One-off script to apply the pilgrimage list edits to an existing DB:
- Remove Dochula 108 Chortens
- Remove Four Great Buddhist Sites
- Expand Chimi Lhakhang & Punakha Dzong -> Punakha Sacred Valley (full dzongkhag)
"""
from app import create_app, db
from app.models import Trek, TrekStop, Accommodation, TrekEvent


REMOVE_NAMES = [
    'Dochula 108 Chortens & Lungchutse Hike',
    'Four Great Buddhist Sites Pilgrimage (Bodh Gaya · Sarnath · Lumbini · Kushinagar)',
]

EXPANDED_PUNAKHA = {
    'old_name': 'Chimi Lhakhang & Punakha Dzong Pilgrimage',
    'new_name': 'Punakha Sacred Valley Pilgrimage',
    'description': "A four-day pilgrimage through all the major sacred sites of Punakha dzongkhag — the temple of the Divine Madman, the majestic Punakha Dzong (Bhutan's winter capital), the iconic Khamsum Yulley Namgyal Chorten, the great nunnery, and the high-ridge monasteries that crown the Punakha valley.",
    'duration_days': 4,
    'distance_km': 18.0,
    'altitude_start': 1200,
    'altitude_end': 2100,
    'sacred_sites': 'Chimi Lhakhang; Punakha Dzong (Pungtang Dechen Photrang Dzong); Khamsum Yulley Namgyal Chorten; Sangchen Dorji Lhuendrup Lhakhang Nunnery; Talo Monastery; Nalanda Buddhist Institute (Daga Tashi)',
    'stops': [
        ('Chimi Lhakhang', 1200, 'The fertility temple of Lama Drukpa Kunley, the Divine Madman. A short walk through paddy fields from the road; pilgrims receive blessings for children.'),
        ('Punakha Dzong (Pungtang Dechen Photrang Dzong)', 1240, "At the confluence of the Pho Chhu and Mo Chhu rivers; the winter capital of the central monastic body. Houses the sacred relics of Zhabdrung Ngawang Namgyal and is the venue of the Punakha Tshechu and Domchoe."),
        ('Khamsum Yulley Namgyal Chorten', 1450, 'A four-storey chorten built by Queen Mother Ashi Tshering Yangdon for the wellbeing of the kingdom. Reached by a short uphill hike through paddy fields; the top floor offers sweeping views of the Mo Chhu valley.'),
        ('Sangchen Dorji Lhuendrup Lhakhang Nunnery', 1850, 'Major Drukpa Kagyu nunnery on a ridge overlooking the Punakha–Wangdue valleys. Home to several hundred nuns and a 14-foot bronze statue of Avalokiteshvara.'),
        ('Talo Monastery', 2100, 'Founded in the 17th century on a high ridge above Punakha. Seat of the Talo Tulku and one of the most scenic monasteries in western Bhutan.'),
        ('Nalanda Buddhist Institute (Daga Tashi)', 1900, 'A renowned monastic college (shedra) founded in 1757; thousands of monks have completed their philosophical studies here. The 18th-century courtyard architecture remains beautifully preserved.'),
    ],
}


def main():
    app = create_app()
    with app.app_context():
        # 1) Remove the two tours
        # Need to handle: (a) accommodations linked via trek_stop_id, (b) events that reference the tour
        for name in REMOVE_NAMES:
            t = Trek.query.filter_by(name=name).first()
            if not t:
                print(f'[skip] Not found: {name}')
                continue
            # (a) Detach any linked accommodations
            stop_ids = [s.id for s in t.stops]
            if stop_ids:
                linked = Accommodation.query.filter(Accommodation.trek_stop_id.in_(stop_ids)).all()
                for acc in linked:
                    acc.trek_stop_id = None
                if linked:
                    print(f'[info] Detached {len(linked)} accommodation(s) from stops of "{name}"')
            # (b) Hard-delete dependent events (trek_id is NOT NULL; cascades remove participants)
            events = TrekEvent.query.filter_by(trek_id=t.id).all()
            for ev in events:
                print(f'[info] Also deleting event #{ev.id} "{ev.title}" (referenced removed tour)')
                db.session.delete(ev)
            db.session.flush()
            db.session.delete(t)
            print(f'[del]  Removed tour: {name}')
        db.session.commit()

        # 2) Expand Chimi + Punakha Dzong into the full Punakha pilgrimage
        t = Trek.query.filter_by(name=EXPANDED_PUNAKHA['old_name']).first()
        if not t:
            # Maybe already updated; check by new name
            t = Trek.query.filter_by(name=EXPANDED_PUNAKHA['new_name']).first()
        if not t:
            print('[skip] Punakha pilgrimage not found to expand')
            return

        # Detach accommodations from old stops before clearing
        for stop in list(t.stops):
            linked = Accommodation.query.filter_by(trek_stop_id=stop.id).all()
            for acc in linked:
                acc.trek_stop_id = None
            db.session.delete(stop)
        db.session.flush()

        t.name = EXPANDED_PUNAKHA['new_name']
        t.description = EXPANDED_PUNAKHA['description']
        t.duration_days = EXPANDED_PUNAKHA['duration_days']
        t.distance_km = EXPANDED_PUNAKHA['distance_km']
        t.altitude_start = EXPANDED_PUNAKHA['altitude_start']
        t.altitude_end = EXPANDED_PUNAKHA['altitude_end']
        t.sacred_sites = EXPANDED_PUNAKHA['sacred_sites']

        for order, (name, alt, desc) in enumerate(EXPANDED_PUNAKHA['stops'], start=1):
            db.session.add(TrekStop(
                trek_id=t.id, stop_name=name, stop_order=order,
                altitude=alt, description=desc,
            ))
        db.session.commit()
        print(f'[upd]  Expanded "{EXPANDED_PUNAKHA["old_name"]}" -> "{EXPANDED_PUNAKHA["new_name"]}" with {len(EXPANDED_PUNAKHA["stops"])} stops')


if __name__ == '__main__':
    main()
