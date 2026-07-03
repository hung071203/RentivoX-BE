// Ảnh QR tĩnh do VietQR.io sinh — không cần gọi API, chỉ cần build đúng URL
// Docs: https://www.vietqr.io/portal-service/service-guide

export interface VietQrBankInfo {
  bankBin: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
}

export function buildVietQrUrl(
  bank: VietQrBankInfo,
  amount: number,
  addInfo: string,
): string | null {
  if (!bank.bankBin || !bank.bankAccountNumber) return null;

  const query = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo,
  });
  if (bank.bankAccountHolder) {
    query.set('accountName', bank.bankAccountHolder);
  }

  return `https://img.vietqr.io/image/${bank.bankBin}-${bank.bankAccountNumber}-compact2.png?${query.toString()}`;
}
