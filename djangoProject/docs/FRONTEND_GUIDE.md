# React + TypeScript Frontend Development Guide

**Version:** 2.0  
**Date:** February 2, 2025  

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Component Organization](#2-component-organization)
3. [State Management](#3-state-management)
4. [Data Fetching](#4-data-fetching)
5. [Forms](#5-forms)
6. [Routing](#6-routing)
7. [Styling](#7-styling)
8. [Maps](#8-maps)
9. [Charts](#9-charts)
10. [Testing](#10-testing)
11. [Common Patterns](#11-common-patterns)
12. [Useful Commands](#12-useful-commands)

---

## 1. Project Structure

### 1.1 Frontend Layout

```
frontend/
├── public/                      # Static assets
│   └── favicon.ico
│
├── src/                         # Source code
│   ├── assets/                # Images, fonts, icons
│   │   └── images/
│   ├── components/             # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── layout/          # Layout components
│   │   ├── auth/            # Auth components
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── map/             # Map components
│   │   ├── projects/        # Project components
│   │   ├── import/          # CSV import components
│   │   ├── reports/         # Report components
│   │   └── shared/          # Shared components
│   ├── pages/                # Page components
│   ├── services/              # API service layer
│   ├── stores/                # Zustand stores
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript types
│   ├── lib/                   # Utility libraries
│   ├── config/                # Configuration
│   ├── App.tsx                # Root component
│   └── main.tsx               # Entry point
│
├── index.html                 # HTML template
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript config
├── tailwind.config.js           # Tailwind configuration
└── package.json                # NPM dependencies
```

---

## 2. Component Organization

### 2.1 Component Folder Structure

```
components/
├── ui/                        # shadcn/ui primitives
│   ├── button/
│   ├── input/
│   ├── table/
│   ├── dialog/
│   └── ...
│
├── layout/                    # Layout components
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── Layout.tsx
│
├── auth/                      # Authentication components
│   ├── LoginForm.tsx
│   └── ProtectedRoute.tsx
│
├── dashboard/                 # Dashboard widgets
│   ├── StatsCards.tsx
│   ├── StatusChart.tsx
│   └── RecentActivity.tsx
│
├── map/                       # Map components
│   ├── ProjectMap.tsx
│   ├── MapMarker.tsx
│   └── MapControls.tsx
│
├── projects/                  # Project management
│   ├── ProjectTable.tsx
│   ├── ProjectForm.tsx
│   ├── ProjectDetail.tsx
│   └── FilterBar.tsx
│
├── import/                    # CSV import
│   ├── CSVUploader.tsx
│   ├── ImportProgress.tsx
│   └── ImportResults.tsx
│
├── reports/                   # Reporting
│   ├── ReportBuilder.tsx
│   └── ChartWidgets.tsx
│
└── shared/                    # Shared components
    ├── LoadingSpinner.tsx
    ├── ErrorMessage.tsx
    └── Toast.tsx
```

### 2.2 Component Naming Conventions

| Component Type | Pattern | Example |
|---------------|---------|----------|
| **Page** | PascalCase | `Dashboard.tsx`, `ProjectList.tsx` |
| **Feature** | PascalCase + noun | `ProjectTable.tsx`, `CSVUploader.tsx` |
| **Layout** | PascalCase | `Sidebar.tsx`, `Header.tsx` |
| **UI** | PascalCase + noun | `Button.tsx`, `Input.tsx` |
| **Hook** | camelCase with `use` prefix | `useProjects.ts`, `useMapData.ts` |

---

## 3. State Management

### 3.1 Zustand Store Structure

**stores/authStore.ts:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User) => void;
  clearUser: () => void;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      name: 'auth-storage',
      partialize: (state) => !!(state.user && state.user.id),
    })
  )((set) => ({
    user: null,
    isAuthenticated: false,
    isInitializing: true,
    error: null,
    
    setUser: (user) => set({ user, isAuthenticated: !!user, error: null }),
    clearUser: () => set({ user: null, isAuthenticated: false, error: null }),
    
    login: async (credentials) => {
      set({ isInitializing: true, error: null });
      try {
        const response = await api.login(credentials);
        set({ user: response.data, isAuthenticated: true, isInitializing: false });
      } catch (error) {
        set({ error: error.message, isAuthenticated: false, isInitializing: false });
      }
    },
    
    logout: async () => {
      await api.logout();
      set({ user: null, isAuthenticated: false, error: null });
    },
    
    refreshUser: async () => {
      set({ isInitializing: true });
      try {
        const user = await api.getCurrentUser();
        set({ user, isAuthenticated: !!user, isInitializing: false });
      } catch (error) {
        set({ error: error.message, isAuthenticated: false, isInitializing: false });
      }
    },
  }))
);
```

### 3.2 Filter Store

**stores/filterStore.ts:**
```typescript
import { create } from 'zustand';

interface ProjectFilters {
  project_type?: number;
  status?: string;
  province?: number;
  municipality?: number;
  barangay?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}

interface FilterState {
  filters: ProjectFilters;
  setFilters: (filters: Partial<ProjectFilters>) => void;
  resetFilters: () => void;
  setSearch: (search: string) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: {
    project_type: undefined,
    status: undefined,
    province: undefined,
    municipality: undefined,
    barangay: undefined,
    date_from: undefined,
    date_to: undefined,
    search: '',
  },
  
  setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
  
  resetFilters: () => set({
    filters: {
      project_type: undefined,
      status: undefined,
      province: undefined,
      municipality: undefined,
      barangay: undefined,
      date_from: undefined,
      date_to: undefined,
      search: '',
    }
  }),
  
  setSearch: (search) => set({
    filters: { ...get().filters, search }
  }),
}));
```

---

## 4. Data Fetching

### 4.1 TanStack Query Setup

**services/api.ts:**
```typescript
import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (add auth, handle errors)
api.interceptors.request.use((config) => {
  // Add CSRF token if available
  const csrfToken = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth store
      useAuthStore.getState().clearUser();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Create TanStack Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000,  // 5 minutes
    },
  },
});

export default api;
```

### 4.2 Custom Hooks

**hooks/useProjects.ts:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useA
