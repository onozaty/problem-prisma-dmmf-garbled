# Bug Report: DMMF Generation Causes UTF-8 Character Corruption for Japanese Characters

## Bug Description

Prisma's DMMF (Data Model Meta Format) generation corrupts Japanese UTF-8 characters before they reach custom generators. Specifically, 3-byte UTF-8 characters like "者" (U+8005) and "時" (U+6642) are replaced with Unicode replacement characters (U+FFFD) during the DMMF generation process within Prisma engines, not in the custom generator code itself.

## Severity

**High** - This affects data integrity across multiple environments:
- Character corruption in generated documentation
- Different corruption patterns between development and deployment platforms
- May affect any Japanese text in Prisma schemas
- Non-deterministic behavior creates inconsistent results

## Reproduction

### Minimal Repository
This issue can be reproduced with this repository: [problem-prisma-dmmf-garbled](https://github.com/example/problem-prisma-dmmf-garbled)

### Steps to Reproduce

**Option A: VS Code DevContainer**
1. Open this repository in VS Code DevContainer
2. Run `pnpm i` to install dependencies
3. Run `npx prisma generate` to generate DMMF
4. Check `prisma/migrations/dmmf.json` for character corruption

**Option B: GitHub Codespaces**
1. Open this repository in GitHub Codespaces
2. Run `pnpm i` to install dependencies
3. Run `npx prisma generate` to generate DMMF
4. Check `prisma/migrations/dmmf.json` for character corruption

**Note:** Different environments will show different corruption patterns. Testing in multiple environments is recommended to observe the platform-dependent nature of this issue.

### Quick Reproduction Command
```bash
rm -rf prisma/migrations/ && npx prisma generate && grep -n -P '\xEF\xBF\xBD' prisma/migrations/dmmf.json
```

### Important Note on Reproducibility
**The corruption is probabilistic and platform-dependent** - running the same command multiple times may produce different results, and different environments corrupt different characters:

**WSL2 Environment:**
- "最終更新者" corruption: **Always occurs** (100% reproduction rate - 5/5 runs)
- "承認日時" corruption: **Sometimes occurs** (60% reproduction rate - 3/5 runs)
- Both corruptions simultaneously: 60% of the time

**GitHub Codespaces Environment:**
- "分析実行日時" corruption: **Occurs 80% of the time** (4/5 runs in testing)
- Single corruption point (vs. WSL2's dual corruption pattern)
- Different line numbers and characters affected compared to WSL2

Run the command multiple times to observe the varying behavior:
```bash
# Run this several times to see different corruption patterns
for i in {1..5}; do
  echo "=== Run $i ==="
  rm -rf prisma/migrations/ && npx prisma generate >/dev/null 2>&1
  echo "Corrupted lines found:"
  grep -n -P '\xEF\xBF\xBD' prisma/migrations/dmmf.json || echo "No corruption detected"
  echo
done
```

### Key Requirements for Reproduction

**Important:** This issue only occurs with **large schema.prisma files** containing Japanese characters at specific byte positions. A minimal schema will NOT reproduce the issue.

The reproduction repository contains:
- **Large schema.prisma** (~69KB with extensive Japanese documentation)
- **Custom generator** that outputs DMMF as JSON
- **Environment-dependent corruption patterns** at different positions in the file

**Example of affected lines in the repository's schema.prisma:**
```prisma
/// 最終更新者 - 最後に更新した担当者  # ← Gets corrupted to "最終更新�� - ..."
lastUpdatedBy String? @map("last_updated_by")

/// 承認日時 - 検査結果が承認された日時  # ← Gets corrupted to "承���日時 - ..."
approvedAt DateTime? @map("approved_at") @db.Timestamptz()
```

**Custom generator (generator.ts):**
```typescript
#!/usr/bin/env node
import generatorHelper from "@prisma/generator-helper";
import type { GeneratorOptions } from "@prisma/generator-helper";
import fs from "fs";
import path from "path";

const generate = async (options: GeneratorOptions) => {
  const { dmmf } = options;
  const outputDir = options.generator.output?.value!;
  fs.mkdirSync(outputDir, { recursive: true });
  
  const dmmfFilePath = path.join(outputDir, "dmmf.json");
  fs.writeFileSync(dmmfFilePath, JSON.stringify(dmmf, null, 2), "utf-8");
};

generatorHelper.generatorHandler({
  onManifest: () => ({
    defaultOutput: "migrations",
    prettyName: "Prisma Database Comments",
  }),
  onGenerate: generate,
});
```

**Why a minimal example won't work:**
- The issue is **position-dependent** (specific byte offsets in large files)
- **Different environments corrupt different positions:**
  - WSL2: schema.prisma bytes 41,557 and 63,915 → DMMF lines 6776, 10389
  - Codespaces: different schema position → DMMF line 11235
- Adding/removing content changes byte positions and prevents reproduction

## Expected vs. Actual Behavior

**Expected:** Japanese characters should be preserved exactly as written in schema comments
```json
"documentation": "最終更新者 - 最後に更新した担当者"
"documentation": "承認日時 - 検査結果が承認された日時"
```

**Actual:** Characters get corrupted with Unicode replacement characters
```json
"documentation": "最終更新�� - 最後に更新した担当者"
"documentation": "承���日時 - 検査結果が承認された日時"
```

## Frequency

**Intermittent/Random** with **environment-specific patterns**:

| Environment | Corruption Rate | Affected Characters | Line Numbers |
|-------------|-----------------|-------------------|--------------|
| WSL2 | 100%/60% | "最終更新者" (5/5), "承認日時" (3/5) | 6776, 10389 |
| GitHub Codespaces | 80% | "分析実行日時" (4/5) | 11235 |

**Critical Evidence:**
- **Different platforms corrupt different characters**
- **Same platform shows probabilistic behavior** (WSL2: dual pattern, Codespaces: 4/5 single corruptions)
- **Consistent line numbers within each platform** but different between platforms
- **Non-deterministic nature** indicates memory race conditions or timing issues

## Environment Type

**Both development and production** - Issue exhibits **platform-dependent behavior**:

**WSL2 Local Environment:**
- Lines 6776, 10389 corrupted
- Characters: "最終更新者" (100% - 5/5 runs), "承認日時" (60% - 3/5 runs)
- Both corruptions occur simultaneously in 60% of cases

**GitHub Codespaces:**
- Line 11235 corrupted  
- Character: "分析実行日時" (80% - 4/5 runs)
- Single corruption point (simpler pattern than WSL2's dual corruption)
- Demonstrated non-deterministic behavior (1/5 runs showed no corruption)

This proves the issue is **non-deterministic** and **platform-sensitive**, creating inconsistent behavior across different deployment environments.

## Regression

**Unknown** - Not confirmed if this is a regression or existing issue

## Workaround

**No viable workaround available.** 

While adding content before the problematic byte positions can prevent corruption in testing, this is not a practical solution as:
- It requires modifying the schema content artificially
- It's unpredictable which positions will be affected in different environments
- It doesn't address the underlying memory corruption issue

## Prisma Schema

See minimal reproduction example above. The issue occurs with any Japanese 3-byte UTF-8 characters in schema documentation comments.

## Prisma Config

No response

## Logs and Debug Information

**WSL2 Environment:**
```bash
$ rm -rf prisma/migrations/ && npx prisma generate && grep -n -P '\xEF\xBF\xBD' prisma/migrations/dmmf.json
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v6.12.0) to ./node_modules/.pnpm/@prisma+client@6.12.0_prisma@6.12.0_typescript@5.8.3__typescript@5.8.3/node_modules/@prisma/client in 367ms

✔ Generated Prisma Database Comments to ./prisma/migrations in 336ms

6776:            "documentation": "最終更新�� - 最後に更新した担当者"
10389:            "documentation": "承���日時 - 検査結果が承認された日時"
```

**GitHub Codespaces Environment:**
```bash
$ rm -rf prisma/migrations/ && npx prisma generate && grep -n -P '\xEF\xBF\xBD' prisma/migrations/dmmf.json
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v6.12.0) to ./node_modules/.pnpm/@prisma+client@6.12.0_prisma@6.12.0_typescript@5.8.3__typescript@5.8.3/node_modules/@prisma/client in 345ms

✔ Generated Prisma Database Comments to ./prisma/migrations in 229ms

11235:            "documentation": "分析実行日時 - 分���を実行した日時"
```

**Probabilistic Behavior in WSL2 (5 consecutive runs):**
```bash
=== Run 1 ===
6776:            "documentation": "最終更新�� - 最後に更新した担当者"
=== Run 2 ===
6776:            "documentation": "最終更新�� - 最後に更新した担当者"
10389:            "documentation": "承���日時 - 検査結果が承認された日時"
=== Run 3 ===
6776:            "documentation": "最終更新�� - 最後に更新した担当者"
=== Run 4 ===
6776:            "documentation": "最終更新�� - 最後に更新した担当者"
10389:            "documentation": "承���日時 - 検査結果が承認された日時"
=== Run 5 ===
6776:            "documentation": "最終更新�� - 最後に更新した担当者"
10389:            "documentation": "承���日時 - 検査結果が承認された日時"
```

**Probabilistic Behavior in Codespaces (5 consecutive runs):**
```bash
=== Run 1 ===
11235:            "documentation": "分析実行日時 - 分���を実行した日時"
=== Run 2 ===
11235:            "documentation": "分析実行日時 - 分���を実行した日時"
=== Run 3 ===
No corruption detected
=== Run 4 ===
11235:            "documentation": "分析実行日時 - 分���を実行した日時"
=== Run 5 ===
11235:            "documentation": "分析実行日時 - 分���を実行した日時"
```

## Environment Setup

**Environment 1: WSL2 (Where dual corruption occurs)**
- **OS**: Linux (WSL2) - Linux 6.6.87.1-microsoft-standard-WSL2
- **Node.js Version**: v22.12.0
- **Package Manager**: pnpm@10.12.1
- **Corruption Pattern**: Lines 6776, 10389 (100%/60% rates)

**Environment 2: GitHub Codespaces (Where single corruption occurs)**
- **OS**: Linux (Codespaces container) - Linux codespaces-a15200 6.8.0-1027-azure
- **Node.js Version**: v22.12.0
- **Package Manager**: pnpm@10.12.1
- **Corruption Pattern**: Line 11235 (80% rate)

**Common to both environments:**
- **Database**: PostgreSQL (using connection string, issue occurs during generation not DB operations)
- **Container Runtime**: Both use containerized Linux environments
- **Same codebase**: Identical schema.prisma and generator.ts files

## Prisma Version

```bash
$ npx prisma version
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
prisma                  : 6.12.0
@prisma/client          : 6.12.0
Computed binaryTarget   : debian-openssl-3.0.x
Operating System        : linux
Architecture            : x64
Node.js                 : v22.12.0
TypeScript              : 5.8.3
Query Engine (Node-API) : libquery-engine 8047c96bbd92db98a2abc7c9323ce77c02c89dbc (at node_modules/.pnpm/@prisma+engines@6.12.0/node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node)
PSL                     : @prisma/prisma-schema-wasm 6.12.0-15.8047c96bbd92db98a2abc7c9323ce77c02c89dbc
Schema Engine           : schema-engine-cli 8047c96bbd92db98a2abc7c9323ce77c02c89dbc (at node_modules/.pnpm/@prisma+engines@6.12.0/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x)
Default Engines Hash    : 8047c96bbd92db98a2abc7c9323ce77c02c89dbc
Studio                  : 0.511.0
```

## Technical Analysis

### Platform-Dependent Non-Deterministic Corruption

**Critical Evidence:**
1. **Different platforms corrupt different characters**
2. **Same platform shows probabilistic behavior** (Codespaces: 4/5 runs corrupted)
3. **Consistent line numbers within each platform** but different between platforms
4. **Corruption occurs within Prisma engines**, not in custom generator code

**Root Cause Location:**
- **Issue originates in Rust-based prisma-engines** during schema parsing and DMMF generation
- **Custom generators receive already-corrupted DMMF data**
- **Direct Prisma Client DMMF access shows identical corruption**, confirming the issue is in the core engines

**Root Cause Implications:**
- **Memory layout dependencies** in Rust engines
- **Race conditions** in concurrent processing
- **Platform-specific buffer alignment** issues
- **Reliability concern for applications using Japanese text**

### Character Corruption Details
**WSL2 Environment:**
- **"者" (U+8005)**: `0xe8 0x80 0x85` → `0xef 0xbf 0xbd 0xef 0xbf 0xbd` (two replacement chars)
- **"時" (U+6642)**: `0xe6 0x64 0x82` → `0xef 0xbf 0xbd 0xef 0xbf 0xbd` (two replacement chars)

**GitHub Codespaces:**
- **"時" (U+6642)**: `0xe6 0x64 0x82` → `0xef 0xbf 0xbd 0xef 0xbf 0xbd` (in "分析実行日時")

### Production Impact
This behavior pattern is consistent with **memory corruption bugs** in systems programming, which can impact production environments:
- **Documentation integrity** may be compromised
- **Silent failures** may go unnoticed in generated metadata
- **Platform migration** between development and production environments may introduce different corruption patterns

## Related Issues

- [#14895](https://github.com/prisma/prisma/issues/14895): UTF-8 Error: index is not a char boundary (fixed in schema formatter)
- [#23201](https://github.com/prisma/prisma/issues/23201): Error with Chinese/Non-ASCII characters in comments

## Repository for Reproduction

A complete reproduction case is available at: [problem-prisma-dmmf-garbled repository](https://github.com/example/problem-prisma-dmmf-garbled)

### GitHub Codespaces Setup (Recommended)
```bash
# 1. Click "Code" → "Create codespace on main" in GitHub
# 2. Wait for environment to load
# 3. Run the reproduction command:
rm -rf prisma/migrations/ && npx prisma generate && grep -n -P '\xEF\xBF\xBD' prisma/migrations/dmmf.json
```

### DevContainer Setup
```bash
# 1. Open in VS Code with DevContainer extension
# 2. "Reopen in Container" when prompted
# 3. Run the reproduction command:
rm -rf prisma/migrations/ && npx prisma generate && grep -n -P '\xEF\xBF\xBD' prisma/migrations/dmmf.json
```

### Local Setup
```bash
git clone [repository-url]
cd problem-prisma-dmmf-garbled
pnpm install
rm -rf prisma/migrations/ && npx prisma generate && grep -n -P '\xEF\xBF\xBD' prisma/migrations/dmmf.json
```

### Observing Probabilistic Behavior
```bash
# Run multiple times to see varying corruption patterns
for i in {1..10}; do
  echo "=== Attempt $i ==="
  rm -rf prisma/migrations/ && npx prisma generate >/dev/null 2>&1
  echo "Corrupted lines found:"
  grep -n -P '\xEF\xBF\xBD' prisma/migrations/dmmf.json || echo "No corruption detected"
  echo "---"
done
```