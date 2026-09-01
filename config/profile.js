export default {
    env: {
        index: true,
        salt: 'psyDuck',
        saveCycle: 300,
        fingerPrint: {
            ja3: [
                "771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,",
                "0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17613-65037-21",
                "-41,4588-29-23-24,0"
            ],
            akamai: {
                android: [
                    "1:65536;2:0;4:6291456;6:262144|15663105|0|m,a,s,p",
                    "4:16777216|16711681|0|m,p,a,s"
                ],
                ios: [
                    "4:2097152;3:100|10485760|0|m,s,p,a",
                    "2:0;4:2097152;3:100;9:1|10485760|0|m,s,p,a",
                    // "2:0;3:100;4:2097152;9:1|10420225|0|m,s,a,p",
                ],
                ios15: [
                    "4:2097152;3:100|10485760|0|m,s,p,a",
                ],
                ios16: [
                    "4:2097152;3:100|10485760|0|m,s,p,a",
                ],
                ios17: [
                    "2:0;4:2097152;3:100;9:1|10485760|0|m,s,p,a",
                    // "2:0;3:100;4:2097152;9:1|10420225|0|m,s,a,p"
                ],
                ios18: [
                    "2:0;4:2097152;3:100;9:1|10485760|0|m,s,p,a",
                    // "2:0;3:100;4:2097152;9:1|10420225|0|m,s,a,p"
                ],
                ios26: [
                    "2:0;4:2097152;3:100;9:1|10485760|0|m,s,p,a",
                    // "2:0;3:100;4:2097152;9:1|10420225|0|m,s,a,p",
                ],
                ios27: [
                    "2:0;4:2097152;3:100;9:1|10485760|0|m,s,p,a",
                    // "2:0;3:100;4:2097152;9:1|10420225|0|m,s,a,p",
                    // "2:0;3:100;4:2097152;9:1|10420225|0|m,s,a,p",
                ],
                pc: ["1:65536;2:0;4:131072;5:16384|12517377|0|m,p,a,s"],
            }
        }
    },
    global: {},
    psyDuck: {
        config: {
            jd: {
                ja3: {
                    functionId: ["apStartTaskTime"]
                },
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
                            iphone: 'platform=3&loginType=2&loginWQBiz=wegame&build=170469&screen=390*844&networkType=wifi&d_brand=iPhone&d_model=iPhone13,3&lang=zh_CN&osVersion=15.1.1&partner=-1&ext={"appType":"jdapp","systemType":"ios","bigScreen":false,"pageUrl":"https%3A%2F%2Fpro.m.jd.com%2Fmall%2Factive%2FB2Y13x641hwWfpsoRenCzfbz4jR%2Findex.html"}&cthr=1',
                            android: 'platform=3&loginType=2&loginWQBiz=wegame&build=100987&screen=393*818&networkType=wifi&d_brand=Xiaomi&d_model=MI 8&lang=zh_CN&osVersion=10&partner=xiaomi001&&ext={"appType":"jdapp","systemType":"android","bigScreen":false,"pageUrl":"https%3A%2F%2Fpro.m.jd.com%2Fmall%2Factive%2FB2Y13x641hwWfpsoRenCzfbz4jR%2Findex.html"}&cthr=1',
                            weixin: 'osVersion=AndroidOS&screen=400*833&d_brand=Xiaomi&d_model=Xiaomi&lang=zh-CN&networkType=&openudid=&aid=&oaid=&ext=%7B%22idfa%22%3A%22%22%7D',
                            wechat: 'osVersion=IOS&screen=390*844&d_brand=iApple&d_model=iPhone&lang=zh-CN&networkType=&openudid=&aid=&oaid=&ext=%7B%22idfa%22%3A%22%22%7D'
                        }
                    },
                    'isvjcloud.com': {
                        cookieJar: true,
                        shell: true,
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
                clientVersion: '15.7.50',
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
                    encrypt: 'e968dd3ddc5cdde978dd3decec5cdde9d8dd3dfcec5cddd8a9dd485cddcc1dacdd3d28ddfc1ddc1dacdd5cdd9899dd3dddfc1ddc1dac78c978dd5cddc859dd485cddfc1ddc1dac78c978dd3d28dddc1d6c1dbcdd5cdd9899dd3ddddc1d6c1dbc78c978dd5cddc859dd485cdddc1d6c1dbc78c978dd48839ad7775d86fe6b2828dd8cb9cca98cbc99c99c99bcdcdcb9aca9b999d9ccccdca9c9bc7ce9d9d9ec9ce9dd5cddacb929dd3d28ddfcdd5cddbca8d9dd485cddc8a989e9d809b8c8dd3d28bc5cddececa8d9dd3dbcec5cddfceca8d9dd485cddc8b919a9b878a9dd3dddac1dcc1dacdd5cdd9899dd3dddac1dcc1dacdd5cddc859dd3dbc5cdd',
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

