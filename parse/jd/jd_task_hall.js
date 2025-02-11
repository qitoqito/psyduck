import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东特物超级殿堂',
            crontab: 3,
            verify: true,
            sync: 1,
        }
    }

    async prepare() {
        let s = await this.curl({
            'url': `https://api.m.jd.com/?client=wh5&appid=ProductZ4Brand&functionId=superBrandSecondFloorMainPage&body={"source":"hall_1111"}`,
            algo: {
                appId: "8adfb",
            }
        })
        let activityId = this.haskey(s, 'data.result.activityBaseInfo.activityId')
        if (activityId) {
            this.shareCode({
                activityId: activityId,
                source: "hall_1111"
            })
        }
    }

    async main(p) {
        let user = p.data.user;
        let source = p.context.source
        let activityId = p.context.activityId
        let tt = await this.curl({
                'url': `https://api.m.jd.com/?client=wh5&appid=ProductZ4Brand&functionId=superBrandSecondFloorMainPage&body={"source":"${source}","activityId":${activityId}}`,
                user,
                algo: {
                    appId: "8adfb",
                }
            }
        )
        if (tt.data.bizCode == '0') {
            let encryptProjectId = tt.data.result.activityBaseInfo.encryptProjectId
            let url = `https://api.m.jd.com/?client=wh5&appid=ProductZ4Brand&functionId=superBrandTaskList&body={"source":"${source}","activityId":${activityId}}`
            let l = await this.curl({
                    'url': url,
                    user, algo: {
                        appId: "8adfb",
                        valid: {
                            'data.bizCode': ['1001']
                        }
                    }
                }
            )
            for (let i of this.haskey(l, 'data.result.taskList')) {
                try {
                    if (i.assignmentName.includes('惊喜领豆')) {
                        if (i.assignmentTimesLimit != i.completionCnt) {
                            p.log("正在运行:", tt.data.result.activityBaseInfo.activityName)
                            let ss = await this.curl({
                                    'url': `https://api.m.jd.com/api?client=wh5&appid=ProductZ4Brand&functionId=superBrandDoTask&body={"source":"${source}","activityId":${activityId},"completionFlag":1,"encryptProjectId":"${encryptProjectId}","encryptAssignmentId":"${i.encryptAssignmentId}","assignmentType":${i.assignmentType},"actionType":0,"itemId":""}`,
                                    user,
                                    algo: {
                                        appId: "8adfb",
                                    }
                                }
                            )
                            if (ss.data.result.rewards && ss.data.result.rewards != 'null') {
                                for (let r of ss.data.result.rewards) {
                                    if (r.awardName.includes('京豆')) {
                                        p.msg(`获得${r.beanNum}京豆`)
                                    }
                                }
                                p.info.work = true
                            }
                        }
                        else {
                            p.info.work = true
                            p.log('已领取过任务', activityId)
                        }
                    }
                } catch (e) {
                    p.log("err", e)
                }
            }
        }
    }
}

