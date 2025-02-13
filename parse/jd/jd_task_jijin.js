import {Template} from '../../template.js'
import jsdom from "jsdom";

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东财富号',
            crontab: 3,
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
        await this.wait(1000)
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
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        const aar = this.crypto.aar
        let device = {
            deviceInfo: `{"jsToken":"","fp":"${this.md5(new Date().getTime().toString())}","sdkToken":"jdd016DZNHFZEX6ISWPRAZUKJDKGFIRQJ5MRXPZHLTK3ZIVKLBTD4SEZNDR6S${this.rand(10, 99)}JO2TLV${this.rand(10, 99)}HB5MV6JW52RVAZNXKEXXHGYDCX5MIJ7NSC4DY01234567","eid":"FQ7Z2DTGYZSJM5FKY${this.rand(10, 99)}JLAURRHP2UZHK2ID7554EMNWWNNSK3JBCTLTR45IOP3Z5K3YJHOG${this.rand(10, 99)}SJAOB${this.rand(10, 99)}KVS3RH7G2U","appType":1}`,
        }
        var nonce = aar.nonce()
        var signature = aar.sign(this.dumps(device), nonce)
        let query = await this.curl({
                'url': `https://ms.jr.jd.com/gw2/generic/finshop/h5/m/queryMission`,
                json: {
                    "reqData": this.dumps(device),
                    "aar": {
                        nonce, signature
                    }
                },
                user
            }
        )
        let ed = this.haskey(query, 'resultData.data') || []
        let status = 1
        if (ed.length) {
            for (let i of ed) {
                if (i.status == 2) {
                    p.log("任务已完成:", i.name)
                }
                else {
                    status = 0
                    p.log("正在运行:", i.name)
                    let device2 = {
                        deviceInfo: `{"jsToken":"","fp":"${this.md5(new Date().getTime().toString())}","sdkToken":"jdd016DZNHFZEX6ISWPRAZUKJDKGFIRQJ5MRXPZHLTK3ZIVKLBTD4SEZNDR6S${this.rand(10, 99)}JO2TLV${this.rand(10, 99)}HB5MV6JW52RVAZNXKEXXHGYDCX5MIJ7NSC4DY01234567","eid":"FQ7Z2DTGYZSJM5FKY${this.rand(10, 99)}JLAURRHP2UZHK2ID7554EMNWWNNSK3JBCTLTR45IOP3Z5K3YJHOG${this.rand(10, 99)}SJAOB${this.rand(10, 99)}KVS3RH7G2U","appType":1}`,
                        missionId: i.missionId
                    }
                    let nonce2 = aar.nonce()
                    let signature2 = aar.sign(this.dumps(device2), nonce2)
                    let nonce3 = aar.nonce()
                    let signature3 = aar.sign(this.dumps(device2), nonce3)
                    if (i.name.includes("关注")) {
                        var data = {}
                        let doLink = i.doLink
                        let pp = this.query(doLink, '&', 1)
                        if (!this.dict[pp.appId]) {
                            let getShop = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw/generic/uc/h5/m/getShopAppConfInfo`,
                                    'form': `reqData=${this.dumps({
                                        "appId": pp.appId,
                                        "origin": "h5",
                                        "deviceInfo": this.dumps(device),
                                        "modelPreviewType": "1"
                                    })}`,
                                    user
                                }
                            )
                            let getHome = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw/generic/uc/h5/m/getHomePageHeadInfo`,
                                    'form': `reqData=${this.dumps({
                                        "appId": pp.appId,
                                        "origin": "h5",
                                        "deviceInfo": this.dumps(device),
                                        "modelPreviewType": "1"
                                    })}`,
                                    user
                                }
                            )
                            if (this.haskey(getShop, 'resultData.data') && this.haskey(getHome, 'resultData.data')) {
                                data = {...getShop.resultData.data, ...getHome.resultData.data}
                                this.dict[pp.appId] = data
                            }
                        }
                        else {
                            data = this.dict[pp.appId]
                        }
                        if (data.appid) {
                            let unfollow = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw/generic/uc/h5/m/cancelFollowShop`,
                                    'form': `reqData=${this.dumps({
                                        "appId": pp.appId,
                                        "nodeId": data.orgNodeId,
                                        "origin": "h5",
                                        "deviceInfo": this.dumps(device),
                                        "bizType": "notice",
                                        "modelPreviewType": "1"
                                    })}`,
                                    user
                                }
                            )
                            let receive = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw2/generic/finshop/h5/m/receiveMission`,
                                    json: {
                                        "reqData": this.dumps(device2),
                                        "aar": {
                                            "nonce": nonce2,
                                            "signature": signature2
                                        }
                                    },
                                    user,
                                    shell: true,
                                    referer: 'https://finshop.jd.com/',
                                }
                            )
                            let task = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw2/generic/finshop/h5/m/couponActivityTake`,
                                    'form': `reqData=${this.dumps({
                                        "appId": pp.appId,
                                        "nodeId": data.orgNodeId,
                                        "origin": "h5",
                                        "deviceInfo": this.dumps(device),
                                        "bizType": "notice",
                                        "modelPreviewType": "1"
                                    })}`,
                                    user
                                }
                            )
                            let follow = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw/generic/stock/h5/m/queryFollowFansCount`,
                                    'form': `reqData=${this.dumps({
                                        "appId": pp.appId,
                                        "origin": "h5",
                                        "deviceInfo": this.dumps(device),
                                        "content": data.uid,
                                        "channel": 0,
                                        "bizType": 17,
                                        "modelPreviewType": "1"
                                    })}`,
                                    user
                                }
                            )
                            await this.curl({
                                    'url': `https://ms.jr.jd.com/gw/generic/uc/h5/m/queryShopFollowStatus`,
                                    'form': `reqData=${this.dumps({
                                        "appId": pp.appId,
                                        "origin": "h5",
                                        "deviceInfo": this.dumps(device),
                                        "modelPreviewType": "1"
                                    })}`,
                                    user,
                                }
                            )
                            let reward = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw2/generic/finshop/h5/m/awardMission`,
                                    json: {
                                        "reqData": this.dumps(device2),
                                        "aar": {
                                            "nonce": nonce3,
                                            "signature": signature3
                                        }
                                    },
                                    user,
                                    shell: true,
                                    referer: 'https://finshop.jd.com/'
                                }
                            )
                            if (this.haskey(reward, 'resultData.success')) {
                                if (i.awardName == '京豆') {
                                    p.draw(i.awardRealNum)
                                }
                                else {
                                    p.msg(`${i.awardName}: ${i.awardRealNum}`)
                                }
                                status = 1
                            }
                            else {
                                p.log(reward)
                            }
                            await this.wait(2000)
                        }
                    }
                    else if (i.name.includes("自选")) {
                        let doLink = i.doLink
                        let pp = this.query(doLink, '&', 1)
                        // var data2 = {}
                        // console.log(pp, i)
                        let itemId
                        if (!this.dict[pp.fundCode]) {
                            let product = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw/generic/jj/h5/m/getFundDetailPageInfo`,
                                    'form': `reqData={"itemId":"","createOrdermaket":"","fundCode":"${pp.fundCode}","clientVersion":null,"channel":"7"}`,
                                    user
                                }
                            )
                            itemId = this.haskey(product, 'resultData.datas.headerOfItem.itemId')
                            if (itemId) {
                                this.dict[pp.fundCode] = itemId
                            }
                        }
                        else {
                            itemId = this.dict[pp.fundCode]
                        }
                        if (itemId) {
                            let cancel = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw/generic/jj/h5/m/cancelFundZxProduct`,
                                    'form': `reqData={"fundIds":["${itemId}"],"clientType":"ios","channel":"7"}`,
                                    user
                                }
                            )
                            let receive = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw2/generic/finshop/h5/m/receiveMission`,
                                    json: {
                                        "reqData": this.dumps(device2),
                                        "aar": {
                                            "nonce": nonce2,
                                            "signature": signature2
                                        }
                                    },
                                    user,
                                    shell: true,
                                    referer: 'https://finshop.jd.com/',
                                }
                            )
                            let add = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw/generic/jj/h5/m/addFundZxProduct`,
                                    'form': `reqData={"fundId":"${itemId}","clientType":"ios","systemId":"JJXQ0001","channel":"7"}`,
                                    user
                                }
                            )
                            let reward = await this.curl({
                                    'url': `https://ms.jr.jd.com/gw2/generic/finshop/h5/m/awardMission`,
                                    json: {
                                        "reqData": this.dumps(device2),
                                        "aar": {
                                            "nonce": nonce3,
                                            "signature": signature3
                                        }
                                    },
                                    user,
                                    shell: true,
                                    referer: 'https://finshop.jd.com/'
                                }
                            )
                            if (this.haskey(reward, 'resultData.success')) {
                                if (i.awardName == '京豆') {
                                    p.draw(i.awardRealNum)
                                }
                                else {
                                    p.msg(`${i.awardName}: ${i.awardRealNum}`)
                                }
                                status = 1
                            }
                            else {
                                p.log(reward)
                            }
                            await this.wait(2000)
                        }
                        else {
                            status = 0
                            p.log("没有获取到itemId")
                        }
                    }
                }
            }
        }
        else {
            status = 0
            p.err("没有获取到数据...")
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

