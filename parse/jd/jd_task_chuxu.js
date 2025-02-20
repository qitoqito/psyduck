import {Template} from '../../template.js'
import jsdom from "jsdom";

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东金融天天领京豆',
            sync: 1,
            verify: 1,
            crontab: 3,
            headers: {
                referer: 'https://content.jr.jd.com/'
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
        }), nonce)
        let params = {
            "channelCode": context.channelCode,
            nonce,
            signature,
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
                    let T = aar.nonce()
                    status = 0
                    let batchGetTransLink = await this.curl({
                            'url': `https://ms.jr.jd.com/gw2/generic/jrResource/h5/m/batchGetTransLink`,
                            json: {
                                "reqData": this.dumps({
                                    "parentUrlParam": i.doLink.split("?")[1],
                                    "linkList": []
                                }),
                            },
                            user
                        }
                    )
                    let signData = this.dumps(
                        {"missionId": i.missionId, "PIN": user}
                    )
                    let nonce4 = aar.nonce()
                    let signature4 = aar.sign(signData, nonce4)
                    let queryBrowsMissionExt = await this.curl({
                            'url': `https://ms.jr.jd.com/gw2/generic/Mission/h5/m/queryBrowsMissionExt`,
                            json: {
                                "missionId": i.missionId,
                                "channelCode": pp.channelCode,
                                "nonce": nonce4,
                                "signData": signData,
                                "signature": signature4,
                                "version": "2.2.1"
                            },
                            user,
                        }
                    )
                    if (this.haskey(queryBrowsMissionExt, 'resultData.data.extendMap')) {
                        p.log("正在浏览")
                        let map = queryBrowsMissionExt.resultData.data.extendMap
                        p.log(`等待${map.readTime}s中...`)
                        await this.curl({
                                'url': `https://ms.jr.jd.com/gw/generic/mission/h5/m/queryMissionReceiveAfterStatus`,
                                json: {
                                    "reqData": this.dumps({
                                        missionId: i.missionId.toString(),
                                        "channelCode": pp.channelCode,
                                    })
                                },
                                user
                            }
                        )
                        await this.wait(parseInt(map.readTime) * 1000)
                        let n = JSON.stringify({
                            missionId: i.missionId.toString(),
                            readTime: map.readTime.toString(),
                            PIN: user
                        })
                        let signature2 = aar.sign(n, T)
                        let finish = await this.curl({
                                'url': `https://ms.jr.jd.com/gw/generic/mission/h5/m/finishReadMission`,
                                json: {
                                    "reqData": this.dumps({
                                        missionId: i.missionId.toString(),
                                        readTime: map.readTime.toString(),
                                        nonce: T,
                                        signature: aar.sign(n, T),
                                        version: "2.2.1",
                                        "channelCode": pp.channelCode,
                                    })
                                },
                                user
                            }
                        )
                        if (this.haskey(finish, 'resultData.code', '0000') || this.haskey(finish, 'resultData.code', '0001')) {
                            let reward = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw/generic/mission/h5/m/awardMission`,
                                    json: {
                                        "reqData": this.dumps({
                                            "channelCode": pp.channelCode,
                                            "missionId": i.missionId,
                                            "signature": aar.sign(this.dumps({"missionId": i.missionId,}, T)),
                                            "nonce": T
                                        }),
                                    },
                                    user,
                                }
                            )
                            if (this.haskey(reward, 'resultData.success')) {
                                if (i.awards[0].awardName == '京豆') {
                                    p.draw(i.awards[0].awardRealNum)
                                }
                                else {
                                    p.msg(`${i.awards[0].awardName}: ${i.awards[0].awardRealNum}`)
                                }
                                status = 1
                            }
                            else {
                                p.log(reward)
                            }
                            await this.wait(2000)
                        }
                        else {
                            p.log("浏览失败...")
                        }
                    }
                    else {
                        p.err("浏览失败")
                    }
                }
            }
        }
        else {
            status = 0
            p.err("没有获取到数据")
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


