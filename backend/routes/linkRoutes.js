const express = require('express'); // Declares a constant variable named 'express' and assigns it the Express.js framework, which is a web application framework for Node.js, making it available to create and manage server routes and HTTP requests.
const router = express.Router(); // Initializes a new router instance from Express, which allows us to define modular, mountable route handlers for specific paths, keeping our API routes organized.
const authMiddleware = require('../middleware/authMiddleware'); // Declares a constant variable named 'authMiddleware' and assigns it the authentication middleware function imported from its relative path, which will be used to protect routes by verifying user authentication.
const Project = require('../models/Project'); // Declares a constant variable named 'Project' and assigns it the Mongoose Project model imported from its relative path, enabling interaction with the 'projects' collection in the database.
const Repository = require('../models/Repository'); // Declares a constant variable named 'Repository' and assigns it the Mongoose Repository model imported from its relative path, enabling interaction with the 'repositories' collection in the database.
const { normalizeDoc } = require('../utils/normalize'); // Declares a constant variable and uses object destructuring to extract the 'normalizeDoc' function from the 'normalize' utility module, which is likely used to standardize document formats.
const { getProjectWithSteps } = require('../utils/projectHelper'); // Declares a constant variable and uses object destructuring to extract the 'getProjectWithSteps' function from the 'projectHelper' utility module, which is used to fetch project details along with associated steps.

// Defines a POST route for linking a GitHub repository to a project.
router.post('/link-repo', authMiddleware, async (req, res) => {
  try {
    const { projectId, githubRepoId } = req.body; // Uses object destructuring to extract 'projectId' and 'githubRepoId' from the request body, which are the identifiers needed to link a repository.
    const uid = req.user.uid; // Declares a constant variable 'uid' and assigns it the user's unique ID, which is typically attached to the request object by the 'authMiddleware' after successful authentication, to verify user ownership or team membership.

    if (!projectId || !githubRepoId) { // Checks if either 'projectId' or 'githubRepoId' is missing from the request body.
      return res.status(400).json({ message: 'projectId and githubRepoId are required' }); // If required parameters are missing, sends a 400 Bad Request status with an error message, preventing the operation from proceeding without necessary data.
    }

    const project = await Project.findById(projectId).lean(); // Asynchronously queries the database to find a project by its 'projectId' and converts the Mongoose document to a plain JavaScript object using '.lean()' for better performance, to retrieve project details.
    if (!project) return res.status(404).json({ message: 'Project not found' }); // If no project is found with the given ID, sends a 404 Not Found status with an error message, indicating the project does not exist.

    if (project.ownerUid !== uid && !project.team.includes(uid)) { // Checks if the authenticated user's 'uid' is neither the owner of the project nor included in the project's team array.
      return res.status(403).json({ message: 'Unauthorized' }); // If the user is not authorized to modify the project, sends a 403 Forbidden status with an error message, enforcing access control.
    }

    let repo = await Repository.findOne({ githubRepoId }).lean(); // Asynchronously queries the database to find a repository by its 'githubRepoId' and converts the Mongoose document to a plain JavaScript object, to check if the repository already exists in the system.
    if (!repo) { // Checks if no repository was found with the given 'githubRepoId'.
      repo = (await Repository.create({ githubRepoId, repoName: githubRepoId })).toObject(); // If the repository doesn't exist, asynchronously creates a new repository document in the database with the provided 'githubRepoId' (and uses it as 'repoName' by default), then converts the new Mongoose document to a plain JavaScript object.
    }

    const currentIds = project.githubRepoIds || []; // Declares a constant variable 'currentIds' and assigns it the existing array of 'githubRepoIds' from the project, or an empty array if 'githubRepoIds' is undefined, to prepare for adding a new ID.
    if (!currentIds.includes(githubRepoId)) { // Checks if the 'githubRepoId' to be linked is not already present in the 'currentIds' array, preventing duplicate entries.
      const newIds = [...currentIds, githubRepoId]; // Creates a new array 'newIds' by spreading the 'currentIds' and adding the new 'githubRepoId' to it, effectively appending the new ID.
      await Project.updateOne({ _id: projectId }, { $set: { githubRepoIds: newIds } }); // Asynchronously updates the project document in the database by finding it by its '_id' and setting its 'githubRepoIds' field to the 'newIds' array, persisting the link.
    }

    const updatedProject = await getProjectWithSteps(projectId); // Asynchronously calls the 'getProjectWithSteps' utility function with the 'projectId' to fetch the project details, including any associated steps, after the repository has been linked.
    res.json(updatedProject); // Sends the 'updatedProject' object as a JSON response with a 200 OK status, indicating successful linking and providing the latest project data.
  } catch (error) {
    console.error('Error linking repo:', error); // Logs the error message to the console, prefixed with 'Error linking repo:', for debugging purposes when an exception occurs.
    res.status(500).json({ message: 'Server error', error: error.message }); // Sends a 500 Internal Server Error status with a generic error message and the specific error message, indicating a problem on the server side.
  }
});

// Defines a POST route for unlinking a GitHub repository from a project.
router.post('/unlink-repo', authMiddleware, async (req, res) => {
  try {
    const { projectId, githubRepoId } = req.body; // Uses object destructuring to extract 'projectId' and 'githubRepoId' from the request body, which are the identifiers needed to unlink a repository.
    const uid = req.user.uid; // Declares a constant variable 'uid' and assigns it the user's unique ID, which is typically attached to the request object by the 'authMiddleware' after successful authentication, to verify user ownership or team membership.

    const project = await Project.findById(projectId).lean(); // Asynchronously queries the database to find a project by its 'projectId' and converts the Mongoose document to a plain JavaScript object, to retrieve project details for validation.
    if (!project) return res.status(404).json({ message: 'Project not found' }); // If no project is found with the given ID, sends a 404 Not Found status with an error message, indicating the project does not exist.

    if (project.ownerUid !== uid && !project.team.includes(uid)) { // Checks if the authenticated user's 'uid' is neither the owner of the project nor included in the project's team array.
      return res.status(403).json({ message: 'Unauthorized' }); // If the user is not authorized to modify the project, sends a 403 Forbidden status with an error message, enforcing access control.
    }

    const currentIds = project.githubRepoIds || []; // Declares a constant variable 'currentIds' and assigns it the existing array of 'githubRepoIds' from the project, or an empty array if 'githubRepoIds' is undefined, to prepare for filtering.
    const newIds = currentIds.filter(id => id !== githubRepoId); // Creates a new array 'newIds' by filtering out the 'githubRepoId' that needs to be unlinked from the 'currentIds' array, effectively removing it.
    await Project.updateOne({ _id: projectId }, { $set: { githubRepoIds: newIds } }); // Asynchronously updates the project document in the database by finding it by its '_id' and setting its 'githubRepoIds' field to the 'newIds' array, persisting the unlink operation.

    const updatedProject = await getProjectWithSteps(projectId); // Asynchronously calls the 'getProjectWithSteps' utility function with the 'projectId' to fetch the project details, including any associated steps, after the repository has been unlinked.
    res.json(updatedProject); // Sends the 'updatedProject' object as a JSON response with a 200 OK status, indicating successful unlinking and providing the latest project data.
  } catch (error) {
    console.error('Error unlinking repo:', error); // Logs the error message to the console, prefixed with 'Error unlinking repo:', for debugging purposes when an exception occurs.
    res.status(500).json({ message: 'Server error', error: error.message }); // Sends a 500 Internal Server Error status with a generic error message and the specific error message, indicating a problem on the server side.
  }
});

module.exports = router; // Exports the 'router' object, making all the defined routes available for use by the main Express application.