function toPositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getPagination(query = {}, options = {}) {
  const defaultLimit = options.defaultLimit ?? null;
  const maxLimit = options.maxLimit ?? 100;

  const page = toPositiveInt(query.page) || 1;
  const limit = Math.min(
    toPositiveInt(query.limit) || defaultLimit || maxLimit,
    maxLimit
  );

  const hasPaginationQuery = toPositiveInt(query.page) !== null || toPositiveInt(query.limit) !== null;
  const shouldPaginate = hasPaginationQuery || defaultLimit !== null;

  if (!shouldPaginate) {
    return null;
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function paginateArray(items, query = {}, options = {}) {
  const pagination = getPagination(query, options);
  if (!pagination) {
    return { items, pagination: null };
  }

  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.limit);
  const start = pagination.skip;
  const paginatedItems = items.slice(start, start + pagination.limit);

  return {
    items: paginatedItems,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
    },
  };
}

function setPaginationHeaders(res, pagination) {
  if (!pagination) return;

  res.set({
    'X-Page': String(pagination.page),
    'X-Limit': String(pagination.limit),
    'X-Total-Count': String(pagination.total),
    'X-Total-Pages': String(pagination.totalPages),
  });
}

module.exports = {
  getPagination,
  paginateArray,
  setPaginationHeaders,
};