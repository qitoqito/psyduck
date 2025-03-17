import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东资产汇总',
            crontab: `${this.rand(0, 40)} ${this.rand(21, 23)} * * *`,
            interval: 1000,
            delay: 200
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        context.dict = {}
        await this._ecard(p)
        await this._redpacket(p)
        await this._bean(p)
        let t = []
        for (let i in context.dict) {
            let data = context.dict[i]
            switch (i) {
                case 'card':
                    t.push(`🦁 京超市卡: ${data || 0}元`)
                    break
                case 'score':
                    t.push(`🐵 有京享值: ${data || 0}分`)
                    break
                case 'jingtie':
                    t.push(`🦁 账户京贴: ${data || 0}元`)
                    break
                case 'redpacket':
                    t.push(`🦊 当前红包: ${data.all}元`)
                    t.push(`🦊 即将到期: ${data.expire}元`)
                    t.push(`🦊 还未生效: ${data.disable}元`)
                    t.push(`🦊 通用红包: ${data.current[0]}元, 过期: ${data.current[1]}元`)
                    t.push(`🦊 商城红包: ${data.app[0]}元, 过期: ${data.app[1]}元`)
                    // t.push(`🦊 京喜红包: ${data.pingou[0]}元, 过期: ${data.pingou[1]}元`)
                    t.push(`🦊 特价红包: ${data.lite[0]}元, 过期: ${data.lite[1]}元`)
                    t.push(`🦊 微信红包: ${data.wechat[0]}元, 过期: ${data.wechat[1]}元`)
                    t.push(`🦊 健康红包: ${data.healthy[0]}元, 过期: ${data.healthy[1]}元`)
                    break
                case 'bean':
                    t.push(`🐶 当前京豆: ${data.all}京豆`)
                    t.push(`🐶 今日收入: ${data.today[0]}京豆, 支出: ${data.today[1]}京豆`)
                    t.push(`🐶 昨天收入: ${data.yesterday[0]}京豆, 支出: ${data.yesterday[1]}京豆`)
                    if (data.expire) {
                        for (let i of data.expire.reverse()) {
                            t.push(`🙊 即将过期: ${i.eventMassage} ${i.amount}京豆`)
                        }
                    }
                    break
                case 'xibean':
                    t.push(`🐻 当前喜豆: ${data || 0}喜豆`)
                    break
                case'cash':
                    t.push(`🐰 换领现金: 可兑换${data || 0}元`)
                    break
                case 'ms':
                    t.push(`🦁 换秒秒币: 可兑换${(data / 1000).toFixed(2)}元`)
                    break
                case 'earn':
                    t.push(`🐹 京东赚赚: 可兑换${(data / 10000).toFixed(2)}元`)
                    break
                case 'coin':
                    t.push(`🐯 极速金币: 可兑换${(data / 10000).toFixed(2)}元`)
                    break
                case 'cattle':
                    t.push(`🐮 牛牛福利: 可兑换${(data / 1000).toFixed(2)}元`)
                    break
                case 'egg':
                    t.push(`🐥 京喜牧场: 可兑换鸡蛋${data || 0}个`)
                    break
                case 'pet':
                    t.push(`🐙 东东萌宠: ${data.goods}, 完成: ${data.complete}-${data.percent}%/${data.exchange}`)
                    break
                case 'farm':
                    t.push(`🐨 东东农场: ${data.goods}, 完成: ${data.complete}/${data.exchange}, 还需浇水: ${(data.exchange - data.complete) / 10}次, 进度: ${data.percent}%`)
                    break
                default:
                    // console.log(i)
                    break
            }
        }
        p.msg(t.join("\n"))
    }

    async _bean(p) {
        let user = p.data.user;
        let context = p.context;
        let b = await this.curl({
            url: 'https://api.m.jd.com/client.action',
            form: 'functionId=jingBeanDetail&body=%7B%7D&uuid=bbf7dd32710a04388eec3dd&client=apple&clientVersion=10.0.10&st=1640919377235&sv=112&sign=8ddd454db0ddfa76947dab4c35cc07fb',
            user
        })
        try {
            let x = this.getDate(this.timestamp, 0, '-')
            let y = this.getDate(this.timestamp, -1, '-')
            let r = new RegExp(`${x}|${y}`)
            let xs = []
            let ys = []
            for (let i = 1; i<50; i++) {
                let params = {
                    "url": `https://api.m.jd.com/client.action?functionId=getJingBeanBalanceDetail`,
                    "form": `body=${escape(JSON.stringify({"pageSize": "20", "page": i.toString()}))}&appid=ld`,
                    user
                }
                let s = await this.curl(params)
                if (!this.match(r, JSON.stringify(s))) {
                    break
                }
                for (let k of s.detailList) {
                    if (k.date.includes(x)) {
                        xs.push(k.amount)
                    }
                    else if (k.date.includes(y)) {
                        ys.push(k.amount)
                    }
                }
            }
            let xsa = xs.filter(d => d>0)
            let xsb = xs.filter(d => d<0)
            let ysa = ys.filter(d => d>0)
            let ysb = ys.filter(d => d<0)
            let bean = {}
            bean.today = [this.sum(xsa) || 0, this.sum(xsb) || 0]
            bean.yesterday = [this.sum(ysa) || 0, this.sum(ysb) || 0]
            bean.expire = this.haskey(b, 'others.jingBeanExpiringInfo.detailList')
            bean.all = this.haskey(b, 'others.jingBeanBalance.jingBeanCount')
            context.dict.bean = bean
        } catch (e) {
        }
    }

    async _ecard(p) {
        let user = p.data.user;
        let context = p.context;
        let s = await this.curl({
                'url': `https://api.m.jd.com/`,
                'form': `appid=JDC_APP_H5&loginType=2&loginWQBiz=ECard&body=&functionId=smt_exCard_supermarket&client=m&isLoading=true`,
                user
            }
        )
        if (this.haskey(s, 'exCardVos.balance')) {
            context.dict.card = s.exCardVos.balance
        }
    }

    async _redpacket(p) {
        let user = p.data.user;
        let context = p.context;
        let s = await this.curl({
                'url': `https://api.m.jd.com/client.action?functionId=myhongbao_getUsableHongBaoList`,
                'form': 'functionId=myhongbao_getUsableHongBaoList&body=%7B%22fp%22%3A%22-1%22%2C%22appToken%22%3A%22apphongbao_token%22%2C%22childActivityUrl%22%3A%22-1%22%2C%22country%22%3A%22cn%22%2C%22openId%22%3A%22-1%22%2C%22childActivityId%22%3A%22-1%22%2C%22applicantErp%22%3A%22-1%22%2C%22platformId%22%3A%22appHongBao%22%2C%22isRvc%22%3A%22-1%22%2C%22orgType%22%3A%222%22%2C%22activityType%22%3A%221%22%2C%22shshshfpb%22%3A%22-1%22%2C%22platformToken%22%3A%22apphongbao_token%22%2C%22organization%22%3A%22JD%22%2C%22pageClickKey%22%3A%22-1%22%2C%22platform%22%3A%221%22%2C%22eid%22%3A%22-1%22%2C%22appId%22%3A%22appHongBao%22%2C%22childActiveName%22%3A%22-1%22%2C%22shshshfp%22%3A%22-1%22%2C%22jda%22%3A%22-1%22%2C%22extend%22%3A%22-1%22%2C%22shshshfpa%22%3A%22-1%22%2C%22activityArea%22%3A%22-1%22%2C%22childActivityTime%22%3A%22-1%22%7D&uuid=487f7b22f68312d2c1bbc93b1aea44&client=apple&clientVersion=10.0.10&st=1652335589917&sv=111&sign=e47eb0c72c2a8107c714daf91cb89a65',
                user
            }
        )
        let end = Math.round(new Date(new Date().setHours(23, 59, 59)).getTime() / 1000) + 1
        let r = {
            current: [],
            app: [],
            lite: [],
            pingou: [],
            healthy: [],
            wechat: [],
        }
        let dict = {
            current: [0],
            currentExpire: [0],
            app: [0],
            pingou: [0],
            lite: [0],
            healthy: [0],
            wechat: [0],
            appExpire: [0],
            pingouExpire: [0],
            liteExpire: [0],
            healthyExpire: [0],
            wechatExpire: [0],
            all: [0],
            expire: [0],
            disable: [0],
        }
        try {
            for (let i of this.haskey(s, 'hongBaoList')) {
                dict.all.push(i.balance)
                let expire = end>i.endTime / 1000
                let disable = end - 2>i.beginTime / 1000
                let orgLimitStr = i.orgLimitStr
                if (disable) {
                    if (orgLimitStr.includes("商城")) {
                        dict.app.push(i.balance)
                        if (expire) {
                            dict.appExpire.push(i.balance)
                            dict.expire.push(i.balance)
                        }
                    }
                    else if (orgLimitStr.includes("极速") || orgLimitStr.includes("特价")) {
                        dict.lite.push(i.balance)
                        if (expire) {
                            dict.liteExpire.push(i.balance)
                            dict.expire.push(i.balance)
                        }
                    }
                    else if (orgLimitStr.includes("京喜")) {
                        dict.pingou.push(i.balance)
                        if (expire) {
                            dict.pingouExpire.push(i.balance)
                            dict.expire.push(i.balance)
                        }
                    }
                    else if (orgLimitStr.includes("健康")) {
                        dict.healthy.push(i.balance)
                        if (expire) {
                            dict.healthyExpire.push(i.balance)
                            dict.expire.push(i.balance)
                        }
                    }
                    else if (orgLimitStr.includes("小程序")) {
                        dict.wechat.push(i.balance)
                        if (expire) {
                            dict.wechatExpire.push(i.balance)
                            dict.expire.push(i.balance)
                        }
                    }
                    else {
                        dict.current.push(i.balance)
                        if (expire) {
                            dict.currentExpire.push(i.balance)
                            dict.expire.push(i.balance)
                        }
                    }
                }
                else {
                    dict.disable.push(i.balance)
                }
            }
        } catch (e) {
        }
        for (let i in r) {
            r[i] = [this.sum(dict[i], 2), this.sum(dict[`${i}Expire`], 2)].map(d => d == '0.00' ? 0 : d)
        }
        r.all = this.sum(dict.all, 2)
        r.expire = this.sum(dict.expire, 2)
        r.disable = this.sum(dict.disable, 2)
        context.dict.redpacket = r
    }

    sum(array, n = 0) {
        let sum = eval(array.join("+"))
        if (n) {
            sum = sum.toFixed(n)
        }
        return sum
    }

    getDate(date, day, join = '-') {
        var dd = new Date(date);
        dd.setDate(dd.getDate() + day);
        var y = dd.getFullYear();
        var m = dd.getMonth() + 1<10 ? "0" + (dd.getMonth() + 1) : dd.getMonth() + 1;
        var d = dd.getDate()<10 ? "0" + dd.getDate() : dd.getDate();
        return y + join + m + join + d;
    }
}

