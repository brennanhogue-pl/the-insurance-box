'use strict';

// Serverless API handler for Vercel
// This wraps the Express app for serverless deployment

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// CORS: allow local dev front-end; tighten for production
app.use(cors({ origin: true }));
app.use(express.json());

// Serve static files from the parent directory
app.use(express.static(path.join(__dirname, '..')));

// Helper: build auth headers flexibly
function buildAuthHeaders() {
    const headers = {};

    // Preferred: Authorization: Bearer <token>
    const apiKey = process.env.MARKETPLACE_API_KEY || '';
    const authHeader = process.env.MARKETPLACE_AUTH_HEADER || 'Authorization';
    const authScheme = process.env.MARKETPLACE_AUTH_SCHEME || 'Bearer'; // 'Bearer' or 'ApiKey' or ''

    if (apiKey) {
        if (authHeader.toLowerCase() === 'authorization' && authScheme) {
            headers['Authorization'] = `${authScheme} ${apiKey}`.trim();
        } else if (authHeader) {
            headers[authHeader] = authScheme ? `${authScheme} ${apiKey}`.trim() : apiKey;
        }
    }

    // Optional: additional headers (e.g., x-api-key) via env
    if (process.env.MARKETPLACE_X_API_KEY) {
        headers['x-api-key'] = process.env.MARKETPLACE_X_API_KEY;
    }

    return headers;
}

// Plans endpoint: proxies query to Marketplace provider (CMS Marketplace API)
app.get('/api/marketplace/plans', async (req, res) => {
    try {
        const { zip, state, householdSize, income, ages } = req.query;

        if (!zip || String(zip).replace(/\D/g, '').length !== 5) {
            return res.status(400).json({ error: 'Invalid zip' });
        }
        if (!state) {
            return res.status(400).json({ error: 'Missing state' });
        }
        if (!householdSize) {
            return res.status(400).json({ error: 'Missing householdSize' });
        }

        // CMS Marketplace API specifics
        // 1) Look up county FIPS by ZIP
        const apiKey = process.env.MARKETPLACE_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'MARKETPLACE_API_KEY not configured' });

        const year = Number(process.env.MARKETPLACE_YEAR) || new Date().getFullYear();
        let base = process.env.MARKETPLACE_BASE_URL || 'https://marketplace.api.healthcare.gov';
        // Ensure no trailing slash to avoid double slashes
        if (base.endsWith('/')) base = base.replace(/\/+$/, '');
        const countiesUrl = `${base}/api/v1/counties/by/zip/${encodeURIComponent(zip)}?year=${encodeURIComponent(year)}&apikey=${encodeURIComponent(apiKey)}`;

        const cResp = await fetch(countiesUrl, { headers: { 'Accept': 'application/json' } });
        if (!cResp.ok) {
            const text = await cResp.text().catch(() => '');
            return res.status(cResp.status).json({ error: 'FIPS lookup failed', body: text });
        }
        const cJson = await cResp.json();
        const candidates = Array.isArray(cJson) ? cJson : (Array.isArray(cJson?.counties) ? cJson.counties : (Array.isArray(cJson?.data) ? cJson.data : []));
        // Prefer county where state code matches provided state
        const county = candidates.find((c) => {
            const cState = c?.state || c?.state_code || c?.usps || c?.state_abbr;
            return cState && String(cState).toUpperCase() === String(state).toUpperCase();
        }) || (candidates.length ? candidates[0] : null);
        const rawFips = county?.countyfips || county?.fips || county?.county_fips || county?.county_fips_code;
        const countyfips = rawFips ? String(rawFips).padStart(5, '0') : undefined;
        if (!countyfips) return res.status(400).json({ error: 'Could not resolve county FIPS for ZIP' });

        // 2) Build household object and POST to plans/search
        const peopleAges = String(ages || '')
            .split(',')
            .map(s => parseInt(String(s).trim(), 10))
            .filter(n => Number.isFinite(n) && n > 0);
        const household = {
            income: income ? Number(income) : undefined,
            people: peopleAges.map((age) => ({ age, aptc_eligible: true, uses_tobacco: false }))
        };

        const body = {
            household,
            market: 'Individual',
            place: {
                countyfips: String(countyfips),
                state: String(state),
                zipcode: String(zip)
            },
            year
        };

        const searchUrl = `${base}/api/v1/plans/search?apikey=${encodeURIComponent(apiKey)}&year=${encodeURIComponent(year)}`;
        let sResp = await fetch(searchUrl, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        // Fallback: some deployments may require a trailing slash
        if (sResp.status === 404) {
            const altUrl = `${base}/api/v1/plans/search/?apikey=${encodeURIComponent(apiKey)}&year=${encodeURIComponent(year)}`;
            sResp = await fetch(altUrl, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        }
        if (!sResp.ok) {
            const text = await sResp.text().catch(() => '');
            return res.status(sResp.status).json({ error: 'Plan search failed', status: sResp.status, body: text });
        }
        const sData = await sResp.json();

        const plans = Array.isArray(sData) ? sData : (Array.isArray(sData?.plans) ? sData.plans : []);
        let normalized = plans.map((p) => ({
            planId: p.plan_id || p.planId || p.id || null,
            planName: p.plan_name || p.planName || p.name || 'Plan',
            issuerName: p.issuer_name || p.issuerName || p.carrier || 'Carrier',
            metalLevel: p.metal_level || p.metalLevel || null,
            monthlyPremium: p.premium || p.monthlyPremium || null,
            deductible: p.deductible ?? p.cost_sharing?.deductible ?? null,
            outOfPocketMax: p.oop_max || p.outOfPocketMax || null,
            networkType: p.network || p.networkType || null
        }));

        // Enrich with plan details for deductible / OOP (bulk endpoint)
        const idsNeedingDetails = normalized
            .filter(pl => pl.planId && (pl.deductible == null || pl.outOfPocketMax == null))
            .map(pl => pl.planId);

        const byId = new Map();
        if (idsNeedingDetails.length) {
            const chunkSize = 40;
            for (let i = 0; i < idsNeedingDetails.length; i += chunkSize) {
                const chunk = idsNeedingDetails.slice(i, i + chunkSize);
                const bulkUrl = `${base}/api/v1/plans?apikey=${encodeURIComponent(apiKey)}&year=${encodeURIComponent(year)}`;
                const bulkBody = {
                    household: {
                        income: income ? Number(income) : undefined,
                        people: (String(ages || '')
                            .split(',')
                            .map(s => parseInt(String(s).trim(), 10))
                            .filter(n => Number.isFinite(n) && n > 0)
                        ).map(age => ({ age, uses_tobacco: false })),
                    },
                    place: { countyfips: String(countyfips), state: String(state), zipcode: String(zip) },
                    market: 'Individual',
                    plan_ids: chunk,
                    year
                };

                let bResp = await fetch(bulkUrl, {
                    method: 'POST',
                    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                    body: JSON.stringify(bulkBody)
                });
                if (bResp.status === 404) {
                    const alt = `${base}/api/v1/plans/?apikey=${encodeURIComponent(apiKey)}&year=${encodeURIComponent(year)}`;
                    bResp = await fetch(alt, {
                        method: 'POST',
                        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                        body: JSON.stringify(bulkBody)
                    });
                }
                if (!bResp.ok) continue; // skip failures silently
                const bData = await bResp.json();
                const arr = Array.isArray(bData?.plans) ? bData.plans : [];
                for (const plan of arr) {
                    if (plan?.id) byId.set(plan.id, plan);
                }
            }

            const parseMoney = (val) => {
                if (val == null) return undefined;
                if (typeof val === 'number' && Number.isFinite(val)) return val;
                const s = String(val);
                const m = s.replace(/[^0-9.]/g, '');
                const num = Number(m);
                return Number.isFinite(num) ? num : undefined;
            };

            const pickNumber = (obj, keys) => {
                for (const k of keys) {
                    const v = obj?.[k];
                    const parsed = parseMoney(v);
                    if (parsed != null) return parsed;
                }
                return undefined;
            };

            // Deep search by key regex for numeric/currency values
            const findByKeyRegex = (obj, regexes, maxDepth = 6) => {
                if (!obj || typeof obj !== 'object') return undefined;
                const stack = [{ node: obj, depth: 0 }];
                while (stack.length) {
                    const { node, depth } = stack.pop();
                    if (!node || typeof node !== 'object') continue;
                    for (const [key, value] of Object.entries(node)) {
                        for (const rx of regexes) {
                            if (rx.test(String(key))) {
                                const parsed = parseMoney(value);
                                if (parsed != null) return parsed;
                            }
                        }
                        if (depth < maxDepth && value && typeof value === 'object') {
                            stack.push({ node: value, depth: depth + 1 });
                        }
                    }
                }
                return undefined;
            };

            const gatherByKeyRegex = (obj, regexes, maxDepth = 6) => {
                const values = [];
                if (!obj || typeof obj !== 'object') return values;
                const stack = [{ node: obj, depth: 0 }];
                while (stack.length) {
                    const { node, depth } = stack.pop();
                    if (!node || typeof node !== 'object') continue;
                    for (const [key, value] of Object.entries(node)) {
                        for (const rx of regexes) {
                            if (rx.test(String(key))) {
                                const parsed = parseMoney(value);
                                if (parsed != null) values.push(parsed);
                            }
                        }
                        if (depth < maxDepth && value && typeof value === 'object') {
                            stack.push({ node: value, depth: depth + 1 });
                        }
                    }
                }
                return values;
            };

            const extractDeductible = (detail) => {
                // Try common shapes
                const cs = detail?.cost_sharing || detail?.costSharing || detail;
                const candidates = [
                    pickNumber(cs, [
                        'deductible',
                        'medical_deductible',
                        'deductible_in_network_individual',
                        'individual_deductible_in_network',
                        'individual_deductible',
                        'embedded_individual_deductible_in_network',
                        'combined_deductible_in_network'
                    ]),
                    pickNumber(detail, ['deductible', 'annual_deductible'])
                ];
                const direct = candidates.find(v => v != null);
                if (direct != null && direct > 0) return direct;
                // Bulk details structure: deductibles[]
                if (Array.isArray(detail?.deductibles)) {
                    const inNetInd = detail.deductibles
                        .filter(d => d && (d.individual === true || /Individual/i.test(String(d.family_cost || ''))) && /In-Network/i.test(String(d.network_tier || '')))
                        .map(d => parseMoney(d.amount))
                        .filter(n => n > 0);
                    if (inNetInd.length) return Math.min(...inNetInd);
                }
                // Fallback: deep search and prefer smallest positive individual amount
                const gathered = gatherByKeyRegex(detail, [/deductible/i, /deduct/i]);
                const positives = gathered.filter(n => n > 0);
                if (positives.length) return Math.min(...positives);
                return undefined;
            };
            const extractOopMax = (detail) => {
                const cs = detail?.cost_sharing || detail?.costSharing || detail;
                const candidates = [
                    pickNumber(cs, [
                        'oop_max',
                        'out_of_pocket_max',
                        'maximum_out_of_pocket_in_network_individual',
                        'individual_moop_in_network',
                        'moop_in_network_individual',
                        'in_network_moop_individual'
                    ]),
                    pickNumber(detail, ['oop_max', 'out_of_pocket_max'])
                ];
                const direct = candidates.find(v => v != null);
                if (direct != null && direct > 0) return direct;
                if (Array.isArray(detail?.moops)) {
                    const inNetInd = detail.moops
                        .filter(m => m && (m.individual === true || /Individual/i.test(String(m.family_cost || ''))) && /In-Network/i.test(String(m.network_tier || '')))
                        .map(m => parseMoney(m.amount))
                        .filter(n => n > 0);
                    if (inNetInd.length) return Math.min(...inNetInd);
                }
                const gathered = gatherByKeyRegex(detail, [/out.*pocket/i, /moop/i, /oop/i, /(max.*out)|(out.*max)/i]);
                const positives = gathered.filter(n => n > 0);
                if (positives.length) return Math.min(...positives);
                return undefined;
            };

            normalized = normalized.map((pl) => {
                if (!pl.planId) return pl;
                const detail = byId.get(pl.planId);
                if (!detail) return pl;
                const deductible = pl.deductible ?? extractDeductible(detail);
                const oop = pl.outOfPocketMax ?? extractOopMax(detail);
                return {
                    ...pl,
                    deductible: deductible == null ? null : deductible,
                    outOfPocketMax: oop == null ? null : oop,
                    networkType: pl.networkType ?? (detail?.network || detail?.network_type || pl.networkType)
                };
            });
        }

        return res.json({ plans: normalized, rawCount: plans.length, enriched: idsNeedingDetails.length });
    } catch (err) {
        const status = err?.name === 'AbortError' ? 504 : 500;
        return res.status(status).json({ error: 'Proxy failure', message: err?.message || 'Unknown error' });
    }
});

// Counties by ZIP proxy (used for step-by-step flow)
app.get('/api/marketplace/counties', async (req, res) => {
    try {
        const { zip, year } = req.query;
        if (!zip || String(zip).replace(/\D/g, '').length < 5) {
            return res.status(400).json({ error: 'Invalid zip' });
        }
        const apiKey = process.env.MARKETPLACE_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'MARKETPLACE_API_KEY not configured' });

        let base = process.env.MARKETPLACE_BASE_URL || 'https://marketplace.api.healthcare.gov';
        if (base.endsWith('/')) base = base.replace(/\/+$/, '');
        const yr = Number(year) || Number(process.env.MARKETPLACE_YEAR) || new Date().getFullYear();
        const url = `${base}/api/v1/counties/by/zip/${encodeURIComponent(zip)}?year=${encodeURIComponent(yr)}&apikey=${encodeURIComponent(apiKey)}`;
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const text = await resp.text();
        if (!resp.ok) return res.status(resp.status).send(text);
        try {
            const json = JSON.parse(text);
            return res.json(json);
        } catch {
            return res.status(502).json({ error: 'Bad upstream JSON', body: text });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Proxy failure', message: err?.message || 'Unknown error' });
    }
});

// Export the Express app for Vercel serverless
module.exports = app;
