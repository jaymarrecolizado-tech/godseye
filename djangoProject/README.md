# Django Project Tracking Management System v2.0

> **A modern, scalable full-stack application for tracking government infrastructure projects across different regions with geospatial visualization, real-time updates, and comprehensive analytics.**

## 🚀 Quick Start (5 Commands)

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your settings

# 2. Start all services with Docker
docker-compose up -d

# 3. Run database migrations
cd backend && docker-compose exec backend python manage.py migrate

# 4. Seed reference data
cd backend && docker-compose exec backend python manage.py seed_data

# 5. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api/v1/
# Django Admin: http://localhost:8000/admin/
```

## 📋 Features

### Core Features
- ✅ **Dashboard** - Statistics, charts, and recent projects
- 🗺️ **Interactive Map** - WebGL-based visualization with MapLibre GL JS
- 📋 **Project Management** - Full CRUD operations with advanced filtering
- 📁 **CSV Import** - Bulk import with validation and real-time progress
- 📈 **Reports & Analytics** - Comprehensive reporting with CSV/Excel/PDF export
- 🔍 **Advanced Filtering** - Filter by location, status, type, date range
- 📍 **Geospatial Search** - Find projects within bounds or proximity
- 🔔 **Real-time Updates** - WebSocket-based live collaboration
- 👥 **User Management** - Role-based access control (RBAC)
- 📝 **Audit Logging** - Comprehensive operation tracking

### Technical Features
- ⚡ **Performance** - Sub-second API responses, optimized rendering
- 🔒 **Security** - Session-based auth, CSRF protection, RBAC
- 📱 **Responsive** - Mobile, tablet, and desktop support
- 🐳 **Docker** - Full containerization with Docker Compose
- 🔄 **Background Tasks** - Celery for CSV imports and exports
- 📊 **Caching** - Redis-based query and session caching
- 🎨 **Modern UI** - shadcn/ui components with Tailwind CSS
- 🧪 **Testing** - Comprehensive test coverage (pytest, Vitest, Playwright)
- 📚 **API Documentation** - Auto-generated OpenAPI/Swagger docs

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3+ | UI Framework |
| TypeScript | 5.3+ | Type Safety |
| Vite | 5.4+ | Build Tool |
| Tailwind CSS | 3.4+ | Styling |
| shadcn/ui | latest | UI Components |
| React Router | 6.20+ | Routing |
| Zustand | 4.4+ | State Management |
| TanStack Query | 5.12+ | Server State |
| React Hook Form | 7.48+ | Forms |
| Zod | 3.22+ | Validation |
| MapLibre GL JS | 4.1+ | Maps |
| Recharts | 2.10+ | Charts |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | Runtime |
| Django | 5.0+ | Web Framework |
| Django REST Framework | 3.14+ | API Framework |
| MySQL | 8.0+ | Database |
| Django Channels | 4.0+ | WebSockets |
| Celery | 5.3+ | Background Tasks |
| Redis | 7.2+ | Caching & Queues |
| Pandas | 2.1+ | Data Processing |

## 📁 Project Structure

```
djangoProject/
├── README.md                 # This file
├── docs/                    # Complete documentation
│   ├── SPECIFICATION.md       # Functional/NFR requirements
│   ├── ARCHITECTURE.md       # System architecture
│   ├── DATABASE.md           # Django models and schema
│   ├── API.md               # API documentation
│   ├── SETUP.md             # Development setup
│   ├── TESTING.md            # Testing strategy
│   ├── SECURITY.md           # Security implementation
│   ├── PERFORMANCE.md        # Performance optimization
│   ├── DEPLOYMENT.md        # Production deployment
│   ├── BACKEND_GUIDE.md     # Django development guide
│   ├── FRONTEND_GUIDE.md    # React development guide
│   ├── MIGRATION_GUIDE.md   # Migrate from Node.js
│   └── TROUBLESHOOTING.md  # Common issues
│
├── backend/                 # Django application
│   ├── apps/                # Django apps (9 apps)
│   ├── config/              # Settings, URLs, ASGI/WSGI
│   ├── media/               # User uploads
│   └── requirements.txt      # Python dependencies
│
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API layer
│   │   ├── stores/         # Zustand stores
│   │   ├── hooks/          # Custom hooks
│   │   └── types/          # TypeScript types
│   └── package.json        # NPM dependencies
│
├── docker/                 # Docker configurations
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
│
└── scripts/                # Utility scripts
    ├── setup.sh
    ├── migrate-data.sh
    └── test.sh
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [docs/SPECIFICATION.md](docs/SPECIFICATION.md) | Complete functional and non-functional requirements |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture with diagrams |
| [docs/DATABASE.md](docs/DATABASE.md) | Django models, migrations, indexes |
| [docs/API.md](docs/API.md) | Complete API reference with examples |
| [docs/SETUP.md](docs/SETUP.md) | Development environment setup |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy and guidelines |
| [docs/SECURITY.md](docs/SECURITY.md) | Security implementation guide |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Performance optimization techniques |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |
| [docs/BACKEND_GUIDE.md](docs/BACKEND_GUIDE.md) | Django-specific development guide |
| [docs/FRONTEND_GUIDE.md](docs/FRONTEND_GUIDE.md) | React + TypeScript development guide |
| [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) | Migrate from Node.js to Django |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions |

## 👥 User Roles

| Role | Permissions |
|-------|-------------|
| **Admin** | Full system access, user management, configuration |
| **Manager** | Read/write projects, view reports, manage users |
| **Editor** | Read/write projects, import data |
| **Viewer** | Read-only access to projects and reports |

## 🎯 Key Goals

1. **Modern UI/UX** - Contemporary, responsive design with smooth animations
2. **Performance** - Sub-second API responses, optimized rendering
3. **Scalability** - Support for 10x growth in users and projects
4. **Developer Experience** - Type-safe, automated testing, modern tooling

## 🔄 Development Workflow

### Branching Strategy
```
main (production)
├── develop (integration)
│   ├── feature/auth
│   ├── feature/projects-api
│   ├── feature/map-integration
│   └── bugfix/csv-import
```

### Commit Conventions
- `feat: add user authentication`
- `fix: resolve CSV import timeout`
- `docs: update API documentation`
- `test: add project CRUD tests`
- `refactor: optimize map rendering`

### Getting Started for Developers

1. **Fork and clone repository**
   ```bash
   git clone <repository-url>
   cd djangoProject
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Run migrations**
   ```bash
   cd backend
   python manage.py migrate
   python manage.py seed_data
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   python manage.py runserver
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. **Run tests**
   ```bash
   # Backend
   cd backend
   pytest
   
   # Frontend
   cd frontend
   npm test
   ```

## 📊 System Statistics

- **Lines of Code**: ~25,000+
- **Test Coverage**: >80%
- **API Endpoints**: 50+
- **Django Apps**: 9
- **React Components**: 50+
- **Documentation Pages**: 100+

## 🤝 Contributing

1. Create feature branch from `develop`
2. Implement feature with tests
3. Ensure test coverage >80%
4. Update documentation
5. Submit pull request to `develop`

## 📄 License

MIT L
