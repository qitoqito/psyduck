import fs from 'fs'
import path from 'path';
import {
    fileURLToPath
} from 'url';
import ini from 'ini'
import axios from "axios";
import {decryptFile} from "./fileCrypto.js";

class Ql {
    constructor() {
        console.log(`Readme: 请先初始化config.ini,打开qitoqito_psyduck/config文件夹,将demo.ini重命名为config.ini\n        设置QINGLONG_ClientId和QINGLONG_ClientSecret(前面;符号要去掉才能正常解析)\n        如需使用脚本分身,请先自行创建分类ini\n        以京东为例,在指定的iniPath目录(默认qitoqito_psyduck/config)自行创建jd.ini\n\n        [jd_checkCookie]\n        map=jd_task_checkCookie\n        ;title=自定义脚本名\n        ;crontab=自定义定时(6 6 6 6 6)\n\n        将上述节点代码复制到jd.ini,jd_checkCookie就能映射到jd_task_checkCookie脚本\n`)
        const dirpath = fileURLToPath(
            import.meta.url);
        const abspath = path.dirname(dirpath)
        let iniText = fs.readFileSync(`${abspath}/config/config.ini`, 'UTF-8')
        let obj = ini.parse(iniText)
        this.panelJson = JSON.parse(fs.readFileSync(`${abspath}/config/panel.json`, 'UTF-8'))
        this.env = obj.env
        if (this.env.QINGLONG_ClientId) {
            this.config = {
                baseURL: this.env.QINGLONG_BaseUrl || 'http://127.0.0.1:5700',
                clientId: this.env.QINGLONG_ClientId,
                clientSecret: this.env.QINGLONG_ClientSecret
            };
        }
        else {
            this.config = null
        }
        this.token = null
    }

    // 获取 token
    async getToken() {
        try {
            const response = await axios.get(`${this.config.baseURL}/open/auth/token`, {
                params: {
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret
                }
            });
            this.token = response.data.data.token;
            return this.token;
        } catch (error) {
            console.error('[Error] 获取qinglong token失败', error);
            throw error;
        }
    }

    async setEnvs(data) {
        const token = this.token
        try {
            const response = await axios.put(`${this.config.baseURL}/open/envs`, data, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('[Error] 更新环境变量失败:', error);
        }
    }

    // 获取环境变量
    async getEnvs(search = null) {
        const token = this.token
        try {
            const response = await axios.get(`${this.config.baseURL}/open/envs?searchValue=${search}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.data;
        } catch (error) {
            console.error('[Error] 获取qinglong环境变量失败:', error);
            throw error;
        }
    }

    // 添加环境变量
    async addEnv(name, value, remarks = '') {
        const token = this.token
        try {
            const response = await axios.post(`${this.config.baseURL}/open/envs`, [{
                name,
                value,
                remarks
            }], {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('[Error] 添加qinglong环境变量失败');
            throw error;
        }
    }

    // 删除环境变量
    async deleteEnv(envId) {
        const token = this.token
        try {
            const response = await axios.delete(`${this.config.baseURL}/open/envs`, {
                data: [envId],
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('[Error] 删除qinglong环境变量失败');
            throw error;
        }
    }

    // 获取定时任务列表
    async getCrons() {
        const token = this.token
        try {
            const response = await axios.get(`${this.config.baseURL}/open/crons`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.data;
        } catch (error) {
            console.error('[Error] 获取qinglong定时任务失败');
            throw error;
        }
    }

    // 运行任务
    async runCrons(cronIds) {
        const token = this.token
        try {
            const response = await axios.put(`${this.config.baseURL}/open/crons/run`, cronIds, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('[Error] 运行qinglong任务失败');
            throw error;
        }
    }

    // 获取任务日志
    async getCronLogs(cronId) {
        const token = this.token
        try {
            const response = await axios.get(`${this.config.baseURL}/open/crons/${cronId}/log`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.data;
        } catch (error) {
            console.error('获取任务日志失败:', error);
            throw error;
        }
    }

    async addCron(command) {
        const token = this.token
        try {
            const response = await axios.post(`${this.config.baseURL}/open/crons`, command, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('[Error] 创建定时任务失败:', error);
            throw error;
        }
    }

    async delCron(command) {
        const token = this.token
        try {
            const response = await axios.delete(`${this.config.baseURL}/open/crons`, {
                data: [command.id || command._id],
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('[Error] 删除定时任务失败:', error);
            throw error;
        }
    }

    async wait(t) {
        return new Promise(e => setTimeout(e, t))
    }

    async create() {
        if (!this.config) {
            console.log("请先初始化config.ini,并设置青龙ClientID和ClientSecret")
            return
        }
        await this.getToken()
        let dirpath = fileURLToPath(
            import.meta.url);
        let abspath = path.dirname(dirpath)
        let iniPath = this.env.iniPath || `${abspath}/config`
        let crons = await this.getCrons()
        let data = {}
        let cronData = crons.data || crons
        let label = crons.data ? true : false
        for (let i of cronData) {
            let command = i.command.match(/task\s*qitoqito_psyduck\/(\w+\.js)/)
            if (command) {
                let script = command[1]
                data[script] = {
                    name: i.name,
                    schedule: i.schedule,
                    id: i.id,
                    command: i.command
                }
            }
        }
        let dicts = {}
        let dir = fs.readdirSync(`${abspath}/parse`);
        let panelJson = this.panelJson
        let fileList = []
        dir.forEach(async function(item, index) {
            let config = panelJson.script[item] || {}
            let delList = config.delete || []

            let stat = fs.lstatSync(`${abspath}/parse/` + item)
            if (stat.isDirectory() === true) {
                for (let script of fs.readdirSync(`${abspath}/parse/${item}`)) {
                    if (script.match(/\w+\_\w+\_\w/)) {
                        fileList.push(`${abspath}/parse/${item}/${script}`)
                    }
                }
            }
        }.bind(this))
        await this.wait(1000)
        for (let filePath of fileList) {
            await decryptFile(filePath, filePath)
        }
        dir.forEach(async function(item, index) {
            let config = panelJson.script[item] || {}
            let delList = config.delete || []
            let rmList=config.remove || []
            let stat = fs.lstatSync(`${abspath}/parse/` + item)
            if (stat.isDirectory() === true) {
                if (fs.existsSync(`${iniPath}/${item}.ini`)) {
                    let iniText = fs.readFileSync(`${iniPath}/${item}.ini`, 'UTF-8')
                    let obj = ini.parse(iniText)
                    for (let filename in obj) {
                        if (obj[filename].map) {
                            let map = obj[filename].map
                            try {
                                let imp = await import (`${abspath}/parse/${item}/${map}.js`)
                                let psyDuck = new imp.Main()
                                psyDuck.env.delayTo = this.env.delayTo || null
                                let crontab = obj[filename].crontab || psyDuck.crontab()
                                let title = obj[filename].title || `${psyDuck.profile.title}分身`
                                let code = `
import path from 'path';
import {fileURLToPath, pathToFileURL} from 'url';
!(async () => {
    let dirpath = fileURLToPath(import.meta.url).replace('.swap','');
    let abspath = path.dirname(dirpath)
    let filename = dirpath.match(/(\\w+)\\.js/)[1]
    let type = filename.split('_')[0]
    if (['js', 'jx', 'jr', 'jw'].includes(type)) {
        type = 'jd'
    }
    let length = process.argv.length
    let params = {
        filename: "${map}",
        mapping: filename,
        title: "${title}",
    }
    if (length > 2) {
        for (let i = 2; i < length; i++) {
            let key = process.argv[i].match(/^-\\w+$/)
            if (key) {
                params[key[0].substr(1)] = process.argv[i + 1]
            }
        }
    }
    let jsPath = pathToFileURL(\`\${abspath}/parse/\${type}/${map}.js\`).href
    let psyDuck = await import (jsPath)
    let main = new psyDuck.Main()
    await main.init(params)
})().catch((e) => {
    if (e == 'End') {
        console.log("End")
    }else{
        console.log(e)
    }
    process.exit()
})`
                                fs.writeFile(`${abspath}/${filename}.js`, code, function(err, data) {
                                    if (err) {
                                        throw err;
                                    }
                                    console.log(`🐯‍❄️ 写入成功: ${filename}.js`)
                                })
                                if (!data[`${filename}.js`]) {
                                    dicts[`${filename}.js`] = {
                                        name: `PsyDuck_${title}`,
                                        schedule: crontab,
                                        command: `task qitoqito_psyduck/${filename}.js`,
                                        // labels: label ? [`PsyDuck`] : ''
                                    }
                                    if (label) {
                                        dicts[`${filename}.js`].labels = [`PsyDuck`]
                                    }
                                }
                            } catch (e) {
                                console.log(e)
                            }
                        }
                    }
                }
                for (let script of fs.readdirSync(`${abspath}/parse/${item}`)) {
                    if (delList.includes(script)) {
                        for (let obj of cronData) {
                            if (obj.command.includes(script)) {
                                console.log(`🦊🐼 删除任务:`, script)
                                await this.delCron(obj)
                            }
                        }
                    }
                     else if(rmList.includes(script)){
                        for (let obj of cronData) {
                            if (obj.command.includes(script)) {
                                console.log(`🦊🐼 删除任务:`, script)
                                await this.delCron(obj)
                            }
                        }
                        fs.unlink(`${abspath}/parse/${item}/${script}`, (err) => {
                            if (err) {
                                // console.error('删除文件时发生错误:', err);
                                return;
                            }
                            console.log('🐼🦊 文件删除:',script);
                        });
                        fs.unlink(`${abspath}/${script}`, (err) => {
                            if (err) {
                                // console.error('删除文件时发生错误:', err);
                                return;
                            }
                            console.log('🐼🦊 文件删除:',script);
                        });
                    }
                    else {
                        try {
                            if (script.match(/\w+\_\w+\_\w/)) {
                                let imp = await
                                    import (`${abspath}/parse/${item}/${script}`)
                                let psyDuck = new imp.Main()
                                psyDuck.env.delayTo = this.env.delayTo || null
                                let crontab = psyDuck.crontab()
                                let code = `
import path from 'path';
import {fileURLToPath, pathToFileURL} from 'url';
!(async () => {
    let dirpath = fileURLToPath(import.meta.url).replace('.swap','');
    let abspath = path.dirname(dirpath)
    let filename = dirpath.match(/(\\w+)\\.js/)[1]
    let type = filename.split('_')[0]
    if (['js', 'jx', 'jr', 'jw'].includes(type)) {
        type = 'jd'
    }
    let length = process.argv.length
    let params = {
        filename
    }
    if (length > 2) {
        for (let i = 2; i < length; i++) {
            let key = process.argv[i].match(/^-\\w+$/)
            if (key) {
                params[key[0].substr(1)] = process.argv[i + 1]
            }
        }
    }
    let jsPath = pathToFileURL(\`\${abspath}/parse/\${type}/\${filename}.js\`).href
    let psyDuck = await import (jsPath)
    let main = new psyDuck.Main()
    await main.init(params)
})().catch((e) => {
    if (e == 'End') {
        console.log("End")
    }else{
        console.log(e)
    }
    process.exit()
})`
                                fs.writeFile(`${abspath}/${script}`, code, function(err, data) {
                                    if (err) {
                                        throw err;
                                    }
                                    console.log(`🐯‍❄️ 写入成功: ${script}`)
                                })
                                if (!data[script]) {
                                    dicts[script] = {
                                        name: `PsyDuck_${psyDuck.profile.title}`,
                                        schedule: crontab,
                                        command: `task qitoqito_psyduck/${script}`,
                                        // labels: label ? [`PsyDuck`] : ''
                                    }
                                    if (label) {
                                        dicts[script].labels = [`PsyDuck`]
                                    }
                                }
                            }
                        } catch (e) {
                            console.log(`🐽🐽️ 写入失败: ${script}`)
                        }
                    }
                }
            }
        }.bind(this))
        await this.wait(10000)
        let commands = Object.values(dicts)
        for (let i in dicts) {
            try {
                let add = await this.addCron(dicts[i])
                if (add.data.name) {
                    console.log('🐯‍❄️ 任务添加成功: ', i)
                }
            } catch (e) {
                console.log('🐽🐽️ 任务添加失败: ', i)
            }
        }
    }
}

let qinglong = new Ql()
qinglong.create()
