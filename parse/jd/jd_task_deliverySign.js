import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: "京东天天领豆",
            crontab: 4,
            sync: 1,
            prompt: {
                activityId: '活动id1|id2'
            },
            delay: 800,
            interval: 2000,
            verify: 1,
            headers: {
                referer: 'https://pro.m.jd.com/mall/active/2dFZxAZeNGpViWwEb5P9J1SE8e2q/index.html'
            }
        }
    }

    async prepare() {
        await this.field('activityId')
    }

    async main(p) {
        let user = p.data.user
        let context = p.context
        let sign = await this.curl({
                'url': `https://api.m.jd.com/api`,
                'form': `functionId=bean_deliverySign_sign&appid=signed_wh5_ihub&body={"activityId":"${context.activityId}"}&rfs=0000&client=apple&uuid=&build=169743&clientVersion=15.0.25&d_model=&osVersion=15.1.1`,
                user,
                algo: {
                    expire: {
                        'data.bizCode': -102
                    },
                    appId: 'e88fd'
                }
            }
        )
        let bizCode = this.haskey(sign, 'data.bizCode')
        if (this.haskey(sign, 'data.result.value')) {
            p.info.work = true
            // p.msg(`京豆: ${sign.data.result.value}`)
            p.award(sign.data.result.value, 'bean')
        }
        else if (bizCode == -2002) {
            p.info.work = true
            p.log("您已经签到过了")
        }
        else {
            p.log(sign)
        }
        let s = await this.curl({
                'form': `functionId=bean_deliverySign_continue_award&appid=signed_wh5_ihub&body={"activityId":"${context.activityId}"}&rfs=0000&client=apple&uuid=&build=169743&clientVersion=15.0.25&d_model=&osVersion=15.1.1`,
                algo: {
                    appId: '0cc57'
                },
                user
            }
        )
        if (this.haskey(s, 'data.result.value')) {
            p.award(s.data.result.value, 'bean')
        }
    }
}

