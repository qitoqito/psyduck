import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东京喜自营签到',
            crontab: 3,
            headers: {
                referer: 'https://pro.m.jd.com/mall/active/2iqSwv1JiDHxAkHAikfU6XAECFmo/index.html'
            },
            interval: 2000
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let query = await this.curl({
                'url': `https://api.m.jd.com/api?functionId=jxzy_active_querySign&appid=jx_h5_babel&t=1749971701995&channel=jxh5&clientVersion=1.2.5&client=jxh5&cthr=1&loginType=2&body={"source":"jxzy","craftId":"6824629a7c46584759d39b78","sceneval":2,"buid":325,"appCode":"ms1888ebbf"}`,
                user,
                algo: {
                    signStr: true,
                    expire: {
                        code: 13,
                    }
                }
            }
        )
        let sign = await this.curl({
                url: `https://api.m.jd.com/api?functionId=jxzy_active_drawSign&appid=jx_h5_babel&t=1749971385687&channel=jxh5&clientVersion=1.2.5&client=jxh5&body={"itemId":"1","craftId":"6824629a7c46584759d39b78","source":"jxzy","sceneval":2,"buid":325,"appCode":"ms1888ebbf"}`,
                user,
                algo: {
                    appId: 'c50cc',
                    signStr: true
                }
            }
        )
        if (this.haskey(sign, 'data.alreadySignDays')) {
            p.log("签到天数:", sign.data.alreadySignDays)
            switch (sign.data.alreadySignDays) {
                case 2:
                    var bean = 4;
                    break
                case 3:
                    var bean = 10;
                    break
                default:
                    var bean = 2
                    break
            }
            if (this.haskey(sign, 'data.prizeInfos')) {
                for (let i of sign.data.prizeInfos) {
                    if (i.prizeType == 2) {
                        p.award(i.discount, 'bean')
                    }
                    else {
                        p.log(i)
                    }
                }
            }
            else {
                p.award(bean, 'bean')
            }
            p.info.work = true
        }
        else if (this.haskey(sign, 'code', 103)) {
            p.info.work = true
            p.log("已签到天数:", this.haskey(query, 'data.alreadySignDays') || 1)
        }
        else if (this.haskey(sign, 'code', 3001,)) {
            p.log('非活动受邀用户')
            p.info.work = true
        }
        else {
            p.log(sign)
        }
    }
}

