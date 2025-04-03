import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东领京豆',
            turn: 3,
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
        else {
            this.code = [
                '100124947609',
                '10113472733713',
                '10111336292831',
                '100043430641',
                '100061222266',
                '100042916006',
                '100072438118',
                '100116209250',
                '100135636960',
                '100010459381'
            ]
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        if (this.turnCount == 1) {
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
                            // p.msg(`京豆: ${reward.data.beanNum}`)
                            p.award(reward.data.beanNum, 'bean')
                        }
                    }
                    break
                }
                await this.wait(2000)
            }
        }
        else if (this.turnCount == 2) {
            let list = await this.curl({
                    'url': `https://api.m.jd.com/client.action`,
                    'form': `functionId=beanTaskList&body={"beanVersion":1,"newList":"1","lng":"0.000000","lat":"0.000000","imei":"${this.sha1(user)}","prstate":"0","aid":"","oaid":"","idfa":"","uuid":"","op_type":1,"app_info":"390*676^iPhone13,3^apple^15.1.1^15.0.25^wifi","location_info":""}&appid=ld&client=apple&screen=390*676&networkType=wifi&clientVersion=15.0.25&d_model=0-2-999&osVersion=15.1.1`,
                    user
                }
            )
            let status = 0
            let counts = [0]
            for (let i of this.haskey(list, 'data.taskInfos')) {
                if (i.status != 2) {
                    counts.push(i.maxTimes - i.times)
                }
            }
            for (let _ of Array.from({length: Math.max(...counts)}, (_, index) => index)) {
                for (let i of this.haskey(list, 'data.taskInfos')) {
                    if (i.status == 2) {
                        if (_ == 0) {
                            status = 1
                            p.log("任务已完成:", i.taskName)
                        }
                    }
                    else {
                        p.log("正在运行:", i.taskName)
                        status = 0
                        if (i.taskType == 9) {
                            let doTask = await this.curl({
                                    'url': `https://api.m.jd.com/client.action`,
                                    'form': `functionId=beanDoTask&body={"actionType":1,"taskToken":"${i.subTaskVOS[0].taskToken}"}&appid=signed_wh5_ihub&client=apple&screen=390*676&networkType=wifi&openudid=&uuid=&clientVersion=15.0.25&d_model=0-2-999&osVersion=15.1.1`,
                                    user
                                }
                            )
                            if (!this.haskey(doTask, 'data')) {
                                p.log(this.haskey(doTask, 'errorMessage') || doTask)
                                continue
                            }
                            if (i.waitDuration) {
                                p.log("等待:", i.waitDuration)
                                await this.wait(i.waitDuration * 1000)
                            }
                            let reward = await this.curl({
                                    'url': `https://api.m.jd.com/client.action`,
                                    'form': `functionId=beanDoTask&body={"actionType":0,"taskToken":"${i.subTaskVOS[0].taskToken}"}&appid=signed_wh5_ihub&client=apple&screen=390*676&networkType=wifi&openudid=&uuid=&clientVersion=15.0.25&d_model=0-2-999&osVersion=15.1.1`,
                                    user
                                }
                            )
                            if (this.haskey(reward, 'data')) {
                                status = 1
                                p.log(reward.data.bizMsg)
                            }
                            else {
                                p.log(reward)
                            }
                            await this.wait(2000)
                        }
                        else {
                            let info = this.haskey(i, ['subTaskVOS.0', 'simpleRecordInfoVo'])
                            let reward = await this.curl({
                                    'url': `https://api.m.jd.com/client.action`,
                                    'form': `functionId=beanDoTask&body={"actionType":0,"taskToken":"${info.taskToken}"}&appid=signed_wh5_ihub&client=apple&screen=390*676&networkType=wifi&openudid=&uuid=&clientVersion=15.0.25&d_model=0-2-999&osVersion=15.1.1`,
                                    user
                                }
                            )
                            if (this.haskey(reward, 'data')) {
                                status = 1
                                p.log(reward.data.bizMsg)
                            }
                            else {
                                p.log(reward)
                            }
                            await this.wait(2000)
                        }
                    }
                }
                list = await this.curl({
                        'url': `https://api.m.jd.com/client.action`,
                        'form': `functionId=beanTaskList&body={"beanVersion":1,"newList":"1","lng":"0.000000","lat":"0.000000","imei":"${this.sha1(user)}","prstate":"0","aid":"","oaid":"","idfa":"","uuid":"","op_type":1,"app_info":"390*676^iPhone13,3^apple^15.1.1^15.0.25^wifi","location_info":""}&appid=ld&client=apple&screen=390*676&networkType=wifi&clientVersion=15.0.25&d_model=0-2-999&osVersion=15.1.1`,
                        user
                    }
                )
            }
            if (status && list) {
                p.info.work = true
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
                    // p.msg(`京豆: ${signBeanAct.data.dailyAward.beanAward.beanCount}`)
                    p.award(signBeanAct.data.dailyAward.beanAward.beanCount, 'bean')
                }
                else if (this.haskey(signBeanAct, 'data.continuityAward.beanAward.beanCount')) {
                    // p.msg(`京豆: ${signBeanAct.data.continuityAward.beanAward.beanCount}`)
                    p.award(signBeanAct.data.continuityAward.beanAward.beanCount, 'bean')
                }
                p.info.work = true
            }
            else {
                p.err(signBeanAct)
            }
        }
    }
}

