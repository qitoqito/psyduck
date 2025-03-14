import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东当天京豆汇总',
            crontab: `${this.rand(0, 40)} ${this.rand(21, 23)} * * *`
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let echo
        let x = this.getDate(this.timestamp, 0, '-')
        let r = new RegExp(`${x}`)
        let xs = []
        let s = await this.curl({
                'url': `https://api.m.jd.com/?appid=jd-cphdeveloper-m&functionId=myBean&body={"tenantCode":"jgminise","bizModelCode":6,"bizModeClientType":"WxMiniProgram","externalLoginType":1}&sceneval=2&g_login_type=1&callback=draw_activetemporary&g_tk=610895985&g_ty=ls`,
                user,
                algo: {
                    expire: {"code": "1001"}
                }
            }
        )
        if (this.haskey(s, 'list')) {
            for (let k of this.haskey(s, 'list')) {
                if (k.createDate.includes(x)) {
                    xs.push(k)
                }
            }
            let z = [], f = []
            let d = {}
            for (let i of xs) {
                d[i.visibleInfo] = d[i.visibleInfo] || {
                    eventMassage: i.visibleInfo.replace(/参加|店铺活动|-奖励|\[|\]/g, ''),
                    amount: 0
                }
                d[i.visibleInfo].amount += parseInt(i.amount)
            }
            let dict = Object.values(d).sort(function(a, b) {
                return b.amount - a.amount
            })
            echo = [`🐹  今日总共收入: ${this.sum(this.column(dict, 'amount').filter(d => d>0)) || 0}  支出: ${this.sum(this.column(dict, 'amount').filter(d => d<0)) || 0}`]
            for (let i of dict) {
                if (parseInt(i.amount)<0) {
                    echo.push(`🐶  [${i.amount}] ${i.eventMassage}`)
                }
                else {
                    echo.push(`🦁  [${i.amount}] ${i.eventMassage}`)
                }
            }
            if (this.haskey(s, 'willExpireNum')) {
                echo.push(`🙊  [${s.willExpireNum}] 即将过期`)
            }
        }
        else {
            for (let i = 1; i<20; i++) {
                let s = await this.curl({
                    "url": `https://api.m.jd.com/client.action?functionId=getJingBeanBalanceDetail`,
                    "form": `body=${escape(JSON.stringify({"pageSize": "20", "page": i.toString()}))}&appid=ld`,
                    'user': p.user
                })
                if (!this.match(r, JSON.stringify(s))) {
                    break
                }
                for (let k of s.detailList) {
                    if (k.date.includes(x)) {
                        xs.push(k)
                    }
                }
            }
            let z = [], f = []
            let d = {}
            for (let i of xs) {
                d[i.eventMassage] = d[i.eventMassage] || {
                    eventMassage: i.eventMassage.replace(/参加|店铺活动|-奖励|\[|\]/g, ''),
                    amount: 0
                }
                d[i.eventMassage].amount += parseInt(i.amount)
            }
            let dict = Object.values(d).sort(function(a, b) {
                return b.amount - a.amount
            })
            echo = [`🐹  今日总共收入: ${this.sum(this.column(dict, 'amount').filter(d => d>0)) || 0}  支出: ${this.sum(this.column(dict, 'amount').filter(d => d<0)) || 0}`]
            for (let i of dict) {
                if (parseInt(i.amount)<0) {
                    echo.push(`🐶  [${i.amount}] ${i.eventMassage}`)
                }
                else {
                    echo.push(`🦁  [${i.amount}] ${i.eventMassage}`)
                }
            }
            let jbd = await this.curl({
                    'url': `https://api.m.jd.com/client.action`,
                    'form': `functionId=jingBeanDetail&body={"pageSize":20,"pageNo":1}&appid=ld&client=apple&clientVersion=12.3.1`,
                    user,
                    algo: {
                        sign: true
                    }
                }
            )
            if (this.haskey(jbd, 'others.jingBeanExpire.title')) {
                let expire = this.match(/有(\d+)个/, jbd.others.jingBeanExpire.title)
                if (expire) {
                    echo.push(`🙊  [${expire}] 即将过期`)
                }
            }
        }
        p.msg(echo.join("\n"))
    }

    getDate(date, day, join = '-') {
        var dd = new Date(date);
        dd.setDate(dd.getDate() + day);
        var y = dd.getFullYear();
        var m = dd.getMonth() + 1<10 ? "0" + (dd.getMonth() + 1) : dd.getMonth() + 1;
        var d = dd.getDate()<10 ? "0" + dd.getDate() : dd.getDate();
        return y + join + m + join + d;
    }

    sum(array, n = 0) {
        let sum = eval(array.join("+"))
        if (n) {
            sum = sum.toFixed(n)
        }
        return sum
    }
}

