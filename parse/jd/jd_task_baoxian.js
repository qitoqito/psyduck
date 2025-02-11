import {Template} from '../../template.js'
import jsdom from "jsdom";
import {Window} from 'happy-dom' ;
import fs from 'fs'

export class Main extends Template {
    constructor() {
        super()
        this.profile = {
            title: '京东保险天天领权益',
            crontab: 3
        }
    }

    async prepare() {
        let ua = this.userAgents().jd
        let resourceLoader = new jsdom.ResourceLoader({
            userAgent: ua,
            "referer": "https://iu.jr.jd.com/",
        });
        let virtualConsole = new jsdom.VirtualConsole();
        this.jsConfig = {
            "url": "https://iu.jr.jd.com/",
            "referer": "https://iu.jr.jd.com/",
            "userAgent": ua,
            runScripts: "dangerously",
            resources: resourceLoader,
            includeNodeLocations: true,
            storageQuota: 10000000,
            pretendToBeVisual: true,
            virtualConsole,
        };
        let JSDOM = jsdom.JSDOM
        let a = new JSDOM(`<body><script src="https://jrsecstatic.jdpay.com/jr-sec-dev-static/aar2.min.js"></script> <script src="https://m.jr.jd.com/common/jssdk/jrbridge/2.0.0/jrbridge.js"></script>   <script src="https://jrsecstatic.jdpay.com/jr-sec-dev-static/cryptico.min.js"></script>  </body>`, this.jsConfig)
        await this.wait(1000)
        if (a.window.AAR2) {
            a.window.AAR2.init();
            this.crypto = {
                aar: new a.window.AAR2(),
                cry: a.window.cryptico
            }
        }
        else {
            this.log("jsdom没有获取到aar2")
            this.jump = 1
        }
        // let jsFiles = [
        //     'aar2.min.js',
        //     'cryptico.min.js',
        //     'jrbridge.js',
        // ];
        // const window = new Window();
        // const document = window.document;
        // for (let i of jsFiles) {
        //     const jsCode = fs.readFileSync(`${this.abspath}/static/${i}`, 'utf-8');
        //     const scriptElement = document.createElement('script');
        //     scriptElement.textContent = jsCode;
        //     document.body.appendChild(scriptElement);
        // }
        // document.body.innerHTML = '<body><script src="https://jrsecstatic.jdpay.com/jr-sec-dev-static/aar2.min.js"></script> <script src="https://m.jr.jd.com/common/jssdk/jrbridge/2.0.0/jrbridge.js"></script>   <script src="https://jrsecstatic.jdpay.com/jr-sec-dev-static/cryptico.min.js"></script>  </body>';
        // window.AAR2.init();
        // this.crypto = {
        //     aar: new window.AAR2(),
        //     cry: window.cryptico
        // }
        // console.log(this.crypto.aar.nonce())
        // console.log(this.crypto.aar.sign(234,this.crypto.aar.nonce()))
        // this.jump=234
    }

    async main(p) {
        let user = p.data.user;
        let context = p.context;
        let a = new jsdom.JSDOM(`<body><script src="//gia.jd.com/m.html"></script>  <script src="//gias.jd.com/js/m.js"></body>`, this.jsConfig)
        await this.wait(2000)
        let riskJd = a.window.getJdEid();
        let bean = 0
        const aar = this.crypto.aar
        var nonce = aar.nonce()
        let getAAR = function() {
            var s = "qypd" + (new Date).getTime();
            return {
                nonce,
                signData: s,
                signature: aar.sign(s, nonce)
            }
        }
        let rsa = await this.curl({
            'url': `https://ms.jr.jd.com/gw/generic/getRSAPublicKey`,
            'form': `reqData=%7B%22channel%22%3A%22sy%22%2C%22channelLv%22%3A%22sy%22%7D`,
            user
        })
        let resBusiData = this.loads(rsa.resultData.publicKey)
        this.crypto.cry.setPublicKeyString(resBusiData)
        let bodyEnc = await this.crypto.cry.encryptData(this.dumps({
            "marketId": "bxqypd",
            "pageUrl": "https://iu.jr.jd.com/insurance/channel/interest?showTab=1",
            "qdPageId": "3MB9G",
            eid: riskJd.eid,
            fp: riskJd.fp,
            token: riskJd.token,
            profitChannelCode: "qypd",
            rush: getAAR()
        }))
        let jdr = await this.curl({
                'url': `https://ms.jr.jd.com/gw2/generic/bxpd/newh5/m/jingDouInterestChannel`,
                json: {
                    reqData: {
                        "channelEncrypt": 1,
                        "bodyEncrypt": bodyEnc.cipher
                    }
                },
                user
            }
        )
        let res = (await this.crypto.cry.decryptData(jdr.resultData))
        if (res.status) {
            let plaintext = this.loads(res.plaintext)
            p.log("签到中...")
            let signData = {
                "relationId": "ej94ec6d",
                "relationType": 3,
                "ruleAliasCode": "signUpAndTake",
                "contextParams": {
                    "request": {
                        "riskMap": {
                            "pageUrl": "https://iu.jr.jd.com/insurance/channel/interest?showTab=1",
                            "qdPageId": "M2Wq",
                            "mdClickId": `M2Wq|*ej94ec6d****${this.md5(p.user)}`
                        },
                        "deviceInfo": riskJd
                    }
                }
            }
            let signature = aar.sign(this.dumps(signData), nonce)
            let sign = await this.curl({
                    'url': `https://ms.jr.jd.com/gw2/generic/jractivity/h5/m/rule/execute`,
                    'json': {
                        reqData: {
                            "preview": 0,
                            "antiRushFlag": "1",
                            "domain": "iu.jr.jd.com",
                            "uri": "/insurance/channel/interest?showTab=1",
                            "nonce": nonce,
                            "signature": signature,
                            "signData": this.dumps(signData)
                        }
                    },
                    algo: {
                        valid: {
                            'resultData.data.code': ['0006']
                        }
                    },
                    user
                }
            )
            if (this.haskey(sign, 'resultData.data.data.signAwardInfoList')) {
                p.info.work = true
                for (let i of sign.resultData.data.data.signAwardInfoList) {
                    p.log(`获得${i.awardName}:${i.awardNum}`)
                    bean += i.awardNum
                }
            }
            else {
                p.log(this.haskey(sign, 'resultData.data.msg') || sign)
                if (this.haskey(sign, 'resultData.data.code', '0002')) {
                    p.log("风控账户")
                    return
                }
                else if (this.haskey(sign, 'resultData.data.code', '0006')) {
                    p.log("未登录")
                    return
                }
                else if (this.haskey(sign, 'resultData.data.code', '0009')) {
                    p.info.work = true
                }
            }
            //     p.log(plaintext)
            //     for (let i of this.haskey(plaintext, 'task.taskList')) {
            //         if (i.taskStatus) {
            //             p.log("任务已完成:", i.taskName)
            //         }
            //         else {
            //             p.log("正在运行:", i.taskName)
            //             let juid = this.match(/juid=(\w+)/, i.taskLink)
            //             if (juid) {
            //                 let juidSign = aar.sign(juid, nonce)
            //                 let jump = await this.curl({
            //                         'url': `https://ms.jr.jd.com/gw2/generic/mission/h5/m/getJumpInfo?juid=${juid}&signature=${juidSign}&nonce=${nonce}`,
            //                         user
            //                     }
            //                 )
            //                 if (this.haskey(jump, 'resultData.code') == '0000') {
            //                     p.log(`获得京豆:${i.awardNum}`)
            //                     bean += i.awardNum
            //                 }
            //                 else {
            //                     p.log('失败了:', jump)
            //                 }
            //             }
            //         }
            //     }
        }
        else {
            p.log("没有获取到游戏数据...")
        }
        if (bean>0) {
            p.msg(`获得京豆: ${bean}`)
        }
    }
}
