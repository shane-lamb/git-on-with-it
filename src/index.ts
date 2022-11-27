import 'reflect-metadata'
import { Command } from 'commander'
import { container } from 'tsyringe'
import chalk from 'chalk'

import { PromptService } from './services/prompt-service'
import { OpenPrCommand } from './commands/open-pr-command'
import { CreateBranchCommand } from './commands/create-branch-command'
import { PostPrCommand } from './commands/post-pr-command'
import { WatchCiCommand } from './commands/watch-ci-command'
import { PrDaemonCommand } from './commands/pr-daemon-command'

const program = new Command()

interface ICommand {
    execute: () => Promise<void>
}
function commandRunner(commandConstructor: new (...args: any[]) => ICommand): () => Promise<void> {
    return async () => {
        const command = container.resolve(commandConstructor)
        try {
            await command.execute()
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

program.command('watch-ci')
    .description('WIP command for monitoring CI and PR activity related to current branch')
    .action(commandRunner(WatchCiCommand))

program.command('pr-daemon')
    .description('WIP command for monitoring status of open PRs and notifying of changes')
    .action(commandRunner(PrDaemonCommand))

program.command('test-prompt-service')
    .description('Temporary command to test PromptService')
    .action(async () => {
        const service = container.resolve(PromptService)
        const config = await service.selectOption([
            {id: 'a', description: 'option A'},
            {id: 'b', description: 'option B'},
        ], "Make a selection")
        console.log(JSON.stringify(config))
    })

program.parse()
