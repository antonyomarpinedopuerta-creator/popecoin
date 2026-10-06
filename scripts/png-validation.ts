/** PNG structural validation with CRC checks; visual owner approval remains required. */
import {inflateSync} from 'node:zlib';
export function pngCrc32(bytes:Buffer):number{
 let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;
}
export function validatePng(image:Buffer){
 if(image.length<45||image.length>4*1024*1024||!image.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))throw Error('Invalid PNG size/signature');
 let offset=8,header=false,ended=false,idat=false,width=0,height=0,depth=0,color=0,interlace=0,palette=0,dataEnded=false;
 const compressed:Buffer[]=[];
 while(offset<image.length){
  if(offset+12>image.length)throw Error('Truncated PNG chunk');const length=image.readUInt32BE(offset),end=offset+12+length;
  if(end>image.length)throw Error('Truncated PNG payload');const type=image.toString('latin1',offset+4,offset+8),payload=image.subarray(offset+8,end-4);
  if(! /^[A-Za-z]{4}$/.test(type)||image[offset+6]&32||pngCrc32(image.subarray(offset+4,end-4))!==image.readUInt32BE(end-4))throw Error('PNG chunk type/CRC mismatch');
  if(!(image[offset+4]&32)&&!['IHDR','PLTE','IDAT','IEND'].includes(type))throw Error('Unknown critical PNG chunk');
  if(!header){if(type!=='IHDR'||length!==13)throw Error('PNG IHDR must be first');width=payload.readUInt32BE(0);height=payload.readUInt32BE(4);
   if(!width||!height||width>8192||height>8192||payload[10]!==0||payload[11]!==0||payload[12]>1)throw Error('Invalid PNG dimensions/encoding');
   const depths:Record<number,number[]>={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
   if(!depths[payload[9]]?.includes(payload[8]))throw Error('Invalid PNG color/depth');depth=payload[8];color=payload[9];interlace=payload[12];header=true;
  }else if(type==='IHDR')throw Error('Duplicate PNG IHDR');
  if(type==='PLTE'){if(palette||idat||[0,4].includes(color)||length===0||length%3||length>768||(color===3&&length/3>2**depth))throw Error('Invalid PNG palette');palette=length/3;}
  if(type==='IDAT'){if(dataEnded||(color===3&&!palette))throw Error('Invalid PNG data order/palette');idat=true;compressed.push(payload);}
  else if(idat)dataEnded=true;
  if(type==='IEND'){if(length!==0||!idat||end!==image.length)throw Error('Invalid PNG end/data');ended=true;}
  offset=end;
 }
 if(!ended)throw Error('Missing PNG IEND');
 const channels:Record<number,number>={0:1,2:3,3:1,4:2,6:4};
 const passes=interlace?[[0,0,8,8],[4,0,8,8],[0,4,4,8],[2,0,4,4],[0,2,2,4],[1,0,2,2],[0,1,1,2]]:[[0,0,1,1]];
 const rows=passes.map(([x,y,dx,dy])=>{const w=Math.max(0,Math.ceil((width-x)/dx)),h=Math.max(0,Math.ceil((height-y)/dy));return {w,h:w?h:0,bytes:Math.ceil(w*channels[color]*depth/8)};});
 const expected=rows.reduce((n,r)=>n+r.h*(1+r.bytes),0);
 if(expected>64*1024*1024)throw Error('PNG decoded image exceeds memory limit');
 // Node returns the engine with info:true; @types/node 22 types only the Buffer overload.
 const packed=Buffer.concat(compressed),result=inflateSync(packed,{maxOutputLength:expected+1,info:true}) as unknown as {buffer:Buffer;engine:{bytesWritten:number}};
 const decoded=result.buffer;
 if(decoded.length!==expected||result.engine.bytesWritten!==packed.length)throw Error('Invalid PNG decoded size/trailing compressed data');
 const stride=Math.max(1,Math.ceil(channels[color]*depth/8));
 const paeth=(a:number,b:number,c:number)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
 let cursor=0;
 for(const row of rows){let prior=Buffer.alloc(row.bytes);
  for(let y=0;y<row.h;y++){
   const filter=decoded[cursor++];if(filter>4)throw Error('Invalid PNG scanline filter');
   const pixels=Buffer.from(decoded.subarray(cursor,cursor+row.bytes));cursor+=row.bytes;
   for(let x=0;x<pixels.length;x++){
    const left=x>=stride?pixels[x-stride]:0,up=prior[x],upperLeft=x>=stride?prior[x-stride]:0;
    pixels[x]=(pixels[x]+(filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,upperLeft)))&255;
   }
   if(color===3)for(let x=0;x<row.w;x++){const bit=x*depth,index=(pixels[Math.floor(bit/8)]>>>(8-depth-bit%8))&((1<<depth)-1);if(index>=palette)throw Error('PNG pixel palette index out of range');}
   prior=pixels;
  }
 }
 return {width,height};
}
