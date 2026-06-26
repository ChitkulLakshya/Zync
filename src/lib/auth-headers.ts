// Imports the initialized Firebase authentication instance to interact with the current user's session and tokens.
import { auth } from './firebase';

// Exports an asynchronous function that generates standard HTTP headers, including the authorization bearer token if a user is logged in, to be used in API requests.
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  // Retrieves the currently authenticated Firebase user object from the local session state.
  const user = auth.currentUser;
  // Awaits the generation of a fresh JSON Web Token (JWT) from Firebase if the user exists, otherwise sets the token to null.
  const token = user ? await user.getIdToken() : null;
  // Returns a dictionary object containing the constructed HTTP headers.
  return {
    // Sets the standard Content-Type header so the server knows the incoming request body is formatted as JSON.
    'Content-Type': 'application/json',
    // Conditionally spreads an Authorization header containing the Bearer token into the object if the token was successfully retrieved.
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

// Exports an asynchronous helper function specifically for retrieving only the raw JWT string without building the full header object.
export const getAuthToken = async (): Promise<string> => {
  // Retrieves the currently authenticated Firebase user object from the local session state.
  const user = auth.currentUser;
  // Checks if the user object is missing and immediately throws an error because a token cannot be generated without an active session.
  if (!user) {throw new Error('Not authenticated');}
  // Awaits and returns the raw JWT string from Firebase, which can then be passed to backend services for verification.
  return user.getIdToken();
};
