/**
 * @fileoverview uploadRoutes.js
 * @module uploadRoutes
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Server-Side API & Business Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
const express = require('express'); // Imports the 'express' module, which is a web framework for Node.js, to create and manage server-side applications.
const router = express.Router(); // Creates a new router object from Express, which allows for modular, mountable route handlers to organize API endpoints.
const multer = require('multer'); // Imports the 'multer' module, a Node.js middleware for handling `multipart/form-data`, primarily used for uploading files.
const path = require('path'); // Imports the 'path' module, a built-in Node.js module, to handle and transform file paths, ensuring cross-platform compatibility.
const fs = require('fs'); // Imports the 'fs' (file system) module, a built-in Node.js module, to interact with the file system, such as reading or writing files.
const crypto = require('crypto'); // Imports the 'crypto' module, a built-in Node.js module, to provide cryptographic functionality, used here for generating unique identifiers.
const {
  deleteCloudinaryAsset, // Destructures and imports the 'deleteCloudinaryAsset' function from the 'cloudinaryService' file, used to remove assets from Cloudinary.
  uploadProfilePhoto, // Destructures and imports the 'uploadProfilePhoto' function from the 'cloudinaryService' file, used to upload profile photos to Cloudinary.
} = require('../services/cloudinaryService'); // Specifies the path to the 'cloudinaryService' file from which the functions are imported.
const authMiddleware = require('../middleware/authMiddleware'); // Imports the 'authMiddleware' function, which is a custom middleware used to authenticate user requests before processing.
const User = require('../models/User'); // Imports the 'User' Mongoose model, representing the user schema in the database, to interact with user data.
const { normalizeDoc } = require('../utils/normalize'); // Destructures and imports the 'normalizeDoc' function from the 'normalize' utility file, though it appears unused in this specific file.
const mime = require('mime-types'); // Imports the 'mime-types' module, which provides a mapping between file extensions and MIME types, used for file type validation and extension determination.


const uploadDir = path.join(__dirname, '../uploads'); // Defines the directory path where uploaded files will be temporarily stored, joining the current directory with '../uploads' for a relative path.
if (!fs.existsSync(uploadDir)) { // Checks if the 'uploadDir' directory does not exist in the file system.
  fs.mkdirSync(uploadDir, { recursive: true }); // Synchronously creates the 'uploadDir' directory, including any necessary parent directories, to ensure the upload location is available.
}


const BLOCKED_MIME_TYPES = [ // Declares a constant array named 'BLOCKED_MIME_TYPES'.
  'image/svg+xml', // Specifies 'image/svg+xml' as a blocked MIME type to prevent potential SVG-based XSS attacks.
  'text/html', // Specifies 'text/html' as a blocked MIME type to prevent direct upload of HTML files that could contain malicious scripts.
  'application/xhtml+xml', // Specifies 'application/xhtml+xml' as a blocked MIME type for similar security reasons as 'text/html'.
  'application/javascript', // Specifies 'application/javascript' as a blocked MIME type to prevent direct upload of executable JavaScript files.
  'text/javascript', // Specifies 'text/javascript' as a blocked MIME type, also to prevent direct upload of executable JavaScript files.
];


const SAFE_EXTENSIONS = { // Declares a constant object named 'SAFE_EXTENSIONS'.
  'text/plain': '.txt', // Maps the 'text/plain' MIME type to the '.txt' file extension for consistent naming.
  'image/png': '.png', // Maps the 'image/png' MIME type to the '.png' file extension for consistent naming.
  'image/jpeg': '.jpg', // Maps the 'image/jpeg' MIME type to the '.jpg' file extension for consistent naming.
  'image/gif': '.gif', // Maps the 'image/gif' MIME type to the '.gif' file extension for consistent naming.
  'image/webp': '.webp', // Maps the 'image/webp' MIME type to the '.webp' file extension for consistent naming.
  'application/pdf': '.pdf', // Maps the 'application/pdf' MIME type to the '.pdf' file extension for consistent naming.
  'application/zip': '.zip', // Maps the 'application/zip' MIME type to the '.zip' file extension for consistent naming.
  'application/json': '.json', // Maps the 'application/json' MIME type to the '.json' file extension for consistent naming.
  'text/csv': '.csv', // Maps the 'text/csv' MIME type to the '.csv' file extension for consistent naming.
};


const storage = multer.diskStorage({ // Configures Multer to use disk storage, defining how files should be stored on the server's file system.
  destination: (req, file, cb) => { // Defines the function that determines the destination directory for uploaded files.
    cb(null, uploadDir); // Calls the callback function with no error (null) and specifies 'uploadDir' as the directory where files will be saved.
  },
  filename: (req, file, cb) => { // Defines the function that determines the name of the file on disk.
    const uniqueSuffix = crypto.randomBytes(16).toString('hex'); // Generates a cryptographically strong pseudo-random 16-byte sequence and converts it to a hexadecimal string to ensure unique filenames.

    const contentType = file.mimetype; // Extracts the MIME type of the uploaded file from the 'file' object provided by Multer.
    const safeExt = // Declares a constant variable 'safeExt' to store the determined file extension.
      SAFE_EXTENSIONS[contentType] || mime.extension(contentType) // Attempts to find a predefined safe extension from 'SAFE_EXTENSIONS' based on the content type, or falls back to using 'mime.extension' to derive it.
        ? '.' + mime.extension(contentType) // If a safe extension is found or derived, prepends a dot to it.
        : path.extname(file.originalname); // If no safe extension is found or derived, uses the original file's extension as a fallback.
    cb(null, `${uniqueSuffix}${safeExt}`); // Calls the callback function with no error (null) and provides the new unique filename, combining the unique suffix and the determined safe extension.
  },
});

const upload = multer({ // Initializes Multer with the specified configuration for file uploads.
  storage, // Sets the storage engine for Multer to the 'storage' configuration defined above, which handles where and how files are saved.
  limits: { fileSize: 10 * 1024 * 1024 }, // Sets a file size limit of 10 megabytes (10 * 1024 * 1024 bytes) for uploaded files to prevent excessively large uploads.
  fileFilter: (req, file, cb) => { // Defines a function to filter incoming files, allowing or rejecting them based on custom criteria.
    if (BLOCKED_MIME_TYPES.includes(file.mimetype)) { // Checks if the MIME type of the uploaded file is present in the 'BLOCKED_MIME_TYPES' array.
      return cb(new Error('File type not allowed'), false); // If the file type is blocked, calls the callback with an error message and 'false' to reject the file.
    }
    cb(null, true); // If the file type is not blocked, calls the callback with no error (null) and 'true' to accept the file.
  },
});


router.post('/', upload.single('file'), async (req, res) => { // Defines a POST route at the root path ('/') that uses Multer's 'upload.single' middleware to handle a single file upload named 'file'.
  try { // Starts a try block to catch any synchronous or asynchronous errors that occur during file processing.
    if (!req.file) { // Checks if no file was uploaded (i.e., Multer did not process a file successfully).
      return res.status(400).json({ message: 'No file uploaded' }); // If no file is present, sends a 400 Bad Request response with an error message.
    }

    const fileUrl = `/uploads/${req.file.filename}`; // Constructs the URL where the uploaded file can be accessed, based on the temporary storage path and filename.
    res.json({ // Sends a JSON response back to the client.
      fileUrl, // Includes the public URL of the uploaded file in the response.
      originalname: req.file.originalname, // Includes the original name of the uploaded file in the response.
      size: req.file.size, // Includes the size of the uploaded file in bytes in the response.
    });
  } catch (error) { // Catches any errors that occurred within the try block.
    console.error('Error uploading file:', error); // Logs the error to the console for debugging purposes.
    res.status(500).json({ message: 'Upload failed', error: error.message }); // Sends a 500 Internal Server Error response with a generic upload failed message and the specific error details.
  }
});


router.post( // Defines another POST route.
  '/profile-photo', // Specifies the endpoint for this route as '/profile-photo'.
  authMiddleware, // Applies the 'authMiddleware' to this route, ensuring that only authenticated users can access it.
  upload.single('file'), // Uses Multer's 'upload.single' middleware to handle a single file upload named 'file' for the profile photo.
  async (req, res) => { // Defines the asynchronous handler function for this route.
    try { // Starts a try block to catch errors during the profile photo upload process.
      if (!req.file) { // Checks if a file was actually uploaded.
        return res.status(400).json({ message: 'No file uploaded' }); // If no file is present, sends a 400 Bad Request response.
      }

      const uid = req.user.uid; // Extracts the user ID (uid) from the 'req.user' object, which is populated by the 'authMiddleware'.


      const currentUser = await User.findOne({ uid }).lean(); // Queries the database to find the current user by their UID and converts the Mongoose document to a plain JavaScript object using '.lean()'.
      if (currentUser?.photoURL) { // Checks if the current user exists and already has a 'photoURL' property, indicating an existing profile photo.
        try { // Starts an inner try block to handle potential errors during the deletion of the old photo.
          await deleteCloudinaryAsset(currentUser.photoURL); // Calls the 'deleteCloudinaryAsset' function to remove the old profile photo from Cloudinary using its URL.
          console.log(`Deleted old profile photo for user: ${uid}`); // Logs a success message to the console indicating the old photo was deleted.
        } catch (deleteError) { // Catches any errors that occur during the Cloudinary deletion process.
          console.warn( // Logs a warning message to the console if the old photo deletion fails.
            'Failed to delete old photo from Cloudinary:', // Provides a descriptive warning message.
            deleteError.message // Includes the specific error message from the deletion attempt.
          );

        }
      }


      const result = await uploadProfilePhoto(req.file.path, uid); // Calls the 'uploadProfilePhoto' function to upload the new file (from its temporary path) to Cloudinary, associating it with the user's UID.


      try { // Starts an inner try block to handle potential errors during the deletion of the temporary local file.
        fs.unlinkSync(req.file.path); // Synchronously deletes the temporary file from the local server's 'uploads' directory after it has been uploaded to Cloudinary.
      } catch (e) { // Catches any errors that occur during the temporary file deletion.
        console.warn('Failed to remove temp file:', e.message); // Logs a warning message if the temporary file could not be deleted.
      }

      const photoURL = result.secure_url; // Extracts the secure URL of the newly uploaded profile photo from the Cloudinary upload result.


      await User.updateOne({ uid }, { $set: { photoURL } }); // Updates the user document in the database, setting their 'photoURL' field to the new Cloudinary URL.

      res.json({ photoURL }); // Sends a JSON response back to the client containing the new profile photo URL.
    } catch (error) { // Catches any errors that occurred within the main try block of the route handler.
      console.error('Error uploading profile photo:', error); // Logs the error to the console for debugging.

      if (req.file?.path) { // Checks if a temporary file was created and its path exists.
        try { // Starts an inner try block to attempt to delete the temporary file in case of an error.
          fs.unlinkSync(req.file.path); // Synchronously deletes the temporary file from the local server's 'uploads' directory to clean up after a failed upload.
        } catch (e) { // Catches any errors that occur during the temporary file deletion.
          /* ignore */ // An empty comment indicating that errors during temporary file cleanup are intentionally ignored to avoid masking the primary upload error.
        }
      }
      res.status(500).json({ message: 'Upload failed', error: error.message }); // Sends a 500 Internal Server Error response with a generic upload failed message and the specific error details.
    }
  }
);


router.use((err, req, res, next) => { // Defines an error-handling middleware for the router, which catches errors passed by 'next(err)'.
  if (err instanceof multer.MulterError) { // Checks if the error is an instance of a Multer-specific error.
    return res.status(400).json({ message: err.message }); // If it's a Multer error, sends a 400 Bad Request response with the Multer error message.
  }
  if (err.message === 'File type not allowed') { // Checks if the error message specifically indicates that the file type is not allowed (from the custom fileFilter).
    return res.status(400).json({ message: 'File type not allowed' }); // If the file type is not allowed, sends a 400 Bad Request response with a specific error message.
  }
  next(err); // If the error is not a Multer error or a specific file type error, passes the error to the next error-handling middleware in the chain.
});

module.exports = router; // Exports the configured router object, making it available for use in other parts of the application (e.g., in the main server file).