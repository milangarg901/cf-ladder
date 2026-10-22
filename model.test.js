import test from 'node:test';
import assert from 'node:assert/strict';
import {groupProblems,selectProblems,problemKey,problemUrl,submissionUrl,recommendationRange} from './model.js';
const sub=(id,contest,index,rating,verdict,time)=>({id,contestId:contest,creationTimeSeconds:time,verdict,problem:{contestId:contest,index,rating,name:`Problem ${index}`,tags:['math']}});
const rows=groupProblems([sub(1,10,'A',800,'OK',10),sub(2,10,'A',800,'WRONG_ANSWER',20),sub(3,10,'B',1200,'OK',30),sub(4,10,'C',1600,'OK',40),sub(5,10,'D',undefined,'OK',50),sub(6,10,'E',800,'WRONG_ANSWER',60)],'target');
const mine=new Set(['10-A']);
const saved={'10-B':{bookmarked:true,checked:true,bookmarkedAt:5},'10-C':{bookmarked:true,checked:false,bookmarkedAt:10}};
const pick=(extra={})=>selectProblems({rows,mine,saved,tab:'practice',...extra}).map(p=>p.key);
test('Recommendation range includes 1000 through 1400 at a 1200 rating',()=>assert.deepEqual(recommendationRange(1200),{min:1000,max:1400,center:1200}));
test('Recommendations use actual rating and supported 100-point boundaries',()=>{assert.deepEqual(recommendationRange(1251),{min:1100,max:1400,center:1251});assert.deepEqual(recommendationRange(1251,300),{min:1000,max:1500,center:1251});assert.equal(recommendationRange(undefined),null);});
test('Only target accepted and not personally solved problems enter the queue',()=>assert.deepEqual(pick(),['10-D','10-C']));
test('Checked questions excluded from every other tab even when bookmarked',()=>{
  assert.deepEqual(pick({tab:'bookmarks'}),['10-C']);assert.deepEqual(pick({tab:'checked'}),['10-B']);
});
test('Unchecking restores the bookmark and practice eligibility',()=>{
  const restored={...saved,'10-B':{...saved['10-B'],checked:false}};
  assert.ok(pick({saved:restored}).includes('10-B'));assert.ok(pick({saved:restored,tab:'bookmarks'}).includes('10-B'));
});
test('Exact, range, unrated, and search filters are composable',()=>{
  assert.deepEqual(pick({exact:'1600'}),['10-C']);assert.deepEqual(pick({min:'1200',max:'1800',tag:'math',search:'Problem C'}),['10-C']);assert.deepEqual(pick({exact:'unrated'}),['10-D']);assert.deepEqual(pick({exact:'900'}),[]);
});
test('Bookmark-first ordering precedes the selected secondary sort',()=>assert.deepEqual(pick({bookmarksFirst:true}),['10-C','10-D']));
test('Rating sorts keep unrated at the end in either direction',()=>{
  assert.deepEqual(pick({sort:'rating-asc'}),['10-C','10-D']);assert.deepEqual(pick({sort:'rating-desc'}),['10-C','10-D']);
});
test('All attempts are retained and only accepted timestamps drive time sort',()=>{assert.equal(rows[0].submissions.length,2);assert.equal(rows[0].lastAccepted,10);});
test('Problem IDs and submission links distinguish contest and gym',()=>{assert.notEqual(problemKey({contestId:1,index:'A'}),problemKey({contestId:2,index:'A'}));assert.equal(problemUrl({contestId:100001,index:'A'}),'https://codeforces.com/gym/100001/problem/A');assert.equal(submissionUrl({contestId:10,id:1}),'https://codeforces.com/contest/10/submission/1');});
