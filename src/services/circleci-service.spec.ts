import { CircleciService } from './circleci-service'
import { container } from 'tsyringe'

describe('CircleCI service', () => {
    it('should do stuff', async () => {
        const service = container.resolve(CircleciService)
        expect(service).toBeTruthy()
    })
})
