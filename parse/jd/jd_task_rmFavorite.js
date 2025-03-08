import {Template} from '../../template.js'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东取消商品收藏',
            delay: 1200,
            interval: 3000,
            prompt: {
                whiteList: '保留关键词,关键词1|关键词2',
                blackList: '只删除关键词,关键词1|关键词2',
            },
        }
    }

    async prepare() {
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let page = 1
        for (let i = 0; i<6; i++) {
            let s = await this.curl({
                    'url': `https://api.m.jd.com/?appid=jd-cphdeveloper-m&functionId=queryFollowProduct&body={"cp":${page},"pageSize":20,"category":"","promote":0,"cutPrice":0,"coupon":0,"stock":0,"tenantCode":"jgm","bizModelCode":"6","bizModeClientType":"M","externalLoginType":"1"}&loginType=2&uuid=40501164094171678865533299&openudid=40501164094171678865533299&sceneval=2&g_login_type=1&g_tk=646642342&g_ty=ajax&appCode=msd95910c4`,
                    user,
                    algo: {
                        appId: "c420a",
                        status: true,
                        expire: {
                            "errorCode": 101
                        }
                    }
                }
            )
            if (this.haskey(s, 'followProductList')) {
                p.log("当前商品收藏数:", s.totalNum)
                if (s.totalNum>0) {
                    page = Math.ceil(s.totalNum / 20)>1 ? this.rand(1, Math.ceil(s.totalNum / 20)) : 1
                    // commTitle
                    if (this.profile.whiteList) {
                        let whiteList = this.profile.whiteList
                        var data = s.followProductList.filter(d => !d.commTitle.match(whiteList))
                    }
                    else if (this.profile.blackList) {
                        let blackList = this.profile.blackList
                        var data = s.followProductList.filter(d => d.commTitle.match(blackList))
                    }
                    else {
                        var data = s.followProductList
                    }
                    if (data.length>0) {
                        p.log(`正在删除:`, this.column(data, 'commTitle').join("|"))
                        let rm = await this.curl({
                                'url': `https://api.m.jd.com/api?functionId=batchCancelFavorite&body={"skus":"${this.column(data, 'commId').join(",")}"}&appid=follow_for_concert&client=pc`,
                                user
                            }
                        )
                        p.log(rm.resultMsg)
                        p.info.work = true
                    }
                    else {
                        break
                    }
                }
                else {
                    p.log("没有获取关注数据")
                    break
                }
                if (s.totalNum<20) {
                    break
                }
            }
            else if (this.haskey(s, 'totalNum', 0)) {
                p.log("没有可删除的收藏")
                p.info.work = true
                break
            }
            else {
                p.log("可能黑ip了,没有获取到数据")
                break
            }
        }
    }
}

