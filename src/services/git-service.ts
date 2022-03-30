import { injectable, singleton } from 'tsyringe'
import { Branch, Repository } from 'nodegit'
import { Memoize } from 'typescript-memoize'
import { FileService } from './file-service'

@singleton()
@injectable()
export class GitService {
    constructor(private fileService: FileService) {
    }

    @Memoize()
    private async getRepo(): Promise<Repository> {
        const dir = this.fileService.getGitRepoRootDirectory() as string
        return Repository.open(dir)
    }

    async getCurrentBranchName(): Promise<string> {
        const repo = await this.getRepo()
        const ref = await repo.getCurrentBranch()
        const branchName = ref.name()
        const upstream = await Branch.upstream(ref)
        const upstreamName = upstream.name()
        console.log(JSON.stringify({
            branchName,
            upstreamName,
        }, null, 4))
        return ''
    }
}