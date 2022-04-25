# git-on-with-it

Command line workflows for git.

## Dependencies
You must have the following installed/configured on your system:
- [GitHub CLI](https://github.com/cli/cli)
  - Used for PR creation
- [Git](https://www.atlassian.com/git/tutorials/install-git)
  - Used to execute various CLI commands, like pushing a local branch to remote
  - It's probably already installed, you can check with `git --version`
- Python 3.6+
  - Required to create a virtual environment in which NodeJS will be installed
  - It's probably already installed, you can check with `python3 --version`

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

The bash script `git-on-with-it.sh` contains commands for building, updating, and running the utility.

```bash
# 1. Make the script file executable
chmod +x git-on-with-it.sh 

# 2. Build
./git-on-with-it.sh build # build the utility so that we're ready to run commands
# or
./git-on-with-it.sh update # does a git pull first, then builds

# 3. Run
./git-on-with-it.sh run # list available commands
./git-on-with-it.sh run [command] # run command
```

### Create an alias
Creating an alias is handy for running `git-on-with-it` commands easily from anywhere within your terminal.

If using zsh, add this line to your `~/.zshrc` file, substituting `~/source` for the parent directory of this repository on your machine:
```bash
alias giton='~/source/git-on-with-it/git-on-with-it.sh run'
```

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

#### Available variables
| Field | Description |
| --- | --- |
| `issue.key` | Identifier for the associated JIRA issue, can be used to form a URL/link to the issue
| `issue.description` | Body of the issue
| `issue.summary` | Title of the issue

### Post PR `post-pr`
Once the PR has been created, a typical next step is to post a message in Slack, or another messaging app, to notify your team members that the PR is ready for review.

This command will copy such a message to the clipboard so that it can be pasted into a Slack channel.

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
