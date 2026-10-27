const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, default: '' },
    genre: [{ type: String, trim: true }],
    language: { type: String, required: [true, 'Language is required'], trim: true },
    durationMins: { type: Number, required: [true, 'Duration is required'], min: 30, max: 400 },
    releaseDate: { type: Date },
    certificate: { type: String, enum: ['U', 'UA', 'A', 'S'], default: 'UA' },
    cast: [{ type: String, trim: true }],
    director: { type: String, trim: true, default: '' },
    posterUrl: { type: String, default: '' },
    trailerUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for movie search and filtering
movieSchema.index(
  { title: 'text', description: 'text' },
  { default_language: 'english', language_override: 'textLanguage' }
);
movieSchema.index({ isActive: 1, releaseDate: -1 });
movieSchema.index({ genre: 1 });
movieSchema.index({ language: 1 });

module.exports = mongoose.model('Movie', movieSchema);
