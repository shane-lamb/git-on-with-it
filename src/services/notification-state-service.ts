import { injectable } from 'tsyringe'
import { NotificationDetails, NotificationResult, NotifyService } from './notify-service'
import { without, keyBy, mapValues, remove } from 'lodash'

export interface Notification {
    details: NotificationDetails,
    id?: string,
    handler?: (result: NotificationResult) => Promise<void>
}

@injectable()
export class NotificationStateService {
    constructor(private notifyService: NotifyService) {
    }

    notificationIds: {[id: string]: number} = {}
    unattachedGroupIds: number[] = []

    private getAllGroupIds() {
        return this.unattachedGroupIds.concat(Object.values(this.notificationIds))
    }

    private getNextGroupId(messageId?: string): number {
        const allExisting = this.getAllGroupIds()
        let x = 0
        while (allExisting.includes(x)) {
            x++
        }
        if (messageId) {
            this.notificationIds[messageId] = x
        } else {
            this.unattachedGroupIds.push(x)
        }
        return x
    }

    async setState(notifications: Notification[]): Promise<void> {
        const oldGroupIds = this.getAllGroupIds()
        const stuckNotifications = notifications.filter(({id}) => id && this.notificationIds[id] !== undefined)
        const newNotifications = without(notifications, ...stuckNotifications)

        // clear state
        this.notificationIds = mapValues(
           keyBy(stuckNotifications, ({id}) => id!),
            ({id}) => this.notificationIds[id!]
        )
        this.unattachedGroupIds = []

        const toCreate = newNotifications.map(({id, details, handler}) => {
            const groupId = this.getNextGroupId(id)
            return this.notifyService.notify(details, 'GROUP_' + groupId)
                .then(async (result: NotificationResult) => {
                    if (handler) {
                        await handler(result)
                    }
                    if (id) {
                        delete this.notificationIds[id]
                    } else {
                        this.unattachedGroupIds = remove(this.unattachedGroupIds, groupId)
                    }
                })
        })

        // work out what to delete
        const newGroupIds = this.getAllGroupIds()
        const toDelete = without(oldGroupIds, ...newGroupIds)
            .map(id => this.notifyService.clearNotification('GROUP_' + id))

        await Promise.all([...toCreate, ...toDelete])
    }
}
