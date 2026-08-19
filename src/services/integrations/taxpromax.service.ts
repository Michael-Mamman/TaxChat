import { TAXPROMAX_BASE_URL, TAXPROMAX_API_KEY } from "../../config.js";
import type {
  IntegrationResponse,
  FilingStatus,
  AssessmentDetail,
  ComplianceCheckResult,
} from "../../types/integration.types.js";

class TaxProMaxService {
  private baseUrl = TAXPROMAX_BASE_URL;
  private apiKey = TAXPROMAX_API_KEY;

  async getFilingStatus(
    tin: string,
    taxYear?: number
  ): Promise<IntegrationResponse<FilingStatus[]>> {
    console.log("[taxpromax.service::getFilingStatus] ENTER", {
      tinLength: tin?.length,
      taxYear,
      baseUrl: this.baseUrl,
    });
    console.log("[TaxProMax] getFilingStatus stub called:", tin, taxYear);

    if (taxYear !== undefined) {
      console.log("[taxpromax.service::getFilingStatus] branch: using provided taxYear");
    } else {
      console.log("[taxpromax.service::getFilingStatus] branch: defaulting to previous year");
    }

    const year = taxYear ?? new Date().getFullYear() - 1;
    console.log("[taxpromax.service::getFilingStatus] EXIT", {
      status: 200,
      year,
      count: 3,
    });
    return {
      success: true,
      message: "Filing status retrieved successfully (stub)",
      status_code: 200,
      data: [
        {
          tin,
          tax_year: year,
          tax_type: "CIT",
          period: `${year}-01 to ${year}-12`,
          filing_date: `${year + 1}-03-15`,
          status: "filed",
          amount_due: 0,
        },
        {
          tin,
          tax_year: year,
          tax_type: "VAT",
          period: `${year}-01`,
          filing_date: `${year}-02-21`,
          status: "filed",
          amount_due: 0,
        },
        {
          tin,
          tax_year: year,
          tax_type: "PAYE",
          period: `${year}-12`,
          status: "pending",
          amount_due: 185000,
        },
      ],
    };
  }

  async getAssessments(
    tin: string
  ): Promise<IntegrationResponse<AssessmentDetail[]>> {
    console.log("[taxpromax.service::getAssessments] ENTER", {
      tinLength: tin?.length,
      baseUrl: this.baseUrl,
    });
    console.log("[TaxProMax] getAssessments stub called:", tin);

    const year = new Date().getFullYear() - 1;
    console.log("[taxpromax.service::getAssessments] EXIT", {
      status: 200,
      year,
      count: 2,
    });
    return {
      success: true,
      message: "Assessments retrieved successfully (stub)",
      status_code: 200,
      data: [
        {
          assessment_id: "ASS-20240001",
          reference: "NRS/ASS/2024/00123",
          tin,
          tax_type: "CIT",
          tax_year: year,
          period: `${year}-01 to ${year}-12`,
          assessed_amount: 2500000,
          paid_amount: 2500000,
          balance: 0,
          due_date: `${year + 1}-06-30`,
          basis: "Self-assessment",
          status: "paid",
        },
        {
          assessment_id: "ASS-20240002",
          reference: "NRS/ASS/2024/00456",
          tin,
          tax_type: "VAT",
          tax_year: year,
          period: `${year}-Q4`,
          assessed_amount: 780000,
          paid_amount: 500000,
          balance: 280000,
          due_date: `${year + 1}-01-31`,
          basis: "Desk audit",
          status: "partial",
        },
      ],
    };
  }

  async getPaymentHistory(
    tin: string
  ): Promise<IntegrationResponse<AssessmentDetail[]>> {
    console.log("[taxpromax.service::getPaymentHistory] ENTER", {
      tinLength: tin?.length,
      baseUrl: this.baseUrl,
    });
    console.log("[TaxProMax] getPaymentHistory stub called:", tin);

    const year = new Date().getFullYear();
    console.log("[taxpromax.service::getPaymentHistory] EXIT", {
      status: 200,
      year,
      count: 2,
    });
    return {
      success: true,
      message: "Payment history retrieved successfully (stub)",
      status_code: 200,
      data: [
        {
          assessment_id: "PAY-20240010",
          reference: "RRR-123456789012",
          tin,
          tax_type: "CIT",
          tax_year: year - 1,
          period: `${year - 1}-01 to ${year - 1}-12`,
          assessed_amount: 2500000,
          paid_amount: 2500000,
          balance: 0,
          due_date: `${year}-03-31`,
          basis: "Self-assessment",
          status: "paid",
        },
        {
          assessment_id: "PAY-20240011",
          reference: "RRR-987654321098",
          tin,
          tax_type: "PAYE",
          tax_year: year - 1,
          period: `${year - 1}-11`,
          assessed_amount: 350000,
          paid_amount: 350000,
          balance: 0,
          due_date: `${year - 1}-12-10`,
          basis: "Monthly remittance",
          status: "paid",
        },
      ],
    };
  }

  async getComplianceStatus(
    tin: string
  ): Promise<IntegrationResponse<ComplianceCheckResult>> {
    console.log("[taxpromax.service::getComplianceStatus] ENTER", {
      tinLength: tin?.length,
      baseUrl: this.baseUrl,
    });
    console.log("[TaxProMax] getComplianceStatus stub called:", tin);

    const year = new Date().getFullYear() - 1;
    console.log("[taxpromax.service::getComplianceStatus] EXIT", {
      status: 200,
      year,
      is_compliant: false,
    });
    return {
      success: true,
      message: "Compliance status retrieved successfully (stub)",
      status_code: 200,
      data: {
        tin,
        is_compliant: false,
        filings: [
          {
            tin,
            tax_year: year,
            tax_type: "CIT",
            period: `${year}-01 to ${year}-12`,
            filing_date: `${year + 1}-03-15`,
            status: "filed",
            amount_due: 0,
          },
          {
            tin,
            tax_year: year,
            tax_type: "PAYE",
            period: `${year}-12`,
            status: "overdue",
            amount_due: 185000,
          },
        ],
        outstanding_assessments: [
          {
            assessment_id: "ASS-20240002",
            reference: "NRS/ASS/2024/00456",
            tin,
            tax_type: "VAT",
            tax_year: year,
            period: `${year}-Q4`,
            assessed_amount: 780000,
            paid_amount: 500000,
            balance: 280000,
            due_date: `${year + 1}-01-31`,
            basis: "Desk audit",
            status: "partial",
          },
        ],
        penalties: [
          {
            penalty_id: "PEN-20240001",
            type: "late_filing",
            amount: 50000,
            reason: "Late filing of PAYE returns for December " + year,
            statutory_basis: "Section 81(2) PITA",
            original_due_date: `${year + 1}-01-10`,
            status: "outstanding",
          },
        ],
      },
    };
  }

  async getOutstandingLiabilities(
    tin: string
  ): Promise<IntegrationResponse<AssessmentDetail[]>> {
    console.log("[taxpromax.service::getOutstandingLiabilities] ENTER", {
      tinLength: tin?.length,
      baseUrl: this.baseUrl,
    });
    console.log("[TaxProMax] getOutstandingLiabilities stub called:", tin);

    const year = new Date().getFullYear() - 1;
    console.log("[taxpromax.service::getOutstandingLiabilities] EXIT", {
      status: 200,
      year,
      count: 2,
    });
    return {
      success: true,
      message: "Outstanding liabilities retrieved successfully (stub)",
      status_code: 200,
      data: [
        {
          assessment_id: "ASS-20240002",
          reference: "NRS/ASS/2024/00456",
          tin,
          tax_type: "VAT",
          tax_year: year,
          period: `${year}-Q4`,
          assessed_amount: 780000,
          paid_amount: 500000,
          balance: 280000,
          due_date: `${year + 1}-01-31`,
          basis: "Desk audit",
          status: "partial",
        },
        {
          assessment_id: "ASS-20240003",
          reference: "NRS/ASS/2024/00789",
          tin,
          tax_type: "PAYE",
          tax_year: year,
          period: `${year}-12`,
          assessed_amount: 185000,
          paid_amount: 0,
          balance: 185000,
          due_date: `${year + 1}-01-10`,
          basis: "Monthly return",
          status: "unpaid",
        },
      ],
    };
  }
}

export default new TaxProMaxService();
