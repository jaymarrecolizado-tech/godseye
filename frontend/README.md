# Project Tracking Management System - Frontend

A modern React-based frontend for the Project Tracking Management System, built with Vite, Tailwind CSS, and Leaflet maps.

## Features

- **Dashboard**: Overview with statistics, charts, and recent projects
- **Map View**: Interactive Leaflet map showing project locations across the Philippines
- **Project Management**: Create, read, update, and delete projects
- **Filtering**: Advanced filters for projects by status, type, location, and date
- **CSV Import**: Import projects from CSV files
- **Responsive Design**: Mobile-friendly interface with collapsible sidebar
- **Real-time Updates**: WebSocket support for live notifications

## Technology Stack

- **React 18** - UI library
- **Vite** - Build tool and development server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Leaflet + React-Leaflet** - Interactive maps
- **Recharts** - Data visualization charts
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Icon library
- **date-fns** - Date formatting utilities

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable components
│   │   ├── dashboard/      # Dashboard components
│   │   │   ├── StatsCards.jsx
│   │   │   ├── StatusChart.jsx
│   │   │   └── RecentProjects.jsx
│   │   ├── layout/         # Layout components
│   │   │   ├── Header.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── map/            # Map components
│   │   │   ├── MapMarker.jsx
│   │   │   └── ProjectMap.jsx
│   │   └── projects/       # Project components
│   │       ├── ProjectFilters.jsx
│   │       ├── ProjectForm.jsx
│   │       └── ProjectTable.jsx
│   ├── pages/              # Page components
│   │   ├── Dashboard.jsx
│   │   ├── MapView.jsx
│   │   └── ProjectList.jsx
│   ├── services/           # API services
│   │   └── api.js
│   ├── stores/             # Zustand stores
│   │   ├── mapStore.js
│   │   └── projectStore.js
│   ├── App.jsx             # Main app component
│   ├── index.css           # Global styles
│   └── main.jsx            # Entry point
├── .env.example            # Environment variables template
├── index.html              # HTML template
├── package.json            # Dependencies
├── tailwind.config.js      # Tailwind configuration
└── vite.config.js          # Vite configuration
```

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on http://localhost:3001

### Installation

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to match your backend configuration.

3. **Start development server:**
   ```bash
   npm run dev
   ```
   The application will be available at http://localhost:5173

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

## API Configuration

The frontend expects a backend API running at `http://localhost:3001/api`. The Vite development server is configured to proxy API requests to this URL.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3001/api` |
| `VITE_SOCKET_URL` | WebSocket server URL | `http://localhost:3001` |

## Color Scheme

### Project Type Colors
- **Free-WIFI**: Green (`#28a745`)
- **PNPKI**: Red (`#dc3545`)
- **IIDB**: Blue (`#007bff`)
- **eLGU**: Yellow (`#ffc107`)

### Status Colors
- **Done/Completed**: Green (`#22c55e`)
- **Pending**: Yellow (`#eab308`)
- **In Progress**: Blue (`#3b82f6`)
- **Cancelled**: Red (`#ef4444`)

## Key Features

### Dashboard
- Real-time statistics cards
- Pie chart showing project status distribution
- List of recently updated projects
- Quick map preview

### Map View
- Full-screen interactive map centered on Philippines
- Color-coded markers by project type
- Layer control for filtering by project type
- Marker clustering for large datasets
- Popup details on marker click

### Project List
- Data table with sorting and pagination
- Advanced filtering sidebar
- Bulk actions support
- Create/Edit project modal
- CSV import functionality

## Development Notes

- All API calls are centralized in `services/api.js`
- State management uses Zustand for simplicity
- Components use functional style with React hooks
- Tailwind CSS handles all styling
- PropTypes used for type checking
- Responsive design with mobile-first approach

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

This project is part of the Project Tracking Management System.
