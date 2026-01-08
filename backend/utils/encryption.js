const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCODING = 'hex';
const IV_LENGTH = 16;
const KEY = process.env.MASTER_ENCRYPTION_KEY || '12345678901234567890123456789012'; // fallback for dev, must be 32 chars

const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString(ENCODING) + ':' + encrypted.toString(ENCODING);
};

const decrypt = (text) => {
  if (!text) return null;
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), ENCODING);
  const encryptedText = Buffer.from(textParts.join(':'), ENCODING);
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

module.exports = { encrypt, decrypt };
