const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, toArray } = require('../utils/helpers');

const pickFields = (body) => {
  const data = {};
  ['name', 'city', 'address'].forEach((k) => {
    if (body[k] !== undefined) data[k] = body[k];
  });
  if (body.screens !== undefined) data.screens = Number(body.screens);
  if (body.amenities !== undefined) data.amenities = toArray(body.amenities);
  return data;
};

// GET /api/theatres?city=
exports.getTheatres = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.city) filter.city = { $regex: `^${escapeRegex(req.query.city.trim())}$`, $options: 'i' };
  const theatres = await Theatre.find(filter).sort({ city: 1, name: 1 }).lean();
  res.json({ success: true, theatres });
});

// GET /api/theatres/:id
exports.getTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw new AppError('Theatre not found', 404);
  res.json({ success: true, theatre });
});

// POST /api/theatres (admin)
exports.createTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.create(pickFields(req.body));
  res.status(201).json({ success: true, theatre });
});

// PUT /api/theatres/:id (admin)
exports.updateTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findByIdAndUpdate(req.params.id, pickFields(req.body), {
    new: true,
    runValidators: true,
  });
  if (!theatre) throw new AppError('Theatre not found', 404);
  res.json({ success: true, theatre });
});

// DELETE /api/theatres/:id (admin)
exports.deleteTheatre = asyncHandler(async (req, res) => {
  if (await Show.exists({ theatre: req.params.id })) {
    throw new AppError('This theatre still has shows. Delete its shows first.', 400);
  }
  const theatre = await Theatre.findByIdAndDelete(req.params.id);
  if (!theatre) throw new AppError('Theatre not found', 404);
  res.json({ success: true, message: 'Theatre deleted' });
});
