# git-on-with-it

Command line workflows for git.

Brainstormed possible features:
- Convenience commands for syncing (and committing?) changes, local branch with remote branch?
- Convenience commands for stashing/un-stashing
- Command to create a branch
  - Query "ready for development" and "in development" issues from JIRA
  - User can select an issue, and the branch will be named using the issue ID
    - If selected issue already has an associated local branch, then switch to that instead
  - If current branch is not dev/main then auto-switch to dev/main
  - Ensure that the base branch is up-to-date with remote
  - Create the branch, switch to it, configure remote
- Command to open a PR
  - Query "ready for development" and "in development" issues from JIRA
  - User can select an issue, and we'll use the issue ID and summary to pre-fill the PR title
    - If branch is already named with an issue ID, then use that instead
  - Open up vim (or other command line text editor) to edit PR title/description
    - Use PULL_REQUEST_TEMPLATE as template if available in the current repo
  - Create the PR on github
  - Add labels to the PR?
    - example: autoupdate
  - Change status of the issue to "in review"
  - Slack integration to post PR? or copy link to PR

Initial focus will be on the PR opening functionality.

## Dependencies
You must have the following installed and configured on your system:
- [GitHub CLI](https://github.com/cli/cli)
  - Used for PR creation
- [Git](https://www.atlassian.com/git/tutorials/install-git)
  - Used to execute various CLI commands, like pushing a local branch to remote
  - It's most likely already installed on your system
- NodeJS
  - Required to compile and execute the source code
  - Using [nvm](https://github.com/nvm-sh/nvm) is a good way to install and switch between different Node versions on MacOS

## Configuration
The app/commands will look for a config file in the root named `app-config.json`. This will hold your credentials for the various integrations, amongst other things.

You can copy the file `app-config.template.json` as a starting point.

Description of the config fields:

| Field | Description |
| --- | --- |
| `jira.userName` | The email address associated to your JIRA profile
| `jira.userId` | To find it, go to your JIRA profile page, the last part of the URL is your user ID
| `jira.apiToken` | Create one here: https://id.atlassian.com/manage-profile/security/api-tokens
| `jira.host` | Hostname of the JIRA instance, eg `companyname.atlassian.net`
| `jira.statuses.*` | The human-readable status IDs that will be used to classify issues
| `git.possibleBaseBranches` | A list of the possible names of "long-lived" branches, such as `main`, that are routinely branched from and merged into. Used to determine base branch for PR creation, for example.
| `pullRequestTemplate.replacements` | Automatically substitute text within the PR template
| `...replacements[].target` | Text to find, that will be replaced/substituted
| `...replacements[].useRegex` | If `true`, then `target` is to be interpreted as a regular expression, rather than literal text. Defaults to `false`
| `...replacements[].replaceWith` | The replacement text
| `logOutputEnabled` | If set to `true`, debug logging will be outputted to the console during command execution

## Build & Run
```bash
yarn install # install node dependencies
tsc # transpile .ts files into .js files and place in /dist directory
node ./dist --help # list available commands
node ./dist [command] # run command
```

## Design decisions
`tsyringe` has been used as a lightweight dependency injection solution,
in combination with a custom `createMock(ClassName)` utility method for testing.
This way we can avoid the boilerplate of creating interfaces, manual mock implementations,
and factory methods for classes.

Unit test files sit beside the files they are testing, in the same directory.
I've found that it's more convenient this way:
- In projects where unit test code is separated from application code,
you have to maintain application structure in two places, it's not automatically updated in one
when you change it in the other.
- Easier navigation via the file tree, hopping back and forth between tests and application code as is done often
during development, and easy to see that a file has tests created for it.

## Rough notes
https://stackoverflow.com/questions/11269256/how-to-name-and-retrieve-a-stash-by-name-in-git
```bash
function gitstash() {
    git stash push -m "stash_$1"
}

function gitstashapply() {
    git stash apply $(git stash list | grep "stash_$1" | cut -d: -f1)
}
```
gitstash nice
gitstashapply nice

https://github.com/octokit/octokit.net/issues/1862 - add label to PR
