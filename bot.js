import TelegramBot from "node-telegram-bot-api"
import ini from "ini"
import qs from "qs"
import fs from "fs"
import path from 'path';
import SocksProxyAgent from 'socks-proxy-agent'
import {
    fileURLToPath,
    pathToFileURL
} from 'url';
import {
    spawnSync,
    spawn
} from "child_process"

let dirpath = fileURLToPath(
    import.meta.url);
let abspath = path.dirname(dirpath);
let scripts = []
let iniPath = `${abspath}/config/config.ini`
let iniText = fs.readFileSync(iniPath, 'UTF-8')
iniPath = pathToFileURL(iniPath).href
const psyduck = ini.parse(iniText)
const bot = psyduck.bot
let request = {}
let nodePath = '/usr/bin/node'
let nodeList = ['/usr/bin/node', '/usr/local/bin/node']
for (nodePath of nodeList) {
    let d = spawnSync(nodePath, ['-v'], {
        encoding: 'utf-8',
    })
    if (d.output) {
        break
    }
}
if (bot.BOT_PROXY) {
    if (env.BOT_PROXY.toLowerCase().includes("socks")) {
        var agent = new SocksProxyAgent(bot.BOT_PROXY.toLowerCase());
        request.agent = agent
    }
    else {
        request.proxy = bot.BOT_PROXY
    }
}
let dir = fs.readdirSync(`${abspath}/parse`);
dir.forEach(async function(item, index) {
    let stat = fs.lstatSync(`${abspath}/parse/` + item)
    if (stat.isDirectory() === true) {
        for (let script of fs.readdirSync(`${abspath}/parse/${item}`)) {
            let ff = script.match(/jd_task_(\w+)/)
            if (ff) {
                scripts.push(ff[1])
            }
        }
    }
});
//
!(async () => {
    const bots = new TelegramBot(bot.BOT_TOKEN, {
        polling: true,
        request,
    });
    const wait = function(t) {
        return new Promise(e => setTimeout(e, t))
    }
    const sendMessage = async function(id, echo, params = {}, timeout = 0) {
        bots.sendMessage(id, echo, params || {}).then(async (res) => {
            if (timeout) {
                await wait(parseInt(timeout))
                console.log(`删除消息: ${echo}`)
                bots.deleteMessage(res.chat.id, res.message_id)
            }
        });
    }
    bots.on('text', async (msg) => {
        let sm = sendMessage
        let chat = msg.chat
        let from = msg.from
        let id = from.id
        let messageId = msg.message_id
        let chatId = chat.id
        let text = msg.text
        let admin = bot.BOT_ROOT.includes(id.toString())
        if (text.match(/^task\s+\w+_\w+/) && admin) {
            let filename = text.match(/task\s*(\w+)\s*/)[1]
            let argv = text.split(filename)
            let params = []
            if (argv.length>1 && argv[1]) {
                params = argv[1].split(" ")
            }
            let command = spawn(nodePath, [...['main', filename], ...params], {
                encoding: 'utf-8',
            })
            command.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
                if (data.includes("即将运行")) {
                    console.log(`正在运行: ${filename}`)
                    sm(chatId, `正在运行: ${filename}`, '', 3456)
                }
            });
        }
        else if (text.match(/^\w+\s+\w+/)) {
            let tt = text.match(/^(\w+)\s+(\w+)/)
            if (scripts.includes(tt[1]) && admin) {
                let filename = `jd_task_${tt[1]}`;
                let params = tt[2] == 'start' ? [] : ['-custom', tt[2]];
                let command = spawn(nodePath, [...['main', filename], ...params], {
                    encoding: 'utf-8',
                })
                command.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                    if (data.includes("即将运行")) {
                        console.log(`正在运行: ${filename} -custom ${tt[2]}`)
                        sm(chatId, `正在运行: ${filename} -custom ${tt[2]}`, '', 3456)
                    }
                });
            }
        }
    })
})().catch((e) => {
    console.log(e)
}).finally(() => {
});
