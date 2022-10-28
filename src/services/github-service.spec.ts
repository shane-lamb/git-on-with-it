import { container } from 'tsyringe'
import { GithubService } from './github-service'

describe('Github service', () => {
    it('should do stuff', async () => {
        const service = container.resolve(GithubService)
        // const user = await service.getUser()
        // const prs = await service.searchOpenPrs(user)
        // const pr = await service.getPrInfo(prs[0].url)
        expect(service).toBeTruthy()
    })
})
