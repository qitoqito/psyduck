import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东领京豆',
            round: 2,
            crontab: 3,
            model: 'user'
        }
    }

    async prepare() {
        let feeds = await this.curl({
                'url': `https://api.m.jd.com/client.action?functionId=homeFeedsList&body={"page":1,"appid":"fd4bb","needSecurity":true,"bizId":"active","pageId":"JingDou_SceneHome"}&appid=signed_wh5&client=apple&clientVersion=11.8.2&networkType=wifi&osVersion=11.4&screen=320*504&uuid=434e858e755c9b1ec6e6d6abc0348d9b6d985300&openudid=434e858e755c9b1ec6e6d6abc0348d9b6d985300&d_model=iPhone8,4`,
                algo: {
                    appId: "fd4bb",
                }
            }
        )
        if (this.haskey(feeds, 'data.feedsList')) {
            this.code = (this.column(feeds.data.feedsList, 'skuId'))
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        if (context.round == 1) {
            let uuid = this.md5(user)
            for (let i of this.code) {
                p.log(`正在浏览任务`)
                let task = await this.curl({
                        url: `https://api.m.jd.com/client.action?functionId=beanHomeTask&body={"skuId":"${i}","awardFlag":false,"type":"1","source":"feeds","scanTime":${new Date().getTime()}}&appid=ld&client=apple&clientVersion=12.3.4&networkType=wifi&osVersion=15.1.1&loginType=2&screen=390*753&uuid=${uuid}&openudid=${uuid}&d_model=iPhone13,3&jsonp=jsonp_1691746000054_62149`,
                        user,
                        algo: {
                            expire: {
                                code: "3"
                            }
                        }
                    }
                )
                if (!this.haskey(task, 'data')) {
                    p.log(this.haskey(task, 'errorMessage'))
                    if (this.haskey(task, "errorCode", ['HT201', 'HT205'])) {
                        p.info.work = true
                    }
                    break
                }
                else {
                    p.log(`正在浏览任务[${task.data.taskProgress}/${task.data.taskThreshold}]`)
                }
                if (this.haskey(task, 'data.taskProgress') == this.haskey(task, 'data.taskThreshold')) {
                    p.log(`浏览任务完成,正在抽奖`)
                    let reward = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=beanHomeTask&body=${this.dumps({
                                "awardFlag": true,
                                "source": "feeds"
                            })}&appid=ld&client=apple&clientVersion=12.3.4&networkType=wifi&osVersion=15.1.1&loginType=2&screen=390*753&uuid=${uuid}&openudid=${uuid}&d_model=iPhone13,3&jsonp=jsonp_1691746000054_62149`,
                            user
                        }
                    )
                    if (this.haskey(reward, 'data')) {
                        p.info.work = true
                        if (reward.data.beanNum) {
                            p.msg(`京豆: ${reward.data.beanNum}`)
                        }
                    }
                    break
                }
                await this.wait(2000)
            }
        }
        else {
            let signBeanAct = await this.curl({
                    'url': "https://api.m.jd.com/",
                    'form': `functionId=signBeanAct&body={}&appid=signed_wh5_ihub&client=apple&screen=414*896&networkType=wifi&openudid=60f0226f67be77007d7dc5817801e282dda1211e&uuid=60f0226f67be77007d7dc5817801e282dda1211e&clientVersion=12.3.5&d_model=0-2-999&osVersion=15.6.1`,
                    user,
                    algo: {
                        appId: '9d49c',
                        expire: {
                            code: "3"
                        }
                    },
                }
            )
            let status = this.haskey(signBeanAct, 'data.status')
            if (status == '2') {
                p.info.work = true
                p.log("已签到...")
            }
            else if (status == '1') {
                if (this.haskey(signBeanAct, 'data.dailyAward.beanAward.beanCount')) {
                    p.msg(`京豆: ${signBeanAct.data.dailyAward.beanAward.beanCount}`)
                }
                else if (this.haskey(signBeanAct, 'data.continuityAward.beanAward.beanCount')) {
                    p.msg(`京豆: ${signBeanAct.data.continuityAward.beanAward.beanCount}`)
                }
                p.info.work = true
            }
            else {
                p.err(signBeanAct)
            }
        }
    }
}

