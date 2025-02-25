import {Template} from '../../template.js'
import jsdom from "jsdom";

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东财富号签到',
            headers: {
                referer: 'https://finshop.jd.com/'
            },
            sync: 1,
            prompt: {
                appId: '活动id'
            },
            crontab: 3,
            verify: 1,
            tempExpire: 3600
        }
    }

    async prepare() {
        await this.field('appId')
        let ua = this.userAgents().jd
        let resourceLoader = new jsdom.ResourceLoader({
            userAgent: ua,
            "referer": "https://finshop.jd.com/",
        });
        let virtualConsole = new jsdom.VirtualConsole();
        this.jsConfig = {
            "url": "https://finshop.jd.com/",
            "referer": "https://finshop.jd.com/",
            "userAgent": ua,
            runScripts: "dangerously",
            resources: resourceLoader,
            includeNodeLocations: true,
            storageQuota: 10000000,
            pretendToBeVisual: true,
            virtualConsole
        }
    }

    async batch(p) {
        p = await this.getTemp(p.pid) || p
        if (!p.orgName) {
            let device = {
                appId: p.appId,
                deviceInfo: `{"jsToken":"","fp":"${this.md5(new Date().getTime().toString())}","sdkToken":"jdd016DZNHFZEX6ISWPRAZUKJDKGFIRQJ5MRXPZHLTK3ZIVKLBTD4SEZNDR6S${this.rand(10, 99)}JO2TLV${this.rand(10, 99)}HB5MV6JW52RVAZNXKEXXHGYDCX5MIJ7NSC4DY01234567","eid":"FQ7Z2DTGYZSJM5FKY${this.rand(10, 99)}JLAURRHP2UZHK2ID7554EMNWWNNSK3JBCTLTR45IOP3Z5K3YJHOG${this.rand(10, 99)}SJAOB${this.rand(10, 99)}KVS3RH7G2U","appType":1}`,
                "modelPreviewType": "1"
            }
            let getHome = await this.curl({
                    'url': `https://ms.jr.jd.com/gw/generic/uc/h5/m/getHomePageHeadInfo`,
                    form: `reqData=${this.dumps(device)}`,
                }
            )
            if (this.haskey(getHome, 'resultData.data.orgName')) {
                p.nodeId = getHome.resultData.data.orgNodeId
                p.orgName = getHome.resultData.data.orgName
            }
            else {
                p.expired = true
            }
        }
        return p
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        console.log(`正在签到:`, context.orgName || context.appId)
        let a = new jsdom.JSDOM(`<body><script src="//gia.jd.com/m.html"></script>  <script src="//gias.jd.com/js/m.js"></body>`, this.jsConfig)
        await this.wait(2000)
        try {
            var riskJd = a.window.getJdEid();
        } catch (e) {
            let riskJd = {
                "jsToken": "",
                "fp": this.md5(new Date().getTime().toString()),
                "sdkToken": `jdd016DZNHFZEX6ISWPRAZUKJDKGFIRQJ5MRXPZHLTK3ZIVKLBTD4SEZNDR6S${this.rand(10, 99)}JO2TLV${this.rand(10, 99)}HB5MV6JW52RVAZNXKEXXHGYDCX5MIJ7NSC4DY01234567`,
                "eid": `FQ7Z2DTGYZSJM5FKY${this.rand(10, 99)}JLAURRHP2UZHK2ID7554EMNWWNNSK3JBCTLTR45IOP3Z5K3YJHOG${this.rand(10, 99)}SJAOB${this.rand(10, 99)}KVS3RH7G2U`,
            }
        }
        let data = await this.getTemp(context.appId)
        if (!data) {
            let list = await this.curl({
                    'url': `https://ms.jr.jd.com/gw2/generic/finshop/h5/m/queryFundPositionArray`,
                    form: `reqData=${this.dumps({
                        appId: context.appId,
                        "nodeId": context.nodeId,
                        "origin": "jindian",
                        source: 0,
                        deviceInfo: `{"jsToken":"","fp":"${this.md5(new Date().getTime().toString())}","sdkToken":"jdd016DZNHFZEX6ISWPRAZUKJDKGFIRQJ5MRXPZHLTK3ZIVKLBTD4SEZNDR6S${this.rand(10, 99)}JO2TLV${this.rand(10, 99)}HB5MV6JW52RVAZNXKEXXHGYDCX5MIJ7NSC4DY01234567","eid":"FQ7Z2DTGYZSJM5FKY${this.rand(10, 99)}JLAURRHP2UZHK2ID7554EMNWWNNSK3JBCTLTR45IOP3Z5K3YJHOG${this.rand(10, 99)}SJAOB${this.rand(10, 99)}KVS3RH7G2U","appType":1}`,
                        "modelPreviewType": "1"
                    })}`,
                    user
                }
            )
            if (this.haskey(list, 'resultData.data.0.jdUnclaimedList')) {
                data = list.resultData.data[0].jdUnclaimedList[0]
                await this.setTemp(context.appId, data)
            }
        }
        if (data) {
            let sign = await this.curl({
                    'url': `https://ms.jr.jd.com/gw2/generic/finshop/h5/m/jdActivityTake`,
                    'form': `reqData=${this.dumps({
                        "appId": context.appId,
                        "nodeId": context.nodeId,
                        "origin": "jindian",
                        deviceInfo: this.dumps(riskJd),
                        "companyUserId": data.companyUserId,
                        "activityId": data.activityId,
                        "modelPreviewType": "1"
                    })}`,
                    user,
                    algo: {
                        expire: {
                            resultCode: 3
                        }
                    }
                }
            )
            if (this.haskey(sign, 'resultData.data.amount')) {
                p.msg(`京豆: ${sign.resultData.data.amount}`)
                p.info.work = true
            }
            else if (this.haskey(sign, 'success') && this.haskey(sign, 'resultData.code', -1)) {
                p.info.work = true
                p.log("已签到")
            }
            else {
                p.log(sign)
            }
        }
        else {
            p.err("没有获取到activityId")
        }
        a.window.close()
    }
}

