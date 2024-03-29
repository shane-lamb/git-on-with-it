import { createMock } from '../test-util/create-mock'
import { NotifyService } from './notify-service'
import { NotificationStateService } from './notification-state-service'
import { when } from 'jest-when'

describe('notification state service', () => {
    const mockNotifyService = createMock(NotifyService)
    let service: NotificationStateService
    let baseGroupId: string

    beforeEach(() => {
        jest.resetAllMocks()
        service = new NotificationStateService(mockNotifyService)
        baseGroupId = service.baseGroupId
    })

    it('should display notification and call handler when actioned', async () => {
        when(mockNotifyService.notify)
            .mockResolvedValue({activationType: 'closed'})

        let handlerCalled = false
        await service.setState([{
            details: {
                message: 'm1',
            },
            handler: async (result) => {
                expect(result).toEqual({activationType: 'closed'})
                handlerCalled = true
            }
        }])

        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, baseGroupId + 0)
        expect(handlerCalled).toBeTruthy()
    })
    it('should replace notification when not using ID', async () => {
        let closeMessage1: () => void
        when(mockNotifyService.notify)
            .mockReturnValue(new Promise(resolve => {
                closeMessage1 = () => resolve({ activationType: 'closed' })
            }))

        const setState1 = service.setState([{
            details: {
                message: 'm1',
            }
        }])

        expect(mockNotifyService.notify).toBeCalledTimes(1)
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, baseGroupId + 0)

        when(mockNotifyService.notify)
            .mockImplementation(async _ => {
                closeMessage1()
                return {activationType: 'closed'}
            })

        await service.setState([{
            details: {
                message: 'm2',
            }
        }])

        expect(mockNotifyService.notify).toBeCalledTimes(2)
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm2' }, baseGroupId + 0)

        await setState1
    })
    it('should not replace notification when ID is the same', async () => {
        let closeMessage1: () => void

        when(mockNotifyService.notify)
            .mockReturnValue(new Promise(resolve => {
                closeMessage1 = () => resolve({ activationType: 'closed' })
            }))

        const setState1 = service.setState([{
            details: {
                message: 'm1',
            },
            id: 'my_id'
        }])

        expect(mockNotifyService.notify).toBeCalledTimes(1)
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, baseGroupId + 0)

        when(mockNotifyService.notify)
            .mockImplementation(async _ => {
                closeMessage1()
                return {activationType: 'closed'}
            })

        await service.setState([{
            details: {
                message: 'm2',
            },
            id: 'my_id'
        }])

        expect(mockNotifyService.notify).toBeCalledTimes(1)

        closeMessage1!()
        await setState1
    })
    it.each([
        ['without ID', undefined],
        ['with ID', 'my_id']
    ])('should clear notification when removed from state - %s', async (_, id) => {
        let closeMessage1: () => void

        when(mockNotifyService.notify)
            .mockReturnValue(new Promise(resolve => {
                closeMessage1 = () => resolve({ activationType: 'closed' })
            }))

        const setState1 = service.setState([{
            details: {
                message: 'm1',
            },
            id
        }])

        expect(mockNotifyService.notify).toBeCalledTimes(1)
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, baseGroupId + 0)

        when(mockNotifyService.clearNotification)
            .calledWith(baseGroupId + 0)
            .mockResolvedValue()

        await service.setState([])

        expect(mockNotifyService.notify).toBeCalledTimes(1)
        expect(mockNotifyService.clearNotification).toBeCalledWith(baseGroupId + 0)

        await closeMessage1!()
        await setState1
    })
    it('should display multiple notifications', async () => {
        when(mockNotifyService.notify)
            .mockResolvedValue({activationType: 'closed'})

        await service.setState([{
            details: {
                message: 'm1',
            },
        }, {
            details: {
                message: 'm2'
            }
        }])

        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, baseGroupId + 0)
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm2' }, baseGroupId + 1)
    })
    it.each([
        ['without ID', undefined],
        ['with ID', 'my_id']
    ])('should not clear notification if it was already closed (by something external) - %s', async (_, id) => {
        let closeMessage1: () => void

        when(mockNotifyService.notify)
            .mockReturnValue(new Promise(resolve => {
                closeMessage1 = () => resolve({ activationType: 'closed' })
            }))

        const setState1 = service.setState([{
            details: {
                message: 'm1',
            },
            id
        }])

        expect(mockNotifyService.notify).toBeCalledTimes(1)
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, baseGroupId + 0)

        await closeMessage1!()

        when(mockNotifyService.clearNotification)
            .calledWith(baseGroupId + 0)
            .mockResolvedValue()

        await service.setState([])

        expect(mockNotifyService.notify).toBeCalledTimes(1)
        expect(mockNotifyService.clearNotification).toBeCalledTimes(0)

        await setState1
    })
    it('should display notification again with the same ID, if it was cleared from state inbetween', async () => {
        when(mockNotifyService.notify)
            .mockResolvedValue({ activationType: 'closed' })

        await service.setState([{
            details: {
                message: 'm1',
            },
            id: 'my_id'
        }])

        // cleared from state inbetween
        await service.setState([])

        await service.setState([{
            details: {
                message: 'm2',
            },
            id: 'my_id'
        }])

        expect(mockNotifyService.notify).toBeCalledTimes(2)
    })
    it('should not re-open notification (having same ID) after being dismissed (and not yet cleared from state)', async () => {
        // notifications are dismissed immediately
        when(mockNotifyService.notify)
            .mockResolvedValue({activationType: 'closed'})

        // given a notification is created,
        await service.setState([{
            details: {
                message: 'm1',
            },
            id: 'my_id'
        }])
        // then dismissed,
        // then a notification with the same ID is included in the next call to setState,
        await service.setState([{
            details: {
                message: 'm2',
            },
            id: 'my_id'
        }])

        // we shouldn't open a new notification for this ID, since it's been dismissed already
        expect(mockNotifyService.notify).toBeCalledTimes(1)
    })
})
