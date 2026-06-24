/**
 * Normalize a Mongoose doc (lean or full) so the frontend sees `id` instead of `_id`.
 */
function normalizeDoc(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;

  // Security: Remove sensitive fields before sending to client
  if (obj.githubIntegration) delete obj.githubIntegration.accessToken;
  delete obj.deleteConfirmationCode;
  delete obj.deleteConfirmationExpires;
  delete obj.phoneVerificationCode;
  delete obj.phoneVerificationCodeExpires;

  return obj;
}

function normalizeDocs(docs) {
  return (docs || []).map(normalizeDoc);
}

module.exports = { normalizeDoc, normalizeDocs };
