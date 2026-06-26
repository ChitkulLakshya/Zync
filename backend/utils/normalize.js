/**
 * Normalize a Mongoose doc (lean or full) so the frontend sees `id` instead of `_id`.
 */
function normalizeDoc(doc) { // WHAT: Define function to normalize document. WHY: Standardize formatting for frontend.
  if (!doc) return null; // WHAT: Return null if doc is falsy. WHY: Avoid errors on empty documents.
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }; // WHAT: Convert to plain JS object. WHY: Handle both Mongoose models and lean objects.
  if (obj._id) { // WHAT: Check for _id property. WHY: Needs to be converted to 'id'.
    obj.id = obj._id.toString(); // WHAT: Create 'id' property as string. WHY: Frontend expects string ID.
    delete obj._id; // WHAT: Remove '_id' property. WHY: Ensure frontend consistency and prevent leaks of internal DB fields.
  }
  delete obj.__v; // WHAT: Delete version key. WHY: Not needed by the frontend.


  if (obj.githubIntegration) delete obj.githubIntegration.accessToken; // WHAT: Check and delete github token. WHY: Security, never send tokens to frontend.
  delete obj.deleteConfirmationCode; // WHAT: Delete confirmation code. WHY: Sensitive internal state.
  delete obj.deleteConfirmationExpires; // WHAT: Delete confirmation expiry. WHY: Internal state not useful for frontend.
  delete obj.phoneVerificationCode; // WHAT: Delete phone verification code. WHY: Sensitive data to protect against leaks.
  delete obj.phoneVerificationCodeExpires; // WHAT: Delete phone verification expiry. WHY: Clean up response payload.

  return obj; // WHAT: Return normalized object. WHY: Output the sanitized data.
}

function normalizeDocs(docs) { // WHAT: Define function to normalize array of documents. WHY: Bulk process documents.
  return (docs || []).map(normalizeDoc); // WHAT: Map over documents array. WHY: Apply normalizeDoc to each element, handling null arrays safely.
}

module.exports = { normalizeDoc, normalizeDocs }; // WHAT: Export functions. WHY: Make utilities available to controllers.
