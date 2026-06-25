const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema(
  {
    githubRepoId: { type: String, required: true, unique: true },
    repoName:     { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'repositories',
  }
);

module.exports = mongoose.model('Repository', repositorySchema);
