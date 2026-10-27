const router = require('express').Router();
const c = require('../controllers/theatreController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', c.getTheatres);
router.get('/:id', c.getTheatre);
router.post('/', protect, adminOnly, c.createTheatre);
router.put('/:id', protect, adminOnly, c.updateTheatre);
router.delete('/:id', protect, adminOnly, c.deleteTheatre);

module.exports = router;
