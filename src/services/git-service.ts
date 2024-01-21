import { injectable, singleton } from 'tsyringe'
import execa, { ExecaError } from 'execa'

import { executeCommand } from '../util/child-process-util'
import { removeNulls } from '../util/functional'
import { FileService } from './file-service'
import { ConfigService } from './config/config-service'
import { LogService } from './log-service'
import { AppError } from '../util/error'
import { currentBranch, isDescendent, resolveRef } from 'isomorphic-git'
import fs from 'fs'

@singleton()
@injectable()
export class GitService {
    dir: string | null = this.fileService.getGitRepoRootDirectory()

    constructor(
        private fileService: FileService,
        private config: ConfigService,
        private log: LogService,
    ) {
    }

    async getCurrentBranch(): Promise<string> {
        if (!this.dir) throw new AppError('Not in a git repo!')
        const branch = await currentBranch({fs, dir: this.dir})
        return branch!
    }

    async getBaseBranch(branchName: string): Promise<string> {
        if (!this.dir) throw new AppError('Not in a git repo!')
        const child = await resolveRef({fs, dir: this.dir, ref: branchName})

        const possibleBaseBranches = this.config.gitConfig().possibleBaseBranches
        const maybeParents = await Promise.all(possibleBaseBranches.map(async name => {
            const ref = await resolveRef({fs, dir: this.dir!, ref: name})
            const isParent = await isDescendent({fs, dir: this.dir!, oid: child, ancestor: ref})
            return isParent ? name : null
        }))
        const parents = removeNulls(maybeParents)
        if (parents.length > 1) throw new AppError('Expected to find one base branch but found many: ' + parents.join(', '))
        const parent = parents[0]
        if (!parent) throw new AppError('No base branch found!')
        return parent
    }

    async isChildBranchUpToDate(parentBranchName: string, childBranchName: string): Promise<boolean> {
        if (!this.dir) throw new AppError('Not in a git repo!')
        const child = await resolveRef({fs, dir: this.dir, ref: childBranchName})
        await this.fetchBranch(parentBranchName)
        const parent = await resolveRef({fs, dir: this.dir, ref: parentBranchName})
        return await isDescendent({fs, dir: this.dir, oid: child, ancestor: parent})
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
}
