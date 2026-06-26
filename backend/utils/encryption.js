const crypto = require('crypto'); // WHAT: Imports the built-in Node.js crypto module. WHY: Needed to perform cryptographic operations like encryption and decryption.

const ALGORITHM = 'aes-256-cbc'; // WHAT: Defines the encryption algorithm. WHY: AES-256-CBC is a standard, secure symmetric encryption algorithm.
const ENCODING = 'hex'; // WHAT: Defines the character encoding for the cipher text. WHY: Hex is commonly used to represent binary data as a readable string.
const IV_LENGTH = 16; // WHAT: Sets the Initialization Vector length to 16 bytes. WHY: AES block size is 128 bits (16 bytes), requiring a 16-byte IV.
const KEY = process.env.MASTER_ENCRYPTION_KEY || '12345678901234567890123456789012'; // WHAT: Retrieves the encryption key from environment or falls back to a default. WHY: Secures the application data, fallback is for development if env is not set.

const encrypt = (text) => { // WHAT: Defines an encryption function. WHY: To provide a reusable utility for encrypting sensitive strings.
  if (!text) return null; // WHAT: Checks if the input text is falsy. WHY: Avoids errors when attempting to encrypt empty or null values.
  const iv = crypto.randomBytes(IV_LENGTH); // WHAT: Generates a random Initialization Vector. WHY: Ensures that encrypting the same text multiple times yields different ciphertexts for security.
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY), iv); // WHAT: Creates a cipher instance with algorithm, key, and IV. WHY: Prepares the crypto module to perform the encryption.
  let encrypted = cipher.update(text); // WHAT: Encrypts the provided text. WHY: Processes the input data into encrypted binary data.
  encrypted = Buffer.concat([encrypted, cipher.final()]); // WHAT: Finalizes the encryption and concatenates any remaining data. WHY: Required to ensure all blocks are padded and encrypted completely.
  return iv.toString(ENCODING) + ':' + encrypted.toString(ENCODING); // WHAT: Returns the IV and encrypted text joined by a colon. WHY: The IV must be stored alongside the ciphertext to enable decryption later.
};

const decrypt = (text) => { // WHAT: Defines a decryption function. WHY: To provide a reusable utility for decrypting previously encrypted strings.
  if (!text) return null; // WHAT: Checks if the input text is falsy. WHY: Prevents errors if there is no data to decrypt.
  const textParts = text.split(':'); // WHAT: Splits the input string by the colon delimiter. WHY: Separates the IV from the actual encrypted data.
  const iv = Buffer.from(textParts.shift(), ENCODING); // WHAT: Extracts the IV from the first part and converts it back to a Buffer. WHY: The decipher requires the exact same IV used during encryption.
  const encryptedText = Buffer.from(textParts.join(':'), ENCODING); // WHAT: Reconstructs the ciphertext and converts it to a Buffer. WHY: Prepares the encrypted data for the deciphering process.
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY), iv); // WHAT: Creates a decipher instance with the algorithm, key, and extracted IV. WHY: Prepares the crypto module for reversing the encryption.
  let decrypted = decipher.update(encryptedText); // WHAT: Decrypts the ciphertext. WHY: Transforms the encrypted binary data back into the original format.
  decrypted = Buffer.concat([decrypted, decipher.final()]); // WHAT: Finalizes the decryption process. WHY: Ensures any padding is correctly handled and all data is outputted.
  return decrypted.toString(); // WHAT: Converts the decrypted buffer to a string. WHY: Returns the original plaintext to the caller.
};

module.exports = { encrypt, decrypt }; // WHAT: Exports the encrypt and decrypt functions. WHY: Makes these utility functions available to other modules in the application.
