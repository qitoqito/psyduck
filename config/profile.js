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
                        // token: true
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
                clientVersion: '15.1.0',
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
                    latest: '5.2',
                    encrypt: 'cec5cddd8a9dd485cdddc1dacdd3d28ec2d5cddbca8d9dd3ddd7c1dec1dacdd5cdd9899dd3dddec1dacdd5cddc859dd3ddc5cdde968dd3d9c5cdde978dd3decec5cddd8a9dd485cddec1dacdd488fff71579449c499282828ddfcdd5cddbca8d9dd485cddc8a989e9d809b8c8dd3d28ccec5cddfceca8d9dd485cddc8b919a9b878a9dd3dddfc1ddc1dacdd5cdd9899dd3ddddc1dacdd5cddc859dd3ddc5cdde968dd3dac5cdde978dd3dc',
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

