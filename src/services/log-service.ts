import { injectable, singleton } from 'tsyringe'
import { ConfigService } from './config/config-service'

@singleton()
@injectable()
export class LogService {
    constructor(private config: ConfigService) {
    }

    write(text: string, props?: object) {
        if (this.config.logOutputEnabled()) {
            console.log(JSON.stringify(text))
            if (props) {
                console.log(JSON.stringify(props, null, 2))
            }
        }
    }
}
