// const Template = require('../../template');
import {Template} from "../../template.js";
import vm from 'vm'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: "京东京享红包",
            help: 't3',
            verify: 1,
            sync: 1,
            prompt: {
                shareUrl: '京享红包分享链接',
            },
            readme: ["风控较严,算法经常变动,锁佣需谨慎,如订单一直异常,请停用此脚本", "默认获取前3个账号分享码"],
            crontab: 1
        }
    }

    async prepare() {
        try {
            let js = await this.curl('https://storage.360buyimg.com/webcontainer/js_security_v3_lite_0.1.5.js')
            const script = new vm.Script(`
            var window = {
                    document: {
                        cookie: ""
                    }
                }
            var document = window.document
            var navigator = {};
            window.navigator = navigator;
            setTimeout=function(){};
            var Element=function(){}
            ${js};
            new ParamsSignLite();`);
            const result = script.runInNewContext();
            if (this.algo.version != result._version) {
                this.msg("当前H5ST版本可能不是最新")
            }
            else if (this.algo.algos.MD5('1').toString("") != result._algos.MD5('1').toString()) {
                this.msg("当前H5ST版本可能不是最新")
            }
            else {
                // await this.field('shareUrl')
                let shareUrl = this.random(await this.getField(
                    'shareUrl'
                ))
                if (!shareUrl) {
                    return
                }
                let {ua, h5st} = await this.uuaa()
                let cookie = ''
                let jda = await this.curl({
                        url: shareUrl,
                        response: `all`,
                        headers: {
                            'user-agent': ua,
                            referer: null
                        },
                        cookie
                    }
                )
                let jdaUrl = this.match([/hrl\s*='([^\']+)'/, /hrl\s*="([^\"]+)"/], jda.content)
                cookie = `${cookie};${jda.cookie}`
                let scheme = await this.curl({
                        'url': jdaUrl + `&h5st=${h5st}`,
                        maxRedirects: 0,
                        scheme: 'http',
                        'response': `all`,
                        cookie,
                        ua,
                        referer: shareUrl
                    }
                )
                cookie = `${cookie};${scheme.cookie}`
                let linkUrl = scheme.location
                let actId = this.match(/active\/(\w+)/, linkUrl)
                let unionActId = this.match(/unionActId=(\d+)/, linkUrl)
                let d = this.match(/com\/(\w+)/, shareUrl)
                let unionShareId = []
                let client = ua.includes('Android') ? 'android' : 'apple'
                for (let user of this.help) {
                    let shareUnion = await this.curl({
                            'url': `https://api.m.jd.com/api?functionId=shareUnionCoupon&appid=u_hongbao&_=1716943673297&loginType=2&body={"unionActId":"${unionActId}","actId":"${actId}","platform":5,"unionShareId":"","d":"${d}","supportPic":2}&client=${client}&clientVersion=1.1.0&osVersion=15.1.1&screen=390*844&d_brand=iPhone&d_model=iPhone&lang=zh-CN&networkType=wifi&openudid=`,
                            algo: {
                                appId: 'c10dc',
                                store: cookie,
                            },
                            referer: linkUrl,
                            ua,
                            user
                        }
                    )
                    if (this.haskey(shareUnion, 'data.shareUrl')) {
                        let shareId = this.match(/s=(\w+)/, shareUnion.data.shareUrl)
                        this.log("获取账户", user, shareId)
                        unionShareId.push(shareId)
                    }
                }
                this.shareCode({
                    shareUrl,
                    d,
                    actId,
                    unionActId,
                    unionShareId
                })
            }
        } catch (e) {
        }
    }

    async main(p) {
        let user = p.data.user
        let context = p.context;
        let algo = context.algo || {}
        let gift = function(getCoupons) {
            for (let i of this.haskey(getCoupons, 'data.couponList')) {
                if (i.type == 1) {
                    p.msg(`获得[红包]🧧${i.discount}元`)
                }
                else if (i.type == 3) {
                    p.log(`获得[优惠券]🎟️满${i.quota}减${i.discount}`)
                }
                else if (i.type == 6) {
                    p.log(`获得[打折券]🎫满${i.quota}打${i.discount * 10}折`)
                }
                else {
                    p.log(`获得[未知]🎉${i.quota || ''} ${i.discount}`)
                }
            }
        }
        try {
            var {ua, h5st} = await this.uuaa()
            var client = ua.includes('Android') ? 'android' : 'apple'
            var store, actId, unionActId, d
            let getCode = await this.shareId(context)
            for (let code of getCode) {
                store = ''
                let url = `https://u.jd.com/${code.d}?s=${code.unionShareId}`
                let jda = await this.curl({
                    url,
                    "response": "all",
                    "redirect": "follow",
                    "headers": {"user-agent": ua, "referer": ""},
                    user
                })
                store = jda.cookie
                let jdaUrl = this.match([/hrl\s*='([^\']+)'/, /hrl\s*="([^\"]+)"/], jda.content)
                let scheme = await this.curl({
                        'url': jdaUrl + `&h5st=${h5st}`,
                        maxRedirects: 0,
                        scheme: 'http',
                        'response': `all`,
                        user,
                        ua,
                        referer: url,
                        algo: {
                            store
                        }
                    }
                )
                let linkUrl = scheme.location
                let query = (this.query(linkUrl, '&', 'split'))
                actId = this.match(/active\/(\w+)/, linkUrl)
                var {
                    unionActId, d, utm_source, utm_medium, utm_campaign, utm_term
                } = query
                let __jdv = `123|${utm_source}|${utm_campaign}|${utm_medium}|${utm_term}|${new Date().getTime()}`
                store = `${store};${scheme.cookie};__jdv=${encodeURIComponent(__jdv)}`
                await this.curl({
                    url: linkUrl,
                    referer: url,
                    ua,
                    user,
                    algo: {store}
                })
                let getCoupons = await this.curl({
                        url: `https://api.m.jd.com/api`,
                        form: `functionId=getCoupons&appid=u_hongbao&loginType=2&body={"platform":5,"unionActId":"${unionActId}","actId":"${actId}","d":"${d}","unionShareId":"${code.unionShareId}","type":1,"qdPageId":"MO-J2011-1","mdClickId":"jxhongbao_ck","actType":1}&client=${client}&clientVersion=1.1.0&stk=appid,body,client,clientVersion,functionId`,
                        user,
                        algo: {
                            appId: 'c822a',
                            store,
                            token: false,
                            expire: {
                                "code": -2,
                            }
                        },
                        ua,
                        referer: linkUrl
                    }
                )
                let msg = this.haskey(getCoupons, 'msg')
                if (msg.includes('领取成功')) {
                    gift.call(this, getCoupons)
                }
                else {
                    p.log("领取失败:", msg)
                    if (msg == '达到领取上限') {
                        break
                    }
                    if (msg == '活动未开始') {
                        this.jump = 1
                        return
                    }
                    if (msg.includes("用户未登录")) {
                        return
                    }
                }
            }
            let qry = await this.curl({
                    'url': `https://api.m.jd.com/api?functionId=queryFullGroupInfoMap&appid=u_hongbao&_=1716946027013&loginType=2&body={"actId":"${actId}","unionActId":"${unionActId}","platform":5,"d":"${d}","taskType":1,"prstate":0}&client=${client}&clientVersion=15.6.10&osVersion=15.1.1&screen=390*844&d_brand=iPhone&d_model=iPhone&lang=zh-CN&networkType=wifi&openudid=&aid=&oaid=`,
                    user,
                    algo: {appId: '7b74b', store}
                }
            )
            for (let i of this.haskey(qry, 'data.dayGroupData.groupInfo')) {
                if (i.info) {
                    if (i.status == 1) {
                        p.log("正在运行:", i.info)
                        if (i.info.includes("点击") && i.taskTargetUrl) {
                            let query = this.query(i.taskTargetUrl, '&', 'split')
                            let goods = await this.curl({
                                    'url': `https://api.m.jd.com/api?functionId=unionSearchRecommend&appid=u_activity_h5&loginType=2&client=${client}&clientVersion=&body={"funName":"getSkuByMaterialId","page":{"pageNo":1,"pageSize":20},"param":{"materialId":12354,"sortName":null,"sortType":"","keyword":"","category1":null,"batchId":"","requestScene":1,"source":20200,"clientPageId":"union_activity_265222","packageName":""}}`,
                                    user,
                                    algo: {
                                        appId: '66248',
                                        store
                                    }
                                }
                            )
                            let goodList = this.haskey(goods, 'result.goodsSynopsisList') || []
                            for (let z of goodList.slice(0, 6)) {
                                let couponUrl = this.haskey(z, `purchasePriceInfo.unionCouponList.0.couponLink`)
                                if (couponUrl) {
                                    p.log("正在浏览:", z.skuName)
                                    let free = await this.curl({
                                            'url': `https://api.m.jd.com/api?functionId=getUnionFreeCoupon&appid=u_activity_h5&loginType=2&client=${client}&clientVersion=&body={"couponUrl":"${couponUrl}","recommendCouponUrl":["${couponUrl}"],"skuPrice":${z.purchasePriceInfo.thresholdPrice},"pageId":${query.union_page_id},"pageType":5,"source":20221}`,
                                            user,
                                            algo: {
                                                appI: '66248',
                                                store
                                            }
                                        }
                                    )
                                    await this.wait(1000)
                                }
                            }
                            let complete = await this.curl({
                                    'url': `https://api.m.jd.com/api?functionId=completeUnionTask&appid=u_activity_h5&loginType=2&client=${client}&clientVersion=&body={"unionActTask":"${query.unionActTask}"}`,
                                    // 'form':``,
                                    user,
                                    algo: {
                                        appId: '66248', store
                                    }
                                }
                            )
                            p.log(complete)
                        }
                        else if (this.haskey(i, ['adInfo.target_url', 'taskTargetUrl'])) {
                            let apStart = await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=apStartTiming&appid=u_hongbao&_=1716946560092&loginType=2&body={"timerId":"${i.componentId}","uniqueId":"${i.taskId}","jumpUrl":"${encodeURIComponent(this.haskey(i, ['adInfo.target_url', 'taskTargetUrl']))}","jumpType":1}&client=${client}&clientVersion=15.6.10&osVersion=15.1.1&screen=390*844&d_brand=iPhone&d_model=iPhone&lang=zh-CN&networkType=wifi&openudid=`,
                                    user,
                                    algo: {
                                        appId: '0d977'
                                    }
                                }
                            )
                            p.log(this.haskey(apStart, 'errMsg') || apStart)
                            if (this.match(/\d+秒/, i.info)) {
                                let ts = (this.match(/(\d+)秒/, i.info))
                                try {
                                    let z = await this.sign.jdCurl({
                                        url: 'https://api.m.jd.com/client.action',
                                        form: `functionId=apResetTiming&body={"timerId":"${i.componentId}","uniqueId":"${i.taskId}"}&build=169498&client=${client}&clientVersion=13.2.8&d_brand=apple&d_model=iPhone13%2C3&ef=1`,
                                        user
                                    })
                                    p.log("等待", ts)
                                    await this.wait(parseInt(ts) * 1000)
                                    let y = await this.curl({
                                        url: 'https://api.m.jd.com/client.action',
                                        form: `functionId=apCheckTimingEnd&body={"timerId":"${i.componentId}","uniqueId":"${i.taskId}"}&build=169498&client=${client}&clientVersion=13.2.8&d_brand=apple&d_model=iPhone13%2C3&ef=1`,
                                        user,
                                        algo: {
                                            sign: true
                                        }
                                    })
                                } catch (e) {
                                    p.log("等待", ts)
                                    await this.wait(parseInt(ts) * 1000)
                                    let apsDoTask = await this.curl({
                                            'url': `https://api.m.jd.com/api`,
                                            'form': `functionId=apCheckTimingEnd&appid=activities_platform&_=1716946560092&loginType=2&body={"timerId":"${i.componentId}","uniqueId":"${i.taskId}"}&build=169498&client=${client}&clientVersion=13.2.8&d_brand=apple&d_model=iPhone13%2C3&ef=1`,
                                            user,
                                            algo: {
                                                appId: '0d977'
                                            }
                                        }
                                    )
                                }
                            }
                            await this.wait(1000)
                        }
                        else if (i.info.includes("分享")) {
                            let shareUnion = await this.curl({
                                    'url': `https://api.m.jd.com/api?functionId=shareUnionCoupon&appid=u_hongbao&_=1716943673297&loginType=2&body={"unionActId":"${unionActId}","actId":"${actId}","platform":5,"unionShareId":"","d":"${d}","supportPic":2,"taskId":"${i.taskId}"}&client=${client}&clientVersion=15.6.10&osVersion=15.1.1&screen=390*844&d_brand=iPhone&d_model=iPhone&lang=zh-CN&networkType=wifi&openudid=`,
                                    user,
                                    algo: {
                                        appId: 'c10dc',
                                        store
                                    }
                                }
                            )
                            // p.log(shareUnion)/
                            let share = await this.curl({
                                    'url': `https://api.m.jd.com/api?functionId=unionShare&appid=u_hongbao&_=1716949639549&loginType=2&body={"funName":"share","param":{"shareReq":[{"shareType":5,"plainUrl":"${this.haskey(shareUnion, 'data.shareUrl')}","command":1}]}}&client=${client}&clientVersion=15.6.10&osVersion=15.1.1&screen=390*844&d_brand=iPhone&d_model=iPhone&lang=zh-CN&networkType=wifi`,
                                    // 'form':``,
                                    user,
                                    algo: {
                                        appId: '18813',
                                        store
                                    }
                                }
                            )
                            let getCoupons = await this.curl({
                                    url: `https://api.m.jd.com/api`,
                                    form: `functionId=getCoupons&appid=u_hongbao&_=1716912812082&loginType=2&body={"actId":"${actId}","unionActId":"${unionActId}","platform":5,"d":"${d}","unionShareId":"","type":8,"qdPageId":"MO-J2011-1","mdClickId":"jxhongbao_ck","actType":1,"taskId":"${i.taskId}","agreeState":0}&client=${client}&clientVersion=1.1.0&osVersion=iOS&screen=390*844&d_brand=iPhone&d_model=iPhone&lang=zh-CN&networkType=&openudid=&uuid=17165464753211715186324&aid=&oaid=&ext={"idfa":""}&x-api-eid-token=`,
                                    user,
                                    algo: {
                                        appId: 'c822a',
                                        store,
                                        token: false
                                    }
                                }
                            )
                            let getCoupons2 = await this.curl({
                                    url: `https://api.m.jd.com/api`,
                                    form: `functionId=getCoupons&appid=u_hongbao&_=1716912812082&loginType=2&body={"actId":"${actId}","unionActId":"${unionActId}","platform":5,"d":"${d}","unionShareId":"","type":8,"qdPageId":"MO-J2011-1","mdClickId":"jxhongbao_ck","actType":1,"taskId":"${i.taskId}","agreeState":1}&client=${client}&clientVersion=1.1.0&osVersion=iOS&screen=390*844&d_brand=iPhone&d_model=iPhone&lang=zh-CN&networkType=&openudid=&uuid=17165464753211715186324&aid=&oaid=&ext={"idfa":""}&x-api-eid-token=`,
                                    user,
                                    algo: {
                                        appId: 'c822a',
                                        store,
                                        token: false
                                    }
                                }
                            )
                            gift.call(this, getCoupons2)
                        }
                        else if (i.info.includes("点击")) {
                            let unionActTask = this.match(/unionActTask=([^\&]+)/, i.taskTargetUrl)
                            this.set({
                                referer: i.taskTargetUrl
                            })
                            let rec = await this.curl({
                                    'url': `https://api.m.jd.com/api?functionId=unionSearchRecommend&appid=u_activity_h5&loginType=2&client=${client}&clientVersion=&body={"funName":"getSkuByMaterialId","page":{"pageNo":1,"pageSize":20},"param":{"materialId":12354,"sortName":null,"sortType":"","keyword":"","category1":null,"batchId":"","requestScene":1,"source":20200,"clientPageId":"union_activity_265222","packageName":""}}`,
                                    // 'form':``,
                                    user,
                                    algo: {
                                        appId: '66248', store
                                    }
                                }
                            )
                            let ik = 0
                            for (let i of this.random(this.haskey(rec, 'result.goodsSynopsisList') || [], 123)) {
                                if (this.haskey(i, 'purchasePriceInfo.unionCouponList.0.couponLink')) {
                                    p.log("正在浏览:", i.skuName)
                                    let getUnionActivity = await this.curl({
                                            'url': `https://api.m.jd.com/api?functionId=getUnionActivity&appid=u_activity_h5&loginType=2&client=${client}&clientVersion=&body={"id":"265222","qdPageId":"MO-J2011-1","mdClickId":"union_activity_paycoupon_expo","skuList":"","skuListSign":"","platform":3,"clientPageId":"union_activity","parentActivityId":"","parentCouponConfigId":""}`,
                                            // 'form':``,
                                            user,
                                        }
                                    )
                                    let free = await this.curl({
                                            url: `https://api.m.jd.com/api?functionId=getUnionFreeCoupon&appid=u_activity_h5&loginType=2&client=${client}&clientVersion=&body={"couponUrl":"${i.purchasePriceInfo.unionCouponList[0].couponLink}","recommendCouponUrl":["${i.purchasePriceInfo.unionCouponList[0].couponLink}"],"skuPrice":${i.wlPrice},"pageId":265222,"pageType":5,"source":20221}`,
                                            user,
                                            algo: {
                                                appId: '66248'
                                            }
                                        }
                                    )
                                    if (this.haskey(free, 'data')) {
                                        ik++
                                    }
                                    if (ik>=5) {
                                        break
                                    }
                                    await this.wait(1000)
                                }
                            }
                            let comp = await this.curl({
                                    'url': `https://api.m.jd.com/api?functionId=completeUnionTask&appid=u_activity_h5&loginType=2&client=${client}&clientVersion=&body={"unionActTask":"${(unionActTask)}"}&x-api-eid-token=jdd01VD3JGEPGE54ERTF24JG43RNNY4NFEDZITDT3FYE6NYXFV2B27GNMA6R4QVHVRDBZKC7HS3BHZCRRFX2NBBN5TASNAQRGAFOZFYBTBDI01234567`,
                                    // 'form':``,
                                    user,
                                    algo: {
                                        appId: '66248'
                                    }
                                }
                            )
                            p.log(comp)
                        }
                    }
                    else {
                        p.log("任务完成:", i.info)
                    }
                }
            }
            if (this.help.includes(user)) {
                qry = await this.curl({
                        'url': `https://api.m.jd.com/api?functionId=queryFullGroupInfoMap&appid=u_hongbao&_=1716946027013&loginType=2&body={"actId":"${actId}","unionActId":"${unionActId}","platform":5,"d":"${d}","taskType":1,"prstate":0}&client=${client}&clientVersion=15.6.10&osVersion=15.1.1&screen=390*844&d_brand=iPhone&d_model=iPhone&lang=zh-CN&networkType=wifi&openudid=&aid=&oaid=`,
                        user,
                        algo: {appId: '7b74b'}
                    }
                )
                let getCoupons = await this.curl({
                        url: `https://api.m.jd.com/api`,
                        form: `functionId=getCoupons&appid=u_hongbao&_=1716912812082&loginType=2&body={"actId":"${actId}","unionActId":"${unionActId}","platform":5,"d":"${d}","unionShareId":"","type":3,"qdPageId":"MO-J2011-1","mdClickId":"jxhongbao_ck","actType":1}&client=${client}&clientVersion=1.1.0&osVersion=iOS&screen=390*844&d_brand=iPhone&d_model=iPhone&lang=zh-CN&networkType=&openudid=&uuid=17165464753211715186324&aid=&oaid=&ext={"idfa":""}&x-api-eid-token=`,
                        user,
                        algo: {
                            appId: 'c822a',
                            store,
                            token: false
                        }
                    }
                )
                gift.call(this, getCoupons)
            }
        } catch (e) {
        }
    }

    async uuaa() {
        let type = this.random(['weixin', 'wechat'])
        let ua = this.userAgents()[type]
        return {
            ua,
            h5st: this.algo.hashCode(ua)
        }
    }

    async shareId(context) {
        let code = []
        for (let unionShareId of context.unionShareId) {
            code.push({
                d: context.d,
                actId: context.actId,
                unionActId: context.unionActId,
                unionShareId
            })
        }
        try {
            if (this.syncStorage) {
                let syncStorage = this.syncStorage
                let range = syncStorage.range || 1
                let rand = this.rand(1, range)
                if (rand == 1) {
                    for (let unionShareId of syncStorage.unionShareId) {
                        code.push({
                            d: syncStorage.d,
                            actId: syncStorage.actId,
                            unionActId: syncStorage.unionActId,
                            unionShareId
                        })
                    }
                    let c1 = code.slice(0, 2)
                    let c2 = code.slice(2)
                    let c3 = this.random(c2, c2.length)[0]
                    code = [...c1, ...[c3]]
                }
            }
        } catch (e) {
        }
        return code
    }
}


