import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: "京东天天领豆",
            crontab: 4,
            model: 'user',
            sync: 1,
            prompt: {
                activityId: '活动id1|id2'
            },
            delay: 800,
            interval: 2000,
            verify: 1
        }
    }

    async prepare() {
        await this.field('activityId')
    }

    async main(p) {
        let user = p.data.user
        let home = await this.curl({
                'url': `https://api.m.jd.com/`,
                'form': `functionId=deliverySign_home&appid=signed_wh5_ihub&body={"activityId":"${p.context.activityId}"}&client=apple&clientVersion=13.2.8&d_model=&osVersion=15.1.1`,
                user,
                algo: {
                    appId: 'e88fd'
                }
            }
        )
        if (this.haskey(home, 'data.bizCode', -102)) {
            p.info.jump = true
        }
        if (this.haskey(home, 'data.result.bubbleList')) {
            for (let i of home.data.result.bubbleList) {
                if (i.status == 1) {
                    let sign = await this.curl({
                            'url': `https://api.m.jd.com/`,
                            'form': `functionId=deliverySign_sign&appid=signed_wh5_ihub&body={"activityId":"${p.context.activityId}"}&client=apple&clientVersion=13.2.8&d_model=&osVersion=15.1.1`,
                            user,
                            algo: {
                                appId: 'e88fd'
                            }
                        }
                    )
                    if (this.haskey(sign, 'data.result.value')) {
                        p.msg(`京豆: ${sign.data.result.value}`)
                    }
                    else {
                        p.log(this.haskey(sign, 'data.bizMsg') || sign)
                    }
                    let reward = await this.curl({
                            'url': `https://api.m.jd.com/`,
                            'form': `functionId=deliverySign_continue_award&appid=signed_wh5_ihub&body={"activityId":"${p.context.activityId}"}&client=apple&uuid=674ce0d97511f5ed054c3dc0af093b3b245ab68d&clientVersion=13.2.8&d_model=&osVersion=15.1.1`,
                            user,
                            algo: {
                                appId: 'e88fd'
                            }
                        }
                    )
                    if (this.haskey(reward, 'data.result.value')) {
                        p.msg(`京豆: ${reward.data.result.value}`)
                        p.info.work = true
                    }
                }
                else {
                    if (this.haskey(i, 'status', 2)) {
                        p.info.work = true
                    }
                    p.log("暂不可做:", i.text)
                }
            }
        }
        else {
            p.log("没有获取到数据...")
        }
    }
}

