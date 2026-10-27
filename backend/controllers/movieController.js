const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Theatre = require('../models/Theatre');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, getPagination, paged, toArray, parseDate } = require('../utils/helpers');

const pickMovieFields = (body) => {
  const data = {};
  ['title', 'description', 'language', 'director', 'posterUrl', 'trailerUrl', 'certificate'].forEach((key) => {
    if (body[key] !== undefined) data[key] = body[key];
  });
  if (body.durationMins !== undefined) data.durationMins = Number(body.durationMins);
  if (body.releaseDate !== undefined) data.releaseDate = body.releaseDate || null;
  if (body.genre !== undefined) data.genre = toArray(body.genre);
  if (body.cast !== undefined) data.cast = toArray(body.cast);
  if (body.isActive !== undefined) data.isActive = body.isActive === true || body.isActive === 'true';
  return data;
};

const theatreIdsInCity = (city) =>
  Theatre.find({ city: { $regex: `^${escapeRegex(city.trim())}$`, $options: 'i' } }).distinct('_id');

// GET /api/movies?search=&genre=&language=&city=&theatre=&from=&to=&sort=&page=&limit=
exports.getMovies = asyncHandler(async (req, res) => {
  const { search, genre, language, city, theatre, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query, 12);
  const filter = {};

  const includeInactive = req.user?.role === 'admin' && req.query.includeInactive === 'true';
  if (!includeInactive) filter.isActive = true;
  if (search && search.trim()) filter.title = { $regex: escapeRegex(search.trim()), $options: 'i' };
  if (genre) filter.genre = genre;
  if (language) filter.language = language;

  // Theatre, city and date filters only keep movies that actually have matching shows
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  if (city || theatre || from || to) {
    const now = new Date();
    const showFilter = { isActive: true, startTime: { $gte: from && from > now ? from : now } };
    if (to) showFilter.startTime.$lt = to;
    if (theatre) showFilter.theatre = theatre;
    else if (city) showFilter.theatre = { $in: await theatreIdsInCity(city) };
    filter._id = { $in: await Show.distinct('movie', showFilter) };
  }

  const sortMap = {
    latest: { releaseDate: -1, createdAt: -1 },
    title: { title: 1 },
    duration: { durationMins: 1 },
  };

  const [items, total] = await Promise.all([
    Movie.find(filter).sort(sortMap[sort] || sortMap.latest).skip(skip).limit(limit).lean(),
    Movie.countDocuments(filter),
  ]);
  res.json(paged(items, total, page, limit));
});

// GET /api/movies/filters - values for the filter dropdowns
exports.getFilters = asyncHandler(async (req, res) => {
  const [genres, languages, cities] = await Promise.all([
    Movie.distinct('genre', { isActive: true }),
    Movie.distinct('language', { isActive: true }),
    Theatre.distinct('city'),
  ]);
  res.json({ success: true, genres: genres.sort(), languages: languages.sort(), cities: cities.sort() });
});

// GET /api/movies/:id
exports.getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie || (!movie.isActive && req.user?.role !== 'admin')) throw new AppError('Movie not found', 404);
  res.json({ success: true, movie });
});

// GET /api/movies/:id/shows?city=&from=&to=
exports.getMovieShows = asyncHandler(async (req, res) => {
  const now = new Date();
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  const filter = {
    movie: req.params.id,
    isActive: true,
    startTime: { $gte: from && from > now ? from : now },
  };
  if (to) filter.startTime.$lt = to;
  if (req.query.city) filter.theatre = { $in: await theatreIdsInCity(req.query.city) };

  const shows = await Show.find(filter)
    .populate('theatre', 'name city address amenities')
    .select('theatre screen startTime format language prices availableSeats totalSeats')
    .sort({ startTime: 1 })
    .limit(300)
    .lean();
  res.json({ success: true, shows });
});

// POST /api/movies (admin, multipart with optional "poster" file)
exports.createMovie = asyncHandler(async (req, res) => {
  const data = pickMovieFields(req.body);
  if (req.file) data.posterUrl = `/uploads/${req.file.filename}`;
  const movie = await Movie.create(data);
  res.status(201).json({ success: true, movie });
});

// PUT /api/movies/:id (admin)
exports.updateMovie = asyncHandler(async (req, res) => {
  const data = pickMovieFields(req.body);
  if (req.file) data.posterUrl = `/uploads/${req.file.filename}`;
  const movie = await Movie.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!movie) throw new AppError('Movie not found', 404);
  res.json({ success: true, movie });
});

// DELETE /api/movies/:id (admin)
exports.deleteMovie = asyncHandler(async (req, res) => {
  const showCount = await Show.countDocuments({ movie: req.params.id });
  if (showCount) {
    throw new AppError('This movie still has shows. Delete its shows first, or mark the movie inactive.', 400);
  }
  const movie = await Movie.findByIdAndDelete(req.params.id);
  if (!movie) throw new AppError('Movie not found', 404);
  res.json({ success: true, message: 'Movie deleted' });
});
