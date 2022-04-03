import { injectable, singleton } from 'tsyringe'
import { prompt } from 'inquirer'
import { FileService } from './file-service'
import { spawnCommand } from '../util/child-process-util'

@singleton()
@injectable()
export class PromptService {
    constructor(private fileService: FileService) {
    }

    async selectOption(options: Option[], message: string): Promise<string | null> {
        const answers = await prompt([{
            type: 'rawlist',
            message,
            name: 'issue',
            choices: options.map(option => ({name: option.description, value: option.id})),
        }])
        return answers['issue']
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