/** Provider-neutral file publication adapter. Actual uploader is chosen/approved externally. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareRobustoMetadata,validateRobustoProposal} from './robusto-metadata';
import {durableUri} from './durable-uri';
import {validatePng} from './png-validation';
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
/** Inspect approved public inputs without publishing or inventing an Arweave ID. */
export function inspectOfflinePublication(p:any,template:any,image:Buffer,approval:any){
 validateRobustoProposal(p);
 if(approval?.status!=='APPROVED_CONTENT_ONLY'||approval.websiteDecision!=='OMIT_FOR_NOW'||
    approval.hostingPreference!=='ARWEAVE'||approval.hostingPreferenceStatus!=='APPROVED_PREFERENCE_ONLY'||
    approval.metadataMutable!==true||approval.retainMetadataUpdateAuthority!==true)throw Error('Content-only approval required');
 for(const flag of ['authorityRevocationAuthorized','uploadAuthorized','externalPublicationAuthorized','paymentsAuthorized','onChainMetadataAuthorized','mainnetAuthorized']){
  if(approval[flag]!==false)throw Error('Offline content approval cannot authorize operations');
 }
 if(approval.name!==p.name||approval.symbol!==p.symbol||approval.imagePath!==p.imagePath||
    approval.imageSha256!==p.imageSha256||sha(image)!==p.imageSha256||
    template.name!==approval.name||template.symbol!==approval.symbol||
    typeof template.description!=='string'||!template.description.trim()||template.description!==approval.description||
    template.external_url!==null&&template.external_url!==undefined)throw Error('Public artifacts differ from approved content');
 const dimensions=validatePng(image);
 const prepared=p.imageUri===null?null:prepareRobustoMetadata(p,template,image);
 if(p.metadataUri!==null)durableUri(p.metadataUri);
 return {status:'OFFLINE_CONTENT_VERIFIED_NOT_PUBLISHED',mainnetMode:'MAINNET_DISABLED',
  image:{bytes:image.length,sha256:sha(image),contentType:'image/png',...dimensions},
  metadata:{sha256:prepared?.metadataSha256??null,bytes:prepared?Buffer.byteLength(prepared.bytes):null,
   contentType:'application/json',finalBytesReady:prepared!==null},
  hostingPreference:'ARWEAVE',uploadConfigured:false,publicationVerified:false,
  pending:['Provider/account and dated quote','Explicit upload/payment authorization',
   ...(p.imageUri===null?['Published image URI before final JSON bytes/hash']:[]),
   'Download image and JSON from independent gateway and compare exact bytes',
   'Pin final metadata URI/hash; separately authorize on-chain metadata']};
}
export function publicationManifest(p:any,template:any,image:Buffer){
 const metadata=prepareRobustoMetadata(p,template,image);
 return {status:'PREPARED_NOT_PUBLISHED',files:[{path:p.imagePath,sha256:metadata.imageSha256,contentType:'image/png',uri:durableUri(p.imageUri)},
 {path:'target/robusto-metadata/metadata.json',sha256:metadata.metadataSha256,contentType:'application/json',uri:p.metadataUri===null?'PENDING_DURABLE_METADATA_URI':durableUri(p.metadataUri)}],
 bytes:metadata.bytes,mutable:true,updateAuthority:p.metadataUpdateAuthority};
}
export function verifyPublishedRobusto(p:any,template:any,official:Buffer,publishedImage:Buffer,publishedJson:Buffer){
 durableUri(p.metadataUri);
 const manifest=publicationManifest(p,template,official);
 if(!publishedImage.equals(official)||!publishedJson.equals(Buffer.from(manifest.bytes)))throw Error('Published bytes differ from approved ROBUSTO artifacts');
 if(p.metadataSha256!==sha(publishedJson))throw Error('Published metadata SHA-256 not pinned in production candidate');
 return {status:'PUBLISHED_BYTES_VERIFIED_NOT_ON_CHAIN',imageSha256:sha(publishedImage),metadataSha256:sha(publishedJson)};
}
if(require.main===module){try{
 const [mode='prepare',imageFile,jsonFile]=process.argv.slice(2),p=validateRobustoProposal(JSON.parse(fs.readFileSync('config/robusto-production.json','utf8'))),template=JSON.parse(fs.readFileSync('metadata/robusto/metadata.template.json','utf8'));
 if(!fs.existsSync(p.imagePath))throw Error('PENDING_USER_ASSET');const image=fs.readFileSync(p.imagePath);
 if(mode==='inspect-offline'&&!imageFile&&!jsonFile)console.log(JSON.stringify(inspectOfflinePublication(p,template,image,JSON.parse(fs.readFileSync('metadata/robusto/CONTENT_APPROVAL.json','utf8'))),null,2));
 else if(mode==='verify'&&imageFile&&jsonFile)console.log(JSON.stringify(verifyPublishedRobusto(p,template,image,fs.readFileSync(imageFile),fs.readFileSync(jsonFile)),null,2));
 else if(mode==='prepare'){
  const manifest=publicationManifest(p,template,image);fs.mkdirSync('target/robusto-metadata',{recursive:true});
  fs.writeFileSync('target/robusto-metadata/metadata.json',manifest.bytes);console.log(JSON.stringify({...manifest,bytes:undefined},null,2));
 }else throw Error('Use prepare or verify downloaded-image downloaded-json; no upload provider configured');
}catch(e){console.error((e as Error).message);process.exitCode=1;}}

/** New URI after owner-approved description/image/links/name changes; no revocation. */
export function validateMetadataUpdate(change:any){
 if(!change||typeof change.name!=='string'||!change.name.trim()||Buffer.byteLength(change.name)>32||
 typeof change.symbol!=='string'||!change.symbol.trim()||Buffer.byteLength(change.symbol)>10)throw Error('Token Metadata name/symbol byte limits exceeded');
 const uri=durableUri(change.uri);
 if(! /^[0-9a-f]{64}$/.test(change.metadataSha256??''))throw Error('New published metadata digest required');
 return {name:change.name,symbol:change.symbol,uri,metadataSha256:change.metadataSha256,isMutable:true};
}
