type Processes = {
    name: string
    shutdownFunction: () => Promise<void>
}

const processes: Processes[] = []

export function registerProcessForShutdown(name: string, shutdownFunction: any) {
    processes.push({ name, shutdownFunction })
    console.log(`🆙 Registered process ${name} for graceful-shutdown`)
}


export async function shutdownProcesses() {
    console.log(`🛑 Shutting down processes`)

    for (const process of processes) {
        console.log(`⏳ Now Shutting down process: ${process.name}`)
        await process.shutdownFunction()
        console.log(`✅ Process ${process.name} has been shut down`)
    }

    console.log(`🆗 All processes have been shut down`)
    console.log(`🎉 Gracefully Shut Down Process Compeleted `)
}