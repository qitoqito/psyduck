import redis from 'redis'
import Tfc from 'ttl-file-cache'
import path from 'path';
import {fileURLToPath} from 'url';

export class Cache {
    #db

    constructor(p = {}) {
        this._db = p.db
        this._type = p.db.type || 'json'
        this._category = p.category || 'config'
    }

    async connect() {
        if (this._type == 'redis') {
            this._cache = await redis.createClient({
                url: `redis://:${this._db.password || ''}@${this._db.host || '127.0.0.1'}:${this._db.prot || 6379}/${this._db.db || 2}`,
                retry_strategy: function(options) {
                    if (options.error?.code === 'ECONNREFUSED') {
                        return undefined;
                    }
                    // 如果总重试时间超过1分钟，停止重试
                    if (options.total_retry_time>6000) {
                        return null;
                    }
                    // 重试间隔时间：每次尝试增加100ms，但最少等待3秒
                    return Math.max(options.attempt * 100, 3000);
                },
                enable_offline_queue: false,
                connect_timeout: 3000,
                socket_keepalive: true
            })
            await this._cache.connect();
        }
        else {
            let dirpath = fileURLToPath(import.meta.url).split('/util')[0].split("\\util")[0];
            this._cache = new Tfc({dir: `${dirpath}/temp`, folderNum: 2})
        }
    }

    async close() {
        if (this._type == 'redis') {
            await this._cache.quit()
        }
    }

    async get(key, index = '') {
        try {
            var data = null
            if (this._type == 'redis') {
                let _type = await this._cache.type(key)
                if (_type == 'hash') {
                    data = await this._cache.hGetAll(key)
                    if (index) {
                        data = data[index]
                    }
                }
                else {
                    data = await this._cache.get(key)
                }
            }
            else {
                let dd = await this._cache.get(key)
                if (dd) {
                    data = dd.toString()
                    if (index) {
                        let dd = JSON.parse(data)
                        data = dd[index]
                    }
                }
            }
            return data
        } catch (e) {
            return null
        }
    }

    async set(a, b, c = null, d = null) {
        d = d || {expire: null, padding: null}
        let {expire, padding} = d
        expire = expire || 0
        if (this._type == 'redis') {
            if (!c) {
                if (typeof b == 'object') {
                    if (padding) {
                        this._cache.del(a)
                    }
                    for (let i in b) {
                        this._cache.HSET(a, i, b[i])
                    }
                }
                else {
                    this._cache.set(a, b)
                }
            }
            else {
                this._cache.HSET(a, b, c)
            }
            if (typeof expire && expire) {
                this._cache.expire(a, expire)
            }
        }
        else {
            if (!c) {
                this._cache.set(a, b, expire)
            }
            else {
                let d = await this.get(a)
                if (d) {
                    var data = JSON.parse(d)
                }
                else {
                    var data = {}
                }
                data[b] = c
                this._cache.set(a, data, expire)
            }
        }
    }
}

// export default Cache;
