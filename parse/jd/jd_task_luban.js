import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东逛新品赢红包',
            crontab: 3,
            interval: 1000
        }
    }

    async prepare() {
        let linkId = this.profile.linkId || '2m5K4HvCV4jNeTDixt56KGjroeLT'
        let url = `https://prodev.m.jd.com/mall/active/${linkId}/index.html`
        let html = await this.curl({
                url,
            }
        )
        let js = this.unique(this.matchAll(/(storage11.360buyimg.com\/ifloors\/\w+\/static\/js\/main.\w+.js)/g, html) || [])
        let workflowId = "5b7b7ba0683542e3838798b04e2d8e92"
        if (js) {
            for (let j of js) {
                let k = await this.curl({
                        url: `https://${j}`
                    }
                )
                let wkId = this.match(/workflowId\s*:\s*"(\w+)"/, k)
                if (wkId) {
                    workflowId = wkId;
                    break
                }
            }
        }
        this.shareCode({
            linkId, workflowId
        })
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let floor = await this.curl({
                'url': `https://api.m.jd.com/?functionId=qryH5BabelFloors`,
                'form': `functionId=qryH5BabelFloors&appid=newtry&body={"activityId":"${context.linkId}","pageId":"4810055","queryFloorsParam":{"floorParams":{},"type":2}}`,
                user,
                algo: {
                    appId: '35fa0'
                }
            }
        )
        let gifts = []
        let list = this.haskey(floor, 'floorList.0.providerData.data.assignments.assignmentList')
        if (!list) {
            p.log("没有获取到活动列表")
            return
        }
        let status = 1
        let uuid = context.workflowId
        for (let i of list) {
            if (i.completionCnt != i.assignmentTimesLimit) {
                status = 0
                p.log("正在运行:", i.assignmentName)
                if (i.ext) {
                    let vos = i.ext.sign2 || i.ext.followShop || i.ext.brandMemberList || i.ext.shoppingActivity || i.ext.productsInfo
                    if (!vos) {
                        vos = [{
                            itemId: '1'
                        }]
                    }
                    for (let j of vos.splice(0, i.assignmentTimesLimit - i.completionCnt)) {
                        let doWork = await this.curl({
                                'url': `https://api.m.jd.com/?functionId=luban_executeWorkflow`,
                                'form': `functionId=luban_executeWorkflow&appid=newtry&client=ios&clientVersion=13.2.8&body={"workflowId":"${uuid}","action":1,"encAid":"${i.encryptAssignmentId}","itemId":"${j.itemId}","jumpUrl":"${encodeURIComponent(j.url)}"}`,
                                user,
                                algo: {
                                    appId: '35fa0',
                                    expire: {
                                        'subCode': -23
                                    }
                                }
                            }
                        )
                        if (this.haskey(doWork, 'subCode', '1403')) {
                            p.log('风险等级未通过')
                            return
                        }
                        if (i.ext.waitDuration) {
                            p.log(`等待${i.ext.waitDuration}秒`)
                            await this.wait(i.ext.waitDuration * 1000)
                        }
                        let r = await this.curl({
                                'url': `https://api.m.jd.com/?functionId=luban_executeWorkflow`,
                                'form': `functionId=luban_executeWorkflow&appid=newtry&client=ios&clientVersion=13.2.8&body={"workflowId":"${uuid}","action":0,"encAid":"${i.encryptAssignmentId}","itemId":"${j.itemId}","completionFlag":true}`,
                                user,
                                algo: {
                                    appId: '35fa0'
                                }
                            }
                        )
                        if (this.haskey(r, 'rewardsInfo.successRewards')) {
                            for (let g in r.rewardsInfo.successRewards) {
                                let data = r.rewardsInfo.successRewards[g]
                                for (let k of data) {
                                    p.award(k.discount, 'redpacket')
                                }
                            }
                        }
                        else {
                            p.log(`什么也没有抽到`)
                        }
                        status = 1
                    }
                }
            }
            else {
                p.log("任务已经完成:", i.assignmentName)
            }
        }

        if (status) {
            p.info.work = true
        }
    }
}

