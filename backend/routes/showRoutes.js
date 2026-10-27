const router = require('express').Router();
const c = require('../controllers/showController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, c.listShows);
router.post('/', protect, adminOnly, c.createShow);

router.get('/:id', c.getShow);
router.get('/:id/seats', c.getShowSeats);
router.post('/:id/lock', protect, c.lockSeats);
router.post('/:id/unlock', protect, c.unlockSeats);

router.put('/:id', protect, adminOnly, c.updateShow);
router.delete('/:id', protect, adminOnly, c.deleteShow);

module.exports = router;
