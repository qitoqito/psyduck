import {Template} from '../../template.js'
import jsdom from "jsdom";

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东金融天天领红包',
            sync: 1,
            verify: 1,
            crontab: 3,
            headers: {
                referer: 'https://fu.jr.jd.com'
            },
            prompt: {
                channelCode: '活动id'
            }
        }
    }

    async prepare() {
        await this.field('channelCode')
        let ua = this.userAgents().jd
        let resourceLoader = new jsdom.ResourceLoader({
            userAgent: ua,
            "referer": "https://fc.jr.jd.com/",
        });
        let virtualConsole = new jsdom.VirtualConsole();
        this.jsConfig = {
            "url": "https://ms.jr.jd.com/",
            "referer": "https://fc.jr.jd.com/",
            "userAgent": ua,
            runScripts: "dangerously",
            resources: resourceLoader,
            includeNodeLocations: true,
            storageQuota: 10000000,
            pretendToBeVisual: true,
            virtualConsole
        }
        let JSDOM = jsdom.JSDOM
        let a = new JSDOM(`<body><script src="https://jrsecstatic.jdpay.com/jr-sec-dev-static/aar2-2.1.0.min.js"></script>`, this.jsConfig)
        await this.wait(2000)
        if (a.window.AAR2) {
            a.window.AAR2.init();
            this.crypto = {
                aar: new a.window.AAR2(),
            }
        }
        else {
            this.log("jsdom没有获取到aar2")
            this.jump = 1
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        const aar = this.crypto.aar
        let nonce = aar.nonce()
        let signature = aar.sign(this.dumps({
            "channelCode": context.channelCode,
            "aksSignId": "WumYDnHUkh"
        }), nonce)
        let info = await this.getInfo(user, 'jsTk') || {}
        let device = {
            deviceInfo: {
                "jsToken": "",
                "fp": this.md5(new Date().getTime().toString()),
                "eid": info.eid || `FQ7Z2DTGYZSJM5FKY${this.rand(10, 99)}JLAURRHP2UZHK2ID7554EMNWWNNSK3JBCTLTR45IOP3Z5K3YJHOG${this.rand(10, 99)}SJAOB${this.rand(10, 99)}KVS3RH7G2U`,
            },
        }
        let
            params = {
                "channelCode": context.channelCode,
                "env": "JRAPP",
                "systemEnv": "IOS",
                "jrAppVersion": "8.1.10",
                nonce,
                signature,
                "errorCode": "00000",
                "type": "100",
                "aksSignId": "WumYDnHUkh"
            }
        let query = await this.curl({
                'url': `https://ms.jr.jd.com/gw/generic/mission/h5/m/queryMission`,
                json: {
                    "reqData": this.dumps(params),
                },
                user,
                algo: {
                    expire: {
                        "resultCode": 3,
                    }
                }
            }
        )
        // console.log(query)
        let data = this.haskey(query, 'resultData.data')
        let status = 1
        if (data) {
            for (let i of data) {
                if (i.status == 2) {
                    p.log("任务已完成:", i.name)
                }
                else {
                    let doLink = i.doLink
                    let pp = this.query(doLink, '&', 1)
                    if (pp.juid) {
                        p.log("正在运行:", i.name)
                        let T = aar.nonce()
                        status = 0
                        let receive = await this.curl({
                                'url': `https://ms.jr.jd.com/gw/generic/mission/h5/m/receiveMission`,
                                'json': {
                                    "reqData": {
                                        "channelCode": context.channelCode,
                                        "missionId": i.missionId,
                                        "deviceInfo": device.deviceInfo,
                                        "nonce": T,
                                        "signature": aar.sign(this.dumps({
                                            channelCode: context.channelCode,
                                            PIN: user,
                                            missionId: i.missionId,
                                        }), T)
                                    }
                                },
                                user
                            }
                        )
                        await this.wait(1000)
                        let jump = await this.curl({
                                'url': `https://ms.jr.jd.com/gw2/generic/mission/h5/m/getJumpInfo?juid=${pp.juid}&signature=${aar.sign(this.dumps({
                                    juid: pp.juid,
                                    PIN: user,
                                }), T)}&nonce=${T}&jrAppVersion=6.9.80&systemEnv=IOS`,
                                user
                            }
                        )
                        // console.log(jump)
                        if (this.haskey(jump, 'resultData.success')) {
                            if (i.awards[0].awardName == '京豆') {
                                p.award(i.awards[0].awardRealNum, 'bean')
                            }
                            else {
                                p.msg(`${i.awards[0].awardName}: ${i.awards[0].awardRealNum}`)
                            }
                            status = 1
                        }
                        else {
                            p.log("跳转失败...")
                            status = 0
                        }
                        await this.wait(2000)
                    }
                }
            }
        }
        else {
            status = 0
            p.err("没有获取到任务数据...")
        }
        if (status) {
            p.info.work = true
        }
    }
}
