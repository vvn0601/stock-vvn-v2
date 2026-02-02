
export const formatNumber = (num: number, digits: number = 0) => {
  if (num === undefined || num === null) return '0';
  return Number(num).toLocaleString(undefined, { 
    minimumFractionDigits: digits, 
    maximumFractionDigits: digits 
  });
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.replace(/-/g, '/');
};
