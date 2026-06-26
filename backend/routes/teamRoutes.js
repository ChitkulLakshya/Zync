// Imports the Express.js framework, which is used to build web applications and APIs.
const express = require('express');
// Creates a new router object for handling routes. This allows defining routes in a modular way, separate from the main app.
const router = express.Router();
// Imports the 'verifyToken' middleware, which is responsible for authenticating requests by validating a JWT.
const verifyToken = require('../middleware/authMiddleware');
// Imports the Mongoose User model, allowing interaction with the 'users' collection in the database.
const User = require('../models/User');
// Imports the Mongoose Team model, allowing interaction with the 'teams' collection in the database.
const Team = require('../models/Team');
// Imports the cache utility, likely used for invalidating cached data after database changes.
const cache = require('../utils/cache');
// Imports utility functions 'normalizeDoc' and 'normalizeDocs' for transforming Mongoose documents into plain JavaScript objects, often for consistent API responses.
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
// Imports utility functions 'paginateArray' and 'setPaginationHeaders' for handling array pagination and setting relevant HTTP response headers.
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');
// Imports a set of functions from the 'teamFirebaseSync' service, which are responsible for synchronizing team data with Firebase (e.g., Firestore or Realtime Database).
const {
  upsertTeamSnapshot,
  addMemberToTeam,
  removeMemberFromTeam,
  transferTeamOwnership,
  deleteTeamSnapshot,
} = require('../services/teamFirebaseSync');

// Defines an asynchronous utility function 'runSync' to execute a given function and handle potential errors during synchronization operations.
const runSync = async (label, fn) => {
  // Starts a try block to attempt the execution of the provided function.
  try {
    // Awaits the completion of the provided asynchronous function 'fn'. This ensures the sync operation finishes before proceeding.
    await fn();
  } catch (error) {
    // Catches any errors that occur during the execution of 'fn'.
    // Logs an error message to the console, indicating which sync operation failed and providing the error message.
    console.error(`[TeamSync] ${label} failed:`, error?.message || error);
  }
};

// Defines an asynchronous function 'generateInviteCode' to create a unique 6-digit numeric invite code for teams.
const generateInviteCode = async () => {
  // Declares a variable 'code' to store the generated invite code.
  let code;
  // Declares a boolean variable 'isUnique' and initializes it to false, used to control the loop until a unique code is found.
  let isUnique = false;
  // Starts a while loop that continues as long as 'isUnique' is false, ensuring a unique code is generated.
  while (!isUnique) {
    // Generates a random 6-digit number (between 100000 and 999999) and converts it to a string. This creates the invite code.
    code = Math.floor(100000 + Math.random() * 900000).toString();
    // Queries the database to check if a team with the newly generated 'code' already exists. '.lean()' optimizes the query by returning a plain JavaScript object instead of a Mongoose document.
    const existingTeam = await Team.findOne({ inviteCode: code }).lean();
    // Checks if no existing team was found with the generated code.
    if (!existingTeam)
      // If no existing team is found, sets 'isUnique' to true to exit the loop.
      isUnique = true;
  }
  // Returns the unique 6-digit invite code.
  return code;
};

// Defines a GET route for '/owned' teams. This route is protected by the 'verifyToken' middleware, meaning only authenticated users can access it.
router.get('/owned', verifyToken, async (req, res) => {
  // Extracts the user ID (uid) from the request object, which was added by the 'verifyToken' middleware after successful authentication.
  const uid = req.user.uid;
  // Starts a try block to handle potential errors during the database query and response.
  try {
    // Queries the database to find all teams where the 'ownerId' matches the authenticated user's 'uid'. '.lean()' optimizes the query by returning plain JavaScript objects.
    const teams = await Team.find({ ownerId: uid }).lean();
    // Calls 'paginateArray' to apply pagination to the fetched 'teams' array, using query parameters from 'req.query'.
    const { items, pagination } = paginateArray(
      // Normalizes the Mongoose documents into plain JavaScript objects before pagination.
      normalizeDocs(teams),
      // Passes the query parameters from the request (e.g., page, limit) to the pagination utility.
      req.query
    );
    // Sets pagination-related headers (e.g., X-Total-Count, Link) on the response object.
    setPaginationHeaders(res, pagination);

    // Sends a JSON response containing the paginated team items.
    res.json(items);
  } catch (error) {
    // Catches any errors that occur during the try block.
    // Logs the error to the console for debugging purposes.
    console.error('Error fetching owned teams:', error);
    // Sends a 500 Internal Server Error status code and a JSON error message to the client.
    res.status(500).json({ message: 'Server error' });
  }
});

// Defines a GET route for '/mine' teams. This route is protected by the 'verifyToken' middleware.
router.get('/mine', verifyToken, async (req, res) => {
  // Extracts the user ID (uid) from the request object, provided by the 'verifyToken' middleware.
  const uid = req.user.uid;
  // Starts a try block to handle potential errors.
  try {
    // Queries the database to find all teams where the 'members' array includes the authenticated user's 'uid'. '.lean()' optimizes the query.
    const teams = await Team.find({ members: uid }).lean();
    // Calls 'paginateArray' to apply pagination to the fetched 'teams' array.
    const { items, pagination } = paginateArray(
      // Normalizes the Mongoose documents into plain JavaScript objects.
      normalizeDocs(teams),
      // Passes the query parameters for pagination.
      req.query
    );
    // Sets pagination-related headers on the response.
    setPaginationHeaders(res, pagination);

    // Sends a JSON response containing the paginated team items.
    res.json(items);
  } catch (error) {
    // Catches any errors.
    // Logs the error to the console.
    console.error('Error fetching my teams:', error);
    // Sends a 500 Internal Server Error status and a JSON error message.
    res.status(500).json({ message: 'Server error' });
  }
});

// Defines a POST route for '/create' a new team. This route is protected by the 'verifyToken' middleware.
router.post('/create', verifyToken, async (req, res) => {
  // Destructures 'name', 'type', and 'initialInvites' from the request body.
  const { name, type, initialInvites } = req.body;
  // Extracts the user ID (uid) from the request object, provided by the 'verifyToken' middleware.
  const uid = req.user.uid;

  // Checks if the 'name' field is missing from the request body.
  if (!name)
    // If 'name' is missing, sends a 400 Bad Request status and a JSON error message.
    return res.status(400).json({ message: 'Team name is required' });

  // Starts a try block to handle potential errors.
  try {
    // Queries the database to find the user document corresponding to the authenticated 'uid'. '.lean()' optimizes the query.
    const user = await User.findOne({ uid }).lean();
    // Checks if the user was not found in the database.
    if (!user)
      // If the user is not found, sends a 404 Not Found status and a JSON error message.
      return res.status(404).json({ message: 'User not found' });

    // Calls the 'generateInviteCode' function to get a unique invite code for the new team.
    const inviteCode = await generateInviteCode();

    // Creates a new team document in the database using the 'Team' model.
    const savedTeam = await Team.create({
      // Sets the team name from the request body.
      name,
      // Sets the team type from the request body, defaulting to 'Other' if not provided.
      type: type || 'Other',
      // Assigns the newly generated unique invite code.
      inviteCode,
      // Sets the owner of the team to the authenticated user's 'uid'.
      ownerId: uid,
      // Initializes the 'members' array with the owner's 'uid', as the owner is always a member.
      members: [uid],
    });
    // Converts the Mongoose document 'savedTeam' to a plain JavaScript object and then normalizes it using 'normalizeDoc'.
    const teamObj = normalizeDoc(savedTeam.toObject());

    // Creates a new array of team memberships for the user. It takes existing memberships (if any) and adds the ID of the newly created team.
    const memberships = [...(user.teamMemberships || []), teamObj.id];
    // Updates the user's document in the database to include the new team's ID in their 'teamMemberships' array.
    await User.updateOne({ uid }, { $set: { teamMemberships: memberships } });
    // Invalidates the cache entry for the current user, ensuring fresh data is fetched on subsequent requests.
    await cache.invalidate(`user:me:${uid}`);
    // Runs an asynchronous synchronization task to upsert (update or insert) the new team's snapshot in Firebase.
    await runSync('create-team', () => upsertTeamSnapshot(teamObj));

    // Checks if 'initialInvites' exists, is an array, and contains at least one email.
    if (
      initialInvites &&
      Array.isArray(initialInvites) &&
      initialInvites.length > 0
    ) {
      // Dynamically imports the 'sendZYNCEmail' function from the mailer service. This is done here to avoid circular dependencies or unnecessary loading if not needed.
      const { sendZYNCEmail } = require('../services/mailer');
      // Iterates over each email in the 'initialInvites' array.
      initialInvites.forEach(async (email) => {
        // Skips the current iteration if the email is empty or null.
        if (!email) return;
        // Starts a try block for sending each email, to handle individual email sending errors without stopping the whole process.
        try {
          // Calls the 'sendZYNCEmail' function to send an invitation email.
          await sendZYNCEmail(
            // The recipient's email address.
            email,
            // The subject line of the email.
            `Join ${name} on ZYNC!`,
            // The HTML content of the email body, including team name, inviter's name, and invite code.
            `
                          <h2>You've been invited to join a team!</h2>
                          <p>${user.displayName || 'A colleague'} has invited you to join the <strong>${name}</strong> team on ZYNC.</p>
                          <p><strong>Invite Code: ${inviteCode}</strong></p>
                          <p>Login to ZYNC and enter this code to join.</p>
                        `,
            // The plain text content for the email, used as a fallback or for clients that don't render HTML.
            `You've been invited to join ${name}. Invite Code: ${inviteCode}`
          );
        } catch (err) {
          // Catches any errors that occur during the sending of a specific email.
          // Logs an error message to the console, indicating which email failed to send.
          console.error(`Failed to send invite to ${email}:`, err);
        }
      });
    }

    // Sends a 201 Created status and a JSON response containing the normalized team object.
    res.status(201).json(teamObj);
  } catch (error) {
    // Catches any errors that occur during the try block.
    // Logs the error to the console.
    console.error('Error creating team:', error);
    // Sends a 500 Internal Server Error status and a JSON error message.
    res.status(500).json({ message: 'Server error' });
  }
});

// Defines a POST route for '/join' a team using an invite code. This route is protected by the 'verifyToken' middleware.
router.post('/join', verifyToken, async (req, res) => {
  // Destructures 'inviteCode' from the request body.
  const { inviteCode } = req.body;
  // Extracts the user ID (uid) from the request object.
  const uid = req.user.uid;

  // Checks if the 'inviteCode' is missing from the request body.
  if (!inviteCode)
    // If missing, sends a 400 Bad Request status and a JSON error message.
    return res.status(400).json({ message: 'Invite code is required' });

  // Starts a try block to handle potential errors.
  try {
    // Queries the database to find a team with the provided 'inviteCode'. '.lean()' optimizes the query.
    const team = await Team.findOne({ inviteCode }).lean();
    // Checks if no team was found with the given invite code.
    if (!team)
      // If no team is found, sends a 404 Not Found status and a JSON error message.
      return res.status(404).json({ message: 'Team not found with this code' });

    // Checks if the authenticated user's 'uid' is already present in the team's 'members' array.
    if (team.members.includes(uid)) {
      // If the user is already a member, sends a 400 Bad Request status and a JSON error message.
      return res.status(400).json({ message: 'User already in this team' });
    }

    // Queries the database to find the user document corresponding to the authenticated 'uid'. '.lean()' optimizes the query.
    const user = await User.findOne({ uid }).lean();
    // Checks if the user was not found.
    if (!user)
      // If the user is not found, sends a 404 Not Found status and a JSON error message.
      return res.status(404).json({ message: 'User not found' });

    // Creates a new array of members by spreading the existing team members and adding the new user's 'uid'.
    const newMembers = [...team.members, uid];
    // Updates the team document in the database by setting its 'members' array to 'newMembers'.
    const updatedTeam = await Team.findByIdAndUpdate(
      // Specifies the team to update by its MongoDB '_id'.
      team._id,
      // Uses the '$set' operator to update the 'members' field.
      { $set: { members: newMembers } },
      // Options: 'returnDocument: 'after'' returns the updated document, and 'lean: true' returns a plain JavaScript object.
      { returnDocument: 'after', lean: true }
    );

    // Converts the MongoDB '_id' of the team to a string for consistent use.
    const teamId = team._id.toString();
    // Creates a new array of team memberships for the user, adding the 'teamId' to their existing memberships.
    const memberships = [...(user.teamMemberships || []), teamId];
    // Updates the user's document in the database to include the new team's ID in their 'teamMemberships' array.
    await User.updateOne({ uid }, { $set: { teamMemberships: memberships } });
    // Invalidates the cache entry for the current user, ensuring fresh data is fetched.
    await cache.invalidate(`user:me:${uid}`);
    // Runs an asynchronous synchronization task to add the member to the team in Firebase.
    await runSync('join-team-add-member', () => addMemberToTeam(teamId, uid));
    // Runs another asynchronous synchronization task to upsert (update or insert) the updated team's snapshot in Firebase.
    await runSync('join-team-upsert', () => upsertTeamSnapshot(updatedTeam));

    // Sends a 200 OK status and a JSON response containing the normalized updated team object.
    res.status(200).json(normalizeDoc(updatedTeam));
  } catch (error) {
    // Catches any errors.
    // Logs the error to the console.
    console.error('Error joining team:', error);
    // Sends a 500 Internal Server Error status and a JSON error message.
    res.status(500).json({ message: 'Server error' });
  }
});

// Defines a DELETE route for '/:teamId' to delete a specific team. This route is protected by 'verifyToken'.
router.delete('/:teamId', verifyToken, async (req, res) => {
  // Destructures 'teamId' from the request parameters.
  const { teamId } = req.params;
  // Extracts the user ID (uid) from the request object.
  const uid = req.user.uid;

  // Starts a try block to handle potential errors.
  try {
    // Queries the database to find the team by its 'teamId'. '.lean()' optimizes the query.
    const team = await Team.findById(teamId).lean();
    // Checks if the team was not found.
    if (!team)
      // If not found, sends a 404 Not Found status and a JSON error message.
      return res.status(404).json({ message: 'Team not found' });

    // Checks if the authenticated user's 'uid' is not the owner of the team.
    if (team.ownerId !== uid) {
      // If the user is not the owner, sends a 403 Forbidden status and a JSON error message.
      return res
        .status(403)
        .json({ message: 'Only the team owner can delete the team' });
    }

    // Iterates over each member's 'uid' in the team's 'members' array.
    for (const memberUid of team.members) {
      // Finds the user document for the current member. '.lean()' optimizes the query.
      const member = await User.findOne({ uid: memberUid }).lean();
      // Checks if the member's user document was found.
      if (member) {
        // Updates the member's user document in the database.
        await User.updateOne(
          // Specifies the user to update by their 'uid'.
          { uid: memberUid },
          // Uses the '$set' operator to update the 'teamMemberships' array.
          {
            $set: {
              // Filters out the 'teamId' from the member's 'teamMemberships' array, effectively removing the team from their list.
              teamMemberships: (member.teamMemberships || []).filter(
                (id) => String(id) !== String(teamId)
              ),
            },
          }
        );
      }
    }

    // Deletes the team document from the database using its 'teamId'.
    await Team.findByIdAndDelete(teamId);
    // Runs an asynchronous synchronization task to delete the team's snapshot from Firebase, also passing its members and owner for potential related cleanup.
    await runSync('delete-team', () =>
      deleteTeamSnapshot(teamId, team.members, team.ownerId)
    );
    // Invalidates cache entries for all members and the owner of the deleted team.
    await cache.invalidate(
      // Creates an array of unique cache keys for all members and the owner.
      ...Array.from(
        new Set(
          [...team.members, team.ownerId].map(
            (memberUid) => `user:me:${memberUid}`
          )
        )
      )
    );

    // Sends a 200 OK status and a JSON success message.
    res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    // Catches any errors.
    // Logs the error to the console.
    console.error('Error deleting team:', error);
    // Sends a 500 Internal Server Error status and a JSON error message.
    res.status(500).json({ message: 'Server error' });
  }
});

// Defines a DELETE route for '/:teamId/members/:memberUid' to remove a specific member from a team. Protected by 'verifyToken'.
router.delete('/:teamId/members/:memberUid', verifyToken, async (req, res) => {
  // Destructures 'teamId' and 'memberUid' from the request parameters.
  const { teamId, memberUid } = req.params;
  // Extracts the user ID (uid) of the authenticated user.
  const uid = req.user.uid;

  // Starts a try block to handle potential errors.
  try {
    // Finds the team document by 'teamId'. '.lean()' optimizes the query.
    const team = await Team.findById(teamId).lean();
    // Checks if the team was not found.
    if (!team)
      // If not found, sends a 404 Not Found status and a JSON error message.
      return res.status(404).json({ message: 'Team not found' });

    // Checks if the authenticated user is not the owner of the team.
    if (team.ownerId !== uid) {
      // If not the owner, sends a 403 Forbidden status and a JSON error message.
      return res
        .status(403)
        .json({ message: 'Only the team owner can remove members' });
    }

    // Checks if the 'memberUid' to be removed is the same as the team's 'ownerId'.
    if (memberUid === team.ownerId) {
      // If trying to remove the owner, sends a 400 Bad Request status and a JSON error message.
      return res
        .status(400)
        .json({ message: 'Cannot remove the owner. Delete the team instead.' });
    }

    // Updates the team document in the database.
    await Team.updateOne(
      // Specifies the team to update by its MongoDB '_id'.
      { _id: team._id },
      // Uses the '$set' operator to update the 'members' array.
      { $set: { members: team.members.filter((id) => id !== memberUid) } } // Filters out the 'memberUid' from the 'members' array.
    );

    // Finds the user document for the removed member. '.lean()' optimizes the query.
    const member = await User.findOne({ uid: memberUid }).lean();
    // Checks if the member's user document was found.
    if (member) {
      // Updates the removed member's user document.
      await User.updateOne(
        // Specifies the user to update by their 'uid'.
        { uid: memberUid },
        // Uses the '$set' operator to update the 'teamMemberships' array.
        {
          $set: {
            // Filters out the 'teamId' from the member's 'teamMemberships' array.
            teamMemberships: (member.teamMemberships || []).filter(
              (id) => String(id) !== String(teamId)
            ),
          },
        }
      );
      // Invalidates the cache entry for the removed member, ensuring fresh data.
      await cache.invalidate(`user:me:${memberUid}`);
    }
    // Runs an asynchronous synchronization task to remove the member from the team in Firebase.
    await runSync('remove-member', () =>
      removeMemberFromTeam(teamId, memberUid)
    );

    // Sends a 200 OK status and a JSON success message.
    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    // Catches any errors.
    // Logs the error to the console.
    console.error('Error removing member:', error);
    // Sends a 500 Internal Server Error status and a JSON error message.
    res.status(500).json({ message: 'Server error' });
  }
});

// Defines a POST route for '/invite' to send an invitation email. Protected by 'verifyToken'.
router.post('/invite', verifyToken, async (req, res) => {
  // Destructures 'email' from the request body (the email of the person to invite).
  const { email } = req.body;
  // Extracts the user ID (uid) of the authenticated user (the inviter).
  const uid = req.user.uid;

  // Checks if the 'email' is missing from the request body.
  if (!email)
    // If missing, sends a 400 Bad Request status and a JSON error message.
    return res.status(400).json({ message: 'Email is required' });

  // Starts a try block to handle potential errors.
  try {
    // Finds the user document for the inviter. '.lean()' optimizes the query.
    const user = await User.findOne({ uid }).lean();
    // Checks if the user is not found, or if they have no team memberships.
    if (!user || !user.teamMemberships || user.teamMemberships.length === 0) {
      // If the inviter is not in any team, sends a 400 Bad Request status and a JSON error message.
      return res
        .status(400)
        .json({ message: 'You must be in a team to invite members' });
    }

    // Assumes the inviter is inviting to their first team listed in 'teamMemberships'.
    const teamId = user.teamMemberships[0];
    // Finds the team document using the 'teamId'. '.lean()' optimizes the query.
    const team = await Team.findById(teamId).lean();
    // Checks if the team was not found.
    if (!team)
      // If not found, sends a 404 Not Found status and a JSON error message.
      return res.status(404).json({ message: 'Team not found' });

    // Dynamically imports the 'sendZYNCEmail' function from the mailer service.
    const { sendZYNCEmail } = require('../services/mailer');
    // Calls the 'sendZYNCEmail' function to send the invitation.
    await sendZYNCEmail(
      // The recipient's email address.
      email,
      // The subject line of the email.
      `You're invited to join ${team.name} on ZYNC!`,
      // The HTML content of the email body, including team name, inviter's name, and invite code.
      `
              <h2>Team Invitation</h2>
              <p>${user.displayName || 'A colleague'} has invited you to join the <strong>${team.name}</strong> team.</p>
              <p><strong>Invite Code: ${team.inviteCode}</strong></p>
              <p>Login to ZYNC and enter this code to join the team.</p>
            `,
      // The plain text content for the email.
      `You've been invited to join ${team.name}. Invite Code: ${team.inviteCode}`
    );

    // Sends a 200 OK status and a JSON success message.
    res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (error) {
    // Catches any errors.
    // Logs the error to the console.
    console.error('Error sending invite:', error);
    // Sends a 500 Internal Server Error status and a JSON error message.
    res.status(500).json({ message: 'Server error' });
  }
});

// Defines a POST route for '/:teamId/leave' to allow a member to leave a team. Protected by 'verifyToken'.
router.post('/:teamId/leave', verifyToken, async (req, res) => {
  // Destructures 'teamId' from the request parameters.
  const { teamId } = req.params;
  // Extracts the user ID (uid) of the authenticated user (the one leaving).
  const uid = req.user.uid;

  // Starts a try block to handle potential errors.
  try {
    // Finds the team document by 'teamId'. '.lean()' optimizes the query.
    const team = await Team.findById(teamId).lean();
    // Checks if the team was not found.
    if (!team)
      // If not found, sends a 404 Not Found status and a JSON error message.
      return res.status(404).json({ message: 'Team not found' });

    // Checks if the authenticated user is the owner of the team.
    if (team.ownerId === uid) {
      // If the user is the owner, they cannot leave directly; they must transfer ownership or delete the team. Sends a 400 Bad Request.
      return res
        .status(400)
        .json({
          message:
            'The owner cannot leave the team. Transfer ownership or delete the team instead.',
        });
    }

    // Checks if the authenticated user is not a member of the team.
    if (!team.members.includes(uid)) {
      // If not a member, sends a 400 Bad Request status and a JSON error message.
      return res
        .status(400)
        .json({ message: 'You are not a member of this team' });
    }

    // Updates the team document in the database.
    await Team.updateOne(
      // Specifies the team to update by its MongoDB '_id'.
      { _id: team._id },
      // Uses the '$set' operator to update the 'members' array.
      { $set: { members: team.members.filter((id) => id !== uid) } } // Filters out the authenticated user's 'uid' from the 'members' array.
    );

    // Finds the user document for the user who is leaving. '.lean()' optimizes the query.
    const user = await User.findOne({ uid }).lean();
    // Checks if the user document was found.
    if (user) {
      // Updates the user's document in the database.
      await User.updateOne(
        // Specifies the user to update by their 'uid'.
        { uid },
        // Uses the '$set' operator to update the 'teamMemberships' array.
        {
          $set: {
            // Filters out the 'teamId' from the user's 'teamMemberships' array.
            teamMemberships: (user.teamMemberships || []).filter(
              (id) => String(id) !== String(teamId)
            ),
          },
        }
      );
      // Invalidates the cache entry for the user, ensuring fresh data.
      await cache.invalidate(`user:me:${uid}`);
    }
    // Runs an asynchronous synchronization task to remove the member from the team in Firebase.
    await runSync('leave-team', () => removeMemberFromTeam(teamId, uid));

    // Sends a 200 OK status and a JSON success message.
    res.status(200).json({ message: 'Left team successfully' });
  } catch (error) {
    // Catches any errors.
    // Logs the error to the console.
    console.error('Error leaving team:', error);
    // Sends a 500 Internal Server Error status and a JSON error message.
    res.status(500).json({ message: 'Server error' });
  }
});

// Defines a GET route for '/:teamId/details' to fetch details of a specific team. Protected by 'verifyToken'.
router.get('/:teamId/details', verifyToken, async (req, res) => {
  // Destructures 'teamId' from the request parameters.
  const { teamId } = req.params;

  // Starts a try block to handle potential errors.
  try {
    // Finds the team document by 'teamId'. '.lean()' optimizes the query.
    const team = await Team.findById(teamId).lean();
    // Checks if the team was not found.
    if (!team)
      // If not found, sends a 404 Not Found status and a JSON error message.
      return res.status(404).json({ message: 'Team not found' });

    // Finds all user documents whose 'uid' is present in the team's 'members' array. '.lean()' optimizes the query.
    const users = await User.find({ uid: { $in: team.members } }).lean();
    // Creates a Map for quick lookup of user details by their 'uid'.
    const userMap = new Map(users.map((u) => [u.uid, u]));
    // Maps over the team's 'members' array to create an array of detailed member objects.
    const memberDetails = team.members.map((memberUid) => {
      // Retrieves the user object from the 'userMap' using the 'memberUid'.
      const user = userMap.get(memberUid);
      // Checks if the user object was found.
      return user
        ? // If user found, returns a detailed object with user information and an 'isOwner' flag.
          {
            uid: user.uid,
            displayName:
              user.displayName || user.email?.split('@')[0] || 'Unknown', // Provides a fallback display name if not set.
            email: user.email,
            photoURL: user.photoURL,
            isOwner: memberUid === team.ownerId, // Checks if the current member is the team owner.
          }
        : // If user not found (e.g., deleted user), returns a placeholder object.
          {
            uid: memberUid,
            displayName: 'Unknown User',
            email: '',
            photoURL: null,
            isOwner: false,
          };
    });

    // Sends a JSON response containing the normalized team object and the detailed member information.
    res.json({
      // Spreads the properties of the normalized team object.
      ...normalizeDoc(team),
      // Adds the 'memberDetails' array to the response.
      memberDetails,
    });
  } catch (error) {
    // Catches any errors.
    // Logs the error to the console.
    console.error('Error fetching team details:', error);
    // Sends a 500 Internal Server Error status and a JSON error message.
    res.status(500).json({ message: 'Server error' });
  }
});

// Defines a PATCH route for '/:teamId/transfer-ownership' to transfer team ownership. Protected by 'verifyToken'.
router.patch('/:teamId/transfer-ownership', verifyToken, async (req, res) => {
  // Destructures 'teamId' from the request parameters.
  const { teamId } = req.params;
  // Destructures 'newOwnerId' from the request body.
  const { newOwnerId } = req.body;
  // Extracts the user ID (uid) of the authenticated user (the current owner).
  const uid = req.user.uid;

  // Checks if 'newOwnerId' is missing from the request body.
  if (!newOwnerId)
    // If missing, sends a 400 Bad Request status and a JSON error message.
    return res.status(400).json({ message: 'New owner ID is required' });

  // Starts a try block to handle potential errors.
  try {
    // Finds the team document by 'teamId'. '.lean()' optimizes the query.
    const team = await Team.findById(teamId).lean();
    // Checks if the team was not found.
    if (!team)
      // If not found, sends a 404 Not Found status and a JSON error message.
      return res.status(404).json({ message: 'Team not found' });

    // Checks if the authenticated user is not the current owner of the team.
    if (team.ownerId !== uid) {
      // If not the owner, sends a 403 Forbidden status and a JSON error message.
      return res
        .status(403)
        .json({ message: 'Only the current owner can transfer ownership' });
    }

    // Checks if the 'newOwnerId' is not a member of the team.
    if (!team.members.includes(newOwnerId)) {
      // If the target user is not a member, sends a 400 Bad Request status and a JSON error message.
      return res
        .status(400)
        .json({ message: 'Target user is not a member of this team' });
    }

    // Checks if the 'newOwnerId' is the same as the current owner's 'uid'.
    if (newOwnerId === uid) {
      // If trying to transfer ownership to themselves, sends a 400 Bad Request status and a JSON error message.
      return res.status(400).json({ message: 'You are already the owner' });
    }

    // Updates the team document in the database by setting the 'ownerId' to the 'newOwnerId'.
    await Team.findByIdAndUpdate(teamId, { $set: { ownerId: newOwnerId } });
    // Runs an asynchronous synchronization task to transfer team ownership in Firebase.
    await runSync('transfer-ownership', () =>
      transferTeamOwnership(teamId, uid, newOwnerId)
    );

    // Sends a 200 OK status and a JSON success message.
    res.status(200).json({ message: 'Ownership transferred successfully' });
  } catch (error) {
    // Catches any errors.
    // Logs the error to the console.
    console.error('Error transferring ownership:', error);
    // Sends a 500 Internal Server Error status and a JSON error message.
    res.status(500).json({ message: 'Server error' });
  }
});

// Defines a PATCH route for '/:teamId/name' to update a team's name. Protected by 'verifyToken'.
router.patch('/:teamId/name', verifyToken, async (req, res) => {
  // Destructures 'teamId' from the request parameters.
  const { teamId } = req.params;
  // Extracts the user ID (uid) of the authenticated user.
  const uid = req.user.uid;
  // Extracts the 'name' from the request body, ensuring it's a string and trimming whitespace.
  const nextName =
    typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  // Checks if the 'nextName' is empty after trimming.
  if (!nextName) {
    // If empty, sends a 400 Bad Request status and a JSON error message.
    return res.status(400).json({ message: 'Team name is required' });
  }

  // Checks if the 'nextName' exceeds the maximum allowed length of 80 characters.
  if (nextName.length > 80) {
    // If too long, sends a 400 Bad Request status and a JSON error message.
    return res
      .status(400)
      .json({ message: 'Team name must be 80 characters or fewer' });
  }

  // Starts a try block to handle potential errors.
  try {
    // Finds the team document by 'teamId'. '.lean()' optimizes the query.
    const team = await Team.findById(teamId).lean();
    // Checks if the team was not found.
    if (!team)
      // If not found, sends a 404 Not Found status and a JSON error message.
      return res.status(404).json({ message: 'Team not found' });

    // Checks if the authenticated user is not the owner of the team.
    if (team.ownerId !== uid) {
      // If not the owner, sends a 403 Forbidden status and a JSON error message.
      return res
        .status(403)
        .json({ message: 'Only the team owner can rename the team' });
    }

    // Updates the team document in the database by setting its 'name' to 'nextName'.
    const updated = await Team.findByIdAndUpdate(
      // Specifies the team to update by its 'teamId'.
      teamId,
      // Uses the '$set' operator to update the 'name' field.
      { $set: { name: nextName } },
      // Options: 'returnDocument: 'after'' returns the updated document, and 'lean: true' returns a plain JavaScript object.
      { returnDocument: 'after', lean: true }
    );
    // Runs an asynchronous synchronization task to upsert (update or insert) the updated team's snapshot in Firebase.
    await runSync('rename-team', () => upsertTeamSnapshot(updated));

    // Sends a 200 OK status and a JSON response containing the normalized updated team object.
    res.status(200).json(normalizeDoc(updated));
  } catch (error) {
    // Catches any errors.
    // Logs the error to the console.
    console.error('Error renaming team:', error);
    // Sends a 500 Internal Server Error status and a JSON error message.
    res.status(500).json({ message: 'Server error' });
  }
});

// Exports the router object, making all the defined routes available for use in the main Express application.
module.exports = router;