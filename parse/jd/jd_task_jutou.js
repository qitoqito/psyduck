import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: "京东惊喜红包",
            sync: 1,
            verify: 1,
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let s = await this.curl({
                'url': `https://api.m.jd.com/`,
                'form': `functionId=jutouDisplayIndex&appid=pages-factory&body={"channelId":"${context.channelId}","lid":"MoIOQdTTwYxNCANy+PtpgKuTTLLFbZZT","ext":{"babelActivityId":"01817502"}}&client=wh5&clientVersion=15.0.11&loginType=2&h5st=&x-api-eid-token=jdd03C3HUEKC6G2V5WV6SOXJV5E4J2ILKIIHLPARTU7DKUSMS72ICFUVMMF7ZVZXDON6VLTUCVU2GNZ2RZRMVIDXGF2FBMUAAAAMU2QLD6YAAAAAADZUTVAX5ZTVVYAX`,
                user,
                algo: {
                    appId: '35fa0'
                }
            }
        )
        let n = 0
        for (let i of this.haskey(s, 'data.componentDisplayList')) {
            for (let j of i.materialInfo) {
                if (this.haskey(j, 'materialDetail.discount')) {
                    n++
                    if (j.materialType == 6) {
                        p.msg(`红包: ${j.materialDetail.discount}`)
                    }
                    else if (j.materialType == 2) {
                        p.log("优惠券:", j.materialDetail.discount)
                    }
                    else {
                        p.log(j.materialDetail)
                    }
                }
                else {
                    p.log(j.materialDetail)
                }
            }
        }
        if (!n) {
            console.log("本次执行没有获得红包")
        }
    }
}

