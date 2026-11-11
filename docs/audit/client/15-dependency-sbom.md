# 15. Dependency & SBOM

**Status: Complete**

## Scope

Component inventory and licences.

## Build & date

Frontend `590536a` + uncommitted working tree (Phase 2 to 4 work restored from a stash on 4 Nov 2026); backend `ed34cc5` + uncommitted working tree (Alembic head 0055). Test dates 2 to 4 Nov 2026.

## What was tested

cyclonedx-py 7.6.0 on requirements.lock.txt and the installed environment; @cyclonedx/cyclonedx-npm 6.0.1 (production only); pip-licenses; licence classification.

## Results

Backend 200 components (193 permissive, 3 weak copyleft file-level, 3 LGPL, 1 AGPL). Frontend production 140 components (139 permissive, 1 GPL-or-MIT dual). Strong copyleft: PyMuPDF 1.28.2 AGPL-3.0 or Artifex commercial (imported as fitz in the video pipeline and the voice parser); machina 7.0.1 (via livekit-client) is MIT or GPL, MIT can be elected. Weak copyleft: psycopg2-binary (LGPL), pycairo, svglib, certifi, orjson, tqdm (MPL).

## Findings

COV-004 (Medium, Needs Business Decision): confirm an Artifex commercial licence or replace fitz with pypdfium2 (already present).

## Remediation status

Waiting for a business and legal decision.

## Evidence

../evidence/sbom/backend.cdx.json; ../evidence/sbom/frontend.cdx.json; ../evidence/sbom/licences.csv; ../evidence/sbom/licence-summary.json

## Limits / not done

The frontend SBOM was taken before the restore; regenerate after the next dependency change. Licence classification is automated and is not legal advice.
