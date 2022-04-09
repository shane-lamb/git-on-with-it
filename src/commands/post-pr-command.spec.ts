import { PostPrCommand } from './post-pr-command'
import { createMock } from '../test-util/create-mock'
import { GithubService } from '../services/github-service'
import { ClipboardService } from '../services/clipboard-service'

const githubService = createMock(GithubService)
const clipboardService = createMock(ClipboardService)

const command = new PostPrCommand(githubService, clipboardService)

describe('Posting/communicating a PR', () => {
    describe('given theres a PR associated with the current branch', () => {
        it('should copy PR post to clipboard', async () => {
            githubService.getPrInfo.mockResolvedValue({
                url: 'https://google.com',
                title: '[ISSUEKEY] My feature'
            })

            await command.execute()

            expect(clipboardService.copy).toBeCalledWith('[PR for review](https://google.com): My feature')
        })
    })
    describe('given theres not a PR associated with the current branch', () => {
        it('should not copy PR post to clipboard', async () => {
            githubService.getPrInfo.mockResolvedValue(null)

            await command.execute()

            expect(clipboardService.copy).toBeCalledTimes(0)
        })
    })
})