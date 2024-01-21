import 'reflect-metadata'
import { Command } from 'commander'
import { container } from 'tsyringe'
import chalk from 'chalk'

import { OpenPrCommand } from './commands/open-pr-command'
import { CreateBranchCommand } from './commands/create-branch-command'
import { PostPrCommand } from './commands/post-pr-command'
import { WatchCiCommand } from './commands/watch-ci-command'
import { PrDaemonCommand } from './commands/pr-daemon-command'
import { CreateTicketCommand } from './commands/create-ticket-command'
import { CircleCommand } from './commands/circle-command'

const program = new Command()

interface ICommand {
    execute: (...args: any[]) => Promise<void>
}
function commandRunner(commandConstructor: new (...args: any[]) => ICommand): () => Promise<void> {
    return async (...args: any[]) => {
        const command = container.resolve(commandConstructor)
        try {
            await command.execute(...args)
        }
        catch (error) {
            if (error.name === 'AppError') {
                program.error(chalk.red(error.message))
            } else {
                throw error
            }
        }
    }
}

program
    .name('git-on-with-it')
    .description('CLI workflows for git')
    .version('1.0.0')

program.command('open-pr')
    .description('WIP command for opening a PR in GitHub')
    .action(commandRunner(OpenPrCommand))

program.command('post-pr')
    .description('WIP command for copying text for a PR post')
    .action(commandRunner(PostPrCommand))

program.command('create-branch')
    .description('WIP command for creating a feature branch based on JIRA ticket')
    .action(commandRunner(CreateBranchCommand))

program.command('circle')
    .description('Open CircleCI page for current branch')
    .action(commandRunner(CircleCommand))

program.command('create-ticket <title>')
    .description('Create a JIRA ticket on the sprint board')
    .action(commandRunner(CreateTicketCommand))

program.command('watch-ci')
    .description('WIP command for monitoring CI and PR activity related to current branch')
    .action(commandRunner(WatchCiCommand))

program.command('pr-daemon')
    .description('WIP command for monitoring status of open PRs and notifying of changes')
    .action(commandRunner(PrDaemonCommand))

program.command('update')
    .description('Install updates for git-on-with-it, if available')

program.parse()
