import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东有奖投票',
            crontab: 3
        }
    }

    async prepare() {
        let today = new Date();
        let year = today.getFullYear();
        let month = String(today.getMonth() + 1).padStart(2, '0');
        let day = String(today.getDate()).padStart(2, '0');
        let dateStr = `${year}-${month}-${day}`;
        for (let i of Array(3)) {
            let rank = await this.curl({
                    'form': `functionId=hc_boss_queryBossRanking&body={"type":2,"rankingDay":"${dateStr}"}&appid=home-marketing&client=apple&&clientVersion=15.1.53`,
                    cookie: this.tester()
                }
            )
            if (this.haskey(rank, 'data.bossRankingInfo')) {
                this.code = rank.data.bossRankingInfo
                break
            }
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let info = await this.curl({
                'form': `appid=home-marketing&body={}&client=apple&clientVersion=15.1.53&functionId=hc_boss_queryInteractiveInfo`,
                user,
                algo: {
                    appId: '91a93',
                    expire: {
                        "code": 3,
                    }
                }
            }
        )
        let list = this.haskey(info, 'data.0.assignmentList') || []
        for (let i of list) {
            if (i.completionFlag) {
                p.log("任务完成:", i.assignmentName)
            }
            else if (i.assignmentName.includes("浏览")) {
                let activity = i.ext.shoppingActivity
                activity.reverse()
                for (let j = 0; j<(i.assignmentTimesLimit - i.completionCnt); j++) {
                    let data = activity[j]
                    p.log("正在浏览:", data.title)
                    let doIt = await this.curl({
                            'form': `functionId=hc_boss_doInteractiveAssignment&body={"type":4,"encryptAssignId":"${i.encryptAssignmentId}","itemId":"${data.itemId}","actionType":1,"jumpUrl":"${encodeURIComponent(data.url)}"}&appid=home-marketing&loginType=2&client=apple&osVersion=15.1.1&networkType=wifi&d_model=iPhone13%2C3&d_brand=iPhone&screen=390%2A844&openudid=a0114d4ed52e4588aa38c141909565afecb81298&clientVersion=15.1.53`,
                            user,
                            algo: {
                                appId: '91a93'
                            }
                        }
                    )
                    let suc = this.haskey(doIt, 'success')
                    if (suc) {
                        if (i.ext.waitDuration) {
                            p.log('正在等待: ', i.ext.waitDuration)
                            await this.wait(i.ext.waitDuration * 1000)
                        }
                        let award = await this.curl({
                                'form': `functionId=hc_boss_doInteractiveAssignment&body={"type":4,"encryptAssignId":"${i.encryptAssignmentId}","itemId":"${data.itemId}","actionType":0,"jumpUrl":"${encodeURIComponent(data.url)}"}&appid=home-marketing&loginType=2&client=apple&osVersion=15.1.1&networkType=wifi&d_model=iPhone13%2C3&d_brand=iPhone&screen=390%2A844&openudid=a0114d4ed52e4588aa38c141909565afecb81298&clientVersion=15.1.53`,
                                user,
                                algo: {
                                    appId: '91a93'
                                }
                            }
                        )
                        if (this.haskey(award, 'data.rewardsInfo.successRewards.1')) {
                            p.log(`获得人气值:`, award.data.rewardsInfo.successRewards[1].quantity);
                        }
                        else {
                            p.log(this.haskey(award, 'msg'))
                        }
                    }
                }
            }
        }
        if (this.code) {
            let s = await this.curl({
                    'form': `functionId=hc_boss_queryFloatBar&body=%7B%7D&appid=home-marketing&client=apple&osVersion=15.1.1&networkType=wifi&d_model=iPhone13,3&d_brand=iPhone&screen=390*844&clientVersion=15.1.53`,
                    user
                }
            )
            let remainBuff = this.haskey(s, 'data.remainBuff') || 0
            if (remainBuff && this.code) {
                for (let i of this.code) {
                    let f = remainBuff>=50 ? 50 : remainBuff
                    remainBuff -= f
                    p.log("正在投票:", i.bossInfo.bossName)
                    let vote = await this.curl({
                            'form': `functionId=hc_boss_vote&body={"bossId":${i.bossInfo.bossId},"votes":${f}}&appid=home-marketing&client=apple&osVersion=15.1.1&networkType=wifi&d_model=iPhone13,3&d_brand=iPhone&screen=390*844&openudid=a0114d4ed52e4588aa38c141909565afecb81298&clientVersion=15.1.53`,
                            user
                        }
                    )
                    if (this.haskey(vote, 'data.voteCount')) {
                        p.log("总共投票:", vote.data.voteCount)
                    }
                    if (remainBuff<=0) {
                        break
                    }
                    await this.wait(2000)
                }
            }
            s = await this.curl({
                    'form': `functionId=hc_boss_queryFloatBar&body=%7B%7D&appid=home-marketing&client=apple&osVersion=15.1.1&networkType=wifi&d_model=iPhone13,3&d_brand=iPhone&screen=390*844&clientVersion=15.1.53`,
                    user
                }
            )
            remainBuff = this.haskey(s, 'data.remainBuff')
            if (remainBuff == 0) {
                p.info.work = true
            }
        }
    }
}

