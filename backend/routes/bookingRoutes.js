const router = require('express').Router();
const c = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);
router.post('/', c.createBooking);
router.get('/my', c.getMyBookings);
router.get('/', adminOnly, c.getAllBookings);
router.get('/:id', c.getBooking);
router.put('/:id/cancel', c.cancelBooking);

module.exports = router;
