import { injectable, singleton } from 'tsyringe'
import execa from 'execa'
import { ConfigService } from './config/config-service'

export interface NotificationResponse {
    activationType: 'actionClicked' | 'closed' | 'timeout' | 'contentsClicked',
    activationValue?: ''
}

@singleton()
@injectable()
export class NotifyService {
    constructor(private config: ConfigService) {
    }

    async notify(subtitle: string, message: string, action?: string, timeoutSeconds?: number, groupId?: string): Promise<NotificationResponse> {
        const { senderApp } = this.config.notificationConfig()
        const result = await execa('alerter', [
            '-title', 'git-on-with-it',
            '-subtitle', subtitle,
            '-message', message,
            // could use closeLabel as a safe way to add a dropdown and second action option
            // '-closeLabel', 'another dropdown option',
            '-sender', senderApp,
            ...(timeoutSeconds ? ['-timeout', timeoutSeconds.toString()] : []),
            ...(action ? ['-actions', action] : []),
            ...(groupId ? ['-group', groupId] : []),
            '-ignoreDnD',
            '-json'
        ],)
        return JSON.parse(result.stdout)
    }
}
