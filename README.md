# Enterprise Risk Management System

A full-stack web application for organization-wide risk management based on an Excel risk register template. This system enables department-wise risk creation, tracking, monitoring, and analytics with RPN (Risk Priority Number) calculation.

## Features

### Core Functionality
- **Risk Register Management**: Create, read, update, and delete risks with full Excel template mapping
- **RPN Calculation**: Automatic RPN = Severity × Occurrence × Detection
- **Risk Classification**: Automatic classification (Tracked/Monitored for RPN ≥ 27)
- **Action Tracking**: Preventive and mitigation action management with status tracking
- **Periodic Reviews**: Monthly/quarterly risk review cycle support
- **Audit Trail**: Complete version history and user attribution

### Dashboard & Analytics
- **Executive Dashboard**: Real-time risk overview with KPIs
- **Interactive Charts**: 
  - RPN trend analysis (area charts)
  - Risk classification distribution (pie charts)
  - Department comparison (bar charts)
  - Action status tracking (pie charts)
- **Dynamic Filtering**: Department-specific views

### Role-Based Access Control
- **Admin**: Full system access across all departments
- **Department User**: Access restricted to assigned department
- **Authentication**: Secure JWT-based authentication
- **public/css/add-risk.css and public/js/add-risk.js
- **implement /add-risk route and form processing 
- integrate magic prompt AI service 
- verify form submission and ai features 

## Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MySQL 8.0+
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs, helmet, express-validator

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Build Tool**: Create React App

## Project Structure

```
risk-management-system/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── riskController.js    # Risk CRUD operations
│   │   ├── actionController.js  # Action management
│   │   └── dashboardController.js # Dashboard aggregations
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   └── audit.js             # Audit logging
│   ├── routes/
│   │   ├── authRoutes.js        # /api/auth endpoints
│   │   ├── riskRoutes.js        # /api/risks endpoints
│   │   ├── actionRoutes.js      # /api/actions endpoints
│   │   └── dashboardRoutes.js   # /api/dashboard endpoints
│   ├── server.js                # Express app entry
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx       # Main layout with navigation
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx  # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Login page
│   │   │   ├── Dashboard.jsx    # Analytics dashboard
│   │   │   ├── RiskList.jsx     # Risk register table
│   │   │   └── RiskForm.jsx     # Create/edit risk form
│   │   ├── services/
│   │   │   └── api.js           # API client with interceptors
│   │   ├── App.js               # Main app with routing
│   │   └── index.js             # React entry point
│   └── package.json
├── database/
│   ├── schema.sql               # Database schema
│   └── setup.js                 # Database setup & seeding
├── package.json                 # Root package.json
└── README.md                    # This file
```

## Database Schema

### Core Tables

#### departments
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(100) | Department name (unique) |
| description | TEXT | Department description |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### users
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| username | VARCHAR(50) | Unique username |
| password_hash | VARCHAR(255) | Bcrypt hashed password |
| full_name | VARCHAR(100) | User's full name |
| email | VARCHAR(100) | Email address (unique) |
| role | ENUM | 'admin' or 'department_user' |
| department_id | INT | Foreign key to departments |
| is_active | BOOLEAN | Account active status |

#### risks
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| risk_id | VARCHAR(20) | Human-readable risk ID (e.g., RISK-0001) |
| department_id | INT | Foreign key to departments |
| process_function | VARCHAR(200) | Associated process/function |
| risk_description | TEXT | Risk description |
| potential_failure_mode | TEXT | Failure mode |
| potential_effects | TEXT | Effects of failure |
| severity | INT | 1-10 severity rating |
| potential_causes | TEXT | Root causes |
| current_controls_prevention | TEXT | Preventive controls |
| occurrence | INT | 1-10 occurrence rating |
| current_controls_detection | TEXT | Detection controls |
| detection | INT | 1-10 detection rating |
| rpn | INT | Generated (Severity × Occurrence × Detection) |
| risk_classification | VARCHAR(50) | Generated ('Tracked/Monitored' if RPN ≥ 27) |
| recommended_actions | TEXT | Recommended actions |
| action_status_results | TEXT | Action status/closure notes |
| created_by | INT | Foreign key to users |
| updated_by | INT | Foreign key to users |

#### risk_reviews
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| risk_id | INT | Foreign key to risks |
| review_date | DATE | Review date |
| severity | INT | 1-10 severity rating |
| occurrence | INT | 1-10 occurrence rating |
| detection | INT | 1-10 detection rating |
| rpn | INT | Generated RPN for this review |
| notes | TEXT | Review notes |
| reviewed_by | INT | Foreign key to users |

#### actions
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| risk_id | INT | Foreign key to risks |
| action_type | ENUM | 'preventive' or 'mitigation' |
| action_description | TEXT | Action description |
| action_owner | VARCHAR(100) | Responsible person |
| due_date | DATE | Target completion date |
| status | ENUM | 'open', 'in_progress', 'completed', 'overdue' |
| completion_date | DATE | Actual completion date |
| created_by | INT | Foreign key to users |
| updated_by | INT | Foreign key to users |

#### audit_logs
| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| user_id | INT | Foreign key to users |
| action | VARCHAR(50) | Action type (create, update, delete) |
| entity_type | VARCHAR(50) | Entity type (risk, action, review) |
| entity_id | INT | Entity ID |
| old_values | JSON | Previous state |
| new_values | JSON | New state |
| ip_address | VARCHAR(45) | Client IP |
| created_at | TIMESTAMP | Action timestamp |

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| GET | /api/auth/me | Get current user |

### Risks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/risks | Get all risks (with filtering) |
| GET | /api/risks/:id | Get single risk |
| POST | /api/risks | Create new risk |
| PUT | /api/risks/:id | Update risk |
| DELETE | /api/risks/:id | Delete risk |
| GET | /api/risks/:id/reviews | Get risk reviews |
| POST | /api/risks/:id/reviews | Add risk review |

### Actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/actions/risk/:risk_id | Get actions for risk |
| GET | /api/actions/overdue | Get overdue actions |
| POST | /api/actions/risk/:risk_id | Create action |
| PUT | /api/actions/:id | Update action |
| DELETE | /api/actions/:id | Delete action |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Get dashboard statistics |
| GET | /api/dashboard/departments | Get departments list |

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### 1. Database Setup

Create a MySQL database:
```sql
CREATE DATABASE risk_management;
```

Run the setup script:
```bash
cd database
node setup.js
```

### 2. Backend Configuration

Navigate to backend directory and install dependencies:
```bash
cd backend
npm install
```

Configure environment variables in `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=risk_management
JWT_SECRET=your-super-secret-key
PORT=5000
```

Start the backend server:
```bash
npm start
```

The API will be available at `http://localhost:5000/api`

### 3. Frontend Configuration

Navigate to frontend directory and install dependencies:
```bash
cd frontend
npm install
```

Configure API URL in `.env` (or use default):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start the frontend development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## Test Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| IT User | it_user | password123 |
| Finance User | finance_user | password123 |
| HR User | hr_user | password123 |
| Operations User | ops_user | password123 |
| Compliance User | comp_user | password123 |
| Sales User | sales_user | password123 |

## Excel Template Mapping

The application maps to the following Excel columns:

| Excel Column | Database Field | Description |
|--------------|----------------|-------------|
| A | risk_id | Unique risk identifier |
| B | department_id | Department name |
| C | process_function | Process or function |
| D | risk_description | Risk description |
| E | potential_failure_mode | Failure mode |
| F | potential_effects | Effects of failure |
| G | severity | Severity rating (1-10) |
| H | potential_causes | Causes of failure |
| I | current_controls_prevention | Prevention controls |
| J | occurrence | Occurrence rating (1-10) |
| K | current_controls_detection | Detection controls |
| L | detection | Detection rating (1-10) |
| M | rpn | Calculated RPN |
| N | risk_classification | Risk classification |
| O | recommended_actions | Recommended actions |
| R | preventive_actions | Preventive action type |
| S | action_owner | Action owner |
| T | due_date | Action due date |
| U | mitigation_actions | Mitigation action type |
| V | mitigation_owner | Mitigation owner |
| W | mitigation_due_date | Mitigation due date |
| X | action_status_results | Action status |

## RPN Calculation

RPN (Risk Priority Number) is calculated automatically:

```
RPN = Severity × Occurrence × Detection
```

- **Severity**: 1 (Negligible) to 10 (Catastrophic)
- **Occurrence**: 1 (Remote) to 10 (Certain)
- **Detection**: 1 (Certain) to 10 (Impossible)

**Risk Threshold**: RPN ≥ 27 automatically classifies risk as "Tracked / Monitored"

## Business Rules

1. **RPN Calculation**: Automatic calculation on every severity/occurrence/detection update
2. **Risk Classification**: Automatic classification based on RPN threshold
3. **Department Isolation**: Department users can only access their department's risks
4. **Audit Trail**: All changes are timestamped and attributed to the user
5. **Action Tracking**: Preventive and mitigation actions with status management
6. **Periodic Reviews**: Support for monthly/quarterly review cycles

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Token-based authentication with 24-hour expiry
- **Role-Based Access Control**: Admin and department user roles
- **Input Validation**: Server-side validation with express-validator
- **Security Headers**: Helmet.js for HTTP headers
- **CORS Protection**: Configured CORS policy
- **Audit Logging**: Complete change tracking

## Development

### Running in Development Mode

Backend with hot reload:
```bash
cd backend
npm run dev
```

Frontend with hot reload:
```bash
cd frontend
npm start
```

### Running Tests

Backend tests:
```bash
cd backend
npm test
```

Frontend tests:
```bash
cd frontend
npm test
```

## Production Deployment

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
```

The production build will be in the `frontend/build` directory.

## License

This project is for educational and enterprise use.

## Support

For issues and feature requests, please open an issue in the repository.
