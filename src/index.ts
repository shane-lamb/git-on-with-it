import 'reflect-metadata'
import { Command } from 'commander'
import { container } from 'tsyringe'

import { PromptService } from './services/prompt-service'
import { OpenPr } from './commands/open-pr'
import { JiraService } from './services/jira-service'
import { CreateBranch } from './commands/create-branch'

const program = new Command()

program
    .name('git-on-with-it')
    .description('CLI workflows for git')
    .version('1.0.0')

program.command('open-pr')
    .description('WIP command for opening a PR in GitHub')
    .action(async () => {
        const service = container.resolve(OpenPr)
        await service.execute()
    })

program.command('create-branch')
    .description('WIP command for creating a feature branch based on JIRA ticket')
    .action(async () => {
        const service = container.resolve(CreateBranch)
        await service.execute()
    })

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
