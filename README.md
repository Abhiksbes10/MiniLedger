
# MiniLedger

MiniLedger is a simple lending tracker that helps users record money lent to friends, track repayments, and identify overdue loans.

## Features

- Phone number login with mock OTP verification.
- Add loans with friend name, amount, and due date.
- View loans and repayment status.
- Mark loans as repaid.
- Dashboard summary showing total lent, total repaid, and overdue amount.
- Highlights overdue loans.

## Tech Stack

**Backend**
- Node.js
- TypeScript
- Express.js
- PostgreSQL

**Frontend**
- React Native
- Expo

## Prerequisites

Install the following:
- Node.js and npm
- PostgreSQL
- A web browser

## Project Structure

```text
MiniLedger/
├── mobile/          # React Native Expo application
├── src/
│   └── server.ts    # Backend API
├── .env             # Local environment configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Database Setup

Create a PostgreSQL database named `miniledger`.

Run the following SQL in the database:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_name VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    is_repaid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Backend Configuration

Create a `.env` file in the project root:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
DB_NAME=miniledger
PORT=5000
```

Replace `YOUR_POSTGRES_PASSWORD` with your local PostgreSQL password.

**Never commit your `.env` file or database password to GitHub.**

## Run the Backend

Open a terminal in the project root and run:

```bash
npm install
npm run build
npm run dev
```

The API runs at `http://localhost:5000`.

Check the database connection:

```text
GET http://localhost:5000/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Run the Frontend

Open a second terminal:

```bash
cd mobile
npm install
npm run web
```

Open the local URL printed by Expo in your browser.

The frontend currently uses `http://localhost:5000` as its API URL. For an Android emulator, use `http://10.0.2.2:5000`. For a physical phone, configure your computer's local network IP address.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check API and database |
| POST | `/auth/request-otp` | Generate a mock OTP |
| POST | `/auth/verify-otp` | Verify OTP and log in |
| GET | `/loans?userId=1` | List a user's loans |
| POST | `/loans` | Add a loan |
| PATCH | `/loans/:id/repaid` | Mark a loan as repaid |
| GET | `/summary/:userId` | Get lending summary |

### Example: Request OTP

```json
{
  "phone": "9876543210"
}
```

The mock OTP is printed in the backend terminal.

### Example: Add a Loan

```json
{
  "userId": 1,
  "friendName": "Rahul",
  "amount": 1500,
  "dueDate": "2026-11-20"
}
```

## Testing

The following have been tested locally:
- Database health check.
- Mock OTP generation and verification.
- Creating and listing loans.
- Marking a loan as repaid.
- Summary calculation.
- Frontend login and dashboard.
- Adding a loan and displaying overdue status.

## Limitations

- OTP is for demonstration purposes and is not a real SMS service.
- OTPs are stored in server memory and expire after five minutes.
- Authentication is intended for this assignment demo, not production use.
- No receipt-photo upload is currently implemented.

## Security

- Keep `.env` and credentials private.
- Use environment variables for database configuration.
- Do not use mock OTP authentication in production.

## Author

Developed as a MiniLedger full-stack application assignment.
