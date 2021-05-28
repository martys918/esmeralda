const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')

const pull_request = () => {
  return github.context.payload.pull_request
}

const labeled = () => {
  return github.context.payload.label
}

const pull_request_author = () => {
  return github.context.payload.pull_request.user.login
}

const request_reviewers = () => {
  const path = core.getInput('request_reviewers')
  const reviewers = JSON.parse(fs.readFileSync(path, 'utf8'))
  if (labeled().name in reviewers) {
    return reviewers[labeled().name]
  }
  else {
    return []
  }
}

const repository = () => {
  return {
    owner: github.context.repo.owner,
    name: github.context.repo.repo,
  }
}

const run = async () => {
  try {
    const token = core.getInput('github-token')
    const octokit = github.getOctokit(token)

    await octokit.pulls.requestReviewers({
      owner: repository().owner,
      repo: repository().name,
      pull_number: pull_request().number,
      reviewers: request_reviewers().filter(n => n !== pull_request_author())
    })
  }
  catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

run()
