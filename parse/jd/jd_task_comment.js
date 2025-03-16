import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东商品自动评价',
            prompt: {
                content: "评语1|评语2"
            },
            keyExpire: 7200
        }
    }

    async prepare() {
        this.code = await this.getField('content')
        if (!this.code) {
            this.jump = true
            this.log("没有评语列表,退出执行!")
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let s = await this.curl({
                'url': `https://api.m.jd.com/client.action`,
                'form': `functionId=getCommentWareList&body={"status":"1","planType":"1","pageIndex":"1","pageSize":"400"}&uuid=487f7b22f68312d2c1bbc93b1aea44&client=apple&clientVersion=10.0.10&st=1741443233685&sv=120&sign=0970e172b1727930982b85d8fe544e3b`,
                user,
                algo: {
                    app: true,
                    expire: {
                        code: "3"
                    }
                }
            }
        )
        let n = this.haskey(s, 'commentWareListInfo.wait4CommentCount')
        let text = []
        if (n) {
            p.log(`总共有:${n}个订单未评价`)
            let page = Math.ceil(parseInt(n) / 20)
            if (parseInt(n) % 10<3 && page>1) {
                page = page - 1
            }
            let q = await this.curl({
                    'url': `https://api.m.jd.com/client.action`,
                    'form': `functionId=getCommentWareList&body={"status":"1","planType":"1","pageIndex":"${page}","pageSize":"20"}&uuid=487f7b22f68312d2c1bbc93&client=apple&clientVersion=10.0.10&st=1741443235375&sv=121&sign=33d8fde4cadbf2c38e52a44a7a1915ee`,
                    user,
                    algo: {
                        app: true,
                    }
                }
            )
            if (this.haskey(q, 'commentWareListInfo.commentWareList')) {
                for (let i of q.commentWareListInfo.commentWareList.reverse().splice(0, 3)) {
                    if (i.ahaInfo) {
                        p.log(`${i.wname}有种草秀活动,跳出自动评价`)
                    }
                    else if (i.jingBeanCounts.length) {
                        p.log(`${i.wname}有评价有礼活动,跳出自动评价`)
                    }
                    else {
                        p.log(`正在评论: ${i.wname}`)
                        let content = this.random(this.code)
                        let pub = await this.curl({
                                'url': `https://api.m.jd.com/api`,
                                'form': `functionId=sendEval&appid=jd-cphdeveloper-m&body=${this.dumps({
                                    "tenantCode": "jgm",
                                    "bizModeClientType": "M",
                                    "bizModeFramework": "H5",
                                    "appId": "m91d27dbf599dff74",
                                    "token": "3852b12f8c4d869b7ed3e2b3c68c9436",
                                    "uuid": this.uuid(26, 'n'),
                                    "externalLoginType": "2",
                                    "productId": i.wareId,
                                    "orderId": i.orderId,
                                    "score": 5,
                                    "content": content,
                                    "commentTagStr": 1,
                                    "userclient": 21,
                                    "imageJson": "",
                                    "anonymous": 1,
                                    "syncsg": 0,
                                    "scence": 101100000,
                                    "videoid": "",
                                    "URL": "",
                                })}`,
                                user,
                                algo: {
                                    appId: 'c397b',
                                    log: true
                                }
                            }
                        )
                        if (this.haskey(pub, 'errMsg', 'success')) {
                            p.msg(`订单: ${i.orderId} 评价成功`)
                            p.log(`开始评价物流服务,等待3秒...`)
                            await this.wait(3000)
                            let wuliu = await this.curl({
                                    'url': `https://api.m.jd.com/api?body=${this.dumps({
                                        "tenantCode": "jgm",
                                        "bizModeClientType": "M",
                                        "bizModeFramework": "H5",
                                        "appId": "m91d27dbf599dff74",
                                        "token": "3852b12f8c4d869b7ed3e2b3c68c9436",
                                        "uuid": "23359972496631655993291202",
                                        "externalLoginType": "2",
                                        "pin": user,
                                        "userclient": 21,
                                        "orderId": i.orderId,
                                        "otype": "0",
                                        "DSR1": 5,
                                        "DSR2": 5,
                                        "DSR3": 5
                                    })}&appid=jd-cphdeveloper-m&functionId=sendDSR&loginType=2&_=1657256643322&g_login_type=0&callback=jsonpCBKD&g_tk=534892547&g_ty=ls&appCode=msd95910c4`,
                                    user,
                                    algo: {
                                        appId: 'c397b'
                                    }
                                }
                            )
                            if (this.haskey(wuliu, 'errMsg', 'success')) {
                                p.msg(`订单: ${i.orderId} 物流评价成功`)
                            }
                            else {
                                p.log(`物流评价失败`)
                            }
                            p.info.work = true
                        }
                        else {
                            p.log(`评价失败`)
                        }
                        p.log("等待8秒,执行下一次评价...")
                        await this.wait(8000)
                    }
                }
            }
        }
        else {
            p.log(`没有待评价订单!`)
        }
    }
}

