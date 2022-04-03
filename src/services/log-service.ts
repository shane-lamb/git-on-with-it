import { injectable, singleton } from 'tsyringe'
import { ConfigService } from './config-service'

@singleton()
@injectable()
export class LogService {
    enabled: boolean

    constructor(private configService: ConfigService) {
        this.enabled = configService.logOutputEnabled()
    }

    write(text: string) {
        if (this.enabled) {
            console.log(text)
        }
    }
}
