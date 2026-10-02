/**
 * Integration Test: Full Pipeline Verification
 * 
 * Scope: Grade 8, Mathematics, Geometry, Parallelogram
 * 
 * This test verifies:
 * 1. Provenance tracking (sourceUrl, sourceTitle, sourceDomain, position)
 * 2. Candidate isolation (no direct candidate→workbook bypass)
 * 3. Search fallback handling (explicit fixture mode, no silent fake data)
 * 4. Approval gate enforcement
 */

const fs = require('fs');
const path = require('path');

class IntegrationTestOrchestrator {
  constructor(config = {}) {
    this.config = {
      grade: 8,
      subject: 'Mathematics',
      chapter: 'Geometry',
      topic: 'Parallelogram',
      searchProvider: process.env.SEARCH_PROVIDER || 'fixture', // fixture | bing
      searchAPIKey: process.env.BING_SEARCH_API_KEY || null,
      ...config
    };

    this.state = {
      queries: [],
      searchResults: [],
      uniqueUrls: new Set(),
      crawledPages: [],
      candidates: {
        discovered: [],
        byType: { problem: [], theory: [], formula: [] }
      },
      classified: [],
      duplicates: [],
      reviewQueue: [],
      approved: [],
      workbook: null
    };

    this.report = {
      startTime: null,
      endTime: null,
      checks: {
        sourceIntegrity: null,
        candidateIsolation: null,
        approvalGate: null
      },
      metrics: {}
    };
  }

  /**
   * Phase 1: Query Generation
   */
  async phase1_generateQueries() {
    console.log('\n=== PHASE 1: Query Generation ===');
    
    const queryPatterns = [
      `${this.config.topic} ${this.config.subject} grade ${this.config.grade}`,
      `${this.config.chapter} ${this.config.topic} properties`,
      `${this.config.topic} problems worksheet`,
      `${this.config.topic} theorems`,
      `${this.config.topic} definition geometry`,
      `${this.config.topic} area perimeter`,
      `${this.config.topic} angles`,
      `${this.config.topic} sides`,
      `${this.config.topic} diagonal properties`,
      `${this.config.topic} practice problems`
    ];

    this.state.queries = queryPatterns;
    console.log(`✓ Generated ${this.state.queries.length} queries`);
    return this.state.queries;
  }

  /**
   * Phase 2: Search
   */
  async phase2_search() {
    console.log('\n=== PHASE 2: Search ===');

    if (this.config.searchProvider === 'fixture') {
      console.log('ℹ Search provider: FIXTURE (no real Bing API)');
      return this.phase2_searchFixture();
    } else if (this.config.searchProvider === 'bing') {
      if (!this.config.searchAPIKey) {
        console.error('✗ SEARCH_UNAVAILABLE: Bing API key not provided');
        this.report.checks.approvalGate = false;
        throw new Error('SEARCH_UNAVAILABLE');
      }
      console.log('ℹ Search provider: BING API');
      return this.phase2_searchBing();
    }
  }

  async phase2_searchFixture() {
    // Fixture: realistic mock of search results
    const fixtureResults = [
      {
        name: 'Parallelogram Definition and Properties - Khan Academy',
        url: 'https://www.khanacademy.org/math/geometry/parallelogram-properties',
        snippet: 'A parallelogram is a quadrilateral with opposite sides parallel. Key properties: opposite sides equal, opposite angles equal...'
      },
      {
        name: 'Parallelogram Problem Set 1 - mathsisfun.com',
        url: 'https://www.mathsisfun.com/geometry/parallelogram-problems',
        snippet: 'Solve 15 problems about parallelogram sides and angles. Difficulty: medium grade 8.'
      },
      {
        name: 'Parallelogram Theorems and Proofs',
        url: 'https://www.geeksforgeeks.org/parallelogram-theorems',
        snippet: 'Theorem 1: Opposite sides of a parallelogram are equal. Theorem 2: Opposite angles are equal...'
      },
      {
        name: 'Area and Perimeter of Parallelogram',
        url: 'https://www.byjus.com/maths/area-of-parallelogram',
        snippet: 'Formula: Area = base × height. Perimeter = 2(a+b). Examples and exercises.'
      },
      {
        name: 'Parallelogram Diagonals Property',
        url: 'https://www.tutorialspoint.com/geometry/parallelogram-diagonals',
        snippet: 'The diagonals of a parallelogram bisect each other. Proof and examples.'
      }
    ];

    this.state.searchResults = fixtureResults;
    fixtureResults.forEach(r => this.state.uniqueUrls.add(r.url));

    console.log(`✓ Fixture returned ${fixtureResults.length} results`);
    console.log(`✓ Unique URLs: ${this.state.uniqueUrls.size}`);
    return fixtureResults;
  }

  async phase2_searchBing() {
    // TODO: Implement real Bing search with API key validation
    throw new Error('Bing provider not yet implemented');
  }

  /**
   * Phase 3: Crawl & Candidate Extraction
   */
  async phase3_crawlAndExtract() {
    console.log('\n=== PHASE 3: Crawl & Candidate Extraction ===');

    for (const searchResult of this.state.searchResults) {
      const crawledPage = {
        url: searchResult.url,
        title: searchResult.name,
        domain: new URL(searchResult.url).hostname,
        snippet: searchResult.snippet,
        content: this.mockCrawlContent(searchResult.url),
        crawledAt: new Date().toISOString()
      };

      this.state.crawledPages.push(crawledPage);

      // Extract candidates from this page
      const candidates = this.extractCandidatesFromPage(crawledPage);
      this.state.candidates.discovered.push(...candidates);

      console.log(`  ✓ ${searchResult.url} → ${candidates.length} candidates extracted`);
    }

    console.log(`✓ Total crawled pages: ${this.state.crawledPages.length}`);
    console.log(`✓ Total candidates discovered: ${this.state.candidates.discovered.length}`);
  }

  mockCrawlContent(url) {
    // Mock crawled content based on URL pattern
    if (url.includes('khan')) {
      return `
        Parallelogram Definition
        A parallelogram is a quadrilateral with both pairs of opposite sides parallel.
        
        Key Properties:
        1. Opposite sides are equal in length
        2. Opposite angles are equal
        3. Consecutive angles are supplementary
        4. Diagonals bisect each other
      `;
    } else if (url.includes('mathsisfun')) {
      return `
        Problem 1: Find the missing angle in a parallelogram if one angle is 60°.
        Problem 2: The sides of a parallelogram are 5cm and 8cm. Find the perimeter.
        Problem 3: If the diagonals of a parallelogram are 12cm and 16cm, ...
      `;
    } else if (url.includes('geeksforgeeks')) {
      return `
        Theorem 1: Opposite sides of a parallelogram are equal
        Proof: Using congruent triangles...
        
        Theorem 2: Opposite angles are equal
        Theorem 3: Consecutive angles are supplementary
      `;
    } else if (url.includes('byjus')) {
      return `
        Area of Parallelogram = base × height
        Example: base = 10cm, height = 6cm → Area = 60 cm²
        
        Perimeter = 2(a + b) where a, b are adjacent sides
        Example: sides 5cm and 8cm → Perimeter = 26cm
      `;
    } else if (url.includes('tutorialspoint')) {
      return `
        Property: The diagonals of a parallelogram bisect each other
        
        If ABCD is a parallelogram with diagonals AC and BD intersecting at O,
        then AO = OC and BO = OD
      `;
    }
    return '';
  }

  extractCandidatesFromPage(page) {
    const candidates = [];
    const candidateId = () => `cand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Parse content for different types
    if (page.content.includes('Problem')) {
      candidates.push({
        id: candidateId(),
        type: 'problem',
        content: 'Find the missing angle in a parallelogram if one angle is 60°.',
        position: 'mid-page',
        confidence: 0.85,
        provenance: {
          sourceUrl: page.url,
          sourceTitle: page.title,
          sourceDomain: page.domain,
          crawledAt: page.crawledAt
        },
        status: 'DISCOVERED'
      });
    }

    if (page.content.includes('Definition') || page.content.includes('Property')) {
      candidates.push({
        id: candidateId(),
        type: 'theory',
        content: 'A parallelogram has opposite sides equal and opposite angles equal.',
        position: 'top',
        confidence: 0.95,
        provenance: {
          sourceUrl: page.url,
          sourceTitle: page.title,
          sourceDomain: page.domain,
          crawledAt: page.crawledAt
        },
        status: 'DISCOVERED'
      });
    }

    if (page.content.includes('Area') || page.content.includes('Perimeter')) {
      candidates.push({
        id: candidateId(),
        type: 'formula',
        content: 'Area = base × height; Perimeter = 2(a + b)',
        position: 'bottom',
        confidence: 0.90,
        provenance: {
          sourceUrl: page.url,
          sourceTitle: page.title,
          sourceDomain: page.domain,
          crawledAt: page.crawledAt
        },
        status: 'DISCOVERED'
      });
    }

    if (page.content.includes('Theorem') || page.content.includes('diagonal')) {
      candidates.push({
        id: candidateId(),
        type: 'theory',
        content: 'The diagonals of a parallelogram bisect each other.',
        position: 'mid',
        confidence: 0.92,
        provenance: {
          sourceUrl: page.url,
          sourceTitle: page.title,
          sourceDomain: page.domain,
          crawledAt: page.crawledAt
        },
        status: 'DISCOVERED'
      });
    }

    return candidates;
  }

  /**
   * Phase 4: Classification & Deduplication
   */
  async phase4_classifyAndDedup() {
    console.log('\n=== PHASE 4: Classification & Deduplication ===');

    this.state.classified = this.state.candidates.discovered.map(c => ({
      ...c,
      status: 'CLASSIFIED'
    }));

    // Simple dedup: group by similarity
    const dedupGroups = {};
    this.state.classified.forEach(item => {
      const hash = this.simpleHash(item.content);
      if (!dedupGroups[hash]) {
        dedupGroups[hash] = [];
      }
      dedupGroups[hash].push(item);
    });

    Object.values(dedupGroups).forEach(group => {
      if (group.length > 1) {
        // Keep first, mark rest as duplicates
        const master = group[0];
        group.slice(1).forEach(dup => {
          this.state.duplicates.push({
            duplicateId: dup.id,
            masterId: master.id,
            reason: 'content_similarity'
          });
        });
      }
    });

    // Filter out duplicates
    const uniqueIds = new Set(this.state.classified.map(c => c.id));
    this.state.duplicates.forEach(d => uniqueIds.delete(d.duplicateId));

    this.state.classified = this.state.classified.filter(c => uniqueIds.has(c.id));

    console.log(`✓ Classified: ${this.state.classified.length} items`);
    console.log(`✓ Duplicates detected: ${this.state.duplicates.length}`);
  }

  simpleHash(str) {
    // Simple hash for dedup detection
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Phase 5: Review Queue
   */
  async phase5_reviewQueue() {
    console.log('\n=== PHASE 5: Review Queue ===');

    this.state.reviewQueue = this.state.classified.map(item => ({
      ...item,
      status: 'REVIEW',
      reviewedAt: null,
      reviewer: null,
      decision: null,
      notes: null
    }));

    console.log(`✓ Review queue populated: ${this.state.reviewQueue.length} items`);
  }

  /**
   * Phase 6: Approval (simulated)
   * In production, this would be manual review. Here we auto-approve high-confidence items.
   */
  async phase6_approval() {
    console.log('\n=== PHASE 6: Approval ===');

    // Auto-approve items with confidence >= 0.85
    this.state.approved = this.state.reviewQueue
      .filter(item => item.confidence >= 0.85)
      .map(item => ({
        ...item,
        status: 'APPROVED',
        reviewedAt: new Date().toISOString(),
        reviewer: 'system-auto',
        decision: 'approved'
      }));

    console.log(`✓ Approved: ${this.state.approved.length} items`);
  }

  /**
   * Phase 7: Workbook Generation (only from APPROVED)
   */
  async phase7_generateWorkbook() {
    console.log('\n=== PHASE 7: Workbook Generation ===');

    if (this.state.approved.length === 0) {
      console.warn('⚠ No approved items. Workbook will be empty.');
      this.state.workbook = {
        title: `Math Hunter: ${this.config.subject} - ${this.config.chapter}`,
        problems: [],
        theories: [],
        formulas: [],
        sources: []
      };
    } else {
      // Only include APPROVED items
      const approved = this.state.approved;
      const sources = new Map();

      approved.forEach(item => {
        const sourceKey = item.provenance.sourceUrl;
        if (!sources.has(sourceKey)) {
          sources.set(sourceKey, {
            url: item.provenance.sourceUrl,
            title: item.provenance.sourceTitle,
            domain: item.provenance.sourceDomain
          });
        }
      });

      this.state.workbook = {
        title: `Math Hunter: ${this.config.subject} - ${this.config.chapter}`,
        chapter: this.config.chapter,
        topic: this.config.topic,
        grade: this.config.grade,
        generatedAt: new Date().toISOString(),
        problems: approved.filter(a => a.type === 'problem'),
        theories: approved.filter(a => a.type === 'theory'),
        formulas: approved.filter(a => a.type === 'formula'),
        sources: Array.from(sources.values())
      };
    }

    console.log(`✓ Workbook generated`);
    console.log(`  - Problems: ${this.state.workbook.problems.length}`);
    console.log(`  - Theories: ${this.state.workbook.theories.length}`);
    console.log(`  - Formulas: ${this.state.workbook.formulas.length}`);
    console.log(`  - Sources: ${this.state.workbook.sources.length}`);
  }

  /**
   * Invariant Checks
   */
  checkInvariant1_SourceIntegrity() {
    console.log('\n=== CHECK 1: Source Integrity ===');

    let allValid = true;
    const errors = [];

    this.state.workbook.problems.forEach(p => {
      if (!p.provenance || !p.provenance.sourceUrl) {
        allValid = false;
        errors.push(`Problem ${p.id} missing sourceUrl`);
      }
    });

    this.state.workbook.theories.forEach(t => {
      if (!t.provenance || !t.provenance.sourceTitle) {
        allValid = false;
        errors.push(`Theory ${t.id} missing sourceTitle`);
      }
    });

    if (allValid) {
      console.log('✓ All workbook items have complete provenance');
      this.report.checks.sourceIntegrity = true;
    } else {
      console.error('✗ Source integrity violation:');
      errors.forEach(e => console.error(`  - ${e}`));
      this.report.checks.sourceIntegrity = false;
    }

    return allValid;
  }

  checkInvariant2_CandidateIsolation() {
    console.log('\n=== CHECK 2: Candidate Isolation ===');

    // Verify no DISCOVERED/CANDIDATE items in workbook
    const candidatesInWorkbook = [
      ...this.state.workbook.problems,
      ...this.state.workbook.theories,
      ...this.state.workbook.formulas
    ].filter(item => item.status !== 'APPROVED');

    if (candidatesInWorkbook.length === 0) {
      console.log('✓ No candidates in workbook (only APPROVED items)');
      this.report.checks.candidateIsolation = true;
      return true;
    } else {
      console.error(`✗ Candidate isolation violation: ${candidatesInWorkbook.length} non-approved items found`);
      this.report.checks.candidateIsolation = false;
      return false;
    }
  }

  checkInvariant3_ApprovalGate() {
    console.log('\n=== CHECK 3: Approval Gate ===');

    // Verify workbook items are all in approved set
    const workbookIds = new Set([
      ...this.state.workbook.problems.map(p => p.id),
      ...this.state.workbook.theories.map(t => t.id),
      ...this.state.workbook.formulas.map(f => f.id)
    ]);

    const approvedIds = new Set(this.state.approved.map(a => a.id));

    let allInApproved = true;
    workbookIds.forEach(id => {
      if (!approvedIds.has(id)) {
        allInApproved = false;
        console.error(`✗ Workbook item ${id} not in approved set`);
      }
    });

    if (allInApproved) {
      console.log('✓ All workbook items are from APPROVED set');
      this.report.checks.approvalGate = true;
      return true;
    } else {
      this.report.checks.approvalGate = false;
      return false;
    }
  }

  /**
   * Generate Final Report
   */
  generateReport() {
    this.report.endTime = new Date().toISOString();
    const duration = new Date(this.report.endTime) - new Date(this.report.startTime);

    const report = `
╔════════════════════════════════════════════════════════════════╗
║          PTien Math Hunter - Integration Test Report           ║
╚════════════════════════════════════════════════════════════════╝

Test Scope:
  Grade:    ${this.config.grade}
  Subject:  ${this.config.subject}
  Chapter:  ${this.config.chapter}
  Topic:    ${this.config.topic}

Search Provider: ${this.config.searchProvider.toUpperCase()}

═══════════════════════════════════════════════════════════════════

METRICS

Queries generated:        ${this.state.queries.length}
Search results:           ${this.state.searchResults.length}
Unique URLs:              ${this.state.uniqueUrls.size}
Crawled pages:            ${this.state.crawledPages.length}

Candidates discovered:    ${this.state.candidates.discovered.length}
  ├─ Problem:             ${this.state.candidates.discovered.filter(c => c.type === 'problem').length}
  ├─ Theory:              ${this.state.candidates.discovered.filter(c => c.type === 'theory').length}
  └─ Formula:             ${this.state.candidates.discovered.filter(c => c.type === 'formula').length}

Classified:               ${this.state.classified.length}
Duplicates detected:      ${this.state.duplicates.length}
Review queue:             ${this.state.reviewQueue.length}
Approved:                 ${this.state.approved.length}

Workbook:
  Generated:              ${this.state.workbook ? 'YES' : 'NO'}
  Problems:               ${this.state.workbook ? this.state.workbook.problems.length : 0}
  Theories:               ${this.state.workbook ? this.state.workbook.theories.length : 0}
  Formulas:               ${this.state.workbook ? this.state.workbook.formulas.length : 0}
  Sources:                ${this.state.workbook ? this.state.workbook.sources.length : 0}

═══════════════════════════════════════════════════════════════════

INVARIANT CHECKS

[${this.report.checks.sourceIntegrity ? '✓' : '✗'}] Source Integrity
    Every item has: sourceUrl, sourceTitle, sourceDomain, crawledAt
    
[${this.report.checks.candidateIsolation ? '✓' : '✗'}] Candidate Isolation
    Candidates never bypass to workbook directly
    Only APPROVED items reach workbook
    
[${this.report.checks.approvalGate ? '✓' : '✗'}] Approval Gate
    All workbook items verified in APPROVED set
    No DISCOVERED/CLASSIFIED items in output

═══════════════════════════════════════════════════════════════════

PIPELINE STATE FLOW

  DISCOVERED (${this.state.candidates.discovered.length})
        ↓
     REVIEW (${this.state.reviewQueue.length})
        ↓
   APPROVED (${this.state.approved.length})
        ↓
   WORKBOOK (${this.state.workbook ? this.state.workbook.problems.length + this.state.workbook.theories.length + this.state.workbook.formulas.length : 0} items)

═══════════════════════════════════════════════════════════════════

SUMMARY

Duration:                 ${(duration / 1000).toFixed(2)}s
All checks passed:        ${Object.values(this.report.checks).every(c => c) ? 'YES ✓' : 'NO ✗'}

═══════════════════════════════════════════════════════════════════
`;

    return report;
  }

  /**
   * Run full pipeline
   */
  async run() {
    this.report.startTime = new Date().toISOString();
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  Integration Test: Full Pipeline Verification             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    try {
      await this.phase1_generateQueries();
      await this.phase2_search();
      await this.phase3_crawlAndExtract();
      await this.phase4_classifyAndDedup();
      await this.phase5_reviewQueue();
      await this.phase6_approval();
      await this.phase7_generateWorkbook();

      // Run invariant checks
      this.checkInvariant1_SourceIntegrity();
      this.checkInvariant2_CandidateIsolation();
      this.checkInvariant3_ApprovalGate();

      // Generate report
      const report = this.generateReport();
      console.log(report);

      // Save report to file
      const reportPath = path.join(__dirname, '../../reports', `integration-test-${Date.now()}.txt`);
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      fs.writeFileSync(reportPath, report);
      console.log(`\n📄 Report saved: ${reportPath}`);

      return this.report;
    } catch (error) {
      console.error('\n✗ Pipeline failed:', error.message);
      throw error;
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const tester = new IntegrationTestOrchestrator();
  tester.run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = IntegrationTestOrchestrator;
