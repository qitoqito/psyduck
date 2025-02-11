import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东微信群领红包',
            crontab: 3,
            headers: {
                referer: 'https://servicewechat.com/wx91d27dbf599dff74/785/page-frame.html'
            },
            sync: 1,
            interval: 1000
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let reward = await this.curl({
                'url': `https://api.m.jd.com/groupHb/reward?g_ty=ls&g_tk=1084416199`,
                'form': `loginType=11&clientType=wxapp&client=apple&clientVersion=10.13.240&build=&osVersion=iOS%2015.1.1&screen=390*844&networkType=wifi&d_brand=iPhone&appid=hot_channel&functionId=miniShake_groupHbReward&sign=&t=1738400991624&body={"gid":"${context.gid}","activityId":"${context.activityId}"}&loginWQBiz=mpmsku&channel=http-direct&partner=&forcebot=`,
                user,
                algo: {
                    appId: "050fc",
                    expire: {
                        'subCode': 102
                    }
                },
                ua: 'wechat'
            }
        )
        let subCode = this.haskey(reward, 'subCode')
        if (subCode == 1008) {
            p.info.work = true
            p.log('你已经领取过啦!')
        }
        else if (subCode == 0) {
            p.info.work = true
            p.msg(`${reward.data.rewardDesc}: ${reward.data.rewardAmount}`)
        }
        else if (subCode == 1006) {
            p.info.finish = true
            p.log("你今天的红包领取次数已经达上限啦!")
        }
        else if (subCode == 2004) {
            p.info.jump = true
            p.log("黑号无法获取红包")
        }
        else {
            p.log(reward)
        }
    }
}

