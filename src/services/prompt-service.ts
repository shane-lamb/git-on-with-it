import { singleton } from 'tsyringe'
import { prompt } from 'inquirer'

@singleton()
export class PromptService {
    async selectOption(options: Option[], message: string): Promise<string | null> {
        const answers = await prompt([{
            type: 'rawlist',
            message,
            name: 'issue',
            choices: options.map(option => ({ name: option.description, value: option.id }))
        }])
        return answers['issue']
    }
}

export interface Option {
    id: string
    description: string
}