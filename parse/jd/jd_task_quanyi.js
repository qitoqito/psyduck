import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东权益中心',
            crontab: 3
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let sign = await this.curl({
                'form': `appid=plus_business&body={"baseVersion":"2.0.0","scene":"signBlindDaily","gcLat":"0.000000","gcLng":"0.000000"}&functionId=bff_rights_center_index_sign`,
                user,
                algo: {
                    appId: 'b63ff',
                    expire: {code: 'F10002'}
                }
            }
        )
        if (this.haskey(sign, 'code', '1711000')) {
            p.info.work = true
            p.log("签到成功")
            let index = await this.curl({
                    'form': `appid=plus_business&body={"baseVersion":"2.0.0","modelVersion":"2.0.0","queryTypes":"SIGN_DAILY","scene":"index","otherApis":[{"api":"balance_abTest_v3","businessParam":{"procudtAndExpResultList":"[{\\"productLine\\":\\"WJQYZX\\",\\"expIdWithDefautExpLabel\\":{\\"WJQYZX_78369\\":\\"base\\"}}]"}}]}&functionId=bff_rights_center_index`,
                    user,
                    algo: {
                        appId: '1ff7a'
                    }
                }
            )
            for (let i of this.haskey(index, 'rs.SIGN.signRewards')) {
                if (i.type == 0) {
                    p.award(i.value, 'redpacket')
                }
                else {
                    p.log(i.title)
                }
            }
        }
        else if (this.haskey(sign, 'code', '1711002')) {
            p.log("今天已完成签到哦")
            p.info.work = true
        }
        else {
            p.log(sign)
        }
    }
}

