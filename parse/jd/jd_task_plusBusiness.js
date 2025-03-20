import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东PLUS天天开盲盒',
            crontab: 3,
            interval: 1000,
            headers: {
                referer: 'https://plus.m.jd.com/index?flow_system=wjhk&resourceExportId=1010225'
            }
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let s = await this.curl({
                'form': `functionId=delivery_component&body={"ubbLocId":"plus_ttmh"}&appid=plus_business&loginType=2&loginWQBiz=&scval=test07`,
                user,
                algo: {
                    appId: '124a8',
                    expire: {
                        "code": 401,
                    }
                }
            }
        )
        let data = this.haskey(s, 'data.compInfoList.0.data')
        if (!data) {
            if (this.haskey(s, 'data.compInfoList.0')) {
                p.info.work = true
            }
            p.err("没有获取到数据,可能不是Plus用户")
        }
        else {
            let detail = this.haskey(data, 'rightResourceDetails.0') || {}
            for (let i in detail) {
                if (detail[i] && typeof detail[i] == 'object') {
                    if (i == 'hongBaoInfo') {
                        p.award(detail[i].discount, 'redpacket')
                    }
                    else {
                        p.log(detail[i].limitStr || detail[i])
                    }
                }
            }
            p.info.work = true
        }
    }
}

