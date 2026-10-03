/** Local preparation only. No uploads, RPC, wallet or authority changes. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {durableUri} from './durable-uri';
export function validateRobustoProposal(p:any){
 if(p.status!=='PROPOSAL_ONLY_NOT_AUTHORIZED'||p.mainnetAuthorized!==false||p.mintAuthorityRevocationAuthorized!==false)
  throw Error('Proposal must remain unauthorized');
 if(p.name!=='ROBUSTO'||p.symbol!=='ROBUSTO'||p.decimals!==6||p.supplyTokens!=='1000000000'||p.supplyBaseUnits!=='1000000000000000'||
  BigInt(p.supplyTokens)*10n**BigInt(p.decimals)!==BigInt(p.supplyBaseUnits))throw Error('ROBUSTO supply/branding mismatch');
 if(p.freezeAuthority!==null||p.metadataMutable!==true||p.fixedSupplyAfterFinalIssuance!==true)throw Error('Authority policy mismatch');
 if(p.imagePath!=='metadata/robusto/robusto-logo.png')throw Error('Use isolated ROBUSTO image path');
 return p;
}
export function prepareRobustoMetadata(p:any,template:any,image:Buffer){
 validateRobustoProposal(p);
 if(template.name!==p.name||template.symbol!==p.symbol||typeof template.description!=='string'||!template.description.trim())throw Error('Invalid ROBUSTO template');
 const sha256=createHash('sha256').update(image).digest('hex');
 if(typeof p.imageSha256!=='string'||sha256!==p.imageSha256)throw Error('Official ROBUSTO image approval/hash pending');
 if(image.length>4*1024*1024||image.length<24||!image.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))||image.toString('ascii',12,16)!=='IHDR'||image.readUInt32BE(16)===0||image.readUInt32BE(20)===0)throw Error('Invalid PNG');
 const metadata={name:p.name,symbol:p.symbol,description:template.description,image:durableUri(p.imageUri)};
 const bytes=JSON.stringify(metadata,null,2)+'\n';
 return {bytes,imageSha256:sha256,metadataSha256:createHash('sha256').update(bytes).digest('hex'),isMutable:true};
}
if(require.main===module){try{
 const p=validateRobustoProposal(JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')));
 if(!fs.existsSync(p.imagePath))throw Error('PENDING: official dog/rocket image at '+p.imagePath);
 const result=prepareRobustoMetadata(p,JSON.parse(fs.readFileSync('metadata/robusto/metadata.template.json','utf8')),fs.readFileSync(p.imagePath));
 fs.mkdirSync('target/robusto-metadata',{recursive:true});fs.writeFileSync('target/robusto-metadata/metadata.json',result.bytes);
 console.log(JSON.stringify({status:'PREPARED_NOT_PUBLISHED',...result},null,2));
}catch(e){console.error((e as Error).message);process.exitCode=1;}}
