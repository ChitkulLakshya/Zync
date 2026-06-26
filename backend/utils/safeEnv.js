// Defines a helper function to strictly enforce that a given value falls within a specified minimum and maximum integer boundary.
const clampInt = (value, min, max) => {
  // Uses parseInt to attempt converting the provided raw value into a base-10 integer.
  const parsed = Number.parseInt(String(value), 10);
  // Checks if the parsed result is a valid finite number (i.e., not NaN or Infinity), and if not, returns null as a failure indicator.
  if (!Number.isFinite(parsed)) return null;
  // If the valid integer is smaller than the allowed minimum, returns the minimum value.
  if (parsed < min) return min;
  // If the valid integer is larger than the allowed maximum, returns the maximum value.
  if (parsed > max) return max;
  // Returns the perfectly valid and bounded integer if it naturally falls within the range.
  return parsed;
};

// Defines the primary utility function that safely extracts, parses, and clamps an environment variable integer, using a fallback if necessary.
const getSafeEnvInt = (key, min, max, fallback) => {
  // Passes the developer-provided fallback value through the clamping logic to ensure even the fallback is within acceptable bounds.
  const safeFallback = clampInt(fallback, min, max);
  // If the provided fallback is not a valid number, the server throws an error at startup because it cannot safely proceed without a valid fallback.
  if (safeFallback === null) {
    // Throws a descriptive error indicating exactly which configuration key has an invalid fallback.
    throw new Error(`Invalid fallback for ${key}. Expected integer within [${min}, ${max}].`);
  }

  // Retrieves the raw string value from Node's process environment variables using the provided key.
  const raw = process.env[key];
  // Checks if the environment variable is completely missing or just an empty string.
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    // Returns the pre-validated fallback value since no environment variable was provided.
    return safeFallback;
  }

  // Attempts to parse and clamp the actual raw string from the environment variable.
  const parsed = clampInt(raw, min, max);
  // If parsing the environment variable failed entirely (e.g., it was letters instead of numbers), returns the fallback value instead.
  if (parsed === null) {
    // Returns the safe fallback value to prevent the server from crashing due to malformed environment configuration.
    return safeFallback;
  }
  // Returns the successfully parsed and bounded value from the environment variables to configure the application.
  return parsed;
};

// Exports the getSafeEnvInt utility function so it can be required and used by configuration files across the backend.
module.exports = {
  // Exposes the function on the exports object.
  getSafeEnvInt,
};
