import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {EventEmitter} from 'node:events';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const source = fs.readFileSync(new URL('./relay-v4.mjs',import.meta.url),'utf8');
function fixture() {
 const timers=new Set(); let server, wss;
 class WS extends EventEmitter { constructor(){super();this.OPEN=1;this.readyState=1;this.sent=[];} send(x){this.sent.push(JSON.parse(x));} close(){this.readyState=3;this.emit('close');} ping(){} terminate(){this.close();} }
 const ctx=vm.createContext({Buffer,URL,crypto,fs:{readFileSync(){return 'TEST_PUBLIC_KEY';}},process:{env:{TCF_MCP_ACCESS_TOKEN:'TEST_ONLY'}},console:{log(){},warn(){},error(){}},
 http:{createServer(fn){server=new EventEmitter();server.route=fn;return server;}},
 WebSocketServer:class extends EventEmitter{constructor(){super();wss=this;}},ipaddr:{parse(){throw Error('not used');}},
 setTimeout(fn,ms){const t={fn,ms,unref(){}};timers.add(t);return t;},clearTimeout(t){timers.delete(t);},setInterval(){return {unref(){}};}});
 let text=source.replace(/^import .*;\n/gm,'').replace(/const PUBLIC_KEYS = \{[\s\S]*?\n\};/,'const PUBLIC_KEYS={server:"TEST_PUBLIC_KEY",pop:"TEST_PUBLIC_KEY"};');
 if(process.env.TCF_TEST_MUTANT==='default-server') text=text.replace('const connected = connectedBackends();','return { backend: "server", source: "mutant" };\n  const connected = connectedBackends();');
 text=text.slice(0,text.indexOf('await refreshRanges();'))+'\nglobalThis.state=()=>({admissions,requestBufferedBytes,pending:pending.size,processRoutes:[...processRoutes.entries()],sessionRoutes:[...sessionRoutes.entries()]});globalThis.routeApi={applyProcessRouteSnapshot,processBackendFor,removeBackendFromProcessRoute,routeMcpRequest,sessionRouteKey,connectedBackends};';
 vm.runInContext(text,ctx,{timeout:1000});
 const ws=new WS();ws.tcfBackend='server';wss.emit('connection',ws);
 function request(data='{}',auth=true,end=true,headers={}){
  const req=new EventEmitter();Object.assign(req,{url:'/mcp',method:'POST',headers:auth?{authorization:'Bearer TEST_ONLY',...headers}:{},socket:{remoteAddress:'127.0.0.1'},complete:false});
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
 const connectBackend=(backend)=>{const next=new WS();next.tcfBackend=backend;wss.emit('connection',next);return next;};
 return {ctx,ws,wss,WS,request,send,timers,state:()=>JSON.parse(JSON.stringify(ctx.state())),routeApi:ctx.routeApi,connectBackend};
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
 assert.equal(f.state().admissions,0);assert.equal(f.state().requestBufferedBytes,0);assert.equal(f.state().pending,0);assert.equal(f.timers.size,0);
});
test('upload deadline reclaims capacity',()=>{
 const f=fixture(),{res}=f.request('part',true,false);const timer=[...f.timers].find(x=>x.ms===20000);timer.fn();
 assert.equal(res.status,408);assert.equal(f.state().admissions,0);assert.equal(f.state().requestBufferedBytes,0);assert.equal(f.state().pending,0);
});
test('two requests with same RPC id stay isolated through slow delivery',()=>{
 const f=fixture();const a=f.request('{"jsonrpc":"2.0","id":0,"method":"tools/list"}'),b=f.request('{"jsonrpc":"2.0","id":0,"method":"tools/list"}');
 assert.notEqual(a.id,b.id);a.res.slow=true;
 f.send(a.id,'response_chunk',{data:Buffer.from('A').toString('base64')});f.send(b.id,'response_chunk',{data:Buffer.from('B').toString('base64')});
 f.send(b.id,'response_end');assert.equal(b.res.ended,true);assert.equal(a.res.ended,undefined);f.send(a.id,'response_end');a.res.emit('drain');
 assert.equal(Buffer.concat(a.res.data).toString(),'A');assert.equal(Buffer.concat(b.res.data).toString(),'B');assert.equal(f.state().pending,0);
});
test('bridge replacement terminates old requests and ignores old frames',()=>{
 const f=fixture(),a=f.request();const next=new f.WS();next.tcfBackend='server';f.wss.emit('connection',next);assert.equal(a.res.status,502);assert.equal(f.state().pending,0);
 f.send(a.id,'response_chunk',{data:Buffer.from('STALE').toString('base64')});assert.ok(!Buffer.concat(a.res.data).toString().includes('STALE'));
});
test('client close and request deadline release pending and send cancellation',()=>{
 const f=fixture(),a=f.request();a.res.destroy();assert.equal(f.state().pending,0);assert.ok(f.ws.sent.some(x=>x.type==='cancel'&&x.id===a.id));
 const b=f.request();const timer=[...f.timers].filter(x=>x.ms>=74000&&x.ms<=75000).sort((a,b)=>b.ms-a.ms)[0];
 assert.ok(timer,'request deadline timer missing');timer.fn();assert.equal(b.res.status,504);assert.equal(f.state().pending,0);
});
test('no credential and no trusted IP stays forbidden',()=>{const f=fixture(),a=f.request('{}',false);assert.equal(a.res.status,403);assert.equal(f.state().pending,0);});

test('authoritative process snapshot removes routes omitted by backend',()=>{
 const f=fixture(),future=Date.now()+60_000;
 f.routeApi.applyProcessRouteSnapshot('pop',[{pid:101,expiresAt:future,bootId:'boot-a',startTicks:11},{pid:202,expiresAt:future,bootId:'boot-a',startTicks:12}]);
 assert.equal(f.routeApi.processBackendFor('read_process_output',{pid:101}).backend,'pop');
 assert.equal(f.routeApi.processBackendFor('read_process_output',{pid:202}).backend,'pop');
 const applied=f.routeApi.applyProcessRouteSnapshot('pop',[{pid:202,expiresAt:future,bootId:'boot-a',startTicks:12}]);
 assert.equal(applied.removed,1);
 assert.equal(f.routeApi.processBackendFor('read_process_output',{pid:101}).state,'unknown');
 assert.equal(f.routeApi.processBackendFor('read_process_output',{pid:202}).backend,'pop');
});
test('explicit route removal and empty snapshot clear stale backend routes',()=>{
 const f=fixture(),future=Date.now()+60_000;
 f.routeApi.applyProcessRouteSnapshot('pop',[{pid:303,expiresAt:future,bootId:'boot-a',startTicks:13}]);
 assert.equal(f.routeApi.removeBackendFromProcessRoute(303,'pop','test'),true);
 assert.equal(f.routeApi.processBackendFor('kill_process',{pid:303}).state,'unknown');
 f.routeApi.applyProcessRouteSnapshot('pop',[{pid:404,expiresAt:future,bootId:'boot-a',startTicks:14}]);
 const applied=f.routeApi.applyProcessRouteSnapshot('pop',[]);
 assert.equal(applied.removed,1);
 assert.equal(f.routeApi.processBackendFor('read_process_output',{pid:404}).state,'unknown');
});


test('neutral tool routes to only connected pop backend and binds session',()=>{
 const f=fixture();
 f.ws.close();
 f.connectBackend('pop');
 assert.deepEqual(Array.from(f.routeApi.connectedBackends()),['pop']);
 const body=Buffer.from(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_config',arguments:{}}}));
 const headers={'x-openai-session':'session-pop','x-openai-subject':'subject-a'};
 const routed=f.routeApi.routeMcpRequest(body,null,headers);
 assert.equal(routed.backend,'pop');
 assert.equal(routed.routingError,undefined);
 const key=f.routeApi.sessionRouteKey(headers);
 assert.equal(f.state().sessionRoutes.find(([k])=>k===key)?.[1]?.backend,'pop');
});

test('session affinity keeps neutral tools on pop after server also connects',()=>{
 const f=fixture();
 f.connectBackend('pop');
 const headers={'x-openai-session':'session-sticky','x-openai-subject':'subject-a'};
 const explicitBody=Buffer.from(JSON.stringify({
   jsonrpc:'2.0',id:1,method:'tools/call',
   params:{name:'start_process',arguments:{deviceId:'pop-os',command:'echo ok'}}
 }));
 const first=f.routeApi.routeMcpRequest(explicitBody,null,headers);
 assert.equal(first.backend,'pop');
 const neutralBody=Buffer.from(JSON.stringify({
   jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'list_sessions',arguments:{}}
 }));
 const second=f.routeApi.routeMcpRequest(neutralBody,null,headers);
 assert.equal(second.backend,'pop');
 assert.equal(second.routingError,undefined);
});

test('new neutral session with two connected backends fails closed',()=>{
 const f=fixture();
 f.connectBackend('pop');
 assert.deepEqual(Array.from(f.routeApi.connectedBackends()).sort(),['pop','server']);
 const body=Buffer.from(JSON.stringify({
   jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'get_recent_tool_calls',arguments:{maxResults:5}}
 }));
 const routed=f.routeApi.routeMcpRequest(body,null,{
   'x-openai-session':'brand-new-session','x-openai-subject':'subject-b'
 });
 assert.equal(routed.backend,null);
 assert.equal(routed.routingError,'device_context_required');
});

test('non-tool MCP calls use session affinity and do not default to server',()=>{
 const f=fixture();
 f.ws.close();
 f.connectBackend('pop');
 const headers={'x-openai-session':'initialize-session','x-openai-subject':'subject-a'};
 const init=Buffer.from(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{}}));
 assert.equal(f.routeApi.routeMcpRequest(init,null,headers).backend,'pop');
 const list=Buffer.from(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list',params:{}}));
 assert.equal(f.routeApi.routeMcpRequest(list,null,headers).backend,'pop');
});

const call=(name,args={})=>Buffer.from(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}}));
test('two subject/session pairs stay separated, including actual HTTP neutral dispatch',()=>{
 const f=fixture(),pop=f.connectBackend('pop');
 const a={'x-openai-subject':'a','x-openai-session':'same-session'};
 const b={'x-openai-subject':'b','x-openai-session':'same-session'};
 assert.equal(f.routeApi.routeMcpRequest(call('start_process',{deviceId:'pop-os'}),null,a).backend,'pop');
 assert.equal(f.routeApi.routeMcpRequest(call('start_process',{deviceId:'srv-app01'}),null,b).backend,'server');
 for(const name of ['get_config','list_sessions','persistent_process_list','get_recent_tool_calls']) {
  f.request(call(name).toString(),true,true,a);
  f.request(call(name).toString(),true,true,b);
 }
 assert.equal(pop.sent.filter(x=>x.type==='request').length,4);
 assert.equal(f.ws.sent.filter(x=>x.type==='request').length,4);
 assert.notEqual(f.routeApi.sessionRouteKey(a),f.routeApi.sessionRouteKey(b));
});
test('legacy mcp-session-id affinity and no IP-based identity',()=>{
 const f=fixture();f.ws.close();f.connectBackend('pop');
 const headers={'mcp-session-id':'compat'};
 assert.equal(f.routeApi.routeMcpRequest(call('get_config'),null,headers).backend,'pop');
 f.connectBackend('server');
 assert.equal(f.routeApi.routeMcpRequest(call('get_config'),null,headers).backend,'pop');
 assert.equal(f.routeApi.routeMcpRequest(call('get_config'),null,{'x-forwarded-for':'127.0.0.1'}).routingError,'device_context_required');
});
test('PID unknown/ambiguous fail closed, explicit device wins and snapshots preserve per-device identity',()=>{
 const f=fixture();f.connectBackend('pop');const future=Date.now()+60000;
 const unknown=f.routeApi.routeMcpRequest(call('read_process_output',{pid:123}),null,{});
 assert.equal(unknown.routingError,'process_device_unknown');
 for(const backend of ['pop','server']) f.routeApi.applyProcessRouteSnapshot(backend,[{pid:123,expiresAt:future,bootId:'boot-'+backend,startTicks:99}]);
 f.routeApi.applyProcessRouteSnapshot('pop',[{pid:123,expiresAt:future,bootId:'boot-pop',startTicks:99}]);
 assert.equal(f.routeApi.routeMcpRequest(call('read_process_output',{pid:123}),null,{}).routingError,'process_device_ambiguous');
 assert.equal(f.routeApi.routeMcpRequest(call('read_process_output',{pid:123,deviceId:'pop-os'}),null,{}).backend,'pop');
 f.routeApi.applyProcessRouteSnapshot('pop',[]);
 assert.equal(f.routeApi.processBackendFor('read_process_output',{pid:123}).backend,'server');
});
test('same PID expiry is per backend, never renewed by another device snapshot',()=>{
 const f=fixture();f.connectBackend('pop');
 f.routeApi.applyProcessRouteSnapshot('pop',[{pid:456,expiresAt:Date.now()+60000,bootId:'pop-boot',startTicks:10}]);
 f.routeApi.applyProcessRouteSnapshot('server',[{pid:456,expiresAt:Date.now()+120000,bootId:'server-boot',startTicks:20}]);
 vm.runInContext(`Date.now=()=>${Date.now()+70000};`,f.ctx);
 assert.equal(f.routeApi.processBackendFor('read_process_output',{pid:456}).backend,'server');
});
test('invalid/expired process snapshot identity is never learned',()=>{
 const f=fixture(),future=Date.now()+60000;
 f.routeApi.applyProcessRouteSnapshot('pop',[{pid:100,expiresAt:future},{pid:101,expiresAt:future,bootId:'boot',startTicks:null},{pid:102,expiresAt:Date.now()-1,bootId:'boot',startTicks:2}]);
 for(const pid of [100,101,102]) assert.equal(f.routeApi.processBackendFor('read_process_output',{pid}).state,'unknown');
});
test('device marker and explicit path route before affinity; unknown device does not silently route',()=>{
 const f=fixture();f.connectBackend('pop');
 const h={'x-openai-session':'switch'};
 assert.equal(f.routeApi.routeMcpRequest(call('get_config',{deviceId:'srv-app01'}),null,h).backend,'server');
 assert.equal(f.routeApi.routeMcpRequest(call('start_process',{command:'# tcf-device: pop-os\necho ok'}),null,h).backend,'pop');
 assert.equal(f.routeApi.routeMcpRequest(call('read_file',{path:'/home/u/fixture'}),null,h).backend,'pop');
 assert.equal(f.routeApi.routeMcpRequest(call('get_config',{deviceId:'typo'}),null,h).routingError,'device_context_invalid');
 assert.equal(f.routeApi.routeMcpRequest(call('get_config',{deviceId:'srv-app01'}),'pop',h).backend,'pop');
 assert.equal(Object.hasOwn(JSON.parse(f.routeApi.routeMcpRequest(call('get_config',{deviceId:'srv-app01'}),'pop',h).body).params.arguments,'deviceId'),false);
});
test('resources/prompts/init/list follow affinity after second backend connects',()=>{
 const f=fixture();f.ws.close();f.connectBackend('pop');const h={'x-openai-subject':'s','x-openai-session':'c'};
 f.routeApi.routeMcpRequest(call('get_config'),null,h);f.connectBackend('server');
 for(const method of ['initialize','tools/list','resources/list','resources/templates/list','prompts/list'])assert.equal(f.routeApi.routeMcpRequest(Buffer.from(JSON.stringify({jsonrpc:'2.0',id:1,method})),null,h).backend,'pop');
});
test('affinity TTL/limit bound memory, disconnected bound backend never migrates silently',()=>{
 const f=fixture();f.ws.close();const pop=f.connectBackend('pop');
 const h={'x-openai-session':'expires'};
 f.routeApi.routeMcpRequest(call('get_config'),null,h);f.connectBackend('server');
 const key=f.routeApi.sessionRouteKey(h);
 vm.runInContext(`sessionRoutes.get(${JSON.stringify(key)}).expiresAt=0`,f.ctx);
 assert.equal(f.routeApi.routeMcpRequest(call('get_config'),null,h).routingError,'device_context_required');
 for(let i=0;i<4100;i++)f.routeApi.routeMcpRequest(call('get_config',{deviceId:'pop-os'}),null,{'x-openai-session':'bounded-'+i});
 assert.ok(f.state().sessionRoutes.length<=4096);
 pop.close(); // Routing to a bound offline device is left to HTTP 503, never to another device.
 assert.equal(f.routeApi.routeMcpRequest(call('get_config'),null,{'x-openai-session':'bounded-4099'}).backend,'pop');
});
