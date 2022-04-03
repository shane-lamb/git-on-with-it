import { exec, spawn } from 'child_process'

export async function executeCommand(command: string): Promise<void> {
    return new Promise(resolve => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`)
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`)
            }
            console.log(`stdout: ${stdout}`)
            resolve()
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
