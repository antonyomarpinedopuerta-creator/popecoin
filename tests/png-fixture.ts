import {deflateSync} from 'node:zlib';
import {pngCrc32} from '../scripts/png-validation';
export function pngChunk(name:string,data:Buffer){const head=Buffer.alloc(4);head.writeUInt32BE(data.length);const body=Buffer.concat([Buffer.from(name),data]),crc=Buffer.alloc(4);crc.writeUInt32BE(pngCrc32(body));return Buffer.concat([head,body,crc]);}
export function pngFixture(raw=Buffer.from([0,255,0,0,255]),color=6,interlace=0){
 const chunk=pngChunk;
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=color;ihdr[12]=interlace;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
