import {Template} from '../../template.js'
import jsdom from "jsdom";

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东金融赚京豆',
            headers: {
                referer: 'https://show.jd.com/m/RkO0AE9rKrYy6ZDd'
            },
            crontab: 3
        }
    }

    async prepare() {
        let ua = this.userAgents().jd
        let resourceLoader = new jsdom.ResourceLoader({
            userAgent: ua,
            "referer": "https://iu.jr.jd.com/",
        });
        let virtualConsole = new jsdom.VirtualConsole();
        this.jsConfig = {
            "url": "https://iu.jr.jd.com/",
            "referer": "https://iu.jr.jd.com/",
            "userAgent": ua,
            runScripts: "dangerously",
            resources: resourceLoader,
            includeNodeLocations: true,
            storageQuota: 10000000,
            pretendToBeVisual: true,
            virtualConsole,
        };
        let JSDOM = jsdom.JSDOM
        let a = new JSDOM(`<body><script src="https://jrsecstatic.jdpay.com/jr-sec-dev-static/aar2.min.js"></script> <script src="https://m.jr.jd.com/common/jssdk/jrbridge/2.0.0/jrbridge.js"></script>   <script src="https://jrsecstatic.jdpay.com/jr-sec-dev-static/cryptico.min.js"></script>  </body>`, this.jsConfig)
        await this.wait(3000)
        if (a.window.AAR2) {
            a.window.AAR2.init();
            this.crypto = {
                aar: new a.window.AAR2(),
                cry: a.window.cryptico
            }
        }
        else {
            this.log("jsdom没有获取到aar2")
            this.jump = 1
        }
        this.shareCode({channelCode: "CH202501131"})
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        const aar = this.crypto.aar
        let info = await this.getInfo(user, 'jsTk') || {}
        let device = {
            deviceInfo: {
                "jsToken": "",
                "fp": this.md5(new Date().getTime().toString()),
                "sdkToken": info.token || `jdd016DZNHFZEX6ISWPRAZUKJDKGFIRQJ5MRXPZHLTK3ZIVKLBTD4SEZNDR6S${this.rand(10, 99)}JO2TLV${this.rand(10, 99)}HB5MV6JW52RVAZNXKEXXHGYDCX5MIJ7NSC4DY01234567`,
                "eid": info.eid || `FQ7Z2DTGYZSJM5FKY${this.rand(10, 99)}JLAURRHP2UZHK2ID7554EMNWWNNSK3JBCTLTR45IOP3Z5K3YJHOG${this.rand(10, 99)}SJAOB${this.rand(10, 99)}KVS3RH7G2U`,
            },
        }
        var nonce = aar.nonce()
        var signature = aar.sign(this.dumps({
            "channelCode": context.channelCode,
            PIN: user
        }), nonce)
        let mile = await this.curl({
                'url': `https://ms.jr.jd.com/gw2/generic/Mission/h5/m/queryMilePost`,
                json: {
                    "reqData": {
                        "source": "mdH5Pagedeploy",
                        "token": "TVBaZRYGYS",
                        "channelCode": context.channelCode,
                        "milePostIdList": [87],
                        "queryMissionFlag": 2,
                        "deviceInfo": device.deviceInfo
                    }
                },
                user
            }
        )
        let data = this.haskey(mile, 'resultData.data.0.missionList')
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
                        if (this.haskey(jump, 'resultData.success')) {
                            if (i.awards[0].awardName == '京豆') {
                                p.draw(i.awards[0].awardRealNum)
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
        if (p.prize.length) {
            let sum = p.prize.reduce((v, k) => {
                v += parseInt(k)
                return v
            }, 0)
            p.msg(`获得京豆: ${sum}`)
        }
    }
}

