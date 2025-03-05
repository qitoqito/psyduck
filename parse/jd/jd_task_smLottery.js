import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东超市抽奖',
            interval: 2000
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let channel = await this.curl({
                'url': `https://api.m.jd.com/atop_channel_lottery`,
                'form': `appid=jd-super-market&t=1741167447509&functionId=atop_channel_lottery&client=m&body={"bizCode":"cn_retail_jdsupermarket","scenario":"sign","babelChannel":"ttt1","isJdApp":"1","isWx":"0"}`,
                user
            }
        )
        if (this.haskey(channel, 'data.floorData.items')) {
            let dotime = this.haskey(channel, 'data.floorData.items')[0].creditInfo.remainingCostBetTimes
            console.log("抽奖次数:", dotime)
            for (let i of Array(parseInt(dotime / 5))) {
                let lottery = await this.curl({
                        'url': `https://api.m.jd.com/atop_channel_lottery_combo_bet`,
                        'form': `appid=jd-super-market&t=1741167426647&functionId=atop_channel_lottery_combo_bet&client=m&body={"bizCode":"cn_retail_jdsupermarket","scenario":"sign","babelChannel":"ttt1","isJdApp":"1","isWx":"0"}`,
                        user,
                        algo: {
                            appId: '5a93c'
                        }
                    }
                )
                if (this.haskey(lottery, 'data.floorData.items')) {
                    for (let j of lottery.data.floorData.items[0].rewards) {
                        if (j.rewardType != -1) {
                            p.msg(j.rewardName)
                        }
                    }
                    p.info.work = true
                }
                else {
                    console.log("抽奖错误:", lottery)
                    break
                }
                await this.wait(3000)
            }
        }
        else {
            p.log("错误了:", channel)
        }
    }
}

