import 'reflect-metadata'
import { Command } from 'commander'
import { container } from 'tsyringe'

import { PromptService } from './services/prompt-service'
import { OpenPrCommand } from './commands/open-pr-command'
import { JiraService } from './services/jira-service'
import { CreateBranchCommand } from './commands/create-branch-command'

const program = new Command()

program
    .name('git-on-with-it')
    .description('CLI workflows for git')
    .version('1.0.0')

program.command('open-pr')
    .description('WIP command for opening a PR in GitHub')
    .action(() => container.resolve(OpenPrCommand).execute())

program.command('create-branch')
    .description('WIP command for creating a feature branch based on JIRA ticket')
    .action(() => container.resolve(CreateBranchCommand).execute())

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

program.command('test-jira-service')
    .description('Temporary command to test JiraService')
    .action(async () => {
        const service = container.resolve(JiraService)
        await service.getIssuesInDevelopment()
    })

program.parse()
