interface ServiceRequestEmailData {
  taxpayer_name: string;
  reference_number: string;
  service_type: string;
  status: string;
  details?: string;
}

export function generateServiceRequestEmailHtml(
  data: ServiceRequestEmailData,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>NRS TaxChat - Service Request</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #006633; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">NRS TaxChat</h1>
    <p style="margin: 5px 0 0 0;">Nigeria Revenue Service - Virtual Tax Office</p>
  </div>
  <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
    <p>Dear ${data.taxpayer_name},</p>
    <p>Your service request has been received and is being processed.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Reference</td><td style="padding: 8px; border: 1px solid #ddd;">${data.reference_number}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Service Type</td><td style="padding: 8px; border: 1px solid #ddd;">${data.service_type}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Status</td><td style="padding: 8px; border: 1px solid #ddd;">${data.status}</td></tr>
    </table>
    ${data.details ? `<p>${data.details}</p>` : ""}
    <p>You will receive updates via WhatsApp as your request is processed.</p>
    <p style="color: #666; font-size: 12px;">This is an automated message from NRS TaxChat. Do not reply to this email.</p>
  </div>
</body>
</html>`.trim();
}

interface TCCEmailData {
  taxpayer_name: string;
  tcc_reference: string;
  valid_from: string;
  valid_to: string;
  verification_url: string;
}

export function generateTCCEmailHtml(data: TCCEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>NRS TaxChat - Tax Clearance Certificate</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #006633; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">NRS TaxChat</h1>
    <p style="margin: 5px 0 0 0;">Tax Clearance Certificate</p>
  </div>
  <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
    <p>Dear ${data.taxpayer_name},</p>
    <p>Your Tax Clearance Certificate has been issued.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">TCC Reference</td><td style="padding: 8px; border: 1px solid #ddd;">${data.tcc_reference}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Valid From</td><td style="padding: 8px; border: 1px solid #ddd;">${data.valid_from}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Valid To</td><td style="padding: 8px; border: 1px solid #ddd;">${data.valid_to}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Verification</td><td style="padding: 8px; border: 1px solid #ddd;"><a href="${data.verification_url}">${data.verification_url}</a></td></tr>
    </table>
    <p>Any third party can verify this certificate by scanning the QR code or entering the reference number at the verification URL above.</p>
    <p style="color: #666; font-size: 12px;">This is an automated message from NRS TaxChat.</p>
  </div>
</body>
</html>`.trim();
}
