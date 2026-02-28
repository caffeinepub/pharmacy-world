declare module "xlsx" {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [sheet: string]: WorkSheet };
  }
  export interface WorkSheet {
    [cell: string]: CellObject | unknown;
  }
  export interface CellObject {
    v: string | number | boolean | Date;
    t: string;
    f?: string;
    r?: string;
    h?: string;
    w?: string;
    z?: string;
  }
  export interface ParsingOptions {
    type?: "base64" | "binary" | "buffer" | "file" | "array" | "string";
    [key: string]: unknown;
  }
  export function read(data: unknown, opts?: ParsingOptions): WorkBook;
  export function readFile(filename: string, opts?: ParsingOptions): WorkBook;
  export const utils: {
    sheet_to_json<T = unknown>(
      worksheet: WorkSheet,
      opts?: {
        header?: "A" | number | string[];
        defval?: unknown;
        blankrows?: boolean;
        range?: unknown;
        raw?: boolean;
      },
    ): T[];
    json_to_sheet<T = unknown>(
      data: T[],
      opts?: { header?: string[]; skipHeader?: boolean },
    ): WorkSheet;
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name?: string): void;
    aoa_to_sheet(data: unknown[][]): WorkSheet;
  };
  export function writeFile(
    wb: WorkBook,
    filename: string,
    opts?: unknown,
  ): void;
  export function write(wb: WorkBook, opts?: unknown): unknown;
}
