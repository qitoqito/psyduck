import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东取关店铺',
            delay: 1200,
            interval: 8000,
            prompt: {
                whiteList: '保留关键词,关键词1|关键词2',
                blackList: '只删除关键词,关键词1|关键词2',
                page: '删除页数,每页20条数据,默认3'
            },
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let page = 1
        for (let i = 0; i<parseInt(this.profile.page || 3); i++) {
            let s = await this.curl({
                    'url': `https://api.m.jd.com/client.action`,
                    form: 'functionId=getFollowShop&body={"page":1,"activityStatus":1,"refresh":false,"pageSize":20,"channel":"jg_shop"}&t=1721701312676&appid=shop_m_jd_com&clientVersion=13.1.2&client=wh5&screen=1170*2532&uuid=1d2057c82bc10bed6b30fcf24c8ede39&loginType=2&x-api-eid-token=jdd03BEKUSIICX7NIA2GGINTXC5QERR6B54KI6TFAJ7B4DI337FEFP4DTEMJ2Z7PKJQUV4OH6P3U74CEGNVTDWIZGD4JSXIAAAAMQ3VSF6CQAAAAACYUXLQXVUJSGIYX',
                    user,
                    referer: 'https://shop.m.jd.com/favorite/home',
                    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.33(0x18002129) NetType/WIFI Language/zh_CN miniProgram/wx91d27dbf599dff74",
                    algo: {
                        expire: {
                            code: "3"
                        }
                    }
                }
            )
            if (typeof s == 'string') {
                eval(`s=${s}`)
            }
            if (this.haskey(s, 'result.showShopList')) {
                s = s.result
                p.log("当前店铺收藏数:", s.totalCount)
                if (s.totalCount>0) {
                    page = Math.ceil(s.totalCount / 20)>1 ? this.rand(1, Math.ceil(s.totalCount / 20)) : 1
                    // shopName
                    if (this.profile.whiteList) {
                        let whiteList = this.profile.whiteList
                        var data = s.showShopList.filter(d => !d.shopName.match(whiteList))
                    }
                    else if (this.profile.blackList) {
                        let blackList = this.profile.blackList
                        var data = s.showShopList.filter(d => d.shopName.match(blackList))
                    }
                    else {
                        var data = s.showShopList
                    }
                    if (data.length>0) {
                        p.log(`正在删除:`, this.column(data, 'shopName').join("|"))
                        let rm = await this.curl({
                                'url': `https://api.m.jd.com/client.action`,
                                'form': `functionId=followShop&body={"shopId":"${this.column(data, 'shopId').join(",")}","follow":false,"sourceRpc":"shop_app_myollows_shop","channel":"jg_shop"}&t=1721702313509&appid=shop_m_jd_com&clientVersion=13.1.2&client=wh5&screen=1170*2532&uuid=1d2057c82bc10bed6b30fcf24c8ede39&loginType=2&x-api-eid-token=jdd03BEKUSIICX7NIA2GGINTXC5QERR6B54KI6TFAJ7B4DI337FEFP4DTEMJ2Z7PKJQUV4OH6P3U74CEGNVTDWIZGD4JSXIAAAAMQ3VSF6CQAAAAACYUXLQXVUJSGIYX`,
                                user
                            }
                        )
                        p.log(this.haskey(rm, 'msg') || '')
                    }
                    else {
                        break
                    }
                }
                else {
                    p.log("没有获取关注数据")
                    break
                }
            }
            else {
                p.log("可能黑ip了,没有获取到数据")
                break
            }
        }
    }
}

