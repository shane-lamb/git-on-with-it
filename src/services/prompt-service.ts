import { injectable, singleton } from 'tsyringe'
import { select, input } from '@inquirer/prompts'
import { FileService } from './file-service'
import { spawnCommand } from '../util/child-process-util'

@singleton()
@injectable()
export class PromptService {
    constructor(private fileService: FileService) {
    }

    async selectOption(options: Option[], message: string): Promise<string> {
        return select({
            message,
            choices: options.map(option => ({name: option.description, value: option.id})),
        })
    }

    async enterText(message: string): Promise<string> {
        return input({
            message,
        })
    }

    async editText(text: string): Promise<string> {
        const tempFilePath = '/tmp/git-on-with-it'

        this.fileService.writeFile(tempFilePath, text)

        await spawnCommand(process.env.EDITOR || 'vim', [tempFilePath])

        return this.fileService.readFile(tempFilePath) as string
    }
}

export interface Option {
    id: string
    description: string
}