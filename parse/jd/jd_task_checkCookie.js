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
                change: `expired  #只转换过期账户`
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
                let genToken = await this.curl({
                        url: 'https://api.m.jd.com/client.action',
                        form: 'functionId=genToken&body=%7B%22to%22%3A%22https%3A%2F%2Fbean.m.jd.com%2FbeanDetail%2Findex.action%22%2C%22action%22%3A%22to%22%7D&uuid=487f7b22f68312d2c1bbc93b1a&client=apple&clientVersion=10.10.0',
                        cookie: `wskey=${userData.wskey};pin=${encodeURIComponent(pin)};`,
                        algo: {app: true},
                        response: 'all',
                        headers: {
                            'j-e-c': encodeURIComponent(this.dumps({
                                "hdid": "JM9F1ywUPwflvMIpYPok0tt5k9kW4ArJEU3lfLhxBqw=",
                                "ts": new Date().getTime(),
                                "ridx": -1,
                                "cipher": {"pin": this.eip(user, 'b64encode')},
                                "ciphertype": 5,
                                "version": "1.2.0",
                                "appname": "com.jingdong.app.mall"
                            })),
                            'j-e-h': encodeURIComponent(this.dumps({
                                "hdid": "JM9F1ywUPwflvMIpYPok0tt5k9kW4ArJEU3lfLhxBqw=",
                                "ts": new Date().getTime(),
                                "ridx": -1,
                                "cipher": {"User-Agent": this.eip("Mozilla/5.0 (iPad; CPU OS 12_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1", 'b64encode')},
                                "ciphertype": 5,
                                "version": "1.2.0",
                                "appname": "com.jingdong.app.mall"
                            })),
                            'user-agent': 'JD4iPhone/169635%20(iPhone;%20iOS;%20Scale/3.00);jdmall;iphone;version/13.8.1;build/169635;network/wifi;screen/1170x2532;os/15.1.1',
                            'x-rp-client': 'ios_4.0.0',
                            'x-referer-page': 'com.jingdong.app.mall.WebActivity',
                            'x-referer-package': 'com.jingdong.app.mall',
                            'charset': 'UTF-8',
                            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
                        }
                    }
                )
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
                        this.dict[user] = y.cookie
                        p.log('openKey生成成功');
                        p.info.work = true
                        this.valid(user, true)
                    }
                    else {
                        p.err("openKey获取失败")
                    }
                }
                else {
                    p.err("tokenKey获取失败")
                }
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

