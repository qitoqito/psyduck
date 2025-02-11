import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东社群红包',
            prompt: {
                activityId: "活动id1|id2"
            },
            sync: 1,
            verify: true,
            crontab: 3
        }
    }

    async prepare() {
        await this.field('activityId')
    }

    async main(p) {
        let user = p.data.user;
        let s = await this.curl({
                'url': `https://api.m.jd.com/client.action?functionId=chatReward_doReward&appid=wechat_activity&client=h5&body={"activityId":"${p.context.activityId}"}`,
                user
            }
        )
        let reward = await this.curl({
                'url': `https://api.m.jd.com/client.action?functionId=chatReward_mainPage&appid=wechat_activity&client=h5&body={"activityId":"${p.context.activityId}"}`,
                user,
                algo: {
                    appId: "323f1",
                }
            }
        )
        if (this.haskey(reward, 'data.rewardInfo.rewardValue')) {
            if (reward.data.rewardInfo.rewardType == 1) {
                // p.msg(p.context.activityId)
                p.msg(`红包: ${reward.data.rewardInfo.rewardValue}元`)
            }
            else {
                p.log(`优惠券: ${reward.data.rewardInfo.rewardValue}元`)
            }
        }
        else {
            p.log("什么也没有")
        }
        if (this.haskey(reward, 'data')) {
            p.info.work = true
        }
    }
}

