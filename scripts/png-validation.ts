/** PNG structural validation with CRC checks; visual owner approval remains required. */
export function pngCrc32(bytes:Buffer):number{
 let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;
}
export function validatePng(image:Buffer){
 if(image.length<45||image.length>4*1024*1024||!image.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))throw Error('Invalid PNG size/signature');
 let offset=8,header=false,ended=false,idat=false,width=0,height=0;
 while(offset<image.length){
  if(offset+12>image.length)throw Error('Truncated PNG chunk');const length=image.readUInt32BE(offset),end=offset+12+length;
  if(end>image.length)throw Error('Truncated PNG payload');const type=image.toString('ascii',offset+4,offset+8),payload=image.subarray(offset+8,end-4);
  if(! /^[A-Za-z]{4}$/.test(type)||pngCrc32(image.subarray(offset+4,end-4))!==image.readUInt32BE(end-4))throw Error('PNG chunk type/CRC mismatch');
  if(!header){if(type!=='IHDR'||length!==13)throw Error('PNG IHDR must be first');width=payload.readUInt32BE(0);height=payload.readUInt32BE(4);
   if(!width||!height||width>8192||height>8192||payload[10]!==0||payload[11]!==0||payload[12]>1)throw Error('Invalid PNG dimensions/encoding');
   const depths:Record<number,number[]>={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};
   if(!depths[payload[9]]?.includes(payload[8]))throw Error('Invalid PNG color/depth');header=true;
  }else if(type==='IHDR')throw Error('Duplicate PNG IHDR');
  if(type==='IDAT'){if(!length)throw Error('Empty PNG IDAT');idat=true;}
  if(type==='IEND'){if(length!==0||!idat||end!==image.length)throw Error('Invalid PNG end/data');ended=true;}
  offset=end;
 }
 if(!ended)throw Error('Missing PNG IEND');return {width,height};
}
