import { exec, spawn } from 'child_process'

export interface CommandResult {
    standardOut: string
    errorOut: string
}

export async function executeCommand(command: string): Promise<CommandResult> {
    return new Promise(resolve => {
        exec(command, (error, stdout, stderr) => {
            resolve({
                standardOut: stdout,
                errorOut: stderr
            })
        })
    })
}

export async function spawnCommand(command: string, args: string[]): Promise<void> {
    return new Promise(resolve => {
        const child = spawn(command, args, { stdio: 'inherit'})
        child.on('exit', () => {
            resolve()
        })
    })
}
