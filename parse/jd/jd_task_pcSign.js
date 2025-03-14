import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东网页签到',
            crontab: 2
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let sign = await this.curl({
                'url': `https://api.m.jd.com/`,
                'form': `appid=asset-h5&clientVersion=1.0.0&client=pc&body={"type":1}&functionId=jsfbox_bean_sign`,
                user,
                algo: {
                    appId: '73c2f',
                    type: 'wechat',
                    expire: {
                        "code": "3"
                    }
                },
                referer: 'https://bean.jd.com/myJingBean/list',
                ua: "Mozilla/5.0(WindowsNT10.0;Win64;x64)AppleWebKit/537.36(KHTML,likeGecko)Chrome/" + 59 + Math.round(Math.random() * 10) + ".0.3497." + Math.round(Math.random() * 100) + "Safari/537.36",
                extend: `uuid=${this.uuid(22, 'n')}&area=16_${this.rand(1000, 1300)}_${this.rand(1000, 1300)}_${this.rand(1, 19)}&loginType=2&t=${new Date().getTime()}`
            }
        )
        if (this.haskey(sign, 'data.receiveBeanNum')) {
            p.msg(`京豆: ${sign.data.receiveBeanNum}`)
            p.info.work = true
        }
        else if (this.haskey(sign, 'code', 301)) {
            p.log("重复签到")
            p.info.work = true
        }
        else {
            p.log(sign)
        }
    }
}

