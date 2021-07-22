const core = require('@actions/core')
const github = require('@actions/github')
const { IncomingWebhook } = require('@slack/webhook')
const fs = require('fs')

const pull_request = () => {
  return {
    number: github.context.payload.pull_request.number,
    title: github.context.payload.pull_request.title,
    url: github.context.payload.pull_request.html_url,
  }
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

const fisher_yates_shuffle = ([...array]) => {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array
}

const draft_reviewers = () => {
  return fisher_yates_shuffle(request_reviewers())
    .filter(n => n !== pull_request_author())
    .slice(0, core.getInput('number_of_reviewers'))
}

const run = async () => {
  try {
    const webhook = core.getInput('slack_wehbook')
    const token = core.getInput('github-token')
    const octokit = github.getOctokit(token)
    const reviewers = draft_reviewers()

    await octokit.pulls.requestReviewers({
      owner: repository().owner,
      repo: repository().name,
      pull_number: pull_request().number,
      reviewers: reviewers
    })

    if (webhook) {
      await new IncomingWebhook(webhook).send({
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*<" + pull_request().url + "|" + pull_request().title + ">*"
            }
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*Reviewee:*\n" + pull_request_author()
              },
              {
                "type": "mrkdwn",
                "text": "*Reviewers:*\n" + reviewers
              }
            ]
          }
        ]
      })
    }
  }
  catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

run()
