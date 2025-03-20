import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东汪汪庄园',
            crontab: 3,
            keyExpire: 12000,
            prompt: {
                merge: '1 # 执行购买与合成任务',
            },
        }
    }

    async prepare() {
        this.shareCode({linkId: "99DZNpaCTAv8f4TuKXr0Ew"})
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        this.dict[user] = {}
        await this.curl({
                'url': `https://api.m.jd.com/api`,
                'form': `appid=risk_h5_info&functionId=reportInvokeLog&body={"sdkClient":"handler","sdkVersion":"1.1.0","url":"aHR0cHM6Ly9qb3lwYXJrLmpkLmNvbS8","timestamp":${new Date().getTime()}}`,
                user
            }
        )
        await this.curl({
                'url': `https://api.m.jd.com/?functionId=getStaticResource&body={"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                user
            }
        )
        await this.curl({
                'url': `https://api.m.jd.com/?functionId=getStationMarquees&body={"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                user
            }
        )
        await this.baseInfo(p)
        await this.joyList(p)
        // p.log("获取数据中...", this.dict[user])
        await this.shopList(p)
        await this.two(p)
        let list = await this.curl({
            'url': `https://api.m.jd.com/`,
            'form': `functionId=apTaskList&body={"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
            user
        })
        for (let i of this.haskey(list, 'data')) {
            if (i.taskDoTimes != i.taskLimitTimes) {
                let ok = 0
                for (let j = 0; j<i.taskLimitTimes - i.taskDoTimes; j++) {
                    if (ok) {
                        break
                    }
                    p.log(`正在做:`, i.taskTitle, i.taskType)
                    switch (i.taskType) {
                        case 'ORDER_MARK':
                            break
                        case 'SHARE_INVITE':
                            break
                        case 'SIGN':
                            let ss = await this.curl({
                                'url': `https://api.m.jd.com/`,
                                'form': `functionId=apDoTask&body={"taskType":"SIGN","taskId":${i.id},"openUdId":"","cityId":"1234","provinceId":"16","countyId":"1234","linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                user,
                                algo: {
                                    appId: 'cd949'
                                }
                            })
                            let dd = await this.curl({
                                'url': `https://api.m.jd.com/`,
                                'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                user,
                                algo: {
                                    appId: "55276"
                                }
                            })
                            if (this.haskey(dd, 'success')) {
                                p.log('任务完成:', dd.success)
                                if (!p.info.balck) {
                                    await this.baseInfo(p)
                                    await this.two(p)
                                }
                            }
                            break
                        case 'BROWSE_CHANNEL':
                        case 'BROWSE_PRODUCT':
                        case 'BROWSE_RTB':
                            let detail = await this.curl({
                                'url': `https://api.m.jd.com/`,
                                'form': `functionId=apTaskDetail&body={"taskType":"${i.taskType}","taskId":${i.id},"openUdId":"","cityId":"1234","provinceId":"16","countyId":"1234","channel":4,"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                user
                            })
                            if (this.haskey(detail, 'data.taskItemList')) {
                                let s = await this.curl({
                                    'url': `https://api.m.jd.com/`,
                                    form: `functionId=apDoTask&body={"taskType":"${i.taskType}","taskId":${i.id},"openUdId":"","cityId":"1234","provinceId":"16","countyId":"1234","channel":4,"linkId":"${context.linkId}","taskInsert":true,"itemId":"${encodeURIComponent((detail.data.taskItemList[j] || detail.data.taskItemList[0]).itemId)}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                    user,
                                    algo: {
                                        appId: 'cd949'
                                    }
                                })
                                if (this.haskey(s, 'success')) {
                                    let d = await this.curl({
                                        'url': `https://api.m.jd.com/`,
                                        'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                        user,
                                        algo: {
                                            appId: "55276"
                                        }
                                    })
                                    if (this.haskey(d, 'success')) {
                                        p.log('任务完成:', d.success)
                                        if (!p.info.balck) {
                                            await this.baseInfo(p)
                                            await this.two(p)
                                        }
                                    }
                                }
                                else {
                                    p.log(this.haskey(s, 'errMsg') || s)
                                    break
                                }
                            }
                            else {
                                let s = await this.curl({
                                    'url': `https://api.m.jd.com/`,
                                    form: `functionId=apDoTask&body={"taskType":"${i.taskType}","taskId":${i.id},"openUdId":"","cityId":"1234","provinceId":"16","countyId":"1234","channel":4,"linkId":"${context.linkId}","taskInsert":true,"itemId":"${encodeURIComponent(i.taskSourceUrl)}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                    user,
                                    algo: {
                                        appId: 'cd949'
                                    }
                                })
                                if (this.haskey(s, 'success')) {
                                    let d = await this.curl({
                                        'url': `https://api.m.jd.com/`,
                                        'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                        user,
                                        algo: {
                                            appId: "55276"
                                        }
                                    })
                                    if (this.haskey(d, 'success')) {
                                        p.log('任务完成:', d.success)
                                        if (!p.info.balck) {
                                            await this.baseInfo(p)
                                            await this.two(p)
                                        }
                                    }
                                }
                                else {
                                    p.log(this.haskey(s, 'errMsg') || s)
                                    break
                                }
                            }
                            break
                    }
                }
            }
            else {
                p.log(`任务完成`, i.taskTitle)
            }
        }
        await this.two(p)
        list = await this.curl({
            'url': `https://api.m.jd.com/`,
            'form': `functionId=apTaskList&body={"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
            user
        })
        for (let i of this.haskey(list, 'data')) {
            if (i.canDrawAwardNum) {
                for (let n of Array(i.canDrawAwardNum)) {
                    let d = await this.curl({
                        'url': `https://api.m.jd.com/`,
                        'form': `functionId=apTaskDrawAward&body={"taskType":"${i.taskType}","taskId":${i.id},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                        user,
                        algo: {
                            appId: "55276"
                        }
                    })
                    if (this.haskey(d, 'success')) {
                        p.log(`获取${i.taskTitle}金币...`, d.success)
                        await this.baseInfo(p)
                        await this.two(p)
                    }
                }
            }
        }
        let joys = []
        for (let i in this.dict[user].joy) {
            for (let j of this.dict[user].joy[i]) {
                joys.push(j)
            }
        }
        if (this.dict[user].unlock && joys.length>0) {
            joys = joys.reverse()
            let min = Math.min(joys.length, this.dict[user].unlock)
            for (let i = 0; i<min; i++) {
                let move = await this.curl({
                    'url': `https://api.m.jd.com/`,
                    'form': `functionId=joyMove&body={"joyId":${joys[i]},"location":${i + 1},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                    user,
                    algo: {
                        appId: "50788"
                    }
                })
                p.log('移动狗子去工作...', this.haskey(move, 'success'))
            }
        }
        p.info.work = true
    }

    async one(p) {
        let user = p.data.user
        let context = p.context
        let joy = this.dict[user].joy || {}
        let isChange = 0
        for (let i in this.dict[user].joy) {
            if (this.dict[user].joy[i].length>1) {
                let list = this.dict[user].joy[i]
                let spl = this.slice(list, 2)
                for (let k = 0; k<spl.length; k++) {
                    let kk = spl[k].sort()
                    let merge = await this.curl({
                        'url': `https://api.m.jd.com/?functionId=joyMergeGet&body={"joyOneId":${kk[0]},"joyTwoId":${kk[1]},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                        user,
                        algo: {
                            'appId': 'c3beb'
                        }
                    })
                    if (this.haskey(merge, 'data.joyPrizeVO.prizeName')) {
                        let prizeType = merge.data.joyPrizeVO.prizeType
                        if (prizeType == 2) {
                            p.msg(`红包: ${merge.data.joyPrizeVO.prizeName}`)
                        }
                        else if (prizeType == 3) {
                            p.msg(`京豆: ${merge.data.joyPrizeVO.prizeName}`)
                        }
                        else if (prizeType == 4) {
                            p.msg(`现金: ${merge.data.joyPrizeVO.prizeName}`)
                        }
                        else {
                            p.log(`升级奖励: ${merge.data.joyPrizeVO.prizeName}`)
                        }
                    }
                    if (this.haskey(merge, 'data.joyVO.id')) {
                        isChange++
                        let joyss = this.dict[user].joy
                        joyss[merge.data.joyVO.level] = joyss[merge.data.joyVO.level] || []
                        joyss[merge.data.joyVO.level].push(merge.data.joyVO.id)
                        joyss[i] = spl[k + 1] || []
                        p.log(`合成等级${parseInt(i) + 1}的狗子成功...`, JSON.stringify(joyss))
                    }
                    // p.log(`合成等级${parseInt(i) + 1}的狗子成功...`, this.dict[user].joy[parseInt(i) + 1])
                }
            }
        }
        if (isChange>0) {
            await this.baseInfo(p)
            await this.joyList(p)
        }
        if (joy["25"] && joy["26"] && joy["27"] && joy["28"] && joy["29"] && joy["25"].length>0 && joy["26"].length>0 && joy["27"].length>0 && joy["28"].length>0 && joy["29"].length>0) {
            for (let i = 21; i<25; i++) {
                if ((joy["25"].length + joy["26"].length + joy["27"].length + joy["28"].length + joy["29"].length)>5) {
                    break
                }
                if (!this.haskey(joy, `${i}.0`)) {
                    // if (this.dict[user].joy && (this.dict[user].joy[i] && this.dict[user].joy[i].length == 0) || !this.dict[user].joy[i]) {
                    let joyInfo = this.dict[user].shop[i]
                    if (joyInfo && this.dict[user].coin>0 && joyInfo.consume>0 && joyInfo.consume<this.dict[user].coin) {
                        if (this.dict[user].number>9) {
                            p.log("不能再养狗子了...")
                            break
                        }
                        let buy = await this.curl({
                            'url': `https://api.m.jd.com/`,
                            'form': `functionId=joyBuy&body={"level":${i},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                            user,
                            algo: {
                                'appId': 'ffb36'
                            }
                        })
                        await this.baseInfo(p)
                        await this.joyList(p)
                        await this.shopList(p)
                        if (this.haskey(buy, 'data')) {
                            // p.log(`购买等级${i}的狗子成功...`, this.dict[user].joy[i])
                            p.log(`购买等级${i}的狗子成功...`, JSON.stringify(this.dict[user].joy))
                        }
                        else {
                            p.log(`购买等级${i}的狗子失败...`)
                            break
                        }
                    }
                    else {
                        p.log(`没有足够的金币可以购买等级${i}的狗子...`)
                        break
                    }
                }
            }
            if (joy["21"] && joy["22"] && joy["23"] && joy["24"] && joy["21"].length>0 && joy["22"].length>0 && joy["23"].length>0 && joy["24"].length>0) {
                for (let i = 21; i<22; i++) {
                    let joyInfo = this.dict[user].shop[i]
                    if (joyInfo && this.dict[user].coin>0 && joyInfo.consume>0 && joyInfo.consume<this.dict[user].coin) {
                        if (this.dict[user].number>9) {
                            p.log("不能再养狗子了...")
                            break
                        }
                        let buy = await this.curl({
                            'url': `https://api.m.jd.com/`,
                            'form': `functionId=joyBuy&body={"level":${i},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                            user,
                            algo: {
                                'appId': 'ffb36'
                            }
                        })
                        await this.baseInfo(p)
                        await this.joyList(p)
                        await this.shopList(p)
                        if (this.haskey(buy, 'data')) {
                            // p.log(`购买等级${i}的狗子成功...`, this.dict[user].joy[i])
                            p.log(`购买等级${i}的狗子成功...`, JSON.stringify(this.dict[user].joy))
                        }
                        else {
                            p.log(`购买等级${i}的狗子失败...`)
                            break
                        }
                    }
                    else {
                        p.log(`没有足够的金币可以购买等级${i}的狗子...`)
                        break
                    }
                }
                for (let i in this.dict[user].joy) {
                    if (this.dict[user].joy[i] && this.dict[user].joy[i].length>1 && this.dict[user].joy[i].length % 2 == 0) {
                        let list = this.dict[user].joy[i]
                        let spl = this.slice(list, 2)
                        for (let k of spl) {
                            let kk = k.sort()
                            let merge = await this.curl({
                                'url': `https://api.m.jd.com/?functionId=joyMergeGet&body={"joyOneId":${kk[0]},"joyTwoId":${kk[1]},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                user,
                                algo: {
                                    'appId': 'c3beb'
                                }
                            })
                            if (this.haskey(merge, 'data.joyPrizeVO.prizeName')) {
                                let prizeType = merge.data.joyPrizeVO.prizeType
                                if (prizeType == 2) {
                                    p.msg(`红包: ${merge.data.joyPrizeVO.prizeName}`)
                                }
                                else if (prizeType == 3) {
                                    p.msg(`京豆: ${merge.data.joyPrizeVO.prizeName}`)
                                }
                                else if (prizeType == 4) {
                                    p.msg(`现金: ${merge.data.joyPrizeVO.prizeName}`)
                                }
                                else {
                                    p.log(`升级奖励: ${merge.data.joyPrizeVO.prizeName}`)
                                }
                            }
                            await this.baseInfo(p)
                            await this.joyList(p)
                            // p.log(`合成等级${parseInt(i) + 1}的狗子成功...`, this.dict[user].joy[parseInt(i) + 1])
                            p.log(`合成等级${parseInt(i) + 1}的狗子成功...`, JSON.stringify(this.dict[user].joy))
                        }
                    }
                }
            }
        }
        else {
            for (let i in this.dict[user].joy) {
                if (this.dict[user].joy[i] && this.dict[user].joy[i].length>1 && this.dict[user].joy[i].length % 2 == 0) {
                    let list = this.dict[user].joy[i]
                    let spl = this.slice(list, 2)
                    for (let k of spl) {
                        let kk = k.sort()
                        let merge = await this.curl({
                            'url': `https://api.m.jd.com/?functionId=joyMergeGet&body={"joyOneId":${kk[0]},"joyTwoId":${kk[1]},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                            user,
                            algo: {
                                'appId': 'c3beb'
                            }
                        })
                        if (this.haskey(merge, 'data.joyPrizeVO.prizeName')) {
                            let prizeType = merge.data.joyPrizeVO.prizeType
                            if (prizeType == 2) {
                                p.msg(`红包: ${merge.data.joyPrizeVO.prizeName}`)
                            }
                            else if (prizeType == 3) {
                                p.msg(`京豆: ${merge.data.joyPrizeVO.prizeName}`)
                            }
                            else if (prizeType == 4) {
                                p.msg(`现金: ${merge.data.joyPrizeVO.prizeName}`)
                            }
                            else {
                                p.log(`升级奖励: ${merge.data.joyPrizeVO.prizeName}`)
                            }
                        }
                        await this.baseInfo(p)
                        await this.joyList(p)
                        // p.log(`合成等级${parseInt(i) + 1}的狗子成功...`, this.dict[user].joy[parseInt(i) + 1])
                        p.log(`合成等级${parseInt(i) + 1}的狗子成功...`, JSON.stringify(this.dict[user].joy))
                    }
                }
            }
            for (let i in this.dict[user].joy) {
                if (this.dict[user].joy[i] && this.dict[user].joy[i].length % 2 == 1 && i<this.dict[user].buyLevel) {
                    if (!this.dict[user].shop) {
                        await this.shopList(p)
                    }
                    let joyInfo = this.dict[user].shop[i]
                    if (joyInfo && this.dict[user].coin>0 && joyInfo.consume>0 && joyInfo.consume<this.dict[user].coin) {
                        if (this.dict[user].number>9) {
                            p.log("不能再养狗子了...")
                            break
                        }
                        let buy = await this.curl({
                            'url': `https://api.m.jd.com/`,
                            'form': `functionId=joyBuy&body={"level":${i},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                            user,
                            algo: {
                                'appId': 'ffb36'
                            }
                        })
                        if (this.haskey(buy, 'data')) {
                            await this.shopList(p)
                            // p.log(`购买等级${i}的狗子成功...`, this.dict[user].joy[i])
                            p.log(`购买等级${i}的狗子成功...`, JSON.stringify(this.dict[user].joy))
                            // 此处为了防止有低等级狗子合并购买逻辑混乱
                            let list = this.dict[user].joy[i]
                            if (list && list.length>1) {
                                let spl = this.slice(list, 2)
                                for (let k of spl) {
                                    let kk = k.sort()
                                    let merge = await this.curl({
                                        'url': `https://api.m.jd.com/?functionId=joyMergeGet&body={"joyOneId":${kk[0]},"joyTwoId":${kk[1]},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                                        user,
                                        algo: {
                                            'appId': 'c3beb'
                                        }
                                    })
                                    if (this.haskey(merge, 'data.joyPrizeVO.prizeName')) {
                                        let prizeType = merge.data.joyPrizeVO.prizeType
                                        if (prizeType == 2) {
                                            p.msg(`红包: ${merge.data.joyPrizeVO.prizeName}`)
                                        }
                                        else if (prizeType == 3) {
                                            p.msg(`京豆: ${merge.data.joyPrizeVO.prizeName}`)
                                        }
                                        else if (prizeType == 4) {
                                            p.msg(`现金: ${merge.data.joyPrizeVO.prizeName}`)
                                        }
                                        else {
                                            p.log(`升级奖励: ${merge.data.joyPrizeVO.prizeName}`)
                                        }
                                    }
                                    p.log(`合成等级${parseInt(i) + 1}的狗子成功...`, JSON.stringify(this.dict[user].joy))
                                }
                            }
                            await this.baseInfo(p)
                            await this.joyList(p)
                        }
                        else {
                            p.log(`购买等级${i}的狗子失败...`)
                        }
                    }
                    else {
                        p.log(`没有足够的金币可以购买等级${i}的狗子...`)
                    }
                }
            }
        }
    }

    async two(p) {
        let user = p.data.user
        let context = p.context
        if (this.profile.merge) {
            await this.one(p)
            let joy = this.dict[user].joy || {}
            for (let i = 0; i<30; i++) {
                if (this.dict[user].coin>this.dict[user].buyCoin) {
                    if (this.dict[user].number>9) {
                        p.log("不能再养狗子了...")
                        break
                    }
                    let i = this.dict[user].buyLevel
                    let buy = await this.curl({
                        'url': `https://api.m.jd.com/`,
                        'form': `functionId=joyBuy&body={"level":${i},"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                        user,
                        algo: {
                            'appId': 'ffb36'
                        }
                    })
                    await this.baseInfo(p)
                    await this.joyList(p)
                    await this.shopList(p)
                    if (this.haskey(buy, 'data')) {
                        // p.log(`购买等级${i}的狗子成功...`, this.dict[user].joy[i])
                        p.log(`购买等级${i}的狗子成功...`, JSON.stringify(this.dict[user].joy))
                    }
                    else {
                        p.log(`购买等级${i}的狗子失败...`)
                        break
                    }
                }
                else {
                    p.log(this.dict[user].buyLevel ? `购买等级${this.dict[user].buyLevel}的牛牛金币不足...` : '金币不足...')
                    break
                }
                await this.one(p)
            }
        }
    }

    async shopList(p) {
        let user = p.data.user
        let context = p.context
        let s = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=gameShopList`,
                'form': `functionId=gameShopList&body={"linkId":"${context.linkId}"}&t=1741137369938&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                user,
                algo: {
                    expire: {
                        code: 1000
                    }
                }
            }
        )
        let data = this.haskey(s, 'data')
        if (data) {
            let obj = {
                shop: this.column(data, '', 'userLevel')
            }
            this.dict[user] = {
                ...this.dict[user],
                ...obj
            }
            return obj
        }
        else {
            return {}
        }
    }

    async joyList(p) {
        let user = p.data.user
        let context = p.context
        var joyList = await this.curl({
            'url': `https://api.m.jd.com/api?functionId=joyList`,
            'form': `functionId=joyList&body={"linkId":"${context.linkId}"}&t=1741137369938&appid=activities_platform&client=ios&clientVersion=15.0.25`,
            user,
            algo: {
                'appId': 'e18ed'
            }
        })
        if (this.haskey(joyList, 'data')) {
            let number = joyList.data.joyNumber
            var joy = {}
            for (let i of joyList.data.activityJoyList) {
                joy[i.level] = joy[i.level] || []
                joy[i.level].push(i.id)
            }
            if (this.haskey(joyList, 'data.workJoyInfoList')) {
                for (let i of joyList.data.workJoyInfoList) {
                    if (this.haskey(i, 'joyDTO.id')) {
                        let move = await this.curl({
                            'url': 'https://api.m.jd.com/',
                            'form': `functionId=joyMove&body={"joyId":${i.joyDTO.id},"location":0,"linkId":"${context.linkId}"}&t=1741137369938&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                            user,
                            algo: {
                                'appId': '50788'
                            }
                        })
                        if (this.haskey(move, 'success')) {
                            joy[i.joyDTO.level] = joy[i.joyDTO.level] || []
                            joy[i.joyDTO.level].push(i.joyDTO.id)
                        }
                    }
                }
            }
            let list = Object.keys(joy).map(d => parseInt(d))
            let min = Math.min(...list)
            let max = Math.max(...list)
            for (let i = min; i<max; i++) {
                joy[i] = joy[i] || []
            }
            let unlock = joyList.data.workJoyInfoList.filter(d => d.unlock).length
            let obj = {
                joy,
                number,
                min,
                unlock
            }
            this.dict[user] = {
                ...this.dict[user],
                ...obj
            }
            return obj
        }
        else {
            let obj = {
                joy: {}
            }
            this.dict[user] = {
                ...this.dict[user],
                ...obj
            }
            return obj
        }
    }

    async baseInfo(p) {
        let user = p.data.user
        let context = p.context
        this.dict[user] = {}
        let baseInfo = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=joyBaseInfo`,
                'form': `functionId=joyBaseInfo&body={"taskId":"","inviteType":"","inviterPin":"","linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                user, algo: {
                    appId: "4abce",
                    expire: {
                        code: 1000
                    }
                }
            }
        )
        if (this.haskey(baseInfo, 'errMsg', 'blackfail')) {
            p.log("狗子在小黑屋里面...")
            p.info.jump = true
            p.info.black = true
            return {
                error: 1
            }
        }
        var data = this.haskey(baseInfo, 'data')
        if (this.haskey(baseInfo, 'data.level') == 1 && !this.haskey(baseInfo, 'data.joyCoin')) {
            await this.curl({
                'url': `https://api.m.jd.com/`,
                'form': `functionId=newStartReward&body={"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                user
            })
        }
        if (this.haskey(baseInfo, 'data.level') == 30) {
            let joyRestart = await this.curl({
                'url': `https://api.m.jd.com/`,
                'form': `functionId=joyRestart&body={"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                user,
                algo: {
                    'appId': '4abce'
                }
            })
            p.log(`已经满级了,正在切换场景`)
            await this.curl({
                'url': `https://api.m.jd.com/`,
                'form': `functionId=newStartReward&body={"linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                user
            })
            for (let i of Array(2)) {
                baseInfo = await this.curl({
                    'url': `https://api.m.jd.com/`,
                    'form': `functionId=joyBaseInfo&body={"taskId":"","inviteType":"","inviterPin":"","linkId":"${context.linkId}"}&t=1741137369937&appid=activities_platform&client=ios&clientVersion=15.0.25`,
                    user,
                    algo: {
                        appId: "4abce"
                    }
                })
                data = this.haskey(baseInfo, 'data')
                if (data) {
                    break
                }
                else {
                    await this.wait(2000)
                }
            }
        }
        if (this.haskey(data, 'invitePin')) {
            var compact = {
                coin: data.joyCoin,
                buyCoin: data.fastBuyCoin,
                level: data.level,
                buyLevel: data.fastBuyLevel,
                invitePin: data.invitePin,
            }
            // if (inviterPin) {
            //     compact.helpPin = inviterPin
            //     compact.helpUser = helpUser
            // }
            this.dict[user] = {
                ...this.dict[user],
                ...compact
            }
        }
        else {
            this.dict[user] = {
                joy: {},
                shop: {}
            }
            var compact = {
                joy: {},
                shop: {}
            }
        }
        return compact
    }

    slice(data, num) {
        let result = [];
        if (num == 0) {
            result = [data]
        }
        else {
            for (let i = 0, len = data.length; i<len; i += num) {
                result.push(data.slice(i, i + num));
            }
        }
        return result
    }
}

