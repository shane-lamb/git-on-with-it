import { injectable, singleton } from 'tsyringe'
import execa from 'execa'
import { ConfigService } from './config/config-service'

export interface NotificationResult {
    activationType: 'actionClicked' | 'closed' | 'timeout' | 'contentsClicked',
    activationValue?: ''
}

export interface NotificationDetails {
    title?: string
    message: string
    action?: string
    timeoutSeconds?: number
}

@singleton()
@injectable()
export class NotifyService {
    constructor(private config: ConfigService) {
    }

    async notify({title, message, action, timeoutSeconds}: NotificationDetails, groupId?: string): Promise<NotificationResult> {
        const { senderApp } = this.config.notificationConfig()
        const result = await execa('alerter', [
            ...(title ? ['-title', title] : []),
            '-message', message,
            // could use closeLabel as a safe way to add a dropdown and second action option
            // '-closeLabel', 'another dropdown option',
            '-sender', senderApp,
            ...(timeoutSeconds ? ['-timeout', timeoutSeconds.toString()] : []),
            ...(action ? ['-actions', action] : []),
            ...(groupId ? ['-group', groupId] : []),
            '-ignoreDnD',
            '-json'
        ])
        return JSON.parse(result.stdout)
    }

    async clearNotification(groupId: string) {
        await this.notify({
            title: 'Removed',
            message: '',
            timeoutSeconds: 1,
        }, groupId)
    }
}
