import fs from 'fs'
import path from 'path';
import {fileURLToPath, pathToFileURL} from 'url';
import ini from 'ini'

let filename;
let params = {}
let length = process.argv.length
if (length>2) {
    filename = process.argv[2].split('.')[0]
    params.filename = filename
    if (length>3) {
        for (let i = 3; i<length; i++) {
            let key = process.argv[i].match(/^-\w+$/)
            if (key) {
                params[key[0].substr(1)] = process.argv[i + 1]
            }
        }
    }
}
!(async () => {
    const dirpath = fileURLToPath(import.meta.url);
    const abspath = path.dirname(dirpath)
    let length = process.argv.length
    if (filename) {
        let type = filename.match(/(^[A-Za-z0-9]+)\_/)[1]
        try {
            let jsPath = pathToFileURL(`./parse/${type}/${filename}.js`).href
            let psyDuck = await import(jsPath)
            let main = new psyDuck.Main()
            await main.init(params)
        } catch (e) {
            if (e == 'End') {
                console.log("End")
            }
            else {
                let iniText = fs.readFileSync(`config/config.ini`, 'UTF-8')
                let config = ini.parse(iniText)
                let iniPath = `config/${type}.ini`
                if (config.env && config.env.iniPath) {
                    iniPath = `${config.env.iniPath}/${type}.ini`
                }
                let scText = fs.readFileSync(iniPath, 'UTF-8')
                let script = ini.parse(scText)
                let map = ''
                for (let i in script) {
                    if (i == filename && script[i].map) {
                        map = script[i].map
                    }
                }
                if (map) {
                    params.mapping = map
                    let jsPath = pathToFileURL(`./parse/${type}/${map}.js`).href
                    let psyDuck = await import(jsPath)
                    let main = new psyDuck.Main()
                    await main.init(params)
                }
                else {
                    console.log("没有可执行的脚本")
                }
            }
            process.exit()
        }
    }
})().catch((e) => {
    console.log(e)
}).finally(() => {
});
