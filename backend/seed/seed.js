/* Fills the database with demo data. Run with: npm run seed
 * WARNING: this deletes all existing data first. */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { buildSeats } = require('../utils/seatGenerator');

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const movies = [
  {
    title: 'Monsoon Express',
    description: 'Two strangers on a delayed overnight train to Goa realise the journey matters more than where it ends.',
    genre: ['Drama', 'Romance'], language: 'Hindi', durationMins: 142, certificate: 'UA',
    director: 'Ritu Sharma', cast: ['Arjun Mehta', 'Kavya Rao', 'Imran Qureshi'], releaseDate: daysAgo(10),
  },
  {
    title: 'Code Red: Mumbai',
    description: 'A cyber-crime officer has six hours to stop a blackout planned across the city.',
    genre: ['Action', 'Thriller'], language: 'Hindi', durationMins: 156, certificate: 'UA',
    director: 'Vikram Desai', cast: ['Rohan Kapoor', 'Sana Sheikh'], releaseDate: daysAgo(4),
  },
  {
    title: 'The Last Orbit',
    description: 'The crew of a failing space station must choose who gets the only seat home.',
    genre: ['Sci-Fi', 'Adventure'], language: 'English', durationMins: 138, certificate: 'UA',
    director: 'Elena Park', cast: ['Marcus Hale', 'Priya Nair', 'Tom Becker'], releaseDate: daysAgo(18),
  },
  {
    title: 'Laugh Riot',
    description: 'A wedding planner accidentally books three weddings at the same venue on the same night.',
    genre: ['Comedy', 'Family'], language: 'Hindi', durationMins: 124, certificate: 'U',
    director: 'Neha Batra', cast: ['Kunal Verma', 'Ayesha Khan'], releaseDate: daysAgo(7),
  },
  {
    title: 'Shadows of Pune',
    description: 'A podcaster investigating an old haveli starts receiving messages from its past owners.',
    genre: ['Horror', 'Mystery'], language: 'Marathi', durationMins: 118, certificate: 'A',
    director: 'Sameer Joshi', cast: ['Gauri Patil', 'Nikhil Deshmukh'], releaseDate: daysAgo(2),
  },
  {
    title: 'Kaveri Dreams',
    description: 'Three generations of a farming family come together to save their land from a drought.',
    genre: ['Drama', 'Family'], language: 'Tamil', durationMins: 150, certificate: 'U',
    director: 'S. Raghavan', cast: ['Meena Krishnan', 'Arvind Swamy R.'], releaseDate: daysAgo(14),
  },
  {
    title: 'Pixel Warriors',
    description: 'Four kids get pulled into a retro video game and must finish the final level to get out.',
    genre: ['Animation', 'Adventure'], language: 'English', durationMins: 105, certificate: 'U',
    director: 'Lily Chen', cast: ['Voice cast'], releaseDate: daysAgo(21),
  },
  {
    title: 'Thunder Run',
    description: 'A small-town sprinter fights injury and politics to reach the national championship.',
    genre: ['Action', 'Sports'], language: 'Telugu', durationMins: 160, certificate: 'UA',
    director: 'Kiran Reddy', cast: ['Varun Teja K.', 'Divya Rao'], releaseDate: daysAgo(5),
  },
];

const theatres = [
  { name: 'Starlight Cinemas', city: 'Mumbai', address: 'Link Road, Andheri West', screens: 3, amenities: ['Dolby Atmos', 'Recliners', 'Food court'] },
  { name: 'Sea Breeze Multiplex', city: 'Mumbai', address: 'Hill Road, Bandra West', screens: 3, amenities: ['4K Projection', 'Parking'] },
  { name: 'Galaxy Screens', city: 'Pune', address: 'FC Road, Shivajinagar', screens: 3, amenities: ['Dolby Atmos', 'Parking'] },
  { name: 'Royal Talkies', city: 'Delhi', address: 'Connaught Place', screens: 3, amenities: ['IMAX', 'Recliners', 'Cafe'] },
];

const SLOTS = [[10, 0], [13, 45], [17, 30], [21, 15]]; // Indian Standard Time
const IST_OFFSET_MIN = 330;

// Returns a Date for the given IST day offset and time, independent of the machine's timezone
function istDate(dayOffset, hour, minute) {
  const nowIst = new Date(Date.now() + IST_OFFSET_MIN * 60 * 1000);
  const utc = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + dayOffset, hour, minute);
  return new Date(utc - IST_OFFSET_MIN * 60 * 1000);
}

async function seed() {
  await connectDB();
  console.log('Clearing old data...');
  await Promise.all([
    User.deleteMany({}), Movie.deleteMany({}), Theatre.deleteMany({}), Show.deleteMany({}),
    Seat.deleteMany({}), Booking.deleteMany({}), Payment.deleteMany({}), Notification.deleteMany({}),
  ]);

  // User.create runs the password hashing hook
  await User.create({ name: 'IMovies Admin', email: 'admin@imovies.com', password: 'Admin@123', role: 'admin', city: 'Mumbai' });
  await User.create({ name: 'Demo User', email: 'user@imovies.com', password: 'User@123', city: 'Mumbai', phone: '9876543210' });

  const movieDocs = await Movie.insertMany(movies);
  const theatreDocs = await Theatre.insertMany(theatres);

  const soon = Date.now() + 30 * 60 * 1000;
  const showDocs = [];
  for (let day = 0; day < 3; day += 1) {
    theatreDocs.forEach((theatre, ti) => {
      for (let screen = 1; screen <= theatre.screens; screen += 1) {
        SLOTS.forEach(([h, m], si) => {
          const start = istDate(day, h, m);
          if (start.getTime() < soon) return;
          const movie = movieDocs[(ti * 3 + screen + si + day) % movieDocs.length];
          const is3D = screen === 3;
          const rows = 8;
          const seatsPerRow = 12;
          showDocs.push({
            movie: movie._id,
            theatre: theatre._id,
            screen,
            startTime: start,
            endTime: new Date(start.getTime() + (movie.durationMins + 20) * 60 * 1000),
            language: movie.language,
            format: is3D ? '3D' : '2D',
            prices: is3D ? { regular: 250, premium: 380 } : { regular: 180, premium: 290 },
            rows,
            seatsPerRow,
            premiumRows: 2,
            totalSeats: rows * seatsPerRow,
            availableSeats: rows * seatsPerRow,
          });
        });
      }
    });
  }

  const createdShows = await Show.insertMany(showDocs);
  const seats = createdShows.flatMap((show) => buildSeats(show));
  await Seat.insertMany(seats);

  console.log('\nSeed complete');
  console.log(`  Movies:   ${movieDocs.length}`);
  console.log(`  Theatres: ${theatreDocs.length}`);
  console.log(`  Shows:    ${createdShows.length}`);
  console.log(`  Seats:    ${seats.length}`);
  console.log('\nLogin details');
  console.log('  Admin: admin@imovies.com / Admin@123');
  console.log('  User:  user@imovies.com  / User@123\n');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
