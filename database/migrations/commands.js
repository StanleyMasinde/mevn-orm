const { exec } = require('child_process')
const yargs = require('yargs')
const chalk = require("chalk");
const boxen = require("boxen");

const options = yargs
    .scriptName('Commander')
    .usage("Usage: Command")
    .command({
        command: 'migrate',
        aliases: [],
        desc: 'Run database migrations',
        handler: async () => {
            exec('npm run production', (error, out, stderr) => {
                console.log(chalk.greenBright(out));
                console.log(stderr);
                if (error !== null) {
                    console.log(`exec error: ${error}`);
                }
            })


        }
    })
    .command({
        command: 'migrate:fresh',
        aliases: [],
        desc: 'Drop all tables and migrate again',
        builder: (yargs) => yargs.default('value', 'true'),
        handler: (argv) => {
            console.log(`setting ${argv.key} to ${argv.value}`)
        }
    })
    .command({
        command: 'make:migration',
        aliases: [],
        desc: 'Create a new migration file',
        builder: (yargs) => yargs.default('value', 'true'),
        handler: (argv) => {
            console.log(`setting ${argv.key} to ${argv.value}`)
        }
    })
    .argv;

module.exports 
