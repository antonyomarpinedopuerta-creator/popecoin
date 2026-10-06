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
 if(p.metadataUpdateAuthority!==null&&[p.mintAuthority,p.upgradeAuthority].includes(p.metadataUpdateAuthority))throw Error('Metadata update authority must be separate');
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
 const p=validateRobustoProposal(JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')));
 if(!fs.existsSync(p.imagePath))throw Error('PENDING_USER_ASSET: official dog/rocket image at '+p.imagePath);
 const result=prepareRobustoMetadata(p,JSON.parse(fs.readFileSync('metadata/robusto/metadata.template.json','utf8')),fs.readFileSync(p.imagePath));
 fs.mkdirSync('target/robusto-metadata',{recursive:true});fs.writeFileSync('target/robusto-metadata/metadata.json',result.bytes);
 console.log(JSON.stringify({status:'PREPARED_NOT_PUBLISHED',...result},null,2));
}catch(e){console.error((e as Error).message);process.exitCode=1;}}
