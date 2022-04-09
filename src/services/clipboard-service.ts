import { injectable, singleton } from 'tsyringe'
import execa from 'execa'

@singleton()
@injectable()
export class ClipboardService {
    async copy(text: string): Promise<void> {
        await execa('pbcopy', {input: text})
    }
}
