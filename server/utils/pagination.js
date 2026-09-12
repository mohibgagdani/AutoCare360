const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Reads `page` and `limit` from the query string with sane bounds. */
export function getPagination(query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = toInt(query.page, 1);
  const limit = Math.min(toInt(query.limit, defaultLimit), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPageMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  };
}

/**
 * Parses "field" / "-field" sort strings against an allow-list.
 * Always appends _id as a tie breaker so pagination is stable.
 */
export function parseSort(sort, allowed, fallback = '-createdAt') {
  const raw = typeof sort === 'string' && sort ? sort : fallback;
  const field = raw.replace(/^-/, '');
  const direction = raw.startsWith('-') ? -1 : 1;
  const safeField = allowed.includes(field) ? field : fallback.replace(/^-/, '');
  const safeDirection = allowed.includes(field) ? direction : fallback.startsWith('-') ? -1 : 1;
  return { [safeField]: safeDirection, _id: safeDirection };
}

/** Runs a paginated find + count in parallel. */
export async function paginate(model, filter, { page, limit, skip, sort, populate, select, lean = true }) {
  let query = model.find(filter).sort(sort).skip(skip).limit(limit);
  if (select) query = query.select(select);
  if (populate) query = query.populate(populate);
  if (lean) query = query.lean();
  const [items, total] = await Promise.all([query, model.countDocuments(filter)]);
  return { items, meta: buildPageMeta(total, page, limit) };
}
