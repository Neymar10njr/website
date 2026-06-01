# TrekNest Bhutan - Setup & Installation Guide

## Project Overview
TrekNest Bhutan is a Flask-based trekking accommodation booking platform with a dynamic image management system.

## Prerequisites
- Python 3.8 or higher
- MySQL 5.7 or higher
- Git (optional)
- VS Code or any text editor

## Step 1: Install Python Dependencies

```bash
cd "c:\Users\User\Desktop\TrekNest Bhutan"
pip install -r backend/requirements.txt
```

Expected packages:
- Flask 2.3.0
- Flask-SQLAlchemy 3.0.5
- Flask-Login 0.6.2
- PyMySQL 1.0.2
- python-dotenv 1.0.0
- Others...

## Step 2: Set Up MySQL Database

### Option A: Using MySQL Command Line

1. Open Command Prompt or PowerShell
2. Connect to MySQL:
```bash
mysql -u root -p
```

3. Create the database:
```sql
CREATE DATABASE treknesT_bhutan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE treknesT_bhutan;
```

4. Import the schema:
```bash
mysql -u root -p treknesT_bhutan < database/schema.sql
```

### Option B: Using MySQL Workbench

1. Open MySQL Workbench
2. Create new connection or use existing
3. Create new database: `treknesT_bhutan`
4. Open `database/schema.sql` file
5. Execute the script (Ctrl+Enter)

## Step 3: Configure Environment Variables

1. Open `backend/.env`
2. Update the following values:

```
DATABASE_URI=mysql+pymysql://root:your_password@localhost/treknesT_bhutan
SECRET_KEY=your-secret-key-here-change-in-production
FLASK_ENV=development
```

Replace `your_password` with your MySQL password.

## Step 4: Run the Flask Application

```bash
cd "c:\Users\User\Desktop\TrekNest Bhutan\backend"
python run.py
```

You should see:
```
* Running on http://0.0.0.0:5000
* Debug mode: on
```

## Step 5: Access the Frontend

1. Open your browser
2. Navigate to the frontend folder:
```
file:///c:/Users/User/Desktop/TrekNest%20Bhutan/frontend/pages/index.html
```

Or use Live Server extension in VS Code:
1. Right-click on `index.html`
2. Select "Open with Live Server"

## Project Structure

```
backend/
├── app/
│   ├── routes/          # API endpoints
│   ├── models/          # Database models
│   ├── static/uploads/  # Image uploads folder
│   └── templates/       # HTML templates (optional)
├── config.py            # Configuration
├── run.py               # Entry point
└── requirements.txt     # Dependencies

frontend/
├── pages/               # HTML pages
├── css/                 # Stylesheets
├── js/                  # JavaScript files
└── assets/              # Images and assets

database/
├── schema.sql           # Database schema
└── seed_data.sql        # Initial data (coming soon)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Treks
- `GET /api/treks` - Get all treks
- `GET /api/treks/<id>` - Get trek details
- `POST /api/treks` - Create new trek (admin)

### Accommodations
- `GET /api/accommodations` - Get all accommodations
- `GET /api/accommodations/<id>` - Get accommodation details
- `POST /api/accommodations` - Create accommodation (host)

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/<id>` - Get booking details

### Admin
- `GET /api/admin/images` - Get all images
- `POST /api/admin/images/upload` - Upload image
- `DELETE /api/admin/images/<id>` - Delete image

## Troubleshooting

### Error: "No module named 'flask'"
Solution: Run `pip install -r backend/requirements.txt`

### Error: "Can't connect to MySQL"
Solution: 
1. Check MySQL is running
2. Verify DATABASE_URI in `.env` file
3. Check username and password

### Port 5000 already in use
Solution: Change port in `backend/run.py` line 13:
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # Change 5000 to 5001
```

### Images not uploading
Solution:
1. Check `app/static/uploads/` folder exists
2. Ensure folder has write permissions
3. Check file size is under 16MB

## Next Steps

1. Add seed data to database
2. Implement frontend-backend integration
3. Add user authentication with JWT tokens
4. Deploy to production server

## Support

For issues or questions, refer to:
- Flask Documentation: https://flask.palletsprojects.com/
- SQLAlchemy Documentation: https://docs.sqlalchemy.org/
- Bootstrap Documentation: https://getbootstrap.com/

---
Created: April 2, 2026
Project: TrekNest Bhutan