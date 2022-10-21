import { injectable, singleton } from 'tsyringe'
import execa from 'execa'

@singleton()
@injectable()
export class OsService {
    async copyToClipboard(text: string): Promise<void> {
        await execa('pbcopy', {input: text})
    }

    async openUrl(url: string): Promise<void> {
        await execa('open', [url])
    }
}
