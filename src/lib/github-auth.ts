import { GithubAuthProvider, linkWithPopup, User } from "firebase/auth";
import { auth } from "./firebase"; // Adjust import path as needed

export const linkGithubAccount = async (currentUser: User) => {
  if (!currentUser) {
    throw new Error("No user is currently logged in.");
  }

  const provider = new GithubAuthProvider();
  // Request access to repositories
  provider.addScope('repo'); 
  // Request access to user profile
  provider.addScope('read:user'); 

  try {
    // 1. Link GitHub account to existing Firebase user
    const result = await linkWithPopup(currentUser, provider);
    
    // 2. Extract Credentials
    const credential = GithubAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error("Failed to retrieve GitHub Access Token.");
    }

    // 3. Sync with Backend
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/sync-github`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
         // Pass Firebase Auth Token for security if backend requires it
        "Authorization": `Bearer ${await currentUser.getIdToken()}`
      },
      body: JSON.stringify({
        firebaseUid: currentUser.uid,
        accessToken: accessToken,
        username: result.user.providerData.find(p => p.providerId === 'github.com')?.uid // GitHub username/id
      }),
    });

    if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.message || "Failed to sync GitHub data with backend.");
    }

    return {
      success: true,
      user: result.user,
      accessToken
    };

  } catch (error: any) {
    console.error("Error linking GitHub account:", error);

    // 4. Handle specific error codes
    if (error.code === 'auth/credential-already-in-use') {
      alert("This GitHub account is already connected to another Zync account. Please sign in with that account or disconnect it first.");
    } else {
      alert(`Error linking GitHub: ${error.message}`);
    }

    throw error;
  }
};
