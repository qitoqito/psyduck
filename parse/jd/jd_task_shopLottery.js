import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东左侧店铺抽奖',
            crontab: 3,
            prompt: {
                vendorId: '店铺id'
            },
            sync: 1,
            verify: 1,
            interval: 1000
        }
    }

    async prepare() {
        await this.field('vendorId')
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let s = await this.curl({
                'url': `https://api.m.jd.com/client.action`,
                'form': `functionId=sign&body={"vendorId":"${context.vendorId}","sourceRpc":"shop_app_sign_home"}&client=apple&clientVersion=15.0.1`,
                user,
                algo: {
                    app: true,
                    expire: {
                        'code': '1',
                        status: true
                    }
                }
            }
        )
        if (this.haskey(s, 'result.signReward')) {
            p.msg(s.result.signReward.name)
        }
        else {
            p.log(this.haskey(s, 'result.signNoteAttach') || "什么也没有")
        }
        if (this.haskey(s, 'result')) {
            p.info.work = true
        }
    }
}

