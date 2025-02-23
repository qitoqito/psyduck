import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东店铺签到',
            crontab: `${this.rand(0, 59)} 0,${this.rand(1, 12)} * * *`,
            sync: 1,
            verify: 1,
            tempExpire: 7 * 86400,
            prompt: {
                token: "店铺签到token|token1"
            }
        }
    }

    async prepare() {
        await this.field('token')
    }

    async batch(p) {
        p = this.getTemp(p.pid) || p
        if (!p.shopName) {
            var s = await this.curl({
                url: `https://api.m.jd.com/api?appid=interCenter_shopSign&loginType=2&functionId=interact_center_shopSign_getActivityInfo&body={"token":"${p.token}","venderId":""}`,
                referer: 'https://h5.m.jd.com/',
                algo: {
                    appId: '4da33',
                }
            })
            if (this.haskey(s, 'data.id')) {
                let shopInfo = await this.curl({
                    'url': `https://api.m.jd.com/`,
                    form: `functionId=whx_getMShopOutlineInfo&body={"venderId":"${s.data.venderId}","originReferer":"shopx","source":"m-shop"}&t=1727955137220&avifSupport=0&webpSupport=0&appid=wx_mini_app&clientVersion=11.0.0&client=wh5&uuid=08635116374331727444274533&loginType=11&area=&fp=c68b3c68639ae2d76f00dfb51e463e08f251bf09`,
                    referer: 'https://servicewechat.com/wx91d27dbf599dff74/765/page-frame.html',
                    algo: {
                        appId: '4da33',
                    }
                })
                if (!shopInfo) {
                    shopInfo = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=getShopHomeActivityInfo`,
                            'form': `avifSupport=0&body={"lngWs":"","sourceRpc":"shop_app_home_home","venderId":"${s.data.venderId}","source":"app-shop","latWs":"","displayWidth":"1098.000000"}&build=169720&client=apple&clientVersion=15.0.15`,
                            algo: {
                                sign: true
                            },
                            cookie: this.tester()
                        }
                    )
                }
                if (this.haskey(shopInfo, 'data.shopInfo.shopName')) {
                    p.shopName = shopInfo.data.shopInfo.shopName
                    p.activityId = s.data.id
                    p.venderId = s.data.venderId
                    p.continuePrizeRuleList = s.data.continuePrizeRuleList
                    p.category = 'shopSign'
                }
            }
            if (this.haskey(s, 'code', 402)) {
                p.expired = true
            }
        }
        p.hide = ['continuePrizeRuleList']
        return p
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        if (!context.venderId) {
            p.err("没有获取到该Token的数据,请重试...")
            p.context.jump = true
        }
        else {
            // let s = await this.curl({
            //     'url': `https://api.m.jd.com/api?appid=interCenter_shopSign&loginType=2&functionId=interact_center_shopSign_getSignRecord&body={"token":"${context.token}","venderId":${context.venderId},"activityId":${context.activityId},"type":56,"actionType":7}&jsonp=jsonp1004`,
            //     user,
            //     algo: {
            //         appId: '4da33',
            //         expire: {
            //             code: 407000007
            //         }
            //     }
            // })
            // if (this.haskey(s, 'code', 402)) {
            //     p.log('当前不存在有效的活动')
            //     p.context.finish = true
            //     return
            // }
            // let days = this.haskey(s, 'data.days')
            // let isOk = 0
            // if (context.continuePrizeRuleList) {
            //     let maxDay = this.column(context.continuePrizeRuleList, 'days').reduce((v, k) => {
            //         return v += k
            //     }, 0)
            //     if (days>=maxDay) {
            //         console.log(`签到已满${maxDay}天,跳出签到`, context.token, `https://shop.m.jd.com/?venderId=${context.venderId}`)
            //         isOk++
            //     }
            // }
            // if (!isOk) {
            let sign = await this.curl({
                'url': `https://api.m.jd.com`,
                form: `appid=interCenter_shopSign&loginType=2&functionId=interact_center_shopSign_signCollectGift&body={"token":"${context.token}","venderId":${context.venderId},"activityId":${context.activityId},"type":56,"actionType":7}`,
                user,
                algo: {
                    appId: '4da33',
                    version: 'latest',
                    status: true
                },
            })
            if (this.haskey(sign, 'code', 402)) {
                p.log('当前不存在有效的活动')
                p.context.jump = true
                return
            }
            if (this.haskey(sign, 'code', [403030023, 200])) {
                p.info.work = true
                if (sign.success) {
                    p.log(`签到: ${days + 1}天`, context.token, context.shopName)
                }
                else {
                    p.log(sign.msg)
                }
            }
            // }
        }
    }
}

