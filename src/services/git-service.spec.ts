import { GitService } from './git-service'
import { createMock } from '../test-util/create-mock'
import { ConfigService } from './config/config-service'
import { container } from 'tsyringe'
import { FileService } from './file-service'
import { LogService } from './log-service'
import { executeCommand } from '../util/child-process-util'

const fileService = container.resolve(FileService)
const configService = createMock(ConfigService)
const logService = createMock(LogService)

const service = new GitService(fileService, configService, logService)

describe('Git service', () => {
    it('should correctly determine that we are in a repo', async () => {
        const isRepo = service.isRepo()
        expect(isRepo).toBe(true)
    })

    it('should get repo name', async () => {
        const branchName = await service.getRepoName()
        expect(branchName).toBe('git-on-with-it')
    })

    it('should get project name', async () => {
        const projectName = await service.getGithubProjectName()
        expect(projectName).toBe('shane-lamb')
    })

    it('should get remote url', async () => {
        const remoteUrl = await service.getRemoteUrl()
        expect(remoteUrl).toBe('git@github.com:shane-lamb/git-on-with-it.git')
    })

    test('checkout new branch/get branch name/get base branch', async () => {
        // setup
        configService.gitConfig.mockReturnValue({possibleBaseBranches: ['main']})
        const initialBranchName = await service.getCurrentBranch()

        // create and checkout new branch (test branch)
        await service.createAndCheckoutBranch('checkout-test')
        expect(await service.getCurrentBranch()).toBe('checkout-test')

        // make a commit on the test branch
        await executeCommand('touch test-file')
        await executeCommand('git add test-file')
        await executeCommand('git commit -m "test" test-file')

        // should get base branch
        const baseBranch = await service.getBaseBranch('checkout-test')
        expect(baseBranch).toBe('main')

        // should be up-to-date with base branch
        const isUpToDate = await service.isChildBranchUpToDate(baseBranch, 'checkout-test')
        expect(isUpToDate).toBe(true)

        // teardown
        await executeCommand(`git checkout ${initialBranchName}`)
        await executeCommand('git branch -D checkout-test')
    })
})