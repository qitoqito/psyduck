import CryptoJS from 'crypto-js'

export class Message {
    constructor(message) {
        this.func = process.psyDuck
        this.msg = this.func.message
        this.title = `🐽  消息提醒: ${this.func.profile.title}`
        this.msgAry = message.map(d => d.join("\n"))
    }

    async send(msgAry) {
        const result = this.splitArrays(this.msgAry);
        for (let message of result) {
            message.push([`PsyDuck [https://github.com/qitoqito/psyduck]`])
            this.message = message
            if (this.msg.hasOwnProperty('TELEGRAM_TOKEN')) {
                await this.tgNotify()
            }
            if (this.msg.hasOwnProperty('BARK_TOKEN')) {
                await this.barkNotify()
            }
            if (this.msg.hasOwnProperty('PUSHPLUS_TOKEN')) {
                await this.ppNotify()
            }
            if (this.msg.hasOwnProperty('FTQQ_TOKEN')) {
                await this.ftqqNotify()
            }
            if (this.msg.hasOwnProperty('DINGTALK_TOKEN')) {
                await this.ddNotify()
            }
            if (this.msg.hasOwnProperty('IGOT_TOKEN')) {
                await this.igotNotify()
            }
            if (this.msg.hasOwnProperty('WEIXIN_TOKEN')) {
                await this.wechatNotify()
            }
            if (this.msg.hasOwnProperty('WXAM_TOKEN')) {
                await this.wxamNotify()
            }
        }
    }

    async wxamNotify() {
        let message = this.message.join("\n\n")

        function ChangeUserId(am, desp) {
            const QYWXAM_TOKEN_AY = am.split(',');
            if (QYWXAM_TOKEN_AY[2]) {
                const userIdTmp = QYWXAM_TOKEN_AY[2].split("|");
                let userId = "";
                for (let i = 0; i<userIdTmp.length; i++) {
                    const count = "账号" + (i + 1);
                    const count2 = "签到号 " + (i + 1);
                    if (desp.match(count2)) {
                        userId = userIdTmp[i];
                    }
                }
                if (!userId) userId = QYWXAM_TOKEN_AY[2];
                return userId;
            }
            else {
                return "@all";
            }
        }

        try {
            let am = this.msg['WXAM_TOKEN'].split(",")
            let s = await this.func.curl({
                    url: `https://qyapi.weixin.qq.com/cgi-bin/gettoken`,
                    json: {
                        corpid: `${am[0]}`,
                        corpsecret: `${am[1]}`,
                    },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )
            let token = s.access_token
            let options;
            let html = message.replace(/\n/g, "<br/>")
            if (am.length>4) {
                switch (am[4]) {
                    case '0':
                        options = {
                            msgtype: 'textcard',
                            textcard: {
                                title: `${this.title}`,
                                description: `${message}`,
                                url: 'https://github.com/qitoqito/kedaya',
                                btntxt: '更多'
                            }
                        }
                        break;
                    case '1':
                        options = {
                            msgtype: 'text',
                            text: {
                                content: `${this.title}\n\n${message}`
                            }
                        }
                        break;
                    default:
                        options = {
                            msgtype: 'mpnews',
                            mpnews: {
                                articles: [{
                                    title: `${this.title}`,
                                    thumb_media_id: `${am[4]}`,
                                    author: `智能助手`,
                                    content_source_url: ``,
                                    content: `${html}`,
                                    digest: `${message}`
                                }]
                            }
                        }
                }
            }
            else {
                options = {
                    msgtype: 'text',
                    text: {
                        content: `${this.title}\n\n${message}`
                    }
                }
            }
            let data = await this.func.curl({
                    url: `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`,
                    json: {
                        touser: `${ChangeUserId(this.msg['WXAM_TOKEN'], message)}`,
                        agentid: `${am[3]}`,
                        safe: '0',
                        ...options
                    },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )
            if (data.errcode === 0) {
                console.log('[Message] 成员ID:' + ChangeUserId(this.msg['WXAM_TOKEN'], message) + '企业微信应用消息发送通知消息成功🎉');
            }
            else {
                console.log(`[Message] 企业微信应用消息发送通知消息失败: ${data.errmsg}`);
            }
        } catch (e) {
            console.log('[Message] 成员ID:' + ChangeUserId(this.msg['WXAM_TOKEN'], message) + '企业微信应用消息发送通知消息失败');
        }
    }

    async wechatNotify() {
        try {
            let data = await this.func.curl({
                    url: `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${this.msg['WEIXIN_TOKEN']}`,
                    json: {
                        msgtype: 'text',
                        text: {
                            content: ` ${this.title}\n\n${this.message.join("\n\n")}`,
                        },
                    },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )
            if (data.errcode === 0) {
                console.log('[Message] 企业微信发送通知消息成功🎉');
            }
            else {
                console.log(`[Message] 企业微信发送通知消息失败: ${data.errmsg}`);
            }
        } catch (e) {
            console.log("[Message] 企业微信发送通知消息失败")
        }
    }

    async igotNotify() {
        try {
            let data = await this.func.curl({
                    'url': `https://push.hellyw.com/${this.func['IGOT_TOKEN']}`,
                    'form': `title=${encodeURIComponent(this.title)}&content=${encodeURIComponent(this.message.join("\n\n"))}`,
                }
            )
            if (data.ret === 0) {
                console.log('[Message] iGot发送通知消息成功🎉')
            }
            else {
                console.log(`[Message] iGot发送通知消息失败：${data.errMsg}`)
            }
        } catch (e) {
            console.log(`[Message] iGot发送通知消息失败`)
        }
    }

    async ftqqNotify() {
        try {
            let url = this.msg['FTQQ_TOKEN'].includes('SCT') ? `https://sctapi.ftqq.com/${this.msg['FTQQ_TOKEN']}.send` : `https://sc.ftqq.com/${this.msg['FTQQ_TOKEN']}.send`
            let s = await this.func.curl({
                    url,
                    'form': `text=${encodeURIComponent(this.title)}&desp=${encodeURIComponent(this.message.join("\n\n").replace(/[\n\r]/g, '\n\n'))}`,
                    'headers': {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                }
            ) || {}
            if (s.errno === 0 || s.data.errno === 0) {
                console.log('[Message] Server酱发送通知消息成功🎉')
            }
            else if (s.errno === 1024) {
                // 一分钟内发送相同的内容会触发
                console.log(`[Message] Server酱发送通知消息异常: ${s.errmsg}`)
            }
            else {
                console.log(`[Message] Server酱发送通知消息异常: ${JSON.stringify(s)}`)
            }
        } catch (e) {
            console.log("[Message] Server酱发送通知消息失败")
        }
    }

    async ppNotify() {
        let body = {
            token: this.msg['PUSHPLUS_TOKEN'],
            title: this.title,
            content: this.message.join("\n\n"),
            topic: this.msg['PUSHPLUS_TOPIC']
        };
        try {
            let p = {
                'url': `http://www.pushplus.plus/send`,
                'json': body
            } || {}
            let s = await this.func.curl(p)
            if (s.code == 200) {
                console.log(`[Message] push+发送${this['PUSHPLUS_TOPIC'] ? '一对多' : '一对一'}通知消息完成🎉`)
            }
            else {
                console.log(`[Message] push+发送${this['PUSHPLUS_TOPIC'] ? '一对多' : '一对一'}通知消息失败：${s.msg}`)
            }
        } catch (e) {
            console.log("[Message] Push+发送消息失败")
        }
    }

    async ddNotify() {
        try {
            let url;
            if (this.msg['DINGTALK_SECRET']) {
                let dateNow = Date.now();
                let text = `${dateNow}\n${this.msg['DINGTALK_SECRET']}`
                var hash = CryptoJS.HmacSHA256(text, this.msg['DINGTALK_SECRET']);
                var sign = CryptoJS.enc.Base64.stringify(hash);
                url = `https://oapi.dingtalk.com/robot/send?access_token=${this.msg['DINGTALK_TOKEN']}&timestamp=${dateNow}&sign=${sign}`
            }
            else {
                url = `https://oapi.dingtalk.com/robot/send?access_token=${this.msg['DINGTALK_TOKEN']}`
            }
            let s = await this.func.curl({
                    url,
                    json: {
                        "msgtype": "text",
                        "text": {
                            "content": ` ${this.title}\n\n${this.message.join("\n\n")}`
                        }
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    },
                }
            ) || {}
            if (this.func.haskey(s, 'errcode', 0)) {
                console.log('[Message] 钉钉发送通知消息成功🎉')
            }
            else {
                console.log(`[Message] 钉钉发送通知消息失败: ${s.errmsg}`)
            }
        } catch (e) {
            console.log("[Message] 钉钉发送通知消息失败")
        }
    }

    async barkNotify() {
        let url = this.msg['BARK_URL'] || 'https://api.day.app'
        url += `/${this.msg['BARK_TOKEN']}`
        let p = {
            url,
            'form': `title=${encodeURIComponent(this.title)}&body=${encodeURIComponent(this.message.join("\n\n"))}&sound=${this.msg['BARK_SOUND']}&group=${this.msg['BARK_GROUP']}`,
        }
        try {
            let s = await this.func.curl(p) || {}
            if (s.code == 200) {
                console.log('[Message] Bark APP发送通知消息成功🎉')
            }
            else {
                console.log(`[Message] Bark APP发送通知消息失败`)
            }
        } catch (e) {
            console.log("[Message] Bark发送通知消息失败")
        }
    }

    async tgNotify() {
        let url = this.msg['TELEGRAM_URL'] || 'https://api.telegram.org'
        url += `/bot${this.msg['TELEGRAM_TOKEN']}/sendMessage`
        let p = {
            url,
            form: `chat_id=${this.msg['TELEGRAM_ID']}&text=${this.title}\n\n${this.message.join("\n\n")}&disable_web_page_preview=true`,
        }
        if (this.msg['TELEGRAM_PROXY']) {
            p.proxy = this.msg['TELEGRAM_PROXY']
        }
        try {
            let s = await this.func.curl(p)
            if (s.ok) {
                console.log('[Message] Telegram发送通知消息成功🎉')
            }
            else if (s.error_code === 400) {
                console.log('[Message] 请主动给bot发送一条消息并检查接收用户ID是否正确')
            }
            else if (s.error_code === 401) {
                console.log('[Message] Telegram bot token 填写错误')
            }
        } catch (e) {
            console.log('[Message] Telegram 发送通知消息失败')
        }
    }

    splitArrays(arr, maxLength = 200) {
        const result = [];
        let currentArray = [];
        let currentLength = 0;
        for (const subArray of arr) {
            const subLength = subArray.split("\n").length;
            if (currentLength + subLength<=maxLength) {
                currentArray.push(subArray);
                currentLength += subLength;
            }
            else {
                result.push(currentArray);
                currentArray = [subArray];
                currentLength = subLength;
            }
        }
        if (currentArray.length>0) {
            result.push(currentArray);
        }
        return result;
    }
}
