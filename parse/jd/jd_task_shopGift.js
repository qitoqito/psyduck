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
            crontab: `${this.rand(5, 10)},${this.rand(35, 40)} 9-23 * * *`,
            prompt: {
                id: '可使用venderId_shopId_activityId,或者venderId,或3.cn链接,或u.jd.com链接',
            },
            readme: '通过url和venderId获取,可能会获取不到activityId,如想准确获取activityId请自行抓包:venderId,shopId,activityId',
            help: 't3'
        }
    }

    async prepare() {
        await this.field('id')
    }

    async batch(p) {
        if (p.id) {
            if (p.id.split("_").length == 3) {
                let [venderId, shopId, activityId] = p.id.split("_")
                p = {
                    ...p, ...{venderId, shopId, activityId}
                }
            }
            else {
                let url
                let shopId, venderId
                if (!isNaN(p.id)) {
                    venderId = p.id
                }
                else {
                    if (p.id.includes("u.jd.com")) {
                        let j = `https://union-click.jd.com/api?time=1633480440000&url=${p.id}&source=10&type=2&platform=6&token=oFEhgxRz1cKD2AR6sFKBmg--&jdUuid=a3b4e844090b28d5c38e7629af8115172079be5d&appVersion=100720&sourceValue=other`;
                        let s = await this.curl({
                                'url': j,
                            }
                        )
                        if (this.haskey(s, 'url')) {
                            url = decodeURIComponent(s.url)
                        }
                    }
                    else {
                        let j = await this.curl({
                                'url': p.id,
                                maxRedirects: 0,
                                scheme: 'http',
                                response: 'all'
                            }
                        )
                        if (this.haskey(j, 'location')) {
                            url = j.location
                        }
                    }
                }
                if (url) {
                    let query = new URL(url).searchParams
                    shopId = query.get('shopId')
                    venderId = query.get('venderId ')
                }
                if (!(shopId && venderId)) {
                    let info = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=getShopHomeBaseInfo`,
                            'form': `functionId=getShopHomeBaseInfo&body=${this.dumps({
                                shopId,
                                "source": "app-shop",
                                venderId,
                                "sourceRpc": "shop_app_home_home",
                                "RNVersion": "0.72.3",
                                "navigationAbTest": "1"
                            })}&uuid=a68fbedf6e53dad6&client=apple&clientVersion=15.1.53&st=1749714653347&sv=111&sign=d8b3b3c457a791ea5a6dc6ea03b922a3`,
                            algo: {
                                sign: true
                            }
                        }
                    )
                    if (this.haskey(info, 'result.shopInfo')) {
                        venderId = info.result.shopInfo.venderId
                        shopId = info.result.shopInfo.shopId
                        p.shopName = info.result.shopInfo.shopName
                    }
                }
                if (venderId) {
                    for (let user of this.help) {
                        let s = await this.curl({
                                'url': `https://api.m.jd.com/client.action?functionId=getShopHomeActivityInfo`,
                                'form': `avifSupport=0&body=${this.dumps({
                                    "source": "app-shop",
                                    "sourceRpc": "shop_app_home_home",
                                    shopId,
                                    venderId,
                                })}&build=169896&client=apple&clientVersion=15.1.53`,
                                user,
                                algo: {
                                    sign: true
                                }
                            }
                        )
                        if (this.haskey(s, 'result.activityId')) {
                            p.activityId = s.result.activityId
                            p.shopId = shopId
                            p.venderId = venderId
                            break
                        }
                    }
                }
            }
        }
        return p
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let shopId = context.shopId || ''
        let venderId = context.venderId || ''
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
        //
        // if (!activityId) {
        //     var s = await this.curl({
        //             'url': `https://api.m.jd.com/client.action?functionId=getShopHomeActivityInfo`,
        //             'form': `avifSupport=0&body=${this.dumps(body)}&build=169736&client=apple&clientVersion=15.0.20&d_brand=apple`,
        //             user,
        //             algo: {
        //                 sign: true
        //             }
        //         }
        //     )
        //     activityId = this.haskey(s, 'result.giftBagDataResult.activityId') || this.haskey(s, 'result.activityId')
        //     if (activityId) {
        //         await this.setTemp(venderId, activityId)
        //     }
        // }
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
                        // p.msg(`京豆: ${g.redWord}`)
                        p.award(g.redWord, 'bean')
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
            p.log("没获取到activityId...")
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

