import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东超市',
            crontab: 4,
            help: 'main'
        }
    }

    async prepare() {
        this.shareCode({
            id: '3nh7HzSjYemGqAHSbktTrf8rrH8M'
        })
        for (let user of this.help) {
            let itemId = await this.getTemp(user)
            if (itemId) {
                this.dict[user] = itemId
            }
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        if (this.turnCount == 0) {
            var html = await this.curl({
                    'url': `https://pro.m.jd.com/mall/active/${context.id}/index.html?stath=20&navh=44&babelChannel=ttt1&tttparams=zZ1qguleyJnTGF0IjozOS45NjEwNTQsInVuX2FyZWEiOiIxXzI4MDBfNTU4MzhfMCIsImRMYXQiOiIiLCJwcnN0YXRlIjoiMCIsImFkZHJlc3NJZCI6IjUzODg3NDg3NyIsImxhdCI6IiIsInBvc0xhdCI6MzkuOTYxMDU0LCJwb3NMbmciOjExNi4zMjIwNjEsImdwc19hcmVhIjoiMF8wXzBfMCIsImxuZyI6IiIsInVlbXBzIjoiMC0wLTAiLCJnTG5nIjoxMTYuMzIyMDYxLCJtb2RlbCI6ImlQaG9uZTEzLDMiLCJkTG5nIjoiIn70=`,
                    user,
                    referer: 'https://pro.m.jd.com/mall/active/3nh7HzSjYemGqAHSbktTrf8rrH8M/index.html'
                }
            )
            let react = this.jsonParse(this.match([/__react_data__\s*=\s*(.*?)\s*;\n+/,], html))
            let signToken = this.match(/"signToken"\s*:\s*"(\w+)"/, html)
            let status = 0
            if (signToken) {
                let sign = await this.curl({
                        'url': `https://api.m.jd.com/atop_channel_sign_in`,
                        'form': `appid=jd-super-market&t=1713230766545&functionId=atop_channel_sign_in&client=m&uuid=de21c6604748f97dd3977153e51a47f4efdb9a47&body={"signToken":"${signToken}","channelFollowStatus":1,"bizCode":"cn_retail_jdsupermarket","scenario":"sign","babelChannel":"ttt1","isJdApp":"1","isWx":"0"}`,
                        user,
                        algo: {
                            appId: 'b8fc7',
                            expire: {
                                "code": "11001"
                            }
                        }
                    }
                )
                if (this.haskey(sign, 'success')) {
                    status = 1
                    p.log(`签到成功`)
                    for (let i of sign.data.rewards) {
                        p.log(`获得: ${i.rewardDesc}`)
                    }
                }
                else if (this.haskey(sign, "code", "14013")) {
                    p.log(`您今天已经签过到了`)
                    status = 1
                }
                else {
                    p.log(this.haskey(sign, 'message') || sign)
                }
            }
            var data = {}
            if (this.haskey(react, 'activityData.floorList')) {
                data = react.activityData
            }
            for (let ii in data) {
                if (ii == 'floorList') {
                    for (let jj of data[ii]) {
                        if (jj.providerData && this.haskey(jj, 'providerData.data.floorData.name') == '汪贝任务楼层') {
                            let floor = jj.providerData.data.floorData
                            for (let i of floor.items) {
                                status = 0
                                if (i.completionFlag) {
                                    status = 1
                                    p.log(`任务已经完成: ${i.assignmentName}`)
                                }
                                else {
                                    p.log(`正在运行: ${i.assignmentName}`)
                                    let extraType = i.ext.extraType
                                    if (i.assignmentName.includes('邀请')) {
                                        status = 1
                                        if (this.haskey(i, 'ext.assistTaskDetail.itemId')) {
                                            await this.setTemp(user, i.ext.assistTaskDetail.itemId, 86400000)
                                        }
                                        // let users = Object.keys(this.dict)
                                        // if (users) {
                                        //     let itemId = ''
                                        //     this.n++
                                        //     itemId = this.dict[users[this.n % users.length]]
                                        //     let help = await this.curl({
                                        //             'form': `appid=jd-super-market&t=1742122986378&functionId=atop_channel_complete_task&client=m&body={"bizCode":"cn_retail_jdsupermarket","scenario":"sign","assignmentType":"${i.assignmentType}","encryptAssignmentId":"${i.encryptAssignmentId}","itemId":"${itemId}","assistFlag":true,"babelChannel":"ttt1","isJdApp":"1","isWx":"0"}`,
                                        //             user
                                        //         }
                                        //     )
                                        // }
                                    }
                                    else if (this.haskey(i, `ext.${i.ext.extraType}`)) {
                                        let extra = i.ext[extraType]
                                        try {
                                            for (let j of extra.slice(0, i.assignmentTimesLimit)) {
                                                if (['shoppingActivity', 'productsInfo', 'browseShop'].includes(extraType)) {
                                                    let d = await this.curl({
                                                            'url': `https://api.m.jd.com/client.action`,
                                                            'form': `appid=jd-super-market&body=${this.dumps(
                                                                {
                                                                    "bizCode": "cn_retail_jdsupermarket",
                                                                    "scenario": "sign",
                                                                    "assignmentType": i.assignmentType,
                                                                    "encryptAssignmentId": i.encryptAssignmentId,
                                                                    "itemId": j.itemId || j.advId,
                                                                    "actionType": 1,
                                                                    "babelChannel": "ttt1",
                                                                    "isJdApp": "0",
                                                                    "isWx": "0"
                                                                }
                                                            )}&sign=11&t=1653132222710&client=m&functionId=atop_channel_complete_task`,
                                                            user,
                                                            algo: {
                                                                appId: '51113'
                                                            },
                                                            // ciphers: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384'
                                                        }
                                                    )
                                                    p.log(this.haskey(d, 'data.msg') || this.haskey(d, 'message'))
                                                    await this.wait((i.ext.waitDuration || 0) * 1000 + 500)
                                                }
                                                let s = await this.curl({
                                                        'url': `https://api.m.jd.com/client.action`,
                                                        'form': `appid=jd-super-market&body=${this.dumps(
                                                            {
                                                                "bizCode": "cn_retail_jdsupermarket",
                                                                "scenario": "sign",
                                                                "assignmentType": i.assignmentType,
                                                                "encryptAssignmentId": i.encryptAssignmentId,
                                                                "itemId": j.itemId || j.advId,
                                                                "babelChannel": "ttt1",
                                                                "isJdApp": "0",
                                                                "isWx": "0"
                                                            }
                                                        )}&sign=11&t=1653132222710&client=m&functionId=atop_channel_complete_task`,
                                                        user, algo: {
                                                            appId: '51113'
                                                        },
                                                    }
                                                )
                                                p.log(i.assignmentName, this.haskey(s, 'data.msg') || this.haskey(s, 'message'))
                                                if (this.haskey(s, 'message', '风险等级未通过')) {
                                                    return
                                                }
                                                if (this.haskey(s, 'message', '活动太火爆了')) {
                                                    break
                                                }
                                                if (this.haskey(s, 'data.doTaskRewardsInfo.successRewards')) {
                                                    for (let kkk in s.data.doTaskRewardsInfo.successRewards) {
                                                        for (let kkkk of s.data.doTaskRewardsInfo.successRewards[kkk]) {
                                                            p.log(`获得:`, kkkk.quantity, kkkk.rewardName)
                                                        }
                                                    }
                                                    status = 1
                                                }
                                                await this.wait(1000)
                                            }
                                        } catch (e) {
                                            p.log(e)
                                        }
                                    }
                                    else {
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (status) {
                p.info.work = true
            }
        }
    }
}
