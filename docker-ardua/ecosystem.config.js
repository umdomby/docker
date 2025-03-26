module.exports = {
    apps: [
        {
            name: "next-app",
            script: "yarn",
            args: "start",
            cwd: "/app2",
        },
        {
            name: "server",
            script: "ts-node",
            args: "server.ts",
            cwd: "/app2",
        },
    ],
};