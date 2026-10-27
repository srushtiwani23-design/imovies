const router = require('express').Router();
const c = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', c.getMyNotifications);
router.put('/read-all', c.markAllRead);
router.put('/:id/read', c.markRead);

module.exports = router;
