var xe={dtiWatch:.3,dtiMax:.4,highInterestWarn:25,highInterestDanger:40,emergencyMonths:3,extraDebtPayment:0,strategy:"avalanche",emergencyMaintenanceWeight:.15},ha=.7,ga=.5,ya=.65,gt=.1,ft=600,R=.005;function u(e){return Number.isFinite(e)?Math.round((e+Number.EPSILON)*100)/100:0}function we(e){let t=typeof e=="number"?e:Number.parseFloat(String(e??""));return Number.isFinite(t)?t:0}function V(e){return Math.max(0,we(e))}function ue(e,t,a){return Math.min(a,Math.max(t,e))}function H(e,t){return t>0?e/t:0}function fa(e,t,a){return e+(t-e)*ue(a,0,1)}function je(e,t){let a=new Date(`${e}T00:00:00Z`),s=a.getUTCFullYear(),n=a.getUTCMonth()+t,o=s+Math.floor(n/12),l=(n%12+12)%12;return`${o}-${String(l+1).padStart(2,"0")}`}function bt(e){return`${e.getUTCFullYear()}-${String(e.getUTCMonth()+1).padStart(2,"0")}`}function ba(e){return`${bt(e)}-${String(e.getUTCDate()).padStart(2,"0")}`}function He(e){return V(e)/100/12}function va(e,t,a,s){let n=He(t),o=a<=0||a+R<=e*n;if(e<=R)return{months:0,payoffMonth:s.slice(0,7),totalInterest:0,totalPaid:0,paymentUsed:u(a),negativeAmortization:!1};if(o)return{months:null,payoffMonth:null,totalInterest:0,totalPaid:0,paymentUsed:u(a),negativeAmortization:!0};let l=e,c=0,f=0;for(let v=0;v<ft&&l>R;v++){let M=l*n,D=a-M;D>l&&(D=l);let x=D+M;if(l-=D,c+=M,f++,x<=0)break}let h=l<=R;return{months:h?f:null,payoffMonth:h?je(s,f):null,totalInterest:u(c),totalPaid:u(e+c),paymentUsed:u(a),negativeAmortization:!1}}var et=e=>e<=R;function yt(e,t,a,s){let n=e.reduce((x,_)=>x+_.minPayment,0);if(e.length===0||t+R<n)return{monthlyPool:u(t),months:e.length===0?0:null,totalInterest:0,totalPaid:0,debtFreeMonth:e.length===0?s.slice(0,7):null,strategy:a,payoffOrder:[]};let o=e.map(x=>({...x})),l=[],c=x=>x.sort((_,N)=>a==="avalanche"&&N.rate-_.rate||_.balance-N.balance),f=0,h=0,v=0;for(;f<ft;){let x=o.filter(T=>!et(T.balance));if(x.length===0)break;f++,c(x);for(let T of x){let y=T.balance*He(T.rate);T.balance+=y,h+=y}let _=0;for(let T of x){let y=Math.min(T.minPayment,T.balance);T.balance-=y,_+=y,v+=y}let N=t-_;for(let T of x){if(N<=R)break;let y=Math.min(N,T.balance);T.balance-=y,N-=y,v+=y}for(let T of x)et(T.balance)&&!l.some(y=>y.id===T.id)&&l.push({id:T.id,name:T.name,month:f})}let D=o.every(x=>et(x.balance))?f:null;return{monthlyPool:u(t),months:D,totalInterest:u(h),totalPaid:u(v),debtFreeMonth:D===null?null:je(s,D),strategy:a,payoffOrder:l.sort((x,_)=>x.month-_.month)}}var vt={bank_loan:"Bank loan",microloan:"Microloan / MFI",informal:"Informal / family loan",credit_purchase:"Credit purchase"};function ae(e){return vt[e]??"Debt"}var $t={monthly:1,weekly:52/12,biweekly:26/12,annual:1/12};function tt(){return{app:"$honchoy",user:{ageConfirmed:!0,language:"en",currency:"USD"},income:{type:"monthly",sources:[]},expenses:[],debts:[],goals:[],logs:[]}}function Me(e){let t=tt();if(!e||typeof e!="object")return t;let a=e,s=a.income?.type&&a.income.type in $t?a.income.type:"monthly",n=Array.isArray(a.income?.sources)?a.income.sources.filter(h=>h&&typeof h=="object").map(h=>({name:String(h.name??"Income").slice(0,60),amount:V(h.amount)})):[],o=Array.isArray(a.expenses)?a.expenses.filter(h=>h&&typeof h=="object"&&V(h.amount)>0).map(h=>({id:h.id?String(h.id):void 0,category:String(h.category??"other").toLowerCase().slice(0,40)||"other",name:String(h.name??"").slice(0,80)||String(h.category??"Expense"),amount:u(V(h.amount)),type:h.type==="variable"?"variable":"fixed"})):[],l=Array.isArray(a.debts)?a.debts.filter(h=>h&&typeof h=="object"&&V(h.amount)>0).map(h=>({id:h.id?String(h.id):void 0,name:h.name?String(h.name).slice(0,80):void 0,type:h.type in vt?h.type:"bank_loan",amount:u(V(h.amount)),interestRate:u(ue(we(h.interestRate),0,300)),minMonthlyPayment:u(V(h.minMonthlyPayment))})):[],c=Array.isArray(a.goals)?a.goals.filter(h=>h&&typeof h=="object").map((h,v)=>({id:String(h.id??`g${v+1}`).slice(0,40),name:String(h.name??"Goal").slice(0,80),cost:u(V(h.cost)),saved:u(V(h.saved)),type:h.type==="emergency_fund"?"emergency_fund":"custom"})):[],f=Array.isArray(a.logs)?a.logs.filter(h=>h&&typeof h=="object").map(h=>({date:/^\d{4}-\d{2}-\d{2}$/.test(String(h.date))?String(h.date):new Date().toISOString().slice(0,10),amount:u(we(h.amount)),note:h.note?String(h.note).slice(0,200):""})):[];return{app:"$honchoy",user:{ageConfirmed:a.user?.ageConfirmed!==!1,language:a.user?.language==="mn"?"mn":"en",currency:String(a.user?.currency??"USD").slice(0,8)},income:{type:s,sources:n},expenses:o,debts:l,goals:c,logs:f}}function We({data:e,options:t,now:a}){let s={...xe,...t??{}},n=Me(e),o=a?new Date(a):new Date,l=ba(o),c=n.user.currency||"USD",f=$t[n.income.type]??1,h=n.income.sources.map(i=>{let m=u(i.amount*f);return{name:i.name,amount:u(i.amount),monthlyAmount:m,share:0}}),v=u(h.reduce((i,m)=>i+m.monthlyAmount,0));for(let i of h)i.share=u(H(i.monthlyAmount,v)*100)/100;let M={type:n.income.type,monthly:v,annual:u(v*12),sources:h},D=u(n.expenses.filter(i=>i.type==="fixed").reduce((i,m)=>i+m.amount,0)),x=u(n.expenses.filter(i=>i.type==="variable").reduce((i,m)=>i+m.amount,0)),_=u(D+x),N=new Map;for(let i of n.expenses){let m=N.get(i.category)??{amount:0,count:0,type:i.type};m.amount+=i.amount,m.count+=1,i.type==="variable"&&(m.type="variable"),N.set(i.category,m)}let T=[...N.entries()].map(([i,m])=>({category:i,amount:u(m.amount),count:m.count,type:m.type,share:u(H(m.amount,_)*100)/100})).sort((i,m)=>m.amount-i.amount),y={count:n.expenses.length,total:_,fixed:D,variable:x,fixedShare:u(H(D,_)*100)/100,variableShare:u(H(x,_)*100)/100,incomeShare:u(H(_,v)*100)/100,byCategory:T},W=u(n.debts.reduce((i,m)=>i+m.amount,0)),F=u(n.debts.reduce((i,m)=>i+m.minMonthlyPayment,0)),Qt=u(H(n.debts.reduce((i,m)=>i+m.interestRate*m.amount,0),W)),ea=u(n.debts.reduce((i,m)=>Math.max(i,m.interestRate),0)),ta=u(n.debts.reduce((i,m)=>i+m.amount*He(m.interestRate),0)),Ae=n.debts.map(i=>{let m=u(i.amount*He(i.interestRate)),I=i.minMonthlyPayment+R<=m,j=va(i.amount,i.interestRate,i.minMonthlyPayment,l),G=j,K=null,Ne=null;return I?(K="high",Ne="The minimum payment does not cover this month\u2019s interest \u2014 the balance grows every month."):i.interestRate>=s.highInterestDanger?(K="high",Ne=`Very expensive money at ${i.interestRate}% a year. Prioritise this one.`):i.interestRate>=s.highInterestWarn&&(K="warn",Ne=`High rate at ${i.interestRate}% a year \u2014 well above a typical bank loan.`),{id:i.id??i.name??ae(i.type),name:i.name||ae(i.type),type:i.type,amount:i.amount,interestRate:i.interestRate,minMonthlyPayment:i.minMonthlyPayment,monthlyInterest:m,principalShare:u(ue(H(i.minMonthlyPayment-m,i.amount),0,1)*100)/100,monthsAtMinimum:j.months,negativeAmortization:I,payoff:G,effectiveMonthlyCost:m,severity:K,note:Ne}}).sort((i,m)=>m.interestRate-i.interestRate||m.amount-i.amount),aa=["bank_loan","microloan","informal","credit_purchase"].map(i=>{let m=n.debts.filter(j=>j.type===i),I=u(m.reduce((j,G)=>j+G.amount,0));return{type:i,count:m.length,amount:I,minMonthlyPayment:u(m.reduce((j,G)=>j+G.minMonthlyPayment,0)),averageRate:u(H(m.reduce((j,G)=>j+G.interestRate*G.amount,0),I))}}).filter(i=>i.count>0),U=u(H(F,v)*100)/100,rt=n.debts.map((i,m)=>({id:i.id??`d${m+1}`,name:i.name||ae(i.type),balance:i.amount,rate:i.interestRate,minPayment:i.minMonthlyPayment})),Ve=u(F+V(s.extraDebtPayment)),lt=s.strategy==="snowball"?"snowball":"avalanche",dt=lt==="avalanche"?"snowball":"avalanche",na=yt(rt,Ve,lt,l),ct=yt(rt,Ve,dt,l),sa={...na,underfunded:n.debts.length>0&&Ve+R<F,alternate:{strategy:dt,months:ct.months,totalInterest:ct.totalInterest}},P={count:n.debts.length,totalOwed:W,totalMinMonthlyPayment:F,weightedAverageRate:Qt,highestRate:ea,monthlyInterestCost:ta,dti:U,byType:aa,items:Ae,plan:sa,hasNegativeAmortization:Ae.some(i=>i.negativeAmortization)},q=u(v-_),ge=u(F+V(s.extraDebtPayment)),Ke=u(Math.max(0,ge-Math.max(0,q))),Ee=u(Math.max(0,q-ge)),oa=u(H(Ee,v)*100)/100,Pe=n.goals.find(i=>i.type==="emergency_fund"),ne=u(Pe?Pe.cost:_*Math.max(1,s.emergencyMonths)),Re=u(Pe?Pe.saved:0),ye=u(Math.max(0,ne-Re)),se=ye<=R||ne<=R,fe=u(ue(H(Re,ne),0,1)*100)/100,Ze=se?s.emergencyMaintenanceWeight:u(fa(ha,ga,fe)*100)/100,ia=u(1-Ze),be=n.goals.filter(i=>i.type!=="emergency_fund"&&i.cost-i.saved>R),ut=be.length>0?u(ia*ya*100)/100:0,Le=u((1-Ze-ut)*100)/100,Fe=Ze,ce=ut,ve=Le;if(Ee>0&&Le<gt-1e-9){let i=u((gt-Le)*100)/100,m=Math.min(ce,i);ce=u((ce-m)*100)/100,ve=u((Le+m)*100)/100;let I=u((i-m)*100)/100;I>0&&(Fe=u((Fe-I)*100)/100,ve=u((ve+I)*100)/100)}let Xe=i=>u(Ee*i),Ce=[{key:"emergency",amount:Xe(Fe),weight:Fe,rationale:se?"Buffer already funded \u2014 keeping up a small top-up only.":`Buffer is ${Math.round(fe*100)}% funded, so it takes the largest share.`},{key:"goals",amount:Xe(ce),weight:ce,rationale:ce>0?`Saving toward ${be.length} open goal${be.length===1?"":"s"}.`:"No open goals right now \u2014 nothing earmarked."},{key:"flexible",amount:Xe(ve),weight:ve,rationale:"Day-to-day spending money that is not already committed."}],oe=Ce[0].amount,$e=se?0:oe<=R?null:Math.ceil(ye/oe),J={monthlyIncome:v,totalExpenses:_,totalFixedExpenses:D,totalVariableExpenses:x,totalMinDebtPayments:F,disposableIncome:q,debtCarveOut:ge,debtShortfall:Ke,remainder:Ee,remainderShare:oa,emergencyFund:{target:ne,saved:Re,gap:ye,monthsCovered:u(H(Re,_)*10)/10,fundedRatio:fe,fullyFunded:se,monthlyAllocation:oe,monthsToFund:$e,fundedMonth:$e===0?l.slice(0,7):$e?je(l,$e):null},allocations:Ce,emergencyAllocation:oe,goalsAllocation:Ce[1].amount,flexibleAllocation:Ce[2].amount},ra=[...n.goals].sort((i,m)=>i.type!==m.type?i.type==="emergency_fund"?-1:1:i.cost-i.saved<m.cost-m.saved?-1:1),mt=0,pt=ra.map(i=>{let m=u(Math.max(0,i.cost-i.saved)),I=m<=R,j=i.type==="emergency_fund"?oe:J.goalsAllocation,G=I?0:j>R?Math.ceil(m/j):null,K=I?0:G===null?null:mt+G;return K!==null&&(mt=K),{id:i.id,name:i.name,type:i.type,cost:i.cost,saved:i.saved,remaining:m,progress:u(ue(H(i.saved,i.cost),0,1)*100)/100,monthsToFund:K,fundedMonth:K===null?null:je(l,K),ownMonths:G,completed:I}}),ie=[...n.logs].sort((i,m)=>i.date.localeCompare(m.date)),la=u(ie.reduce((i,m)=>i+m.amount,0)),da=ie.length?ie[ie.length-1].date:null,ht=bt(o),ca=u(ie.filter(i=>i.date.startsWith(ht)).reduce((i,m)=>i+m.amount,0)),ua=new Date(o.getTime()-30*864e5),ma=ie.filter(i=>new Date(`${i.date}T00:00:00Z`).getTime()>=ua.getTime()).reduce((i,m)=>i+m.amount,0),Qe=u(ma/30),_e=u(Qe*30),re=J.flexibleAllocation,Oe=u(_e-re),le={entries:ie.length,totalLogged:la,lastEntryDate:da,currentMonthTotal:ca,currentMonth:ht,dailyAverage:Qe,projectedMonthTotal:_e,allowance:re,overUnder:Oe,onTrack:re<=R?!0:_e<=re},C=[];n.debts.length>0&&v>0&&(U>s.dtiMax?C.push({code:"dti_critical",severity:"high",title:"Debt payments are too large a share of income",message:`You pay ${k(u(F),c)} a month to debt \u2014 ${te(U)} of your income. Lenders and advisers treat anything above ${te(s.dtiMax)} as over-indebted.`,params:{dti:U,threshold:s.dtiMax,amount:F}}):U>s.dtiWatch?C.push({code:"dti_watch",severity:"warn",title:"Debt payments are stretching your income",message:`Debt takes ${te(U)} of your income, above the comfortable ${te(s.dtiWatch)} line and close to the ${te(s.dtiMax)} danger zone.`,params:{dti:U,threshold:s.dtiWatch,amount:F}}):C.push({code:"dti_ok",severity:"good",title:"Debt payments look affordable",message:`Debt takes ${te(U)} of your income, comfortably inside the ${te(s.dtiMax)} limit.`,params:{dti:U,amount:F}}));let ee=Ae.filter(i=>i.interestRate>=s.highInterestWarn);if(ee.length>0){let i=ee.reduce((m,I)=>I.interestRate>m.interestRate?I:m);C.push({code:i.interestRate>=s.highInterestDanger?"interest_high":"interest_watch",severity:i.interestRate>=s.highInterestDanger?"high":"warn",title:"Unusually high interest rate",message:`${i.name} charges ${i.interestRate}% a year \u2014 ${k(i.monthlyInterest,c)} of interest every month, or ${k(u(ee.reduce((m,I)=>m+I.monthlyInterest,0)*12),c)} a year across your expensive debts.`,params:{rate:i.interestRate,count:ee.length,name:i.name,threshold:s.highInterestWarn}})}if(P.hasNegativeAmortization){let i=Ae.filter(m=>m.negativeAmortization).map(m=>m.name);C.push({code:"negative_amortization",severity:"high",title:"A minimum payment is not enough to reduce the balance",message:`${i.join(", ")} charges more interest each month than your minimum payment covers. Paying the minimum means owing more over time.`,params:{names:i.join(", ")}})}v<=0?C.push({code:"no_income",severity:"warn",title:"No income recorded",message:"Add at least one income source so the planner can size your budget."}):q<0?C.push({code:"overspending",severity:"high",title:"Living costs exceed income",message:`Your expenses are ${k(u(-q),c)} more than your income each month. This gap has to be closed before any plan can work.`,params:{gap:u(-q)}}):q>0&&ge>q&&C.push({code:"debt_shortfall",severity:"high",title:"Debt payments do not fit in your budget",message:`You need ${k(ge,c)} a month for debt but only ${k(q,c)} is left after living costs \u2014 a shortfall of ${k(Ke,c)}.`,params:{shortfall:Ke}}),_>0&&!se?C.push({code:"emergency_gap",severity:fe<.5?"warn":"info",title:"Emergency fund is not fully funded",message:`You are ${k(ye,c)} short of a ${s.emergencyMonths}-month buffer (${k(ne,c)}). At ${k(oe,c)} a month you get there${J.emergencyFund.fundedMonth?` by ${J.emergencyFund.fundedMonth}`:" once you free up some cash"}.`,params:{gap:ye,target:ne,months:$e??0}}):_>0&&se&&C.push({code:"emergency_ok",severity:"good",title:"Emergency fund is fully funded",message:`Your buffer covers ${J.emergencyFund.monthsCovered} months of living costs. Anything extra can go to goals or debt.`,params:{monthsCovered:J.emergencyFund.monthsCovered}}),y.fixedShare>.7&&_>0&&C.push({code:"rigid_budget",severity:"info",title:"Most of your spending is fixed",message:`${te(y.fixedShare)} of your expenses are committed (rent, contracts, school fees). That leaves little room to adjust a bad month.`,params:{share:y.fixedShare}}),re>0&&!le.onTrack&&le.entries>0&&C.push({code:"spending_pace",severity:"warn",title:"Spending is running above the plan",message:`At ${k(Qe,c)} a day you are heading for about ${k(_e,c)} this month, ${k(Math.abs(Oe),c)} over your ${k(re,c)} flexible allowance.`,params:{projected:_e,allowance:re,over:Oe}}),J.emergencyFund.monthsCovered<1&&_>0&&le.entries>0&&C.push({code:"no_buffer_months",severity:"warn",title:"Less than one month of expenses saved",message:"A single unexpected bill would have to go on credit. Prioritise the emergency fund."});let E=100;v>0?(U>s.dtiMax?E-=30:U>s.dtiWatch?E-=14:E-=Math.round(U*10),E-=Math.min(20,Math.round(y.incomeShare*25))):E-=50,P.count>0&&ee.length>0&&(E-=10+Math.min(10,ee.length*3)),P.hasNegativeAmortization&&(E-=15),q<0&&(E-=20),J.debtShortfall>0&&(E-=10),E-=Math.round((1-fe)*15),le.onTrack||(E-=5),E=ue(Math.round(E),0,100);let pa=E>=80?"strong":E>=60?"okay":E>=40?"stretched":"at_risk",B=[];if(v<=0&&B.push("Add your income sources \u2014 every other number depends on them."),q<0&&B.push(`Close the ${k(u(-q),c)} monthly gap: cut variable spending first, since fixed costs are harder to move.`),J.debtShortfall>0&&B.push("Talk to each lender before missing a payment \u2014 ask about rescheduling or a lower instalment. Missing payments is more expensive than renegotiating."),ee.length>0){let i=ee.reduce((m,I)=>I.interestRate>m.interestRate?I:m);B.push(`Attack ${i.name} first (${i.interestRate}%). Clearing the most expensive debt first saves the most interest overall.`)}if(P.count>0&&P.plan.months!==null&&P.plan.months>0&&(B.push(`At ${k(P.plan.monthlyPool,c)} a month you are debt-free in ${P.plan.months} months (${P.plan.debtFreeMonth}), having paid ${k(P.plan.totalInterest,c)} in interest.`),P.plan.alternate.totalInterest>P.plan.totalInterest&&P.plan.alternate.months!==null&&B.push(`Clearing the highest-rate debt first saves ${k(u(P.plan.alternate.totalInterest-P.plan.totalInterest),c)} versus clearing the smallest balance first.`)),se?be.length>0&&B.push(`${k(J.goalsAllocation,c)} a month now goes to goals instead of the buffer.`):B.push(`Keep the emergency fund allocation at ${k(oe,c)} a month until it reaches ${k(ne,c)}.`),be.length>0){let i=pt.find(m=>!m.completed&&m.type!=="emergency_fund");i?.fundedMonth&&B.push(`Next goal up: ${i.name}, funded by ${i.fundedMonth}.`)}return le.entries===0?B.push("Log your daily spending so the pace check has something to compare against."):le.onTrack||B.push(`Trim about ${k(Math.max(1,u(Oe/30)),c)} a day from flexible spending to land inside the plan.`),{generatedAt:o.toISOString(),currency:c,income:M,expenses:y,debts:P,budget:J,goals:pt,spending:le,flags:C,recommendations:B,health:{score:E,band:pa}}}function k(e,t="USD"){let a=u(we(e));try{return new Intl.NumberFormat("en-US",{style:"currency",currency:t,maximumFractionDigits:a%1===0?0:2}).format(a)}catch{return`${a.toLocaleString("en-US")} ${t}`}}function te(e,t=0){return`${(we(e)*100).toFixed(t)}%`}var at={app:"$honchoy",user:{ageConfirmed:!0,language:"en",currency:"USD"},income:{type:"monthly",sources:[{name:"salary",amount:2e4}]},expenses:[{id:"e1",category:"rent",name:"House rent",amount:6e3,type:"fixed"},{id:"e2",category:"food",name:"Groceries",amount:3e3,type:"variable"},{id:"e3",category:"transport",name:"Bus & taxi",amount:700,type:"variable"},{id:"e4",category:"utilities",name:"Electricity & water",amount:600,type:"variable"},{id:"e5",category:"school",name:"School fees",amount:900,type:"fixed"},{id:"e6",category:"phone",name:"Phone & internet",amount:300,type:"fixed"}],debts:[{id:"d1",type:"microloan",name:"MFI working-capital loan",amount:5e3,interestRate:20,minMonthlyPayment:500},{id:"d2",type:"bank_loan",name:"Bank salary loan",amount:12e3,interestRate:12,minMonthlyPayment:700},{id:"d3",type:"credit_purchase",name:"Shop credit \u2014 fridge",amount:1800,interestRate:34,minMonthlyPayment:250}],goals:[{id:"g1",name:"Sewing machine",cost:15e3,saved:3e3,type:"custom"},{id:"g2",name:"Emergency fund",cost:34500,saved:9e3,type:"emergency_fund"}],logs:[{date:"2026-09-22",amount:320,note:"Groceries"},{date:"2026-09-23",amount:180,note:"Bus + lunch"},{date:"2026-09-24",amount:450,note:"School books"},{date:"2026-09-25",amount:1e3,note:""}]},_t=["rent","food","transport","utilities","school","health","phone","clothing","family","debt","other"],wt={bank_loan:"Bank loan",microloan:"Microloan / MFI",informal:"Informal / family loan",credit_purchase:"Credit purchase"};var Ue=e=>`${Math.round((Number.isFinite(e)?e:0)*100)}%`;function xt(e){if(!e)return null;let[t,a]=e.split("-").map(Number);return!t||!a?e:new Date(Date.UTC(t,a-1,1)).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"})}function $a(e){return e===null?"a long time":e<=1?"about a month":e<24?`about ${e} months`:`about ${Math.round(e/12)} years`}var _a={strong:"You are in a really good place. Keep doing what you are doing.",okay:"A solid base \u2014 a few small steps will lift you higher.",stretched:"Money is a bit stretched. Small, steady steps will help a lot.",at_risk:"Things feel tight right now. Let\u2019s start with one small change."},wa={dti_critical:"Loan payments take a big part of your income.",dti_watch:"Loan payments are starting to take a lot of your income.",negative_amortization:"One loan payment is too small to shrink the loan.",interest_watch:"One of your loans is very expensive.",interest_high:"One of your loans is very expensive.",overspending:"Your costs are higher than your income.",debt_shortfall:"There isn\u2019t enough left to cover every loan payment.",emergency_gap:"Your safety cushion for bad days isn\u2019t full yet.",no_buffer_months:"You have less than one month of costs saved.",spending_pace:"Day-to-day spending is running above the plan.",rigid_budget:"Most of your costs are fixed, so there is little room to adjust.",no_income:"We don\u2019t know your income yet."};function Mt(e,t){let a=e.income.monthly,s=e.expenses.total,n=e.debts.totalMinMonthlyPayment,o=a-s-n,l=a>0?(s+n)/a:1,c=Math.max(0,e.budget.emergencyAllocation+e.budget.goalsAllocation),f=e.goals.reduce((y,W)=>y+W.saved,0),h=e.goals.reduce((y,W)=>y+W.cost,0),v=e.budget.emergencyFund,M=[];a<=0?M.push({code:"no_income",priority:100,tone:"care",text:"Add your income first \u2014 then we can show you how your money is really doing.",lesson:"budget"}):o<0?M.push({code:"gap",priority:98,tone:"warn",text:`Right now your costs and loan payments are ${t(-o)} more than you earn each month. Let\u2019s find one cost to lower first \u2014 changeable costs like food or transport are usually the easiest.`,lesson:"budget"}):l<=.6?M.push({code:"room",priority:60,tone:"good",text:`Good news: your living costs and loan payments use ${Ue(l)} of your income, which leaves about ${t(o)} each month for saving and spending.`}):M.push({code:"tight",priority:72,tone:"care",text:`Your living costs and loan payments use ${Ue(l)} of your income, leaving about ${t(o)} a month. Writing down daily spending for a week often shows small leaks you can fix.`,lesson:"budget"});let D=e.goals.find(y=>!y.completed&&y.type!=="emergency_fund");if(D){let y=xt(D.fundedMonth),W=!v.fullyFunded&&v.target>0,F=`You are ${Ue(D.progress)} of the way to your ${D.name.toLowerCase()}.`;y&&D.monthsToFund!==null?F+=W?` If you follow the plan, you\u2019ll have it by ${y} \u2014 after your safety cushion is built.`:` If you follow the plan, you\u2019ll have it by ${y} (${$a(D.monthsToFund)}).`:F+=" Once there is money left after costs, the plan will start putting some aside for it.",M.push({code:"goal",priority:80,tone:"good",text:F,lesson:"saving"})}else e.goals.length>0&&e.goals.every(y=>y.completed)&&M.push({code:"goals_done",priority:55,tone:"good",text:"You have reached every goal you set \u2014 wonderful! Maybe it\u2019s time to choose a new one."});let x=e.debts.items.find(y=>y.negativeAmortization),_=[...e.debts.items].sort((y,W)=>W.interestRate-y.interestRate)[0];if(x)M.push({code:"debt_growing",priority:96,tone:"warn",text:`The payment on ${x.name} is smaller than the interest it adds each month, so the loan keeps growing. Paying even a little more, or talking to the lender, is the most important step.`,lesson:"debt"});else if(_&&_.interestRate>=25){let y=_.amount*_.interestRate/100;M.push({code:"debt_costly",priority:85,tone:"care",text:`${_.name} costs ${_.interestRate}% a year \u2014 about ${t(y)} a year just in interest. Paying it off first will save you the most money.`,lesson:"debt"})}else e.debts.count>0&&e.debts.plan.debtFreeMonth&&M.push({code:"debt_ok",priority:45,tone:"good",text:`Keep making your loan payments and you\u2019ll be free of debt by ${xt(e.debts.plan.debtFreeMonth)}.`,lesson:"interest"});!v.fullyFunded&&v.target>0&&a>0&&M.push({code:"cushion",priority:v.monthsCovered<1?78:50,tone:"care",text:`Your safety cushion is ${Ue(v.fundedRatio)} full. Building it up means a surprise bill won\u2019t push you into a new loan.`,lesson:"emergency"}),e.spending.entries>0&&!e.spending.onTrack&&e.spending.overUnder>0&&M.push({code:"pace",priority:70,tone:"care",text:`Your everyday spending is heading about ${t(e.spending.overUnder)} over the plan this month. Cutting around ${t(Math.max(1,e.spending.overUnder/30))} a day would bring it back.`,lesson:"budget"});let N=M.sort((y,W)=>W.priority-y.priority).slice(0,3),T=[...new Set(e.flags.filter(y=>y.severity==="high"||y.severity==="warn").map(y=>wa[y.code]).filter(Boolean))].slice(0,3);return{income:a,livingCosts:s,loanPayments:n,leftOver:o,spentShare:l,plannedSaving:c,plannedSavingShare:a>0?c/a:0,totalSaved:f,totalTarget:h,emergency:{saved:v.saved,target:v.target,ratio:v.fundedRatio,fundedMonth:v.fundedMonth},score:e.health.score,band:e.health.band,scoreWords:_a[e.health.band],scoreReasons:T,insights:N}}var Y=[{id:"saving",topic:"Saving",icon:"\u{1F437}",title:"Pay yourself first",minutes:2,bigIdea:"Saving is easier when you do it first, not last.",body:["Most of us try to save what is left at the end of the month \u2014 and often nothing is left.","Instead, the day money comes in, put a small amount aside before you spend on anything else. Treat it like a bill you owe to your future self.","It does not have to be big. What matters most is doing it every time."],example:"If you earn {20000} and put {1000} aside on payday, you will have {12000} in one year \u2014 without even thinking about it.",tryThis:"Choose one small amount you can save every payday. Write it down here in $honchoy."},{id:"emergency",topic:"Saving",icon:"\u2602\uFE0F",title:"A cushion for bad days",minutes:2,bigIdea:"An emergency fund keeps a surprise from turning into a loan.",body:["Life brings surprises: a doctor visit, a broken phone, a slow month at work.","An emergency fund is money you keep only for these moments. It means you do not have to borrow at high interest when trouble comes.","A good first target is one month of your basic costs. Later, you can build it up to three months."],example:"If rent and food cost {9000} a month, a first cushion of {9000} can carry you through one hard month.",tryThis:"Keep your cushion somewhere separate \u2014 a different account or envelope \u2014 so you are not tempted to spend it."},{id:"interest",topic:"Interest",icon:"%",title:"Interest: the price of money",minutes:2,bigIdea:"Interest can work for you or against you.",body:["Interest is the extra money paid for using someone else\u2019s money.","When you save in a bank, the bank pays you interest \u2014 your money grows. When you borrow, you pay interest \u2014 the loan costs more than you took.","Over time, interest is added on top of interest. This is called \u201Ccompounding\u201D. It makes savings grow faster, and it makes unpaid loans grow faster too."],example:"Borrow {5000} at 20% a year, and in one year you owe about {1000} extra \u2014 just for borrowing.",tryThis:"Before any loan, ask: \u201CHow much will I pay back in total?\u201D \u2014 not just \u201CHow much is each payment?\u201D"},{id:"debt",topic:"Debt",icon:"\u{1F932}",title:"Getting out of debt, step by step",minutes:3,bigIdea:"Pay the most expensive loan first.",body:["Not all loans are the same. The one with the highest interest rate is costing you the most each month.","Always pay at least the minimum on every loan so you avoid extra fees. Then put any extra money toward the loan with the highest rate.","When that one is gone, move the same money to the next one. It feels slow at first, then it speeds up.","Try not to take a new loan to pay an old one \u2014 it usually adds more interest."],example:"On a {5000} loan at 20%, paying {700} a month instead of {500} clears it about 4 months sooner and saves around {150} in interest.",tryThis:"List your loans from highest to lowest interest rate. Circle the top one \u2014 that is your target."},{id:"inflation",topic:"Inflation",icon:"\u{1F9FA}",title:"Why prices keep going up",minutes:2,bigIdea:"Inflation means the same money buys a little less each year.",body:["Remember when rice or a bus ride cost less? That slow rise in prices is called inflation.","If your money sits in a box at home, it stays the same number \u2014 but it buys less and less over time.","This is why it helps to keep savings somewhere that earns some interest, like a bank savings account or a trusted savings scheme."],example:"If prices rise 8% in a year, groceries that cost {3000} today may cost about {3240} next year.",tryThis:"When you plan a goal for next year, add a little extra to the price to allow for inflation."},{id:"investing",topic:"Investing",icon:"\u{1F331}",title:"Investing: planting money seeds",minutes:3,bigIdea:"Investing means putting money to work so it can grow over time.",body:["Saving keeps money safe. Investing aims to grow it \u2014 but the value can go up and down along the way.","Common options include fixed deposits and government savings certificates (lower risk), and shares or funds (higher risk, higher possible reward).","Only invest money you will not need soon. Build your emergency cushion and pay off costly loans first.","Higher possible reward always comes with higher risk. Anyone who says otherwise is not being honest."],example:"A small business, like buying a sewing machine to earn from tailoring, is also a kind of investment \u2014 in yourself.",tryThis:"Before investing, ask: \u201CCan I afford to leave this money alone for at least a year?\u201D"},{id:"diversification",topic:"Diversification",icon:"\u{1F95A}",title:"Don\u2019t put all your eggs in one basket",minutes:2,bigIdea:"Spreading your money out keeps one problem from wiping you out.",body:["If you carry all your eggs in one basket and drop it, you lose them all. Money works the same way.","Diversification simply means spreading your money across different places \u2014 for example, some in savings, some in a deposit, some in your business.","It also applies to income: having more than one way to earn keeps you steadier if one stops."],example:"Instead of putting {10000} into one scheme, you might keep {5000} in savings, {3000} in a fixed deposit and use {2000} to grow your small business.",tryThis:"Look at where your money is today. Is it all in one place? Pick one small way to spread it out."},{id:"budget",topic:"Budgeting",icon:"\u{1F4DD}",title:"Know where your money goes",minutes:2,bigIdea:"You can\u2019t change what you can\u2019t see.",body:["A budget is just a plan for your money: what comes in, and where it goes.","\u201CFixed\u201D costs stay the same each month, like rent. \u201CVariable\u201D costs change, like food or transport \u2014 these are usually the easiest to adjust.","Writing down what you spend for even one week often shows small leaks you did not notice."],example:"Saving {50} a day on snacks or tea adds up to about {1500} a month \u2014 enough for a nice step toward a goal.",tryThis:"Log every expense in $honchoy for 7 days, then look for one small leak to fix."}];function ke(e,t){return e.replace(/\{(\d+(?:\.\d+)?)\}/g,(a,s)=>t(Number(s)))}var Z=[{id:"guaranteed",icon:"\u{1F4B0}",title:"Guaranteed high returns",whatItSounds:"\u201CDouble your money in 30 days!\u201D \u201C100% safe, no risk.\u201D",whyRisky:"Real investments can go up and down. Nobody honest can promise big profits with no risk.",whatToDo:"If the promise sounds too good to be true, it almost always is. Walk away.",question:"Do they promise big profits, or say there is no risk at all?",weight:3,patterns:[/guarantee(d)?/i,/double (your )?money/i,/(no|zero) risk/i,/risk[- ]free/i,/100\s?% (safe|profit|return)/i,/\b\d{2,3}\s?% (profit|return|interest)/i,/(daily|weekly) (profit|return|income)/i,/get rich/i,/triple/i]},{id:"pressure",icon:"\u23F1\uFE0F",title:"Pressure to decide fast",whatItSounds:"\u201COnly today!\u201D \u201CLast 3 spots \u2014 pay now or lose it.\u201D",whyRisky:"Scammers rush you so you don\u2019t have time to think, check or ask someone you trust.",whatToDo:"A real offer will still be there tomorrow. Take your time and talk to family or a friend.",question:"Are they rushing you, or saying the offer ends very soon?",weight:2,patterns:[/(only|just) today/i,/act (now|fast)/i,/limited (time|offer|slots?|seats?)/i,/last (chance|\d+ (spots?|slots?|seats?))/i,/hurry/i,/expires? (today|tonight|soon)/i,/right now/i,/immediately/i,/urgent/i,/don'?t (tell|miss)/i]},{id:"upfront",icon:"\u{1F4B8}",title:"Fees before you get anything",whatItSounds:"\u201CPay a small processing fee to release your loan / prize.\u201D",whyRisky:"Real lenders take fees from the loan itself or after approval. Asking for money first is a classic trick \u2014 and the fees often keep coming.",whatToDo:"Never pay to receive a loan, a job or a prize. Stop and check.",question:"Do you have to pay a fee first to get a loan, job, prize or profit?",weight:3,patterns:[/(processing|registration|joining|activation|release|advance|upfront|service) (fee|charge|payment)/i,/pay (a )?(small )?fee/i,/send (money|payment|taka|tk)/i,/deposit first/i,/you('ve| have)? won/i,/lottery/i,/claim (your )?prize/i,/send (it )?(via|by|through|to|on) (bkash|nagad|rocket|mobile money|m-?pesa|gcash)/i,/gift card/i]},{id:"unregistered",icon:"\u{1FAAA}",title:"Unregistered agent or company",whatItSounds:"\u201CWe don\u2019t need a licence.\u201D \u201CJust trust me, I\u2019m a friend of a friend.\u201D",whyRisky:"Registered banks, lenders and brokers are checked by the government. If they are not registered, you have no protection if things go wrong.",whatToDo:"Ask for their licence or registration number and check it on your country\u2019s official regulator website (for example the central bank or securities commission).",question:"Are you unsure whether the person or company is officially registered?",weight:3,patterns:[/no (licen[cs]e|registration|paperwork|documents?) (needed|required)/i,/trust me/i,/(whats ?app|telegram|facebook|imo) (group|only|channel)/i,/(personal|my own) (account|number)/i,/not registered|unregistered/i]},{id:"recruit",icon:"\u{1F465}",title:"Earn by bringing in others",whatItSounds:"\u201CBring 5 friends and earn a bonus for each one.\u201D",whyRisky:"When profits come from new members instead of real work or products, the scheme collapses \u2014 and most people lose their money.",whatToDo:"Be very careful of any plan where the main way to earn is recruiting.",question:"Do you earn mainly by bringing in new people?",weight:2,patterns:[/refer(ral)?/i,/recruit/i,/bring (\d+ )?(friends|people|members)/i,/downline|network marketing|mlm|chain/i]},{id:"secrets",icon:"\u{1F511}",title:"Asking for PIN, OTP or passwords",whatItSounds:"\u201CShare the code we just sent you to confirm your account.\u201D",whyRisky:"Your PIN or one-time code (OTP) is the key to your money. With it, someone can empty your account.",whatToDo:"Never share your PIN, OTP or password \u2014 not even with someone who says they are from your bank.",question:"Are they asking for your PIN, OTP, password or ID card photo?",weight:3,patterns:[/\bpin\b/i,/\botp\b/i,/password/i,/verification code/i,/(nid|id card) (photo|copy|number)/i,/share (the )?code/i]},{id:"vague",icon:"\u2753",title:"Can\u2019t explain how it makes money",whatItSounds:"\u201CIt\u2019s a secret system.\u201D \u201CDon\u2019t worry about the details.\u201D",whyRisky:"An honest business can tell you clearly how it earns. Vague answers usually hide something.",whatToDo:"If you can\u2019t explain it simply to a friend, don\u2019t put money in.",question:"Is it unclear how the business actually earns its money?",weight:1,patterns:[/secret (system|method|formula|trick)/i,/don'?t worry about/i,/forex|binary|trading bot/i]}];function kt(e,t){let a=Z.filter(c=>e.has(c.id)),s=a.reduce((c,f)=>c+f.weight,0),n=s>=4?"high":s>=2?"medium":"low",o=n==="high"?"This looks like a scam. Please don\u2019t send money.":n==="medium"?"Be careful \u2014 we see warning signs.":a.length?"Mostly okay, but one thing to check.":"We didn\u2019t spot common red flags.";return{level:n,headline:o,advice:n==="high"?"Stop all contact, don\u2019t share any codes, and talk to someone you trust. You can report it to your bank or the police.":n==="medium"?"Take your time. Ask for their registration, check it with the official regulator, and talk it over with family.":"That\u2019s a good sign, but no checker is perfect. Still verify who they are before paying anything.",matched:a.map(c=>({id:c.id,title:c.title,whyRisky:c.whyRisky,whatToDo:c.whatToDo,evidence:t.get(c.id)??[]}))}}function St(e){let t=new Set(e.filter(a=>Z.some(s=>s.id===a)));return kt(t,new Map)}function Tt(e){let t=(e??"").slice(0,5e3),a=new Set,s=new Map;for(let n of Z){let o=[];for(let l of n.patterns){let c=t.match(l);c&&!o.some(f=>f.toLowerCase()===c[0].toLowerCase())&&o.push(c[0])}o.length&&(a.add(n.id),s.set(n.id,o.slice(0,3)))}return kt(a,s)}function g(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}var Se=e=>`${Math.round((Number.isFinite(e)?e:0)*100)}%`,Ge=(e,t)=>(t>0?Math.max(0,Math.min(100,e/t*100)):0).toFixed(1),xa={strong:"Strong",okay:"Getting there",stretched:"Building up",at_risk:"Needs care"};function qe(e,t,a,s,n){return`<div class="bar-row">
    <span class="bar-row__label">${g(e)}</span>
    <span class="bar"><span class="bar__fill bar__fill--${s}" style="width:${Ge(t,a)}%"></span></span>
    <span class="bar-row__value">${g(n)}</span>
  </div>`}function Dt(e,t){let a=Mt(e,t),s=a.livingCosts+a.loanPayments,n=Math.max(a.income,s,1),o=a.score>=80?"var(--good)":a.score>=60?"var(--pink-500)":a.score>=40?"var(--warn)":"var(--danger)",l=e.goals;return`
  <section class="card card--accent">
    <div class="card__head">
      <div>
        <h1>How your money is doing</h1>
        <p class="card__hint">A simple picture of this month, in plain words. Change your numbers on the other tabs and this updates straight away.</p>
      </div>
    </div>

    <div class="edu-hero">
      <div class="edu-score">
        <div class="dial__ring" style="--pct:${a.score};--ring:${o}" role="img"
             aria-label="Money health score ${a.score} out of 100">
          <div class="dial__inner">
            <span class="dial__score">${a.score}</span>
            <span class="dial__caption">out of 100</span>
          </div>
        </div>
        <p class="edu-score__label">${g(xa[a.band])}</p>
        <p class="small muted">${g(a.scoreWords)}</p>
        ${a.scoreReasons.length?`<details class="edu-why">
                <summary>What would raise my score?</summary>
                <ul>${a.scoreReasons.map(c=>`<li>${g(c)}</li>`).join("")}</ul>
              </details>`:""}
      </div>

      <div class="edu-insights">
        <h2>What we notice</h2>
        <ul class="edu-insight-list">
          ${a.insights.map(c=>`<li class="edu-insight edu-insight--${c.tone}">
                <p>${g(c.text)}</p>
                ${c.lesson?`<a class="edu-link" href="#/learn" data-action="lesson-open" data-id="${g(c.lesson)}">Learn how \u2192</a>`:""}
              </li>`).join("")}
        </ul>
      </div>
    </div>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${Be("Money in",t(a.income),"each month")}
    ${Be("Money out",t(s),`${Se(a.spentShare)} of income`)}
    ${Be("Left over",t(a.leftOver),"after costs and loans",a.leftOver<0?"danger":"good")}
    ${Be("Planned saving",t(a.plannedSaving),`${Se(a.plannedSavingShare)} of income`,"pink")}
  </div>

  <div class="grid grid--2 edu-grid" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head"><div class="card__title"><h2>Money in vs. money out</h2></div></div>
      ${qe("Income",a.income,n,"good",t(a.income))}
      ${qe("Living costs",a.livingCosts,n,"pink",t(a.livingCosts))}
      ${qe("Loan payments",a.loanPayments,n,"warn",t(a.loanPayments))}
      ${qe("Left over",Math.max(0,a.leftOver),n,"info",t(a.leftOver))}
      <p class="small muted" style="margin-top:var(--space-4)">
        Fixed costs (the same every month): <strong>${g(t(e.expenses.fixed))}</strong> \xB7
        Changeable costs: <strong>${g(t(e.expenses.variable))}</strong>.
        Changeable costs are usually the easiest place to save.
      </p>
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>Savings &amp; goals</h2></div></div>
      ${a.emergency.target>0?`<div class="edu-goal">
              <div class="row row--between"><strong>Safety cushion</strong><span class="small muted">${g(t(a.emergency.saved))} of ${g(t(a.emergency.target))}</span></div>
              <span class="bar"><span class="bar__fill" style="width:${Ge(a.emergency.ratio,1)}%"></span></span>
              <span class="small muted">${a.emergency.ratio>=1?"Full \u2014 well done!":`${Se(a.emergency.ratio)} full${a.emergency.fundedMonth?` \xB7 full by ${g(It(a.emergency.fundedMonth))} on the plan`:""}`}</span>
            </div>`:""}
      ${l.filter(c=>c.type!=="emergency_fund").length===0?'<p class="small muted">No goals yet. What would you love to save for? Add one on the <a href="#/goals">Goals</a> tab.</p>':l.filter(c=>c.type!=="emergency_fund").map(c=>`<div class="edu-goal">
                  <div class="row row--between"><strong>\u2B50 ${g(c.name)}</strong><span class="small muted">${g(t(c.saved))} of ${g(t(c.cost))}</span></div>
                  <span class="bar"><span class="bar__fill bar__fill--${c.completed?"good":"info"}" style="width:${Ge(c.progress,1)}%"></span></span>
                  <span class="small muted">${c.completed?"Reached \u2014 congratulations! \u{1F389}":`${Se(c.progress)} there \xB7 ${g(t(c.remaining))} to go${c.fundedMonth?` \xB7 ready by ${g(It(c.fundedMonth))}`:""}`}</span>
                </div>`).join("")}
      <p class="small muted" style="margin-top:var(--space-3)">
        Saved so far across everything: <strong>${g(t(a.totalSaved))}</strong>${a.totalTarget>0?` of ${g(t(a.totalTarget))} (${Se(a.totalSaved/a.totalTarget)})`:""}.
      </p>
    </section>
  </div>`}function Be(e,t,a,s){return`<article class="stat">
    <span class="stat__label">${g(e)}</span>
    <span class="stat__value${s?` stat__value--${s}`:""}">${g(t)}</span>
    <span class="stat__meta">${g(a)}</span>
  </article>`}function It(e){let[t,a]=e.split("-").map(Number);return!t||!a?e:new Date(Date.UTC(t,a-1,1)).toLocaleDateString("en-US",{month:"short",year:"numeric",timeZone:"UTC"})}function At(e,t){let a=Y.filter(s=>e.has(s.id)).length;return`
  <section class="card card--accent">
    <div class="card__head">
      <div>
        <h1>Money basics, made simple</h1>
        <p class="card__hint">Short lessons with no jargon \u2014 about 2 minutes each. Tap a card to read it.</p>
      </div>
      <span class="badge badge--${a===Y.length?"good":"muted"}">${a} of ${Y.length} read</span>
    </div>
    <span class="bar edu-progress"><span class="bar__fill" style="width:${Ge(a,Y.length)}%"></span></span>
  </section>

  <div class="edu-lessons" style="margin-top:var(--space-4)">
    ${Y.map(s=>`<button type="button" class="edu-lesson${e.has(s.id)?" is-read":""}" data-action="lesson-open" data-id="${g(s.id)}">
          <span class="edu-lesson__icon" aria-hidden="true">${g(s.icon)}</span>
          <span class="edu-lesson__topic">${g(s.topic)} \xB7 ${s.minutes} min</span>
          <strong class="edu-lesson__title">${g(s.title)}</strong>
          <span class="edu-lesson__idea">${g(ke(s.bigIdea,t))}</span>
          <span class="edu-lesson__cta">${e.has(s.id)?"\u2713 Read":"Read lesson \u2192"}</span>
        </button>`).join("")}
  </div>`}function Et(e,t){let a=Y.findIndex(n=>n.id===e.id),s=Y[(a+1)%Y.length];return`
  <article class="edu-reader">
    <span class="edu-lesson__icon edu-lesson__icon--big" aria-hidden="true">${g(e.icon)}</span>
    <span class="edu-lesson__topic">${g(e.topic)} \xB7 ${e.minutes} min read</span>
    <p class="edu-reader__idea">${g(e.bigIdea)}</p>
    ${e.body.map(n=>`<p>${g(ke(n,t))}</p>`).join("")}
    <div class="edu-box edu-box--example"><strong>For example</strong><p>${g(ke(e.example,t))}</p></div>
    <div class="edu-box edu-box--try"><strong>Try this</strong><p>${g(ke(e.tryThis,t))}</p></div>
    <div class="row row--end">
      <button type="button" class="btn btn--ghost" data-action="lesson-next" data-id="${g(e.id)}" data-next="${g(s.id)}">Next: ${g(s.title)}</button>
      <button type="button" class="btn" data-action="lesson-done" data-id="${g(e.id)}">Got it \u2713</button>
    </div>
  </article>`}function Pt(e,t){return`
  <section class="card card--accent">
    <div class="card__head">
      <div>
        <h1>Is this offer safe?</h1>
        <p class="card__hint">Scammers are clever, but they use the same tricks again and again. Check any offer before you pay \u2014 it only takes a minute.</p>
      </div>
    </div>

    <div class="seg" role="group" aria-label="How to check">
      <button type="button" data-action="scam-mode" data-id="questions" aria-pressed="${e==="questions"}">Answer questions</button>
      <button type="button" data-action="scam-mode" data-id="paste" aria-pressed="${e==="paste"}">Paste a message</button>
    </div>

    ${e==="questions"?`<form id="scam-questions-form" class="edu-questions" style="margin-top:var(--space-4)">
            <p class="small muted">Think about the offer and answer honestly.</p>
            <ol>
              ${Z.map(a=>`<li>
                    <span>${g(a.question)}</span>
                    <span class="edu-yn" role="radiogroup" aria-label="${g(a.question)}">
                      <label><input type="radio" name="${g(a.id)}" value="yes"><span>Yes</span></label>
                      <label><input type="radio" name="${g(a.id)}" value="no"><span>No</span></label>
                      <label><input type="radio" name="${g(a.id)}" value="unsure"><span>Not sure</span></label>
                    </span>
                  </li>`).join("")}
            </ol>
            <button class="btn" type="submit">Check this offer</button>
          </form>`:`<form id="scam-text-form" style="margin-top:var(--space-4)">
            <label class="field">
              <span class="field__label">Paste the SMS, WhatsApp or Facebook message</span>
              <textarea class="textarea" name="text" rows="5" placeholder="e.g. Congratulations! Guaranteed 40% profit every month. Only today \u2014 pay a small registration fee to join\u2026">${g(t)}</textarea>
            </label>
            <div class="row" style="margin-top:var(--space-3)">
              <button class="btn" type="submit">Check this message</button>
              <span class="small muted">Checked on your device \u2014 nothing is saved or sent.</span>
            </div>
          </form>`}
    <div id="scam-result" aria-live="polite"></div>
  </section>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head"><div class="card__title"><h2>Red flags to watch for</h2></div></div>
    <div class="edu-flags">
      ${Z.map(a=>`<details class="edu-flag">
            <summary><span aria-hidden="true">${g(a.icon)}</span><strong>${g(a.title)}</strong></summary>
            <p class="edu-flag__quote">${g(a.whatItSounds)}</p>
            <p class="small"><strong>Why it\u2019s risky:</strong> ${g(a.whyRisky)}</p>
            <p class="small edu-flag__do">\u{1F497} ${g(a.whatToDo)}</p>
          </details>`).join("")}
    </div>
  </section>

  <section class="card edu-rules" style="margin-top:var(--space-4)">
    <h2>Golden rules</h2>
    <ul>
      <li>Never share your PIN or OTP code with anyone.</li>
      <li>If it sounds too good to be true, it is.</li>
      <li>Take your time \u2014 a real offer can wait a day.</li>
      <li>Talk it over with someone you trust before paying.</li>
    </ul>
  </section>`}function nt(e,t=0){let a=e.level==="high"?"high":e.level==="medium"?"warn":"good",s=e.level==="low"?"\u2713":"!";return`<div class="flag flag--${a} edu-result">
    <span class="flag__icon" aria-hidden="true">${s}</span>
    <div>
      <div class="flag__title">${g(e.headline)}</div>
      <div class="flag__text">${g(e.advice)}</div>
      ${t?`<p class="small muted" style="margin:var(--space-2) 0 0">You weren\u2019t sure about ${t} question${t>1?"s":""}. When in doubt, ask them to explain \u2014 a real business won\u2019t mind.</p>`:""}
      ${e.matched.length?`<ul class="edu-result__list">${e.matched.map(n=>`<li><strong>${g(n.title)}</strong>${n.evidence.length?` <span class="badge badge--muted">found: ${n.evidence.map(o=>`\u201C${g(o)}\u201D`).join(", ")}</span>`:""}<br><span class="small muted">${g(n.whatToDo)}</span></li>`).join("")}</ul>`:""}
    </div>
  </div>`}var Nt="honchoy.v1.data",jt="honchoy.v1.options",Ht="honchoy.v1.lessonsRead",Wt=["USD","EUR","GBP","MNT","INR","KES","NGN","PHP","VND","IDR","BRL","JPY"],Ut=[{id:"dashboard",label:"Dashboard",icon:"\u25C9"},{id:"insights",label:"Insights",icon:"\u2661"},{id:"expenses",label:"Expenses",icon:"\u25A4"},{id:"debts",label:"Debts",icon:"\u26D3"},{id:"budget",label:"Budget",icon:"\u25EB"},{id:"goals",label:"Goals",icon:"\u2605"},{id:"log",label:"Spending log",icon:"\u270E"},{id:"learn",label:"Learn",icon:"\u2726"},{id:"safety",label:"Safety",icon:"\u26E8"},{id:"data",label:"Data",icon:"\u21C5"}],p={},he=!0,z={read:new Set,scamMode:"questions",scamText:""};function Ma(){try{let e=localStorage.getItem(Ht),t=e?JSON.parse(e):[];Array.isArray(t)&&(z.read=new Set(t.filter(a=>typeof a=="string")))}catch{z.read=new Set}}function Rt(e){if(Y.some(t=>t.id===e)){z.read.add(e);try{localStorage.setItem(Ht,JSON.stringify([...z.read]))}catch{}}}function Lt(e){let t=Y.find(a=>a.id===e);t&&qt(t.title,Et(t,d))}function r(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}var b=(e,t=document)=>t.querySelector(e);function me(e="x"){let t=typeof crypto<"u"&&"randomUUID"in crypto?crypto.randomUUID().slice(0,8):Math.random().toString(36).slice(2,10);return`${e}${t}`}function Je(){let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function d(e){return k(e,p.data?.user.currency||"USD")}function w(e,t=0){return`${(Number.isFinite(e)?e*100:0).toFixed(t)}%`}function Q(e){if(!e)return"\u2014";let[t,a]=e.split("-").map(Number);return!t||!a?e:new Date(Date.UTC(t,a-1,1)).toLocaleDateString("en-US",{month:"short",year:"numeric",timeZone:"UTC"})}function de(e){if(e===null)return"never";if(e===0)return"done";let t=Math.floor(e/12),a=e%12;return t===0?`${a} mo`:a===0?`${t} yr`:`${t} yr ${a} mo`}function O(e,t,a={}){let s=a.id??`f-${t}-${Math.random().toString(36).slice(2,7)}`;return`<div class="field">
    <label for="${s}">${r(e)}</label>
    <input class="input${a.type==="number"?" input--amount":""}" id="${s}" name="${r(t)}"
      type="${a.type??"text"}"
      ${a.value!==void 0?`value="${r(a.value)}"`:""}
      ${a.step?`step="${a.step}"`:""}
      ${a.min?`min="${a.min}"`:""}
      ${a.placeholder?`placeholder="${r(a.placeholder)}"`:""}
      ${a.required?"required":""}>
    ${a.hint?`<span class="hint">${r(a.hint)}</span>`:""}
  </div>`}function Ie(e,t,a,s,n){let o=`f-${t}-${Math.random().toString(36).slice(2,7)}`;return`<div class="field">
    <label for="${o}">${r(e)}</label>
    <select class="select" id="${o}" name="${r(t)}">
      ${a.map(l=>`<option value="${r(l.value)}"${l.value===s?" selected":""}>${r(l.label)}</option>`).join("")}
    </select>
    ${n?`<span class="hint">${r(n)}</span>`:""}
  </div>`}var Ft;function $(e){let t=b("#toast");t&&(t.textContent=e,t.hidden=!1,window.clearTimeout(Ft),Ft=window.setTimeout(()=>{t.hidden=!0},2600))}function qt(e,t){let a=b("#modal");a&&(b("#modal-title").textContent=e,b("#modal-body").innerHTML=t,a.open||a.showModal())}function Te(){let e=b("#modal");e?.open&&e.close()}function ka(e,t,a="application/json"){let s=URL.createObjectURL(new Blob([t],{type:a})),n=document.createElement("a");n.href=s,n.download=e,document.body.appendChild(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(s),1500)}async function Ct(e){try{return await navigator.clipboard.writeText(e),!0}catch{return!1}}function Sa(){let e=JSON.parse(JSON.stringify(at)),t={...xe},a=new URLSearchParams(location.search).get("d");if(a)try{e=Me(JSON.parse(decodeURIComponent(a))),history.replaceState(null,"",location.pathname+location.hash),$("Loaded the shared plan.")}catch{$("That share link could not be read \u2014 using your saved data.")}else try{let s=localStorage.getItem(Nt);s&&(e=Me(JSON.parse(s)));let n=localStorage.getItem(jt);n&&(t={...t,...JSON.parse(n)})}catch{he=!1}return{data:Ye(e),options:t}}function Ta(){if(!(!he||!p.data))try{localStorage.setItem(Nt,JSON.stringify(p.data)),localStorage.setItem(jt,JSON.stringify(p.options))}catch{he=!1;let e=b("#storage-banner");e&&(e.hidden=!1)}}function Ye(e){return e.expenses=e.expenses.map((t,a)=>({...t,id:t.id||`e${a+1}-${me("")}`})),e.debts=e.debts.map((t,a)=>({...t,id:t.id||`d${a+1}-${me("")}`})),e.goals=e.goals.map((t,a)=>({...t,id:t.id||`g${a+1}-${me("")}`})),e}function A(){p.analysis=We({data:p.data,options:p.options}),Ta(),pe()}var X=()=>p.analysis;function S(e,t,a,s){return`<article class="stat">
    <span class="stat__label">${r(e)}</span>
    <span class="stat__value${s?` stat__value--${s}`:""}">${r(t)}</span>
    ${a?`<span class="stat__meta">${a}</span>`:""}
  </article>`}function ze(e,t,a,s="pink",n){let o=a>0?Math.min(100,t/a*100):0;return`<div class="bar-row">
    <span class="bar-row__label" title="${r(e)}">${r(e)}</span>
    <span class="bar"><span class="bar__fill bar__fill--${s}" style="width:${o.toFixed(1)}%"></span></span>
    <span class="bar-row__value">${r(n??d(t))}</span>
  </div>`}var Ia={high:"!",warn:"!",info:"i",good:"\u2713"};function Bt(e){if(e.length===0)return'<p class="muted small">No warnings \u2014 nothing stands out.</p>';let t=["high","warn","info","good"];return`<ul class="flags">
    ${[...e].sort((s,n)=>t.indexOf(s.severity)-t.indexOf(n.severity)).map(s=>`<li class="flag flag--${s.severity}">
          <span class="flag__icon" aria-hidden="true">${Ia[s.severity]}</span>
          <div>
            <div class="flag__title">${r(s.title)}</div>
            <div class="flag__text">${r(s.message)}</div>
          </div>
        </li>`).join("")}
  </ul>`}function De(e,t,a){return`<div class="empty">
    <div class="empty__title">${r(e)}</div>
    <p class="small">${r(t)}</p>
    ${a??""}
  </div>`}var Da={strong:"Strong",okay:"Okay",stretched:"Stretched",at_risk:"At risk"};function Aa(){let e=X(),t=e.budget,a=e.debts,s=e.health.score>=80?"var(--good)":e.health.score>=60?"var(--pink-500)":e.health.score>=40?"var(--warn)":"var(--danger)";return`
  <section class="card card--accent">
    <div class="card__head">
      <div>
        <h1>Your month at a glance</h1>
        <p class="card__hint">
          Everything below is calculated from your income, expenses and debt. Change anything on the
          other tabs and these numbers update immediately.
        </p>
      </div>
      <span class="badge badge--${e.health.score>=80?"good":e.health.score>=60?"muted":e.health.score>=40?"warn":"danger"}">
        ${Da[e.health.band]}
      </span>
    </div>

    <div class="dial">
      <div class="dial__ring" style="--pct:${e.health.score};--ring:${s}" role="img"
           aria-label="Financial health score ${e.health.score} out of 100">
        <div class="dial__inner">
          <span class="dial__score">${e.health.score}</span>
          <span class="dial__caption">health</span>
        </div>
      </div>
      <div style="flex:1;min-width:220px">
        <div class="grid grid--2">
          ${S("Monthly income",d(e.income.monthly),`${r(String(e.income.type))} basis`)}
          ${S("Living expenses",d(e.expenses.total),`${w(e.expenses.incomeShare)} of income`)}
          ${S("Disposable income",d(t.disposableIncome),"income \u2212 expenses",t.disposableIncome<0?"danger":void 0)}
          ${S("Debt carve-out",d(t.debtCarveOut),`${w(a.dti)} of income (DTI)`,a.dti>xe.dtiMax?"danger":void 0)}
        </div>
      </div>
    </div>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${S("Left to allocate",d(t.remainder),`${w(t.remainderShare)} of income`)}
    ${S("Emergency fund",`${Math.round(t.emergencyFund.fundedRatio*100)}%`,t.emergencyFund.fullyFunded?`funded \xB7 ${t.emergencyFund.monthsCovered} mo cover`:`${d(t.emergencyFund.gap)} to go`)}
    ${S("Debt-free",a.count===0?"\u2014":Q(a.plan.debtFreeMonth),a.count===0?"no debts recorded":a.plan.months===null?"payment too small to clear":`${de(a.plan.months)} away`)}
    ${S("Flexible allowance",d(t.flexibleAllocation),`${d(u(t.flexibleAllocation/30))} a day`)}
  </div>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <div class="stack">
      <section class="card">
        <div class="card__head"><div class="card__title"><h2>What needs attention</h2></div></div>
        ${Bt(e.flags)}
      </section>

      <section class="card">
        <div class="card__head">
          <div class="card__title"><h2>What to do next</h2></div>
        </div>
        ${e.recommendations.length===0?'<p class="muted small">Nothing to act on. Add income, expenses and debt to get a full plan.</p>':`<ol class="recos">${e.recommendations.map(n=>`<li>${r(n)}</li>`).join("")}</ol>`}
      </section>

      <section class="card">
        <div class="card__head">
          <div class="card__title"><h2>Debt payoff order</h2></div>
          <span class="badge">${a.plan.strategy==="avalanche"?"Highest rate first":"Smallest balance first"}</span>
        </div>
        ${a.count===0?De("No debts recorded","Add your loans and credit purchases on the Debts tab."):`<p class="small muted">
            Simulating ${d(a.plan.monthlyPool)} a month across your ${a.count} debt${a.count===1?"":"s"}:
            <strong>${a.plan.months===null?"the balance never clears":`${de(a.plan.months)} to go`}</strong>,
            ${d(a.plan.totalInterest)} total interest
            ${a.plan.debtFreeMonth?`\xB7 debt-free ${Q(a.plan.debtFreeMonth)}`:""}.
          </p>
          <ol class="timeline">
            ${a.plan.payoffOrder.map((n,o)=>`<li>
                  <span class="timeline__idx">${o+1}</span>
                  <div class="timeline__body">
                    <div class="timeline__title">${r(n.name)}</div>
                    <div class="timeline__meta">cleared in month ${n.month} \xB7 ${Q(a.plan.debtFreeMonth?Ea(a.plan.debtFreeMonth,-(a.plan.months-n.month)):null)}</div>
                  </div>
                </li>`).join("")}
          </ol>`}
      </section>
    </div>

    <div class="stack">
      <section class="card">
        <div class="card__head"><div class="card__title"><h2>Where the money goes</h2></div></div>
        ${Gt(t)}
      </section>

      <section class="card">
        <div class="card__head">
          <div class="card__title"><h2>Spending pace</h2></div>
          <span class="badge badge--${e.spending.onTrack?"good":"warn"}">
            ${e.spending.onTrack?"On plan":"Over plan"}
          </span>
        </div>
        ${Yt(e)}
      </section>

      ${a.count>0?Pa(e):""}
    </div>
  </div>`}function Ea(e,t){if(!e)return null;let[a,s]=e.split("-").map(Number),n=a*12+(s-1)+t;return`${Math.floor(n/12)}-${String(n%12+1).padStart(2,"0")}`}function Gt(e){let t=e.remainder,a=(s,n,o)=>{let l=t>0?s/t*100:0;return l>0?`<span class="split__seg split__seg--${n}" style="width:${l.toFixed(2)}%"
               title="${r(o)}: ${r(d(s))}"></span>`:""};return`
    <div class="split" role="img" aria-label="How the ${d(t)} remainder is split">
      ${a(e.emergencyAllocation,"deep","Emergency fund")}
      ${a(e.goalsAllocation,"info","Goals")}
      ${a(e.flexibleAllocation,"pink","Flexible spending")}
    </div>
    <ul class="legend">
      <li><span class="legend__dot" style="background:var(--pink-600)"></span> Emergency <strong>${r(d(e.emergencyAllocation))}</strong> <span class="muted">(${w(e.allocations[0].weight)})</span></li>
      <li><span class="legend__dot" style="background:#9b8cf0"></span> Goals <strong>${r(d(e.goalsAllocation))}</strong> <span class="muted">(${w(e.allocations[1].weight)})</span></li>
      <li><span class="legend__dot" style="background:var(--pink-400)"></span> Flexible <strong>${r(d(e.flexibleAllocation))}</strong> <span class="muted">(${w(e.allocations[2].weight)})</span></li>
    </ul>
    <p class="small muted" style="margin-top:var(--space-3)">
      The emergency fund takes the largest share until it is fully funded, then drops to a
      maintenance top-up and the freed money moves to goals and spending.
    </p>`}function Yt(e){let t=e.spending;if(t.entries===0)return`<p class="small muted">
      No spending logged yet. Add entries on the <a href="#/log">Spending log</a> tab and $honchoy
      will project where the month is heading.
    </p>`;let a=t.allowance>0?Math.min(100,t.projectedMonthTotal/t.allowance*100):0;return`
    ${ze("Projected this month",t.projectedMonthTotal,Math.max(t.allowance,t.projectedMonthTotal,1),t.onTrack?"good":"danger",d(t.projectedMonthTotal))}
    <div class="bar-row">
      <span class="bar-row__label">Allowance used</span>
      <span class="bar"><span class="bar__fill bar__fill--${t.onTrack?"good":"danger"}" style="width:${a.toFixed(1)}%"></span></span>
      <span class="bar-row__value">${w(t.allowance>0?t.projectedMonthTotal/t.allowance:0)}</span>
    </div>
    <dl class="kv" style="margin-top:var(--space-4)">
      <dt>Logged this month</dt><dd>${r(d(t.currentMonthTotal))}</dd>
      <dt>Daily average</dt><dd>${r(d(t.dailyAverage))}</dd>
      <dt>Flexible allowance</dt><dd>${r(d(t.allowance))}</dd>
      <dt>${t.overUnder>=0?"Over plan by":"Under plan by"}</dt>
      <dd style="color:${t.overUnder>=0?"var(--danger)":"var(--good)"}">${r(d(Math.abs(t.overUnder)))}</dd>
    </dl>`}function Pa(e){let t=e.debts.items.find(a=>a.severity)??e.debts.items[0];return t?`<section class="card">
    <div class="card__head">
      <div class="card__title"><h2>Most expensive debt</h2></div>
      ${t.severity?`<span class="badge badge--${t.severity==="high"?"danger":"warn"}">${t.interestRate}% APR</span>`:""}
    </div>
    <p style="font-weight:650;margin-bottom:2px">${r(t.name)}</p>
    <p class="small muted">${r(ae(t.type))} \xB7 ${r(d(t.amount))} owed</p>
    <dl class="kv" style="margin-top:var(--space-3)">
      <dt>Interest this month</dt><dd>${r(d(t.monthlyInterest))}</dd>
      <dt>Minimum payment</dt><dd>${r(d(t.minMonthlyPayment))}</dd>
      <dt>Cleared by</dt><dd>${r(Q(t.payoff.payoffMonth))}</dd>
    </dl>
    ${t.note?`<p class="debt__note">${r(t.note)}</p>`:""}
  </section>`:""}function Ra(){let t=X().expenses,a=[...p.data.expenses].sort((o,l)=>l.amount-o.amount),s=t.byCategory[0]?.amount??0,n=a[0]?.amount??0;return`
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Expenses</h1>
        <p class="card__hint">
          Tag each cost as <strong>fixed</strong> (committed every month) or <strong>variable</strong>
          (moves around). The split tells you how much room you actually have to cut.
        </p>
      </div>
    </div>

    <form class="form-grid" id="expense-form" data-mode="create" data-id="" autocomplete="off">
      ${O("What is it?","name",{placeholder:"House rent",required:!0})}
      ${Ie("Category","category",_t.map(o=>({value:o,label:o[0].toUpperCase()+o.slice(1)})),"rent")}
      ${O("Amount","amount",{type:"number",step:"0.01",min:"0",placeholder:"6000",required:!0,hint:"per month"})}
      ${Ie("Type","type",[{value:"fixed",label:"Fixed \u2014 same every month"},{value:"variable",label:"Variable \u2014 moves month to month"}],"fixed")}
      <div class="row span-all">
        <button class="btn" type="submit" id="expense-submit">Add expense</button>
        <button class="btn btn--subtle" type="button" data-action="expense-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${S("Total monthly",d(t.total),`${t.count} item${t.count===1?"":"s"}`)}
    ${S("Fixed",d(t.fixed),`${w(t.fixedShare)} of spending`)}
    ${S("Variable",d(t.variable),`${w(t.variableShare)} of spending`)}
    ${S("Share of income",w(t.incomeShare),"expenses \xF7 income",t.incomeShare>.8?"danger":void 0)}
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Fixed vs variable</h2></div>
      <span class="badge badge--${t.variableShare>=.3?"good":"warn"}">
        ${t.variableShare>=.3?"You have room to adjust":"Little room to adjust"}
      </span>
    </div>
    <div class="split" role="img" aria-label="Fixed ${w(t.fixedShare)} versus variable ${w(t.variableShare)}">
      <span class="split__seg split__seg--deep" style="width:${(t.fixedShare*100).toFixed(1)}%"></span>
      <span class="split__seg split__seg--muted" style="width:${(t.variableShare*100).toFixed(1)}%"></span>
    </div>
    <ul class="legend">
      <li><span class="legend__dot" style="background:var(--pink-600)"></span> Fixed <strong>${r(d(t.fixed))}</strong></li>
      <li><span class="legend__dot" style="background:var(--pink-200)"></span> Variable <strong>${r(d(t.variable))}</strong></li>
    </ul>
  </section>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>All expenses</h2></div>
        <span class="muted small">${a.length} item${a.length===1?"":"s"}</span>
      </div>
      ${a.length===0?De("Nothing added yet","Add your first expense above \u2014 rent is usually the biggest fixed cost."):`<ul class="items">
        ${a.map(o=>`<li>
            <div class="items__main">
              <span class="cell-title">${r(o.name)}</span>
              <span class="cell-sub">
                ${r(o.category)} \xB7
                <span class="badge badge--${o.type==="fixed"?"muted":"good"}">${r(o.type)}</span>
              </span>
            </div>
            <div class="items__side">
              <strong class="tabnum">${r(d(o.amount))}</strong>
              <button class="icon-action" data-action="expense-edit" data-id="${r(o.id)}">Edit</button>
              <button class="icon-action icon-action--danger" data-action="expense-delete" data-id="${r(o.id)}">Delete</button>
            </div>
          </li>`).join("")}
      </ul>`}
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>By category</h2></div></div>
      ${t.byCategory.length===0?'<p class="muted small">No categories yet.</p>':t.byCategory.map(o=>ze(`${o.category} (${o.count})`,o.amount,s,o.type==="fixed"?"deep":"pink",d(o.amount))).join("")}
    </section>
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head"><div class="card__title"><h2>Biggest line items</h2></div></div>
    ${a.length===0?'<p class="muted small">Add expenses to see the ranking.</p>':a.slice(0,5).map(o=>ze(o.name,o.amount,n,"deep",d(o.amount))).join("")}
  </section>`}function Ot(e){return e>p.options.dtiMax?"danger":e>p.options.dtiWatch?"warn":"good"}function La(){let e=X(),t=e.debts,a=p.options,s=Math.max(.6,t.dti*1.15,a.dtiMax*1.2);return`
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Debt overview</h1>
        <p class="card__hint">
          Add every loan you carry \u2014 bank, microfinance, informal/family and shop credit. $honchoy
          checks how much of your income goes to debt, whether any rate is unusually expensive, and
          how long each balance takes to clear.
        </p>
      </div>
    </div>

    <form class="form-grid" id="debt-form" data-mode="create" data-id="" autocomplete="off">
      ${Ie("Type","type",Object.entries(wt).map(([n,o])=>({value:n,label:o})),"microloan")}
      ${O("Label (optional)","name",{placeholder:"MFI working-capital loan"})}
      ${O("Amount owed","amount",{type:"number",step:"0.01",min:"0",placeholder:"5000",required:!0})}
      ${O("Interest rate","interestRate",{type:"number",step:"0.1",min:"0",placeholder:"20",hint:"% per year",required:!0})}
      ${O("Minimum monthly payment","minMonthlyPayment",{type:"number",step:"0.01",min:"0",placeholder:"500",required:!0})}
      <div class="row span-all">
        <button class="btn" type="submit" id="debt-submit">Add debt</button>
        <button class="btn btn--subtle" type="button" data-action="debt-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${S("Total owed",d(t.totalOwed),`${t.count} debt${t.count===1?"":"s"}`,"pink")}
    ${S("Minimums / month",d(t.totalMinMonthlyPayment),`${w(t.dti)} of income`)}
    ${S("Weighted avg rate",`${t.weightedAverageRate}%`,`highest ${t.highestRate}%`)}
    ${S("Interest / month",d(t.monthlyInterestCost),`${d(u(t.monthlyInterestCost*12))} a year`,"danger")}
  </div>

  <div class="grid grid--2" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Debt-to-income check</h2></div>
        <span class="badge badge--${Ot(t.dti)}">${w(t.dti)} of income</span>
      </div>
      <div class="bar-row">
        <span class="bar-row__label">Debt payments</span>
        <span class="bar">
          <span class="bar__fill bar__fill--${Ot(t.dti)}" style="width:${Math.min(100,t.dti/s*100).toFixed(1)}%"></span>
        </span>
        <span class="bar-row__value">${w(t.dti)}</span>
      </div>
      <ul class="legend">
        <li><span class="legend__dot" style="background:var(--good)"></span> under ${w(a.dtiWatch)} \u2014 comfortable</li>
        <li><span class="legend__dot" style="background:var(--warn)"></span> ${w(a.dtiWatch)}\u2013${w(a.dtiMax)} \u2014 watch</li>
        <li><span class="legend__dot" style="background:var(--danger)"></span> over ${w(a.dtiMax)} \u2014 over-indebted</li>
      </ul>
      <dl class="kv" style="margin-top:var(--space-4)">
        <dt>Monthly income</dt><dd>${r(d(e.income.monthly))}</dd>
        <dt>Debt payments</dt><dd>${r(d(t.totalMinMonthlyPayment))}</dd>
        <dt>Money left after living costs</dt><dd>${r(d(e.budget.disposableIncome))}</dd>
        <dt>Headroom for debt</dt>
        <dd style="color:${e.budget.disposableIncome-t.totalMinMonthlyPayment>=0?"var(--good)":"var(--danger)"}">
          ${r(d(u(e.budget.disposableIncome-t.totalMinMonthlyPayment)))}
        </dd>
      </dl>
    </section>

    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Payoff plan</h2></div>
        <div class="seg" role="group" aria-label="Payoff strategy">
          <button type="button" data-action="strategy" data-value="avalanche" aria-pressed="${a.strategy==="avalanche"}">Highest rate</button>
          <button type="button" data-action="strategy" data-value="snowball" aria-pressed="${a.strategy==="snowball"}">Smallest balance</button>
        </div>
      </div>

      <div class="field">
        <label for="extra-payment">Extra payment on top of minimums</label>
        <input class="range" type="range" id="extra-payment" min="0" max="${Math.max(2e3,Math.round(t.totalMinMonthlyPayment*2))}" step="50"
               value="${a.extraDebtPayment}" data-action="extra-payment">
        <div class="row row--between">
          <span class="hint">Total to debt: <strong id="extra-total">${r(d(t.plan.monthlyPool))}</strong> / month</span>
          <strong id="extra-value">${r(d(a.extraDebtPayment))} extra</strong>
        </div>
      </div>

      <hr class="divider">

      ${t.count===0?'<p class="muted small">Add a debt to see a payoff timeline.</p>':t.plan.underfunded?`<p class="debt__note">Your monthly pool of ${r(d(t.plan.monthlyPool))} is below the ${r(d(t.totalMinMonthlyPayment))} in minimum payments, so the balances cannot be cleared. Increase the amount or renegotiate the payments.</p>`:`<dl class="kv">
            <dt>Monthly pool</dt><dd>${r(d(t.plan.monthlyPool))}</dd>
            <dt>Time to clear everything</dt><dd>${r(de(t.plan.months))}</dd>
            <dt>Debt-free</dt><dd>${r(Q(t.plan.debtFreeMonth))}</dd>
            <dt>Total interest</dt><dd>${r(d(t.plan.totalInterest))}</dd>
            <dt>Total paid</dt><dd>${r(d(t.plan.totalPaid))}</dd>
          </dl>
          <p class="small muted" style="margin-top:var(--space-3)">
            ${t.plan.alternate.months===null?"The other strategy never clears under this payment.":`Choosing ${t.plan.alternate.strategy==="avalanche"?"highest rate":"smallest balance"} first instead would take
                   ${r(de(t.plan.alternate.months))} and cost ${r(d(t.plan.alternate.totalInterest))} in interest
                   (${t.plan.alternate.totalInterest<=t.plan.totalInterest?"cheaper":`${r(d(u(t.plan.alternate.totalInterest-t.plan.totalInterest)))} more`}).`}
          </p>`}
    </section>
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Warnings</h2></div>
    </div>
    ${Bt(e.flags.filter(n=>n.code.startsWith("dti_")||n.code.startsWith("interest_")||n.code==="negative_amortization"||n.code==="debt_shortfall"))}
  </section>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Your debts</h2></div>
      ${t.hasNegativeAmortization?'<span class="badge badge--danger">A minimum payment is not covering interest</span>':""}
    </div>
    ${t.items.length===0?De("No debts recorded","Add a loan above \u2014 even an informal family loan should be listed so the plan is realistic."):`<div class="grid grid--2">${t.items.map(Fa).join("")}</div>`}
  </section>

  ${t.byType.length>0?`<section class="card" style="margin-top:var(--space-4)">
      <div class="card__head"><div class="card__title"><h2>By lending channel</h2></div></div>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr><th>Type</th><th class="num">Debts</th><th class="num">Owed</th><th class="num">Minimums</th><th class="num">Avg rate</th><th class="num">Share of debt</th></tr>
          </thead>
          <tbody>
            ${t.byType.map(n=>`<tr>
                <td><span class="cell-title">${r(ae(n.type))}</span></td>
                <td class="num">${n.count}</td>
                <td class="num">${r(d(n.amount))}</td>
                <td class="num">${r(d(n.minMonthlyPayment))}</td>
                <td class="num">${n.averageRate}%</td>
                <td class="num">${w(t.totalOwed>0?n.amount/t.totalOwed:0)}</td>
              </tr>`).join("")}
          </tbody>
          <tfoot>
            <tr><td>Total</td><td class="num">${t.count}</td><td class="num">${r(d(t.totalOwed))}</td>
            <td class="num">${r(d(t.totalMinMonthlyPayment))}</td><td class="num">${t.weightedAverageRate}%</td><td class="num">100%</td></tr>
          </tfoot>
        </table>
      </div>
    </section>`:""}`}function Fa(e){let t=e.severity==="high"?"debt debt--high":e.severity==="warn"?"debt debt--warn":"debt",a=e.payoff.months===null?"danger":e.payoff.months>60?"warn":"good";return`<article class="${t}">
    <div class="debt__top">
      <div>
        <div class="debt__name">${r(e.name)}</div>
        <span class="cell-sub">${r(ae(e.type))}</span>
      </div>
      <div style="text-align:right">
        <div class="debt__amount">${r(d(e.amount))}</div>
        <span class="badge badge--${a==="danger"?"danger":a==="warn"?"warn":"muted"}">${e.interestRate}% a year</span>
      </div>
    </div>

    <div class="debt__facts">
      <div class="fact">
        <span class="fact__label">Minimum</span>
        <span class="fact__value">${r(d(e.minMonthlyPayment))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Interest / month</span>
        <span class="fact__value">${r(d(e.monthlyInterest))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Goes to principal</span>
        <span class="fact__value">${w(e.principalShare)}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Cleared by</span>
        <span class="fact__value">${r(Q(e.payoff.payoffMonth))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Time to clear</span>
        <span class="fact__value">${r(de(e.payoff.months))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Total interest</span>
        <span class="fact__value">${r(d(e.payoff.totalInterest))}</span>
      </div>
    </div>

    <div class="bar-row" style="margin-top:var(--space-3)">
      <span class="bar-row__label">Repayment progress</span>
      <span class="bar"><span class="bar__fill bar__fill--${e.negativeAmortization?"danger":"pink"}" style="width:${(e.principalShare*100).toFixed(1)}%"></span></span>
      <span class="bar-row__value">${w(e.principalShare)}</span>
    </div>

    ${e.note?`<p class="debt__note">${r(e.note)}</p>`:""}

    <div class="row row--end" style="margin-top:var(--space-3)">
      <button class="icon-action" data-action="debt-edit" data-id="${r(e.id)}">Edit</button>
      <button class="icon-action icon-action--danger" data-action="debt-delete" data-id="${r(e.id)}">Delete</button>
    </div>
  </article>`}function Ca(){let e=X(),t=e.budget,a=p.options,s=t.emergencyFund;return`
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Automatic budget plan</h1>
        <p class="card__hint">
          Built from your income, expenses and debt. First the debt is carved out, then whatever is
          left is split between the emergency fund, your goals and flexible spending \u2014 weighted
          toward the emergency fund until it is fully funded.
        </p>
      </div>
      <span class="badge badge--${t.remainder>0?"good":"danger"}">
        ${t.remainder>0?`${d(t.remainder)} to allocate`:"Nothing left to allocate"}
      </span>
    </div>

    <div class="flow">
      <div class="flow__step">
        <span class="flow__label">Monthly income<span class="flow__note">${r(Oa(e.income.type))}${e.income.sources.length?` \xB7 ${e.income.sources.length} source${e.income.sources.length===1?"":"s"}`:""}</span></span>
        <span class="flow__value">${r(d(t.monthlyIncome))}</span>
      </div>
      <div class="flow__step flow__step--minus">
        <span class="flow__label">\u2212 Living expenses<span class="flow__note">fixed ${r(d(t.totalFixedExpenses))} + variable ${r(d(t.totalVariableExpenses))}</span></span>
        <span class="flow__value">\u2212${r(d(t.totalExpenses))}</span>
      </div>
      <div class="flow__step flow__step--total">
        <span class="flow__label">= Disposable income<span class="flow__note">what is left before any debt payment</span></span>
        <span class="flow__value" style="color:${t.disposableIncome<0?"var(--danger)":"inherit"}">${r(d(t.disposableIncome))}</span>
      </div>
      <div class="flow__step flow__step--minus">
        <span class="flow__label">\u2212 Debt carve-out<span class="flow__note">minimums ${r(d(t.totalMinDebtPayments))}${a.extraDebtPayment>0?` + extra ${r(d(a.extraDebtPayment))}`:""}</span></span>
        <span class="flow__value">\u2212${r(d(t.debtCarveOut))}</span>
      </div>
      ${t.debtShortfall>0?`<div class="flow__step flow__step--minus">
              <span class="flow__label">Shortfall<span class="flow__note">your income cannot cover the debt payments \u2014 this has to be solved first</span></span>
              <span class="flow__value" style="color:var(--danger)">${r(d(t.debtShortfall))}</span>
            </div>`:""}
      <div class="flow__step flow__step--final">
        <span class="flow__label">Remainder to allocate<span class="flow__note">${w(t.remainderShare)} of income</span></span>
        <span class="flow__value">${r(d(t.remainder))}</span>
      </div>
    </div>

    <hr class="divider">

    <div class="grid grid--3">
      ${st("Emergency fund",t.emergencyAllocation,t.allocations[0].weight,t.allocations[0].rationale,"deep")}
      ${st("Goals",t.goalsAllocation,t.allocations[1].weight,t.allocations[1].rationale,"info")}
      ${st("Flexible spending",t.flexibleAllocation,t.allocations[2].weight,t.allocations[2].rationale,"pink")}
    </div>

    <div style="margin-top:var(--space-4)">
      ${Gt(t)}
    </div>
  </section>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Emergency fund</h2></div>
        <span class="badge badge--${s.fullyFunded?"good":"warn"}">
          ${s.fullyFunded?"Fully funded":`${Math.round(s.fundedRatio*100)}% funded`}
        </span>
      </div>

      <div class="bar-row">
        <span class="bar-row__label">Saved</span>
        <span class="bar"><span class="bar__fill bar__fill--${s.fullyFunded?"good":"deep"}" style="width:${(s.fundedRatio*100).toFixed(1)}%"></span></span>
        <span class="bar-row__value">${r(d(s.saved))} / ${r(d(s.target))}</span>
      </div>

      <dl class="kv" style="margin-top:var(--space-4)">
        <dt>Target</dt><dd>${r(d(s.target))} <span class="muted small">(${a.emergencyMonths} months of costs)</span></dd>
        <dt>Still needed</dt><dd>${r(d(s.gap))}</dd>
        <dt>Months of cover</dt><dd>${s.monthsCovered}</dd>
        <dt>Monthly allocation</dt><dd>${r(d(s.monthlyAllocation))}</dd>
        <dt>Fully funded by</dt><dd>${s.fullyFunded?"already done":r(Q(s.fundedMonth))}</dd>
      </dl>

      ${s.fullyFunded?`<p class="debt__note">The buffer is complete. $honchoy now sends most of the remainder to goals and spending, keeping only ${w(t.allocations[0].weight)} as a top-up.</p>`:`<p class="debt__note">Until the buffer is full it takes ${w(t.allocations[0].weight)} of the remainder \u2014 the largest share. That share shrinks automatically as the balance grows.</p>`}
    </section>

    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Income sources</h2></div>
      </div>
      <form class="form-grid" id="income-form" autocomplete="off">
        ${Ie("Income is stated","type",[{value:"monthly",label:"Per month"},{value:"weekly",label:"Per week"},{value:"biweekly",label:"Every 2 weeks"},{value:"annual",label:"Per year"}],p.data.income.type)}
        ${O("Source name","sourceName",{placeholder:"salary"})}
        ${O("Amount","sourceAmount",{type:"number",step:"0.01",min:"0",placeholder:"20000",hint:"before deductions, as you receive it"})}
        <div class="row span-all">
          <button class="btn btn--sm" type="submit">Add source</button>
        </div>
      </form>

      <hr class="divider">

      ${e.income.sources.length===0?'<p class="muted small">No income recorded yet \u2014 the planner needs at least one source.</p>':`<ul class="items">
          ${e.income.sources.map((n,o)=>`<li>
              <div class="items__main">
                <span class="cell-title">${r(n.name)}</span>
                <span class="cell-sub">${r(d(n.amount))} ${r(p.data.income.type)} \xB7 ${w(n.share)} of income</span>
              </div>
              <div class="items__side">
                <strong class="tabnum">${r(d(n.monthlyAmount))}</strong>
                <button class="icon-action icon-action--danger" data-action="income-delete" data-idx="${o}">Remove</button>
              </div>
            </li>`).join("")}
        </ul>
        <p class="small muted" style="margin-top:var(--space-3)">
          Monthly total: <strong>${r(d(e.income.monthly))}</strong> \xB7 yearly <strong>${r(d(e.income.annual))}</strong>
        </p>`}
    </section>
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Plan settings</h2></div>
      <button class="btn btn--ghost btn--sm" type="button" data-action="options-reset">Reset to defaults</button>
    </div>
    <div class="form-grid">
      <div class="field">
        <label for="opt-extra">Extra debt payment</label>
        <input class="input input--amount" id="opt-extra" type="number" min="0" step="10" value="${a.extraDebtPayment}" data-option="extraDebtPayment">
        <span class="hint">Added on top of the minimum payments each month.</span>
      </div>
      <div class="field">
        <label for="opt-emergency">Emergency fund target</label>
        <input class="input input--amount" id="opt-emergency" type="number" min="1" max="24" step="1" value="${a.emergencyMonths}" data-option="emergencyMonths">
        <span class="hint">Months of living costs to keep as a buffer.</span>
      </div>
      <div class="field">
        <label for="opt-dti-watch">Debt-load warning at</label>
        <input class="input input--amount" id="opt-dti-watch" type="number" min="5" max="60" step="1" value="${Math.round(a.dtiWatch*100)}" data-option="dtiWatchPct">
        <span class="hint">% of income \u2014 default 30%.</span>
      </div>
      <div class="field">
        <label for="opt-dti-max">Debt-load danger at</label>
        <input class="input input--amount" id="opt-dti-max" type="number" min="10" max="80" step="1" value="${Math.round(a.dtiMax*100)}" data-option="dtiMaxPct">
        <span class="hint">% of income \u2014 default 40%.</span>
      </div>
      <div class="field">
        <label for="opt-rate-warn">High interest warning at</label>
        <input class="input input--amount" id="opt-rate-warn" type="number" min="5" max="200" step="1" value="${a.highInterestWarn}" data-option="highInterestWarn">
        <span class="hint">% a year \u2014 default 25%.</span>
      </div>
      <div class="field">
        <label for="opt-rate-danger">High interest danger at</label>
        <input class="input input--amount" id="opt-rate-danger" type="number" min="5" max="300" step="1" value="${a.highInterestDanger}" data-option="highInterestDanger">
        <span class="hint">% a year \u2014 default 40%.</span>
      </div>
    </div>
  </section>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head"><div class="card__title"><h2>Why the split looks like this</h2></div></div>
    <ol class="recos">
      ${e.recommendations.map(n=>`<li>${r(n)}</li>`).join("")||"<li>Add income, expenses and debt to generate a plan.</li>"}
    </ol>
  </section>`}function Oa(e){return{monthly:"monthly",weekly:"weekly",biweekly:"every 2 weeks",annual:"yearly"}[e]}function st(e,t,a,s,n){let o=X(),l=o.budget.remainder>0?t/o.budget.remainder*100:0;return`<article class="stat">
    <span class="stat__label">${r(e)}</span>
    <span class="stat__value stat__value--${n==="pink"?"pink":"good"}">${r(d(t))}</span>
    <div class="bar" style="margin:var(--space-3) 0 var(--space-2)">
      <span class="bar__fill bar__fill--${n==="deep"?"pink":n==="info"?"info":"good"}" style="width:${l.toFixed(1)}%"></span>
    </div>
    <span class="stat__meta">${w(a)} of the remainder \xB7 ${r(s)}</span>
  </article>`}function Na(){let e=X(),t=e.budget,a=p.data.goals.reduce((n,o)=>n+o.cost,0),s=p.data.goals.reduce((n,o)=>n+o.saved,0);return`
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Goals</h1>
        <p class="card__hint">
          Everything you are saving toward. Mark one as the <strong>emergency fund</strong> and the
          planner will drive both its target and its priority weighting from that entry.
        </p>
      </div>
    </div>

    <form class="form-grid" id="goal-form" data-mode="create" data-id="" autocomplete="off">
      ${O("Goal name","name",{placeholder:"Sewing machine",required:!0})}
      ${O("Target cost","cost",{type:"number",step:"0.01",min:"0",placeholder:"15000",required:!0})}
      ${O("Already saved","saved",{type:"number",step:"0.01",min:"0",placeholder:"3000"})}
      ${Ie("Type","type",[{value:"custom",label:"Custom goal"},{value:"emergency_fund",label:"Emergency fund"}],"custom")}
      <div class="row span-all">
        <button class="btn" type="submit" id="goal-submit">Add goal</button>
        <button class="btn btn--subtle" type="button" data-action="goal-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${S("Goals tracked",String(p.data.goals.length),`${d(a)} in total`)}
    ${S("Saved so far",d(s),`${w(a>0?s/a:0)} of all targets`)}
    ${S("Monthly to goals",d(t.goalsAllocation),`+ ${d(t.emergencyAllocation)} to buffer`)}
    ${S("Next finish line",ja(e),"at the current allocation")}
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Saving queue</h2></div>
      <span class="badge">Funded in order</span>
    </div>
    ${e.goals.length===0?De("No goals yet","Add a goal above \u2014 a concrete target makes the monthly allocation easier to keep."):`<div class="stack">${e.goals.map(Ha).join("")}</div>`}
  </section>`}function ja(e){let t=e.goals.find(a=>!a.completed);return t?t.fundedMonth?Q(t.fundedMonth):"\u2014":e.goals.length===0?"\u2014":"all done"}function Ha(e){let t=e.completed?"good":e.type==="emergency_fund"?"deep":"pink";return`<article class="debt">
    <div class="debt__top">
      <div>
        <div class="debt__name">${r(e.name)}</div>
        <span class="cell-sub">
          ${e.type==="emergency_fund"?"Emergency fund":"Custom goal"} \xB7
          ${r(d(e.saved))} of ${r(d(e.cost))}
        </span>
      </div>
      <div style="text-align:right">
        <div class="debt__amount">${w(e.progress)}</div>
        <span class="badge badge--${e.completed?"good":"muted"}">
          ${e.completed?"Funded":e.fundedMonth?r(Q(e.fundedMonth)):"no allocation"}
        </span>
      </div>
    </div>

    <div class="bar-row">
      <span class="bar-row__label">Progress</span>
      <span class="bar"><span class="bar__fill bar__fill--${t==="good"?"good":"pink"}" style="width:${(e.progress*100).toFixed(1)}%"></span></span>
      <span class="bar-row__value">${w(e.progress)}</span>
    </div>

    <div class="debt__facts">
      <div class="fact">
        <span class="fact__label">Still needed</span>
        <span class="fact__value">${r(d(e.remaining))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Time to fund</span>
        <span class="fact__value">${r(de(e.monthsToFund))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Own months</span>
        <span class="fact__value">${r(de(e.ownMonths))}</span>
      </div>
    </div>

    <div class="row row--end" style="margin-top:var(--space-3)">
      <button class="icon-action" data-action="goal-edit" data-id="${r(e.id)}">Edit</button>
      <button class="icon-action icon-action--danger" data-action="goal-delete" data-id="${r(e.id)}">Delete</button>
    </div>
  </article>`}function Wa(){let e=X(),t=e.spending,a=p.data.logs.map((n,o)=>({entry:n,idx:o})).sort((n,o)=>o.entry.date.localeCompare(n.entry.date)),s=a.reduce((n,o)=>Math.max(n,Math.abs(o.entry.amount)),0);return`
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Spending log</h1>
        <p class="card__hint">
          Log what you actually spend. $honchoy compares your run-rate against the flexible-spending
          allowance from the plan, so overspending shows up early instead of at month end.
        </p>
      </div>
      <span class="badge badge--${t.onTrack?"good":"warn"}">${t.onTrack?"On plan":"Above plan"}</span>
    </div>

    <form class="form-grid" id="log-form" data-mode="create" data-idx="" autocomplete="off">
      ${O("Date","date",{type:"date",value:Je(),required:!0})}
      ${O("Amount","amount",{type:"number",step:"0.01",placeholder:"1000",required:!0,hint:"positive = money out, negative = money in"})}
      ${O("Note","note",{placeholder:"Groceries"})}
      <div class="row span-all">
        <button class="btn" type="submit" id="log-submit">Add entry</button>
        <button class="btn btn--subtle" type="button" data-action="log-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${S("Logged this month",d(t.currentMonthTotal),`${t.entries} entr${t.entries===1?"y":"ies"} in total`)}
    ${S("Daily average",d(t.dailyAverage),"trailing 30 days")}
    ${S("Projected month",d(t.projectedMonthTotal),`allowance ${d(t.allowance)}`,t.onTrack?void 0:"danger")}
    ${S(t.overUnder>=0?"Over plan by":"Under plan by",d(Math.abs(t.overUnder)),t.onTrack?"inside the plan":"trim spending or raise income",t.overUnder>=0?"danger":"good")}
  </div>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Entries</h2></div>
        <span class="muted small">${d(t.totalLogged)} logged all time</span>
      </div>
      ${a.length===0?De("Nothing logged yet","Add today\u2019s spending above \u2014 a few days of entries is enough to see a trend."):`<ul class="items">
          ${a.map(({entry:n,idx:o})=>`<li>
              <div class="items__main">
                <span class="cell-title">${r(n.note||"Spending")}</span>
                <span class="cell-sub">${r(n.date)}</span>
              </div>
              <div class="items__side">
                <strong class="tabnum" style="color:${n.amount<0?"var(--good)":"inherit"}">${r(d(n.amount))}</strong>
                <button class="icon-action" data-action="log-edit" data-idx="${o}">Edit</button>
                <button class="icon-action icon-action--danger" data-action="log-delete" data-idx="${o}">Delete</button>
              </div>
            </li>`).join("")}
        </ul>`}
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>Pace</h2></div></div>
      ${Yt(e)}
      <hr class="divider">
      <div class="card__title"><h3>Largest entries</h3></div>
      <div style="margin-top:var(--space-3)">
        ${a.length===0?'<p class="muted small">No entries yet.</p>':a.map(({entry:n})=>n).sort((n,o)=>o.amount-n.amount).slice(0,6).map(n=>ze(n.note||n.date,Math.abs(n.amount),s||1,"deep",d(n.amount))).join("")}
      </div>
    </section>
  </div>`}function Ua(){let e=X(),t=JSON.stringify(p.data,null,2);return`
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Data &amp; settings</h1>
        <p class="card__hint">
          Your plan lives in this browser only \u2014 nothing is uploaded anywhere. Export a JSON copy to
          back it up or move it to another device, and import it back any time.
        </p>
      </div>
      <span class="badge badge--${he?"good":"warn"}">
        ${he?"Saved on this device":"Local storage unavailable"}
      </span>
    </div>

    <div class="grid grid--4">
      <div class="field">
        <label for="data-currency">Currency</label>
        <select class="select" id="data-currency" data-option="currency">
          ${Wt.map(a=>`<option value="${a}"${p.data.user.currency===a?" selected":""}>${a}</option>`).join("")}
        </select>
        <span class="hint">Used for every amount shown.</span>
      </div>
      <div class="field">
        <label for="data-language">Language</label>
        <select class="select" id="data-language" data-option="language">
          <option value="en"${p.data.user.language==="en"?" selected":""}>English</option>
          <option value="mn"${p.data.user.language==="mn"?" selected":""}>\u041C\u043E\u043D\u0433\u043E\u043B</option>
        </select>
        <span class="hint">Stored with your data for future use.</span>
      </div>
      <div class="field">
        <span class="field__label">Age confirmation</span>
        <label class="row" style="gap:8px">
          <input type="checkbox" data-option="ageConfirmed"${p.data.user.ageConfirmed?" checked":""}>
          <span class="small">I am old enough to manage my own finances</span>
        </label>
        <span class="hint">Required before debt tools are used.</span>
      </div>
      <div class="field">
        <span class="field__label">Plan snapshot</span>
        <ul class="small muted" style="margin:0;padding-left:18px">
          <li>${p.data.expenses.length} expenses</li>
          <li>${p.data.debts.length} debts</li>
          <li>${p.data.goals.length} goals</li>
          <li>${p.data.logs.length} log entries</li>
        </ul>
      </div>
    </div>

    <hr class="divider">

    <div class="row">
      <button class="btn" type="button" data-action="export-download">Download JSON</button>
      <button class="btn btn--ghost" type="button" data-action="export-copy">Copy JSON</button>
      <button class="btn btn--ghost" type="button" data-action="share-link">Copy share link</button>
      <button class="btn btn--ghost" type="button" data-action="import-open">Import JSON</button>
      <button class="btn btn--ghost" type="button" data-action="load-sample">Load sample data</button>
      <button class="btn btn--subtle" type="button" data-action="wipe">Clear everything</button>
    </div>
  </section>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Your data shape</h2></div>
        <span class="badge">Read-only</span>
      </div>
      <p class="small muted">
        This is the exact object $honchoy stores and calculates from. Copy it to script a
        calculation via <code class="mono">POST /api/calculate</code>.
      </p>
      <textarea class="textarea" id="data-json" readonly rows="18" aria-label="Current data as JSON">${r(t)}</textarea>
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>About $honchoy</h2></div></div>
      <p class="small">
        Version 1.0.0 \xB7 engine <code class="mono">computeFinancials()</code>, generated
        ${r(new Date(e.generatedAt).toLocaleString())}.
      </p>
      <dl class="kv">
        <dt>Income</dt><dd>${r(d(e.income.monthly))} / month</dd>
        <dt>Expenses</dt><dd>${r(d(e.expenses.total))} / month</dd>
        <dt>Debt owed</dt><dd>${r(d(e.debts.totalOwed))}</dd>
        <dt>Remainder</dt><dd>${r(d(e.budget.remainder))} / month</dd>
      </dl>
      <hr class="divider">
      <p class="small muted">
        $honchoy is an educational planning tool. It is not a lender, not a licensed adviser and not
        a substitute for reading your own loan contracts.
      </p>
    </section>
  </div>`}function qa(){let e=b("#nav");if(!e)return;e.innerHTML=Ut.map(a=>`<a href="#/${a.id}"${p.route===a.id?' aria-current="page"':""}>
        <span aria-hidden="true">${a.icon}</span>${r(a.label)}
      </a>`).join(""),e.querySelector('[aria-current="page"]')?.scrollIntoView?.({block:"nearest",inline:"nearest"})}function Ba(){let e=b("#currency-select");e&&(e.options.length===0&&(e.innerHTML=Wt.map(t=>`<option value="${t}">${t}</option>`).join("")),e.value=p.data.user.currency||"USD")}function pe(){let e=b("#app");if(!e)return;qa(),Ba();let t={dashboard:Aa,expenses:Ra,debts:La,budget:Ca,goals:Na,log:Wa,data:Ua,insights:()=>Dt(X(),d),learn:()=>At(z.read,d),safety:()=>Pt(z.scamMode,z.scamText)};e.innerHTML=t[p.route]()}function ot(e){return p.data.expenses.find(t=>t.id===e)}function it(e){return p.data.debts.find(t=>t.id===e)}function zt(){let e=b("#expense-form");if(!e)return;e.reset(),e.dataset.mode="create",e.dataset.id="";let t=b("#expense-submit");t&&(t.textContent="Add expense");let a=b('[data-action="expense-cancel"]');a&&(a.hidden=!0)}function Jt(){let e=b("#debt-form");if(!e)return;e.reset(),e.dataset.mode="create",e.dataset.id="";let t=b("#debt-submit");t&&(t.textContent="Add debt");let a=b('[data-action="debt-cancel"]');a&&(a.hidden=!0)}function Vt(){let e=b("#goal-form");if(!e)return;e.reset(),e.dataset.mode="create",e.dataset.id="";let t=b("#goal-submit");t&&(t.textContent="Add goal");let a=b('[data-action="goal-cancel"]');a&&(a.hidden=!0)}function Kt(){let e=b("#log-form");if(!e)return;e.reset(),e.dataset.mode="create",e.dataset.idx="";let t=e.querySelector('[name="date"]');t&&(t.value=Je());let a=b("#log-submit");a&&(a.textContent="Add entry");let s=b('[data-action="log-cancel"]');s&&(s.hidden=!0)}function Zt(){let e=location.hash.replace(/^#\/?/,"")||"dashboard";return Ut.some(t=>t.id===e)?e:"dashboard"}window.addEventListener("hashchange",()=>{p.route=Zt(),pe(),window.scrollTo({top:0})});document.addEventListener("submit",e=>{let t=e.target;if(!t?.id)return;let a=new FormData(t),s=n=>{let o=Number.parseFloat(String(a.get(n)??""));return Number.isFinite(o)?o:0};switch(t.id){case"scam-questions-form":{e.preventDefault();let n=Z.filter(f=>a.get(f.id)),o=b("#scam-result");if(!o)return;if(n.length===0){o.innerHTML='<p class="small muted" style="margin-top:var(--space-3)">Please answer at least one question first.</p>';return}let l=Z.filter(f=>a.get(f.id)==="yes").map(f=>f.id),c=Z.filter(f=>a.get(f.id)==="unsure").length;o.innerHTML=nt(St(l),c),o.scrollIntoView({behavior:"smooth",block:"nearest"});return}case"scam-text-form":{e.preventDefault(),z.scamText=String(a.get("text")??"").trim();let n=b("#scam-result");if(!n)return;n.innerHTML=z.scamText?nt(Tt(z.scamText)):'<p class="small muted" style="margin-top:var(--space-3)">Paste a message first.</p>',n.scrollIntoView({behavior:"smooth",block:"nearest"});return}case"expense-form":{e.preventDefault();let n={category:String(a.get("category")??"other").toLowerCase(),name:String(a.get("name")??"").trim()||"Expense",amount:u(s("amount")),type:a.get("type")==="variable"?"variable":"fixed"};if(n.amount<=0)return $("Enter an amount greater than zero.");if(t.dataset.mode==="edit"&&t.dataset.id){let l=ot(t.dataset.id);l&&Object.assign(l,n),$("Expense updated.")}else p.data.expenses.push({...n,id:me("e")}),$("Expense added.");zt(),A();return}case"debt-form":{e.preventDefault();let n={type:a.get("type")??"bank_loan",name:String(a.get("name")??"").trim()||void 0,amount:u(s("amount")),interestRate:u(s("interestRate")),minMonthlyPayment:u(s("minMonthlyPayment"))};if(n.amount<=0)return $("Enter how much is still owed.");if(t.dataset.mode==="edit"&&t.dataset.id){let l=it(t.dataset.id);l&&Object.assign(l,n),$("Debt updated.")}else p.data.debts.push({...n,id:me("d")}),$("Debt added.");Jt(),A();return}case"goal-form":{e.preventDefault();let n={id:me("g"),name:String(a.get("name")??"").trim()||"Goal",cost:u(s("cost")),saved:u(s("saved")),type:a.get("type")==="emergency_fund"?"emergency_fund":"custom"};if(n.cost<=0)return $("Enter a target cost.");if(t.dataset.mode==="edit"&&t.dataset.id){let l=p.data.goals.find(c=>c.id===t.dataset.id);l&&Object.assign(l,n,{id:l.id}),$("Goal updated.")}else n.type==="emergency_fund"&&(p.data.goals=p.data.goals.map(l=>l.type==="emergency_fund"?{...l,type:"custom"}:l)),p.data.goals.push(n),$("Goal added.");Vt(),A();return}case"log-form":{e.preventDefault();let n={date:String(a.get("date")??Je()),amount:u(s("amount")),note:String(a.get("note")??"").trim()};if(n.amount===0)return $("Enter an amount.");let o=Number(t.dataset.idx);t.dataset.mode==="edit"&&Number.isInteger(o)&&p.data.logs[o]?(p.data.logs[o]=n,$("Entry updated.")):(p.data.logs.push(n),$("Entry added.")),Kt(),A();return}case"income-form":{e.preventDefault();let n=String(a.get("sourceName")??"").trim()||"Income",o=u(s("sourceAmount"));p.data.income.type=a.get("type")??"monthly",o>0?(p.data.income.sources.push({name:n,amount:o}),$(`Added ${n}.`)):$("Amount must be greater than zero."),t.reset(),A();return}}});document.addEventListener("click",async e=>{let t=e.target?.closest("[data-action]");if(!t)return;let a=t.dataset.action,s=t.dataset.id??"",n=p.data;switch(a){case"lesson-open":e.preventDefault(),p.route!=="learn"&&(location.hash="#/learn"),Lt(s);return;case"lesson-done":Rt(s),Te(),p.route==="learn"&&pe();return;case"lesson-next":Rt(s),Lt(t.dataset.next??""),p.route==="learn"&&pe();return;case"scam-mode":{let o=document.querySelector("#scam-text-form textarea");o&&(z.scamText=o.value),z.scamMode=s==="paste"?"paste":"questions",pe();return}case"expense-edit":{let o=ot(s),l=b("#expense-form");if(!o||!l)return;l.dataset.mode="edit",l.dataset.id=s,L(l,"name",o.name),L(l,"category",o.category),L(l,"amount",String(o.amount)),L(l,"type",o.type);let c=b("#expense-submit");c&&(c.textContent="Save expense");let f=b('[data-action="expense-cancel"]');f&&(f.hidden=!1),l.scrollIntoView({behavior:"smooth",block:"center"}),l.querySelector('[name="name"]')?.focus();return}case"expense-cancel":zt();return;case"expense-delete":{let o=ot(s);o&&confirm(`Delete \u201C${o.name}\u201D?`)&&(n.expenses=n.expenses.filter(l=>l.id!==s),$("Expense deleted."),A());return}case"debt-edit":{let o=it(s),l=b("#debt-form");if(!o||!l)return;l.dataset.mode="edit",l.dataset.id=s,L(l,"type",o.type),L(l,"name",o.name??""),L(l,"amount",String(o.amount)),L(l,"interestRate",String(o.interestRate)),L(l,"minMonthlyPayment",String(o.minMonthlyPayment));let c=b("#debt-submit");c&&(c.textContent="Save debt");let f=b('[data-action="debt-cancel"]');f&&(f.hidden=!1),l.scrollIntoView({behavior:"smooth",block:"center"});return}case"debt-cancel":Jt();return;case"debt-delete":{let o=it(s);o&&confirm(`Delete \u201C${o.name||ae(o.type)}\u201D?`)&&(n.debts=n.debts.filter(l=>l.id!==s),$("Debt deleted."),A());return}case"strategy":{p.options.strategy=t.dataset.value==="snowball"?"snowball":"avalanche",$(p.options.strategy==="avalanche"?"Clearing highest-rate debts first.":"Clearing smallest balances first."),A();return}case"goal-edit":{let o=n.goals.find(h=>h.id===s),l=b("#goal-form");if(!o||!l)return;l.dataset.mode="edit",l.dataset.id=s,L(l,"name",o.name),L(l,"cost",String(o.cost)),L(l,"saved",String(o.saved)),L(l,"type",o.type);let c=b("#goal-submit");c&&(c.textContent="Save goal");let f=b('[data-action="goal-cancel"]');f&&(f.hidden=!1),l.scrollIntoView({behavior:"smooth",block:"center"});return}case"goal-cancel":Vt();return;case"goal-delete":{let o=n.goals.find(l=>l.id===s);o&&confirm(`Delete \u201C${o.name}\u201D?`)&&(n.goals=n.goals.filter(l=>l.id!==s),$("Goal deleted."),A());return}case"log-edit":{let o=Number(t.dataset.idx),l=n.logs[o],c=b("#log-form");if(!l||!c)return;c.dataset.mode="edit",c.dataset.idx=String(o),L(c,"date",l.date),L(c,"amount",String(l.amount)),L(c,"note",l.note??"");let f=b("#log-submit");f&&(f.textContent="Save entry");let h=b('[data-action="log-cancel"]');h&&(h.hidden=!1),c.scrollIntoView({behavior:"smooth",block:"center"});return}case"log-cancel":Kt();return;case"log-delete":{let o=Number(t.dataset.idx);Number.isInteger(o)&&n.logs[o]&&confirm("Delete this log entry?")&&(n.logs.splice(o,1),$("Entry deleted."),A());return}case"income-delete":{let o=Number(t.dataset.idx);Number.isInteger(o)&&n.income.sources[o]&&(n.income.sources.splice(o,1),$("Income source removed."),A());return}case"export-download":ka(`honchoy-${Je()}.json`,JSON.stringify(n,null,2)),$("Downloaded your data.");return;case"export-copy":$(await Ct(JSON.stringify(n,null,2))?"Copied to clipboard.":"Copy failed \u2014 use Download instead.");return;case"share-link":{let o=`${location.origin}${location.pathname}?d=${encodeURIComponent(JSON.stringify(n))}`;$(await Ct(o)?"Share link copied.":"Could not copy the link.");return}case"import-open":qt("Import a $honchoy plan",`<p class="small muted">Paste an exported JSON snapshot below.</p>
         <div class="field">
           <label for="import-json">JSON</label>
           <textarea class="textarea" id="import-json" rows="10" placeholder='{ "app": "$honchoy", ... }'></textarea>
         </div>
         <div class="field" style="margin-top:var(--space-3)">
           <label for="import-file">\u2026or choose a file</label>
           <input class="input" type="file" id="import-file" accept="application/json,.json">
         </div>
         <div class="row row--end" style="margin-top:var(--space-4)">
           <button class="btn btn--ghost" type="button" data-action="modal-close">Cancel</button>
           <button class="btn" type="button" data-action="import-run">Import</button>
         </div>`);return;case"import-run":{let o=b("#import-json"),l=b("#import-file")?.files?.[0],c=f=>new Promise((h,v)=>{let M=new FileReader;M.onload=()=>h(String(M.result??"")),M.onerror=()=>v(new Error("read failed")),M.readAsText(f)});try{let f=l?await c(l):String(o?.value??"");if(!f.trim())return $("Nothing to import.");let h=Me(JSON.parse(f));p.data=Ye(h),Te(),$("Plan imported."),A()}catch{$("That JSON could not be read.")}return}case"load-sample":confirm("Replace your current plan with the sample data?")&&(p.data=Ye(JSON.parse(JSON.stringify(at))),$("Sample data loaded."),A());return;case"wipe":confirm("Delete every expense, debt, goal and log entry? This cannot be undone.")&&(p.data=Ye(tt()),$("All data cleared."),A());return;case"options-reset":p.options={...xe},$("Plan settings reset."),A();return;case"modal-close":Te();return}});document.addEventListener("input",e=>{let t=e.target;if(t?.dataset){if(t.dataset.action==="extra-payment"){let a=Number(t.value)||0;p.options.extraDebtPayment=a;let s=b("#extra-value");s&&(s.textContent=`${d(a)} extra`);let n=b("#extra-total");n&&(n.textContent=`${d(X().debts.totalMinMonthlyPayment+a)} / month`);return}if(t.dataset.option){Xt(t.dataset.option,t);return}}});document.addEventListener("change",e=>{let t=e.target;if(t?.dataset){if(t.dataset.action==="extra-payment"){p.options.extraDebtPayment=Math.max(0,Number(t.value)||0),A();return}if(t.dataset.option){Xt(t.dataset.option,t),A();return}t.id==="currency-select"&&(p.data.user.currency=t.value,$(`Currency set to ${t.value}.`),A())}});function Xt(e,t){let a=p.data,s=Number(t.value);switch(e){case"currency":a.user.currency=t.value;return;case"language":a.user.language=t.value;return;case"ageConfirmed":a.user.ageConfirmed=t.checked;return;case"extraDebtPayment":p.options.extraDebtPayment=Math.max(0,Number.isFinite(s)?s:0);return;case"emergencyMonths":p.options.emergencyMonths=Math.min(24,Math.max(1,Math.round(s)||3));return;case"dtiWatchPct":p.options.dtiWatch=Math.min(.6,Math.max(.05,(s||30)/100));return;case"dtiMaxPct":p.options.dtiMax=Math.min(.8,Math.max(.1,(s||40)/100));return;case"highInterestWarn":p.options.highInterestWarn=Math.max(1,s||25);return;case"highInterestDanger":p.options.highInterestDanger=Math.max(1,s||40);return}}function L(e,t,a){let s=e.elements.namedItem(t);s&&(s.value=a)}b("#modal-close")?.addEventListener("click",Te);b("#modal")?.addEventListener("click",e=>{e.target===b("#modal")&&Te()});function Ga(){let{data:e,options:t}=Sa();p.data=e,p.options=t,p.route=Zt(),p.analysis=We({data:e,options:t}),Ma();let a=b("#storage-banner");a&&(a.hidden=he),pe()}Ga();window.honchoy={state:p,computeFinancials:We,get analysis(){return p.analysis}};
