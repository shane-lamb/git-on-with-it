import child_process from 'child_process'
import { singleton } from 'tsyringe'
import { FileService } from './file-service'

@singleton()
export class TextEditorService {
    constructor(private fileService: FileService) {
    }

    async editText(text: string): Promise<string> {
        const tempFilePath = '/tmp/git-on-with-it'
        this.fileService.writeFile(tempFilePath, text)

        const editor = process.env.EDITOR || 'vim';
        const child = child_process.spawn(editor, [tempFilePath], {
            stdio: 'inherit'
        })

        return new Promise((resolve, reject) => {
            child.on('exit', () => {
                const updatedText = this.fileService.readFile(tempFilePath) as string
                resolve(updatedText)
            })
        })
    }
}
