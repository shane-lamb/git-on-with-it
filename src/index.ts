import 'reflect-metadata'
import { Command } from 'commander'
import { container } from 'tsyringe'

import { PromptService } from './services/prompt-service'
import { OpenPr } from './commands/open-pr'
import { TextEditorService } from './services/text-editor-service'
import { GitService } from './services/git-service'

const program = new Command()

program
    .name('git-on-with-it')
    .description('CLI workflows for git')
    .version('1.0.0')

program.command('open-pr')
    .description('WIP command for opening a PR in GitHub')
    .action(async () => {
        const service = container.resolve(OpenPr)
        const result = await service.execute()
        const textEditor = container.resolve(TextEditorService)
        const updated = await textEditor.editText(result as string)
        console.log(updated)
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

program.command('test-git-service')
    .description('Temporary command to test GitService')
    .action(async () => {
        const service = container.resolve(GitService)
        const result = await service.getCurrentBranchName()
    })

program.parse()
