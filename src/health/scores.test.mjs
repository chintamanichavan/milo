import {
  addDays,
  awards,
  compare,
  miloAge,
  scoreAll,
  sleepDebt,
  sleepNeed,
  squash,
  strainOf,
  strainTarget,
  timeInZones,
  trend,
  vitals,
  zoneOf,
} from './scores.ts';

let bad = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`, ok ? '' : `\n  got ${JSON.stringify(got)}\n want ${JSON.stringify(want)}`);
};
const S = { age: 27, sex: 'male', maxHr: 193, needH: 8 };
const days = (n, make, from = '2026-01-01') => Array.from({ length: n }, (_, i) => ({ date: addDays(from, i), ...make(i) }));
const steady = (i) => ({ hrv: 60 + (i % 3) - 1, rhr: 55 + (i % 2), resp: 14.5, asleep: 450, inBed: 480, bed: -60, wake: 390 });

// strain: logarithmic, saturating at 21
t('no load, no strain', strainOf(0), 0);
t('load 600 is 21', strainOf(600), 21);
t('never past 21', strainOf(100000), 21);
t('45 min in zone 3 is about 12.5', strainOf(135), 12.5);
t('the first 100 load points move it more than the next 100', strainOf(100) - strainOf(0) > strainOf(200) - strainOf(100), true);

// recovery squash and zones
t('a typical day is 59', squash(0), 59);
t('one sd better is 88', squash(1), 88);
t('one sd worse is 22', squash(-1), 22);
t('67 is primed', zoneOf(67), 'good');
t('66 is adequate', zoneOf(66), 'caution');
t('33 is take it easy', zoneOf(33), 'serious');
t('strain target when primed', strainTarget(80), [14, 18]);
t('strain target when low', strainTarget(20), [4, 8]);
t('strain target with no score', strainTarget(null), [10, 14]);

// sleep
t('need is the base on an easy, rested day', sleepNeed(480, 0, 8), 480);
t('debt and strain add to need', sleepNeed(480, 120, 14), 526);
t('debt repayment caps at 90', sleepNeed(480, 1000, 0), 570);
t('strain adjustment caps at 45', sleepNeed(480, 0, 30), 525);
t('two short nights make 120 of debt', sleepDebt([420, 420, undefined], 480), 120);
t('a long night pays it back', sleepDebt([420, 540], 480), 0);
t('debt is never below zero', sleepDebt([600, 600], 480), 0);

// heart-rate zones
t('time in zones', timeInZones({ durMin: 3, hr: [[0, 100], [60, 140], [120, 180]] }, 200), [60, 0, 60, 0, 60]);

// recovery from a steady month
const month = days(40, steady);
const base = scoreAll(month, [], S);
t('no baseline on day one', base.get('2026-01-01').recovery, null);
const last = base.get('2026-02-09');
t('a steady day scores near typical', Math.abs(last.recovery - 59) <= 12, true);
t('four inputs once there is history', last.inputs.length, 4);
const good = scoreAll([...month.slice(0, 39), { ...month[39], hrv: 80, rhr: 50 }], [], S).get('2026-02-09').recovery;
const poor = scoreAll([...month.slice(0, 39), { ...month[39], hrv: 40, rhr: 62, resp: 17 }], [], S).get('2026-02-09').recovery;
t('high HRV and low RHR is primed', zoneOf(good), 'good');
t('low HRV, high RHR and odd breathing is take it easy', zoneOf(poor), 'serious');
t('same input, same answer', JSON.stringify(scoreAll(month, [], S).get('2026-02-09')), JSON.stringify(last));
const withRun = scoreAll(month, [{ id: '1', type: 'Running', start: 0, date: '2026-02-09', durMin: 45, kcal: 450, hr: Array.from({ length: 46 }, (_, i) => [i * 60, 150]) }], S);
t('a 45-minute run at 150 bpm is a moderate day', withRun.get('2026-02-09').strain, 12.5);
// 7.5 h a night against 8 builds two weeks of debt, so the need is 8 h + 90 min of repayment
t('sleep performance', last.perf, Math.round((450 / 570) * 100));
t('efficiency', last.efficiency, 94);

// vitals flag only past 1.5 sd
t('a usual RHR is not flagged', vitals(month, '2026-02-09').find((v) => v.key === 'rhr').flag, null);
t('a high RHR is', vitals([...month.slice(0, 39), { ...month[39], rhr: 63 }], '2026-02-09').find((v) => v.key === 'rhr').flag, 'high');

// trends
const year = days(365, (i) => ({ steps: i >= 275 ? 11000 : 10000 }));
t('steps up 10% in the last 90 days', trend(year, year[364].date, 'steps').dir, 'up');
const flat = days(365, () => ({ steps: 10000 }));
t('flat steps', trend(flat, flat[364].date, 'steps').dir, 'flat');
t('too little history draws no arrow', trend(days(60, () => ({ steps: 1 })), '2026-03-01', 'steps').dir, null);

// behaviours
t('under eight days is too few to say', compare([{ flag: true, value: 60 }, { flag: false, value: 50 }]).enough, false);
const many = [...Array(10)].flatMap(() => [{ flag: true, value: 64 }, { flag: false, value: 58 }]);
t('bucketed means', [compare(many).withMean, compare(many).withoutMean, compare(many).enough], [64, 58, true]);

// Milo Age
const fit = days(30, () => ({ vo2: 50, exMin: 40, rhr: 50 }));
const age = miloAge(fit, fit[29].date, S);
t('fit and active is younger than the calendar', age.delta < 0, true);
t('Milo Age adds up', age.age, Math.round((27 + age.delta) * 10) / 10);

// awards
const rings = days(14, (i) => ({ active: i === 5 ? 100 : 700, moveGoal: 600, exMin: 40, exGoal: 30, stand: 12, standGoal: 12 }), '2026-03-02');
const a = awards(rings, rings[13].date);
t('move streak since the miss', a.moveStreak, 8);
t('longest move streak', a.longestMove, 8);
t('one perfect week (Mon 9 to Sun 15 March)', a.perfectWeeks, 1);

console.log(bad ? `${bad} FAILED` : 'scores: all green');
process.exit(bad ? 1 : 0);
