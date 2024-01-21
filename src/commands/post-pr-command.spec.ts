import { PostPrCommand } from './post-pr-command'
import { createMock } from '../test-util/create-mock'
import { GithubService, PrInfo } from '../services/github-service'
import { OsService } from '../services/os-service'
import { GitService } from '../services/git-service'

const githubService = createMock(GithubService)
const osService = createMock(OsService)
const gitService = createMock(GitService)

const command = new PostPrCommand(githubService, osService, gitService)

describe('Posting/communicating a PR', () => {
    describe('given theres a PR associated with the current branch', () => {
        it('should copy PR post to clipboard', async () => {
            const prInfo: Partial<PrInfo> = {
                url: 'https://google.com',
                title: '[ISSUEKEY] My feature'
            }
            githubService.getPrInfo.mockResolvedValue(prInfo as PrInfo)
            gitService.getRepoName.mockResolvedValue('my-repo')

            await command.execute()

            expect(osService.copyToClipboard).toBeCalledWith('`my-repo` [PR for review](https://google.com): My feature')
        })
    })
    describe('given theres not a PR associated with the current branch', () => {
        it('should not copy PR post to clipboard', async () => {
            githubService.getPrInfo.mockResolvedValue(null)

            await command.execute()

            expect(osService.copyToClipboard).toBeCalledTimes(0)
        })
    })
})
