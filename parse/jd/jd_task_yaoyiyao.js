import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东摇一摇',
            prompt: {
                linkId: '活动linkId'
            },
            sync: 1,
            verify: 1
        }
    }

    async prepare() {
        await this.field('linkId')
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        for (let i = 0; i<11; i++) {
            let s = await this.curl({
                    'url': `https://api.m.jd.com/?functionId=superRedBagDraw&body={"linkId":"${context.linkId}"}&appid=activities_platform`,
                    user,
                    algo: {
                        'appId': '6e8d7',
                        expire: {
                            'data.isLogin': false
                        }
                    }
                }
            )
            if (this.haskey(s, 'data.prizeDrawVo')) {
                let data = s.data.prizeDrawVo
                let prizeType = data.prizeType || data.rewardType
                let amount = data.amount || data.rewardValue
                if (prizeType == 0) {
                    p.log('没抽到奖品')
                }
                else if (prizeType == 1) {
                    p.log('优惠券:', data.limitStr || data.codeDesc || data.prizeCode, data.prizeDesc || data.prizeName)
                }
                else if (prizeType == 2) {
                    p.award(amount, 'redpacket')
                }
                else if (prizeType == 3) {
                    p.award(amount, 'bean')
                }
                else if (prizeType == 5) {
                    p.award(data.prizeDesc || data.prizeName || data.limitStr, 'reward')
                }
                else if (prizeType == 17) {
                    p.log('谢谢参与')
                }
                else if (prizeType == 18) {
                    p.log(`水滴: ${amount}`)
                }
                else if (prizeType == 22) {
                    p.award(amount, 'card')
                }
                else if (prizeType) {
                    p.draw(`抽到类型: ${prizeType} ${data.limitStr || data.codeDesc || data.prizeCode || ''} ${data.prizeDesc || data.prizeName}`)
                }
                else {
                    p.log("什么也没有")
                }
                p.info.work = true
            }
            else {
                if (this.haskey(s, 'code', 20005)) {
                    p.context.jump = true
                    this.log("场次已过期");
                    return
                }
                p.log('什么也没有')
            }
            await this.wait(1000)
        }
    }
}

