import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东超市游戏',
            crontab: 4
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let temp = await this.curl({
                'url': `https://api.m.jd.com/api/meta2GetRoomListByTemplateId`,
                'form': `appid=commonActivity&functionId=meta2GetRoomListByTemplateId&body={"templateId":"793888596"}&t=1713402796644`,
                user,
                algo: {
                    expire: {
                        'code': 201
                    }
                }
            }
        )
        let login = await this.curl({
                'url': `https://api.m.jd.com/api/meta2LoginGame`,
                'form': `appid=commonActivity&functionId=meta2LoginGame&body={"channel":"2","roomId":"125"}&t=1713402797289`,
                user
            }
        )
        let getToken = await this.curl({
                'url': `https://api.m.jd.com/api/arvr_getRequestToken`,
                'form': `appid=commonActivity&functionId=arvr_getRequestToken&body=${this.getBody({
                    "rewardType": 6,
                    "activityId": "ba6e852dd2bc05a1de75b2d2dc9fda305096bcc0",
                    "appId": "app_440",
                })}&t=1713402797485`,
                user
            }
        )
        let accessToken = this.haskey(getToken, 'data')
        // 奖项目-正式
        let info3 = await this.curl({
                'url': `https://api.m.jd.com/api/arvr_queryInteractiveInfoNew`,
                'form': `appid=commonActivity&functionId=arvr_queryInteractiveInfoNew&body=${this.getBody({
                    "projectId": "2177780",
                    "projectKey": "2NjrCfgtPwoW8zjA7zjvKgvN3aSL",
                    "sourceCode": 5,
                    "channel": "2",
                    "queryTypes": 6,
                })}`,
                user
            }
        )
        if (this.haskey(info3, 'assignmentList.0.encryptAssignmentId')) {
            for (let i of Array(info3.assignmentList[0].assignmentTimesLimit - info3.assignmentList[0].completionCnt)) {
                let r = await this.curl({
                        'url': `https://api.m.jd.com/api/arvr_rewardNew`,
                        'form': `appid=commonActivity&functionId=arvr_rewardNew&body=${this.getBody({
                            "projectId": "2177780",
                            "projectKey": "2NjrCfgtPwoW8zjA7zjvKgvN3aSL",
                            "sourceCode": 5,
                            "channel": "2",
                            "encryptAssignmentId": info3.assignmentList[0].encryptAssignmentId,
                            "completionFlag": true,
                            "rewardType": 1,
                        })}`,
                        user,
                        algo: {
                            appId: 'e3be6'
                        }
                    }
                )
                for (let g in this.haskey(r, 'rewardsInfo.successRewards')) {
                    let data = r.rewardsInfo.successRewards[g]
                    for (let k of data) {
                        p.log("抽奖获得:", k.rewardName)
                    }
                }
                await this.wait(1000)
            }
        }
        let info2 = await this.curl({
                'url': `https://api.m.jd.com/api/arvr_queryInteractiveInfoNew`,
                'form': `appid=commonActivity&functionId=arvr_queryInteractiveInfoNew&body=${this.getBody({
                    "projectId": "1753589",
                    "projectKey": "4HT4fFeDbw11QaPmWvhdWctUQqn3",
                    "sourceCode": 2,
                    "channel": "2",
                })}&t=1713402797485`,
                user
            }
        )
        for (let i of this.haskey(info2, 'assignmentList')) {
            if (i.completionFlag) {
                p.log(`任务已经完成: ${i.assignmentName}`)
            }
            else {
                p.log(`正在运行: ${i.assignmentName}`)
                let extraType = i.ext.extraType
                if ([7777].includes(i.assignmentType)) {
                    p.log("任务跳过")
                }
                else if (i.assignmentType == 9) {
                    p.log("正在分享...")
                    for (let __ of Array(3)) {
                        let s = await this.curl({
                                'url': `https://api.m.jd.com/api/arvr_rewardNew`,
                                'form': `appid=commonActivity&functionId=arvr_rewardNew&body=${(await this.getBody(
                                    {
                                        "projectId": "1753589",
                                        "projectKey": "4HT4fFeDbw11QaPmWvhdWctUQqn3",
                                        "sourceCode": 2,
                                        "channel": "2",
                                        "encryptAssignmentId": i.encryptAssignmentId,
                                        "completionFlag": true,
                                        "rewardType": 0,
                                    }
                                ))}&sign=11&t=1653132222710`,
                                user,
                                algo: {
                                    appId: 'e3be6'
                                }
                            }
                        )
                        p.log(this.haskey(s, 'msg'))
                        if (!this.haskey(s, 'assignmentInfo')) {
                            break
                        }
                        await this.wait(1000)
                    }
                }
                else if (this.haskey(i, `ext.${i.ext.extraType}`)) {
                    let extra = i.ext[extraType]
                    if (extraType == 'sign') {
                        let sign = await this.curl({
                                'url': `https://api.m.jd.com/client.action?functionId=arvr_doInteractiveAssignmentNew`,
                                'form': `appid=commonActivity&body=${(await this.getBody(
                                    {
                                        "projectId": "1764671",
                                        "projectKey": "4HT4fFeDbw11QaPmWvhdWctUQqn3",
                                        accessToken, "channel": "2",
                                        "sourceCode": 2,
                                        subTaskId: i.encryptAssignmentId,
                                        "completionFlag": true,
                                        "itemId": "1",
                                    }
                                ))}&sign=11&t=1653132222710`,
                                user,
                                algo: {
                                    appId: '84692'
                                }
                            }
                        )
                        p.log("签到:", this.haskey(sign, 'msg'))
                    }
                    else if (extraType == 'assistTaskDetail') {
                        let index = parseInt(p.index) + 1
                        for (let o of Array(i.assignmentTimesLimit)) {
                            for (let k of Array(0)) {
                                let assist = await this.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=arvr_doInteractiveAssignmentNew`,
                                        'form': `appid=commonActivity&body=${(await this.getBody(
                                            {
                                                "projectId": "1764671",
                                                "projectKey": "4HT4fFeDbw11QaPmWvhdWctUQqn3",
                                                accessToken, "channel": "2",
                                                "sourceCode": 2,
                                                subTaskId: i.encryptAssignmentId,
                                                "itemId": extra.itemId,
                                                "actionType": 0,
                                                "completionFlag": true,
                                                "ext": {
                                                    "assistEncryptAssignmentId": i.encryptAssignmentId,
                                                    "assistInfoFlag": 2,
                                                    "inviteId": ""
                                                },
                                            }
                                        ))}&sign=11&t=1653132222710`,
                                        user,
                                        algo: {
                                            appId: '84692'
                                        }
                                    }
                                )
                                index++
                                p.log(assist)
                                if (this.haskey(assist, 'msg', '任务完成')) {
                                    break
                                }
                            }
                        }
                    }
                    else {
                        try {
                            for (let j of extra.slice(0, i.assignmentTimesLimit)) {
                                if (['shoppingActivity', 'productsInfo', 'browseShop', 'brandMemberList'].includes(extraType)) {
                                    let d = await this.curl({
                                            'url': `https://api.m.jd.com/client.action?functionId=arvr_doInteractiveAssignmentNew`,
                                            'form': `appid=commonActivity&body=${(await this.getBody(
                                                {
                                                    "projectId": "1764671",
                                                    "projectKey": "4HT4fFeDbw11QaPmWvhdWctUQqn3",
                                                    accessToken, "channel": "2",
                                                    subTaskId: i.encryptAssignmentId,
                                                    "itemId": j.itemId || j.advId,
                                                    sourceCode: 2,
                                                    "actionType": 1,
                                                }
                                            ))}&sign=11&t=1653132222710`,
                                            user,
                                            algo: {
                                                appId: '84692'
                                            }
                                        }
                                    )
                                    await this.wait((i.ext.waitDuration || 0) * 1000 + 500)
                                    if (extraType == 'brandMemberList' && this.profile.openCard) {
                                        let jo = await this.curl({
                                                'url': `https://api.m.jd.com/client.action`,
                                                'form': `functionId=bindWithVender&body={"venderId":"${j.vendorIds}","shopId":"${j.vendorIds}","bindByVerifyCodeFlag":1,"registerExtend":{},"writeChildFlag":0,"channel":4202,"appid":"27004","needSecurity":true,"bizId":"shopmember_m_jd_com"}&t=1715046616857&appid=shopmember_m_jd_com&clientVersion=9.2.0&client=H5&&x-api-eid-token=jdd03C3HUEKC6G2V5WV6SOXJV5E4J2ILKIIHLPARTU7DKUSMS72ICFUVMMF7ZVZXDON6VLTUCVU2GNZ2RZRMVIDXGF2FBMUAAAAMPKC6XVGYAAAAACHGDUSO4UHYMGEX`,
                                                user,
                                                algo: {
                                                    appId: '27004'
                                                }
                                            }
                                        )
                                        p.log('开卡', j.title, this.haskey(jo, 'message') || jo)
                                        await this.wait(1000)
                                    }
                                }
                                let s = await this.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=arvr_doInteractiveAssignmentNew`,
                                        'form': `appid=commonActivity&body=${(await this.getBody(
                                            {
                                                "projectId": "1764671",
                                                "projectKey": "4HT4fFeDbw11QaPmWvhdWctUQqn3",
                                                accessToken, "channel": "2",
                                                subTaskId: i.encryptAssignmentId,
                                                "itemId": j.itemId || j.advId,
                                                sourceCode: 2,
                                            }
                                        ))}&sign=11&t=1653132222710`,
                                        user,
                                        algo: {
                                            appId: '84692'
                                        }
                                    }
                                )
                                p.log(i.assignmentName, s.msg)
                                if (this.haskey(s, 'msg', '风险等级未通过')) {
                                    return
                                }
                                if (this.haskey(s, 'msg', '活动太火爆了')) {
                                    break
                                }
                                await this.wait(1000)
                            }
                        } catch (e) {
                        }
                    }
                }
                else if (i.assignmentName) {
                    let s = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=arvr_doInteractiveAssignmentNew`,
                            'form': `appid=commonActivity&body=${(await this.getBody(
                                {
                                    "projectId": "1764671",
                                    "projectKey": "4HT4fFeDbw11QaPmWvhdWctUQqn3",
                                    accessToken, "channel": "2",
                                    "sourceCode": 2,
                                    subTaskId: i.encryptAssignmentId,
                                    "completionFlag": true,
                                    "itemId": "1",
                                }
                            ))}&sign=11&t=1653132222710`,
                            user,
                            algo: {
                                appId: '84692'
                            }
                        }
                    )
                    p.log(i.assignmentName, s.msg)
                    await this.wait(1000)
                }
            }
        }
        let ri = await this.curl({
                'url': `https://api.m.jd.com/api/arvr_queryInteractiveRewardInfo`,
                'form': `appid=commonActivity&functionId=arvr_queryInteractiveRewardInfo&body=${this.getBody({
                    "pageSize": 10,
                    "currentPage": 1,
                    "projectId": "1753589",
                    "projectKey": "4HT4fFeDbw11QaPmWvhdWctUQqn3",
                    "sourceCode": 2,
                    "needExchangeRestScore": 1
                })}`,
                user,
                algo: {appId: '84692'}
            }
        )
        var score = this.haskey(ri, 'scoreInfoMap.usable') || 0
        p.log("当前体力:", score)
        // 东东超市-汪贝任务
        let info1 = await this.curl({
                'url': `https://api.m.jd.com/api/arvr_queryInteractiveInfoNew`,
                'form': `appid=commonActivity&functionId=arvr_queryInteractiveInfoNew&body=${this.getBody({
                    "projectId": "1764671",
                    "projectKey": "2nym8aW7jNKRbmxXLdbb75m3ebSH",
                    "sourceCode": 2,
                    "channel": "2",
                    "queryTypes": 6,
                })}&t=1713402797485`,
                user
            }
        )
        for (let i of this.haskey(info1, 'assignmentList')) {
            if (i.completionFlag) {
                p.log(`任务已经完成: ${i.assignmentName}`)
            }
            else {
                if (new Date(i.assignmentEndTime).getTime()>new Date().getTime() && i.assignmentName && this.match(/收银|解锁|升级|补货|离线/, i.assignmentName)) {
                    p.log(`正在运行: ${i.assignmentName}`)
                    if (score>=i.exchangeRate) {
                        let s = await this.curl({
                                'url': `https://api.m.jd.com/client.action?functionId=arvr_doInteractiveAssignmentNew`,
                                'form': `appid=commonActivity&body=${(await this.getBody(
                                    {
                                        "projectId": "1764671",
                                        "projectKey": "2nym8aW7jNKRbmxXLdbb75m3ebSH",
                                        accessToken, "channel": "2",
                                        "sourceCode": 2,
                                        subTaskId: i.encryptAssignmentId,
                                        "completionFlag": true,
                                        "exchangeNum": "1",
                                    }
                                ))}&sign=11&t=1653132222710`,
                                user,
                                algo: {
                                    appId: '84692'
                                }
                            }
                        )
                        score = score - i.exchangeRate + (this.haskey(s, 'assignmentInfo.increUsedScore') || 0)
                        p.log("使用体力:", i.exchangeRate, s.msg, '当前体力:', score)
                        await this.wait(1000)
                    }
                    else {
                        p.log("体力不足...")
                        p.info.work = true
                    }
                }
            }
        }
    }

    getBody(params) {
        let str = "",
            map = Object.keys(params).sort(function(d, k) {
                return d.localeCompare(k);
            });
        for (let __i of map) {
            str = str.concat(params[__i]);
        }
        let t = Date.now();
        let r = "".concat("c4491f13dce9c71f").concat(str).concat(t);
        let md5 = this.md5(r)
        params.timestamp = t;
        params.sign = md5;
        params.signKey = "c4491f13dce9c71f";
        return this.dumps(params);
    }
}

