const clampInt = (value, min, max) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
};

const getSafeEnvInt = (key, min, max, fallback) => {
  const safeFallback = clampInt(fallback, min, max);
  if (safeFallback === null) {
    throw new Error(`Invalid fallback for ${key}. Expected integer within [${min}, ${max}].`);
  }

  const raw = process.env[key];
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return safeFallback;
  }

  const parsed = clampInt(raw, min, max);
  if (parsed === null) {
    return safeFallback;
  }
  return parsed;
};

module.exports = {
  getSafeEnvInt,
};
