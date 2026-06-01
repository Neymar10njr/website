from app import create_app
from app.seed import seed_treks_if_empty
from app.seed_accommodations import seed_accommodations_if_empty

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        treks_added = seed_treks_if_empty()
        if treks_added:
            print(f'Seeded {treks_added} sample treks')
        accs_added = seed_accommodations_if_empty()
        if accs_added:
            print(f'Seeded {accs_added} sample accommodations')
    app.run(debug=True, host='0.0.0.0', port=5000)
