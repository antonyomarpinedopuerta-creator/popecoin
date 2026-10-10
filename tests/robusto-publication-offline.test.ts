import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectOfflinePublication} from '../scripts/robusto-metadata-publication';

function inputs(){return {
 p:JSON.parse(fs.readFileSync('config/robusto-production.json','utf8')),
 template:JSON.parse(fs.readFileSync('metadata/robusto/metadata.template.json','utf8')),
 approval:JSON.parse(fs.readFileSync('metadata/robusto/CONTENT_APPROVAL.json','utf8')),
 image:fs.readFileSync('metadata/robusto/robusto-logo.png'),
};}
test('offline publication verifies current approval without placeholder URIs or publication claims',()=>{
 const {p,template,approval,image}=inputs();
 const before=JSON.stringify({p,template,approval});
 const result=inspectOfflinePublication(p,template,image,approval);
 assert.equal(result.image.sha256,approval.imageSha256);
 assert.equal(result.metadata.finalBytesReady,false);assert.equal(result.metadata.sha256,null);
 assert.equal(result.publicationVerified,false);assert.equal(result.mainnetMode,'MAINNET_DISABLED');
 assert.equal(JSON.stringify({p,template,approval}),before);
});
test('offline publication rejects changed description, website, image and authorization flags',()=>{
 const {p,template,approval,image}=inputs();
 for(const patch of [{description:template.description+' changed'},{external_url:'https://example.invalid'}])
  assert.throws(()=>inspectOfflinePublication(p,{...template,...patch},image,approval));
 const changed=Buffer.from(image);changed[changed.length-1]^=1;
 assert.throws(()=>inspectOfflinePublication(p,template,changed,approval));
 for(const flag of ['authorityRevocationAuthorized','uploadAuthorized','externalPublicationAuthorized','paymentsAuthorized','onChainMetadataAuthorized','mainnetAuthorized']){
  assert.throws(()=>inspectOfflinePublication(p,template,image,{...approval,[flag]:true}));
  const absent={...approval};delete absent[flag];
  assert.throws(()=>inspectOfflinePublication(p,template,image,absent));
 }
});
