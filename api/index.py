import sys
from pathlib import Path

# Add the backend directory to sys.path so the Flask app package is importable
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / 'backend'))

from app import create_app

app = create_app()
