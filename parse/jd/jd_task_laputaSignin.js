import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东医药签到',
            crontab: 3
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let sign = await this.curl({
                'form': `appid=laputa&functionId=jdh_laputa_handleSoaRequest_reinforce&body={"methodName":"handleBeanInfo2595","functionId":"sign","osName":"feedProduct","version":"1","handleType":"sign","encryptProjectId":"3vRVP84ukngNhNYVDQTXuQQzJjit","encryptAssignmentIds":["3LbDQhTDsr5n7wL4XPyubMvEuUR3"],"deviceType":1,"itemId":"1"}`,
                algo: {
                    appId: '70777',
                    expire: {code: '1023',}
                },
                user
            }
        )
        if (this.haskey(sign, 'data.signIn')) {
            this.log("已签到")
            if (this.haskey(sign, 'data.signResultDTO')) {
                p.award(sign.data.signResultDTO.totalQuantity, 'bean')
            }
        }
        else {
            p.log("已签到或者活动火爆")
        }
        if (sign) {
            p.info.work = true
        }
    }
}

