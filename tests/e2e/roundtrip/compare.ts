/**
 * DDD Round-Trip Test — Compare
 *
 * Compare two ProjectSnapshots, score similarity, and list discrepancies.
 *
 * Weighted score:
 *   - Domain structure: 20%
 *   - Flow structure: 40%
 *   - Schemas: 20%
 *   - Events: 20%
 */

import type {
  ProjectSnapshot,
  DomainSnapshot,
  FlowSnapshot,
  ComparisonResult,
  DimensionScore,
  Discrepancy,
} from './types.ts';

const DEFAULT_THRESHOLD = 70;

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Jaccard similarity between two sets */
function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 1 : intersection / union;
}

/** Ratio similarity (closer values → higher score) */
function ratioSimilarity(a: number, b: number): number {
  if (a === 0 && b === 0) return 1;
  const max = Math.max(a, b);
  return max === 0 ? 1 : Math.min(a, b) / max;
}

/** Match items between two arrays by a key function (case-insensitive) */
function matchByKey<T>(
  original: T[],
  reversed: T[],
  keyFn: (item: T) => string
): { matched: Array<[T, T]>; missingInReversed: T[]; extraInReversed: T[] } {
  const origMap = new Map<string, T>();
  for (const item of original) origMap.set(keyFn(item).toLowerCase(), item);

  const revMap = new Map<string, T>();
  for (const item of reversed) revMap.set(keyFn(item).toLowerCase(), item);

  const matched: Array<[T, T]> = [];
  const missingInReversed: T[] = [];
  const extraInReversed: T[] = [];

  for (const [key, origItem] of origMap) {
    const revItem = revMap.get(key);
    if (revItem) {
      matched.push([origItem, revItem]);
    } else {
      missingInReversed.push(origItem);
    }
  }

  for (const [key, revItem] of revMap) {
    if (!origMap.has(key)) {
      extraInReversed.push(revItem);
    }
  }

  return { matched, missingInReversed, extraInReversed };
}

// ─── Domain Comparison ───────────────────────────────────────────────────

function compareDomains(
  original: ProjectSnapshot,
  reversed: ProjectSnapshot,
  discrepancies: Discrepancy[]
): number {
  const { matched, missingInReversed, extraInReversed } = matchByKey(
    original.domains,
    reversed.domains,
    (d) => d.domainId
  );

  for (const missing of missingInReversed) {
    discrepancies.push({
      category: 'missing_domain',
      description: `Domain "${missing.domainId}" not found in reversed specs`,
      recommendation: `/ddd-reverse --domains ${missing.domainId}`,
    });
  }

  // Domain count similarity
  const countScore = ratioSimilarity(original.domainCount, reversed.domainCount);

  // Matched domain role similarity
  let roleScore = 1;
  if (matched.length > 0) {
    const roleMatches = matched.filter(([o, r]) => o.role === r.role).length;
    roleScore = roleMatches / matched.length;
  }

  // Combined: 70% count match + 30% role match
  return countScore * 0.7 + roleScore * 0.3;
}

// ─── Flow Comparison ─────────────────────────────────────────────────────

function compareFlows(
  original: ProjectSnapshot,
  reversed: ProjectSnapshot,
  discrepancies: Discrepancy[]
): number {
  const origFlows = original.domains.flatMap((d) => d.flows);
  const revFlows = reversed.domains.flatMap((d) => d.flows);

  const { matched, missingInReversed, extraInReversed } = matchByKey(
    origFlows,
    revFlows,
    (f) => `${f.domainId}/${f.flowId}`
  );

  for (const missing of missingInReversed) {
    discrepancies.push({
      category: 'missing_flow',
      description: `Flow "${missing.domainId}/${missing.flowId}" not found in reversed specs`,
      recommendation: `/ddd-reverse --domains ${missing.domainId}`,
    });
  }

  for (const extra of extraInReversed) {
    discrepancies.push({
      category: 'extra_flow',
      description: `Extra flow "${extra.domainId}/${extra.flowId}" in reversed specs (not in original)`,
      recommendation: `/ddd-update ${extra.domainId}/${extra.flowId} to simplify`,
    });
  }

  // Flow count match
  const countScore = ratioSimilarity(origFlows.length, revFlows.length);

  // Per-flow structural similarity
  let structureScore = 1;
  if (matched.length > 0) {
    const flowScores = matched.map(([orig, rev]) => compareFlowPair(orig, rev, discrepancies));
    structureScore = flowScores.reduce((a, b) => a + b, 0) / flowScores.length;
  }

  // Combined: 30% count + 70% structure
  return countScore * 0.3 + structureScore * 0.7;
}

function compareFlowPair(
  orig: FlowSnapshot,
  rev: FlowSnapshot,
  discrepancies: Discrepancy[]
): number {
  const flowKey = `${orig.domainId}/${orig.flowId}`;

  // Node type overlap (Jaccard)
  const typeScore = jaccard(orig.nodeTypes, rev.nodeTypes);

  // Node count similarity
  const nodeScore = ratioSimilarity(orig.nodeCount, rev.nodeCount);
  if (Math.abs(orig.nodeCount - rev.nodeCount) > 2) {
    discrepancies.push({
      category: 'node_mismatch',
      description: `Flow "${flowKey}": ${orig.nodeCount} nodes (original) vs ${rev.nodeCount} (reversed)`,
      recommendation: `/ddd-update ${flowKey}`,
    });
  }

  // Connection count similarity
  const connScore = ratioSimilarity(orig.connectionCount, rev.connectionCount);
  if (Math.abs(orig.connectionCount - rev.connectionCount) > 2) {
    discrepancies.push({
      category: 'connection_mismatch',
      description: `Flow "${flowKey}": ${orig.connectionCount} connections (original) vs ${rev.connectionCount} (reversed)`,
      recommendation: `/ddd-update ${flowKey}`,
    });
  }

  // Trigger event match
  const triggerScore =
    orig.triggerEvent && rev.triggerEvent
      ? orig.triggerEvent.toLowerCase() === rev.triggerEvent.toLowerCase()
        ? 1
        : 0.5
      : orig.triggerEvent || rev.triggerEvent
        ? 0.5
        : 1;

  // Weighted: 30% types + 25% nodes + 25% connections + 20% trigger
  return typeScore * 0.3 + nodeScore * 0.25 + connScore * 0.25 + triggerScore * 0.2;
}

// ─── Schema Comparison ───────────────────────────────────────────────────

function compareSchemas(
  original: ProjectSnapshot,
  reversed: ProjectSnapshot,
  discrepancies: Discrepancy[]
): number {
  const { matched, missingInReversed } = matchByKey(
    original.schemas,
    reversed.schemas,
    (s) => s.name
  );

  for (const missing of missingInReversed) {
    discrepancies.push({
      category: 'schema_mismatch',
      description: `Schema "${missing.name}" not found in reversed specs`,
      recommendation: `/ddd-reverse --merge`,
    });
  }

  // Schema count match
  const countScore = ratioSimilarity(original.schemas.length, reversed.schemas.length);

  // Per-schema field overlap
  let fieldScore = 1;
  if (matched.length > 0) {
    const scores = matched.map(([orig, rev]) => {
      const overlap = jaccard(orig.fieldNames, rev.fieldNames);
      if (overlap < 0.8) {
        const missingFields = orig.fieldNames.filter((f) => !rev.fieldNames.includes(f));
        if (missingFields.length > 0) {
          discrepancies.push({
            category: 'schema_mismatch',
            description: `Schema "${orig.name}": missing fields [${missingFields.join(', ')}] in reversed`,
            recommendation: `/ddd-reverse --merge`,
          });
        }
      }
      return overlap;
    });
    fieldScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // Combined: 40% count + 60% fields
  return countScore * 0.4 + fieldScore * 0.6;
}

// ─── Event Comparison ────────────────────────────────────────────────────

function compareEvents(
  original: ProjectSnapshot,
  reversed: ProjectSnapshot,
  discrepancies: Discrepancy[]
): number {
  const origEvents = original.eventWiring.map((e) => `${e.publisher}->${e.event}->${e.consumer}`);
  const revEvents = reversed.eventWiring.map((e) => `${e.publisher}->${e.event}->${e.consumer}`);

  const score = jaccard(origEvents, revEvents);

  if (score < 1) {
    const missingWires = origEvents.filter((e) => !revEvents.includes(e));
    for (const wire of missingWires) {
      discrepancies.push({
        category: 'event_mismatch',
        description: `Event wiring "${wire}" missing in reversed specs`,
        recommendation: `/ddd-sync`,
      });
    }
  }

  return score;
}

// ─── Main Compare ────────────────────────────────────────────────────────

export function compareSnapshots(
  original: ProjectSnapshot,
  reversed: ProjectSnapshot,
  threshold: number = DEFAULT_THRESHOLD
): ComparisonResult {
  const discrepancies: Discrepancy[] = [];

  // Check for validation regressions
  if (reversed.validation.totalErrors > original.validation.totalErrors) {
    discrepancies.push({
      category: 'validation_regression',
      description: `Reversed specs have ${reversed.validation.totalErrors} errors (original had ${original.validation.totalErrors})`,
      recommendation: `/ddd-update to fix spec issues`,
    });
  }

  // Score each dimension
  const domainScore = compareDomains(original, reversed, discrepancies);
  const flowScore = compareFlows(original, reversed, discrepancies);
  const schemaScore = compareSchemas(original, reversed, discrepancies);
  const eventScore = compareEvents(original, reversed, discrepancies);

  const dimensions: DimensionScore[] = [
    {
      dimension: 'Domains',
      originalValue: original.domainCount,
      reversedValue: reversed.domainCount,
      score: Math.round(domainScore * 100),
    },
    {
      dimension: 'Flows',
      originalValue: original.totalFlowCount,
      reversedValue: reversed.totalFlowCount,
      score: Math.round(flowScore * 100),
    },
    {
      dimension: 'Nodes',
      originalValue: original.totalNodeCount,
      reversedValue: reversed.totalNodeCount,
      score: Math.round(
        ratioSimilarity(original.totalNodeCount, reversed.totalNodeCount) * 100
      ),
    },
    {
      dimension: 'Connections',
      originalValue: original.totalConnectionCount,
      reversedValue: reversed.totalConnectionCount,
      score: Math.round(
        ratioSimilarity(original.totalConnectionCount, reversed.totalConnectionCount) * 100
      ),
    },
    {
      dimension: 'Schemas',
      originalValue: original.schemas.length,
      reversedValue: reversed.schemas.length,
      score: Math.round(schemaScore * 100),
    },
    {
      dimension: 'Events',
      originalValue: original.eventWiring.length,
      reversedValue: reversed.eventWiring.length,
      score: Math.round(eventScore * 100),
    },
  ];

  // Weighted overall: domains 20% + flows 40% + schemas 20% + events 20%
  const overallScore = Math.round(
    domainScore * 20 + flowScore * 40 + schemaScore * 20 + eventScore * 20
  );

  return {
    dimensions,
    overallScore,
    passed: overallScore >= threshold,
    threshold,
    discrepancies,
  };
}
