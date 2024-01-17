import { injectable, singleton } from 'tsyringe'
import { Commit, Merge, Reference, Repository } from 'nodegit'
import { Memoize } from 'typescript-memoize'
import { maxBy } from 'lodash'
import execa, { ExecaError } from 'execa'

import { executeCommand } from '../util/child-process-util'
import { asyncMap, removeNulls } from '../util/functional'
import { FileService } from './file-service'
import { ConfigService } from './config/config-service'
import { LogService } from './log-service'
import { AppError } from '../util/error'

@singleton()
@injectable()
export class GitService {
    constructor(
        private fileService: FileService,
        private config: ConfigService,
        private log: LogService,
    ) {
    }

    async getCurrentBranch(): Promise<string> {
        const repo = await this.getRepo()
        const currentBranch = await repo.getCurrentBranch()
        return currentBranch.shorthand()
    }

    async getBaseBranch(branchName: string): Promise<string> {
        const childBranch = await this.getBranch(branchName)
        if (!childBranch) throw new AppError('Branch does not exist: ' + branchName)

        const possibleBaseBranches = this.config.gitConfig().possibleBaseBranches
        this.log.write('Checking possible base branches to find nearest one', {possibleBaseBranches})
        const branches = await asyncMap(possibleBaseBranches, name => this.getBranch(name))
        const baseBranches = removeNulls(branches)
        const withCount = await asyncMap(baseBranches, async branch => {
            const baseCommit = await this.getBaseCommit(branch, childBranch)
            return {
                name: branch.shorthand(),
                parentCount: baseCommit.parentcount(),
            }
        })

        const selected = maxBy(withCount, b => b.parentCount)
        if (!selected) throw new AppError('No base branch found!')

        return selected.name
    }

    async isChildBranchUpToDate(parentBranchName: string, childBranchName: string): Promise<boolean> {
        const repo = await this.getRepo()
        await this.fetchBranch(parentBranchName)

        const parentBranch = await this.getBranch(parentBranchName) as Reference
        const childBranch = await this.getBranch(childBranchName) as Reference

        const baseCommit = await this.getBaseCommit(parentBranch, childBranch)
        const latestParentCommit = await repo.getBranchCommit(parentBranch)
        return baseCommit.parentcount() === latestParentCommit.parentcount()
    }

    async createAndCheckoutBranch(branchName: string): Promise<void> {
        try {
            await execa('git', ['checkout', '-b', branchName])
        } catch (error: any) {
            const execaError = error as ExecaError
            if (execaError.stderr) {
                throw new AppError(execaError.stderr)
            }
            throw error
        }
    }

    async pushToRemote(branchName: string): Promise<void> {
        await executeCommand(`git push --set-upstream origin ${branchName}`)
    }

    async getRemoteUrl(): Promise<string> {
        const result = await execa('git', ['ls-remote', '--get-url'])
        return result.stdout
    }

    async getRepoName(): Promise<string> {
        const url = await this.getRemoteUrl()
        const parts = url.split('/')
        return parts[parts.length - 1].replace('.git', '')
    }

    async getGithubProjectName(): Promise<string> {
        const url = await this.getRemoteUrl()
        let parts = url.split(':')
        const lastPart = parts[parts.length - 1]
        parts = lastPart.split('/')
        return parts[0].replace('.git', '')
    }

    async fetchBranch(branchName: string) {
        await executeCommand(`git fetch --update-head-ok origin ${branchName}:${branchName}`)
    }

    isRepo(): boolean {
        const dir = this.fileService.getGitRepoRootDirectory()
        return dir !== null
    }

    @Memoize()
    private async getRepo(): Promise<Repository> {
        const dir = this.fileService.getGitRepoRootDirectory() as string
        return Repository.open(dir)
    }

    private async getBranch(name: string): Promise<Reference | null> {
        const repo = await this.getRepo()
        try {
            return await repo.getBranch(name)
        } catch (ex) {
            // [Error: no reference found for shorthand 'branch-name-here'] {
            //     errno: -3,
            //     errorFunction: 'Reference.dwim'
            // }
            if (ex.errno === -3) return null
            throw ex
        }
    }

    private async getBaseCommit(branch1: Reference, branch2: Reference): Promise<Commit> {
        const repo = await this.getRepo()
        const b1Commit = await repo.getBranchCommit(branch1)
        const b2Commit = await repo.getBranchCommit(branch2)
        const baseId = await Merge.base(repo, b1Commit.id(), b2Commit.id())
        return repo.getCommit(baseId)
    }
}
