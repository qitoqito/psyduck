import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东小哥送京豆',
            headers: {
                'lop-dn': 'activity.jd.com',
                'appparams': '{"appid":158,"ticket_type":"m"}',
                referer: 'https://jchd.jd.com/'
            },
            crontab: 5,
            interval: 2000,
            keyExpire: 14400,
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let home = await this.curl({
                'url': `https://lop-proxy.jd.com/PersonalApi/getHomePage`,
                json: [{
                    "pin": ""
                }],
                user,
                algo: {
                    expire: {
                        'error_response.code': 143
                    }
                }
            }
        )
        if (this.haskey(home, 'content.mangroveFiveIntegral')) {
            p.log("当前京豆:", home.content.mangroveFiveIntegral)
        }
        let environment = await this.curl({
                'url': `https://lop-proxy.jd.com/UserEnvironmentApi/pageEnvironment`,
                json: [{
                    "pin": "",
                    "pageSize": 5,
                    "pageNo": 1
                }],
                user
            }
        )
        for (let i of this.haskey(environment, 'content.list')) {
            if (i.receive == 0) {
                p.log("正在收取:", i.waybillCode)
                let receive = await this.curl({
                        'url': `https://lop-proxy.jd.com/UserEnvironmentApi/receiveJingBean`,
                        json: [{
                            "pin": "",
                            "waybillCode": i.waybillCode
                        }],
                        user
                    }
                )
            }
        }
        let mangrove = await this.curl({
                'url': `https://lop-proxy.jd.com/UserMangroveApi/userMangroveInfo`,
                json: [{
                    "pin": ""
                }],
                user
            }
        )
        let interactiveTime = this.haskey(mangrove, 'content.interactiveTime')
        if (this.haskey(mangrove, 'content.id') && !interactiveTime) {
            let water = await this.curl({
                    'url': `https://lop-proxy.jd.com/UserMangroveApi/userMangroveInteractive`,
                    json: [{
                        "pin": "",
                        "userMangroveDevelopId": mangrove.content.id,
                        "mangroveInteractiveId": mangrove.content.mangroveInteractiveDto.id
                    }],
                    user
                }
            )
            if (this.haskey(water, 'content.interactiveTime')) {
                p.log("当前等级:", water.content.stage, '下级所需成长值:', water.content.growthValue - water.content.alreadyAmount)
            }
        }
        else if (interactiveTime) {
            p.log("当前等级:", mangrove.content.stage, '下级所需成长值:', mangrove.content.growthValue - mangrove.content.alreadyAmount)
            p.log("下次养护时间:", new Date(interactiveTime).toLocaleString())
        }
        p.info.work = true
    }
}

