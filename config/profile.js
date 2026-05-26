export default {
    env: {
        index: true,
        salt: 'psyDuck',
        saveCycle: 300
    },
    global: {},
    psyDuck: {
        config: {
            jd: {
                userName: "pt_pin\\s*=\\s*([^;]+)",
                configuration: {
                    'https://api.m.jd.com': {
                        agent: {
                            rejectUnauthorized: false,
                            ciphers: "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256",
                            secureProtocol: "TLSv1_2_method",
                        },
                        referer: "https://prodev.m.jd.com/",
                        shell: true,
                        enhance: {
                            iphone: 'platform=3&loginType=2&loginWQBiz=wegame&build=170275&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&lang=zh_CN&osVersion=15.1.1&partner=-1&ext={"appType":"jdapp","systemType":"ios","bigScreen":false,"pageUrl":"https%3A%2F%2Fpro.m.jd.com%2Fmall%2Factive%2FB2Y13x641hwWfpsoRenCzfbz4jR%2Findex.html"}&cthr=1',
                            android: 'platform=3&loginType=2&loginWQBiz=wegame&build=100987&screen=393*818&networkType=wifi&d_brand=Xiaomi&d_model=MI 8&lang=zh_CN&osVersion=10&partner=xiaomi001&&ext={"appType":"jdapp","systemType":"android","bigScreen":false,"pageUrl":"https%3A%2F%2Fpro.m.jd.com%2Fmall%2Factive%2FB2Y13x641hwWfpsoRenCzfbz4jR%2Findex.html"}&cthr=1',
                            weixin: 'osVersion=AndroidOS&screen=400*833&d_brand=Xiaomi&d_model=Xiaomi&lang=zh-CN&networkType=&openudid=&aid=&oaid=&ext=%7B%22idfa%22%3A%22%22%7D',
                            wechat: 'osVersion=IOS&screen=390*844&d_brand=iApple&d_model=iPhone&lang=zh-CN&networkType=&openudid=&aid=&oaid=&ext=%7B%22idfa%22%3A%22%22%7D'
                        }
                        // request: true,
                        // token: true
                    },
                    'isvjcloud.com': {
                        cookieJar: true,
                        shell: true,
                        // request: true
                    },
                    'kai.jd.com': {
                        shell: true
                    },
                    'ms.jr.jd.com': {
                        shell: true
                    },
                    'u.jd.com': {
                        shell: true
                    },
                    'p.m.jd.com': {
                        shell: true
                    },
                    'lop-proxy.jd.com': {
                        shell: true
                    },
                    'un.m.jd.com': {
                        shell: true
                    }
                },
                referer: "https://prodev.m.jd.com/",
                url: "https://api.m.jd.com/api",
                clientVersion: '15.5.5',
                timer: {
                    params: {
                        'url':
                            'https://api.m.jd.com/client.action?functionId=jdDiscoveryRedPoint&body=%7B%7D&uuid=487f7b22f68312d2c1bbc93b1&client=apple&clientVersion=10.0.10&st=1677768101596&sv=120&sign=fbaf17e9b2a79543cd3e296665517fb5',
                    },
                    wait: 120,
                    haskey: 'time'
                },
                prepare: [
                    {
                        'eval': '_inviteJson',
                        'haskey': 'inviteJson',
                    },
                    {
                        'eval': '_userData',
                        'haskey': 'userData'
                    }
                ],
                runtime: [
                    {
                        'eval': 'algo.cookieJar'
                    },
                    {
                        'eval': 'algo.isv',
                        'haskey': 'public',
                        'equal': 'isv'
                    },
                    {
                        'eval': '_shareData',
                        'haskey': 'shareData'
                    }
                ],
                appids: [
                    'redrain-2021',
                    'wh5',
                    'SecKill2020',
                    'content_ecology',
                    'u',
                    'ihub_3c',
                    'u_hongbao',
                    'babelh5',
                    'publicUseApi',
                    'newtry'
                ],
                h5st: {
                    xcx: '4.9',
                    latest: '5.3',
                    encrypt: 'dd3d28ddfc1ddc1dacdd5cdd9899dd3dddfc1ddc1dac78c978dd5cddc859dd485cddfc1ddc1dac78c978dd3d28dddc1d6c1dbcdd5cdd9899dd3ddddc1d6c1dbc78c978dd5cddc859dd485cdddc1d6c1dbc78c978dd48ac58db4b86a9cb50282828cc5cddececa8d9dd3dbcec5cddfceca8d9dd485cddc8b919a9b878a9dd3dddbc1dcc1dacdd5cdd9899dd3dddbc1dcc1dacdd5cddc859dd3dcc5cdde968dd3dac5cdde978dd3dfcec5cdde9d8dd3decec5cddd8a9dd485cddcc1dac',
                    extend: {},
                    storage: {}
                }
            }
        },
        map: {
            'js': 'jd'
        }
    },
    enc: {
        token: '7530233633333336393633323337333239742830363633333537303333373336353a28727b303c2633363333373333333338393332276a222932333336333337353630333739353363726162313833333333353633323930363333626f63753333353333333334363034363633336823632233333933333333383333323136333360326f2a353934333633363421333633363333703c752133353138333633327630303333333370326e67333236373333363d',
        jdApi: '263333368a19469e722333274f680ff0666222274feee1a87673333701129040',
        jdShare: ''
    }
}

