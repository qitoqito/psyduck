import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东天天来赚钱',
            headers: {
                referer: 'https://servicewechat.com/wx91d27dbf599dff74/770/page-frame.html',
                'user-agent': 'wechat',
                wqreferer: 'http://wq.jd.com/wxapp/pages/marketing/entry_task/channel',
                'X-Rp-Client': 'mini_2.1.0'
            },
            crontab: 3
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let status
        let s = await this.curl({
                'url': `https://api.m.jd.com/MiniTask_ChannelPage?g_ty=ls&g_tk=1629788202`,
                'form': `loginType=11&clientType=wxapp&client=apple&clientVersion=9.23.200&build=&osVersion=iOS%2015.1.1&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone%2012%20Pro%3CiPhone13%2C3%3E&lang=zh_CN&functionId=MiniTask_ChannelPage&t=1732259085779&body={"source":"task","businessSource":"bbxa"}&appid=hot_channel`,
                user,
                algo: {
                    'appId': '60d61',
                    store: 'buildtime=20230103;wxapp_type=1;wxapp_version=8.13.30;wxapp_scene=1112;cid=5;pinStatus=4;'
                }
            }
        )
        let channel = await this.curl({
                'url': `https://api.m.jd.com/MiniTask_ChannelPage?g_ty=ls&g_tk=1722006734`,
                'form': `loginType=11&clientType=wxapp&client=apple&clientVersion=9.23.140&build=&osVersion=iOS%2015.1.1&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone%2012%20Pro%3CiPhone13%2C3%3E&lang=zh_CN&uuid=oCwKwuBoW0okKEIIDlT5FXxscxcM&functionId=MiniTask_ChannelPage&t=1731719820513&body={"source":"task","silverHairInfo":{},"expose":false,"xyhfAuth":2,"xyhfShow":false,"businessSource":"2411shiyebuchuanbo","versionFlag":"new"}&appid=hot_channel`,
                user,
                algo: {
                    appId: '60d61'
                }
            }
        )
        let query = await this.curl({
                'url': `https://api.m.jd.com/miniTask_queryMyRights?g_ty=ls&g_tk=1722006734`,
                'form': `loginType=11&clientType=wxapp&client=apple&clientVersion=9.23.140&build=&osVersion=iOS%2015.1.1&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone%2012%20Pro%3CiPhone13%2C3%3E&lang=zh_CN&uuid=oCwKwuBoW0okKEIIDlT5FXxscxcM&functionId=miniTask_queryMyRights&t=1731719821597&body={}&appid=hot_channel&d_name=`,
                user,
                algo: {
                    appId: '1221c',
                    expire: {
                        "subCode": 102
                    }
                }
            }
        )
        let rights = await this.curl({
                'url': `https://api.m.jd.com/miniTask_superSaveGetRights?g_ty=ls&g_tk=1722006734`,
                'form': `loginType=11&clientType=wxapp&client=apple&clientVersion=9.22.230&build=&osVersion=iOS%2015.1.1&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone%2012%20Pro%3CiPhone13%2C3%3E&lang=zh_CN&functionId=miniTask_superSaveGetRights&t=1731641417506&body={"itemId":"1"}&appid=hot_channel`,
                user,
                algo: {
                    appId: '87bb2'
                },
            }
        )
        let sign = await this.curl({
                'url': `https://api.m.jd.com/mini_doSign?g_ty=ls&g_tk=1084416199`,
                'form': `appid=hot_channel&body={"itemId":"1"}&client=apple&clientVersion=10.14.110&functionId=mini_doSign`,
                algo: {appId: '60d61'},
                user
            }
        )
        let subCode = this.haskey(sign, 'subCode')
        if (subCode == 0) {
            status = 1
            p.msg(sign.data.toastMsg)
        }
        else if (subCode == 3010) {
            status = 1
            p.log(sign.message)
        }
        else {
            p.log(this.haskey(sign, 'message') || sign)
        }
        let sign2 = await this.curl({
                'form': `loginType=11&clientType=wxapp&client=apple&clientVersion=10.15.100&build=&osVersion=iOS%2015.1.1&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone%2012%20Pro%3CiPhone13%2C3%3E&lang=zh_CN&uuid=oTGnpnBPpyvARmNaPlEeBxjJ4J_U&partner=&forcebot=&wifiBssid=&scope=&functionId=SignComponent_doSignTask&appid=hot_channel&loginWQBiz=signcomponent&body={"activityId":"10004","version":1}`,
                user,
                algo: {
                    appId: '9a38a'
                },
                referer: 'https://servicewechat.com/wx91d27dbf599dff74/793/page-frame.html'
            }
        )
        if (status) {
            p.info.work = true
        }
    }
}

