import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东关注店铺领京豆',
            sync: 1,
            display: true,
            tempExpire: 8640000,
            verify: 1,
            crontab: `${this.rand(5, 10)},${this.rand(35, 40)} 9-23 * * *`
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let shopId = context.shopId
        let venderId = context.venderId
        let headers = context.headers || {}
        let algo = context.algo || {range: 6}
        let body = {
            "source": "app-shop",
            "displayWidth": "1098.000000",
            "sourceRpc": "shop_app_home_home",
            venderId,
            shopId
        }
        let activityId = context.activityId || await this.getTemp(context.venderId)
        let status = 0
        if (!activityId) {
            var s = await this.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=getShopHomeActivityInfo`,
                    'form': `avifSupport=0&body=${this.dumps(body)}&build=169736&client=apple&clientVersion=15.0.20&d_brand=apple`,
                    user,
                    algo: {
                        sign: true
                    }
                }
            )
            activityId = this.haskey(s, 'result.giftBagDataResult.activityId') || this.haskey(s, 'result.activityId')
            if (activityId) {
                await this.setTemp(venderId, activityId)
            }
        }
        if (activityId) {
            let body2 = {
                "follow": 0,
                "activityId": activityId.toString(),
                "sourceRpc": "shop_app_home_window",
                shopId: shopId.toString(),
                venderId: venderId.toString()
            }
            let drawShopGift = await this.curl({
                'url': 'https://api.m.jd.com/client.action?g_ty=ls&g_tk=518274330',
                'form': `functionId=whx_drawShopGift&body=${this.dumps(body2)}&t=1670345201521&appid=wx_mini_app&clientVersion=11.0.0&client=wh5&uuid=0040a1e96b5d357ae888a0f18bb23968`,
                user,
                headers: {
                    'referer': 'https://servicewechat.com/wx91d27dbf599dff74/747/page-frame.html',
                    'user-agnet': 'wechat'
                },
                algo: {
                    expire: {
                        "code": "3",
                    }
                }
            })
            if (drawShopGift) {
                status = 1
                p.log("正在关注", this.haskey(drawShopGift, 'result.giftDesc') || '没有领取到')
                for (let g of this.haskey(drawShopGift, 'result.alreadyReceivedGifts') || []) {
                    if (g.prizeType == 4) {
                        p.msg(`京豆: ${g.redWord}`)
                    }
                }
                await this.curl({
                    'url': 'https://api.m.jd.com/client.action?g_ty=ls&g_tk=518274330',
                    'form': `functionId=whx_followShop&body={"shopId":"${context.shopId}","follow":"false"}&t=1670345201521&appid=wx_mini_app&clientVersion=11.0.0&client=wh5&uuid=0040a1e96b5d357ae888a0f18bb23968`,
                    user,
                    algo,
                    headers: {
                        'referer': 'https://servicewechat.com/wx91d27dbf599dff74/747/page-frame.html',
                        'user-aget': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.28(0x18001c2e) NetType/WIFI Language/zh_CN'
                    }
                })
            }
        }
        else {
            p.log("没获取到...")
            let unfollow = await this.curl({
                'url': 'https://api.m.jd.com/client.action?g_ty=ls&g_tk=518274330',
                'form': `functionId=whx_followShop&body={"shopId":"${context.shopId}","follow":"false"}&t=1670345201521&appid=wx_mini_app&clientVersion=11.0.0&client=wh5&uuid=0040a1e96b5d357ae888a0f18bb23968`,
                user,
                algo,
                headers: {
                    'referer': 'https://servicewechat.com/wx91d27dbf599dff74/747/page-frame.html',
                    'user-aget': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.28(0x18001c2e) NetType/WIFI Language/zh_CN'
                }
            })
        }
        if (status) {
            p.info.work = true
        }
    }
}

