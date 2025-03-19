import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东大牌集合任务',
            public: 'isv',
            sync: 1,
            prompt: {
                actId: '活动Id1|Id2',
            },
            verify: 1,
        }
    }

    async prepare() {
        await this.field('actId')
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let isv = await p.getPublic('isv')
        if (isv) {
            for (let i of Array(2)) {
                var load = await this.curl({
                        'url': `https://jinggengjcq-isv.isvjcloud.com/dm/front/jdJoinCardtf/activity/load?open_id=&mix_nick=&push_way=1&user_id=10299171`,
                        'json': {
                            "jsonRpc": "2.0",
                            "params": {
                                "commonParameter": {
                                    "oba": "259f36a73a857cfa37a7096fedb8bd60",
                                    "m": "POST",
                                    "timestamp": this.timestamp,
                                    "userId": 10299171,
                                },
                                "admJson": {
                                    "actId": p.context.actId,
                                    "userId": 10299171,
                                    "jdToken": isv,
                                    "source": "01",
                                    "method": "/openCardNew/activity_load",
                                    "buyerNick": ""
                                }
                            }
                        },
                    }
                )
                if (this.haskey(load, 'data.data.missionCustomer.buyerNick')) {
                    break
                }
                await this.wait(3000)
            }
            if (this.haskey(load, 'errorMessage', '获取京东用户信息失败~')) {
                p.log('获取京东用户信息失败~')
                return
            }
        }
        else {
            p.err('没有获取到isvToken')
        }
        let buyerNick = this.haskey(load, 'data.data.missionCustomer.buyerNick')
        if (buyerNick) {
            let missionCustome = load.data.data.missionCustomer
            let bean = 0
            let shopList = await this.curl({
                    'url': `https://jinggengjcq-isv.isvjcloud.com/dm/front/jdJoinCardtf/shop/shopList?open_id=&mix_nick=${buyerNick}&push_way=1&user_id=10299171`,
                    json: {
                        "jsonRpc": "2.0",
                        "params": {
                            "commonParameter": {
                                "m": "POST",
                                "oba": "e4aae386ea7d1a32f77771570eea39cd",
                                "timestamp": this.timestamp,
                                "userId": 10299171
                            },
                            "admJson": {
                                "method": "/jdJoinCardtf/shop/shopList",
                                "userId": 10299171,
                                "actId": p.context.actId,
                                buyerNick,
                                "pushWay": 1
                            }
                        }
                    }
                }
            )
            for (let i of this.haskey(shopList, 'data.data')) {
                let goodsNumId = i.shopId
                p.log("正在浏览:", i.shopTitle)
                let s = await this.curl({
                        'url': `https://jinggengjcq-isv.isvjcloud.com/dm/front/jdJoinCardtf/mission/completeMission?open_id=&mix_nick=${buyerNick}&push_way=1&user_id=10299171`,
                        json: {
                            "jsonRpc": "2.0",
                            "params": {
                                "commonParameter": {
                                    "m": "POST",
                                    "oba": "259f36a73a857cfa37a7096fedb8bd60",
                                    "timestamp": new Date().getTime(),
                                    "userId": 10299171
                                },
                                "admJson": {
                                    "missionType": "viewShop",
                                    "goodsNumId": goodsNumId,
                                    "method": "/jdJoinCardtf/mission/completeMission",
                                    "userId": 10299171,
                                    "actId": p.context.actId,
                                    buyerNick,
                                    "pushWay": 1
                                }
                            }
                        }
                    }
                )
                // console.log(this.dumps(s))
                let remark = this.haskey(s, 'data.data.remark') || ''
                p.log(remark)
                if (this.haskey(s, 'data.data.sendStatus') == false) {
                    break
                }
                if (remark.includes("京豆")) {
                    p.award(remark, 'bean')
                }
                else {
                    if (this.dumps(s).includes("上限")) {
                        break
                    }
                }
                await this.wait(1000)
            }
            for (let _ of ['uniteAddCart', 'uniteCollectShop']) {
                if (_ == 'uniteAddCart' && missionCustome.hasAddCart) {
                    continue
                }
                else if (_ == 'uniteCollectShop' && missionCustome.hasCollectShop) {
                    continue
                }
                let collectShop = await this.curl({
                        'url': `https://jinggengjcq-isv.isvjcloud.com/dm/front/jdJoinCardtf/mission/completeMission?open_id=&mix_nick=${buyerNick}&push_way=1&user_id=10299171`,
                        json: {
                            "jsonRpc": "2.0",
                            "params": {
                                "commonParameter": {
                                    "m": "POST",
                                    "oba": "b67770414453c05a26e57cde6ae600ab",
                                    "timestamp": new Date().getTime(),
                                    "userId": 10299171
                                },
                                "admJson": {
                                    "actId": p.context.actId,
                                    "missionType": _,
                                    "method": "/jdJoinCardtf/mission/completeMission",
                                    "userId": 10299171,
                                    buyerNick,
                                    "pushWay": 1
                                }
                            }
                        }
                    }
                )
                let remark = this.haskey(collectShop, 'data.data.remark') || ''
                p.log(remark)
                if (remark.includes("京豆")) {
                    p.award(remark, 'bean')
                }
                await this.wait(1000)
            }
            p.info.work = true
        }
        else {
            p.err("没有获取到buyerNickr")
        }
    }
}

