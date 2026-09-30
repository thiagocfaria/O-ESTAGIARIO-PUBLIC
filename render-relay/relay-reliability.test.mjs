import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {EventEmitter} from 'node:events';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const source = fs.readFileSync(new URL('./relay-v2.mjs',import.meta.url),'utf8');
function fixture() {
 const timers=new Set(); let server, wss;
 class WS extends EventEmitter { constructor(){super();this.OPEN=1;this.readyState=1;this.sent=[];} send(x){this.sent.push(JSON.parse(x));} close(){this.readyState=3;this.emit('close');} ping(){} terminate(){this.close();} }
 const ctx=vm.createContext({Buffer,URL,crypto,process:{env:{TCF_MCP_ACCESS_TOKEN:'TEST_ONLY'}},console:{log(){},warn(){},error(){}},
 http:{createServer(fn){server=new EventEmitter();server.route=fn;return server;}},
 WebSocketServer:class extends EventEmitter{constructor(){super();wss=this;}},ipaddr:{parse(){throw Error('not used');}},
 setTimeout(fn,ms){const t={fn,ms,unref(){}};timers.add(t);return t;},clearTimeout(t){timers.delete(t);},setInterval(){return {unref(){}};}});
 let text=source.replace(/^import .*;\n/gm,'').replace(/const PUBLIC_KEY = .*;/,'const PUBLIC_KEY = "TEST_PUBLIC_KEY";');
 text=text.slice(0,text.indexOf('await refreshRanges();'))+'\nglobalThis.state=()=>({admissions,requestBufferedBytes,pending:pending.size});';
 vm.runInContext(text,ctx,{timeout:1000});
 const ws=new WS();wss.emit('connection',ws);
 function request(data='{}',auth=true,end=true){
  const req=new EventEmitter();Object.assign(req,{url:'/mcp',method:'POST',headers:auth?{authorization:'Bearer TEST_ONLY'}:{},socket:{remoteAddress:'127.0.0.1'},complete:false});
  req.destroy=()=>{req.emit('aborted');req.emit('close');};
  const res=new EventEmitter();Object.assign(res,{headersSent:false,destroyed:false,data:[],slow:false});
  res.writeHead=(status)=>{res.status=status;res.headersSent=true;};
  res.write=(buf)=>{res.data.push(Buffer.from(buf));return !res.slow;};
  res.end=(x)=>{if(x)res.data.push(Buffer.from(x));res.ended=true;};
  res.destroy=()=>{res.destroyed=true;res.emit('close');};
  server.route(req,res);
  if(auth){req.emit('data',Buffer.from(data));if(end){req.complete=true;req.emit('end');}}
  return {req,res,id:ws.sent.filter(x=>x.type==='request').at(-1)?.id};
 }
 const send=(id,type,more={})=>ws.emit('message',Buffer.from(JSON.stringify({id,type,...more})));
 return {ctx,ws,wss,WS,request,send,timers,state:()=>JSON.parse(JSON.stringify(ctx.state()))};
}
test('slow receiver: each chunk exactly once; ends after drain',()=>{
 const f=fixture(),{res,id}=f.request();res.slow=true;
 f.send(id,'response_start',{status:200,headers:{}});
 for(const text of ['A','B','C'])f.send(id,'response_chunk',{data:Buffer.from(text).toString('base64')});
 f.send(id,'response_end');assert.equal(res.ended,undefined);
 res.emit('drain');res.emit('drain');res.emit('drain');
 assert.equal(Buffer.concat(res.data).toString(),'ABC');assert.equal(res.ended,true);assert.equal(f.state().pending,0);
});
test('1000 aborted uploads release all admission/buffer counters',()=>{
 const f=fixture();for(let i=0;i<1000;i++){const {req}=f.request('partial',true,false);req.emit('aborted');req.emit('error',Error('disconnect'));req.emit('close');}
 assert.deepEqual(f.state(),{admissions:0,requestBufferedBytes:0,pending:0});assert.equal(f.timers.size,0);
});
test('upload deadline reclaims capacity',()=>{
 const f=fixture(),{res}=f.request('part',true,false);const timer=[...f.timers].find(x=>x.ms===20000);timer.fn();
 assert.equal(res.status,408);assert.deepEqual(f.state(),{admissions:0,requestBufferedBytes:0,pending:0});
});
test('two requests with same RPC id stay isolated through slow delivery',()=>{
 const f=fixture();const a=f.request('{"jsonrpc":"2.0","id":0,"method":"tools/list"}'),b=f.request('{"jsonrpc":"2.0","id":0,"method":"tools/list"}');
 assert.notEqual(a.id,b.id);a.res.slow=true;
 f.send(a.id,'response_chunk',{data:Buffer.from('A').toString('base64')});f.send(b.id,'response_chunk',{data:Buffer.from('B').toString('base64')});
 f.send(b.id,'response_end');assert.equal(b.res.ended,true);assert.equal(a.res.ended,undefined);f.send(a.id,'response_end');a.res.emit('drain');
 assert.equal(Buffer.concat(a.res.data).toString(),'A');assert.equal(Buffer.concat(b.res.data).toString(),'B');assert.equal(f.state().pending,0);
});
test('bridge replacement terminates old requests and ignores old frames',()=>{
 const f=fixture(),a=f.request();const next=new f.WS();f.wss.emit('connection',next);assert.equal(a.res.status,502);assert.equal(f.state().pending,0);
 f.send(a.id,'response_chunk',{data:Buffer.from('STALE').toString('base64')});assert.ok(!Buffer.concat(a.res.data).toString().includes('STALE'));
});
test('client close and request deadline release pending and send cancellation',()=>{
 const f=fixture(),a=f.request();a.res.destroy();assert.equal(f.state().pending,0);assert.ok(f.ws.sent.some(x=>x.type==='cancel'&&x.id===a.id));
 const b=f.request();const timer=[...f.timers].find(x=>x.ms===75000);timer.fn();assert.equal(b.res.status,504);assert.equal(f.state().pending,0);
});
test('no credential and no trusted IP stays forbidden',()=>{const f=fixture(),a=f.request('{}',false);assert.equal(a.res.status,403);assert.equal(f.state().pending,0);});
