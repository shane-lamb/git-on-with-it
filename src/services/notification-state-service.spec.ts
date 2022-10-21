import { createMock } from '../test-util/create-mock'
import { NotifyService } from './notify-service'
import { NotificationStateService } from './notification-state-service'
import { when } from 'jest-when'

describe('notification state service', () => {
    const mockNotifyService = createMock(NotifyService)
    let service: NotificationStateService

    beforeEach(() => {
        jest.resetAllMocks()
        service = new NotificationStateService(mockNotifyService)
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

        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, 'GROUP_0')
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
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, 'GROUP_0')

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
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm2' }, 'GROUP_0')

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
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, 'GROUP_0')

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
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, 'GROUP_0')

        when(mockNotifyService.clearNotification)
            .calledWith('GROUP_0')
            .mockResolvedValue()

        await service.setState([])

        expect(mockNotifyService.notify).toBeCalledTimes(1)
        expect(mockNotifyService.clearNotification).toBeCalledWith('GROUP_0')

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

        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, 'GROUP_0')
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm2' }, 'GROUP_1')
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
        expect(mockNotifyService.notify).toBeCalledWith({ message: 'm1' }, 'GROUP_0')

        await closeMessage1!()

        when(mockNotifyService.clearNotification)
            .calledWith('GROUP_0')
            .mockResolvedValue()

        await service.setState([])

        expect(mockNotifyService.notify).toBeCalledTimes(1)
        expect(mockNotifyService.clearNotification).toBeCalledTimes(0)

        await setState1
    })
    it('should display notification again with the same ID, if it was closed inbetween', async () => {
        when(mockNotifyService.notify)
            .mockResolvedValue({ activationType: 'closed' })

        await service.setState([{
            details: {
                message: 'm1',
            },
            id: 'my_id'
        }])

        await service.setState([{
            details: {
                message: 'm2',
            },
            id: 'my_id'
        }])

        expect(mockNotifyService.notify).toBeCalledTimes(2)
    })
})
