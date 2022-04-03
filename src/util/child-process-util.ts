import { exec, spawn } from 'child_process'
import { Promise } from 'nodegit'

export function executeCommand(command: string): Promise<void> {
    return new Promise((resolve) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`)
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`)
                return;
            }
            console.log(`stdout: ${stdout}`)
            resolve()
        })
    })
}

export function spawnCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve) => {
        const child = spawn(command, args, { stdio: 'inherit'})
        child.on('exit', () => {
            resolve()
        })
    })
}
