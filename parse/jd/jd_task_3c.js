import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东3C数码',
            crontab: 4,
            help: 'main'
        }
    }

    async prepare() {
        this.shareCode({
            id: '4SWjnZSCTHPYjE5T7j35rxxuMTb6'
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
        let status = 0
        let isOk
        await this.curl({
                'url': `https://api.m.jd.com/atop_channel_newcomer_interactive_info`,
                'form': `appid=jd-super-market&t=1748874023489&functionId=atop_channel_newcomer_interactive_info&client=m&body={"babelChannel":"ttt32","isJdApp":"1","isWx":"0"}`,
                user,
                algo: {
                    appId: '35fa0',
                    refresh: true
                }
            }
        )
        let info = await this.curl({
                'url': `https://api.m.jd.com/atop_channel_interactive_info`,
                'form': `appid=jd-super-market&t=1748855058331&functionId=atop_channel_interactive_info&client=m&body={"bizCode":"cn_retail_3c_digital","scenario":"sign","babelChannel":"ttt32","isJdApp":"1","isWx":"0"}`,
                user,
                algo: {
                    appId: '33c74'
                }
            }
        )
        let items = this.haskey(info, 'data.floorData.items')
        if (!items) {
            p.err("没有获取到数据")
        }
        for (let i of items) {
            status = 0
            if (i.completionFlag) {
                status = 1
                p.log(`任务已经完成: ${i.assignmentName}`)
                if (i.assignmentName.includes('邀请')) {
                    isOk = 1
                }
            }
            else {
                p.log(`正在运行: ${i.assignmentName}`)
                let extraType = i.ext.extraType
                if (i.assignmentName.includes('邀请')) {
                    status = 1
                    isOk = 0
                    if (this.haskey(i, 'ext.assistTaskDetail.itemId')) {
                        await this.setTemp(user, i.ext.assistTaskDetail.itemId, 86400000)
                    }
                    let users = Object.keys(this.dict)
                    if (users) {
                        let itemId = ''
                        let u = users[this.n % users.length]
                        this.n++
                        if (u == user) {
                            u = users[this.n % users.length]
                        }
                        itemId = this.dict[u]
                        let help = await this.curl({
                                'form': `appid=jd-super-market&t=1742122986378&functionId=atop_channel_complete_task&client=m&body={"bizCode":"cn_retail_3c_digital","scenario":"sign","assignmentType":"${i.assignmentType}","encryptAssignmentId":"${i.encryptAssignmentId}","itemId":"${itemId}","assistFlag":true,"babelChannel":"ttt1","isJdApp":"0","isWx":"1"}`,
                                user,
                                algo: {
                                    appId: '51113'
                                }
                            }
                        )
                        let subCode = this.haskey(help, 'data.subCode')
                        if (subCode == '104') {
                            p.log("您已经助力过了")
                            isOk = 1
                        }
                        else if (subCode == '0') {
                            p.log("助力成功")
                            isOk = 1
                        }
                        if (subCode == '109') {
                            p.log("不能自己给自己助力")
                        }
                    }
                    else {
                        isOk = 1
                    }
                }
                else if (this.haskey(i, `ext.${i.ext.extraType}`)) {
                    let extra = i.ext[extraType]
                    try {
                        for (let j of extra.slice(0, i.assignmentTimesLimit)) {
                            if (['shoppingActivity', 'productsInfo', 'browseShop'].includes(extraType)) {
                                let d = await this.curl({
                                        'form': `appid=jd-super-market&body=${this.dumps(
                                            {
                                                "bizCode": "cn_retail_3c_digital",
                                                "scenario": "sign",
                                                "assignmentType": i.assignmentType,
                                                "encryptAssignmentId": i.encryptAssignmentId,
                                                "itemId": j.itemId || j.advId,
                                                "actionType": 1,
                                                "babelChannel": "ttt1",
                                                "isJdApp": "0",
                                                "isWx": "1"
                                            }
                                        )}&sign=11&t=1653132222710&client=m&functionId=atop_channel_complete_task`,
                                        user,
                                        algo: {
                                            appId: '51113',
                                        }
                                    }
                                )
                                let msg = this.haskey(d, ['data.msg', 'message']) || "'"
                                p.log(msg)
                                if (msg.includes('火爆')) {
                                    return
                                }
                                await this.wait((i.ext.waitDuration || 0) * 1000 + 500)
                            }
                            let s = await this.curl({
                                    'form': `appid=jd-super-market&body=${this.dumps(
                                        {
                                            "bizCode": "cn_retail_3c_digital",
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
                                        appId: '51113',
                                    },
                                }
                            )
                            let message = this.haskey(s, ['data.msg', 'message']) || ""
                            p.log(i.assignmentName, this.haskey(s, 'data.msg') || this.haskey(s, 'message'))
                            if (this.haskey(s, 'message', '风险等级未通过')) {
                                return
                            }
                            if (message.includes("火爆")) {
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

                    }
                }
                else {
                }
            }
        }
        let calendar = await this.curl({
                'url': `https://api.m.jd.com/atop_channel_sign_calendar`,
                'form': `appid=jd-super-market&t=1748931681904&functionId=atop_channel_sign_calendar&client=m&body={"bizCode":"cn_retail_3c_digital","scenario":"sign","babelChannel":"ttt32","isJdApp":"1","isWx":"0"}&clientVersion=15.1.50`,
                user
            }
        )
        if (this.haskey(calendar, 'data.floorData.items')) {
            for (let i of calendar.data.floorData.items) {
                if (i.signToken) {
                    let sign = await this.curl({
                            'url': `https://api.m.jd.com/atop_channel_sign_in`,
                            'form': `appid=jd-super-market&t=1713230766545&functionId=atop_channel_sign_in&client=m&body={"signToken":"${i.signToken}","channelFollowStatus":1,"bizCode":"cn_retail_3c_digital","scenario":"sign","babelChannel":"ttt1","isJdApp":"1","isWx":"0"}`,
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
            }
        }
        if (status) {
            p.info.work = true
        }
    }
}

