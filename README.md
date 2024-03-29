# git-on-with-it

Command line workflows for git and CI. Only supports MacOS.

Built for use at Freetrade, so it's quite tailored for the specific tools/platforms we use (GitHub, CircleCI, Jira).

## Dependencies
You must have the following installed/configured on your system:
- [GitHub CLI](https://github.com/cli/cli)
  - Used for PR creation
- [Git](https://www.atlassian.com/git/tutorials/install-git)
  - Used to execute various CLI commands, like pushing a local branch to remote
- [alerter](https://github.com/vjeantet/alerter)
  - Used by the `watch-ci` command, to give native MacOS notifications
  - Can install with `brew install alerter`

## Usage

The bash script `git-on-with-it.sh` contains all of the commands.

For convenience, you'll want to make an alias for it, such as:

`alias giton='~/MY_SOURCE_DIRECTORY/git-on-with-it/git-on-with-it.sh'`

Then, you can easily run `giton` commands in your terminal, e.g. `giton open-pr`

## Configuration
The app/commands will look for a config file in the root named `app-config.json`. This will hold your credentials for the various integrations, amongst other things.

You can copy the file `app-config.template.json` as a starting point.

Description of the config fields:

| Field                               | Description |
|-------------------------------------| --- |
| `jira.userName`                     | The email address associated to your JIRA profile
| `jira.userId`                       | To find it, go to your JIRA profile page, the last part of the URL is your user ID
| `jira.apiToken`                     | Create one here: https://id.atlassian.com/manage-profile/security/api-tokens
| `jira.host`                         | Hostname of the JIRA instance, eg `companyname.atlassian.net`
| `jira.statuses.*`                   | The human-readable status IDs that will be used to classify issues
| `circleci.apiToken`                 | Create one here: https://app.circleci.com/settings/user/tokens
| `notification.senderApp`            | Used by `alerter` to determine which which app notifications will appear to come from. More details in `watch-ci` command docs below.
| `git.possibleBaseBranches`          | A list of the possible names of "long-lived" branches, such as `main`, that are routinely branched from and merged into. Used to determine base branch for PR creation, for example.
| `pullRequest.editInTerminal`        | If `true`, allows editing the PR title/body in VIM or other terminal text editor
| `pullRequest.template.replacements` | Automatically substitute text within the PR template
| `...replacements[].target`          | Text to find, that will be replaced/substituted
| `...replacements[].useRegex`        | If `true`, then `target` is to be interpreted as a regular expression, rather than literal text. Defaults to `false`
| `...replacements[].replaceWith`     | The replacement text
| `logOutputEnabled`                  | If set to `true`, debug logging will be outputted to the console during command execution

## Commands
### Create Branch `create-branch`
Create a branch that's based on a JIRA ticket/issue that's currently in development.

The new branch will be named by a combination of JIRA issue ID/key and the title/summary of the ticket.

### Open PR `open-pr`

The meat and potatoes of this utility. Opens a PR with GitHub from the current branch, with context awareness of the associated JIRA ticket. Includes templating features to pre-fill the title and body of the PR.
- If the associated JIRA ticket cannot be determined from the branch name, then the user is prompted to select from a list of issues that are currently in development.
- The PR title is populated with the ID and title of the JIRA ticket
- For the PR body:
  - If there is a PR template at `.github/PULL_REQUEST_TEMPLATE.md`, that will be used as a base
  - Then, replacements will be applied as specified in config
  - Then, variable substitution will occur. To reference a variable, use the format `${variableName}`
- If `pullRequest.editInTerminal` is enabled, then the user has the opportunity to edit the title/body of the PR in VIM (or other terminal text editor)

#### Available variables
| Field | Description |
| --- | --- |
| `issue.key` | Identifier for the associated JIRA issue, can be used to form a URL/link to the issue
| `issue.description` | Body of the issue
| `issue.summary` | Title of the issue

### Post PR `post-pr`
Once the PR has been created, a typical next step is to post a message in Slack, or another messaging app, to notify your team members that the PR is ready for review.

This command will copy such a message to the clipboard so that it can be pasted into a Slack channel.

### Watch CI `watch-ci`
Will monitor GitHub PR and CircleCI builds for the current branch, and notify when events of interest occur.

For example, there'll be a notification when a CircleCI build fails, which you can click on to navigate to the error details in browser. The final notification will come when the PR has merged, at which point the command will terminate.

#### `alerter` configuration
It's a bit of a quirky notification solution but the best one I could find for MacOS. The underlying problem is that it hasn't been updated in a few years, so it's still using an old MacOS API for Notifications.

In order to work it needs to assume the identity of an application installed on the system, but it's quite particular about which application you choose. The example `notification.senderApp` configuration uses TextEdit (`com.apple.TextEdit`) as it's an app that should be installed on everyone's mac, and also it's an app that doesn't have an existing integration with MacOS notifications, which is key: [see an explanation of the issue](https://github.com/vjeantet/alerter/issues/36#issuecomment-946412359). Other apps may work but you'll need to experiment.
