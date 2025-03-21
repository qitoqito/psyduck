import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东秒送每日领京豆',
            crontab: 3,
            interval: 1000
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let detail = await this.curl({
                'url': `https://api.m.jd.com/client.action?functionId=ds_signIn_querySignInDetail`,
                'form': `avifSupport=0&body={"channelId":"rn01"}&build=169770&client=apple&clientVersion=15.0.65&d_brand=apple`,
                algo: {
                    sign: true,
                    expire: {
                        "code": "0001"
                    }
                },
                user
            }
        )
        let sign = await this.curl({
                'form': `functionId=ds_signIn_signInGetRewards&avifSupport=0&body={"channelId":"rn01"}&build=169770&client=apple&clientVersion=15.0.65&d_brand=apple&d_model=iPhone13%2C3&ef=1`,
                algo: {
                    sign: true,
                },
                user
            }
        )
        if (this.haskey(sign, 'data.status', 1)) {
            p.log(sign.data.rewardText)
            p.info.work = true
            for (let i of this.haskey(sign, 'data.rewardList')) {
                if (i.beansAmount) {
                    p.award(i.beansAmount, 'bean')
                }
                else {
                    p.log(i)
                }
            }
        }
        else {
            p.log("没有获取到京豆,可能已经签到过")
        }
    }
}

