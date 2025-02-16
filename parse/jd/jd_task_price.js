import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: "京东保价",
            crontab: 2,
            keyExpire: 600,
            prompt: {
                coupon: '1 #默认不使用券保价'
            }
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let s = await this.curl({
                'url': `https://api.m.jd.com/`,
                'form': `functionId=mlproprice_skuOnceApply_jsf&appid=price_protection&loginType=2&body={"onceBatchId":"","couponConfirmFlag":null,"type":"25"}&client=apple&clientVersion=&x-api-eid-token=jdd03C3HUEKC6G2V5WV6SOXJV5E4J2ILKIIHLPARTU7DKUSMS72ICFUVMMF7ZVZXDON6VLTUCVU2GNZ2RZRMVIDXGF2FBMUAAAAMQFQIBMFAAAAAACIQ46Z6H2VWO6MX&h5st=&t=1718726274981`,
                user,
                algo: {
                    status: true,
                    appId: '6f46e'
                }
            }
        )
        if (this.haskey(s, 'data')) {
            p.info.work = true
        }
        if (this.haskey(s, 'data.succAmount')) {
            p.msg(`保价: ${s.data.succAmount}`)
        }
        else if (this.haskey(s, 'data.confirmCouponInfos.0.couponId')) {
            let onceBatchId = this.haskey(s, 'data.onceBatchId')
            if (this.profile.coupon) {
                p.log("当前可用优惠券保价")
                let ss = await this.curl({
                        'url': `https://api.m.jd.com/`,
                        'form': `functionId=mlproprice_skuOnceApply_jsf&appid=price_protection&loginType=2&body={"onceBatchId":"${onceBatchId}","couponConfirmFlag":1,"type":"25"}&client=apple&clientVersion=&x-api-eid-token=jdd03UT42BFT33TGS6GOIOWXCCOFR2T5UM44HG27BZ3JBLL5TQWMEHHCGMANY7T3YNDDBPISS4SS7Z7C7T3OFBOP5QFT2KIAAAAMRENKUBUQAAAAACBZLQEQUA7ANXQX&h5st=&t=1722874735852`,
                        user,
                        algo: {
                            appId: '6f46e'
                        }
                    }
                )
                if (this.haskey(ss, 'data.succAmount')) {
                    p.msg(`用券保价: ${ss.data.succAmount}`)
                }
                else {
                    p.log(this.haskey(ss, ['data.onceApplyNoSuccessTips', 'data.responseMessage']) || s)
                }
            }
            else {
                p.msg("有可用券可以保价")
            }
        }
        else {
            p.log(this.haskey(s, ['data.onceApplyNoSuccessTips', 'data.responseMessage']) || s)
        }
    }
}

