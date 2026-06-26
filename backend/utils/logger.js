// Defines a custom logger object that acts as a wrapper around the standard console methods to suppress output during automated testing.
const logger = {
  // Defines the info method which accepts any number of arguments using the rest operator.
  info: (...args) => {
    // Checks the NODE_ENV environment variable; if the application is not running in 'test' mode, it proceeds to log.
    if (process.env.NODE_ENV !== 'test') {
      // Calls the native console.log with the spread arguments to print informational messages to standard output.
      console.log(...args);
    }
  },
  // Defines the warn method which accepts any number of arguments to log non-fatal warnings.
  warn: (...args) => {
    // Suppresses the warning output entirely if the current environment is 'test' to keep test runner output clean.
    if (process.env.NODE_ENV !== 'test') {
      // Calls the native console.warn to print the arguments to the standard error stream with warning formatting.
      console.warn(...args);
    }
  },
  // Defines the error method which accepts any number of arguments to log critical failures and exceptions.
  error: (...args) => {
    // Suppresses error output during tests unless explicitly disabled by the developer, preventing expected errors from cluttering the test logs.
    if (process.env.NODE_ENV !== 'test') {
      // Calls the native console.error to print the arguments to the standard error stream.
      console.error(...args);
    }
  },
  // Defines the debug method which is intended for highly verbose, development-only logging.
  debug: (...args) => {
    // Ensures debug logs are ONLY printed if the environment is neither 'production' (for performance/security) nor 'test' (for cleanliness).
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      // Calls the native console.log to print the debug information to standard output.
      console.log(...args);
    }
  }
};

// Exports the customized logger object so that other backend files can use it instead of directly calling console methods.
module.exports = logger;
