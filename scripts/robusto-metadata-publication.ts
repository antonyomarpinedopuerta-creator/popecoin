/** Provider-neutral file publication adapter. Actual uploader is chosen/approved externally. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareRobustoMetadata,validateRobustoProposal} from './robusto-metadata';
import {durableUri} from './durable-uri';
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
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
 if(mode==='verify'&&imageFile&&jsonFile)console.log(JSON.stringify(verifyPublishedRobusto(p,template,image,fs.readFileSync(imageFile),fs.readFileSync(jsonFile)),null,2));
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
