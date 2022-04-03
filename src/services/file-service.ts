import { singleton } from 'tsyringe'
import fs from 'fs'
import path from 'path'
import findParentDir from 'find-parent-dir'

@singleton()
export class FileService {
    getProjectRootDirectory(): string {
        return findParentDir.sync(__dirname, 'package.json') as string
    }

    getGitRepoRootDirectory(): string | null {
        return findParentDir.sync(process.cwd(), '.git')
    }

    readFromProjectRoot(...pathParts: string[]): string | null {
        const dir = this.getProjectRootDirectory()
        return this.readFile(...[dir, ...pathParts])
    }

    writeFile(filePath: string, text: string) {
        fs.writeFileSync(filePath, text, 'utf8')
    }

    readFile(...pathParts: string[]): string | null {
        try {
            return fs.readFileSync(path.join(...pathParts), 'utf8')
        }
        catch (ex) {
            return null
        }
    }
}
