/**
 * @fileoverview meetRoutes.js
 * @module meetRoutes
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
const express = require('express');
// This line imports the Express.js framework, which is a popular Node.js web application framework, to create and manage the server and routes.
const router = express.Router();
// This line creates a new router object from Express, which allows for defining modular, mountable route handlers for specific paths.
const verifyToken = require('../middleware/authMiddleware');
// This line imports the 'verifyToken' middleware function, which is used to authenticate requests by validating a JSON Web Token (JWT) before allowing access to protected routes.
const User = require('../models/User');
// This line imports the Mongoose 'User' model, which provides an interface to interact with the 'users' collection in the MongoDB database.
const Meeting = require('../models/Meeting');
// This line imports the Mongoose 'Meeting' model, which provides an interface to interact with the 'meetings' collection in the MongoDB database.
const Project = require('../models/Project');
// This line imports the Mongoose 'Project' model, which provides an interface to interact with the 'projects' collection in the MongoDB database.
const { createInstantMeet } = require('../services/googleMeet');
// This line imports the 'createInstantMeet' function from the Google Meet service, which is responsible for generating new Google Meet links for meetings.
const { sendZyncEmail } = require('../services/mailer');
// This line imports the 'sendZyncEmail' function from the mailer service, which is used to send email notifications, such as meeting invitations, to users.
const { getMeetingInviteTextVersion, getMeetingEmailHtml } = require('../utils/emailTemplates');
// This line imports utility functions for generating the plain text and HTML content of meeting invitation emails, ensuring consistent email formatting.
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
const { sendPushNotification } = require('../services/pushNotificationService');
// This line imports utility functions 'normalizeDoc' and 'normalizeDocs', which are used to transform Mongoose document objects into a consistent, standardized format (e.g., converting '_id' to 'id').
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');
// This line imports utility functions 'paginateArray' and 'setPaginationHeaders', which are used to handle array pagination logic and set appropriate HTTP response headers for pagination metadata.


router.get('/user/:uid', verifyToken, async (req, res) => {
    // This line defines a GET API endpoint at '/user/:uid' that retrieves meeting history for a specific user, protected by the 'verifyToken' middleware.
    const { uid } = req.params;
    // This line uses object destructuring to extract the 'uid' (user ID) from the request parameters, which identifies the user whose meeting history is being requested.
    if (req.user.uid !== uid) {
    // This line checks if the authenticated user's ID (from the JWT payload) does not match the 'uid' provided in the URL parameters.
        return res.status(403).json({ message: 'Unauthorized access to meeting history' });
        // This line sends a 403 Forbidden status code and a JSON error message if the authenticated user is trying to access another user's meeting history, enforcing security.
    }

    try {
    // This block starts a try-catch statement to handle potential errors that might occur during the database operations or data processing.
        const meetings = await Meeting.find({
        // This line initiates a database query to find meeting documents in the 'Meeting' collection.
            $or: [
            // This operator specifies a logical OR condition, meaning documents will be returned if they match any of the conditions within the array.
                { organizerId: uid },
                // This condition checks if the 'organizerId' field of a meeting document matches the requested 'uid', retrieving meetings organized by the user.
            ]
        })
            .sort({ startTime: -1 })
            // This method sorts the retrieved meeting documents in descending order based on their 'startTime', showing the most recent meetings first.
            .limit(20)
            // This method limits the number of returned meeting documents to a maximum of 20, providing a default page size for the meeting history.
            .lean();
            // This method tells Mongoose to return plain JavaScript objects instead of Mongoose documents, which can improve performance for read-only operations.

        const filteredMeetings = meetings.filter(m => {
        // This line filters the 'meetings' array to include only those meetings where the user is either the organizer or a participant.
            if (m.organizerId === uid) return true;
            // This condition checks if the current meeting's 'organizerId' matches the requested 'uid', including it in the filtered list if true.
            const participants = Array.isArray(m.participants) ? m.participants : [];
            // This line safely retrieves the 'participants' array from the meeting object, defaulting to an empty array if it's not an array.
            return participants.some(p => p.uid === uid);
            // This line checks if any participant in the meeting has a 'uid' that matches the requested 'uid', including the meeting if the user is a participant.
        });

        const now = new Date();
        // This line creates a new Date object representing the current date and time, which is used to determine the real-time status of meetings.
        const updatedMeetings = filteredMeetings.map(m => {
        // This line iterates over each meeting in the 'filteredMeetings' array and transforms it, primarily to update its status based on the current time.
            const startTime = new Date(m.startTime);
            // This line converts the meeting's 'startTime' string or timestamp into a Date object for easier comparison.
            const meetingEnd = m.endTime ? new Date(m.endTime) : new Date(startTime.getTime() + 60 * 60 * 1000);
            // This line calculates the meeting's end time: if 'endTime' is provided, it uses that; otherwise, it defaults to one hour after the 'startTime'.

            let status = m.status;
            // This line initializes a 'status' variable with the existing status of the meeting.
            if (status === 'cancelled') return { ...normalizeDoc(m), status };
            // This line checks if the meeting status is 'cancelled'; if so, it returns the normalized meeting object with its original 'cancelled' status, as it doesn't need further time-based status updates.

            if (now.getTime() > meetingEnd.getTime()) {
            // This line checks if the current time is after the calculated meeting end time.
                status = 'ended';
                // This line sets the meeting status to 'ended' if the current time has passed the meeting's end time.
            } else if (now.getTime() >= startTime.getTime() && now.getTime() <= meetingEnd.getTime()) {
            // This line checks if the current time is between the meeting's start and end times (inclusive).
                status = 'live';
                // This line sets the meeting status to 'live' if the current time falls within the meeting's scheduled duration.
            } else if (now.getTime() < startTime.getTime()) {
            // This line checks if the current time is before the meeting's start time.
                status = 'scheduled';
                // This line sets the meeting status to 'scheduled' if the current time is before the meeting is supposed to begin.
            }

            return { ...normalizeDoc(m), status };
            // This line returns a new object for the meeting, spreading the normalized original meeting properties and overriding or adding the dynamically determined 'status'.
        });

        const { items, pagination } = paginateArray(updatedMeetings, req.query, { defaultLimit: 20, maxLimit: 100 });
        // This line calls the 'paginateArray' utility function to apply pagination logic to the 'updatedMeetings' array based on query parameters, returning the paginated items and pagination metadata.
        setPaginationHeaders(res, pagination);
        // This line calls the 'setPaginationHeaders' utility function to add pagination-related HTTP headers (e.g., X-Total-Count, Link) to the response, informing the client about pagination details.

        res.json(items);
        // This line sends the paginated meeting items as a JSON response to the client.
    } catch (error) {
    // This block catches any errors that occurred within the try block.
        console.error('Error fetching meetings:', error);
        // This line logs the error message to the console, helping with debugging server-side issues.
        res.status(500).json({ message: 'Server error' });
        // This line sends a 500 Internal Server Error status code and a generic JSON error message to the client, indicating a problem on the server.
    }
});


router.delete('/:meetingId', verifyToken, async (req, res) => {
    // This line defines a DELETE API endpoint at '/:meetingId' to delete a specific meeting, protected by the 'verifyToken' middleware.
    const { meetingId } = req.params;
    // This line uses object destructuring to extract the 'meetingId' from the request parameters, identifying the meeting to be deleted.
    const uid = req.user.uid;
    // This line extracts the authenticated user's ID ('uid') from the JWT payload, which is used to verify if the user is authorized to delete the meeting.

    try {
    // This block starts a try-catch statement to handle potential errors during the database operation.
        const meeting = await Meeting.findById(meetingId).lean();
        // This line queries the database to find a meeting document by its ID and returns it as a plain JavaScript object for efficiency.

        if (!meeting) {
        // This line checks if no meeting was found with the provided 'meetingId'.
            return res.status(404).json({ message: 'Meeting not found' });
            // This line sends a 404 Not Found status code and a JSON error message if the meeting does not exist.
        }

        if (meeting.organizerId !== uid) {
        // This line checks if the 'organizerId' of the found meeting does not match the 'uid' of the authenticated user.
            return res.status(403).json({ message: 'Only the organizer can delete this meeting' });
            // This line sends a 403 Forbidden status code and a JSON error message if the authenticated user is not the organizer of the meeting, enforcing access control.
        }

        await Meeting.findByIdAndDelete(meetingId);
        // This line performs a database operation to find and delete the meeting document identified by 'meetingId'.

        res.json({ message: 'Meeting deleted successfully' });
        // This line sends a success JSON response indicating that the meeting was deleted.
    } catch (error) {
    // This block catches any errors that occurred within the try block.
        console.error('Error deleting meeting:', error);
        // This line logs the error message to the console, aiding in debugging.
        res.status(500).json({ message: 'Server error' });
        // This line sends a 500 Internal Server Error status code and a generic JSON error message to the client.
    }
});


router.post('/schedule', verifyToken, async (req, res) => {
    // This line defines a POST API endpoint at '/schedule' to create a new scheduled meeting, protected by the 'verifyToken' middleware.
    const { title, description, startTime, endTime, organizerId, participantIds } = req.body;
    // This line uses object destructuring to extract meeting details (title, description, times, organizer, participants) from the request body.

    if (req.user.uid !== organizerId) {
    // This line checks if the authenticated user's ID does not match the 'organizerId' provided in the request body.
        return res.status(403).json({ message: 'Unauthorized organizer' });
        // This line sends a 403 Forbidden status code and a JSON error message if the authenticated user is not the declared organizer, preventing spoofing.
    }

    try {
    // This block starts a try-catch statement to handle potential errors during meeting creation and email sending.
        const meetingUrl = await createInstantMeet();
        // This line asynchronously calls the 'createInstantMeet' service to generate a unique Google Meet URL for the new meeting.

        const organizer = await User.findOne({ uid: organizerId }).lean();
        // This line queries the 'User' collection to find the organizer's details using their 'organizerId' and returns it as a plain JavaScript object.
        const participants = participantIds && participantIds.length > 0
            // This line checks if 'participantIds' exists and contains at least one ID.
            ? await User.find({ uid: { $in: participantIds } }).lean()
            // If participant IDs are provided, this line queries the 'User' collection to find all users whose 'uid' is in the 'participantIds' array, returning them as plain JavaScript objects.
            : [];
            // If no participant IDs are provided, an empty array is assigned to 'participants'.

        const participantData = participants.map(u => ({
        // This line maps over the 'participants' array to transform each user object into a standardized participant data format for the meeting.
            uid: u.uid,
            // This assigns the user's unique ID to the participant data.
            email: u.email,
            // This assigns the user's email to the participant data.
            name: u.displayName,
            // This assigns the user's display name to the participant data.
            status: 'invited'
            // This sets the initial status of the participant in the meeting to 'invited'.
        }));

        const newMeeting = await Meeting.create({
        // This line creates a new meeting document in the 'Meeting' collection with the provided details.
            title: title || 'Scheduled Meeting',
            // This assigns the meeting title from the request body, defaulting to 'Scheduled Meeting' if no title is provided.
            description,
            // This assigns the meeting description from the request body.
            startTime: new Date(startTime),
            // This converts the 'startTime' from the request body into a Date object and assigns it.
            endTime: endTime ? new Date(endTime) : new Date(new Date(startTime).getTime() + 60 * 60 * 1000),
            // This assigns the meeting 'endTime': if provided, it's converted to a Date object; otherwise, it defaults to one hour after 'startTime'.
            organizerId,
            // This assigns the 'organizerId' from the request body.
            organizerName: organizer?.displayName || 'Unknown',
            // This assigns the organizer's display name, defaulting to 'Unknown' if not found.
            meetLink: meetingUrl,
            // This assigns the generated Google Meet URL to the meeting.
            status: 'scheduled',
            // This sets the initial status of the meeting to 'scheduled'.
            participants: participantData
            // This assigns the prepared array of participant data to the meeting.
        });

        const meetingObj = normalizeDoc(newMeeting.toObject());
        // This line converts the newly created Mongoose document to a plain JavaScript object and then normalizes it (e.g., converts '_id' to 'id') for consistent API response.

        (async () => {
        // This line immediately invokes an asynchronous arrow function, allowing email sending to proceed in the background without blocking the main API response.
            await Promise.all(participants.map(async (receiver) => {
            // This line uses 'Promise.all' to concurrently send invitation emails to all participants, waiting for all email promises to resolve.
                if (receiver.email) {
                // This line checks if the receiver has an email address before attempting to send an email.
                    try {
                    // This block starts a try-catch statement to handle potential errors for each individual email sending attempt.
                        const senderName = organizer.displayName || 'A colleague';
                        // This line determines the sender's name for the email, using the organizer's display name or a default.
                        const recipientName = receiver.displayName || 'there';
                        // This line determines the recipient's name for the email, using their display name or a default.
                        const emailSubject = `Invitation: ${meetingObj.title} @ ${new Date(startTime).toLocaleString()}`;
                        // This line constructs the subject line for the invitation email, including the meeting title and formatted start time.

                        const htmlContent = getMeetingEmailHtml({
                        // This line generates the HTML content for the meeting invitation email using a utility function.
                            inviterName: senderName,
                            // This passes the sender's name to the email template.
                            meetingTopic: title,
                            // This passes the meeting title to the email template.
                            date: new Date(startTime).toLocaleDateString(),
                            // This formats and passes the meeting start date to the email template.
                            time: new Date(startTime).toLocaleTimeString(),
                            // This formats and passes the meeting start time to the email template.
                            meetingLink: meetingUrl,
                            // This passes the Google Meet link to the email template.
                            attendeeName: recipientName
                            // This passes the recipient's name to the email template.
                        });

                        const textContent = getMeetingInviteTextVersion({
                        // This line generates the plain text content for the meeting invitation email using a utility function.
                            recipientName,
                            // This passes the recipient's name to the plain text email template.
                            senderName,
                            // This passes the sender's name to the plain text email template.
                            meetingUrl,
                            // This passes the Google Meet link to the plain text email template.
                            meetingDate: new Date(startTime),
                            // This passes the meeting start date to the plain text email template.
                            meetingTime: new Date(startTime),
                            // This passes the meeting start time to the plain text email template.
                            projectName: title,
                            // This passes the meeting title (used as project name in template) to the plain text email template.
                        });

                        await sendZyncEmail(receiver.email, emailSubject, htmlContent, textContent);
                        // This line asynchronously sends the invitation email to the current receiver using the mailer service.
                    } catch (err) {
                    // This block catches any errors specific to sending an individual email.
                        console.error("Invite email failed for", receiver.email, err);
                        // This line logs an error message to the console if an email fails to send for a specific recipient.
                    }
                }
            }));
        })();

        (async () => {
            try {
                for (const p of participants) {
                    if (p.uid) {
                        await sendPushNotification(p.uid, {
                            title: 'Meeting Invitation',
                            body: `${title || 'Scheduled Meeting'} at ${new Date(startTime).toLocaleString()}`,
                            data: {
                                type: 'meeting-invite',
                                meetingId: String(newMeeting._id),
                                meetLink: meetingUrl || '',
                            },
                        });
                    }
                }
            } catch (e) {
                console.warn('[MeetRoutes] Push notification error:', e.message);
            }
        })();

        res.status(201).json(meetingObj);
        // This line sends a 201 Created status code and the normalized meeting object as a JSON response to the client, indicating successful meeting creation.

    } catch (error) {
    // This block catches any errors that occurred within the try block during meeting scheduling.
        console.error('Error scheduling meeting:', error);
        // This line logs the error message to the console, aiding in debugging.
        res.status(500).json({ message: 'Server error', error: error.message });
        // This line sends a 500 Internal Server Error status code and a JSON error message (including the specific error message) to the client.
    }
});


router.post('/invite', verifyToken, async (req, res) => {
    // This line defines a POST API endpoint at '/invite' to create an instant meeting and send invitations, protected by the 'verifyToken' middleware.
    const { senderId, receiverIds, projectId } = req.body;
    // This line uses object destructuring to extract the sender's ID, an array of receiver IDs, and an optional project ID from the request body.

    if (req.user.uid !== senderId) {
    // This line checks if the authenticated user's ID does not match the 'senderId' provided in the request body.
        return res.status(403).json({ message: 'Unauthorized sender' });
        // This line sends a 403 Forbidden status code and a JSON error message if the authenticated user is not the declared sender, preventing unauthorized actions.
    }

    try {
    // This block starts a try-catch statement to handle potential errors during meeting creation and invitation sending.
        const meetingUrl = await createInstantMeet();
        // This line asynchronously calls the 'createInstantMeet' service to generate a unique Google Meet URL for the instant meeting.

        let projectName = null;
        // This line initializes 'projectName' to null; it will store the project's name if a 'projectId' is provided.
        if (projectId) {
        // This line checks if a 'projectId' was provided in the request body.
            const project = await Project.findByIdAndUpdate(
            // This line queries the 'Project' collection to find a project by its ID and update it.
                projectId,
                // This is the ID of the project to find and update.
                { $set: { meetLink: meetingUrl } },
                // This sets the 'meetLink' field of the found project to the newly generated 'meetingUrl'.
                { returnDocument: 'after', lean: true }
                // This option ensures that the updated document is returned ('after' update) and that it's a plain JavaScript object ('lean').
            );
            projectName = project?.name || null;
            // This line assigns the 'name' of the updated project to 'projectName', or null if the project or its name is not found.
        }

        const sender = await User.findOne({ uid: senderId }).lean();
        // This line queries the 'User' collection to find the sender's details using their 'senderId' and returns it as a plain JavaScript object.
        if (!sender) return res.status(404).json({ message: 'Sender not found' });
        // This line checks if the sender user was not found; if so, it sends a 404 Not Found status and an error message.

        const receivers = Array.isArray(receiverIds) && receiverIds.length > 0
            // This line checks if 'receiverIds' exists and contains at least one ID.
            ? await User.find({ uid: { $in: receiverIds } }).lean()
            // If receiver IDs are provided, this line queries the 'User' collection to find all users whose 'uid' is in the 'receiverIds' array, returning them as plain JavaScript objects.
            : [];
            // If no receiver IDs are provided, an empty array is assigned to 'receivers'.

        const participantData = receivers.map(u => ({
        // This line maps over the 'receivers' array to transform each user object into a standardized participant data format for the meeting.
            uid: u.uid,
            // This assigns the user's unique ID to the participant data.
            email: u.email,
            // This assigns the user's email to the participant data.
            name: u.displayName,
            // This assigns the user's display name to the participant data.
            status: 'invited'
            // This sets the initial status of the participant in the meeting to 'invited'.
        }));

        const newMeeting = await Meeting.create({
        // This line creates a new meeting document in the 'Meeting' collection with the provided details for an instant meeting.
            title: projectName ? `Sync: ${projectName}` : 'Instant Meeting',
            // This assigns the meeting title, using the project name if available, otherwise defaulting to 'Instant Meeting'.
            description: 'Instant meeting started from dashboard',
            // This provides a default description for instant meetings.
            startTime: new Date(),
            // This sets the meeting 'startTime' to the current date and time, as it's an instant meeting.
            organizerId: senderId,
            // This assigns the 'senderId' as the organizer of the meeting.
            organizerName: sender.displayName,
            // This assigns the sender's display name as the organizer's name.
            meetLink: meetingUrl,
            // This assigns the generated Google Meet URL to the meeting.
            status: 'live',
            // This sets the initial status of the instant meeting to 'live'.
            projectId: projectId || null,
            // This assigns the 'projectId' if provided, otherwise sets it to null.
            participants: participantData
            // This assigns the prepared array of participant data to the meeting.
        });

        const meetingObj = normalizeDoc(newMeeting.toObject());
        // This line converts the newly created Mongoose document to a plain JavaScript object and then normalizes it for consistent API response.

        res.status(200).json({ message: 'Meeting created', meetingUrl, meetingId: meetingObj.id });
        // This line sends a 200 OK status code and a JSON response containing a success message, the meeting URL, and the meeting ID to the client.

        (async () => {
        // This line immediately invokes an asynchronous arrow function, allowing email sending to proceed in the background without blocking the main API response.
            try {
            // This block starts a try-catch statement to handle potential errors during the background email sending process for all receivers.
                await Promise.all(receivers.map(async (receiver) => {
                // This line uses 'Promise.all' to concurrently send invitation emails to all receivers, waiting for all email promises to resolve.
                    if (receiver.email) {
                    // This line checks if the current receiver has an email address before attempting to send an email.
                        try {
                        // This block starts a try-catch statement to handle potential errors for each individual email sending attempt.
                            const senderName = sender.displayName || 'A colleague';
                            // This line determines the sender's name for the email, using the sender's display name or a default.
                            const recipientName = receiver.displayName || receiver.firstName || 'there';
                            // This line determines the recipient's name for the email, using their display name, first name, or a default.
                            const emailSubject = `ZYNC Meeting Invitation from ${senderName}`;
                            // This line constructs the subject line for the invitation email, including the sender's name.

                            const htmlContent = getMeetingEmailHtml({
                            // This line generates the HTML content for the meeting invitation email using a utility function.
                                inviterName: senderName,
                                // This passes the sender's name to the email template.
                                meetingTopic: meetingObj.title,
                                // This passes the meeting title to the email template.
                                date: new Date().toLocaleDateString(),
                                // This formats and passes the current date to the email template, as it's an instant meeting.
                                time: new Date().toLocaleTimeString(),
                                // This formats and passes the current time to the email template, as it's an instant meeting.
                                meetingLink: meetingUrl,
                                // This passes the Google Meet link to the email template.
                                attendeeName: recipientName
                                // This passes the recipient's name to the email template.
                            });

                            const textContent = getMeetingInviteTextVersion({
                            // This line generates the plain text content for the meeting invitation email using a utility function.
                                recipientName,
                                // This passes the recipient's name to the plain text email template.
                                senderName,
                                // This passes the sender's name to the plain text email template.
                                meetingUrl,
                                // This passes the Google Meet link to the plain text email template.
                                meetingDate: new Date(),
                                // This passes the current date to the plain text email template.
                                meetingTime: new Date(),
                                // This passes the current time to the plain text email template.
                                projectName,
                                // This passes the project name (if available) to the plain text email template.
                            });

                            await sendZyncEmail(receiver.email, emailSubject, htmlContent, textContent);
                            // This line asynchronously sends the invitation email to the current receiver using the mailer service.
                        } catch (emailErr) {
                        // This block catches any errors specific to sending an individual email.
                            console.error(`Failed to email ${receiver.email}:`, emailErr);
                            // This line logs an error message to the console if an email fails to send for a specific recipient.
                        }
                    }
                }));
            } catch (bgError) {
            // This block catches any errors that occurred during the overall background email sending process (e.g., if Promise.all fails).
                console.error("Background notification error:", bgError);
                // This line logs a general error message to the console if there's an issue with the background email notifications.
            }
        })();

    } catch (error) {
    // This block catches any errors that occurred within the main try block during instant meeting creation or invite processing.
        console.error('Error creating meeting/invites:', error);
        // This line logs the error message to the console, aiding in debugging.
        res.status(500).json({ message: 'Server error', error: error.message });
        // This line sends a 500 Internal Server Error status code and a JSON error message (including the specific error message) to the client.
    }
});

module.exports = router;
// This line exports the 'router' object, making all the defined API routes available for use in other parts of the application (e.g., in the main Express app file).