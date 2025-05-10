import {Template} from '../../template.js'
import CryptoJS from 'crypto-js'
import nodeEnc from 'node-jsencrypt'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东小哥送京豆',
            headers: {
                'lop-dn': 'activity.jd.com',
                'appparams': '{"appid":158,"ticket_type":"m"}',
                referer: 'https://jchd.jd.com/',
                clientinfo: '{"appName":"marketing","client":"m"}'
            },
            crontab: 6,
            interval: 2000,
            keyExpire: 12000,
            public: 'xiaoge'
        }
    }

    async prepare() {
        this.rsa = new nodeEnc()
        this.rsa.setPublicKey("MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCCcxl3qbmy25mQa2sPt2AxkRsuUA8UiXMyg7/P6oWhHdf1y5oARnmdpH7h24EDK2WPanC10hBTgR/FC+QkHBl8ENdEJ5AnJ3PsfIXMQjNryi+37wGNDylB9qTUXKufa428vMYTgoxp95+qv6AuX55JDBsbGlivJCiR3mtDKFisnQIDAQAB")
    }

    async cc(p) {
        let url = p.url
        if (!url.includes("Enhance")) {
            url = `${p.url}Enhance`
        }
        var t = this.uuid(16),
            r = this.uuid(16)
        let data = CryptoJS.AES.encrypt(JSON.stringify(p.json), CryptoJS.enc.Utf8.parse(t), {
            iv: CryptoJS.enc.Utf8.parse(r),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        }).toString()
        let req = {
            url,
            data,
            headers: {
                ...this.profile.headers,
                ...{
                    "report-time": new Date().getTime(),
                    pkid: 11470,
                    ciphertext: this.rsa.encrypt("".concat(t).concat(r)),
                }
            },
            user: p.user
        }
        return await this.curl(req)
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let home = await this.curl({
                'url': `https://lop-proxy.jd.com/PersonalApi/getHomePage`,
                json: [{
                    "pin": ""
                }],
                user,
                algo: {
                    expire: {
                        'error_response.code': 143
                    }
                }
            }
        )
        if (this.haskey(home, 'content.mangroveFiveIntegral')) {
            p.log("当前养成京豆:", home.content.mangroveFiveIntegral)
        }
        let isSign = await p.getPublic('sign')
        if (!isSign) {
            let sign = await this.cc({
                    'url': `https://lop-proxy.jd.com/UserSignInApi/signNowEnhance`,
                    json: [{
                        "pin": ""
                    }],
                    user,
                }
            )
            if (this.haskey(sign, 'content.jinBeanNum')) {
                p.award(sign.content.jinBeanNum, 'bean')
                await p.setPublic('sign', 1, parseInt(86400 - (new Date().getTime() - new Date().setHours(0, 0, 0, 0)) / 1000))
            }
        }
        let environment = await this.curl({
                'url': `https://lop-proxy.jd.com/UserEnvironmentApi/pageEnvironment`,
                json: [{
                    "pin": "",
                    "pageSize": 5,
                    "pageNo": 1
                }],
                user
            }
        )
        for (let i of this.haskey(environment, 'content.list')) {
            if (i.receive == 0) {
                p.log("正在收取:", i.waybillCode)
                let receive = await this.curl({
                        'url': `https://lop-proxy.jd.com/UserEnvironmentApi/receiveJingBean`,
                        json: [{
                            "pin": "",
                            "waybillCode": i.waybillCode
                        }],
                        user
                    }
                )
            }
        }
        let mangrove = await this.curl({
                'url': `https://lop-proxy.jd.com/UserMangroveApi/userMangroveInfo`,
                json: [{
                    "pin": ""
                }],
                user
            }
        )
        let interactiveTime = this.haskey(mangrove, 'content.interactiveTime')
        let t = new Date().getTime()
        let wait = 0
        if (interactiveTime>t && (interactiveTime - t) / 1000<60) {
            p.log("正在等待:", (interactiveTime - t) / 1000)
            await this.wait(interactiveTime - t)
            wait = 1
        }
        else if (t>interactiveTime) {
            wait = 1
        }
        else if (!interactiveTime) {
            wait = 1
        }
        if (this.haskey(mangrove, 'content.id') && wait) {
            let water = await this.cc({
                    'url': `https://lop-proxy.jd.com/UserMangroveApi/userMangroveInteractive`,
                    json: [{
                        "pin": "",
                        "userMangroveDevelopId": mangrove.content.id,
                        "mangroveInteractiveId": mangrove.content.mangroveInteractiveDto.id
                    }],
                    user
                }
            )
            if (this.haskey(water, 'content.interactiveTime')) {
                p.log("当前等级:", water.content.stage, '下级所需成长值:', water.content.growthValue - water.content.alreadyAmount)
            }
        }
        else if (interactiveTime) {
            p.log("当前等级:", mangrove.content.stage, '下级所需成长值:', mangrove.content.growthValue - mangrove.content.alreadyAmount)
            p.log("下次养护时间:", new Date(interactiveTime).toLocaleString())
        }
        p.info.work = true
    }
}

