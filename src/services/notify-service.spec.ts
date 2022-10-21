import { container } from 'tsyringe'
import { NotifyService } from './notify-service'

describe('notify service', () => {
    it('should do stuff', async () => {
        const service = container.resolve(NotifyService)
        // const result = await service.notify({
        //     subtitle: 'subtitle',
        //     message: 'message',
        // })
        expect(service).toBeTruthy()
    })
})
