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

program.command('update')
    .description('Install updates for git-on-with-it, if available')

program.command('create-ticket')
    .description('Create JIRA ticket on the sprint board')
    .action(commandRunner(CreateTicketCommand))

program.command('create-branch')
    .description('Switch to a new branch for an in-progress JIRA ticket')
    .action(commandRunner(CreateBranchCommand))

program.command('circle')
    .description('View CircleCI status for current branch (in browser)')
    .action(commandRunner(CircleCommand))

program.command('open-pr')
    .description('Open a GitHub PR against one of your in-progress JIRA tickets')
    .action(commandRunner(OpenPrCommand))

program.command('post-pr')
    .description('Copy some shareable text for someone to review your PR')
    .action(commandRunner(PostPrCommand))

program.command('watch-ci')
    .description('Monitor CI and PR activity for current branch')
    .action(commandRunner(WatchCiCommand))

program.command('pr-daemon')
    .description('Monitor status of open PRs and get notified of changes')
    .action(commandRunner(PrDaemonCommand))

program.parse()
