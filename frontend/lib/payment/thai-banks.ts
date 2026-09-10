// Exact Omise bank "brand" codes (docs.omise.co/recipients-api), with Thai display labels for
// the installer payout-bank dropdown (frontend/app/dashboard/DashboardClient.tsx). Plain
// constant array, no imports — safe to use from a client component. Kept in sync with the
// substring-match list in lib/payment/omise-provider.ts's resolveOmiseBankBrand() fallback.
export const THAI_BANKS: { code: string; label: string }[] = [
  { code: 'kbank', label: 'ธนาคารกสิกรไทย (KBank)' },
  { code: 'scb', label: 'ธนาคารไทยพาณิชย์ (SCB)' },
  { code: 'ktb', label: 'ธนาคารกรุงไทย (KTB)' },
  { code: 'bbl', label: 'ธนาคารกรุงเทพ (BBL)' },
  { code: 'bay', label: 'ธนาคารกรุงศรีอยุธยา (BAY)' },
  { code: 'ttb', label: 'ธนาคารทหารไทยธนชาต (TTB)' },
  { code: 'gsb', label: 'ธนาคารออมสิน (GSB)' },
  { code: 'ghb', label: 'ธนาคารอาคารสงเคราะห์ (GHB)' },
  { code: 'uob', label: 'ธนาคารยูโอบี (UOB)' },
  { code: 'cimb', label: 'ธนาคารซีไอเอ็มบี ไทย (CIMB)' },
  { code: 'kkp', label: 'ธนาคารเกียรตินาคินภัทร (KKP)' },
  { code: 'tisco', label: 'ธนาคารทิสโก้ (TISCO)' },
  { code: 'lhb', label: 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LHB)' },
];
