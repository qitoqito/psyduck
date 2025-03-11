import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: "京东种豆得豆",
            turn: 2,
            crontab: 4,
            tempExpire: 86400000,
            help: "main",
            prompt: {
                inviteJson: 'true #使用自定义助力码'
            },
            readme: `如要使用自定义助力码,请在框架目录/inviter创建jd_task_plantBean.json,按需修改[{"user":"a","plantUuid":"abc"},{"user":"b","plantUuid":"efg"}]`
        }
    }

    async prepare() {
    }

    async middle() {
        if (this.turnCount == 1) {
            for (let i of this.inviter) {
                let inviter = {
                    ...i, ...{
                        category: 'plantBean',
                        limit: 3,
                        times: 25,
                        model: 'user'
                    }
                }
                this.shareCode(inviter)
            }
            for (let user of this.help) {
                let plantUuid = await this.getTemp(user)
                if (plantUuid) {
                    this.shareCode({
                        user,
                        plantUuid,
                        category: 'plantBean',
                        limit: 3,
                        times: 25,
                        model: 'user'
                    })
                }
            }
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        if (this.turnCount == 0) {
            var index = await this.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=plantBeanIndex&appid=signed_wh5&body={"channel":"baibaoxiang","monitor_source":"plant_m_plant_index","monitor_refer":"","version":"9.2.4.6"}&client=apple&clientVersion=13.2.8&networkType=wifi&osVersion=13.1.0&partner=&d_brand=iPhone&d_model=iPhone13,3&screen=844*390&adid=&uemps=0-2-999&ext={%22prstate%22:%220%22}`,
                    user,
                    algo: {
                        'appId': 'd246a',
                    }
                }
            )
            if (this.haskey(index, 'code', '3')) {
                p.err(`没有获取到数据`)
                p.info.jump = true
                return
            }
            else if (this.haskey(index, 'code', '411')) {
                p.err(`前方道路拥挤,等待两分钟`)
                return
            }
            var plantUuid
            if (this.haskey(index, 'data.jwordShareInfo')) {
                let share = this.query(index.data.jwordShareInfo.shareUrl, '&', 1)
                plantUuid = share.plantUuid
                await this.setTemp(user, plantUuid)
            }
            let roundId
            for (let r of this.haskey(index, 'data.roundList')) {
                if (!roundId && r.dateDesc.includes('本期')) {
                    roundId = r.roundId
                }
                if (r.awardState == 5) {
                    let reward = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=receivedBean&body={"monitor_refer":"receivedBean","monitor_source":"plant_app_plant_index","roundId":"${r.roundId}","version":"9.2.4.6"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                            user
                        }
                    )
                    if (this.haskey(reward, 'data.awardBean')) {
                        p.msg(`获取上期奖励: ${reward.data.awardBean}`)
                    }
                }
                else if (r.roundState == 2) {
                    let re = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=receiveNutrients&body={"monitor_refer":"plant_receiveNutrients","monitor_source":"plant_app_plant_index","roundId":"${r.roundId}","version":"9.2.4.6"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                            user
                        }
                    )
                    for (let j of r.bubbleInfos) {
                        p.log(`获取${j.name}: ${j.nutrNum}`)
                        let culture = await this.curl({
                                'url': `https://api.m.jd.com/client.action?functionId=cultureBean&body={"monitor_refer":"plant_index","monitor_source":"plant_app_plant_index","roundId":"${r.roundId}","nutrientsType":"${j.nutrientsType}","version":"9.2.4.6"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                user,
                                algo: {
                                    appId: '6a216'
                                }
                            }
                        )
                    }
                }
            }
            let status = 1
            for (let i of this.haskey(index, 'data.taskList')) {
                if (i.isFinished) {
                    p.log(i.taskName, "任务已经完成")
                }
                else {
                    p.log(`开始做 ${i.taskName}任务`, i.taskType);
                    let totalNum = parseInt(i.totalNum)
                    let gainedNum = parseInt(i.gainedNum)
                    status = 0
                    switch (i.taskType) {
                        case 2:
                            status = 1
                            break
                        case 57:
                            await this.curl({
                                    'url': `https://m.jingxi.com/jxbfd/user/DoubleSignDeal?g_ty=h5&g_tk=&appCode=msd1188198&__t=1657108409440&dwEnv=7&strDeviceId=a3b4e844090b28d5c38e7529af8115172079be4d&strZone=jxbfd&bizCode=jxbfd&source=jxbfd&_cfd_t=1657108409190&_stk=__t%2C_cfd_t%2CbizCode%2CdwEnv%2Csource%2CstrDeviceId%2CstrZone&_ste=1&h5st=20220706195330228%3B1980457211661562%3B10032%3Btk02w78551ad830nuMcGB4Qsv9QxapLP7gZdOCYE5PVV%2Bna%2Bb4KU21drJq64oP82965Vdc1tGqVU%2Flp7ydcZ5XgH0Feh%3B241b6f1d21bf8e41f380a5dd29a7bac2a6f1f65a0c7ef1b1f751eaea4c40dd9c%3B3.0%3B1657108410228&sceneval=2`,
                                    // 'form':``,
                                    user
                                }
                            )
                            await this.wait(2000)
                            await this.curl({
                                    'url': `https://wq.jd.com/jxjdsignin/SignedInfo?channel=jx_zdddsq&_t=1657108415230&h5st=20220706195335235%3B9699666907452188%3B0f6ed%3Btk02wacc21c5518nsBms0rLLAn98Xun6p1dT6CW8Pkictd4WSbmiuCg8ZokHnTWf8b7LrBNq0ADjUcmobc3%2BX8Caeday%3Bfeaa80ef87c85cd9de17d9a9f5d40e02150d9e5c3734c8a42a4a33e64fc60668%3B3.0%3B1657108415235&_stk=_t%2Cchannel&_=1657108415242&sceneval=2&g_login_type=1&g_ty=ajax&appCode=msc588d6d5`,
                                    // 'form':``,
                                    user
                                }
                            )
                            await this.wait(2000)
                            let reward = await this.curl({
                                    'url': `https://wq.jd.com/jxjdsignin/IssueReward?channel=jx_zdddsq&_t=1657108494784&_stk=_t%2Cchannel&sceneval=2&g_login_type=1&g_ty=ajax&appCode=msc588d6d5`,
                                    // 'form':``,
                                    user
                                }
                            )
                            break
                        case 96:
                            let sign = await this.curl({
                                    'url': `https://wq.jd.com/tjjdsignin/SignedInfo?channel=jx_zdddsq&_t=1663080425215&&_stk=_t%2Cchannel&_=1663080425642&sceneval=2&g_login_type=1&g_ty=ajax&appCode=msc588d6d5`,
                                    algo: {
                                        appId: '0f6ed',
                                        type: "pingou"
                                    },
                                    user
                                }
                            )
                            await this.wait(4000)
                            let reward2 = await this.curl({
                                    'url': `https://wq.jd.com/tjjdsignin/IssueReward?channel=jx_zdddsq&_t=1663080432487&_stk=_t%2Cchannel&sceneval=2&g_login_type=1&g_ty=ajax&appCode=msc588d6d5`,
                                    user,
                                    algo: {
                                        appId: '0f6ed',
                                        type: "pingou"
                                    }
                                }
                            )
                            break
                        case 92:
                            await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=receiveNutrientsTask&body=${this.dumps({
                                        "monitor_refer": "plant_receiveNutrientsTask",
                                        "monitor_source": "plant_app_plant_index",
                                        "awardType": "92",
                                        "version": i.version
                                    })}&appid=wh5&osVersion=&screen=390*844&networkType=&timestamp=1740479461598&d_brand=&d_model=&wqDefault=false&client=apple&clientVersion=15.0.20`,
                                    user,
                                    alog: {
                                        app: true
                                    }
                                }
                            )
                            await this.wait(2000)
                            await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=gotConfigDataForBrand&body=${this.dumps({
                                        "k": "farmShareConfig",
                                        "babelChannel": "10",
                                        "channel": 3,
                                        "type": "json",
                                        "version": 16
                                    })}&appid=wh5&osVersion=&screen=390*844&networkType=&timestamp=1740479461598&d_brand=&d_model=&wqDefault=false&client=apple&clientVersion=15.0.20`,
                                    user,
                                    alog: {
                                        app: true
                                    }
                                }
                            )
                            await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=initForFarm&body=${this.dumps({
                                        "version": 16,
                                        "channel": 3,
                                        "babelChannel": "10"
                                    })}&appid=wh5&osVersion=&screen=390*844&networkType=&timestamp=1740479461598&d_brand=&d_model=&wqDefault=false&client=apple&clientVersion=15.0.20`,
                                    user,
                                    alog: {
                                        app: true
                                    }
                                }
                            )
                            await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=taskInitForFarm&body=${this.dumps({
                                        "version": 16,
                                        "channel": 3,
                                        "babelChannel": "10"
                                    })}&appid=wh5&osVersion=&screen=390*844&networkType=&timestamp=1740479461598&d_brand=&d_model=&wqDefault=false&client=apple&clientVersion=15.0.20`,
                                    user,
                                    alog: {
                                        app: true
                                    }
                                }
                            )
                            await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=farmMarkStatus&body=${this.dumps({
                                        "version": 16,
                                        "channel": 3,
                                        "babelChannel": "10"
                                    })}&appid=wh5&osVersion=&screen=390*844&networkType=&timestamp=1740479461598&d_brand=&d_model=&wqDefault=false&client=apple&clientVersion=15.0.20`,
                                    user,
                                    alog: {
                                        app: true
                                    }
                                }
                            )
                            await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=friendListInitForFarm&body=${this.dumps({
                                        "version": 16,
                                        "channel": 3,
                                        "babelChannel": "10"
                                    })}&appid=wh5&osVersion=&screen=390*844&networkType=&timestamp=1740479461598&d_brand=&d_model=&wqDefault=false&client=apple&clientVersion=15.0.20`,
                                    user,
                                    alog: {
                                        app: true
                                    }
                                }
                            )
                            await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=gotConfigDataForBrand&body=${this.dumps({
                                        "k": "farmRule",
                                        "babelChannel": "10",
                                        "channel": 3,
                                        "type": "json",
                                        "version": 16
                                    })}&appid=wh5&osVersion=&screen=390*844&networkType=&timestamp=1740479461598&d_brand=&d_model=&wqDefault=false&client=apple&clientVersion=15.0.20`,
                                    user,
                                    alog: {
                                        app: true
                                    }
                                }
                            )
                            await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=ddnc_toStayModal&body=${this.dumps({
                                        "version": 16,
                                        "channel": 3,
                                        "babelChannel": "10"
                                    })}&appid=wh5&osVersion=&screen=390*844&networkType=&timestamp=1740479461598&d_brand=&d_model=&wqDefault=false&client=apple&clientVersion=15.0.20`,
                                    user,
                                    alog: {
                                        app: true
                                    }
                                }
                            )
                            await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=queryPathWithActId&body=${this.dumps({
                                        "babelChannel": "10",
                                        "channel": 3,
                                        "actId": "3KSjXqQabiTuD1cJ28QskrpWoBKT",
                                        "version": 16
                                    })}&appid=wh5&osVersion=&screen=390*844&networkType=&timestamp=1740479461598&d_brand=&d_model=&wqDefault=false&client=apple&clientVersion=15.0.20`,
                                    user,
                                    alog: {
                                        app: true
                                    }
                                }
                            )
                            await this.curl({
                                    'url': `https://api.m.jd.com/api`,
                                    'form': `functionId=isUserFollow&body=${this.dumps({
                                        "themeId": "519",
                                        "informationParam": {
                                            "isRvc": "0",
                                            "fp": "-1",
                                            "eid": "eidIf0aa8121d5saWrnr3ryoR6qt1FxGRFjFGVq57Vv5jwdgmcxSHUO23TTEORkTW84A92Fijx10j2lZfx228DL+PAqTpx3MK1VsIZiVGD2pPczQWVRx",
                                            "shshshfp": "-1",
                                            "userAgent": "-1",
                                            "referUrl": "-1",
                                            "shshshfpa": "-1"
                                        },
                                        "businessId": "1"
                                    })}&appid=wh5&osVersion=&screen=390*844&networkType=&timestamp=1740479461598&d_brand=&d_model=&wqDefault=false&client=apple&clientVersion=15.0.20`,
                                    user,
                                    alog: {
                                        app: true
                                    }
                                }
                            )
                            break
                        case 10:
                            let channel = await this.curl({
                                    'url': `https://api.m.jd.com/client.action?functionId=plantChannelTaskList&body=%7B%7D&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                    // 'form':``,
                                    user
                                }
                            )
                            var list = [...channel.data.goodChannelList, ...channel.data.normalChannelList]
                            for (let n of list) {
                                if (n.taskState == '2') {
                                    let plantChannelNutrientsTask = await this.curl({
                                            'url': `https://api.m.jd.com/client.action?functionId=plantChannelNutrientsTask&body={"channelTaskId":"${n.channelTaskId}","channelId":"${n.channelId}"}&uuid=16496899654652091525278.275.1651079578494&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                            // 'form':``,
                                            user,
                                            algo: {
                                                appId: '2424e'
                                            }
                                        }
                                    )
                                    if (this.haskey(plantChannelNutrientsTask, 'data.nutrCount')) {
                                        p.log(this.haskey(plantChannelNutrientsTask, 'data.nutrToast'))
                                        gainedNum++
                                    }
                                    if (gainedNum == totalNum) {
                                        break
                                    }
                                }
                            }
                            break
                        case 3:
                            let shopTaskList =
                                await this.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=shopTaskList&body={"monitor_refer": "plant_receiveNutrients"}&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                        user
                                    }
                                )
                            var list = [...(this.haskey(shopTaskList, 'data.goodShopList') || []), ...(this.haskey(shopTaskList, 'data.moreShopList') || [])]
                            for (let k of list) {
                                if (k.taskState == '2') {
                                    let shopNutrientsTask = await this.curl({
                                            'url': `https://api.m.jd.com/client.action?functionId=shopNutrientsTask&body={"monitor_refer":"plant_shopNutrientsTask","version":"9.2.4.6","shopId":"${k.shopId}","shopTaskId":"${k.shopTaskId}"}&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                            user,
                                            algo: {
                                                appId: "19c88"
                                            }
                                        }
                                    )
                                    if (this.haskey(shopNutrientsTask, 'data.nutrCount')) {
                                        p.log(this.haskey(shopNutrientsTask, 'data.nutrToast'))
                                        gainedNum++
                                    }
                                    if (gainedNum == totalNum) {
                                        break
                                    }
                                    await this.wait(2000)
                                }
                            }
                            break
                        case 5:
                            p.log("开始执行:", i.taskName)
                            let productTaskList =
                                await this.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=productTaskList&body={"monitor_source":"plant_app_plant_index","monitor_refer":"plant_productTaskList","version":"9.2.4.6"}&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                        user,
                                        algo: {appId: '7351b'}
                                    }
                                )
                            for (let z of this.haskey(productTaskList, 'data.productInfoList')) {
                                let productNutrientsTask = await this.curl({
                                        'url': `https://api.m.jd.com/client.action?functionId=productNutrientsTask&body={"monitor_refer":"plant_productNutrientsTask","monitor_source":"plant_app_plant_index","productTaskId":"${z[0].productTaskId}","skuId":"${z[0].skuId}","version":"9.2.4.6"}&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                                        user,
                                        algo: {
                                            appId: 'a4e2d'
                                        }
                                    }
                                )
                                await this.wait(2000)
                                p.log(productNutrientsTask.data.nutrToast || productNutrientsTask.data)
                            }
                            break
                        default:
                            let s = await this.curl({
                                    'url': `https://api.m.jd.com/client.action?functionId=receiveNutrientsTask&appid=signed_wh5&body={"awardType":"${i.taskType}","monitor_source":"plant_m_plant_index","monitor_refer":"plant_receiveNutrientsTask","version":"9.2.4.6"}&client=apple&clientVersion=13.2.8&networkType=wifi&osVersion=15.7.5&uuid=713528612071b94e23fcd28144db476f856f9fc5&partner=&d_brand=iPhone&d_model=iPhone8,1&screen=667*375&openudid=713528612071b94e23fcd28144db476f856f9fc5&adid=`,
                                    // 'form':``,
                                    user,
                                    algo: {
                                        appId: 'd22ac'
                                    }
                                }
                            )
                            p.log(this.haskey(s, 'data.nutrToast'))
                            break
                    }
                    await this.wait(2000)
                }
            }
            if (this.haskey(index, 'data.fixedEntryTask.state', 2)) {
                p.log(`正在访问:`, index.data.fixedEntryTask.noticePopText)
                let culture = await this.curl({
                        'url': `https://api.m.jd.com/client.action?functionId=cultureBean&body={"monitor_refer":"plant_index","monitor_source":"plant_app_plant_index","roundId":"${roundId}","nutrientsType":"${index.data.fixedEntryTask.nutrientsType}","version":"9.2.4.6"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                        user,
                        algo: {
                            appId: '6a216'
                        }
                    }
                )
            }
            let friendList = await this.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=plantFriendList&body={"version":"9.2.4.1","monitor_refer":"plantFriendList","monitor_source":"plant_app_plant_index","pageNum":"1"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                    user
                }
            )
            for (let i of this.haskey(friendList, 'data.friendInfoList')) {
                if (i.nutrCount) {
                    status = 0
                    let collectUserNutr = await this.curl({
                            'url': `https://api.m.jd.com/client.action?functionId=collectUserNutr&body={"monitor_refer":"collectUserNutr","monitor_source":"plant_app_plant_index","roundId":"${roundId}","paradiseUuid":"${i.paradiseUuid}","version":"9.2.4.1"}&client=apple&clientVersion=13.2.8&&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                            user,
                            algo: {
                                'appId': '14357',
                            }
                        }
                    )
                    let collectResult = this.haskey(collectUserNutr, 'data.collectResult')
                    if (collectResult == '3') {
                        status = 1
                        p.log('今日帮助收取次数已达上限，明天再来帮忙吧')
                        break
                    }
                    else if (collectResult == '1') {
                        status = 1
                        p.log(collectUserNutr.data.collectMsg.replace("*plantNickName*", i.plantNickName).replace('*friendNutrRewards*', collectUserNutr.data.friendNutrRewards).replace('*collectNutrRewards*', collectUserNutr.data.collectNutrRewards))
                    }
                    await this.wait(2000)
                }
            }
            if (status) {
                // p.info.work = true
            }
        }
        else {
            if (!context.plantUuid) {
                return
            }
            let uuid = context.plantUuid
            if (context.user == user) {
                p.log("不能助力自己...")
                return
            }
            let index = await this.curl({
                    'url': `https://api.m.jd.com/client.action?functionId=plantBeanIndex&body={"plantUuid":"${uuid}","monitor_source":"plant_m_plant_index","monitor_refer":"","version":"9.2.4.1"}&client=apple&clientVersion=13.2.8&uuid=0721076da75ec3ea8e5f481e6d68bb4b7420c38d&appid=signed_wh5&partner=&d_brand=iPhone&d_model=iPhone13%2C3&clientVersion=13.1.0&osVersion=13.1.0&client=apple&screen=844*390`,
                    user,
                    algo: {
                        'appId': 'd246a',
                    }
                }
            )
            if (this.haskey(index, 'code', '3')) {
                p.info.jump = true
                return
            }
            let res = this.haskey(index, 'data.helpShareRes') || {}
            if (res.state == '1') {
                p.log(`助力:`, uuid, res.promptText)
                p.info.help = true
            }
            else if (res.state == '2') {
                p.info.complete = true
                p.log(res.promptText)
            }
            else if (res.state == '3') {
                p.log(res.promptText)
                p.context.finish = true
            }
            else if (res.state == '4') {
                p.log(res.promptText)
                p.info.help = true
            }
            await this.wait(2000)
        }
    }

    async done() {
        let code = []
        for (let user of this.help) {
            let plantUuid = await this.getTemp(user)
            if (plantUuid) {
                code.push({user, plantUuid})
            }
        }
        console.log('InviteCode:', this.dumps(code))
    }
}
