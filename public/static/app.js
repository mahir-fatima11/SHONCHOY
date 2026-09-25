var fe={dtiWatch:.3,dtiMax:.4,highInterestWarn:25,highInterestDanger:40,emergencyMonths:3,extraDebtPayment:0,strategy:"avalanche",emergencyMaintenanceWeight:.15},Gt=.7,Bt=.5,Jt=.65,st=.1,it=600,k=.005;function c(t){return Number.isFinite(t)?Math.round((t+Number.EPSILON)*100)/100:0}function ye(t){let e=typeof t=="number"?t:Number.parseFloat(String(t??""));return Number.isFinite(e)?e:0}function B(t){return Math.max(0,ye(t))}function ie(t,e,a){return Math.min(a,Math.max(e,t))}function R(t,e){return e>0?t/e:0}function Yt(t,e,a){return t+(e-t)*ie(a,0,1)}function ke(t,e){let a=new Date(`${t}T00:00:00Z`),o=a.getUTCFullYear(),n=a.getUTCMonth()+e,i=o+Math.floor(n/12),d=(n%12+12)%12;return`${i}-${String(d+1).padStart(2,"0")}`}function rt(t){return`${t.getUTCFullYear()}-${String(t.getUTCMonth()+1).padStart(2,"0")}`}function zt(t){return`${rt(t)}-${String(t.getUTCDate()).padStart(2,"0")}`}function Ie(t){return B(t)/100/12}function qt(t,e,a,o){let n=Ie(e),i=a<=0||a+k<=t*n;if(t<=k)return{months:0,payoffMonth:o.slice(0,7),totalInterest:0,totalPaid:0,paymentUsed:c(a),negativeAmortization:!1};if(i)return{months:null,payoffMonth:null,totalInterest:0,totalPaid:0,paymentUsed:c(a),negativeAmortization:!0};let d=t,g=0,b=0;for(let w=0;w<it&&d>k;w++){let U=d*n,L=a-U;L>d&&(L=d);let x=L+U;if(d-=L,g+=U,b++,x<=0)break}let u=d<=k;return{months:u?b:null,payoffMonth:u?ke(o,b):null,totalInterest:c(g),totalPaid:c(t+g),paymentUsed:c(a),negativeAmortization:!1}}var We=t=>t<=k;function ot(t,e,a,o){let n=t.reduce((x,v)=>x+v.minPayment,0);if(t.length===0||e+k<n)return{monthlyPool:c(e),months:t.length===0?0:null,totalInterest:0,totalPaid:0,debtFreeMonth:t.length===0?o.slice(0,7):null,strategy:a,payoffOrder:[]};let i=t.map(x=>({...x})),d=[],g=x=>x.sort((v,W)=>a==="avalanche"&&W.rate-v.rate||v.balance-W.balance),b=0,u=0,w=0;for(;b<it;){let x=i.filter(S=>!We(S.balance));if(x.length===0)break;b++,g(x);for(let S of x){let D=S.balance*Ie(S.rate);S.balance+=D,u+=D}let v=0;for(let S of x){let D=Math.min(S.minPayment,S.balance);S.balance-=D,v+=D,w+=D}let W=e-v;for(let S of x){if(W<=k)break;let D=Math.min(W,S.balance);S.balance-=D,W-=D,w+=D}for(let S of x)We(S.balance)&&!d.some(D=>D.id===S.id)&&d.push({id:S.id,name:S.name,month:b})}let L=i.every(x=>We(x.balance))?b:null;return{monthlyPool:c(e),months:L,totalInterest:c(u),totalPaid:c(w),debtFreeMonth:L===null?null:ke(o,L),strategy:a,payoffOrder:d.sort((x,v)=>x.month-v.month)}}var lt={bank_loan:"Bank loan",microloan:"Microloan / MFI",informal:"Informal / family loan",credit_purchase:"Credit purchase"};function Z(t){return lt[t]??"Debt"}var dt={monthly:1,weekly:52/12,biweekly:26/12,annual:1/12};function Ge(){return{app:"$honchoy",user:{ageConfirmed:!0,language:"en",currency:"USD"},income:{type:"monthly",sources:[]},expenses:[],debts:[],goals:[],logs:[]}}function be(t){let e=Ge();if(!t||typeof t!="object")return e;let a=t,o=a.income?.type&&a.income.type in dt?a.income.type:"monthly",n=Array.isArray(a.income?.sources)?a.income.sources.filter(u=>u&&typeof u=="object").map(u=>({name:String(u.name??"Income").slice(0,60),amount:B(u.amount)})):[],i=Array.isArray(a.expenses)?a.expenses.filter(u=>u&&typeof u=="object"&&B(u.amount)>0).map(u=>({id:u.id?String(u.id):void 0,category:String(u.category??"other").toLowerCase().slice(0,40)||"other",name:String(u.name??"").slice(0,80)||String(u.category??"Expense"),amount:c(B(u.amount)),type:u.type==="variable"?"variable":"fixed"})):[],d=Array.isArray(a.debts)?a.debts.filter(u=>u&&typeof u=="object"&&B(u.amount)>0).map(u=>({id:u.id?String(u.id):void 0,name:u.name?String(u.name).slice(0,80):void 0,type:u.type in lt?u.type:"bank_loan",amount:c(B(u.amount)),interestRate:c(ie(ye(u.interestRate),0,300)),minMonthlyPayment:c(B(u.minMonthlyPayment))})):[],g=Array.isArray(a.goals)?a.goals.filter(u=>u&&typeof u=="object").map((u,w)=>({id:String(u.id??`g${w+1}`).slice(0,40),name:String(u.name??"Goal").slice(0,80),cost:c(B(u.cost)),saved:c(B(u.saved)),type:u.type==="emergency_fund"?"emergency_fund":"custom"})):[],b=Array.isArray(a.logs)?a.logs.filter(u=>u&&typeof u=="object").map(u=>({date:/^\d{4}-\d{2}-\d{2}$/.test(String(u.date))?String(u.date):new Date().toISOString().slice(0,10),amount:c(ye(u.amount)),note:u.note?String(u.note).slice(0,200):""})):[];return{app:"$honchoy",user:{ageConfirmed:a.user?.ageConfirmed!==!1,language:a.user?.language==="mn"?"mn":"en",currency:String(a.user?.currency??"USD").slice(0,8)},income:{type:o,sources:n},expenses:i,debts:d,goals:g,logs:b}}function Pe({data:t,options:e,now:a}){let o={...fe,...e??{}},n=be(t),i=a?new Date(a):new Date,d=zt(i),g=n.user.currency||"USD",b=dt[n.income.type]??1,u=n.income.sources.map(s=>{let m=c(s.amount*b);return{name:s.name,amount:c(s.amount),monthlyAmount:m,share:0}}),w=c(u.reduce((s,m)=>s+m.monthlyAmount,0));for(let s of u)s.share=c(R(s.monthlyAmount,w)*100)/100;let U={type:n.income.type,monthly:w,annual:c(w*12),sources:u},L=c(n.expenses.filter(s=>s.type==="fixed").reduce((s,m)=>s+m.amount,0)),x=c(n.expenses.filter(s=>s.type==="variable").reduce((s,m)=>s+m.amount,0)),v=c(L+x),W=new Map;for(let s of n.expenses){let m=W.get(s.category)??{amount:0,count:0,type:s.type};m.amount+=s.amount,m.count+=1,s.type==="variable"&&(m.type="variable"),W.set(s.category,m)}let S=[...W.entries()].map(([s,m])=>({category:s,amount:c(m.amount),count:m.count,type:m.type,share:c(R(m.amount,v)*100)/100})).sort((s,m)=>m.amount-s.amount),D={count:n.expenses.length,total:v,fixed:L,variable:x,fixedShare:c(R(L,v)*100)/100,variableShare:c(R(x,v)*100)/100,incomeShare:c(R(v,w)*100)/100,byCategory:S},Ve=c(n.debts.reduce((s,m)=>s+m.amount,0)),J=c(n.debts.reduce((s,m)=>s+m.minMonthlyPayment,0)),Et=c(R(n.debts.reduce((s,m)=>s+m.interestRate*m.amount,0),Ve)),At=c(n.debts.reduce((s,m)=>Math.max(s,m.interestRate),0)),kt=c(n.debts.reduce((s,m)=>s+m.amount*Ie(m.interestRate),0)),_e=n.debts.map(s=>{let m=c(s.amount*Ie(s.interestRate)),M=s.minMonthlyPayment+k<=m,C=qt(s.amount,s.interestRate,s.minMonthlyPayment,d),j=C,Y=null,Ae=null;return M?(Y="high",Ae="The minimum payment does not cover this month\u2019s interest \u2014 the balance grows every month."):s.interestRate>=o.highInterestDanger?(Y="high",Ae=`Very expensive money at ${s.interestRate}% a year. Prioritise this one.`):s.interestRate>=o.highInterestWarn&&(Y="warn",Ae=`High rate at ${s.interestRate}% a year \u2014 well above a typical bank loan.`),{id:s.id??s.name??Z(s.type),name:s.name||Z(s.type),type:s.type,amount:s.amount,interestRate:s.interestRate,minMonthlyPayment:s.minMonthlyPayment,monthlyInterest:m,principalShare:c(ie(R(s.minMonthlyPayment-m,s.amount),0,1)*100)/100,monthsAtMinimum:C.months,negativeAmortization:M,payoff:j,effectiveMonthlyCost:m,severity:Y,note:Ae}}).sort((s,m)=>m.interestRate-s.interestRate||m.amount-s.amount),It=["bank_loan","microloan","informal","credit_purchase"].map(s=>{let m=n.debts.filter(C=>C.type===s),M=c(m.reduce((C,j)=>C+j.amount,0));return{type:s,count:m.length,amount:M,minMonthlyPayment:c(m.reduce((C,j)=>C+j.minMonthlyPayment,0)),averageRate:c(R(m.reduce((C,j)=>C+j.interestRate*j.amount,0),M))}}).filter(s=>s.count>0),O=c(R(J,w)*100)/100,Ke=n.debts.map((s,m)=>({id:s.id??`d${m+1}`,name:s.name||Z(s.type),balance:s.amount,rate:s.interestRate,minPayment:s.minMonthlyPayment})),Oe=c(J+B(o.extraDebtPayment)),Ze=o.strategy==="snowball"?"snowball":"avalanche",Xe=Ze==="avalanche"?"snowball":"avalanche",Pt=ot(Ke,Oe,Ze,d),Qe=ot(Ke,Oe,Xe,d),Ft={...Pt,underfunded:n.debts.length>0&&Oe+k<J,alternate:{strategy:Xe,months:Qe.months,totalInterest:Qe.totalInterest}},A={count:n.debts.length,totalOwed:Ve,totalMinMonthlyPayment:J,weightedAverageRate:Et,highestRate:At,monthlyInterestCost:kt,dti:O,byType:It,items:_e,plan:Ft,hasNegativeAmortization:_e.some(s=>s.negativeAmortization)},N=c(w-v),de=c(J+B(o.extraDebtPayment)),Ne=c(Math.max(0,de-Math.max(0,N))),we=c(Math.max(0,N-de)),Lt=c(R(we,w)*100)/100,xe=n.goals.find(s=>s.type==="emergency_fund"),X=c(xe?xe.cost:v*Math.max(1,o.emergencyMonths)),Me=c(xe?xe.saved:0),ce=c(Math.max(0,X-Me)),Q=ce<=k||X<=k,me=c(ie(R(Me,X),0,1)*100)/100,He=Q?o.emergencyMaintenanceWeight:c(Yt(Gt,Bt,me)*100)/100,Ct=c(1-He),ue=n.goals.filter(s=>s.type!=="emergency_fund"&&s.cost-s.saved>k),et=ue.length>0?c(Ct*Jt*100)/100:0,Se=c((1-He-et)*100)/100,De=He,oe=et,pe=Se;if(we>0&&Se<st-1e-9){let s=c((st-Se)*100)/100,m=Math.min(oe,s);oe=c((oe-m)*100)/100,pe=c((Se+m)*100)/100;let M=c((s-m)*100)/100;M>0&&(De=c((De-M)*100)/100,pe=c((pe+M)*100)/100)}let je=s=>c(we*s),Te=[{key:"emergency",amount:je(De),weight:De,rationale:Q?"Buffer already funded \u2014 keeping up a small top-up only.":`Buffer is ${Math.round(me*100)}% funded, so it takes the largest share.`},{key:"goals",amount:je(oe),weight:oe,rationale:oe>0?`Saving toward ${ue.length} open goal${ue.length===1?"":"s"}.`:"No open goals right now \u2014 nothing earmarked."},{key:"flexible",amount:je(pe),weight:pe,rationale:"Day-to-day spending money that is not already committed."}],ee=Te[0].amount,ge=Q?0:ee<=k?null:Math.ceil(ce/ee),G={monthlyIncome:w,totalExpenses:v,totalFixedExpenses:L,totalVariableExpenses:x,totalMinDebtPayments:J,disposableIncome:N,debtCarveOut:de,debtShortfall:Ne,remainder:we,remainderShare:Lt,emergencyFund:{target:X,saved:Me,gap:ce,monthsCovered:c(R(Me,v)*10)/10,fundedRatio:me,fullyFunded:Q,monthlyAllocation:ee,monthsToFund:ge,fundedMonth:ge===0?d.slice(0,7):ge?ke(d,ge):null},allocations:Te,emergencyAllocation:ee,goalsAllocation:Te[1].amount,flexibleAllocation:Te[2].amount},Rt=[...n.goals].sort((s,m)=>s.type!==m.type?s.type==="emergency_fund"?-1:1:s.cost-s.saved<m.cost-m.saved?-1:1),tt=0,at=Rt.map(s=>{let m=c(Math.max(0,s.cost-s.saved)),M=m<=k,C=s.type==="emergency_fund"?ee:G.goalsAllocation,j=M?0:C>k?Math.ceil(m/C):null,Y=M?0:j===null?null:tt+j;return Y!==null&&(tt=Y),{id:s.id,name:s.name,type:s.type,cost:s.cost,saved:s.saved,remaining:m,progress:c(ie(R(s.saved,s.cost),0,1)*100)/100,monthsToFund:Y,fundedMonth:Y===null?null:ke(d,Y),ownMonths:j,completed:M}}),te=[...n.logs].sort((s,m)=>s.date.localeCompare(m.date)),Ot=c(te.reduce((s,m)=>s+m.amount,0)),Nt=te.length?te[te.length-1].date:null,nt=rt(i),Ht=c(te.filter(s=>s.date.startsWith(nt)).reduce((s,m)=>s+m.amount,0)),jt=new Date(i.getTime()-30*864e5),Ut=te.filter(s=>new Date(`${s.date}T00:00:00Z`).getTime()>=jt.getTime()).reduce((s,m)=>s+m.amount,0),Ue=c(Ut/30),he=c(Ue*30),ae=G.flexibleAllocation,Ee=c(he-ae),ne={entries:te.length,totalLogged:Ot,lastEntryDate:Nt,currentMonthTotal:Ht,currentMonth:nt,dailyAverage:Ue,projectedMonthTotal:he,allowance:ae,overUnder:Ee,onTrack:ae<=k?!0:he<=ae},P=[];n.debts.length>0&&w>0&&(O>o.dtiMax?P.push({code:"dti_critical",severity:"high",title:"Debt payments are too large a share of income",message:`You pay ${$(c(J),g)} a month to debt \u2014 ${K(O)} of your income. Lenders and advisers treat anything above ${K(o.dtiMax)} as over-indebted.`,params:{dti:O,threshold:o.dtiMax,amount:J}}):O>o.dtiWatch?P.push({code:"dti_watch",severity:"warn",title:"Debt payments are stretching your income",message:`Debt takes ${K(O)} of your income, above the comfortable ${K(o.dtiWatch)} line and close to the ${K(o.dtiMax)} danger zone.`,params:{dti:O,threshold:o.dtiWatch,amount:J}}):P.push({code:"dti_ok",severity:"good",title:"Debt payments look affordable",message:`Debt takes ${K(O)} of your income, comfortably inside the ${K(o.dtiMax)} limit.`,params:{dti:O,amount:J}}));let V=_e.filter(s=>s.interestRate>=o.highInterestWarn);if(V.length>0){let s=V.reduce((m,M)=>M.interestRate>m.interestRate?M:m);P.push({code:s.interestRate>=o.highInterestDanger?"interest_high":"interest_watch",severity:s.interestRate>=o.highInterestDanger?"high":"warn",title:"Unusually high interest rate",message:`${s.name} charges ${s.interestRate}% a year \u2014 ${$(s.monthlyInterest,g)} of interest every month, or ${$(c(V.reduce((m,M)=>m+M.monthlyInterest,0)*12),g)} a year across your expensive debts.`,params:{rate:s.interestRate,count:V.length,name:s.name,threshold:o.highInterestWarn}})}if(A.hasNegativeAmortization){let s=_e.filter(m=>m.negativeAmortization).map(m=>m.name);P.push({code:"negative_amortization",severity:"high",title:"A minimum payment is not enough to reduce the balance",message:`${s.join(", ")} charges more interest each month than your minimum payment covers. Paying the minimum means owing more over time.`,params:{names:s.join(", ")}})}w<=0?P.push({code:"no_income",severity:"warn",title:"No income recorded",message:"Add at least one income source so the planner can size your budget."}):N<0?P.push({code:"overspending",severity:"high",title:"Living costs exceed income",message:`Your expenses are ${$(c(-N),g)} more than your income each month. This gap has to be closed before any plan can work.`,params:{gap:c(-N)}}):N>0&&de>N&&P.push({code:"debt_shortfall",severity:"high",title:"Debt payments do not fit in your budget",message:`You need ${$(de,g)} a month for debt but only ${$(N,g)} is left after living costs \u2014 a shortfall of ${$(Ne,g)}.`,params:{shortfall:Ne}}),v>0&&!Q?P.push({code:"emergency_gap",severity:me<.5?"warn":"info",title:"Emergency fund is not fully funded",message:`You are ${$(ce,g)} short of a ${o.emergencyMonths}-month buffer (${$(X,g)}). At ${$(ee,g)} a month you get there${G.emergencyFund.fundedMonth?` by ${G.emergencyFund.fundedMonth}`:" once you free up some cash"}.`,params:{gap:ce,target:X,months:ge??0}}):v>0&&Q&&P.push({code:"emergency_ok",severity:"good",title:"Emergency fund is fully funded",message:`Your buffer covers ${G.emergencyFund.monthsCovered} months of living costs. Anything extra can go to goals or debt.`,params:{monthsCovered:G.emergencyFund.monthsCovered}}),D.fixedShare>.7&&v>0&&P.push({code:"rigid_budget",severity:"info",title:"Most of your spending is fixed",message:`${K(D.fixedShare)} of your expenses are committed (rent, contracts, school fees). That leaves little room to adjust a bad month.`,params:{share:D.fixedShare}}),ae>0&&!ne.onTrack&&ne.entries>0&&P.push({code:"spending_pace",severity:"warn",title:"Spending is running above the plan",message:`At ${$(Ue,g)} a day you are heading for about ${$(he,g)} this month, ${$(Math.abs(Ee),g)} over your ${$(ae,g)} flexible allowance.`,params:{projected:he,allowance:ae,over:Ee}}),G.emergencyFund.monthsCovered<1&&v>0&&ne.entries>0&&P.push({code:"no_buffer_months",severity:"warn",title:"Less than one month of expenses saved",message:"A single unexpected bill would have to go on credit. Prioritise the emergency fund."});let E=100;w>0?(O>o.dtiMax?E-=30:O>o.dtiWatch?E-=14:E-=Math.round(O*10),E-=Math.min(20,Math.round(D.incomeShare*25))):E-=50,A.count>0&&V.length>0&&(E-=10+Math.min(10,V.length*3)),A.hasNegativeAmortization&&(E-=15),N<0&&(E-=20),G.debtShortfall>0&&(E-=10),E-=Math.round((1-me)*15),ne.onTrack||(E-=5),E=ie(Math.round(E),0,100);let Wt=E>=80?"strong":E>=60?"okay":E>=40?"stretched":"at_risk",H=[];if(w<=0&&H.push("Add your income sources \u2014 every other number depends on them."),N<0&&H.push(`Close the ${$(c(-N),g)} monthly gap: cut variable spending first, since fixed costs are harder to move.`),G.debtShortfall>0&&H.push("Talk to each lender before missing a payment \u2014 ask about rescheduling or a lower instalment. Missing payments is more expensive than renegotiating."),V.length>0){let s=V.reduce((m,M)=>M.interestRate>m.interestRate?M:m);H.push(`Attack ${s.name} first (${s.interestRate}%). Clearing the most expensive debt first saves the most interest overall.`)}if(A.count>0&&A.plan.months!==null&&A.plan.months>0&&(H.push(`At ${$(A.plan.monthlyPool,g)} a month you are debt-free in ${A.plan.months} months (${A.plan.debtFreeMonth}), having paid ${$(A.plan.totalInterest,g)} in interest.`),A.plan.alternate.totalInterest>A.plan.totalInterest&&A.plan.alternate.months!==null&&H.push(`Clearing the highest-rate debt first saves ${$(c(A.plan.alternate.totalInterest-A.plan.totalInterest),g)} versus clearing the smallest balance first.`)),Q?ue.length>0&&H.push(`${$(G.goalsAllocation,g)} a month now goes to goals instead of the buffer.`):H.push(`Keep the emergency fund allocation at ${$(ee,g)} a month until it reaches ${$(X,g)}.`),ue.length>0){let s=at.find(m=>!m.completed&&m.type!=="emergency_fund");s?.fundedMonth&&H.push(`Next goal up: ${s.name}, funded by ${s.fundedMonth}.`)}return ne.entries===0?H.push("Log your daily spending so the pace check has something to compare against."):ne.onTrack||H.push(`Trim about ${$(Math.max(1,c(Ee/30)),g)} a day from flexible spending to land inside the plan.`),{generatedAt:i.toISOString(),currency:g,income:U,expenses:D,debts:A,budget:G,goals:at,spending:ne,flags:P,recommendations:H,health:{score:E,band:Wt}}}function $(t,e="USD"){let a=c(ye(t));try{return new Intl.NumberFormat("en-US",{style:"currency",currency:e,maximumFractionDigits:a%1===0?0:2}).format(a)}catch{return`${a.toLocaleString("en-US")} ${e}`}}function K(t,e=0){return`${(ye(t)*100).toFixed(e)}%`}var Be={app:"$honchoy",user:{ageConfirmed:!0,language:"en",currency:"USD"},income:{type:"monthly",sources:[{name:"salary",amount:2e4}]},expenses:[{id:"e1",category:"rent",name:"House rent",amount:6e3,type:"fixed"},{id:"e2",category:"food",name:"Groceries",amount:3e3,type:"variable"},{id:"e3",category:"transport",name:"Bus & taxi",amount:700,type:"variable"},{id:"e4",category:"utilities",name:"Electricity & water",amount:600,type:"variable"},{id:"e5",category:"school",name:"School fees",amount:900,type:"fixed"},{id:"e6",category:"phone",name:"Phone & internet",amount:300,type:"fixed"}],debts:[{id:"d1",type:"microloan",name:"MFI working-capital loan",amount:5e3,interestRate:20,minMonthlyPayment:500},{id:"d2",type:"bank_loan",name:"Bank salary loan",amount:12e3,interestRate:12,minMonthlyPayment:700},{id:"d3",type:"credit_purchase",name:"Shop credit \u2014 fridge",amount:1800,interestRate:34,minMonthlyPayment:250}],goals:[{id:"g1",name:"Sewing machine",cost:15e3,saved:3e3,type:"custom"},{id:"g2",name:"Emergency fund",cost:34500,saved:9e3,type:"emergency_fund"}],logs:[{date:"2026-09-22",amount:320,note:"Groceries"},{date:"2026-09-23",amount:180,note:"Bus + lunch"},{date:"2026-09-24",amount:450,note:"School books"},{date:"2026-09-25",amount:1e3,note:""}]},ct=["rent","food","transport","utilities","school","health","phone","clothing","family","debt","other"],mt={bank_loan:"Bank loan",microloan:"Microloan / MFI",informal:"Informal / family loan",credit_purchase:"Credit purchase"};var ht="honchoy.v1.data",yt="honchoy.v1.options",ft=["USD","EUR","GBP","MNT","INR","KES","NGN","PHP","VND","IDR","BRL","JPY"],bt=[{id:"dashboard",label:"Dashboard",icon:"\u25C9"},{id:"expenses",label:"Expenses",icon:"\u25A4"},{id:"debts",label:"Debts",icon:"\u26D3"},{id:"budget",label:"Budget",icon:"\u25EB"},{id:"goals",label:"Goals",icon:"\u2605"},{id:"log",label:"Spending log",icon:"\u270E"},{id:"data",label:"Data",icon:"\u21C5"}],p={},le=!0;function r(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}var h=(t,e=document)=>e.querySelector(t);function re(t="x"){let e=typeof crypto<"u"&&"randomUUID"in crypto?crypto.randomUUID().slice(0,8):Math.random().toString(36).slice(2,10);return`${t}${e}`}function Re(){let t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function l(t){return $(t,p.data?.user.currency||"USD")}function f(t,e=0){return`${(Number.isFinite(t)?t*100:0).toFixed(e)}%`}function z(t){if(!t)return"\u2014";let[e,a]=t.split("-").map(Number);return!e||!a?t:new Date(Date.UTC(e,a-1,1)).toLocaleDateString("en-US",{month:"short",year:"numeric",timeZone:"UTC"})}function se(t){if(t===null)return"never";if(t===0)return"done";let e=Math.floor(t/12),a=t%12;return e===0?`${a} mo`:a===0?`${e} yr`:`${e} yr ${a} mo`}function F(t,e,a={}){let o=a.id??`f-${e}-${Math.random().toString(36).slice(2,7)}`;return`<div class="field">
    <label for="${o}">${r(t)}</label>
    <input class="input${a.type==="number"?" input--amount":""}" id="${o}" name="${r(e)}"
      type="${a.type??"text"}"
      ${a.value!==void 0?`value="${r(a.value)}"`:""}
      ${a.step?`step="${a.step}"`:""}
      ${a.min?`min="${a.min}"`:""}
      ${a.placeholder?`placeholder="${r(a.placeholder)}"`:""}
      ${a.required?"required":""}>
    ${a.hint?`<span class="hint">${r(a.hint)}</span>`:""}
  </div>`}function ve(t,e,a,o,n){let i=`f-${e}-${Math.random().toString(36).slice(2,7)}`;return`<div class="field">
    <label for="${i}">${r(t)}</label>
    <select class="select" id="${i}" name="${r(e)}">
      ${a.map(d=>`<option value="${r(d.value)}"${d.value===o?" selected":""}>${r(d.label)}</option>`).join("")}
    </select>
    ${n?`<span class="hint">${r(n)}</span>`:""}
  </div>`}var ut;function y(t){let e=h("#toast");e&&(e.textContent=t,e.hidden=!1,window.clearTimeout(ut),ut=window.setTimeout(()=>{e.hidden=!0},2600))}function Vt(t,e){let a=h("#modal");a&&(h("#modal-title").textContent=t,h("#modal-body").innerHTML=e,a.open||a.showModal())}function Le(){let t=h("#modal");t?.open&&t.close()}function Kt(t,e,a="application/json"){let o=URL.createObjectURL(new Blob([e],{type:a})),n=document.createElement("a");n.href=o,n.download=t,document.body.appendChild(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(o),1500)}async function pt(t){try{return await navigator.clipboard.writeText(t),!0}catch{return!1}}function Zt(){let t=JSON.parse(JSON.stringify(Be)),e={...fe},a=new URLSearchParams(location.search).get("d");if(a)try{t=be(JSON.parse(decodeURIComponent(a))),history.replaceState(null,"",location.pathname+location.hash),y("Loaded the shared plan.")}catch{y("That share link could not be read \u2014 using your saved data.")}else try{let o=localStorage.getItem(ht);o&&(t=be(JSON.parse(o)));let n=localStorage.getItem(yt);n&&(e={...e,...JSON.parse(n)})}catch{le=!1}return{data:Fe(t),options:e}}function Xt(){if(!(!le||!p.data))try{localStorage.setItem(ht,JSON.stringify(p.data)),localStorage.setItem(yt,JSON.stringify(p.options))}catch{le=!1;let t=h("#storage-banner");t&&(t.hidden=!1)}}function Fe(t){return t.expenses=t.expenses.map((e,a)=>({...e,id:e.id||`e${a+1}-${re("")}`})),t.debts=t.debts.map((e,a)=>({...e,id:e.id||`d${a+1}-${re("")}`})),t.goals=t.goals.map((e,a)=>({...e,id:e.id||`g${a+1}-${re("")}`})),t}function T(){p.analysis=Pe({data:p.data,options:p.options}),Xt(),qe()}var q=()=>p.analysis;function _(t,e,a,o){return`<article class="stat">
    <span class="stat__label">${r(t)}</span>
    <span class="stat__value${o?` stat__value--${o}`:""}">${r(e)}</span>
    ${a?`<span class="stat__meta">${a}</span>`:""}
  </article>`}function Ce(t,e,a,o="pink",n){let i=a>0?Math.min(100,e/a*100):0;return`<div class="bar-row">
    <span class="bar-row__label" title="${r(t)}">${r(t)}</span>
    <span class="bar"><span class="bar__fill bar__fill--${o}" style="width:${i.toFixed(1)}%"></span></span>
    <span class="bar-row__value">${r(n??l(e))}</span>
  </div>`}var Qt={high:"!",warn:"!",info:"i",good:"\u2713"};function vt(t){if(t.length===0)return'<p class="muted small">No warnings \u2014 nothing stands out.</p>';let e=["high","warn","info","good"];return`<ul class="flags">
    ${[...t].sort((o,n)=>e.indexOf(o.severity)-e.indexOf(n.severity)).map(o=>`<li class="flag flag--${o.severity}">
          <span class="flag__icon" aria-hidden="true">${Qt[o.severity]}</span>
          <div>
            <div class="flag__title">${r(o.title)}</div>
            <div class="flag__text">${r(o.message)}</div>
          </div>
        </li>`).join("")}
  </ul>`}function $e(t,e,a){return`<div class="empty">
    <div class="empty__title">${r(t)}</div>
    <p class="small">${r(e)}</p>
    ${a??""}
  </div>`}var ea={strong:"Strong",okay:"Okay",stretched:"Stretched",at_risk:"At risk"};function ta(){let t=q(),e=t.budget,a=t.debts,o=t.health.score>=80?"var(--good)":t.health.score>=60?"var(--pink-500)":t.health.score>=40?"var(--warn)":"var(--danger)";return`
  <section class="card card--accent">
    <div class="card__head">
      <div>
        <h1>Your month at a glance</h1>
        <p class="card__hint">
          Everything below is calculated from your income, expenses and debt. Change anything on the
          other tabs and these numbers update immediately.
        </p>
      </div>
      <span class="badge badge--${t.health.score>=80?"good":t.health.score>=60?"muted":t.health.score>=40?"warn":"danger"}">
        ${ea[t.health.band]}
      </span>
    </div>

    <div class="dial">
      <div class="dial__ring" style="--pct:${t.health.score};--ring:${o}" role="img"
           aria-label="Financial health score ${t.health.score} out of 100">
        <div class="dial__inner">
          <span class="dial__score">${t.health.score}</span>
          <span class="dial__caption">health</span>
        </div>
      </div>
      <div style="flex:1;min-width:220px">
        <div class="grid grid--2">
          ${_("Monthly income",l(t.income.monthly),`${r(String(t.income.type))} basis`)}
          ${_("Living expenses",l(t.expenses.total),`${f(t.expenses.incomeShare)} of income`)}
          ${_("Disposable income",l(e.disposableIncome),"income \u2212 expenses",e.disposableIncome<0?"danger":void 0)}
          ${_("Debt carve-out",l(e.debtCarveOut),`${f(a.dti)} of income (DTI)`,a.dti>fe.dtiMax?"danger":void 0)}
        </div>
      </div>
    </div>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${_("Left to allocate",l(e.remainder),`${f(e.remainderShare)} of income`)}
    ${_("Emergency fund",`${Math.round(e.emergencyFund.fundedRatio*100)}%`,e.emergencyFund.fullyFunded?`funded \xB7 ${e.emergencyFund.monthsCovered} mo cover`:`${l(e.emergencyFund.gap)} to go`)}
    ${_("Debt-free",a.count===0?"\u2014":z(a.plan.debtFreeMonth),a.count===0?"no debts recorded":a.plan.months===null?"payment too small to clear":`${se(a.plan.months)} away`)}
    ${_("Flexible allowance",l(e.flexibleAllocation),`${l(c(e.flexibleAllocation/30))} a day`)}
  </div>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <div class="stack">
      <section class="card">
        <div class="card__head"><div class="card__title"><h2>What needs attention</h2></div></div>
        ${vt(t.flags)}
      </section>

      <section class="card">
        <div class="card__head">
          <div class="card__title"><h2>What to do next</h2></div>
        </div>
        ${t.recommendations.length===0?'<p class="muted small">Nothing to act on. Add income, expenses and debt to get a full plan.</p>':`<ol class="recos">${t.recommendations.map(n=>`<li>${r(n)}</li>`).join("")}</ol>`}
      </section>

      <section class="card">
        <div class="card__head">
          <div class="card__title"><h2>Debt payoff order</h2></div>
          <span class="badge">${a.plan.strategy==="avalanche"?"Highest rate first":"Smallest balance first"}</span>
        </div>
        ${a.count===0?$e("No debts recorded","Add your loans and credit purchases on the Debts tab."):`<p class="small muted">
            Simulating ${l(a.plan.monthlyPool)} a month across your ${a.count} debt${a.count===1?"":"s"}:
            <strong>${a.plan.months===null?"the balance never clears":`${se(a.plan.months)} to go`}</strong>,
            ${l(a.plan.totalInterest)} total interest
            ${a.plan.debtFreeMonth?`\xB7 debt-free ${z(a.plan.debtFreeMonth)}`:""}.
          </p>
          <ol class="timeline">
            ${a.plan.payoffOrder.map((n,i)=>`<li>
                  <span class="timeline__idx">${i+1}</span>
                  <div class="timeline__body">
                    <div class="timeline__title">${r(n.name)}</div>
                    <div class="timeline__meta">cleared in month ${n.month} \xB7 ${z(a.plan.debtFreeMonth?aa(a.plan.debtFreeMonth,-(a.plan.months-n.month)):null)}</div>
                  </div>
                </li>`).join("")}
          </ol>`}
      </section>
    </div>

    <div class="stack">
      <section class="card">
        <div class="card__head"><div class="card__title"><h2>Where the money goes</h2></div></div>
        ${$t(e)}
      </section>

      <section class="card">
        <div class="card__head">
          <div class="card__title"><h2>Spending pace</h2></div>
          <span class="badge badge--${t.spending.onTrack?"good":"warn"}">
            ${t.spending.onTrack?"On plan":"Over plan"}
          </span>
        </div>
        ${_t(t)}
      </section>

      ${a.count>0?na(t):""}
    </div>
  </div>`}function aa(t,e){if(!t)return null;let[a,o]=t.split("-").map(Number),n=a*12+(o-1)+e;return`${Math.floor(n/12)}-${String(n%12+1).padStart(2,"0")}`}function $t(t){let e=t.remainder,a=(o,n,i)=>{let d=e>0?o/e*100:0;return d>0?`<span class="split__seg split__seg--${n}" style="width:${d.toFixed(2)}%"
               title="${r(i)}: ${r(l(o))}"></span>`:""};return`
    <div class="split" role="img" aria-label="How the ${l(e)} remainder is split">
      ${a(t.emergencyAllocation,"deep","Emergency fund")}
      ${a(t.goalsAllocation,"info","Goals")}
      ${a(t.flexibleAllocation,"pink","Flexible spending")}
    </div>
    <ul class="legend">
      <li><span class="legend__dot" style="background:var(--pink-600)"></span> Emergency <strong>${r(l(t.emergencyAllocation))}</strong> <span class="muted">(${f(t.allocations[0].weight)})</span></li>
      <li><span class="legend__dot" style="background:#9b8cf0"></span> Goals <strong>${r(l(t.goalsAllocation))}</strong> <span class="muted">(${f(t.allocations[1].weight)})</span></li>
      <li><span class="legend__dot" style="background:var(--pink-400)"></span> Flexible <strong>${r(l(t.flexibleAllocation))}</strong> <span class="muted">(${f(t.allocations[2].weight)})</span></li>
    </ul>
    <p class="small muted" style="margin-top:var(--space-3)">
      The emergency fund takes the largest share until it is fully funded, then drops to a
      maintenance top-up and the freed money moves to goals and spending.
    </p>`}function _t(t){let e=t.spending;if(e.entries===0)return`<p class="small muted">
      No spending logged yet. Add entries on the <a href="#/log">Spending log</a> tab and $honchoy
      will project where the month is heading.
    </p>`;let a=e.allowance>0?Math.min(100,e.projectedMonthTotal/e.allowance*100):0;return`
    ${Ce("Projected this month",e.projectedMonthTotal,Math.max(e.allowance,e.projectedMonthTotal,1),e.onTrack?"good":"danger",l(e.projectedMonthTotal))}
    <div class="bar-row">
      <span class="bar-row__label">Allowance used</span>
      <span class="bar"><span class="bar__fill bar__fill--${e.onTrack?"good":"danger"}" style="width:${a.toFixed(1)}%"></span></span>
      <span class="bar-row__value">${f(e.allowance>0?e.projectedMonthTotal/e.allowance:0)}</span>
    </div>
    <dl class="kv" style="margin-top:var(--space-4)">
      <dt>Logged this month</dt><dd>${r(l(e.currentMonthTotal))}</dd>
      <dt>Daily average</dt><dd>${r(l(e.dailyAverage))}</dd>
      <dt>Flexible allowance</dt><dd>${r(l(e.allowance))}</dd>
      <dt>${e.overUnder>=0?"Over plan by":"Under plan by"}</dt>
      <dd style="color:${e.overUnder>=0?"var(--danger)":"var(--good)"}">${r(l(Math.abs(e.overUnder)))}</dd>
    </dl>`}function na(t){let e=t.debts.items.find(a=>a.severity)??t.debts.items[0];return e?`<section class="card">
    <div class="card__head">
      <div class="card__title"><h2>Most expensive debt</h2></div>
      ${e.severity?`<span class="badge badge--${e.severity==="high"?"danger":"warn"}">${e.interestRate}% APR</span>`:""}
    </div>
    <p style="font-weight:650;margin-bottom:2px">${r(e.name)}</p>
    <p class="small muted">${r(Z(e.type))} \xB7 ${r(l(e.amount))} owed</p>
    <dl class="kv" style="margin-top:var(--space-3)">
      <dt>Interest this month</dt><dd>${r(l(e.monthlyInterest))}</dd>
      <dt>Minimum payment</dt><dd>${r(l(e.minMonthlyPayment))}</dd>
      <dt>Cleared by</dt><dd>${r(z(e.payoff.payoffMonth))}</dd>
    </dl>
    ${e.note?`<p class="debt__note">${r(e.note)}</p>`:""}
  </section>`:""}function sa(){let e=q().expenses,a=[...p.data.expenses].sort((i,d)=>d.amount-i.amount),o=e.byCategory[0]?.amount??0,n=a[0]?.amount??0;return`
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
      ${F("What is it?","name",{placeholder:"House rent",required:!0})}
      ${ve("Category","category",ct.map(i=>({value:i,label:i[0].toUpperCase()+i.slice(1)})),"rent")}
      ${F("Amount","amount",{type:"number",step:"0.01",min:"0",placeholder:"6000",required:!0,hint:"per month"})}
      ${ve("Type","type",[{value:"fixed",label:"Fixed \u2014 same every month"},{value:"variable",label:"Variable \u2014 moves month to month"}],"fixed")}
      <div class="row span-all">
        <button class="btn" type="submit" id="expense-submit">Add expense</button>
        <button class="btn btn--subtle" type="button" data-action="expense-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${_("Total monthly",l(e.total),`${e.count} item${e.count===1?"":"s"}`)}
    ${_("Fixed",l(e.fixed),`${f(e.fixedShare)} of spending`)}
    ${_("Variable",l(e.variable),`${f(e.variableShare)} of spending`)}
    ${_("Share of income",f(e.incomeShare),"expenses \xF7 income",e.incomeShare>.8?"danger":void 0)}
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Fixed vs variable</h2></div>
      <span class="badge badge--${e.variableShare>=.3?"good":"warn"}">
        ${e.variableShare>=.3?"You have room to adjust":"Little room to adjust"}
      </span>
    </div>
    <div class="split" role="img" aria-label="Fixed ${f(e.fixedShare)} versus variable ${f(e.variableShare)}">
      <span class="split__seg split__seg--deep" style="width:${(e.fixedShare*100).toFixed(1)}%"></span>
      <span class="split__seg split__seg--muted" style="width:${(e.variableShare*100).toFixed(1)}%"></span>
    </div>
    <ul class="legend">
      <li><span class="legend__dot" style="background:var(--pink-600)"></span> Fixed <strong>${r(l(e.fixed))}</strong></li>
      <li><span class="legend__dot" style="background:var(--pink-200)"></span> Variable <strong>${r(l(e.variable))}</strong></li>
    </ul>
  </section>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>All expenses</h2></div>
        <span class="muted small">${a.length} item${a.length===1?"":"s"}</span>
      </div>
      ${a.length===0?$e("Nothing added yet","Add your first expense above \u2014 rent is usually the biggest fixed cost."):`<ul class="items">
        ${a.map(i=>`<li>
            <div class="items__main">
              <span class="cell-title">${r(i.name)}</span>
              <span class="cell-sub">
                ${r(i.category)} \xB7
                <span class="badge badge--${i.type==="fixed"?"muted":"good"}">${r(i.type)}</span>
              </span>
            </div>
            <div class="items__side">
              <strong class="tabnum">${r(l(i.amount))}</strong>
              <button class="icon-action" data-action="expense-edit" data-id="${r(i.id)}">Edit</button>
              <button class="icon-action icon-action--danger" data-action="expense-delete" data-id="${r(i.id)}">Delete</button>
            </div>
          </li>`).join("")}
      </ul>`}
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>By category</h2></div></div>
      ${e.byCategory.length===0?'<p class="muted small">No categories yet.</p>':e.byCategory.map(i=>Ce(`${i.category} (${i.count})`,i.amount,o,i.type==="fixed"?"deep":"pink",l(i.amount))).join("")}
    </section>
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head"><div class="card__title"><h2>Biggest line items</h2></div></div>
    ${a.length===0?'<p class="muted small">Add expenses to see the ranking.</p>':a.slice(0,5).map(i=>Ce(i.name,i.amount,n,"deep",l(i.amount))).join("")}
  </section>`}function gt(t){return t>p.options.dtiMax?"danger":t>p.options.dtiWatch?"warn":"good"}function oa(){let t=q(),e=t.debts,a=p.options,o=Math.max(.6,e.dti*1.15,a.dtiMax*1.2);return`
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
      ${ve("Type","type",Object.entries(mt).map(([n,i])=>({value:n,label:i})),"microloan")}
      ${F("Label (optional)","name",{placeholder:"MFI working-capital loan"})}
      ${F("Amount owed","amount",{type:"number",step:"0.01",min:"0",placeholder:"5000",required:!0})}
      ${F("Interest rate","interestRate",{type:"number",step:"0.1",min:"0",placeholder:"20",hint:"% per year",required:!0})}
      ${F("Minimum monthly payment","minMonthlyPayment",{type:"number",step:"0.01",min:"0",placeholder:"500",required:!0})}
      <div class="row span-all">
        <button class="btn" type="submit" id="debt-submit">Add debt</button>
        <button class="btn btn--subtle" type="button" data-action="debt-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${_("Total owed",l(e.totalOwed),`${e.count} debt${e.count===1?"":"s"}`,"pink")}
    ${_("Minimums / month",l(e.totalMinMonthlyPayment),`${f(e.dti)} of income`)}
    ${_("Weighted avg rate",`${e.weightedAverageRate}%`,`highest ${e.highestRate}%`)}
    ${_("Interest / month",l(e.monthlyInterestCost),`${l(c(e.monthlyInterestCost*12))} a year`,"danger")}
  </div>

  <div class="grid grid--2" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Debt-to-income check</h2></div>
        <span class="badge badge--${gt(e.dti)}">${f(e.dti)} of income</span>
      </div>
      <div class="bar-row">
        <span class="bar-row__label">Debt payments</span>
        <span class="bar">
          <span class="bar__fill bar__fill--${gt(e.dti)}" style="width:${Math.min(100,e.dti/o*100).toFixed(1)}%"></span>
        </span>
        <span class="bar-row__value">${f(e.dti)}</span>
      </div>
      <ul class="legend">
        <li><span class="legend__dot" style="background:var(--good)"></span> under ${f(a.dtiWatch)} \u2014 comfortable</li>
        <li><span class="legend__dot" style="background:var(--warn)"></span> ${f(a.dtiWatch)}\u2013${f(a.dtiMax)} \u2014 watch</li>
        <li><span class="legend__dot" style="background:var(--danger)"></span> over ${f(a.dtiMax)} \u2014 over-indebted</li>
      </ul>
      <dl class="kv" style="margin-top:var(--space-4)">
        <dt>Monthly income</dt><dd>${r(l(t.income.monthly))}</dd>
        <dt>Debt payments</dt><dd>${r(l(e.totalMinMonthlyPayment))}</dd>
        <dt>Money left after living costs</dt><dd>${r(l(t.budget.disposableIncome))}</dd>
        <dt>Headroom for debt</dt>
        <dd style="color:${t.budget.disposableIncome-e.totalMinMonthlyPayment>=0?"var(--good)":"var(--danger)"}">
          ${r(l(c(t.budget.disposableIncome-e.totalMinMonthlyPayment)))}
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
        <input class="range" type="range" id="extra-payment" min="0" max="${Math.max(2e3,Math.round(e.totalMinMonthlyPayment*2))}" step="50"
               value="${a.extraDebtPayment}" data-action="extra-payment">
        <div class="row row--between">
          <span class="hint">Total to debt: <strong id="extra-total">${r(l(e.plan.monthlyPool))}</strong> / month</span>
          <strong id="extra-value">${r(l(a.extraDebtPayment))} extra</strong>
        </div>
      </div>

      <hr class="divider">

      ${e.count===0?'<p class="muted small">Add a debt to see a payoff timeline.</p>':e.plan.underfunded?`<p class="debt__note">Your monthly pool of ${r(l(e.plan.monthlyPool))} is below the ${r(l(e.totalMinMonthlyPayment))} in minimum payments, so the balances cannot be cleared. Increase the amount or renegotiate the payments.</p>`:`<dl class="kv">
            <dt>Monthly pool</dt><dd>${r(l(e.plan.monthlyPool))}</dd>
            <dt>Time to clear everything</dt><dd>${r(se(e.plan.months))}</dd>
            <dt>Debt-free</dt><dd>${r(z(e.plan.debtFreeMonth))}</dd>
            <dt>Total interest</dt><dd>${r(l(e.plan.totalInterest))}</dd>
            <dt>Total paid</dt><dd>${r(l(e.plan.totalPaid))}</dd>
          </dl>
          <p class="small muted" style="margin-top:var(--space-3)">
            ${e.plan.alternate.months===null?"The other strategy never clears under this payment.":`Choosing ${e.plan.alternate.strategy==="avalanche"?"highest rate":"smallest balance"} first instead would take
                   ${r(se(e.plan.alternate.months))} and cost ${r(l(e.plan.alternate.totalInterest))} in interest
                   (${e.plan.alternate.totalInterest<=e.plan.totalInterest?"cheaper":`${r(l(c(e.plan.alternate.totalInterest-e.plan.totalInterest)))} more`}).`}
          </p>`}
    </section>
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Warnings</h2></div>
    </div>
    ${vt(t.flags.filter(n=>n.code.startsWith("dti_")||n.code.startsWith("interest_")||n.code==="negative_amortization"||n.code==="debt_shortfall"))}
  </section>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Your debts</h2></div>
      ${e.hasNegativeAmortization?'<span class="badge badge--danger">A minimum payment is not covering interest</span>':""}
    </div>
    ${e.items.length===0?$e("No debts recorded","Add a loan above \u2014 even an informal family loan should be listed so the plan is realistic."):`<div class="grid grid--2">${e.items.map(ia).join("")}</div>`}
  </section>

  ${e.byType.length>0?`<section class="card" style="margin-top:var(--space-4)">
      <div class="card__head"><div class="card__title"><h2>By lending channel</h2></div></div>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr><th>Type</th><th class="num">Debts</th><th class="num">Owed</th><th class="num">Minimums</th><th class="num">Avg rate</th><th class="num">Share of debt</th></tr>
          </thead>
          <tbody>
            ${e.byType.map(n=>`<tr>
                <td><span class="cell-title">${r(Z(n.type))}</span></td>
                <td class="num">${n.count}</td>
                <td class="num">${r(l(n.amount))}</td>
                <td class="num">${r(l(n.minMonthlyPayment))}</td>
                <td class="num">${n.averageRate}%</td>
                <td class="num">${f(e.totalOwed>0?n.amount/e.totalOwed:0)}</td>
              </tr>`).join("")}
          </tbody>
          <tfoot>
            <tr><td>Total</td><td class="num">${e.count}</td><td class="num">${r(l(e.totalOwed))}</td>
            <td class="num">${r(l(e.totalMinMonthlyPayment))}</td><td class="num">${e.weightedAverageRate}%</td><td class="num">100%</td></tr>
          </tfoot>
        </table>
      </div>
    </section>`:""}`}function ia(t){let e=t.severity==="high"?"debt debt--high":t.severity==="warn"?"debt debt--warn":"debt",a=t.payoff.months===null?"danger":t.payoff.months>60?"warn":"good";return`<article class="${e}">
    <div class="debt__top">
      <div>
        <div class="debt__name">${r(t.name)}</div>
        <span class="cell-sub">${r(Z(t.type))}</span>
      </div>
      <div style="text-align:right">
        <div class="debt__amount">${r(l(t.amount))}</div>
        <span class="badge badge--${a==="danger"?"danger":a==="warn"?"warn":"muted"}">${t.interestRate}% a year</span>
      </div>
    </div>

    <div class="debt__facts">
      <div class="fact">
        <span class="fact__label">Minimum</span>
        <span class="fact__value">${r(l(t.minMonthlyPayment))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Interest / month</span>
        <span class="fact__value">${r(l(t.monthlyInterest))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Goes to principal</span>
        <span class="fact__value">${f(t.principalShare)}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Cleared by</span>
        <span class="fact__value">${r(z(t.payoff.payoffMonth))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Time to clear</span>
        <span class="fact__value">${r(se(t.payoff.months))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Total interest</span>
        <span class="fact__value">${r(l(t.payoff.totalInterest))}</span>
      </div>
    </div>

    <div class="bar-row" style="margin-top:var(--space-3)">
      <span class="bar-row__label">Repayment progress</span>
      <span class="bar"><span class="bar__fill bar__fill--${t.negativeAmortization?"danger":"pink"}" style="width:${(t.principalShare*100).toFixed(1)}%"></span></span>
      <span class="bar-row__value">${f(t.principalShare)}</span>
    </div>

    ${t.note?`<p class="debt__note">${r(t.note)}</p>`:""}

    <div class="row row--end" style="margin-top:var(--space-3)">
      <button class="icon-action" data-action="debt-edit" data-id="${r(t.id)}">Edit</button>
      <button class="icon-action icon-action--danger" data-action="debt-delete" data-id="${r(t.id)}">Delete</button>
    </div>
  </article>`}function ra(){let t=q(),e=t.budget,a=p.options,o=e.emergencyFund;return`
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
      <span class="badge badge--${e.remainder>0?"good":"danger"}">
        ${e.remainder>0?`${l(e.remainder)} to allocate`:"Nothing left to allocate"}
      </span>
    </div>

    <div class="flow">
      <div class="flow__step">
        <span class="flow__label">Monthly income<span class="flow__note">${r(la(t.income.type))}${t.income.sources.length?` \xB7 ${t.income.sources.length} source${t.income.sources.length===1?"":"s"}`:""}</span></span>
        <span class="flow__value">${r(l(e.monthlyIncome))}</span>
      </div>
      <div class="flow__step flow__step--minus">
        <span class="flow__label">\u2212 Living expenses<span class="flow__note">fixed ${r(l(e.totalFixedExpenses))} + variable ${r(l(e.totalVariableExpenses))}</span></span>
        <span class="flow__value">\u2212${r(l(e.totalExpenses))}</span>
      </div>
      <div class="flow__step flow__step--total">
        <span class="flow__label">= Disposable income<span class="flow__note">what is left before any debt payment</span></span>
        <span class="flow__value" style="color:${e.disposableIncome<0?"var(--danger)":"inherit"}">${r(l(e.disposableIncome))}</span>
      </div>
      <div class="flow__step flow__step--minus">
        <span class="flow__label">\u2212 Debt carve-out<span class="flow__note">minimums ${r(l(e.totalMinDebtPayments))}${a.extraDebtPayment>0?` + extra ${r(l(a.extraDebtPayment))}`:""}</span></span>
        <span class="flow__value">\u2212${r(l(e.debtCarveOut))}</span>
      </div>
      ${e.debtShortfall>0?`<div class="flow__step flow__step--minus">
              <span class="flow__label">Shortfall<span class="flow__note">your income cannot cover the debt payments \u2014 this has to be solved first</span></span>
              <span class="flow__value" style="color:var(--danger)">${r(l(e.debtShortfall))}</span>
            </div>`:""}
      <div class="flow__step flow__step--final">
        <span class="flow__label">Remainder to allocate<span class="flow__note">${f(e.remainderShare)} of income</span></span>
        <span class="flow__value">${r(l(e.remainder))}</span>
      </div>
    </div>

    <hr class="divider">

    <div class="grid grid--3">
      ${Je("Emergency fund",e.emergencyAllocation,e.allocations[0].weight,e.allocations[0].rationale,"deep")}
      ${Je("Goals",e.goalsAllocation,e.allocations[1].weight,e.allocations[1].rationale,"info")}
      ${Je("Flexible spending",e.flexibleAllocation,e.allocations[2].weight,e.allocations[2].rationale,"pink")}
    </div>

    <div style="margin-top:var(--space-4)">
      ${$t(e)}
    </div>
  </section>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Emergency fund</h2></div>
        <span class="badge badge--${o.fullyFunded?"good":"warn"}">
          ${o.fullyFunded?"Fully funded":`${Math.round(o.fundedRatio*100)}% funded`}
        </span>
      </div>

      <div class="bar-row">
        <span class="bar-row__label">Saved</span>
        <span class="bar"><span class="bar__fill bar__fill--${o.fullyFunded?"good":"deep"}" style="width:${(o.fundedRatio*100).toFixed(1)}%"></span></span>
        <span class="bar-row__value">${r(l(o.saved))} / ${r(l(o.target))}</span>
      </div>

      <dl class="kv" style="margin-top:var(--space-4)">
        <dt>Target</dt><dd>${r(l(o.target))} <span class="muted small">(${a.emergencyMonths} months of costs)</span></dd>
        <dt>Still needed</dt><dd>${r(l(o.gap))}</dd>
        <dt>Months of cover</dt><dd>${o.monthsCovered}</dd>
        <dt>Monthly allocation</dt><dd>${r(l(o.monthlyAllocation))}</dd>
        <dt>Fully funded by</dt><dd>${o.fullyFunded?"already done":r(z(o.fundedMonth))}</dd>
      </dl>

      ${o.fullyFunded?`<p class="debt__note">The buffer is complete. $honchoy now sends most of the remainder to goals and spending, keeping only ${f(e.allocations[0].weight)} as a top-up.</p>`:`<p class="debt__note">Until the buffer is full it takes ${f(e.allocations[0].weight)} of the remainder \u2014 the largest share. That share shrinks automatically as the balance grows.</p>`}
    </section>

    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Income sources</h2></div>
      </div>
      <form class="form-grid" id="income-form" autocomplete="off">
        ${ve("Income is stated","type",[{value:"monthly",label:"Per month"},{value:"weekly",label:"Per week"},{value:"biweekly",label:"Every 2 weeks"},{value:"annual",label:"Per year"}],p.data.income.type)}
        ${F("Source name","sourceName",{placeholder:"salary"})}
        ${F("Amount","sourceAmount",{type:"number",step:"0.01",min:"0",placeholder:"20000",hint:"before deductions, as you receive it"})}
        <div class="row span-all">
          <button class="btn btn--sm" type="submit">Add source</button>
        </div>
      </form>

      <hr class="divider">

      ${t.income.sources.length===0?'<p class="muted small">No income recorded yet \u2014 the planner needs at least one source.</p>':`<ul class="items">
          ${t.income.sources.map((n,i)=>`<li>
              <div class="items__main">
                <span class="cell-title">${r(n.name)}</span>
                <span class="cell-sub">${r(l(n.amount))} ${r(p.data.income.type)} \xB7 ${f(n.share)} of income</span>
              </div>
              <div class="items__side">
                <strong class="tabnum">${r(l(n.monthlyAmount))}</strong>
                <button class="icon-action icon-action--danger" data-action="income-delete" data-idx="${i}">Remove</button>
              </div>
            </li>`).join("")}
        </ul>
        <p class="small muted" style="margin-top:var(--space-3)">
          Monthly total: <strong>${r(l(t.income.monthly))}</strong> \xB7 yearly <strong>${r(l(t.income.annual))}</strong>
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
      ${t.recommendations.map(n=>`<li>${r(n)}</li>`).join("")||"<li>Add income, expenses and debt to generate a plan.</li>"}
    </ol>
  </section>`}function la(t){return{monthly:"monthly",weekly:"weekly",biweekly:"every 2 weeks",annual:"yearly"}[t]}function Je(t,e,a,o,n){let i=q(),d=i.budget.remainder>0?e/i.budget.remainder*100:0;return`<article class="stat">
    <span class="stat__label">${r(t)}</span>
    <span class="stat__value stat__value--${n==="pink"?"pink":"good"}">${r(l(e))}</span>
    <div class="bar" style="margin:var(--space-3) 0 var(--space-2)">
      <span class="bar__fill bar__fill--${n==="deep"?"pink":n==="info"?"info":"good"}" style="width:${d.toFixed(1)}%"></span>
    </div>
    <span class="stat__meta">${f(a)} of the remainder \xB7 ${r(o)}</span>
  </article>`}function da(){let t=q(),e=t.budget,a=p.data.goals.reduce((n,i)=>n+i.cost,0),o=p.data.goals.reduce((n,i)=>n+i.saved,0);return`
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
      ${F("Goal name","name",{placeholder:"Sewing machine",required:!0})}
      ${F("Target cost","cost",{type:"number",step:"0.01",min:"0",placeholder:"15000",required:!0})}
      ${F("Already saved","saved",{type:"number",step:"0.01",min:"0",placeholder:"3000"})}
      ${ve("Type","type",[{value:"custom",label:"Custom goal"},{value:"emergency_fund",label:"Emergency fund"}],"custom")}
      <div class="row span-all">
        <button class="btn" type="submit" id="goal-submit">Add goal</button>
        <button class="btn btn--subtle" type="button" data-action="goal-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${_("Goals tracked",String(p.data.goals.length),`${l(a)} in total`)}
    ${_("Saved so far",l(o),`${f(a>0?o/a:0)} of all targets`)}
    ${_("Monthly to goals",l(e.goalsAllocation),`+ ${l(e.emergencyAllocation)} to buffer`)}
    ${_("Next finish line",ca(t),"at the current allocation")}
  </div>

  <section class="card" style="margin-top:var(--space-4)">
    <div class="card__head">
      <div class="card__title"><h2>Saving queue</h2></div>
      <span class="badge">Funded in order</span>
    </div>
    ${t.goals.length===0?$e("No goals yet","Add a goal above \u2014 a concrete target makes the monthly allocation easier to keep."):`<div class="stack">${t.goals.map(ma).join("")}</div>`}
  </section>`}function ca(t){let e=t.goals.find(a=>!a.completed);return e?e.fundedMonth?z(e.fundedMonth):"\u2014":t.goals.length===0?"\u2014":"all done"}function ma(t){let e=t.completed?"good":t.type==="emergency_fund"?"deep":"pink";return`<article class="debt">
    <div class="debt__top">
      <div>
        <div class="debt__name">${r(t.name)}</div>
        <span class="cell-sub">
          ${t.type==="emergency_fund"?"Emergency fund":"Custom goal"} \xB7
          ${r(l(t.saved))} of ${r(l(t.cost))}
        </span>
      </div>
      <div style="text-align:right">
        <div class="debt__amount">${f(t.progress)}</div>
        <span class="badge badge--${t.completed?"good":"muted"}">
          ${t.completed?"Funded":t.fundedMonth?r(z(t.fundedMonth)):"no allocation"}
        </span>
      </div>
    </div>

    <div class="bar-row">
      <span class="bar-row__label">Progress</span>
      <span class="bar"><span class="bar__fill bar__fill--${e==="good"?"good":"pink"}" style="width:${(t.progress*100).toFixed(1)}%"></span></span>
      <span class="bar-row__value">${f(t.progress)}</span>
    </div>

    <div class="debt__facts">
      <div class="fact">
        <span class="fact__label">Still needed</span>
        <span class="fact__value">${r(l(t.remaining))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Time to fund</span>
        <span class="fact__value">${r(se(t.monthsToFund))}</span>
      </div>
      <div class="fact">
        <span class="fact__label">Own months</span>
        <span class="fact__value">${r(se(t.ownMonths))}</span>
      </div>
    </div>

    <div class="row row--end" style="margin-top:var(--space-3)">
      <button class="icon-action" data-action="goal-edit" data-id="${r(t.id)}">Edit</button>
      <button class="icon-action icon-action--danger" data-action="goal-delete" data-id="${r(t.id)}">Delete</button>
    </div>
  </article>`}function ua(){let t=q(),e=t.spending,a=p.data.logs.map((n,i)=>({entry:n,idx:i})).sort((n,i)=>i.entry.date.localeCompare(n.entry.date)),o=a.reduce((n,i)=>Math.max(n,Math.abs(i.entry.amount)),0);return`
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Spending log</h1>
        <p class="card__hint">
          Log what you actually spend. $honchoy compares your run-rate against the flexible-spending
          allowance from the plan, so overspending shows up early instead of at month end.
        </p>
      </div>
      <span class="badge badge--${e.onTrack?"good":"warn"}">${e.onTrack?"On plan":"Above plan"}</span>
    </div>

    <form class="form-grid" id="log-form" data-mode="create" data-idx="" autocomplete="off">
      ${F("Date","date",{type:"date",value:Re(),required:!0})}
      ${F("Amount","amount",{type:"number",step:"0.01",placeholder:"1000",required:!0,hint:"positive = money out, negative = money in"})}
      ${F("Note","note",{placeholder:"Groceries"})}
      <div class="row span-all">
        <button class="btn" type="submit" id="log-submit">Add entry</button>
        <button class="btn btn--subtle" type="button" data-action="log-cancel" hidden>Cancel edit</button>
      </div>
    </form>
  </section>

  <div class="grid grid--4" style="margin-top:var(--space-4)">
    ${_("Logged this month",l(e.currentMonthTotal),`${e.entries} entr${e.entries===1?"y":"ies"} in total`)}
    ${_("Daily average",l(e.dailyAverage),"trailing 30 days")}
    ${_("Projected month",l(e.projectedMonthTotal),`allowance ${l(e.allowance)}`,e.onTrack?void 0:"danger")}
    ${_(e.overUnder>=0?"Over plan by":"Under plan by",l(Math.abs(e.overUnder)),e.onTrack?"inside the plan":"trim spending or raise income",e.overUnder>=0?"danger":"good")}
  </div>

  <div class="grid grid--sidebar" style="margin-top:var(--space-4)">
    <section class="card">
      <div class="card__head">
        <div class="card__title"><h2>Entries</h2></div>
        <span class="muted small">${l(e.totalLogged)} logged all time</span>
      </div>
      ${a.length===0?$e("Nothing logged yet","Add today\u2019s spending above \u2014 a few days of entries is enough to see a trend."):`<ul class="items">
          ${a.map(({entry:n,idx:i})=>`<li>
              <div class="items__main">
                <span class="cell-title">${r(n.note||"Spending")}</span>
                <span class="cell-sub">${r(n.date)}</span>
              </div>
              <div class="items__side">
                <strong class="tabnum" style="color:${n.amount<0?"var(--good)":"inherit"}">${r(l(n.amount))}</strong>
                <button class="icon-action" data-action="log-edit" data-idx="${i}">Edit</button>
                <button class="icon-action icon-action--danger" data-action="log-delete" data-idx="${i}">Delete</button>
              </div>
            </li>`).join("")}
        </ul>`}
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>Pace</h2></div></div>
      ${_t(t)}
      <hr class="divider">
      <div class="card__title"><h3>Largest entries</h3></div>
      <div style="margin-top:var(--space-3)">
        ${a.length===0?'<p class="muted small">No entries yet.</p>':a.map(({entry:n})=>n).sort((n,i)=>i.amount-n.amount).slice(0,6).map(n=>Ce(n.note||n.date,Math.abs(n.amount),o||1,"deep",l(n.amount))).join("")}
      </div>
    </section>
  </div>`}function pa(){let t=q(),e=JSON.stringify(p.data,null,2);return`
  <section class="card">
    <div class="card__head">
      <div>
        <h1>Data &amp; settings</h1>
        <p class="card__hint">
          Your plan lives in this browser only \u2014 nothing is uploaded anywhere. Export a JSON copy to
          back it up or move it to another device, and import it back any time.
        </p>
      </div>
      <span class="badge badge--${le?"good":"warn"}">
        ${le?"Saved on this device":"Local storage unavailable"}
      </span>
    </div>

    <div class="grid grid--4">
      <div class="field">
        <label for="data-currency">Currency</label>
        <select class="select" id="data-currency" data-option="currency">
          ${ft.map(a=>`<option value="${a}"${p.data.user.currency===a?" selected":""}>${a}</option>`).join("")}
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
      <textarea class="textarea" id="data-json" readonly rows="18" aria-label="Current data as JSON">${r(e)}</textarea>
    </section>

    <section class="card">
      <div class="card__head"><div class="card__title"><h2>About $honchoy</h2></div></div>
      <p class="small">
        Version 1.0.0 \xB7 engine <code class="mono">computeFinancials()</code>, generated
        ${r(new Date(t.generatedAt).toLocaleString())}.
      </p>
      <dl class="kv">
        <dt>Income</dt><dd>${r(l(t.income.monthly))} / month</dd>
        <dt>Expenses</dt><dd>${r(l(t.expenses.total))} / month</dd>
        <dt>Debt owed</dt><dd>${r(l(t.debts.totalOwed))}</dd>
        <dt>Remainder</dt><dd>${r(l(t.budget.remainder))} / month</dd>
      </dl>
      <hr class="divider">
      <p class="small muted">
        $honchoy is an educational planning tool. It is not a lender, not a licensed adviser and not
        a substitute for reading your own loan contracts.
      </p>
    </section>
  </div>`}function ga(){let t=h("#nav");t&&(t.innerHTML=bt.map(e=>`<a href="#/${e.id}"${p.route===e.id?' aria-current="page"':""}>
        <span aria-hidden="true">${e.icon}</span>${r(e.label)}
      </a>`).join(""))}function ha(){let t=h("#currency-select");t&&(t.options.length===0&&(t.innerHTML=ft.map(e=>`<option value="${e}">${e}</option>`).join("")),t.value=p.data.user.currency||"USD")}function qe(){let t=h("#app");if(!t)return;ga(),ha();let e={dashboard:ta,expenses:sa,debts:oa,budget:ra,goals:da,log:ua,data:pa};t.innerHTML=e[p.route]()}function Ye(t){return p.data.expenses.find(e=>e.id===t)}function ze(t){return p.data.debts.find(e=>e.id===t)}function wt(){let t=h("#expense-form");if(!t)return;t.reset(),t.dataset.mode="create",t.dataset.id="";let e=h("#expense-submit");e&&(e.textContent="Add expense");let a=h('[data-action="expense-cancel"]');a&&(a.hidden=!0)}function xt(){let t=h("#debt-form");if(!t)return;t.reset(),t.dataset.mode="create",t.dataset.id="";let e=h("#debt-submit");e&&(e.textContent="Add debt");let a=h('[data-action="debt-cancel"]');a&&(a.hidden=!0)}function Mt(){let t=h("#goal-form");if(!t)return;t.reset(),t.dataset.mode="create",t.dataset.id="";let e=h("#goal-submit");e&&(e.textContent="Add goal");let a=h('[data-action="goal-cancel"]');a&&(a.hidden=!0)}function St(){let t=h("#log-form");if(!t)return;t.reset(),t.dataset.mode="create",t.dataset.idx="";let e=t.querySelector('[name="date"]');e&&(e.value=Re());let a=h("#log-submit");a&&(a.textContent="Add entry");let o=h('[data-action="log-cancel"]');o&&(o.hidden=!0)}function Dt(){let t=location.hash.replace(/^#\/?/,"")||"dashboard";return bt.some(e=>e.id===t)?t:"dashboard"}window.addEventListener("hashchange",()=>{p.route=Dt(),qe(),window.scrollTo({top:0})});document.addEventListener("submit",t=>{let e=t.target;if(!e?.id)return;let a=new FormData(e),o=n=>{let i=Number.parseFloat(String(a.get(n)??""));return Number.isFinite(i)?i:0};switch(e.id){case"expense-form":{t.preventDefault();let n={category:String(a.get("category")??"other").toLowerCase(),name:String(a.get("name")??"").trim()||"Expense",amount:c(o("amount")),type:a.get("type")==="variable"?"variable":"fixed"};if(n.amount<=0)return y("Enter an amount greater than zero.");if(e.dataset.mode==="edit"&&e.dataset.id){let d=Ye(e.dataset.id);d&&Object.assign(d,n),y("Expense updated.")}else p.data.expenses.push({...n,id:re("e")}),y("Expense added.");wt(),T();return}case"debt-form":{t.preventDefault();let n={type:a.get("type")??"bank_loan",name:String(a.get("name")??"").trim()||void 0,amount:c(o("amount")),interestRate:c(o("interestRate")),minMonthlyPayment:c(o("minMonthlyPayment"))};if(n.amount<=0)return y("Enter how much is still owed.");if(e.dataset.mode==="edit"&&e.dataset.id){let d=ze(e.dataset.id);d&&Object.assign(d,n),y("Debt updated.")}else p.data.debts.push({...n,id:re("d")}),y("Debt added.");xt(),T();return}case"goal-form":{t.preventDefault();let n={id:re("g"),name:String(a.get("name")??"").trim()||"Goal",cost:c(o("cost")),saved:c(o("saved")),type:a.get("type")==="emergency_fund"?"emergency_fund":"custom"};if(n.cost<=0)return y("Enter a target cost.");if(e.dataset.mode==="edit"&&e.dataset.id){let d=p.data.goals.find(g=>g.id===e.dataset.id);d&&Object.assign(d,n,{id:d.id}),y("Goal updated.")}else n.type==="emergency_fund"&&(p.data.goals=p.data.goals.map(d=>d.type==="emergency_fund"?{...d,type:"custom"}:d)),p.data.goals.push(n),y("Goal added.");Mt(),T();return}case"log-form":{t.preventDefault();let n={date:String(a.get("date")??Re()),amount:c(o("amount")),note:String(a.get("note")??"").trim()};if(n.amount===0)return y("Enter an amount.");let i=Number(e.dataset.idx);e.dataset.mode==="edit"&&Number.isInteger(i)&&p.data.logs[i]?(p.data.logs[i]=n,y("Entry updated.")):(p.data.logs.push(n),y("Entry added.")),St(),T();return}case"income-form":{t.preventDefault();let n=String(a.get("sourceName")??"").trim()||"Income",i=c(o("sourceAmount"));p.data.income.type=a.get("type")??"monthly",i>0?(p.data.income.sources.push({name:n,amount:i}),y(`Added ${n}.`)):y("Amount must be greater than zero."),e.reset(),T();return}}});document.addEventListener("click",async t=>{let e=t.target?.closest("[data-action]");if(!e)return;let a=e.dataset.action,o=e.dataset.id??"",n=p.data;switch(a){case"expense-edit":{let i=Ye(o),d=h("#expense-form");if(!i||!d)return;d.dataset.mode="edit",d.dataset.id=o,I(d,"name",i.name),I(d,"category",i.category),I(d,"amount",String(i.amount)),I(d,"type",i.type);let g=h("#expense-submit");g&&(g.textContent="Save expense");let b=h('[data-action="expense-cancel"]');b&&(b.hidden=!1),d.scrollIntoView({behavior:"smooth",block:"center"}),d.querySelector('[name="name"]')?.focus();return}case"expense-cancel":wt();return;case"expense-delete":{let i=Ye(o);i&&confirm(`Delete \u201C${i.name}\u201D?`)&&(n.expenses=n.expenses.filter(d=>d.id!==o),y("Expense deleted."),T());return}case"debt-edit":{let i=ze(o),d=h("#debt-form");if(!i||!d)return;d.dataset.mode="edit",d.dataset.id=o,I(d,"type",i.type),I(d,"name",i.name??""),I(d,"amount",String(i.amount)),I(d,"interestRate",String(i.interestRate)),I(d,"minMonthlyPayment",String(i.minMonthlyPayment));let g=h("#debt-submit");g&&(g.textContent="Save debt");let b=h('[data-action="debt-cancel"]');b&&(b.hidden=!1),d.scrollIntoView({behavior:"smooth",block:"center"});return}case"debt-cancel":xt();return;case"debt-delete":{let i=ze(o);i&&confirm(`Delete \u201C${i.name||Z(i.type)}\u201D?`)&&(n.debts=n.debts.filter(d=>d.id!==o),y("Debt deleted."),T());return}case"strategy":{p.options.strategy=e.dataset.value==="snowball"?"snowball":"avalanche",y(p.options.strategy==="avalanche"?"Clearing highest-rate debts first.":"Clearing smallest balances first."),T();return}case"goal-edit":{let i=n.goals.find(u=>u.id===o),d=h("#goal-form");if(!i||!d)return;d.dataset.mode="edit",d.dataset.id=o,I(d,"name",i.name),I(d,"cost",String(i.cost)),I(d,"saved",String(i.saved)),I(d,"type",i.type);let g=h("#goal-submit");g&&(g.textContent="Save goal");let b=h('[data-action="goal-cancel"]');b&&(b.hidden=!1),d.scrollIntoView({behavior:"smooth",block:"center"});return}case"goal-cancel":Mt();return;case"goal-delete":{let i=n.goals.find(d=>d.id===o);i&&confirm(`Delete \u201C${i.name}\u201D?`)&&(n.goals=n.goals.filter(d=>d.id!==o),y("Goal deleted."),T());return}case"log-edit":{let i=Number(e.dataset.idx),d=n.logs[i],g=h("#log-form");if(!d||!g)return;g.dataset.mode="edit",g.dataset.idx=String(i),I(g,"date",d.date),I(g,"amount",String(d.amount)),I(g,"note",d.note??"");let b=h("#log-submit");b&&(b.textContent="Save entry");let u=h('[data-action="log-cancel"]');u&&(u.hidden=!1),g.scrollIntoView({behavior:"smooth",block:"center"});return}case"log-cancel":St();return;case"log-delete":{let i=Number(e.dataset.idx);Number.isInteger(i)&&n.logs[i]&&confirm("Delete this log entry?")&&(n.logs.splice(i,1),y("Entry deleted."),T());return}case"income-delete":{let i=Number(e.dataset.idx);Number.isInteger(i)&&n.income.sources[i]&&(n.income.sources.splice(i,1),y("Income source removed."),T());return}case"export-download":Kt(`honchoy-${Re()}.json`,JSON.stringify(n,null,2)),y("Downloaded your data.");return;case"export-copy":y(await pt(JSON.stringify(n,null,2))?"Copied to clipboard.":"Copy failed \u2014 use Download instead.");return;case"share-link":{let i=`${location.origin}${location.pathname}?d=${encodeURIComponent(JSON.stringify(n))}`;y(await pt(i)?"Share link copied.":"Could not copy the link.");return}case"import-open":Vt("Import a $honchoy plan",`<p class="small muted">Paste an exported JSON snapshot below.</p>
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
         </div>`);return;case"import-run":{let i=h("#import-json"),d=h("#import-file")?.files?.[0],g=b=>new Promise((u,w)=>{let U=new FileReader;U.onload=()=>u(String(U.result??"")),U.onerror=()=>w(new Error("read failed")),U.readAsText(b)});try{let b=d?await g(d):String(i?.value??"");if(!b.trim())return y("Nothing to import.");let u=be(JSON.parse(b));p.data=Fe(u),Le(),y("Plan imported."),T()}catch{y("That JSON could not be read.")}return}case"load-sample":confirm("Replace your current plan with the sample data?")&&(p.data=Fe(JSON.parse(JSON.stringify(Be))),y("Sample data loaded."),T());return;case"wipe":confirm("Delete every expense, debt, goal and log entry? This cannot be undone.")&&(p.data=Fe(Ge()),y("All data cleared."),T());return;case"options-reset":p.options={...fe},y("Plan settings reset."),T();return;case"modal-close":Le();return}});document.addEventListener("input",t=>{let e=t.target;if(e?.dataset){if(e.dataset.action==="extra-payment"){let a=Number(e.value)||0;p.options.extraDebtPayment=a;let o=h("#extra-value");o&&(o.textContent=`${l(a)} extra`);let n=h("#extra-total");n&&(n.textContent=`${l(q().debts.totalMinMonthlyPayment+a)} / month`);return}if(e.dataset.option){Tt(e.dataset.option,e);return}}});document.addEventListener("change",t=>{let e=t.target;if(e?.dataset){if(e.dataset.action==="extra-payment"){p.options.extraDebtPayment=Math.max(0,Number(e.value)||0),T();return}if(e.dataset.option){Tt(e.dataset.option,e),T();return}e.id==="currency-select"&&(p.data.user.currency=e.value,y(`Currency set to ${e.value}.`),T())}});function Tt(t,e){let a=p.data,o=Number(e.value);switch(t){case"currency":a.user.currency=e.value;return;case"language":a.user.language=e.value;return;case"ageConfirmed":a.user.ageConfirmed=e.checked;return;case"extraDebtPayment":p.options.extraDebtPayment=Math.max(0,Number.isFinite(o)?o:0);return;case"emergencyMonths":p.options.emergencyMonths=Math.min(24,Math.max(1,Math.round(o)||3));return;case"dtiWatchPct":p.options.dtiWatch=Math.min(.6,Math.max(.05,(o||30)/100));return;case"dtiMaxPct":p.options.dtiMax=Math.min(.8,Math.max(.1,(o||40)/100));return;case"highInterestWarn":p.options.highInterestWarn=Math.max(1,o||25);return;case"highInterestDanger":p.options.highInterestDanger=Math.max(1,o||40);return}}function I(t,e,a){let o=t.elements.namedItem(e);o&&(o.value=a)}h("#modal-close")?.addEventListener("click",Le);h("#modal")?.addEventListener("click",t=>{t.target===h("#modal")&&Le()});function ya(){let{data:t,options:e}=Zt();p.data=t,p.options=e,p.route=Dt(),p.analysis=Pe({data:t,options:e});let a=h("#storage-banner");a&&(a.hidden=le),qe()}ya();window.honchoy={state:p,computeFinancials:Pe,get analysis(){return p.analysis}};
