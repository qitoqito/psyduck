import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东红包雨',
            crontab: `${this.rand(0, 20)} 20 * * *`,
            headers: {
                'user-agent': 'wechat',
                referer: 'https://servicewechat.com/wx91d27dbf599dff74/806/page-frame.html'
            },
            interval: 2000
        }
    }

    async prepare() {
        let s = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=getRevisionHbRainFloor&appid=hot_channel&loginType=11&body={}`,
            }
        )
        if (this.haskey(s, 'data.reserveActiveId')) {
            this.shareCode({
                reserveActiveId: s.data.reserveActiveId
            })
        }
        else {
            this.jump = true
            this.log("没有红包雨数据")
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let draw = await this.curl({
                'url': `https://api.m.jd.com/drawRevisionHbRain?g_ty=ls&g_tk=1701345998`,
                'form': `appid=hot_channel&body={}&client=apple&clientVersion=10.17.200&functionId=drawRevisionHbRain`,
                algo: {
                    appId: '61cdd',
                    expire: {"subCode": 1001}
                },
                user
            }
        )
        if (this.haskey(draw, 'data')) {
            p.info.work = true
            if (this.haskey(draw, 'data.prizeInfo.hbPrize')) {
                p.award(draw.data.prizeInfo.hbPrize.discount, 'redpacket')
            }
            else {
                p.log(draw.data.prizeInfo || draw.data)
            }
        }
        else if (this.haskey(draw, 'subCode', 1006)) {
            p.info.work = true
            p.log("用户剩余抽奖次数为零")
        }
    }
}

