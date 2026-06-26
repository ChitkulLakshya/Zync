// WHAT: Defines a custom logger object. WHY: Acts as a wrapper around standard console methods to suppress output during automated testing.
const logger = { // WHAT: Create logger object. WHY: To group logging functions.
  // WHAT: Defines info method. WHY: To log general information.
  info: (...args) => { // WHAT: Accept arguments via rest operator. WHY: To allow flexible number of arguments.
    // WHAT: Check if environment is not 'test'. WHY: To avoid cluttering test output with logs.
    if (process.env.NODE_ENV !== 'test') { // WHAT: Evaluate environment variable. WHY: Test environment shouldn't show info logs.
      // WHAT: Call console.log. WHY: To print the actual informational messages.
      console.log(...args); // WHAT: Spread arguments. WHY: To pass all received arguments to console.log.
    }
  },
  // WHAT: Defines warn method. WHY: To log non-fatal warnings.
  warn: (...args) => { // WHAT: Accept arguments for warn. WHY: Flexible arguments.
    // WHAT: Suppress warning output if environment is 'test'. WHY: Keep test runner output clean.
    if (process.env.NODE_ENV !== 'test') { // WHAT: Check environment variable. WHY: Conditional logging.
      // WHAT: Call console.warn. WHY: To print standard error stream with warning formatting.
      console.warn(...args); // WHAT: Spread arguments. WHY: Pass all warning details.
    }
  },
  // WHAT: Defines error method. WHY: To log critical failures and exceptions.
  error: (...args) => { // WHAT: Accept arguments for error. WHY: Capture all error details.
    // WHAT: Check environment against 'test'. WHY: Prevent expected errors from cluttering test logs.
    if (process.env.NODE_ENV !== 'test') { // WHAT: Conditional check. WHY: Testing doesn't need to see console errors if they are expected.
      // WHAT: Call console.error. WHY: Print arguments to standard error stream.
      console.error(...args); // WHAT: Spread arguments. WHY: Correct formatting of errors.
    }
  },
  // WHAT: Defines debug method. WHY: Intended for highly verbose, development-only logging.
  debug: (...args) => { // WHAT: Accept arguments for debug. WHY: Debugging might need multiple data points.
    // WHAT: Check environment against production and test. WHY: Performance/security in prod, cleanliness in test.
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') { // WHAT: Evaluate NODE_ENV. WHY: Ensure debug logs only show in development/local environments.
      // WHAT: Call console.log. WHY: Print debug info to standard output.
      console.log(...args); // WHAT: Spread arguments. WHY: Accurately dump all debug data.
    }
  }
};

// WHAT: Exports the logger object. WHY: Allow other files to use it instead of direct console calls.
module.exports = logger; // WHAT: Assign to module.exports. WHY: Expose the object for CommonJS imports.
