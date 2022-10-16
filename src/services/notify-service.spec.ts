import { container } from 'tsyringe'
import { NotifyService } from './notify-service'

describe('notify service', () => {
    it('should do stuff', async () => {
        const service = container.resolve(NotifyService)
        expect(service).toBeTruthy()
    })
})
