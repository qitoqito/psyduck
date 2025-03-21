import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东健康',
            crontab: 3,
            sync: 1,
            verify: true
        }
    }

    async prepare() {
    }

    async batch(p) {
        p = await this.getTemp(p.pid) || p
        if (!p.encodeId) {
            for (let i of Array(2)) {
                let kit = await this.curl({
                        'url': `https://api.m.jd.com/api?appid=jdh-middle&functionId=jdh_bm_getKitTask&t=1738395115758`,
                        'form': `body={"channel":"${p.channel}","groupCode":"openkits","m_patch_appKey":"${p.appKey}","imei":"CFFGHFCF"}`,
                        cookie: this.tester()
                    }
                )
                if (this.haskey(kit, 'result.encodeId')) {
                    p.encodeId = kit.result.encodeId
                    break
                }
            }
        }
        return p
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let algo = context.algo || {}
        let gift = function(a) {
            for (let i of this.haskey(a, ['result.result.prizeInfovo', 'result.result.prizeInfovos']) || {}) {
                if (i.prizeType == 2) {
                    // p.msg(`获得京豆: ${i.awardId}`)
                    p.award(i.awardId, 'bean')
                    p.info.work = true
                }
                else if (i.prizeType == 14) {
                    p.log("获得健康值:", i.awardId)
                }
            }
        }
        let sign = await this.curl({
                'url': `https://api.m.jd.com/api?appid=jdh-middle&functionId=jdh_msoa_doTaskGw&t=1738387986997`,
                'form': `body={"infoId":"jdhHome_task","channel":"${context.channel}","appKey":"${context.appKey}","encodeId":"${context.encodeId}","imei":"CFFGHFCF","location":{"province":"16","city":"1234","district":"1234","town":"56789"}}`,
                user,
                algo: {
                    ...{
                        appId: "8c399",
                        expire: {
                            'result.code': -1
                        }
                    }, ...algo
                }
            }
        )
        let msg = this.haskey(sign, 'result.result.msg') || ''
        if (this.haskey(sign, 'result.result.bizCode', 12)) {
            p.log("已签到")
            p.info.work = true
        }
        else if (this.haskey(sign, 'result.result.bizCode', 2)) {
            p.info.work = true
            gift.bind(this)(sign)
        }
        else if (msg.includes('火爆')) {
            p.info.jump = true
            p.log('活动太火爆啦')
            return
        }
        else {
            p.log(sign)
        }
        let taskList = await this.curl({
                'url': `https://api.m.jd.com/api?appid=jdh-middle&functionId=jdh_bm_queryTaskList&t=1738398013872`,
                'form': `body={"activityId":"${context.activityId}","appKey":"${context.appKey}","channel":"${context.channel}","imei":"CFFGHFCF","location":{"province":"16","city":"1234","district":"1234","town":"45678"}}`,
                user
            }
        )
        for (let i of this.haskey(taskList, 'data.result')) {
            for (let j of i.taskVoList) {
                if (j.status == 1) {
                    p.log("正在运行:", i.mainTitle || i.groupName)
                    let doTask = await this.curl({
                            'url': `https://api.m.jd.com/api?appid=jdh-middle&functionId=jdh_msoa_doTaskGw&t=1738398013872`,
                            'form': `body={"appKey":"${j.appKey}","channel":"${context.channel}","infoId":"jdhHome_task","encodeId":"${j.encodeId}","imei":"CFFGHFCF","location":{"province":"16","city":"1234","district":"1234","town":"45678"}}`,
                            user
                        }
                    )
                    await this.wait(1000)
                    let award = await this.curl({
                            'url': `https://api.m.jd.com/api?appid=jdh-middle&functionId=jdh_msoa_sendAwardGw&t=1738398403434`,
                            'form': `body={"appKey":"${j.appKey}","channel":"${context.channel}","infoId":"jdhHome_task","activityId":${j.activityId},"queryToken":"${j.encodeId}","taskId":${j.id},"imei":"CFFGHFCF","location":{"province":"16","city":"1234","district":"1234","town":"45678"}}`,
                            user,
                            algo: {
                                appId: '8c399'
                            }
                        }
                    )
                    let msg = this.haskey(award, 'result.message')
                    if (msg.includes('火爆')) {
                        p.info.jump = true
                        p.log("活动太火爆啦")
                        return
                    }
                    try {
                        gift.bind(this)(award)
                    } catch (e) {
                    }
                }
            }
        }
    }
}

