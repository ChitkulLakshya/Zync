const { describe, test, expect } = require("bun:test");
const { encrypt, decrypt } = require("./encryption");

describe("Encryption Utils", () => {
  const originalText = "Hello, World!";


  test("should return null if input is null, undefined, or empty", () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt(undefined)).toBeNull();
    expect(encrypt("")).toBeNull();

    expect(decrypt(null)).toBeNull();
    expect(decrypt(undefined)).toBeNull();
    expect(decrypt("")).toBeNull();
  });

  test("should encrypt a string", () => {
    const encrypted = encrypt(originalText);
    expect(encrypted).not.toBeNull();
    expect(typeof encrypted).toBe("string");
    expect(encrypted).not.toEqual(originalText);

    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  test("should decrypt an encrypted string back to original", () => {
    const encrypted = encrypt(originalText);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(originalText);
  });

  test("should produce different ciphertexts for same input (IV randomness)", () => {
    const encrypted1 = encrypt(originalText);
    const encrypted2 = encrypt(originalText);
    expect(encrypted1).not.toEqual(encrypted2);
  });

  test("should handle longer strings", () => {
    const longText = "a".repeat(1000);
    const encrypted = encrypt(longText);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(longText);
  });

  test("should handle special characters", () => {
    const specialText = "!@#$%^&*()_+{}[]|:;<>,.?/~`";
    const encrypted = encrypt(specialText);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(specialText);
  });

  test("should handle unicode characters", () => {
      const unicodeText = "Hello 🌍";
      const encrypted = encrypt(unicodeText);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toEqual(unicodeText);
  });
});
