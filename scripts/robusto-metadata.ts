/** Local preparation only. No uploads, RPC, wallet or authority changes. */
import fs from 'node:fs';
import {validatePng} from './png-validation';
import {createHash} from 'node:crypto';
import {PublicKey} from '@solana/web3.js';
import {durableUri} from './durable-uri';
export function validateRobustoProposal(p:any){
 if(p.status!=='NOT_AUTHORIZED_FOR_MAINNET'||p.mainnetAuthorized!==false||p.mintAuthorityRevocationAuthorized!==false)
  throw Error('Proposal must remain unauthorized');
 if(p.name!=='ROBUSTO'||p.symbol!=='ROBUSTO'||p.decimals!==6||p.supplyTokens!=='1000000000'||p.supplyBaseUnits!=='1000000000000000'||
  BigInt(p.supplyTokens)*10n**BigInt(p.decimals)!==BigInt(p.supplyBaseUnits))throw Error('ROBUSTO supply/branding mismatch');
 if(p.freezeAuthority!==null||p.metadataMutable!==true||p.fixedSupplyAfterFinalIssuance!==true)throw Error('Authority policy mismatch');
 if(p.imagePath!=='metadata/robusto/robusto-logo.png')throw Error('Use isolated ROBUSTO image path');
 for(const role of ['mintAuthority','metadataUpdateAuthority','upgradeAuthority']){
  const value=p[role];
  if(value!==null){
   if(typeof value!=='string')throw Error('Authority must be explicitly pending or a public key');
   let key:PublicKey;try{key=new PublicKey(value);}catch{throw Error('Invalid authority public key');}
   if(key.equals(PublicKey.default)||!PublicKey.isOnCurve(key.toBytes()))throw Error('Authority requires approved signer custody; PDA/multisig policy is pending');
  }
 }
 const authorities=[p.mintAuthority,p.metadataUpdateAuthority,p.upgradeAuthority].filter(v=>v!==null);
 if(new Set(authorities).size!==authorities.length)throw Error('Mint, metadata update and upgrade authorities must be separate');
 if(p.mainnetMode!=='MAINNET_DISABLED'||p.distributionStatus!=='PROPOSED_NOT_APPROVED')throw Error('Proposal must remain MAINNET_DISABLED / PROPOSED_NOT_APPROVED');
 return p;
}
export function prepareRobustoMetadata(p:any,template:any,image:Buffer){
 validateRobustoProposal(p);
 if(template.name!==p.name||template.symbol!==p.symbol||typeof template.description!=='string'||!template.description.trim())throw Error('Invalid ROBUSTO template');
 const sha256=createHash('sha256').update(image).digest('hex');
 if(typeof p.imageSha256!=='string'||sha256!==p.imageSha256)throw Error('Official ROBUSTO image approval/hash pending');
 validatePng(image);
 const metadata:any={name:p.name,symbol:p.symbol,description:template.description,image:durableUri(p.imageUri)};
 if(template.external_url!==null&&template.external_url!==undefined){const url=new URL(template.external_url);if(url.protocol!=='https:'||url.username||url.password)throw Error('Official external_url must be public HTTPS');metadata.external_url=url.href;}
 metadata.properties={files:[{uri:metadata.image,type:'image/png'}],category:'image'};
 const bytes=JSON.stringify(metadata,null,2)+'\n';
 return {bytes,imageSha256:sha256,metadataSha256:createHash('sha256').update(bytes).digest('hex'),isMutable:true,metadataUpdateAuthority:p.metadataUpdateAuthority,authorityStatus:p.metadataUpdateAuthority===null?'PENDING':'PUBLIC_KEY_VALIDATED_NOT_CUSTODY_APPROVED'};
}
if(require.main===module){try{
 const [mode='prepare',...extra]=process.argv.slice(2);
 if(extra.length||!['prepare','inspect-image'].includes(mode))throw Error('Use prepare or inspect-image; local files only');
 const p=validateRobustoProposal(JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')));
 if(!fs.existsSync(p.imagePath))throw Error('PENDING_USER_ASSET: official dog/rocket image at '+p.imagePath);
 const stat=fs.lstatSync(p.imagePath);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4*1024*1024)throw Error('Official image must be a regular PNG file within 4 MiB');
 if(mode==='inspect-image'){
  const image=fs.readFileSync(p.imagePath),dimensions=validatePng(image);
  const sha256=createHash('sha256').update(image).digest('hex');
  if(p.imageSha256!==null&&sha256!==p.imageSha256)throw Error('Official image hash mismatch');
  console.log(JSON.stringify({status:p.imageStatus==='OFFICIAL_USER_ASSET_VALIDATED'&&p.imageSha256===sha256?'OFFICIAL_USER_ASSET_VALIDATED':'ASSET_VALIDATED_NOT_OWNER_APPROVED',path:p.imagePath,...dimensions,bytes:image.length,sha256,note:'Local verification only; no publication or configuration changes.'},null,2));
 }else{
 const result=prepareRobustoMetadata(p,JSON.parse(fs.readFileSync('metadata/robusto/metadata.template.json','utf8')),fs.readFileSync(p.imagePath));
 fs.mkdirSync('target/robusto-metadata',{recursive:true});fs.writeFileSync('target/robusto-metadata/metadata.json',result.bytes);
 console.log(JSON.stringify({status:'PREPARED_NOT_PUBLISHED',...result},null,2));
 }
}catch(e){console.error((e as Error).message);process.exitCode=1;}}
