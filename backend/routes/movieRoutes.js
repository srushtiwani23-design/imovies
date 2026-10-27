const router = require('express').Router();
const c = require('../controllers/movieController');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', optionalAuth, c.getMovies);
router.get('/filters', c.getFilters);
router.get('/:id', optionalAuth, c.getMovie);
router.get('/:id/shows', c.getMovieShows);

router.post('/', protect, adminOnly, upload.single('poster'), c.createMovie);
router.put('/:id', protect, adminOnly, upload.single('poster'), c.updateMovie);
router.delete('/:id', protect, adminOnly, c.deleteMovie);

module.exports = router;
