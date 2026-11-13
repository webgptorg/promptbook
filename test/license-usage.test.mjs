import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeLicenseUsage } from '../dist/app/license-usage.js';
test('commercial diagnostics exclude core roles, count retained contexts, and never expose identities',()=>{
 const result=summarizeLicenseUsage({agents:[{}, {role:'core'}, {role:'engine'}, {}],controllingUsers:null,
 tools:[{type:'HARNESS',isEnabled:true},{type:'HARNESS',isEnabled:false,retained:true},{type:'HARNESS',isEnabled:false}],
 browsers:[{profilePath:'/private/profile',isEnabled:true},{profilePath:'/private/profile',isEnabled:true},{profilePath:'/private/other',isEnabled:false,retained:true}]});
 assert.deepEqual(result,{version:1,specialists:2,controllingUsers:null,harnessInstances:2,browserProfiles:2});
 assert.equal(JSON.stringify(result).includes('private'),false);
 assert.equal(summarizeLicenseUsage({agents:[],controllingUsers:null}).harnessInstances,null);
});
