import axios from 'axios'
import ini from 'ini'
import fs from 'fs'

export class Panel {
    constructor(dict = {}) {
        this.dict = dict
        this.env = process.psyDuck.env
        this.type = process.psyDuck.type
        this.func = process.psyDuck
        this.config = {
            baseURL: this.env.QINGLONG_BaseUrl || 'http://127.0.0.1:5700',
            clientId: this.env.QINGLONG_ClientId,
            clientSecret: this.env.QINGLONG_ClientSecret
        };
        this.token = null;
    }

    async send() {
        switch (this.env.panel) {
            case 'qinglong':
                await this._qlTask()
                break;
            case 'ini':
                await this._iniTask()
                break
            default:
                await this._jsTask()
                break
        }
    }

    async _qlTask() {
        let envs = await this.getEnvs(`${this.type}_cookie`.toUpperCase())
        if (envs.length>0) {
            for (let i of envs) {
                let pin = this.func.userName(i.value)
                if (this.dict[pin]) {
                    i.value = this.dict[pin].cookie
                    this.dict[pin].exist = true
                    let ary = ['_id', 'id', 'name', 'value']
                    let d = ary.reduce((v, k) => {
                        if (i[k]) {
                            v[k] = i[k]
                        }
                        return v
                    }, {})
                    let data = await this.setEnvs(d)
                    if (data.code == 200) {
                        this.func.msg(`更新: ${pin} 成功`)
                    }
                    else {
                        this.func.msg(`更新: ${pin} 失败`)
                    }
                }
            }
            for (let i in this.dict) {
                let array = []
                if (!this.dict[i].exist) {
                    array.push({
                        name: `${this.type}_cookie`.toUpperCase(),
                        value: this.dict[i].cookie
                    })
                }
                if (array.length>0) {
                    let data = await this.addEnvs(array)
                    if (data.code == 200) {
                        this.func.msg(`新增: ${i} 成功`)
                    }
                    else {
                        console.error('[Error] 添加账号失败');
                    }
                }
            }
        }
        else {
            let array = []
            for (let i in this.dict) {
                array.push({
                    name: `${this.type}_cookie`.toUpperCase(),
                    value: this.dict[i].cookie
                })
            }
            if (array.length) {
                let data = await this.addEnvs(array)
                if (data.code == 200) {
                    for (let pin in this.dict) {
                        this.func.msg(`新增: ${pin} 成功`)
                    }
                }
                else {
                    console.error('[Error] 添加账号失败');
                }
            }
        }
    }

    async _iniTask() {
        let dict = {}
        for (let i in this.func.cookies) {
            if (!['test', 'all', 'local'].includes(i)) {
                dict[i] = this.func.cookies[i]
            }
        }
        for (let i in dict) {
            for (let j in dict[i]) {
                let pin = this.func.userName(dict[i][j])
                if (this.dict[pin]) {
                    dict[i][j] = this.dict[pin].cookie
                    this.dict[pin].category = i
                }
            }
        }
        for (let pin in this.dict) {
            if (!this.dict[pin].category) {
                dict.other.push(this.dict[pin].cookie)
            }
        }
        let text = []
        for (let i in dict) {
            text.push(`[${i}]`)
            for (let j of dict[i]) {
                text.push(j)
            }
        }
        await fs.writeFileSync(`${this.func.abspath}/cookie/${this.type}.ini`, text.join("\n"))
        this.func.msg(`${this.type}.ini 更新成功`)
    }

    async _jsTask() {
        let dict = {}
        for (let i in this.func.cookies) {
            if (!['test', 'all', 'local'].includes(i)) {
                dict[i] = this.func.cookies[i]
            }
        }
        for (let i in dict) {
            for (let j in dict[i]) {
                let pin = this.func.userName(dict[i][j])
                if (this.dict[pin]) {
                    dict[i][j] = this.dict[pin].cookie
                    this.dict[pin].category = i
                }
            }
        }
        for (let pin in this.dict) {
            if (!this.dict[pin].category) {
                dict.other.push(this.dict[pin].cookie)
            }
        }
        let text = `export default ${JSON.stringify(dict, null, 4)}`
        await fs.writeFileSync(`${this.func.abspath}/cookie/${this.type}.js`, text)
        this.func.msg(`${this.type}.js 更新成功`)
    }

    // 获取 token
    async getToken() {
        try {
            const response = await axios.get(`${this.config.baseURL}/open/auth/token`, {
                params: {
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret
                }
            });
            this.token = response.data.data.token;
            return this.token;
        } catch (error) {
            console.error('[Error] 获取qinglong token失败', error);
            throw error;
        }
    }

    async setEnvs(data) {
        const token = await this.getToken();
        try {
            const response = await axios.put(
                `${this.config.baseURL}/open/envs`,
                data,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('[Error] 更新环境变量失败:', error);
        }
    }

    // 获取环境变量
    async getEnvs(search = null) {
        const token = await this.getToken();
        try {
            const response = await axios.get(`${this.config.baseURL}/open/envs?searchValue=${search}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.data;
        } catch (error) {
            console.error('[Error] 获取qinglong环境变量失败:', error);
            throw error;
        }
    }

    // 添加环境变量
    async addEnvs(data) {
        const token = await this.getToken();
        try {
            const response = await axios.post(`${this.config.baseURL}/open/envs`, data, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('[Error] 添加qinglong环境变量失败');
            throw error;
        }
    }

    // 删除环境变量
    async deleteEnvs(envId) {
        const token = await this.getToken();
        try {
            const response = await axios.delete(`${this.config.baseURL}/open/envs`, {
                data: [envId],
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('[Error] 删除qinglong环境变量失败');
            throw error;
        }
    }

    // 获取定时任务列表
    async getCrons() {
        const token = await this.getToken();
        try {
            const response = await axios.get(`${this.config.baseURL}/open/crons`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.data;
        } catch (error) {
            console.error('[Error] 获取qinglong定时任务失败');
            throw error;
        }
    }

    // 运行任务
    async runCrons(cronIds) {
        const token = await this.getToken();
        try {
            const response = await axios.put(`${this.config.baseURL}/open/crons/run`, cronIds, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('[Error] 运行qinglong任务失败');
            throw error;
        }
    }

    // 获取任务日志
    async getCronLogs(cronId) {
        const token = await this.getToken();
        try {
            const response = await axios.get(`${this.config.baseURL}/open/crons/${cronId}/log`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data.data;
        } catch (error) {
            console.error('获取任务日志失败:', error);
            throw error;
        }
    }
}
