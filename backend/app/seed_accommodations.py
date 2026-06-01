from werkzeug.security import generate_password_hash
from app import db
from app.models import User, Accommodation, Room


DEMO_HOST = {
    'username': 'demo_host',
    'email': 'demo_host@treknest.bt',
    'password': 'demo1234',
    'first_name': 'Pema',
    'last_name': 'Wangchuk',
    'user_type': 'host'
}


SAMPLE_ACCOMMODATIONS = [
    {
        'name': 'Druk Lodge',
        'description': 'Cozy mountain lodge near the Druk Path trailhead with panoramic valley views and traditional Bhutanese hospitality.',
        'dzongkhag': 'Paro',
        'address': 'Tsento, Paro',
        'phone': '+975-8-271234',
        'rating': 4.6,
        'image_url': '/assets/accommodations/druk-lodge.jpg',
        'rooms': [
            {'room_number': '101', 'room_type': 'Standard Twin', 'capacity': 2, 'price_per_night': 1800, 'amenities': 'Wi-Fi, Hot shower, Heater'},
            {'room_number': '102', 'room_type': 'Deluxe Double', 'capacity': 2, 'price_per_night': 2400, 'amenities': 'Wi-Fi, Hot shower, Heater, Mountain view'},
            {'room_number': '201', 'room_type': 'Family Suite', 'capacity': 4, 'price_per_night': 3800, 'amenities': 'Wi-Fi, Hot shower, Heater, Sitting area'}
        ]
    },
    {
        'name': 'Jomolhari Base Camp Inn',
        'description': "A welcoming inn at the foothills of Mount Jomolhari with rustic charm, hearty meals, and helpful local guides.",
        'dzongkhag': 'Paro',
        'address': 'Drukgyel, Paro',
        'phone': '+975-8-271500',
        'rating': 4.4,
        'image_url': '/assets/accommodations/jomolhari-inn.jpg',
        'rooms': [
            {'room_number': 'A1', 'room_type': 'Twin Bed', 'capacity': 2, 'price_per_night': 1600, 'amenities': 'Wi-Fi, Hot shower'},
            {'room_number': 'A2', 'room_type': 'Quad Room', 'capacity': 4, 'price_per_night': 2800, 'amenities': 'Wi-Fi, Hot shower, Heater'}
        ]
    },
    {
        'name': 'Thimphu Trekkers Hostel',
        'description': 'Budget-friendly hostel in Thimphu, perfect base for Dagala Lakes and Dochula day-hike enthusiasts.',
        'dzongkhag': 'Thimphu',
        'address': 'Lower Motithang, Thimphu',
        'phone': '+975-2-321987',
        'rating': 4.2,
        'image_url': '/assets/accommodations/thimphu-hostel.jpg',
        'rooms': [
            {'room_number': 'Dorm-1', 'room_type': '6-Bed Dorm', 'capacity': 6, 'price_per_night': 800, 'amenities': 'Wi-Fi, Shared bathroom, Lockers'},
            {'room_number': 'P-1', 'room_type': 'Private Twin', 'capacity': 2, 'price_per_night': 1500, 'amenities': 'Wi-Fi, Private bathroom'}
        ]
    },
    {
        'name': 'Phobjikha Crane Lodge',
        'description': 'Eco-lodge overlooking the Phobjikha valley — the winter habitat of the rare black-necked cranes.',
        'dzongkhag': 'Wangdue Phodrang',
        'address': 'Gangtey, Phobjikha',
        'phone': '+975-2-441122',
        'rating': 4.7,
        'image_url': '/assets/accommodations/phobjikha-lodge.jpg',
        'rooms': [
            {'room_number': 'C1', 'room_type': 'Valley View Double', 'capacity': 2, 'price_per_night': 2200, 'amenities': 'Wi-Fi, Hot shower, Heater, Bukhari stove'},
            {'room_number': 'C2', 'room_type': 'Family Cottage', 'capacity': 5, 'price_per_night': 4200, 'amenities': 'Wi-Fi, Hot shower, Heater, Living area, Bukhari stove'}
        ]
    },
    {
        'name': 'Punakha River Resort',
        'description': 'Riverside resort with stunning views of the Mo Chhu river and the Punakha Dzong, plus spa and traditional cuisine.',
        'dzongkhag': 'Punakha',
        'address': 'Khuruthang, Punakha',
        'phone': '+975-2-584321',
        'rating': 4.8,
        'image_url': '/assets/accommodations/punakha-resort.jpg',
        'rooms': [
            {'room_number': 'R-101', 'room_type': 'River-View Suite', 'capacity': 2, 'price_per_night': 4500, 'amenities': 'Wi-Fi, Hot shower, Heater, Balcony, River view'},
            {'room_number': 'R-202', 'room_type': 'Garden Suite', 'capacity': 3, 'price_per_night': 3800, 'amenities': 'Wi-Fi, Hot shower, Heater, Garden access'},
            {'room_number': 'R-301', 'room_type': 'Royal Suite', 'capacity': 4, 'price_per_night': 6500, 'amenities': 'Wi-Fi, Hot shower, Heater, Living room, Spa access'}
        ]
    },
    {
        'name': 'Bumthang Heritage Farmhouse',
        'description': 'Stay with a traditional Bumthang family in a centuries-old farmhouse — authentic meals, weaving demos, monastery visits.',
        'dzongkhag': 'Bumthang',
        'address': 'Chamkhar, Bumthang',
        'phone': '+975-3-631456',
        'rating': 4.5,
        'image_url': '/assets/accommodations/bumthang-farmhouse.jpg',
        'rooms': [
            {'room_number': 'F1', 'room_type': 'Traditional Room', 'capacity': 2, 'price_per_night': 1400, 'amenities': 'Wood stove, Shared bathroom, Local meals included'},
            {'room_number': 'F2', 'room_type': 'Family Room', 'capacity': 4, 'price_per_night': 2400, 'amenities': 'Wood stove, Private bathroom, Local meals included'}
        ]
    },
    {
        'name': 'Gasa Hot Springs Camp',
        'description': 'Tented camp adjacent to the famous Gasa Tshachu hot springs — perfect rest stop on the Laya Gasa trek.',
        'dzongkhag': 'Gasa',
        'address': 'Tshachu, Gasa',
        'phone': '+975-2-678901',
        'rating': 4.3,
        'image_url': '/assets/accommodations/gasa-springs.jpg',
        'rooms': [
            {'room_number': 'T1', 'room_type': 'Twin Tent', 'capacity': 2, 'price_per_night': 1200, 'amenities': 'Hot springs access, Camp meals'},
            {'room_number': 'T2', 'room_type': 'Single Tent', 'capacity': 1, 'price_per_night': 800, 'amenities': 'Hot springs access, Camp meals'}
        ]
    },
    {
        'name': 'Yaksa Trail Guesthouse',
        'description': 'Family-run guesthouse along the Yaksa trek route, with warm rooms, butter tea on arrival, and yak cheese tastings.',
        'dzongkhag': 'Paro',
        'address': 'Lingshi, Paro',
        'phone': '+975-8-272998',
        'rating': 4.4,
        'image_url': '/assets/accommodations/yaksa-guesthouse.jpg',
        'rooms': [
            {'room_number': 'Y1', 'room_type': 'Standard Double', 'capacity': 2, 'price_per_night': 1500, 'amenities': 'Wood stove, Shared bathroom, Local meals included'},
            {'room_number': 'Y2', 'room_type': 'Triple Room', 'capacity': 3, 'price_per_night': 2100, 'amenities': 'Wood stove, Private bathroom, Local meals included'}
        ]
    }
]


def seed_accommodations_if_empty():
    if Accommodation.query.count() > 0:
        return 0

    host = User.query.filter_by(username=DEMO_HOST['username']).first()
    if not host:
        host = User(
            username=DEMO_HOST['username'],
            email=DEMO_HOST['email'],
            password=generate_password_hash(DEMO_HOST['password']),
            first_name=DEMO_HOST['first_name'],
            last_name=DEMO_HOST['last_name'],
            user_type=DEMO_HOST['user_type']
        )
        db.session.add(host)
        db.session.flush()

    added = 0
    for acc_data in SAMPLE_ACCOMMODATIONS:
        rooms_data = acc_data.pop('rooms', [])
        acc = Accommodation(owner_id=host.id, **acc_data)
        db.session.add(acc)
        db.session.flush()
        for room in rooms_data:
            db.session.add(Room(accommodation_id=acc.id, **room))
        added += 1

    db.session.commit()
    return added
