import { injectable, singleton } from 'tsyringe'
import { ConfigService } from './config-service'

@singleton()
@injectable()
export class LogService {
    enabled: boolean

    constructor(private configService: ConfigService) {
        this.enabled = configService.logOutputEnabled()
    }

    write(text: string, props?: object) {
        if (this.enabled) {
            console.log(JSON.stringify(text))
            if (props) {
                console.log(JSON.stringify(props, null, 2))
            }
        }
    }
}
