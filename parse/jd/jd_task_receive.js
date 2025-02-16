import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东支付返京豆',
            crontab: `${this.rand(0, 59)} ${this.rand(0, 21)} */3 * *`
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let receive = await this.curl({
                'url': `https://api.m.jd.com/api`,
                'form': `functionId=rights_receiveJdBean_v1&appid=plus_business&loginType=2&loginWQBiz=&body={}`,
                user,
                algo: {
                    appId: 'b63ff',
                    expire: {
                        code: 'F10002'
                    }
                }
            }
        )
        if (this.haskey(receive, 'rs.receiveAmount')) {
            p.msg(`订单数量:${receive.rs.orderCount} 返豆: ${receive.rs.receiveAmount}`)
            p.info.work = true
        }
        else if (this.haskey(receive, 'code', '1780021')) {
            p.log("没有可以返豆的订单")
            p.info.work = true
        }
        else {
            p.log(this.haskey(receive, 'msg') || receive)
        }
    }
}

