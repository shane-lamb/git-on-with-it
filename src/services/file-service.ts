import { singleton } from 'tsyringe'
import fs from 'fs'
import path from 'path'
import findParentDir from 'find-parent-dir'

@singleton()
export class FileService {
    readFromProjectRoot(filePath: string): string | null {
        const projectRoot = findParentDir.sync(__dirname, 'package.json') as string
        const resolvedPath = path.join(projectRoot, filePath)
        return this.readFile(resolvedPath)
    }

    writeFile(filePath: string, text: string) {
        fs.writeFileSync(filePath, text, 'utf8')
    }

    readFile(filePath: string): string | null {
        try {
            return fs.readFileSync(filePath, 'utf8')
        }
        catch (ex) {
            return null
        }
    }

    getGitRepoRootDirectory(): string | null {
        return findParentDir.sync(process.cwd(), '.git')
    }
}
