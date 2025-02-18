import {Template} from '../../template.js'
import {Panel} from "../../util/panel.js";

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东Cookie过期检测',
            userData: true,
            validCookie: true,
            interval: 2000,
            crontab: 24,
            prompt: {
                change: `expired  #只转换过期账户`,
                cache: `1 #如设置temp,当天有转换成功,后续运行将跳过该账号`
            }
        }
    }

    async prepare() {
        if (this.haskey(this.profile, 'change', 'expired')) {
            let expired = await this.getExpire()
            if (expired) {
                this.shareCode({
                    change: 1,
                    task: expired.join("|")
                })
            }
            else {
                this.log("没有过期账户,跳过运行")
                this.jump = 1
            }
        }
    }

    async main(p) {
        let user = p.data.user;
        let pin = p.data.pin
        let context = p.context;
        let s = await this.curl({
                'url': `https://plogin.m.jd.com/cgi-bin/ml/islogin`,
                user,
                algo: {
                    shell: 1,
                }
            }
        )
        if (this.haskey(s, 'islogin', '0')) {
            let userData = this.userData[user] || {}
            if (userData.wskey) {
                for (let i = 0; i<2; i++) {
                    var genToken = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=genToken`,
                            'form': `functionId=genToken&body=%7B%22to%22%3A%223.cn%5C%2F10-${this.rand(100000, 999999)}%22%2C%22sceneid%22%3A%2225%22%2C%22action%22%3A%22to%22%7D&uuid=8885e2e6fc106910&client=apple&clientVersion=15.0.15&st=1739755840783&sv=111&sign=91359115eb2809fd16036088787dee1d`,
                            cookie: `wskey=${userData.wskey};pin=${encodeURIComponent(pin)};`,
                            algo: i == 0 ? {app: true} : {app: true, shell: false},
                            response: 'all',
                            headers: {
                                'x-rp-client': 'ios_4.0.0',
                                'x-httpex-retry': 1,
                                'jd-hybrid-refer': 'Home_Main',
                                'x-referer-package': 'com.360buy.jdmobile'
                            }
                        }
                    )
                    if (this.haskey(genToken, 'content.tokenKey') && genToken.content.tokenKey.slice(0, 2) == 'AA') {
                        break
                    }
                }
                p.log('genToken:', genToken)
                if (this.haskey(genToken, 'content.tokenKey') && genToken.content.tokenKey.slice(0, 2) == 'AA') {
                    let y = await this.curl({
                            'url': `https://un.m.jd.com/cgi-bin/app/appjmp`,
                            form: `tokenKey=${genToken.content.tokenKey}&&lbs={"cityId":"","districtId":"","provinceId":"","districtName":"","lng":"0.000000","provinceName":"","lat":"0.000000","cityName":""}&to=${encodeURIComponent("https://bean.m.jd.com/beanDetail/index.action")}`,
                            response: "all",
                            maxRedirects: 0,
                            scheme: 'http',
                        }
                    )
                    if (y.cookie && y.cookie.includes('app_open')) {
                        this.dict[user] = {cookie: y.cookie}
                        p.log('openKey生成成功');
                        if (this.profile.cache) {
                            p.info.work = true
                        }
                        this.valid(user, true)
                    }
                    else {
                        p.err("openKey获取失败")
                        p.msg("openKey生成失败")
                    }
                }
                else {
                    p.err("tokenKey获取失败")
                    p.msg("openKey生成失败")
                }
            }
            else {
                p.msg("账号过期了呀🐶")
            }
        }
        else if (this.haskey(s, 'islogin', '1')) {
            p.log("账户还未过期")
            this.valid(user, true)
        }
        else {
            p.err("没有获取到数据")
        }
    }

    async done() {
        try {
            if (Object.keys(this.dict).length) {
                let panel = new Panel(this.dict)
                await panel.send()
            }
        } catch (e) {
        }
    }

    eip(str, type = "") {
        const charMap = {
            'A': 'K', 'B': 'L', 'C': 'M', 'D': 'N', 'E': 'O',
            'F': 'P', 'G': 'Q', 'H': 'R', 'I': 'S', 'J': 'T',
            'K': 'A', 'L': 'B', 'M': 'C', 'N': 'D', 'O': 'E',
            'P': 'F', 'Q': 'G', 'R': 'H', 'S': 'I', 'T': 'J',
            'e': 'o', 'f': 'p', 'g': 'q', 'h': 'r', 'i': 's',
            'j': 't', 'k': 'u', 'l': 'v', 'm': 'w', 'n': 'x',
            'o': 'e', 'p': 'f', 'q': 'g', 'r': 'h', 's': 'i',
            't': 'j', 'u': 'k', 'v': 'l', 'w': 'm', 'x': 'n'
        };
        if (type === 'b64encode') {
            const data = typeof str === "object" ? this.dumps(str) : str;
            return Buffer.from(data)
                .toString('base64')
                .split("")
                .map(char => charMap[char] || char)
                .join("");
        }
        const decrypted = str.split("")
            .map(char => charMap[char] || char)
            .join("");
        return this.jsonParse(Buffer.from(decrypted, 'base64').toString());
    }
}

