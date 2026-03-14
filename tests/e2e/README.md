# DDD End-to-End Benchmark Test

## How to run

```bash
# Step 1: Create a test project from the product definition
cd /tmp && mkdir nexus-e2e && cd nexus-e2e
# In a Claude Code session:
/ddd-create --from ~/dev/ddd-tool/tests/e2e/nexus-product-definition.md --shortfalls

# Step 2: Open in DDD Tool and run Validate All
# Expected: zero errors, zero warnings

# Step 3: Continue through the pipeline
/ddd-scaffold
/ddd-implement --all
/ddd-test --all
/ddd-sync --verify
```

## What it tests

The product definition exercises every DDD feature: all 29 node types, all 13 trigger types, all UI component types, all form field types, all schema features, all infrastructure patterns, and all cross-cutting conventions.

## When to re-run

- After adding node types or trigger types to the Usage Guide
- After changing validation rules in the DDD Tool
- After modifying `/ddd-create` or `/ddd-update` commands
- Monthly as a regression check
