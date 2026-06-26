function escapeRegExp(string) {
  // WHAT: Escapes characters with special meaning in regular expressions. WHY: Prevents user input from unintentionally altering regex logic or causing regex injection vulnerabilities.
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  // WHAT: Exports the escapeRegExp function. WHY: Allows other modules in the application to utilize this utility function safely.
  escapeRegExp
};
