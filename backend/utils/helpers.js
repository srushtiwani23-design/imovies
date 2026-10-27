const crypto = require('crypto');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPagination = (query, defaultLimit = 12, maxLimit = 50) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

const paged = (items, total, page, limit) => ({
  success: true,
  items,
  page,
  pages: Math.max(1, Math.ceil(total / limit)),
  total,
});

const toArray = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const generateCode = (prefix = 'IMV') => `${prefix}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const formatIST = (date) =>
  new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

module.exports = { escapeRegex, getPagination, paged, toArray, parseDate, generateCode, formatIST };
