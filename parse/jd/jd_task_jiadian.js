import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东家电家居超级抓抓机',
            crontab: 3,
            help: 'main',
            sync: 1,
            verify: 1
        }
    }

    async prepare() {
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
        let info = await this.curl({
                'form': `appid=home-channel&functionId=queryInteractiveInfo&body={"encryptProjectId":"${context.encryptProjectId}","sourceCode":"ace454250"}`,
                user,
                algo: {
                    appId: "74333"
                }
            }
        )
        let lotteryId = null
        let status = 1
        for (let i of this.haskey(info, 'assignmentList')) {
            if (i.completionFlag) {
                p.log(`任务已经完成: ${i.assignmentName}`)
            }
            else if (i.assignmentName.includes("邀请")) {
                if (this.haskey(i, 'ext.assistTaskDetail.itemId')) {
                    await this.setTemp(user, i.ext.assistTaskDetail.itemId, 10000000)
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
                            'form': `appid=home-channel&functionId=home.zzj.DoTask.finishTask&body={"encryptAssignmentId":"${i.encryptAssignmentId}","itemId":"${itemId}","encryptProjectId":"${context.encryptProjectId}"}`,
                            user,
                            algo: {
                                appId: '74333',
                                expire: {
                                    "code": 3,
                                }
                            }
                        }
                    )
                }
            }
            else if (i.assignmentName == '抓抓机') {
                lotteryId = i.encryptAssignmentId
            }
            else if (i.assignmentDesc.match(/duihuan/)) {
            }
            else {
                status = 0
                p.log(`正在运行: ${i.assignmentName}`)
                if ([0, 3, 4, 1].includes(i.assignmentType)) {
                    let extraType = i.ext.extraType
                    if (this.haskey(i, `ext.${i.ext.extraType}`)) {
                        let extra = i.ext[extraType]
                        if (extraType == 'sign1') {
                            status = 1
                        }
                        else if (extraType == 'assistTaskDetail') {
                            status = 1
                        }
                        else {
                            for (let j of extra.slice(0, i.assignmentTimesLimit)) {
                                if (['shoppingActivity', 'productsInfo', 'browseShop', 'addCart', 'followShop', 'followChannel'].includes(extraType)) {
                                    let fi = await this.curl({
                                            url: "https://api.m.jd.com/client.action?functionId=home.zzj.DoTask.finishTask",
                                            'form': `appid=home-channel&functionId=home.zzj.DoTask.finishTask&body=${this.dumps(
                                                {
                                                    "encryptAssignmentId": i.encryptAssignmentId,
                                                    "itemId": j.itemId,
                                                    "encryptProjectId": context.encryptProjectId
                                                }
                                            )}`,
                                            user, algo: {
                                                appId: '74333',
                                                expire: {
                                                    "code": 3,
                                                },
                                                error: {
                                                    code: 10003,
                                                },
                                            }
                                        }
                                    )
                                    if (this.haskey(fi, 'data.subCode', '1403')) {
                                        p.log(fi.data.msg)
                                        return
                                    }
                                    if (this.haskey(fi, 'code', 10003)) {
                                        p.log(fi.msg)
                                        break
                                    }
                                    p.log("获得金币:", this.haskey(fi, 'data.rewardsDetail'))
                                    status = 1
                                    await this.wait(1000)
                                }
                            }
                        }
                    }
                    else {
                        let fi = await this.curl({
                                'url': `https://api.m.jd.com/client.action?functionId=home.zzj.DoTask.finishTask`,
                                'form': `appid=home-channel&functionId=home.zzj.DoTask.finishTask&body=${this.dumps(
                                    {
                                        "encryptAssignmentId": i.encryptAssignmentId,
                                        "itemId": 1,
                                        "encryptProjectId": context.encryptProjectId
                                    }
                                )}`,
                                user,
                                algo: {
                                    appId: '74333',
                                    expire: {
                                        "code": 3,
                                    },
                                    error: {
                                        code: 10003,
                                    }
                                }
                            }
                        )
                        if (this.haskey(fi, 'data.subCode', '1403')) {
                            p.log(fi.data.msg)
                            return
                        }
                        if (this.haskey(fi, 'code', 10003)) {
                            p.log(fi.msg)
                            break
                        }
                        p.log("获得金币:", this.haskey(fi, 'data.rewardsDetail'))
                        status = 1
                    }
                }
                else {
                    // console.log(i)
                    let fi = await this.curl({
                            'url': `https://api.m.jd.com/client.action`,
                            'form': `appid=home-channel&functionId=home.zzj.DoTask.finishTask&body=${this.dumps(
                                {
                                    "encryptAssignmentId": i.encryptAssignmentId,
                                    "itemId": 1,
                                    "encryptProjectId": context.encryptProjectId
                                }
                            )}`,
                            user, algo: {
                                appId: '74333',
                                expire: {
                                    "code": 3,
                                },
                                error: {
                                    code: 10003,
                                }
                            }
                        }
                    )
                    if (this.haskey(fi, 'data.subCode', '1403')) {
                        p.log(fi.data.msg)
                        return
                    }
                    if (this.haskey(fi, 'code', 10003)) {
                        p.log(fi.msg)
                        break
                    }
                    p.log("获得金币:", this.haskey(fi, 'data.rewardsDetail'))
                    status = 1
                    await this.wait(1000)
                }
            }
        }
        if (status) {
            p.info.work = true
        }
    }
}

