import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东优惠券删除',
            prompt: {
                blackList: "删除关键词,多个用|隔开"
            },
            headers: {
                referer: 'https://servicewechat.com/wx91d27dbf599dff74/760/page-frame.html'
            }
        }
    }

    async prepare() {
        let field = await this.getField('blackList')
        if (!field) {
            this.shareCode({
                blackList: "专营店|个护|卖场店"
            })
        }
        else {
            this.shareCode({
                blackList: field.join("|")
            })
        }
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let list = await this.curl({
                'url': `https://api.m.jd.com/client.action?functionId=queryJdCouponListAppletForJd&appid=jdmini-wx-search&body={"bizModelCode":"6","externalLoginType":"1","bizModeClientType":"WxMiniProgram","appId":"wx91d27dbf599dff74","token":"1999de6cba778f25f29720b0bbf7ff8b","tenantCode":"jgminise","sourceType":"wx_inter_myjd_couponlist","state":1,"wxadd":1,"filterswitch":1,"s":""}`,
                user,
                algo: {
                    appId: '245ec'
                }
            }
        )
        let rm = []
        let reg = new RegExp(context.blackList)
        let status = 0
        // console.log(list)
        if (this.haskey(list, 'coupon.useable')) {
            status++

            for (let i of list.coupon.useable) {
                if (this.match(reg, i.limitStr)) {
                    rm.push(i.couponid)
                }
            }
        }
        let n = 0
        if (rm.length>0) {
            for (let _ of Array(Math.ceil(rm.length / 50))) {
                let cp = rm.splice(0, 50).map(d => {
                    return `${d},1,0`
                }).join("|")
                let del = await this.curl({
                        'url': `https://api.m.jd.com/client.action?functionId=deleteCouponListApplet&appid=jdmini-wx-search&body={"bizModelCode":"6","externalLoginType":"1","bizModeClientType":"WxMiniProgram","appId":"wx91d27dbf599dff74","token":"1999de6cba778f25f29720b0bbf7ff8b","tenantCode":"jgminise","sourceType":"wx_inter_myjd_couponlist","couponinfolist":"${cp}"}&uuid=21466657159301714025030891&openudid=21466657159301714025030891&xAPIScval2=wx&g_ty=ls&g_tk=1678530361`,
                        user
                    }
                )
                if (this.haskey(del, 'deleteresult')) {
                    p.log("删除中:", del.deleteresult.length)
                    n += del.deleteresult.length
                }
                await this.wait(2000)
            }
        }
        if (n) {
            p.info.work = true
            p.msg(`删除${n}个优惠券`)
        }
        else {
            if (status) {
                p.info.work = true
            }
            p.log("本次执行,没有可删除的优惠券")
        }
    }
}

