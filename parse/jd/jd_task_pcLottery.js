import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东网页天天抽奖',
            crontab: 3,
            headers: {
                referer: 'https://bean.jd.com/myJingBean/list',
                'user-agent': "Mozilla/5.0(WindowsNT10.0;Win64;x64)AppleWebKit/537.36(KHTML,likeGecko)Chrome/" + 59 + Math.round(Math.random() * 10) + ".0.3497." + Math.round(Math.random() * 100) + "Safari/537.36",
            },
            interval: 2000
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let status = 0
        let extend = `uuid=${this.uuid(22, 'n')}&area=16_${this.rand(1000, 1300)}_${this.rand(1000, 1300)}_${this.rand(1, 19)}&loginType=2&t=${new Date().getTime()}`
        let query = await this.curl({
                'url': `https://api.m.jd.com/?appid=pc_interact_center&body={"type":1}&client=pc&clientVersion=1.0.0&functionId=pc_interact_assign_query`,
                user,
                algo: {
                    appId: '9a92f',
                    expire: {
                        "code": "3"
                    }
                },
                extend
            }
        )
        for (let i of this.haskey(query, 'data.assignmentInfoList')) {
            if (i.completionCnt == i.timesLimit) {
                p.log("任务已完成:", i.name)
                status = 1
            }
            else if (i.extraType == 'order') {
            }
            else {
                if (i.extraType == 'sign') {
                    let execute = await this.curl({
                            'form': `functionId=pc_interact_assign_execute&body={"eaId":"TLBebEJwk4ADHLtRfDsRcV4UvS1","type":5,"itemId":"1","extraType":"sign","rk":false,"actionType":1}&appid=pc_interact_center&clientVersion=1.0.0&client=pc`,
                            user,
                            algo: {
                                appId: '9a92f'
                            },
                            extend
                        }
                    )
                }
                else {
                    p.log("正在浏览:", i.name)
                    // console.log(i)
                    status = 0
                    let list = i[Object.keys(i).filter(d => (typeof i[d] == 'object' && d != 'rewards'))[0]]
                    for (let j = 0; j<i.timesLimit; j++) {
                        if (list[j].status == 1) {
                            let d = await this.curl({
                                    'form': `functionId=pc_interact_assign_execute&body={"eaId":"${i.id}","type":${i.type},"itemId":"${list[j].itemId}","extraType":"${i.extraType}","rk":false,"actionType":1}&appid=pc_interact_center&clientVersion=1.0.0&client=pc`,
                                    user,
                                    algo: {
                                        appId: '9a92f'
                                    },
                                    extend
                                }
                            )
                            let wait = this.match(/(\d+)S/, i.desc)
                            if (wait) {
                                p.log(i.desc)
                                await this.wait(parseInt(wait) * 1000)
                            }
                            let r = await this.curl({
                                    'form': `functionId=pc_interact_assign_execute&body={"eaId":"${i.id}","type":${i.type},"itemId":"${list[j].itemId}","extraType":"${i.extraType}","rk":false,"actionType":0}&appid=pc_interact_center&clientVersion=1.0.0&client=pc`,
                                    user,
                                    algo: {
                                        appId: '9a92f'
                                    },
                                    extend
                                }
                            )
                            if (this.haskey(r, 'data.assignmentRewardInfo')) {
                                status = 1
                            }
                            else if (this.haskey(r, "errCode", "302")) {
                                p.log("任务已完成")
                                status = 1
                            }
                            else {
                                break
                            }
                        }
                    }
                }
            }
        }
        query = await this.curl({
                'url': `https://api.m.jd.com/?appid=pc_interact_center&body={"type":0}&client=pc&clientVersion=1.0.0&functionId=pc_interact_assign_query`,
                user,
                algo: {
                    appId: '9a92f',
                    type: 'wechat'
                },
                extend
            }
        )
        let data = query.data.initCompletionInfo
        let execute = await this.curl({
                'form': `functionId=pc_interact_assign_execute&body={"eaId":"${data.eaId}","type":0,"rk":false}&appid=pc_interact_center&clientVersion=1.0.0&client=pc&t=1742395117338`,
                user,
                algo: {
                    appId: '9a92f'
                },
                extend
            }
        )
        let lotteryDrawInfo = query.data.lotteryDrawInfo
        let isOk = 1
        while (true) {
            isOk = 0
            p.log("抽奖中...")
            let lottery = await this.curl({
                    'form': `appid=pc_interact_center&body={"rk":${lotteryDrawInfo.rk},"eaId":"${lotteryDrawInfo.eaId}","type":${lotteryDrawInfo.type}}&client=pc&clientVersion=1.0.0&functionId=pc_interact_assign_execute`,
                    user,
                    algo: {
                        appId: '9a92f',
                        type: 'wechat'
                    },
                    extend
                }
            )
            let info = this.haskey(lottery, ['data.assignmentRewardInfo'])
            if (this.haskey(lottery, 'errCode', "304")) {
                isOk = 1
                p.log("抽奖次数不足")
                break
            }
            if (!this.haskey(lottery, 'data')) {
                break
            }
            isOk = 1
            for (let j in info) {
                if (j.includes("Rewards")) {
                    for (let z of info[j]) {
                        if (z.rewardDesc.includes("京豆")) {
                            p.award(z.rewardDesc, 'bean')
                        }
                        else if (z.rewardDesc == '红包') {
                            p.award(z.discount, 'redpacket')
                        }
                        else {
                            p.log(`抽奖获得: ${z.rewardDesc}`)
                        }
                    }
                }
            }
            await this.wait(1000)
        }
        if (status && isOk) {
            p.info.work = true
        }
    }
}

