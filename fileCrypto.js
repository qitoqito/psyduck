import {
    promises as fs,
    readdirSync,
    lstatSync
} from 'fs';
import path from 'path';
import {
    Buffer
} from 'buffer';
import {
    fileURLToPath
} from 'url';
import ini from 'ini'
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

const ENCRYPTION_MARKER = 'PsyDuck:';
async function isFileEncrypted(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return content.startsWith(ENCRYPTION_MARKER);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('文件不存在:', filePath);
        }
        return false;
    }
}
function tripleReverseDecrypt(encryptedHexStr, originalPadding) {
    let result = '';
    for (let i = 0; i < encryptedHexStr.length; i += 3) {
        const segment = encryptedHexStr.substr(i, 3);
        result += [...segment].reverse().join('');
    }
    return originalPadding > 0 ? result.slice(0, -originalPadding) : result;
}
export async function decryptFile(inputPath, outputPath) {
    try {
        if (!await isFileEncrypted(inputPath)) {
            console.log('文件未加密或格式不正确');
            return false;
        }
        const encryptedContent = await fs.readFile(inputPath, 'utf-8');
        const data = encryptedContent.slice(ENCRYPTION_MARKER.length);
        const [paddingHex, encryptedHex] = data.split(':');
        const originalPadding = parseInt(paddingHex, 16);
        const decryptedHex = tripleReverseDecrypt(encryptedHex, originalPadding);
        const base64Str = Buffer.from(decryptedHex, 'hex').toString('utf-8');
        const fileContent = Buffer.from(base64Str, 'base64');
        await fs.writeFile(outputPath, fileContent);
        console.log(`文件解密成功: ${outputPath}`);
        return true;
    } catch (error) {
        console.error('解密失败:', error);
        return false;
    }
}
