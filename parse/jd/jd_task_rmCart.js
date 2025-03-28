import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东删除购物车',
            prompt: {
                whiteList: '保留关键词,关键词1|关键词2',
                blackList: '只删除关键词,关键词1|关键词2',
                exceed: 'n #超过指定数量才删除'
            },
            headers: {
                "referer": "https://cart.jd.com/cart_index/",
            }
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let cart = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=pcCart_jc_getCurrentCart&appid=JDC_mall_cart&loginType=3&t=1717947580116&client=pc&clientVersion=1.0.0&body={"serInfo":{"user-key":""},"cartExt":{"specialId":1}}`,
                user,
                algo: {
                    appId: 'f961a'
                }
            }
        )
        if (!this.haskey(cart, 'resultData.cartInfo.vendors')) {
            p.err("没有获取到购物车数据")
            return
        }
        let skus = []
        let packs = []
        let whiteList, blackList
        if (this.profile.whiteList) {
            whiteList = (this.profile.whiteList).split(",").join('|')
        }
        else if (this.profile.blackList) {
            blackList = (this.profile.blackList).split(",").join('|')
        }
        let status = 0
        if (this.haskey(cart, 'resultData.cartInfo.vendors')) {
            status++
            for (let i of cart.resultData.cartInfo.vendors) {
                for (let j of this.haskey(i, 'sorted')) {
                    if (this.haskey(j, 'item.items')) {
                        if (j.item.items.length>0) {
                            for (let k of j.item.items) {
                                if (whiteList) {
                                    if (!k.item.Name.match(whiteList)) {
                                        packs.push(
                                            {
                                                "num": k.item.Num.toString(),
                                                "ybPackId": j.item.promotionId,
                                                "sType": "11",
                                                "TheSkus": [{"num": k.item.Num.toString(), "Id": k.item.Id.toString()}],
                                                "Id": j.item.promotionId
                                            }
                                        )
                                    }
                                }
                                else if (blackList) {
                                    if (k.item.Name.match(blackList)) {
                                        packs.push(
                                            {
                                                "num": k.item.Num.toString(),
                                                "ybPackId": j.item.promotionId,
                                                "sType": "11",
                                                "TheSkus": [{"num": k.item.Num.toString(), "Id": k.item.Id.toString()}],
                                                "Id": j.item.promotionId
                                            }
                                        )
                                    }
                                }
                                else {
                                    let packss = {
                                        "num": k.item.Num.toString(),
                                        "ybPackId": (j.item.promotionId || j.item.Id).toString(),
                                        "sType": "11",
                                        "TheSkus": [{"num": k.item.Num.toString(), "Id": k.item.Id.toString()}],
                                        "Id": (j.item.promotionId || j.item.vid).toString()
                                    }
                                    if (this.haskey(k, 'item.skuUuid')) {
                                        packss.skuUuid = k.item.skuUuid
                                        packss.TheSkus[0].skuUuid = k.item.skuUuid
                                        // packss.sType = "4"
                                        packss.useUuid = false
                                        packss.TheSkus[0].useUuid = false
                                    }
                                    packs.push(
                                        packss
                                    )
                                }
                                // if (k.item.stockState != "无货" && k.item.checkBoxText != "预售") {
                                // }
                            }
                        }
                        else {
                            if (whiteList) {
                                if (!j.item.Name.match(whiteList)) {
                                    skus.push(
                                        {
                                            "num": j.item.Num.toString(),
                                            "Id": j.item.Id.toString(),
                                            "skuUuid": j.item.skuUuid,
                                            "useUuid": j.item.useUuid
                                        }
                                    )
                                }
                            }
                            else if (blackList) {
                                if (j.item.Name.match(blackList)) {
                                    skus.push(
                                        {
                                            "num": j.item.Num.toString(),
                                            "Id": j.item.Id.toString(),
                                            "skuUuid": j.item.skuUuid,
                                            "useUuid": j.item.useUuid
                                        }
                                    )
                                }
                            }
                            else {
                                skus.push(
                                    {
                                        "num": j.item.Num.toString(),
                                        "Id": j.item.Id.toString(),
                                        "skuUuid": j.item.skuUuid,
                                        "useUuid": j.item.useUuid
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
        let count = skus.length + packs.length
        let exceed = parseInt(this.profile.exceed || 0)
        if (exceed && exceed>count) {
            p.info.work = true
            p.log(`当前购物车数量: ${count},小于指定数量,跳过运行`)
            return
        }
        p.log('即将删除购物车数目:', count)
        if (skus.length>0 || packs.length>0) {
            let cartRemove = await this.curl({
                    'url': `https://api.m.jd.com/api`,
                    'form': `functionId=pcCart_jc_cartRemove&appid=JDC_mall_cart&body=${this.dumps({
                        "operations": [{
                            "carttype": "4",
                            "TheSkus": skus,
                            "ThePacks": packs
                        }], "serInfo": {}
                    })}`,
                    user
                }
            )
            p.msg(`删除购物车: ${count}`)
            if (status) {
                p.info.work = true
            }
        }
    }
}

