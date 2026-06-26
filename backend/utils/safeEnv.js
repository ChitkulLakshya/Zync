// Defines a helper function to strictly enforce that a given value falls within a specified minimum and maximum integer boundary.
const clampInt = (value, min, max) => {
  // WHAT: Parses the raw value into a base-10 integer. WHY: Normalizes input to ensure we are working with a standard integer format before applying boundary checks.
  // Uses parseInt to attempt converting the provided raw value into a base-10 integer.
  const parsed = Number.parseInt(String(value), 10);
  // WHAT: Validates that the parsed result is a finite number. WHY: Prevents NaN or Infinity from passing through, ensuring subsequent math operations are safe.
  // Checks if the parsed result is a valid finite number (i.e., not NaN or Infinity), and if not, returns null as a failure indicator.
  if (!Number.isFinite(parsed)) return null;
  // WHAT: Checks if the parsed number is below the minimum allowed value. WHY: Enforces the lower bound of the acceptable range to prevent underflow or invalid logic.
  // If the valid integer is smaller than the allowed minimum, returns the minimum value.
  if (parsed < min) return min;
  // WHAT: Checks if the parsed number exceeds the maximum allowed value. WHY: Enforces the upper bound of the acceptable range to prevent overflow or excessive resource usage.
  // If the valid integer is larger than the allowed maximum, returns the maximum value.
  if (parsed > max) return max;
  // WHAT: Returns the valid, bounded integer. WHY: The value has passed all checks and is safe to use within the specified bounds.
  // Returns the perfectly valid and bounded integer if it naturally falls within the range.
  return parsed;
};

// Defines the primary utility function that safely extracts, parses, and clamps an environment variable integer, using a fallback if necessary.
const getSafeEnvInt = (key, min, max, fallback) => {
  // WHAT: Clamps the developer-provided fallback value. WHY: Ensures that even the default fallback respects the min/max constraints, avoiding bugs in misconfigured defaults.
  // Passes the developer-provided fallback value through the clamping logic to ensure even the fallback is within acceptable bounds.
  const safeFallback = clampInt(fallback, min, max);
  // WHAT: Verifies if the clamped fallback is valid. WHY: A null fallback means the developer provided an invalid default, which is a critical setup error that must be fixed.
  // If the provided fallback is not a valid number, the server throws an error at startup because it cannot safely proceed without a valid fallback.
  if (safeFallback === null) {
    // WHAT: Throws an error indicating an invalid fallback. WHY: Halts execution immediately so the developer can fix the configuration issue before deployment.
    // Throws a descriptive error indicating exactly which configuration key has an invalid fallback.
    throw new Error(`Invalid fallback for ${key}. Expected integer within [${min}, ${max}].`);
  }

  // WHAT: Reads the raw environment variable string. WHY: Extracts the runtime configuration value provided by the host environment.
  // Retrieves the raw string value from Node's process environment variables using the provided key.
  const raw = process.env[key];
  // WHAT: Checks if the environment variable is missing or empty. WHY: Determines whether we need to rely on the fallback value instead of the raw input.
  // Checks if the environment variable is completely missing or just an empty string.
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    // WHAT: Returns the safe fallback. WHY: Provides a sensible default when no environment variable is supplied, ensuring the app runs smoothly.
    // Returns the pre-validated fallback value since no environment variable was provided.
    return safeFallback;
  }

  // WHAT: Parses and clamps the raw environment variable string. WHY: Validates the user-provided config and restricts it to safe operational boundaries.
  // Attempts to parse and clamp the actual raw string from the environment variable.
  const parsed = clampInt(raw, min, max);
  // WHAT: Checks if the parsed environment variable is invalid. WHY: Protects against corrupted or non-numeric environment variables causing runtime crashes.
  // If parsing the environment variable failed entirely (e.g., it was letters instead of numbers), returns the fallback value instead.
  if (parsed === null) {
    // WHAT: Returns the safe fallback as a safety net. WHY: Ensures the application uses a valid known state even if the provided environment configuration is malformed.
    // Returns the safe fallback value to prevent the server from crashing due to malformed environment configuration.
    return safeFallback;
  }
  // WHAT: Returns the final parsed and bounded value. WHY: The configuration is fully validated and safe to be injected into the application logic.
  // Returns the successfully parsed and bounded value from the environment variables to configure the application.
  return parsed;
};

// Exports the getSafeEnvInt utility function so it can be required and used by configuration files across the backend.
module.exports = {
  // WHAT: Exposes the getSafeEnvInt function. WHY: Makes this utility accessible to other modules that need to read environment variables safely.
  // Exposes the function on the exports object.
  getSafeEnvInt,
};
