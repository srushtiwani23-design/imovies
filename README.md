# IMovies — Movie ticket booking made simple

IMovies is a full-stack MERN application for browsing movies, choosing showtimes, picking seats on a live seat map and booking tickets. It has secure JWT authentication, role-based access for users and admins, real-time seat availability with Socket.IO, and an admin panel for managing movies, theatres and shows.

## Features

**Users**
- Register and log in (passwords hashed with bcrypt, sessions with JWT)
- Search movies and filter by genre, language, city, theatre and date
- Movie details with showtimes grouped by theatre
- Live seat map: seats held or booked by other people update instantly (Socket.IO)
- Seats are held for 8 minutes during payment so two people can’t book the same seat
- Demo payment flow with card, UPI and net banking, including success and failure handling
- Printable e-ticket with booking code
- Dashboard with upcoming and past bookings, cancellation with refund, and profile editing
- In-app notifications for bookings, failed payments and cancellations

**Admin**
- Dashboard with revenue, bookings, shows and user counts
- Full CRUD for movies (with poster upload), theatres and shows
- Automatic seat generation for every show, with regular and premium rows
- Protection against overlapping shows on the same screen
- View all bookings with status filter

**Backend quality**
- Centralized error handling and request logging (morgan)
- API rate limiting, with stricter limits on login and register
- Pagination on movie listings, shows and booking history
- MongoDB indexes for movie search, show filtering, booking history and seat availability
- Clear separation of models, controllers, routes, middleware and services

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Redux Toolkit, React Router, Bootstrap 5, Axios, React-Toastify, Socket.IO client |
| Backend | Node.js, Express, Mongoose, JSON Web Token, bcryptjs, Multer, Socket.IO, express-rate-limit, morgan |
| Database | MongoDB (Atlas) |

## Folder structure

```
imovies/
├── backend/
│   ├── config/         # database connection
│   ├── controllers/    # request handlers
│   ├── middleware/     # auth, roles, errors, rate limits, uploads
│   ├── models/         # User, Movie, Theatre, Show, Seat, Booking, Payment, Notification
│   ├── routes/         # API routes
│   ├── services/       # seat locking logic
│   ├── socket/         # real-time seat updates
│   ├── seed/           # demo data script
│   ├── utils/
│   └── server.js
└── frontend/
    └── src/
        ├── api/        # axios instance
        ├── components/
        ├── pages/      # user pages and admin/ pages
        ├── store/      # Redux store and auth slice
        └── utils/
```

## Database design

| Collection | Purpose |
| --- | --- |
| users | Account details and role (user or admin) |
| movies | Movie information, genres, language, poster |
| theatres | Theatre name, city, address, number of screens |
| shows | A movie playing at a theatre screen at a given time, with prices and seat layout |
| seats | One document per seat per show, with status: available, locked or booked |
| bookings | Links a user to a show with chosen seats, amount and status |
| payments | Payment attempt for a booking, with method, status and transaction id |
| notifications | Messages shown to the user in the app |

Each booking links a user to a movie show. Show documents store theatre details, timings and seat availability.

## Getting started

### Requirements
- Node.js 18 or newer
- A MongoDB Atlas cluster (free tier is enough)

### 1. Backend
```bash
cd backend
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET
npm install
npm run seed              # loads demo movies, theatres, shows and two accounts
npm run dev               # starts on http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:5000
npm install
npm run dev               # opens on http://localhost:5173
```

### Demo accounts (created by the seed script)

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@imovies.com | Admin@123 |
| User | user@imovies.com | User@123 |

### Demo payments
No real money is charged. Any correctly formatted card or UPI ID succeeds. To test a failed payment use card `4000 0000 0000 0002` or UPI ID `fail@upi`.

## Environment variables

**backend/.env**

| Variable | Description |
| --- | --- |
| PORT | Server port (default 5000) |
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | Secret used to sign tokens |
| JWT_EXPIRES_IN | Token lifetime, for example 7d |
| CLIENT_URL | Frontend URL(s) allowed by CORS, comma separated |
| LOCK_MINUTES | How long seats are held during payment |
| CANCEL_WINDOW_HOURS | Latest time before a show that a booking can be cancelled |
| NODE_ENV | development or production |

**frontend/.env**

| Variable | Description |
| --- | --- |
| VITE_API_URL | Backend URL without a trailing slash |

## API overview

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | /api/auth/register | Public | Create account |
| POST | /api/auth/login | Public | Log in |
| GET / PUT | /api/auth/me | User | View or update profile |
| GET | /api/movies | Public | List movies with search, filters and pagination |
| GET | /api/movies/filters | Public | Genres, languages and cities |
| GET | /api/movies/:id | Public | Movie details |
| GET | /api/movies/:id/shows | Public | Upcoming shows for a movie |
| POST / PUT / DELETE | /api/movies(/:id) | Admin | Manage movies |
| GET / POST / PUT / DELETE | /api/theatres(/:id) | Public read, admin write | Manage theatres |
| GET | /api/shows/:id | Public | Show details |
| GET | /api/shows/:id/seats | Public | Seat map with live status |
| POST | /api/shows/:id/lock | User | Hold seats before payment |
| POST | /api/shows/:id/unlock | User | Release held seats |
| GET / POST / PUT / DELETE | /api/shows(/:id) | Admin | Manage shows |
| POST | /api/bookings | User | Pay and confirm a booking |
| GET | /api/bookings/my | User | Booking history (upcoming or past) |
| GET | /api/bookings/:id | Owner or admin | Booking details |
| PUT | /api/bookings/:id/cancel | Owner or admin | Cancel and refund |
| GET | /api/bookings | Admin | All bookings |
| GET / PUT | /api/notifications | User | Notifications |
| GET | /api/admin/stats | Admin | Dashboard numbers |

### Real-time events (Socket.IO)
- Client emits `show:join` and `show:leave` with a show id
- Server emits `seats:update` with `{ showId, labels, status, userId }` whenever seats are held, released, booked or cancelled

## Deployment
- **Backend:** Render web service, root directory `backend`, build `npm install`, start `npm start`
- **Frontend:** Vercel, root directory `frontend`, framework Vite, environment variable `VITE_API_URL`
- After deploying the frontend, set `CLIENT_URL` on the backend to the frontend URL

Note: files uploaded to the backend’s disk are lost when a free Render instance restarts, so poster image URLs are recommended in production.
