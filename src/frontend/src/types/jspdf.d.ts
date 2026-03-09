// Type declarations for jsPDF loaded via CDN (window.jspdf)
interface Window {
  jspdf?: {
    jsPDF: new (
      orientation?: string,
      unit?: string,
      format?: string,
    ) => unknown;
  };
  jsPDF?: new (orientation?: string, unit?: string, format?: string) => unknown;
}
