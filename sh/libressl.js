import {spawnSync, execSync} from "child_process"
import fs from 'fs'

let curlPath = fs.existsSync('/opt/psyduck/curl/bin/psyduck-curl') ? '/opt/psyduck/curl/bin/psyduck-curl' : 'curl'
let result = spawnSync(curlPath, ['--version'], {
    encoding: 'utf-8',
});
console.log("当前测试curl路径:", curlPath)
if (result.stdout.toString().includes('LibreSSL')) {
    console.log("已安装LibreSSL")
    console.log(`请在config.ini处添加: curlPath=${curlPath}`)
}
else {
    console.log("暂未安装LibreSSL")
}
console.log(result.stdout.toString())

