/**
 * @fileoverview noteRoutes.js
 * @module noteRoutes
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
 * @license AGPL-3.0-only
 * ============================================================================
 */
const express = require('express'); // Declares a constant variable named 'express' and assigns it the Express application framework, which is imported using Node.js's 'require' function to enable building web servers and APIs.
const router = express.Router(); // Declares a constant variable named 'router' and initializes it as an instance of an Express router, which is used to define modular, mountable route handlers for different API endpoints.
const Note = require('../models/Note'); // Declares a constant variable named 'Note' and assigns it the Mongoose Note model, imported from the specified path, to interact with the 'notes' collection in the MongoDB database.
const Folder = require('../models/Folder'); // Declares a constant variable named 'Folder' and assigns it the Mongoose Folder model, imported from the specified path, to interact with the 'folders' collection in the MongoDB database.
const verifyToken = require('../middleware/authMiddleware'); // Declares a constant variable named 'verifyToken' and assigns it the authentication middleware function, imported from the specified path, which is used to protect routes by validating user tokens.
const { normalizeDoc, normalizeDocs } = require('../utils/normalize'); // Declares constant variables 'normalizeDoc' and 'normalizeDocs' and assigns them functions imported from the 'normalize' utility file, which are used to transform Mongoose documents into a consistent, client-friendly format.
const { paginateArray, setPaginationHeaders } = require('../utils/pagination'); // Declares constant variables 'paginateArray' and 'setPaginationHeaders' and assigns them functions imported from the 'pagination' utility file, which are used to handle array pagination logic and set HTTP pagination response headers.

router.post('/folders', verifyToken, async (req, res) => { // Defines a POST route handler for the '/folders' endpoint, which is used to create new folders, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const { name, ownerId, parentId, type, projectId, color } = req.body; // Uses object destructuring to extract 'name', 'ownerId', 'parentId', 'type', 'projectId', and 'color' properties from the request body, which contain the data for the new folder.

    if (ownerId && ownerId !== req.user.uid) { // Checks if an 'ownerId' was provided in the request body and if it does not match the authenticated user's ID, which prevents a user from creating a folder for someone else.
      return res // Returns from the function, preventing further execution of the route handler.
        .status(403) // Sets the HTTP response status code to 403 (Forbidden), indicating that the client does not have permission to access the resource.
        .json({ error: 'Unauthorized: Cannot create folder for another user' }); // Sends a JSON response with an error message, explaining why the folder creation was denied.
    }
    const finalOwnerId = ownerId || req.user.uid; // Declares a constant variable 'finalOwnerId' and assigns it the 'ownerId' from the request body if provided, otherwise defaults to the authenticated user's ID, ensuring every folder has an owner.

    const folder = await Folder.create({ // Declares a constant variable 'folder' and asynchronously creates a new document in the 'folders' collection using the Mongoose 'Folder.create' method, populating it with the provided data.
      name, // Assigns the 'name' property from the request body to the new folder document.
      ownerId: finalOwnerId, // Assigns the determined 'finalOwnerId' to the new folder document, linking it to the correct user.
      parentId: parentId || null, // Assigns the 'parentId' from the request body to the new folder document, or 'null' if not provided, establishing its hierarchical position.
      type: type || 'personal', // Assigns the 'type' from the request body to the new folder document, or defaults to 'personal' if not provided, categorizing the folder.
      projectId: projectId || null, // Assigns the 'projectId' from the request body to the new folder document, or 'null' if not provided, linking it to a project if applicable.
      color: color || '#FFFFFF', // Assigns the 'color' from the request body to the new folder document, or defaults to '#FFFFFF' (white) if not provided, setting its visual identifier.
    });

    res.status(201).json(normalizeDoc(folder.toObject())); // Sets the HTTP response status code to 201 (Created) and sends a JSON response containing the newly created folder document, after converting it to a plain JavaScript object and normalizing its structure for the client.
  } catch (error) { // Catches any errors that occur within the try block, allowing for specific error handling.
    if (error.code === 11000) { // Checks if the error code is 11000, which typically indicates a duplicate key error in MongoDB (e.g., trying to create a folder with a name that must be unique).
      return res // Returns from the function, preventing further execution.
        .status(409) // Sets the HTTP response status code to 409 (Conflict), indicating that the request could not be completed due to a conflict with the current state of the resource.
        .json({ // Sends a JSON response with a specific error message.
          error: 'A folder with this name already exists in this location', // Provides a user-friendly error message indicating a duplicate folder name.
        });
    }
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any other unexpected errors.
  }
});

router.get('/folders', verifyToken, async (req, res) => { // Defines a GET route handler for the '/folders' endpoint, which is used to retrieve folders, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const userId = req.user.uid; // Declares a constant variable 'userId' and assigns it the unique ID of the authenticated user, extracted from the 'req.user' object populated by the 'verifyToken' middleware, to filter folders by ownership or collaboration.

    const folders = await Folder.find({ // Declares a constant variable 'folders' and asynchronously queries the 'folders' collection using Mongoose's 'Folder.find' method to retrieve documents.
      $or: [{ ownerId: userId }, { collaborators: userId }], // Specifies a query condition using the '$or' operator to find folders where the 'ownerId' matches the 'userId' OR the 'collaborators' array contains the 'userId', ensuring the user can see their own folders and those shared with them.
    })
      .sort({ createdAt: -1 }) // Sorts the retrieved folders in descending order based on their 'createdAt' timestamp, showing the most recently created folders first.
      .lean(); // Converts the Mongoose documents into plain JavaScript objects, which improves performance by skipping the hydration process and is suitable when no Mongoose-specific methods are needed.

    const { items, pagination } = paginateArray( // Uses object destructuring to extract 'items' (the paginated array of folders) and 'pagination' (pagination metadata) from the result of the 'paginateArray' function.
      normalizeDocs(folders), // Calls 'normalizeDocs' to transform the retrieved plain JavaScript folder objects into a consistent, client-friendly format before pagination.
      req.query // Passes the query parameters from the request (e.g., page, limit) to the 'paginateArray' function to determine pagination settings.
    );
    setPaginationHeaders(res, pagination); // Calls 'setPaginationHeaders' to add pagination-related HTTP headers (e.g., X-Total-Count, Link) to the response, providing clients with pagination metadata.

    res.json(items); // Sends a JSON response containing the paginated and normalized folder items to the client.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any unexpected errors during folder retrieval.
  }
});

router.post('/folders/:id/share', verifyToken, async (req, res) => { // Defines a POST route handler for the '/folders/:id/share' endpoint, which is used to share a specific folder, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const { collaboratorIds } = req.body; // Uses object destructuring to extract the 'collaboratorIds' array from the request body, which contains the IDs of users to share the folder with.
    const { id } = req.params; // Uses object destructuring to extract the 'id' parameter from the request URL, which represents the ID of the folder to be shared.

    const folderToCheck = await Folder.findById(id).lean(); // Declares a constant variable 'folderToCheck' and asynchronously queries the 'folders' collection to find a folder by its ID, converting it to a plain JavaScript object for efficiency.
    if (!folderToCheck) // Checks if no folder was found with the given ID.
      return res.status(404).json({ error: 'Folder not found' }); // Returns from the function, sets the HTTP response status code to 404 (Not Found), and sends a JSON error message, indicating the specified folder does not exist.

    if (folderToCheck.ownerId !== req.user.uid) { // Checks if the 'ownerId' of the found folder does not match the authenticated user's ID, ensuring only the owner can share the folder.
      return res // Returns from the function, preventing further execution.
        .status(403) // Sets the HTTP response status code to 403 (Forbidden), indicating that the client does not have permission to perform this action.
        .json({ error: 'Unauthorized: Only owner can share folder' }); // Sends a JSON response with an error message, explaining why the sharing action was denied.
    }

    const existing = folderToCheck.collaborators || []; // Declares a constant variable 'existing' and assigns it the current 'collaborators' array of the folder, or an empty array if it doesn't exist, to prepare for merging new collaborators.
    const merged = [...new Set([...existing, ...collaboratorIds])]; // Declares a constant variable 'merged' and creates a new array by combining 'existing' collaborators and 'collaboratorIds', then uses a 'Set' to remove any duplicate IDs, ensuring each collaborator is listed only once.

    const folder = await Folder.findByIdAndUpdate( // Declares a constant variable 'folder' and asynchronously finds a folder by its ID and updates it using Mongoose's 'findByIdAndUpdate' method.
      id, // Specifies the ID of the folder to update.
      { $set: { collaborators: merged } }, // Uses the '$set' operator to update the 'collaborators' field with the 'merged' array, adding new collaborators to the folder.
      { returnDocument: 'after', lean: true } // Specifies options: 'returnDocument: 'after'' ensures the updated document is returned, and 'lean: true' converts it to a plain JavaScript object for efficiency.
    );

    res.json(normalizeDoc(folder)); // Sends a JSON response containing the normalized, updated folder document to the client.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any unexpected errors during folder sharing.
  }
});

router.put('/folders/:id', verifyToken, async (req, res) => { // Defines a PUT route handler for the '/folders/:id' endpoint, which is used to update a specific folder, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const { id } = req.params; // Uses object destructuring to extract the 'id' parameter from the request URL, which represents the ID of the folder to be updated.
    const folder = await Folder.findById(id).lean(); // Declares a constant variable 'folder' and asynchronously queries the 'folders' collection to find a folder by its ID, converting it to a plain JavaScript object for efficiency.
    if (!folder) return res.status(404).json({ error: 'Folder not found' }); // Checks if no folder was found, returns from the function, sets the HTTP response status code to 404 (Not Found), and sends a JSON error message.
    if (folder.ownerId !== req.user.uid) { // Checks if the 'ownerId' of the found folder does not match the authenticated user's ID, ensuring only the owner can update the folder.
      return res.status(403).json({ error: 'Unauthorized' }); // Returns from the function, sets the HTTP response status code to 403 (Forbidden), and sends a JSON error message, indicating the user is not authorized to update this folder.
    }

    const updated = await Folder.findByIdAndUpdate( // Declares a constant variable 'updated' and asynchronously finds a folder by its ID and updates it using Mongoose's 'findByIdAndUpdate' method.
      id, // Specifies the ID of the folder to update.
      { $set: req.body }, // Uses the '$set' operator to update the folder document with the data provided in the request body, allowing for partial updates.
      { returnDocument: 'after', lean: true } // Specifies options: 'returnDocument: 'after'' ensures the updated document is returned, and 'lean: true' converts it to a plain JavaScript object for efficiency.
    );
    res.json(normalizeDoc(updated)); // Sends a JSON response containing the normalized, updated folder document to the client.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any unexpected errors during folder update.
  }
});

router.delete('/folders/:id', verifyToken, async (req, res) => { // Defines a DELETE route handler for the '/folders/:id' endpoint, which is used to delete a specific folder, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const { id } = req.params; // Uses object destructuring to extract the 'id' parameter from the request URL, which represents the ID of the folder to be deleted.
    const folder = await Folder.findById(id).lean(); // Declares a constant variable 'folder' and asynchronously queries the 'folders' collection to find a folder by its ID, converting it to a plain JavaScript object for efficiency.
    if (!folder) return res.status(404).json({ error: 'Folder not found' }); // Checks if no folder was found, returns from the function, sets the HTTP response status code to 404 (Not Found), and sends a JSON error message.
    if (folder.ownerId !== req.user.uid) { // Checks if the 'ownerId' of the found folder does not match the authenticated user's ID, ensuring only the owner can delete the folder.
      return res // Returns from the function, preventing further execution.
        .status(403) // Sets the HTTP response status code to 403 (Forbidden), indicating that the client does not have permission to perform this action.
        .json({ error: 'Unauthorized: Only owner can delete folder' }); // Sends a JSON response with an error message, explaining why the deletion was denied.
    }

    await Note.deleteMany({ folderId: id }); // Asynchronously deletes all notes associated with the folder being deleted by querying the 'notes' collection for documents where 'folderId' matches the folder's ID, ensuring data consistency.
    await Folder.findByIdAndDelete(id); // Asynchronously finds and deletes the folder document from the 'folders' collection using its ID, removing the folder itself.
    res.json({ message: 'Folder deleted successfully' }); // Sends a JSON response with a success message, confirming that the folder and its associated notes have been deleted.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any unexpected errors during folder deletion.
  }
});

router.post('/folders/:id/unshare', verifyToken, async (req, res) => { // Defines a POST route handler for the '/folders/:id/unshare' endpoint, which is used to unshare a specific folder with a user, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const { userId } = req.body; // Uses object destructuring to extract the 'userId' from the request body, which represents the ID of the collaborator to be removed from the folder.
    const { id } = req.params; // Uses object destructuring to extract the 'id' parameter from the request URL, which represents the ID of the folder to be unshared.
    const folder = await Folder.findById(id).lean(); // Declares a constant variable 'folder' and asynchronously queries the 'folders' collection to find a folder by its ID, converting it to a plain JavaScript object for efficiency.
    if (!folder) return res.status(404).json({ error: 'Folder not found' }); // Checks if no folder was found, returns from the function, sets the HTTP response status code to 404 (Not Found), and sends a JSON error message.
    if (folder.ownerId !== req.user.uid) { // Checks if the 'ownerId' of the found folder does not match the authenticated user's ID, ensuring only the owner can unshare the folder.
      return res.status(403).json({ error: 'Unauthorized' }); // Returns from the function, sets the HTTP response status code to 403 (Forbidden), and sends a JSON error message, indicating the user is not authorized to unshare this folder.
    }

    const updated = await Folder.findByIdAndUpdate( // Declares a constant variable 'updated' and asynchronously finds a folder by its ID and updates it using Mongoose's 'findByIdAndUpdate' method.
      id, // Specifies the ID of the folder to update.
      { // Specifies the update operations.
        $set: { // Uses the '$set' operator to update specific fields.
          collaborators: (folder.collaborators || []).filter( // Updates the 'collaborators' array by filtering out the specified 'userId'. It first ensures 'folder.collaborators' is an array (or an empty array if null/undefined).
            (c) => c !== userId // The filter callback function returns true for collaborators whose ID does not match the 'userId' to be removed, effectively creating a new array without that user.
          ),
        },
      },
      { returnDocument: 'after', lean: true } // Specifies options: 'returnDocument: 'after'' ensures the updated document is returned, and 'lean: true' converts it to a plain JavaScript object for efficiency.
    );
    res.json(normalizeDoc(updated)); // Sends a JSON response containing the normalized, updated folder document to the client.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any unexpected errors during folder unsharing.
  }
});

router.post('/', verifyToken, async (req, res) => { // Defines a POST route handler for the root '/' endpoint (for notes), which is used to create new notes, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const { title, content, ownerId, folderId, projectId } = req.body; // Uses object destructuring to extract 'title', 'content', 'ownerId', 'folderId', and 'projectId' properties from the request body, which contain the data for the new note.

    if (ownerId && ownerId !== req.user.uid) { // Checks if an 'ownerId' was provided in the request body and if it does not match the authenticated user's ID, which prevents a user from creating a note for someone else.
      return res // Returns from the function, preventing further execution of the route handler.
        .status(403) // Sets the HTTP response status code to 403 (Forbidden), indicating that the client does not have permission to access the resource.
        .json({ error: 'Unauthorized: Cannot create note for another user' }); // Sends a JSON response with an error message, explaining why the note creation was denied.
    }
    const finalOwnerId = ownerId || req.user.uid; // Declares a constant variable 'finalOwnerId' and assigns it the 'ownerId' from the request body if provided, otherwise defaults to the authenticated user's ID, ensuring every note has an owner.

    const note = await Note.create({ // Declares a constant variable 'note' and asynchronously creates a new document in the 'notes' collection using the Mongoose 'Note.create' method, populating it with the provided data.
      title: title || 'Untitled', // Assigns the 'title' property from the request body to the new note document, or defaults to 'Untitled' if not provided.
      content: content || {}, // Assigns the 'content' property from the request body to the new note document, or defaults to an empty object if not provided, to ensure content is always an object.
      ownerId: finalOwnerId, // Assigns the determined 'finalOwnerId' to the new note document, linking it to the correct user.
      folderId: folderId || null, // Assigns the 'folderId' from the request body to the new note document, or 'null' if not provided, linking it to a parent folder if applicable.
      projectId: projectId || null, // Assigns the 'projectId' from the request body to the new note document, or 'null' if not provided, linking it to a project if applicable.
    });

    res.status(201).json(normalizeDoc(note.toObject())); // Sets the HTTP response status code to 201 (Created) and sends a JSON response containing the newly created note document, after converting it to a plain JavaScript object and normalizing its structure for the client.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any unexpected errors during note creation.
  }
});

router.get('/', verifyToken, async (req, res) => { // Defines a GET route handler for the root '/' endpoint (for notes), which is used to retrieve notes, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const userId = req.user.uid; // Declares a constant variable 'userId' and assigns it the unique ID of the authenticated user, extracted from the 'req.user' object, to filter notes by ownership or access.
    const { folderId } = req.query; // Uses object destructuring to extract the 'folderId' query parameter from the request URL, which is used to filter notes belonging to a specific folder.

    if (folderId && typeof folderId !== 'string') { // Checks if 'folderId' is provided and if its type is not a string, indicating an invalid format.
      return res.status(400).json({ error: 'Invalid Folder ID format' }); // Returns from the function, sets the HTTP response status code to 400 (Bad Request), and sends a JSON error message.
    }

    let filter = {}; // Declares a mutable variable 'filter' and initializes it as an empty object, which will be populated with MongoDB query conditions based on the request.

    if (folderId) { // Checks if a 'folderId' was provided in the query parameters, indicating a request for notes within a specific folder.
      const folder = await Folder.findById(folderId).lean(); // Declares a constant variable 'folder' and asynchronously queries the 'folders' collection to find the specified folder by its ID, converting it to a plain JavaScript object.
      if (!folder) { // Checks if no folder was found with the given 'folderId'.
        return res.status(404).json({ error: 'Folder not found' }); // Returns from the function, sets the HTTP response status code to 404 (Not Found), and sends a JSON error message.
      }
      const isOwner = folder.ownerId === userId; // Declares a constant boolean 'isOwner' and sets it to true if the authenticated user is the owner of the folder, otherwise false.
      const isCollaborator = // Declares a constant boolean 'isCollaborator' and sets it to true if the folder has collaborators and the authenticated user's ID is included in the 'collaborators' array, otherwise false.
        folder.collaborators && folder.collaborators.includes(userId);
      if (!isOwner && !isCollaborator) { // Checks if the authenticated user is neither the owner nor a collaborator of the specified folder, meaning they don't have access.
        return res.status(403).json({ error: 'Access denied to this folder' }); // Returns from the function, sets the HTTP response status code to 403 (Forbidden), and sends a JSON error message.
      }
      filter = { folderId }; // Sets the 'filter' object to query for notes where 'folderId' matches the provided 'folderId', restricting results to that specific folder.
    } else { // Executes if no 'folderId' was provided in the query parameters, meaning the request is for all accessible notes (personal and shared).
      const sharedFolders = await Folder.find( // Declares a constant variable 'sharedFolders' and asynchronously queries the 'folders' collection to find folders where the authenticated user is a collaborator.
        { collaborators: userId }, // Specifies the query condition to find folders where the 'collaborators' array contains the 'userId'.
        { _id: 1 } // Specifies to return only the '_id' field for each matching folder, optimizing the query.
      ).lean(); // Converts the Mongoose documents into plain JavaScript objects for efficiency.
      const sharedFolderIds = sharedFolders.map((f) => f._id.toString()); // Declares a constant variable 'sharedFolderIds' and maps the 'sharedFolders' array to an array of their stringified '_id's, which will be used to filter notes.

      filter = { // Sets the 'filter' object to query for notes based on multiple conditions.
        $or: [ // Uses the '$or' operator to match documents that satisfy any of the following conditions.
          { ownerId: userId }, // Condition 1: Notes where the 'ownerId' matches the authenticated user's ID (personal notes).
          { folderId: { $in: sharedFolderIds } }, // Condition 2: Notes whose 'folderId' is present in the 'sharedFolderIds' array (notes within shared folders).
          { sharedWith: userId }, // Condition 3: Notes where the 'sharedWith' array contains the authenticated user's ID (notes explicitly shared with the user).
        ],
      };
    }

    const notes = await Note.find(filter).sort({ updatedAt: -1 }).lean(); // Declares a constant variable 'notes' and asynchronously queries the 'notes' collection using the constructed 'filter', sorts the results by 'updatedAt' in descending order, and converts them to plain JavaScript objects.
    const { items, pagination } = paginateArray( // Uses object destructuring to extract 'items' (the paginated array of notes) and 'pagination' (pagination metadata) from the result of the 'paginateArray' function.
      normalizeDocs(notes), // Calls 'normalizeDocs' to transform the retrieved plain JavaScript note objects into a consistent, client-friendly format before pagination.
      req.query // Passes the query parameters from the request (e.g., page, limit) to the 'paginateArray' function to determine pagination settings.
    );
    setPaginationHeaders(res, pagination); // Calls 'setPaginationHeaders' to add pagination-related HTTP headers to the response, providing clients with pagination metadata.

    res.json(items); // Sends a JSON response containing the paginated and normalized note items to the client.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any unexpected errors during note retrieval.
  }
});

router.get('/:id', verifyToken, async (req, res) => { // Defines a GET route handler for the '/:id' endpoint (for a specific note), which is used to retrieve a single note, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const note = await Note.findById(req.params.id).lean(); // Declares a constant variable 'note' and asynchronously queries the 'notes' collection to find a note by its ID, extracted from the request parameters, converting it to a plain JavaScript object.
    if (!note) return res.status(404).json({ error: 'Note not found' }); // Checks if no note was found, returns from the function, sets the HTTP response status code to 404 (Not Found), and sends a JSON error message.

    const isOwner = note.ownerId === req.user.uid; // Declares a constant boolean 'isOwner' and sets it to true if the authenticated user is the owner of the note, otherwise false.
    const isShared = note.sharedWith && note.sharedWith.includes(req.user.uid); // Declares a constant boolean 'isShared' and sets it to true if the note has a 'sharedWith' array and the authenticated user's ID is included in it, otherwise false.

    if (!isOwner && !isShared) { // Checks if the authenticated user is neither the owner nor explicitly shared with the note.
      if (note.folderId) { // Checks if the note belongs to a folder.
        const folder = await Folder.findById(note.folderId).lean(); // Declares a constant variable 'folder' and asynchronously queries the 'folders' collection to find the parent folder by its ID, converting it to a plain JavaScript object.
        if ( // Checks if the folder exists AND if the authenticated user is either the owner of the folder OR a collaborator in that folder.
          folder &&
          (folder.ownerId === req.user.uid ||
            (folder.collaborators &&
              folder.collaborators.includes(req.user.uid)))
        ) {
          // This block is intentionally empty. If the user has access via the folder, the code proceeds to `res.json(normalizeDoc(note))` below.
        } else { // Executes if the folder does not exist or the user does not have access to the folder.
          return res.status(403).json({ error: 'Access denied' }); // Returns from the function, sets the HTTP response status code to 403 (Forbidden), and sends a JSON error message, indicating access is denied.
        }
      } else { // Executes if the note does not belong to any folder and is not owned or explicitly shared with the user.
        return res.status(403).json({ error: 'Access denied' }); // Returns from the function, sets the HTTP response status code to 403 (Forbidden), and sends a JSON error message, indicating access is denied.
      }
    }

    res.json(normalizeDoc(note)); // Sends a JSON response containing the normalized note document to the client, as the user has been authorized to view it.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any unexpected errors during note retrieval.
  }
});

router.put('/:id', verifyToken, async (req, res) => { // Defines a PUT route handler for the '/:id' endpoint (for a specific note), which is used to update a single note, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const { title, content, folderId } = req.body; // Uses object destructuring to extract 'title', 'content', and 'folderId' properties from the request body, which contain the data to update the note.

    const note = await Note.findById(req.params.id).lean(); // Declares a constant variable 'note' and asynchronously queries the 'notes' collection to find a note by its ID, extracted from the request parameters, converting it to a plain JavaScript object.
    if (!note) return res.status(404).json({ error: 'Note not found' }); // Checks if no note was found, returns from the function, sets the HTTP response status code to 404 (Not Found), and sends a JSON error message.

    const isOwner = note.ownerId === req.user.uid; // Declares a constant boolean 'isOwner' and sets it to true if the authenticated user is the owner of the note, otherwise false.
    const isShared = note.sharedWith && note.sharedWith.includes(req.user.uid); // Declares a constant boolean 'isShared' and sets it to true if the note has a 'sharedWith' array and the authenticated user's ID is included in it, otherwise false.

    if (!isOwner && !isShared) { // Checks if the authenticated user is neither the owner nor explicitly shared with the note, meaning they don't have permission to update it.
      return res.status(403).json({ error: 'Unauthorized' }); // Returns from the function, sets the HTTP response status code to 403 (Forbidden), and sends a JSON error message, indicating the user is not authorized to update this note.
    }

    const updateData = {}; // Declares a mutable object 'updateData' and initializes it as empty, which will store the fields to be updated in the note.
    if (title !== undefined) updateData.title = title; // Checks if 'title' was provided in the request body and, if so, adds it to the 'updateData' object.
    if (content !== undefined) updateData.content = content; // Checks if 'content' was provided in the request body and, if so, adds it to the 'updateData' object.
    if (folderId !== undefined) updateData.folderId = folderId; // Checks if 'folderId' was provided in the request body and, if so, adds it to the 'updateData' object.

    const updatedNote = await Note.findByIdAndUpdate( // Declares a constant variable 'updatedNote' and asynchronously finds a note by its ID and updates it using Mongoose's 'findByIdAndUpdate' method.
      req.params.id, // Specifies the ID of the note to update, extracted from the request parameters.
      { $set: updateData }, // Uses the '$set' operator to update the note document with the fields and values contained in the 'updateData' object, allowing for partial updates.
      { returnDocument: 'after', lean: true } // Specifies options: 'returnDocument: 'after'' ensures the updated document is returned, and 'lean: true' converts it to a plain JavaScript object for efficiency.
    );

    res.json(normalizeDoc(updatedNote)); // Sends a JSON response containing the normalized, updated note document to the client.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any unexpected errors during note update.
  }
});

router.delete('/:id', verifyToken, async (req, res) => { // Defines a DELETE route handler for the '/:id' endpoint (for a specific note), which is used to delete a single note, applying the 'verifyToken' middleware first to ensure the user is authenticated before executing the asynchronous callback function.
  try { // Starts a try block to encapsulate code that might throw an error, allowing for graceful error handling.
    const note = await Note.findById(req.params.id).lean(); // Declares a constant variable 'note' and asynchronously queries the 'notes' collection to find a note by its ID, extracted from the request parameters, converting it to a plain JavaScript object.
    if (!note) return res.status(404).json({ error: 'Note not found' }); // Checks if no note was found, returns from the function, sets the HTTP response status code to 404 (Not Found), and sends a JSON error message.

    if (note.ownerId !== req.user.uid) { // Checks if the 'ownerId' of the found note does not match the authenticated user's ID, ensuring only the owner can delete the note.
      return res // Returns from the function, preventing further execution.
        .status(403) // Sets the HTTP response status code to 403 (Forbidden), indicating that the client does not have permission to perform this action.
        .json({ error: 'Unauthorized: Only owner can delete note' }); // Sends a JSON response with an error message, explaining why the deletion was denied.
    }

    await Note.findByIdAndDelete(req.params.id); // Asynchronously finds and deletes the note document from the 'notes' collection using its ID, removing the note itself.
    res.json({ message: 'Note deleted successfully' }); // Sends a JSON response with a success message, confirming that the note has been deleted.
  } catch (error) { // Catches any errors that occur within the try block.
    res.status(500).json({ error: error.message }); // Sets the HTTP response status code to 500 (Internal Server Error) and sends a JSON response containing the error message, for any unexpected errors during note deletion.
  }
});

module.exports = router; // Exports the 'router' object, making all the defined routes and their handlers available for use in other parts of the application, typically by importing it into the main Express app file.