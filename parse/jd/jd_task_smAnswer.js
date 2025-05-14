import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东超市对暗号',
            crontab: `${this.rand(0, 40)} ${this.rand(13, 18)},${this.rand(21, 22)} * * *`,
            sync: 1,
            readme: "可能存在答案未及时更新的情况,可以先用主号答题,其他账号会共享答案"
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let list = await this.curl({
                'url': `https://api.m.jd.com/atop_channel_question_list`,
                'form': `appid=jd-super-market&t=1747200195200&functionId=atop_channel_question_list&client=m&body={"babelActivityId":"01718639","bizCode":"cn_retail_jdsupermarket","scenario":"free_order","babelChannel":"ttt5","isJdApp":"1","isWx":"0"}`,
                user
            }
        )
        let items = this.haskey(list, 'data.floorData.items')
        let status = 1
        if (items) {
            let dateGroupQuestionList = items[0].dateGroupQuestionList
            for (let i of dateGroupQuestionList) {
                for (let j of i.dateQuestionList) {
                    if (j.completionFlag) {
                        p.log("已答题:", j.question, j.answer)
                        await this.setTemp(j.encryptAssignmentId, j.answer, 864000)
                    }
                    else {
                        status = 0
                        p.log("正在答题:", j.question)
                        let answer = this.syncStorage[j.encryptAssignmentId] || await this.getTemp(j.encryptAssignmentId)
                        if (answer) {
                            p.log("命中答案:", answer)
                            let submit = await this.curl({
                                    'url': `https://api.m.jd.com/atop_channel_submit_answer`,
                                    'form': `appid=jd-super-market&t=1747199104358&functionId=atop_channel_submit_answer&client=m&body={"babelActivityId":"01718639","encryptAssignmentId":"${j.encryptAssignmentId}","answer":"${answer}","bizCode":"cn_retail_jdsupermarket","scenario":"free_order","babelChannel":"ttt5","isJdApp":"1","isWx":"0"}`,
                                    user
                                }
                            )
                            if (this.haskey(submit, 'data.interactiveRewardVO')) {
                                status = 1
                                let rt = submit.data.interactiveRewardVO.rewardType
                                if (rt == 56) {
                                    p.award(submit.data.interactiveRewardVO.rewardValue, 'card')
                                }
                                else if (rt == 35) {
                                    p.award(submit.data.interactiveRewardVO.hongbaoAmount, 'redpacket')
                                }
                                else {
                                    p.log(submit.data.interactiveRewardVO)
                                }
                                if (this.haskey(submit, 'data.freeOrderTaskVoList')) {
                                    p.log(submit.data.freeOrderTaskVoList)
                                }
                            }
                            else {
                                p.log(submit)
                            }
                            await this.wait(2000)
                        }
                        else {
                            p.log("答案未更新...")
                        }
                    }
                }
            }
        }
        else {
            status = 0
            console.log('没有获取到数据...')
        }
        if (status) {
            p.info.work = true
        }
    }
}

