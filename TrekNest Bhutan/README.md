# TrekNest Bhutan - Trekking Accommodation Booking Platform

## Project Overview

TrekNest Bhutan is a comprehensive web-based platform designed to connect tourists and local travelers with guest houses and accommodations along popular trekking routes in Bhutan. The platform simplifies the process of exploring trekking routes, viewing available accommodations, and booking rooms in advance.

### Key Features

- **Trekking Route Discovery**: Explore major trekking routes across key dzongkhags (Paro, Thimphu, Punakha, Wangdue Phodrang)
- **Accommodation Booking**: Reserve guest houses and rooms along trekking routes
- **Two-Sided Marketplace**: Separate experiences for tourists (guests) and accommodation providers (hosts)
- **Dynamic Image Management**: Admin-controlled image system for dynamic content updates without code changes
- **Guest House Management**: Hosts can manage rooms, pricing, capacity, and availability
- **User-Friendly Interface**: Clean, responsive design for desktop and mobile users

### Technology Stack

- **Backend**: Python with Flask Web Framework
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Database**: MySQL
- **Server Storage**: Static uploads folder for images
- **Architecture**: MVC Pattern

## Project Structure

```
TrekNest Bhutan/
├── backend/                    # Flask application backend
│   ├── app/
│   │   ├── routes/            # API endpoints and view functions
│   │   ├── models/            # Database models
│   │   ├── templates/         # HTML templates
│   │   ├── static/            # Static files (uploads folder)
│   │   └── __init__.py
│   ├── config.py              # Configuration settings
│   ├── requirements.txt        # Python dependencies
│   └── run.py                 # Application entry point
├── frontend/                   # Frontend assets
│   ├── pages/                 # HTML pages
│   ├── css/                   # Stylesheets
│   ├── js/                    # JavaScript files
│   └── assets/                # Images and other assets
├── database/                   # Database related files
│   ├── schema.sql             # Database schema
│   └── seed_data.sql          # Initial data
├── documentation/              # Project documentation
│   ├── API_DOCUMENTATION.md
│   ├── DATABASE_DESIGN.md
│   ├── PROJECT_ROADMAP.md
│   └── ARCHITECTURE.md
└── README.md

```

## Getting Started

### Prerequisites
- Python 3.8+
- MySQL 5.7+
- Git

### Installation

1. **Clone and Navigate**
   ```bash
   cd "TrekNest Bhutan"
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # macOS/Linux
   pip install -r requirements.txt
   ```

3. **Database Setup**
   ```bash
   # Create database
   mysql -u root -p < ../database/schema.sql
   ```

4. **Run Application**
   ```bash
   python run.py
   ```

5. **Access Application**
   - Open `http://localhost:5000` in your browser

## Core Modules

### 1. **User Management**
   - Tourist registration and login
   - Guest house owner registration
   - User profiles and account management

### 2. **Trekking Routes**
   - Route information and details
   - Stop/village listings
   - Route difficulty and duration

### 3. **Accommodations**
   - Guest house listings
   - Room inventory management
   - Pricing and availability

### 4. **Bookings**
   - Room reservation system
   - Booking confirmation and cancellation
   - Payment integration (future)

### 5. **Admin Panel**
   - Image management system
   - User management
   - Booking approvals and monitoring
   - Content management

## Dynamic Image Management System

### Overview
Images are stored on the server (in `/backend/app/static/uploads/`) with their paths saved in the database. The admin panel allows:
- Upload new images
- Assign images to specific sections (homepage, trekking pages, dzongkhag pages)
- Activate/deactivate images
- Manage image metadata

### Database Table: `master_images`
```
- id (Primary Key)
- image_name
- image_path
- section (homepage, route, dzongkhag, accommodation)
- is_active (Boolean)
- created_at
- updated_at
```

## Development Guidelines

- Follow PEP 8 style guide for Python code
- Use meaningful variable and function names
- Comment complex business logic
- Test all features before committing
- Keep documentation updated

## File Naming Conventions

- Python files: `snake_case.py`
- HTML files: `kebab-case.html`
- CSS files: `kebab-case.css`
- JavaScript files: `camelCase.js`
- Database tables: `snake_case`

## Project Milestones

1. **Phase 1**: Project setup and database design
2. **Phase 2**: Backend API development
3. **Phase 3**: Frontend development
4. **Phase 4**: Admin panel implementation
5. **Phase 5**: Testing and deployment

## Contributing

- Create feature branches for new features
- Write descriptive commit messages
- Test thoroughly before pull requests
- Update documentation as needed

## License

TrekNest Bhutan - All rights reserved

## Contact & Support

For project inquiries or support, please contact the development team.

---

**Last Updated**: April 2026  
**Version**: 1.0 (Planning Phase)