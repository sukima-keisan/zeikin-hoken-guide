// 給料から引かれるお金の計算（ブラウザでも node でも動く）
// 計算のやり方は「すき間計算」（https://sukima-keisan.github.io/tedori.html）の手取り計算と同じにしている。
//  - 健康保険: 協会けんぽ 令和8年度（2026年3月分から）の都道府県別料率
//  - 子ども・子育て支援金: 0.23%（2026年4月分から）
//  - 厚生年金: 18.3%  - 介護保険: 1.62%（40〜64歳）  - 雇用保険（一般の事業・労働者負担）: 0.5%（2026年4月から）
//  - 本人負担の端数: 50銭以下は切り捨て、50銭をこえると切り上げ
//  - 所得税: 国税庁 令和8年分 月額表 甲欄（getsugaku-r8.js）
(function (g) {
  // 協会けんぽ 令和8年度 健康保険料率（介護を含まない・会社と本人の合計%）
  const PREF = [['北海道',10.28],['青森県',9.85],['岩手県',9.51],['宮城県',10.10],['秋田県',10.01],['山形県',9.75],['福島県',9.50],['茨城県',9.52],['栃木県',9.82],['群馬県',9.68],['埼玉県',9.67],['千葉県',9.73],['東京都',9.85],['神奈川県',9.92],['新潟県',9.21],['富山県',9.59],['石川県',9.70],['福井県',9.71],['山梨県',9.55],['長野県',9.63],['岐阜県',9.80],['静岡県',9.61],['愛知県',9.93],['三重県',9.77],['滋賀県',9.88],['京都府',9.89],['大阪府',10.13],['兵庫県',10.12],['奈良県',9.91],['和歌山県',10.06],['鳥取県',9.86],['島根県',9.94],['岡山県',10.05],['広島県',9.78],['山口県',10.15],['徳島県',10.24],['香川県',10.02],['愛媛県',9.98],['高知県',10.05],['福岡県',10.11],['佐賀県',10.55],['長崎県',10.06],['熊本県',10.08],['大分県',10.08],['宮崎県',9.77],['鹿児島県',10.13],['沖縄県',9.44]];
  const RATE = { kaigo: 1.62, kodomo: 0.23, nenkin: 18.3, koyo: 0.005 };

  // 標準報酬月額（健康保険50等級。厚生年金は8.8万〜65万円）
  const GRADES=[58000,68000,78000,88000,98000,104000,110000,118000,126000,134000,142000,150000,160000,170000,180000,190000,200000,220000,240000,260000,280000,300000,320000,340000,360000,380000,410000,440000,470000,500000,530000,560000,590000,620000,650000,680000,710000,750000,790000,830000,880000,930000,980000,1030000,1090000,1150000,1210000,1270000,1330000,1390000];
  const BOUNDS=[63000,73000,83000,93000,101000,107000,114000,122000,130000,138000,146000,155000,165000,175000,185000,195000,210000,230000,250000,270000,290000,310000,330000,350000,370000,395000,425000,455000,485000,515000,545000,575000,605000,635000,665000,695000,730000,770000,810000,855000,905000,955000,1005000,1055000,1115000,1175000,1235000,1295000,1355000];
  function hyojun(m){let i=0;while(i<BOUNDS.length&&m>=BOUNDS[i])i++;return GRADES[i]}
  function half(x){return Math.ceil(Math.round(x*100)/100-0.5)}

  // 月額表 甲欄。範囲外（74万円以上）は null
  function gensen(afterShaho, fuyo) {
    const T = g.GETSUGAKU_R8 || (typeof require !== 'undefined' ? require('./getsugaku-r8.js') : null);
    if (afterShaho < 105000) return 0;
    fuyo = Math.min(7, Math.max(0, fuyo | 0));
    for (const r of T) if (afterShaho >= r[0] && afterShaho < r[1]) return r[2 + fuyo];
    return null;
  }

  // 給与所得の金額（2026年分。国税庁 No.1410）
  function kyuyoShotoku(s){if(s<741000)return 0;if(s<2191000)return s-740000;if(s<2193000)return 1451000;if(s<2196000)return 1453000;if(s<2200000)return 1456000;if(s<3600000)return Math.floor(s/4000)*2800-80000;if(s<6600000)return Math.floor(s/4000)*3200-440000;if(s<8500000)return Math.floor(s*9/10)-1100000;return s-1950000}

  // 住民税（1年分の目安）。毎月同じ給料が12か月・ボーナスなし・扶養なしとして計算
  function juminzeiNen(monthly, shahoMonth) {
    const pay = monthly * 12, g2 = kyuyoShotoku(pay), sh = shahoMonth * 12;
    if (g2 <= 450000) return 0; // 非課税の目安（1級地・単身）
    const t = Math.max(0, Math.floor((g2 - 430000 - sh) / 1000) * 1000);
    const adj = t <= 2000000 ? Math.min(50000, t) * 0.05 : Math.max(50000 - (t - 2000000), 50000) * 0.05;
    return Math.max(0, Math.floor((t * 0.10 - adj) / 100) * 100) + 5000; // 均等割（森林環境税をふくむ）5,000円
  }

  // 1か月の給料明細の例
  function meisai(o) {
    const salary = o.salary, kr = o.kenpoRate + (o.over40 ? RATE.kaigo : 0);
    const H = hyojun(salary), P = Math.min(650000, Math.max(88000, H));
    const kenpo = half(H * kr / 200);           // 健康保険（40歳以上は介護保険をふくむ）
    const kodomo = half(H * RATE.kodomo / 200);  // 子ども・子育て支援金
    const nenkin = half(P * RATE.nenkin / 200);  // 厚生年金
    const koyo = half(salary * RATE.koyo);       // 雇用保険
    const shaho = kenpo + kodomo + nenkin + koyo;
    const after = salary - shaho;
    const shotoku = gensen(after, o.fuyo || 0);
    const nen = juminzeiNen(salary, shaho);
    const jumin = o.juminzei ? Math.floor(nen / 12 / 100) * 100 : 0; // 6月以外の月の額
    const kojo = shaho + (shotoku || 0) + jumin;
    return { salary, H, P, kenpo, kodomo, nenkin, koyo, shaho, after, shotoku, juminNen: nen, jumin, kojo, tedori: salary - kojo };
  }

  const api = { PREF, RATE, hyojun, gensen, kyuyoShotoku, juminzeiNen, meisai };
  g.ZeiCalc = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
