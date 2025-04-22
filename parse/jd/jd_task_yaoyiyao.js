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
        for (let i = 0; i<20; i++) {
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
                p.log(`抽奖获得: ${s.data.prizeDrawVo.prizeDesc} ${s.data.prizeDrawVo.amount}`)
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

