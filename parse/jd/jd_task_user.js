import {Template} from '../../template.js'
import fs from 'fs'
import ini from "ini"

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: "京东用户信息获取",
            userData: true,
            prompt: {
                fileFormat: "js #默认保存为ini文件"
            }
        }
    }

    async main(p) {
        let user = p.data.user
        let s = await this.curl({
            'url': `https://kai.jd.com/client?appId=applet_jpass&body=%257B%257D&functionId=UserExportService.getUserInfo&requestId=0.72076678870461081641259143802&sign=431fa578b3a6c82c50b37ed7e6406973&_s=2&_i=55`,
            user,
            algo: {
                expire: {
                    'data.code': '403'
                }
            }
        })
        if (this.haskey(s, 'data.data')) {
            p.log("数据获取成功...")
            // 当天已经获取到数据了,跳过重复获取
            p.info.work = true
        }
        else {
            p.err("数据获取失败...")
            return
        }
        let {pin, mobile, userName} = s.data.data
        let obj = {...(this.userData[user] || {}), ...{pin, mobile, userName}}
        this.userData[user] = obj
    }

    async done() {
        if (this.userData) {
            // console.log(this.userData)
            if (this.profile.fileFormat === 'js') {
                let text = `export default ${JSON.stringify(this.userData, null, 4)}`
                await fs.writeFileSync(`${this.iniPath}/jdUser.js`, text)
                this.msg("写入jdUser.js")
            }
            else {
                let text = ini.stringify(this.userData)
                await fs.writeFileSync(`${this.iniPath}/jdUser.ini`, text)
                this.msg("写入jdUser.ini")
            }
        }
    }
}
