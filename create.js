import {decryptFile} from "./fileCrypto.js";
import fs from 'fs'
import path from 'path';
import {
    fileURLToPath
} from 'url';

!(async () => {
    let dirpath = fileURLToPath(
        import.meta.url);
    let abspath = path.dirname(dirpath)
    let dir = fs.readdirSync(`${abspath}/parse`);
    dir.forEach(async function(item, index) {
        let stat = fs.lstatSync(`${abspath}/parse/` + item)
        if (stat.isDirectory() === true) {
            for (let script of fs.readdirSync(`${abspath}/parse/${item}`)) {
                if (script.match(/\w+\_\w+\_\w/)) {
                    await decryptFile(`${abspath}/parse/${item}/${script}`, `${abspath}/parse/${item}/${script}`)
                }
            }
        }
    })
})().catch((e) => {
    console.log(e)
}).finally(() => {
});
