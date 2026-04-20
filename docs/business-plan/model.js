/**
 * X+1 Financial Model v3 — FINAL
 * Three architectures × 6 user scales × 2 years + sensitivity
 *
 * v3 corrections:
 *   - Paid user cost: $7.50/mo (aggressive Haiku routing; 60% of actions Haiku-compatible per brief)
 *   - Bagrut Intensive: $149 / 4mo (vs $99). Parents happily pay vs $220-670/mo human tutor.
 *   - Free user cost: $1.00/mo with tight caps + Haiku-only
 *   - Two-tier paid: STUDENT $9.99/mo (basic, caps), PRO $14.99/mo (unlimited), FAMILY $19.99/mo
 *   - Sustainable GM computed excluding credits; credit-adjusted view for Y1 only
 *   - 40% paid-channel acquisition, rest organic (WhatsApp, ambassadors, SEO, TikTok organic)
 */

// ============================================================
// CONSTANTS
// ============================================================

const SCALES = [100, 500, 1000, 5000, 25000, 100000];

const STRIPE_FEE_PCT = 0.029;
const STRIPE_FEE_FIXED = 0.30;
const IL_VAT = 0.18;
const PCT_ISRAELI = 0.70;
const PCT_PAID_CHANNEL = 0.40;

// Startup credits Y1 only
const TOTAL_Y1_CREDITS = 25000 + 30000 + 10000;  // Anthropic $25K + Vercel $30K + AWS $10K = $65K

// Fixed infra tiers
function fixedInfraCost(mau) {
  if (mau <= 1000)   return 100;
  if (mau <= 5000)   return 150;
  if (mau <= 25000)  return 400;
  if (mau <= 100000) return 750;
  return 1500;
}
const TOOLING_COST = 80;

function teamCost(year) {
  if (year === 1) return 0;
  return 30000 + 12000;   // founder below-market + part-time contractor
}

function blendedCAC(mau, architecture) {
  if (architecture === 'C') {
    if (mau <= 1000)   return 2;
    if (mau <= 25000)  return 5;
    return 8;
  }
  if (mau <= 500)    return 5;
  if (mau <= 1000)   return 15;
  if (mau <= 5000)   return 25;
  if (mau <= 25000)  return 40;
  return 55;
}

// ============================================================
// ARCHITECTURE A — FREEMIUM (tiered)
// ============================================================

const FREEMIUM = {
  name: 'Freemium',
  conversion: 0.045,
  churn_paid_monthly: 0.09,
  churn_free_monthly: 0.15,
  annual_opt_in: 0.22,
  // Tier mix among PAID users
  tier_student_share: 0.55,   // 55% at Student $9.99/mo
  tier_pro_share: 0.30,       // 30% at Pro $14.99/mo
  tier_family_share: 0.15,    // 15% at Family $19.99/mo
  student_price_monthly: 9.99,
  student_price_annual: 59.00,
  pro_price_monthly: 14.99,
  pro_price_annual: 89.00,
  family_price_monthly: 19.99,
  family_price_annual: 149.00,
  // Bagrut Intensive
  bagrut_price: 149,
  bagrut_attach_rate: 0.10,   // 10% of paid base buys Bagrut Intensive (amortize across year)
  // Variable costs (blended across tiers)
  cost_free_user: 1.00,
  cost_paid_user: 7.50,       // aggressive Haiku routing
};

// ============================================================
// ARCHITECTURE B — SUBSCRIPTION-ONLY (tiered)
// ============================================================

const SUBSCRIPTION = {
  name: 'Subscription-only',
  trial_to_paid: 0.18,
  churn_paid_monthly: 0.08,
  annual_opt_in: 0.22,
  tier_student_share: 0.50,
  tier_pro_share: 0.32,
  tier_family_share: 0.18,
  student_price_monthly: 9.99,
  student_price_annual: 59.00,
  pro_price_monthly: 14.99,
  pro_price_annual: 89.00,
  family_price_monthly: 19.99,
  family_price_annual: 149.00,
  bagrut_price: 149,
  bagrut_attach_rate: 0.12,
  pct_paid_of_mau: 0.85,
  pct_trial_of_mau: 0.15,
  cost_trial_user: 1.50,
  cost_paid_user: 8.00,       // slightly higher than freemium paid (more engaged)
};

// ============================================================
// ARCHITECTURE C — FREE (NO REVENUE)
// ============================================================

const FREE = {
  name: 'Free (No Revenue)',
  cost_user: 0.60,             // ultra-tight: 2/day cap, Haiku-only, no image gen for free
  ad_ecpm: 3,
  ad_impressions_per_user_month: 80,
  grant_israel_y1: 150000,
  grant_eu_horizon_y1: 100000,
  grant_y2: 100000,
  b2b_school_rev_per_student: 4,
  b2b_school_capture_rate: 0.15,
  churn_free_monthly: 0.15,
};

// ============================================================
// SUBSCRIPTION REVENUE CALCULATION (tiered, VAT-adjusted, Stripe-adjusted)
// ============================================================

function computeTieredNetARPU(config) {
  const monthly_share = 1 - config.annual_opt_in;
  const annual_share = config.annual_opt_in;

  const student_gross = monthly_share * config.student_price_monthly + annual_share * config.student_price_annual / 12;
  const pro_gross = monthly_share * config.pro_price_monthly + annual_share * config.pro_price_annual / 12;
  const family_gross = monthly_share * config.family_price_monthly + annual_share * config.family_price_annual / 12;

  const blended_gross = config.tier_student_share * student_gross
                      + config.tier_pro_share * pro_gross
                      + config.tier_family_share * family_gross;

  const il_net = blended_gross / (1 + IL_VAT);
  const non_il_net = blended_gross;
  const vat_weighted = PCT_ISRAELI * il_net + (1 - PCT_ISRAELI) * non_il_net;

  const stripe_adjusted = vat_weighted * (1 - STRIPE_FEE_PCT)
                        - STRIPE_FEE_FIXED * monthly_share
                        - (STRIPE_FEE_FIXED / 12) * annual_share;

  return { blended_gross, stripe_adjusted };
}

function computeBagrutNetPerPaidUser(config) {
  // Bagrut Intensive sold once a year to % of paid users
  const il_net = config.bagrut_price / (1 + IL_VAT);
  const non_il_net = config.bagrut_price;
  const vat_weighted = PCT_ISRAELI * il_net + (1 - PCT_ISRAELI) * non_il_net;
  const stripe_net = vat_weighted * (1 - STRIPE_FEE_PCT) - STRIPE_FEE_FIXED;
  return config.bagrut_attach_rate * stripe_net / 12;  // monthly amortization
}

// ============================================================
// ARCHITECTURE A COMPUTATION
// ============================================================

function computeFreemium(mau, year) {
  const cfg = FREEMIUM;
  const paid_users = mau * cfg.conversion;
  const free_users = mau - paid_users;

  const { blended_gross, stripe_adjusted: net_arpu_sub } = computeTieredNetARPU(cfg);
  const net_arpu_bagrut = computeBagrutNetPerPaidUser(cfg);
  const net_arpu_paid = net_arpu_sub + net_arpu_bagrut;

  const annual_net_rev = paid_users * net_arpu_paid * 12;
  const annual_gross_rev = paid_users * (blended_gross + cfg.bagrut_attach_rate * cfg.bagrut_price / 12) * 12;

  const annual_var_cost_gross = (free_users * cfg.cost_free_user + paid_users * cfg.cost_paid_user) * 12;
  const credits_applied = year === 1 ? Math.min(annual_var_cost_gross, TOTAL_Y1_CREDITS) : 0;
  const annual_var_cost_net = annual_var_cost_gross - credits_applied;

  const annual_fixed = (fixedInfraCost(mau) + TOOLING_COST) * 12;
  const annual_team = teamCost(year);

  const cac = blendedCAC(mau, 'A');
  const monthly_new_free = free_users * cfg.churn_free_monthly;
  const monthly_new_paid = paid_users * cfg.churn_paid_monthly;
  const monthly_marketing = (monthly_new_free + monthly_new_paid) * PCT_PAID_CHANNEL * cac;
  const annual_marketing = monthly_marketing * 12;

  const total_cost = annual_var_cost_net + annual_fixed + annual_team + annual_marketing;
  const operating_profit = annual_net_rev - total_cost;

  // Sustainable GM: excludes credits (real view)
  const gm_dollars_sustainable = annual_net_rev - annual_var_cost_gross;
  const gm_pct_sustainable = annual_net_rev > 0 ? gm_dollars_sustainable / annual_net_rev : 0;

  const gp_per_paid_monthly = net_arpu_paid - cfg.cost_paid_user;
  const ltv = gp_per_paid_monthly / cfg.churn_paid_monthly;
  const cac_per_paid = cac / cfg.conversion;
  const ltv_cac = ltv / cac_per_paid;
  const payback = cac_per_paid / Math.max(gp_per_paid_monthly, 0.01);

  return {
    architecture: 'A — Freemium',
    mau,
    year,
    paid_users: Math.round(paid_users),
    free_users: Math.round(free_users),
    annual_gross_rev: Math.round(annual_gross_rev),
    annual_net_rev: Math.round(annual_net_rev),
    annual_var_cost_gross: Math.round(annual_var_cost_gross),
    annual_var_cost_net: Math.round(annual_var_cost_net),
    credits_applied: Math.round(credits_applied),
    annual_fixed: Math.round(annual_fixed),
    annual_team,
    annual_marketing: Math.round(annual_marketing),
    total_cost: Math.round(total_cost),
    operating_profit: Math.round(operating_profit),
    gm_pct_sustainable: Number((gm_pct_sustainable * 100).toFixed(1)),
    net_arpu_paid: Number(net_arpu_paid.toFixed(2)),
    cac,
    cac_per_paid: Math.round(cac_per_paid),
    ltv: Math.round(ltv),
    ltv_cac: Number(ltv_cac.toFixed(2)),
    payback_months: Number(payback.toFixed(1)),
  };
}

// ============================================================
// ARCHITECTURE B COMPUTATION
// ============================================================

function computeSubscription(mau, year) {
  const cfg = SUBSCRIPTION;
  const paid_users = mau * cfg.pct_paid_of_mau;
  const trial_users = mau * cfg.pct_trial_of_mau;

  const { blended_gross, stripe_adjusted: net_arpu_sub } = computeTieredNetARPU(cfg);
  const net_arpu_bagrut = computeBagrutNetPerPaidUser(cfg);
  const net_arpu_paid = net_arpu_sub + net_arpu_bagrut;

  const annual_net_rev = paid_users * net_arpu_paid * 12;
  const annual_gross_rev = paid_users * (blended_gross + cfg.bagrut_attach_rate * cfg.bagrut_price / 12) * 12;

  const annual_var_cost_gross = (trial_users * cfg.cost_trial_user + paid_users * cfg.cost_paid_user) * 12;
  const credits_applied = year === 1 ? Math.min(annual_var_cost_gross, TOTAL_Y1_CREDITS) : 0;
  const annual_var_cost_net = annual_var_cost_gross - credits_applied;

  const annual_fixed = (fixedInfraCost(mau) + TOOLING_COST) * 12;
  const annual_team = teamCost(year);

  const cac = blendedCAC(mau, 'B');
  const monthly_new_paid = paid_users * cfg.churn_paid_monthly;
  const monthly_new_trials = monthly_new_paid / cfg.trial_to_paid;
  const monthly_marketing = monthly_new_trials * PCT_PAID_CHANNEL * cac;
  const annual_marketing = monthly_marketing * 12;

  const total_cost = annual_var_cost_net + annual_fixed + annual_team + annual_marketing;
  const operating_profit = annual_net_rev - total_cost;

  const gm_dollars_sustainable = annual_net_rev - annual_var_cost_gross;
  const gm_pct_sustainable = annual_net_rev > 0 ? gm_dollars_sustainable / annual_net_rev : 0;

  const gp_per_paid_monthly = net_arpu_paid - cfg.cost_paid_user;
  const ltv = gp_per_paid_monthly / cfg.churn_paid_monthly;
  const cac_per_paid = cac / cfg.trial_to_paid;
  const ltv_cac = ltv / cac_per_paid;
  const payback = cac_per_paid / Math.max(gp_per_paid_monthly, 0.01);

  return {
    architecture: 'B — Subscription-only',
    mau,
    year,
    paid_users: Math.round(paid_users),
    trial_users: Math.round(trial_users),
    annual_gross_rev: Math.round(annual_gross_rev),
    annual_net_rev: Math.round(annual_net_rev),
    annual_var_cost_gross: Math.round(annual_var_cost_gross),
    annual_var_cost_net: Math.round(annual_var_cost_net),
    credits_applied: Math.round(credits_applied),
    annual_fixed: Math.round(annual_fixed),
    annual_team,
    annual_marketing: Math.round(annual_marketing),
    total_cost: Math.round(total_cost),
    operating_profit: Math.round(operating_profit),
    gm_pct_sustainable: Number((gm_pct_sustainable * 100).toFixed(1)),
    net_arpu_paid: Number(net_arpu_paid.toFixed(2)),
    cac,
    cac_per_paid: Math.round(cac_per_paid),
    ltv: Math.round(ltv),
    ltv_cac: Number(ltv_cac.toFixed(2)),
    payback_months: Number(payback.toFixed(1)),
  };
}

// ============================================================
// ARCHITECTURE C COMPUTATION
// ============================================================

function computeFree(mau, year) {
  const cfg = FREE;

  const annual_ad_arpu = (cfg.ad_ecpm / 1000) * cfg.ad_impressions_per_user_month;
  const annual_ad_rev = mau * annual_ad_arpu * 12;
  const annual_b2b_rev = mau * cfg.b2b_school_capture_rate * cfg.b2b_school_rev_per_student;

  const annual_var_cost_gross = mau * cfg.cost_user * 12;
  const credits_applied = year === 1 ? Math.min(annual_var_cost_gross, TOTAL_Y1_CREDITS) : 0;
  const annual_var_cost_net = annual_var_cost_gross - credits_applied;

  const annual_fixed = (fixedInfraCost(mau) + TOOLING_COST) * 12;
  const annual_team = teamCost(year);

  const cac = blendedCAC(mau, 'C');
  const monthly_new = mau * cfg.churn_free_monthly;
  const annual_marketing = monthly_new * PCT_PAID_CHANNEL * cac * 12;

  const total_cost = annual_var_cost_net + annual_fixed + annual_team + annual_marketing;

  const annual_grant = year === 1
    ? cfg.grant_israel_y1 + cfg.grant_eu_horizon_y1
    : cfg.grant_y2;

  const op_profit_grant = annual_grant - total_cost;
  const op_profit_ad = annual_ad_rev - total_cost;
  const op_profit_ad_b2b = annual_ad_rev + annual_b2b_rev - total_cost;
  const op_profit_all = annual_grant + annual_ad_rev + annual_b2b_rev - total_cost;

  return {
    architecture: 'C — Free',
    mau,
    year,
    free_users: Math.round(mau),
    annual_ad_rev: Math.round(annual_ad_rev),
    annual_b2b_rev: Math.round(annual_b2b_rev),
    annual_grant: Math.round(annual_grant),
    annual_var_cost_gross: Math.round(annual_var_cost_gross),
    annual_var_cost_net: Math.round(annual_var_cost_net),
    credits_applied: Math.round(credits_applied),
    annual_fixed: Math.round(annual_fixed),
    annual_team,
    annual_marketing: Math.round(annual_marketing),
    total_cost: Math.round(total_cost),
    op_profit_grant: Math.round(op_profit_grant),
    op_profit_ad: Math.round(op_profit_ad),
    op_profit_ad_b2b: Math.round(op_profit_ad_b2b),
    op_profit_all: Math.round(op_profit_all),
    ad_arpu_monthly: Number(annual_ad_arpu.toFixed(3)),
  };
}

// ============================================================
// OUTPUT
// ============================================================

function fmt(n) {
  if (n == null || typeof n !== 'number') return '';
  if (Math.abs(n) >= 1e6) return (n >= 0 ? '$' : '$') + (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}
function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }

function printFreemium(year) {
  console.log(`\n=== Architecture A — FREEMIUM — Year ${year} ===`);
  console.log(pad('MAU', 9) + pad('Paid', 7) + pad('ARR', 11) + pad('Cost', 11) + pad('Profit', 11) + pad('GM%', 8) + pad('LTV', 8) + pad('LTV:CAC', 9) + 'Payback');
  SCALES.forEach(s => {
    const r = computeFreemium(s, year);
    console.log(
      pad(r.mau.toLocaleString(), 9) +
      pad(String(r.paid_users), 7) +
      pad(fmt(r.annual_net_rev), 11) +
      pad(fmt(r.total_cost), 11) +
      pad(fmt(r.operating_profit), 11) +
      pad(r.gm_pct_sustainable + '%', 8) +
      pad(fmt(r.ltv), 8) +
      pad(r.ltv_cac.toFixed(2), 9) +
      r.payback_months + 'mo'
    );
  });
}

function printSubscription(year) {
  console.log(`\n=== Architecture B — SUBSCRIPTION-ONLY — Year ${year} ===`);
  console.log(pad('MAU', 9) + pad('Paid', 7) + pad('ARR', 11) + pad('Cost', 11) + pad('Profit', 11) + pad('GM%', 8) + pad('LTV', 8) + pad('LTV:CAC', 9) + 'Payback');
  SCALES.forEach(s => {
    const r = computeSubscription(s, year);
    console.log(
      pad(r.mau.toLocaleString(), 9) +
      pad(String(r.paid_users), 7) +
      pad(fmt(r.annual_net_rev), 11) +
      pad(fmt(r.total_cost), 11) +
      pad(fmt(r.operating_profit), 11) +
      pad(r.gm_pct_sustainable + '%', 8) +
      pad(fmt(r.ltv), 8) +
      pad(r.ltv_cac.toFixed(2), 9) +
      r.payback_months + 'mo'
    );
  });
}

function printFree(year) {
  console.log(`\n=== Architecture C — FREE — Year ${year} ===`);
  console.log(pad('MAU', 9) + pad('AdRev', 9) + pad('B2B', 8) + pad('Grant', 9) + pad('Cost', 11) + pad('P(Grant)', 11) + pad('P(Ad+B2B)', 11) + 'P(All)');
  SCALES.forEach(s => {
    const r = computeFree(s, year);
    console.log(
      pad(r.mau.toLocaleString(), 9) +
      pad(fmt(r.annual_ad_rev), 9) +
      pad(fmt(r.annual_b2b_rev), 8) +
      pad(fmt(r.annual_grant), 9) +
      pad(fmt(r.total_cost), 11) +
      pad(fmt(r.op_profit_grant), 11) +
      pad(fmt(r.op_profit_ad_b2b), 11) +
      fmt(r.op_profit_all)
    );
  });
}

printFreemium(1); printFreemium(2);
printSubscription(1); printSubscription(2);
printFree(1); printFree(2);

// PER-UNIT ECONOMICS
console.log('\n\n============ PER-UNIT ECONOMICS @ 25K MAU ============');
const fR = computeFreemium(25000, 2);
const sR = computeSubscription(25000, 2);
console.log('\nFREEMIUM:');
console.log(`  Net ARPU/paid user:    $${fR.net_arpu_paid}/mo`);
console.log(`  Variable cost/paid:    $${FREEMIUM.cost_paid_user}/mo`);
console.log(`  Gross profit/paid:     $${(fR.net_arpu_paid - FREEMIUM.cost_paid_user).toFixed(2)}/mo`);
console.log(`  LTV:                   $${fR.ltv}`);
console.log(`  CAC per paid user:     $${fR.cac_per_paid}`);
console.log(`  LTV:CAC:               ${fR.ltv_cac}`);
console.log(`  Payback:               ${fR.payback_months} mo`);
console.log('\nSUBSCRIPTION:');
console.log(`  Net ARPU/paid user:    $${sR.net_arpu_paid}/mo`);
console.log(`  Variable cost/paid:    $${SUBSCRIPTION.cost_paid_user}/mo`);
console.log(`  Gross profit/paid:     $${(sR.net_arpu_paid - SUBSCRIPTION.cost_paid_user).toFixed(2)}/mo`);
console.log(`  LTV:                   $${sR.ltv}`);
console.log(`  CAC per paid user:     $${sR.cac_per_paid}`);
console.log(`  LTV:CAC:               ${sR.ltv_cac}`);
console.log(`  Payback:               ${sR.payback_months} mo`);

// BREAKEVEN ANALYSIS
console.log('\n\n============ BREAKEVEN ANALYSIS ============');
console.log('Architecture B — What MAU achieves operating breakeven?');
for (let m = 100; m <= 500000; m += 100) {
  const r = computeSubscription(m, 2);   // Year 2 (no credits, real state)
  if (r.operating_profit >= 0) {
    console.log(`  Year 2 breakeven MAU: ~${m.toLocaleString()} (ARR $${(r.annual_net_rev/1e6).toFixed(1)}M)`);
    break;
  }
  if (m > 500000) { console.log('  Not breakeven within 500K MAU at current assumptions'); break; }
}

// SENSITIVITY — Architecture B
console.log('\n\n============ SENSITIVITY — Architecture B @ 25K MAU Y2 ============');
const baseB = computeSubscription(25000, 2);
const baseProfit = baseB.operating_profit;
console.log(`Base profit: ${fmt(baseProfit)}`);
console.log('');

function sens(scenario, modify, label) {
  const tmp = JSON.parse(JSON.stringify(SUBSCRIPTION));
  const orig = JSON.parse(JSON.stringify(SUBSCRIPTION));
  modify(tmp);
  Object.assign(SUBSCRIPTION, tmp);
  const r = computeSubscription(25000, 2);
  Object.assign(SUBSCRIPTION, orig);
  console.log(`  ${label}: profit ${fmt(r.operating_profit)} (Δ ${fmt(r.operating_profit - baseProfit)})`);
  return r;
}

console.log('Price +20%:');
sens('+price', c => { c.student_price_monthly *= 1.2; c.pro_price_monthly *= 1.2; c.family_price_monthly *= 1.2;
  c.student_price_annual *= 1.2; c.pro_price_annual *= 1.2; c.family_price_annual *= 1.2; }, '+20% price');
sens('-price', c => { c.student_price_monthly *= 0.8; c.pro_price_monthly *= 0.8; c.family_price_monthly *= 0.8;
  c.student_price_annual *= 0.8; c.pro_price_annual *= 0.8; c.family_price_annual *= 0.8; }, '-20% price');

console.log('\nConversion ±20% (trial-to-paid):');
sens('+conv', c => { c.trial_to_paid *= 1.2; }, '+20% conversion (trial-to-paid: 21.6%)');
sens('-conv', c => { c.trial_to_paid *= 0.8; }, '-20% conversion (trial-to-paid: 14.4%)');

console.log('\nChurn ±20%:');
sens('+churn', c => { c.churn_paid_monthly *= 1.2; }, '+20% churn (9.6% monthly)');
sens('-churn', c => { c.churn_paid_monthly *= 0.8; }, '-20% churn (6.4% monthly)');

console.log('\nCost ±20% (paid user variable cost):');
sens('+cost', c => { c.cost_paid_user *= 1.2; }, '+20% cost ($9.60/mo)');
sens('-cost', c => { c.cost_paid_user *= 0.8; }, '-20% cost ($6.40/mo)');

// EXPORT
const results = {
  A: { year1: SCALES.map(s => computeFreemium(s, 1)),     year2: SCALES.map(s => computeFreemium(s, 2)) },
  B: { year1: SCALES.map(s => computeSubscription(s, 1)), year2: SCALES.map(s => computeSubscription(s, 2)) },
  C: { year1: SCALES.map(s => computeFree(s, 1)),         year2: SCALES.map(s => computeFree(s, 2)) },
  configs: { FREEMIUM, SUBSCRIPTION, FREE },
};
const fs = require('fs');
fs.writeFileSync(
  '/Users/curvalux/NoteSnap/docs/business-plan/model-output.json',
  JSON.stringify(results, null, 2)
);
console.log('\n✓ Results exported to model-output.json');
