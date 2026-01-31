#!/bin/bash

# =============================================================================
# Project Tracking Management System - Linux/Mac Setup Script
# =============================================================================
# This script automates the setup process for the Project Tracking
# Management System on Linux and macOS machines.
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${GREEN}=============================================================${NC}"
    echo -e "${GREEN}  $1${NC}"
    echo -e "${GREEN}=============================================================${NC}"
    echo ""
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "Found $2"
        return 0
    else
        print_error "Missing $2"
        return 1
    fi
}

# =============================================================================
# Main Script
# =============================================================================

clear
print_header "Project Tracking Management System - Setup"

# Check if running with sudo
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. Some operations may have different behavior."
fi

# =============================================================================
# Check Prerequisites
# =============================================================================

print_info "Checking prerequisites..."
echo ""

# Check Node.js
if ! check_command node "Node.js"; then
    print_error "Node.js is not installed. Please install Node.js v18 or higher."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $NODE_VERSION is too old. Please upgrade to v18 or higher."
    exit 1
fi

print_info "Node.js version: $NODE_VERSION"

# Check npm
if ! check_command npm "npm"; then
    print_error "npm is not installed."
    exit 1
fi

# Check MySQL (optional but recommended)
if check_command mysql "MySQL"; then
    MYSQL_AVAILABLE=true
else
    print_warning "MySQL command line tools not found in PATH."
    print_info "Please ensure MySQL is installed and mysql is in your PATH."
    MYSQL_AVAILABLE=false
fi

echo ""
print_success "All prerequisites met!"
echo ""

# =============================================================================
# Database Setup
# =============================================================================

if [ "$MYSQL_AVAILABLE" = true ]; then
    print_header "Database Setup"
    
    # Get database credentials
    read -p "Enter MySQL username (default: root): " DB_USER
    DB_USER=${DB_USER:-root}
    
    read -s -p "Enter MySQL password: " DB_PASS
    echo ""
    
    DB_NAME="project_tracking"
    
    print_info "Creating database '$DB_NAME'..."
    
    if mysql -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null; then
        print_success "Database created successfully!"
        
        # Run schema
        echo ""
        print_info "Running database schema..."
        if mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < database/schema.sql; then
            print_success "Schema applied successfully!"
        else
            print_error "Failed to apply schema."
        fi
        
        # Run seeds
        echo ""
        print_info "Seeding database..."
        for seed_file in database/seeds/*.sql; do
            if [ -f "$seed_file" ]; then
                echo "  - Processing $(basename "$seed_file")"
                mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$seed_file" || true
            fi
        done
        print_success "Database seeded successfully!"
    else
        print_error "Failed to create database. Please check your credentials and ensure MySQL is running."
        read -p "Continue with remaining setup? (y/N): " CONTINUE
        if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    print_warning "Skipping database setup (MySQL not available)"
fi

echo ""

# =============================================================================
# Backend Setup
# =============================================================================

print_header "Backend Setup"

cd backend

if [ ! -d "node_modules" ]; then
    print_info "Installing backend dependencies..."
    if npm install; then
        print_success "Backend dependencies installed!"
    else
        print_error "Failed to install backend dependencies."
        cd ..
        exit 1
    fi
else
    print_info "Backend dependencies already installed."
fi

# Create .env file
if [ ! -f ".env" ]; then
    print_info "Creating backend .env file..."
    cat > .env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${DB_NAME:-project_tracking}
DB_USER=${DB_USER:-root}
