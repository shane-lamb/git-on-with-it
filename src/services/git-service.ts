import { injectable, singleton } from 'tsyringe'
import { Commit, Merge, Reference, Repository } from 'nodegit'
import { Memoize } from 'typescript-memoize'
import { FileService } from './file-service'
import { executeCommand } from '../util/child-process-util'
import { ConfigService, GitConfig } from './config-service'
import { maxBy } from 'lodash'
import { LogService } from './log-service'

@singleton()
@injectable()
export class GitService {
    private config: GitConfig

    constructor(
        private fileService: FileService,
        private configService: ConfigService,
        private log: LogService,
    ) {
        this.config = configService.gitConfig()
    }

    async getCurrentBranch(): Promise<string> {
        const repo = await this.getRepo()
        const currentBranch = await repo.getCurrentBranch()
        return currentBranch.shorthand()
    }

    async getBaseBranch(branchName: string): Promise<string> {
        const childBranch = await this.getBranch(branchName)
        if (!childBranch) throw Error('Branch does not exist: ' + branchName)

        const baseBranchesPromises = this.config.possibleBaseBranches
            .map(async name => await this.getBranch(name))
            .filter(maybeBranch => !!maybeBranch)
            .map(async b => {
                const branch = b as unknown as Reference // we've filtered out nulls
                const baseCommit = await this.getBaseCommit(branch, childBranch)
                return {
                    name: branch.shorthand(),
                    parentCount: baseCommit.parentcount(),
                }
            })
        const baseBranches = await Promise.all(baseBranchesPromises)

        const selected = maxBy(baseBranches, b => b.parentCount)
        if (!selected) throw Error('No base branch found!')

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

    async pushToRemote(branchName: string): Promise<void> {
        return executeCommand(`git push --set-upstream origin ${branchName}`)
    }

    private async fetchBranch(branchName: string) {
        return executeCommand(`git fetch origin ${branchName}:${branchName}`)
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
